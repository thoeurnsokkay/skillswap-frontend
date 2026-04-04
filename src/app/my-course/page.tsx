'use client'

import { ChangeEvent, useEffect, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import api from '@/lib/api'
import { CourseDetail, CourseSummary } from '@/types'
import toast from 'react-hot-toast'
import { AxiosError } from 'axios'

interface ApiEnvelope<T> {
  success: boolean
  message: string
  data: T
}

type CoursePreviewVideo = {
  videoUrl: string
  title: string
}

function apiErrorMessage(error: unknown, fallback: string): string {
  const err = error as AxiosError<ApiEnvelope<unknown>>
  return err?.response?.data?.message || fallback
}

function toBackendAssetUrl(path: string): string {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:9090'
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`
}

function fmtDate(value?: string): string {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleDateString()
}

function guessTitle(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  return dot > 0 ? fileName.slice(0, dot) : fileName
}

const courseGradients = [
  'from-teal-400 to-cyan-600',
  'from-indigo-500 to-blue-700',
  'from-emerald-500 to-teal-700',
  'from-orange-400 to-rose-500',
  'from-violet-500 to-purple-700',
]

function inferCourseTag(title: string): string {
  const t = (title || '').toLowerCase()
  if (t.includes('java') || t.includes('python') || t.includes('program') || t.includes('code')) return 'TECH'
  if (t.includes('design') || t.includes('ui') || t.includes('ux')) return 'DESIGN'
  if (t.includes('english') || t.includes('language')) return 'LANGUAGE'
  if (t.includes('photo') || t.includes('art')) return 'ART'
  if (t.includes('music')) return 'MUSIC'
  return 'COURSE'
}

export default function MyCoursePage() {
  const [courses, setCourses] = useState<CourseSummary[]>([])
  const [loading, setLoading] = useState(true)

  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [videoFiles, setVideoFiles] = useState<File[]>([])
  const [resourceFiles, setResourceFiles] = useState<File[]>([])

  const [openCourseId, setOpenCourseId] = useState<number | null>(null)
  const [openCourseDetail, setOpenCourseDetail] = useState<CourseDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null)
  const [previewVideos, setPreviewVideos] = useState<Record<number, CoursePreviewVideo>>({})
  const [showAppendForCourseId, setShowAppendForCourseId] = useState<number | null>(null)
  const [appendVideos, setAppendVideos] = useState<File[]>([])
  const [appendResources, setAppendResources] = useState<File[]>([])
  const [appending, setAppending] = useState(false)

  const loadCourses = async () => {
    setLoading(true)
    try {
      const res = await api.get<ApiEnvelope<CourseSummary[]>>('/api/courses/my')
      setCourses(res.data.data || [])
    } catch {
      toast.error('Failed to load courses')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCourses()
  }, [])

  useEffect(() => {
    if (courses.length === 0) {
      setPreviewVideos({})
      return
    }

    Promise.all(
      courses.map(async (course) => {
        try {
          const res = await api.get<ApiEnvelope<CourseDetail>>(`/api/courses/${course.id}`)
          const firstLesson = res.data.data.lessons?.[0]
          return [
            course.id,
            firstLesson
              ? { videoUrl: firstLesson.videoUrl, title: firstLesson.title || firstLesson.videoName }
              : null,
          ] as const
        } catch {
          return [course.id, null] as const
        }
      })
    ).then((entries) => {
      const next: Record<number, CoursePreviewVideo> = {}
      for (const [courseId, preview] of entries) {
        if (preview) next[courseId] = preview
      }
      setPreviewVideos(next)
    })
  }, [courses])

  const onPickVideos = (e: ChangeEvent<HTMLInputElement>) => {
    setVideoFiles(Array.from(e.target.files || []))
  }

  const onPickResources = (e: ChangeEvent<HTMLInputElement>) => {
    setResourceFiles(Array.from(e.target.files || []))
  }

  const resetCreateForm = () => {
    setTitle('')
    setDescription('')
    setVideoFiles([])
    setResourceFiles([])
  }

  const createCourseInOneGo = async () => {
    if (!title.trim()) {
      toast.error('Course title is required')
      return
    }
    if (videoFiles.length === 0) {
      toast.error('Please upload at least 1 video')
      return
    }

    setCreating(true)
    try {
      const createRes = await api.post<ApiEnvelope<CourseSummary>>('/api/courses', {
        title: title.trim(),
        description: description.trim() || null,
      })

      const courseId = createRes.data.data.id

      for (const file of videoFiles) {
        const fd = new FormData()
        fd.append('video', file)
        fd.append('title', guessTitle(file.name))
        if (description.trim()) {
          fd.append('description', description.trim())
        }

        await api.post(`/api/courses/${courseId}/lessons`, fd)
      }

      for (const file of resourceFiles) {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('title', file.name)

        await api.post(`/api/courses/${courseId}/resources/upload`, fd)
      }

      toast.success('Course created successfully')
      setShowCreate(false)
      resetCreateForm()
      await loadCourses()
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Failed to create course'))
    } finally {
      setCreating(false)
    }
  }

  const deleteCourse = async (courseId: number) => {
    if (!window.confirm('Delete this course and all files?')) return

    try {
      await api.delete(`/api/courses/${courseId}`)
      toast.success('Course deleted')
      if (openCourseId === courseId) {
        setOpenCourseId(null)
        setOpenCourseDetail(null)
      }
      await loadCourses()
    } catch {
      toast.error('Failed to delete course')
    }
  }

  const toggleDetail = async (courseId: number) => {
    if (openCourseId === courseId) {
      setOpenCourseId(null)
      setOpenCourseDetail(null)
      setSelectedLessonId(null)
      setShowAppendForCourseId(null)
      setAppendVideos([])
      setAppendResources([])
      return
    }

    setLoadingDetail(true)
    try {
      const res = await api.get<ApiEnvelope<CourseDetail>>(`/api/courses/${courseId}`)
      setOpenCourseId(courseId)
      setOpenCourseDetail(res.data.data)
      setSelectedLessonId(res.data.data.lessons?.[0]?.id ?? null)
      setShowAppendForCourseId(null)
      setAppendVideos([])
      setAppendResources([])
    } catch {
      toast.error('Failed to load course detail')
    } finally {
      setLoadingDetail(false)
    }
  }

  const openCourseForPlayback = async (courseId: number, preferredLessonId?: number) => {
    setLoadingDetail(true)
    try {
      const res = await api.get<ApiEnvelope<CourseDetail>>(`/api/courses/${courseId}`)
      setOpenCourseId(courseId)
      setOpenCourseDetail(res.data.data)
      setSelectedLessonId(preferredLessonId ?? res.data.data.lessons?.[0]?.id ?? null)
      setShowAppendForCourseId(null)
      setAppendVideos([])
      setAppendResources([])
    } catch {
      toast.error('Failed to load course detail')
    } finally {
      setLoadingDetail(false)
    }
  }

  const openAddMoreContent = async (courseId: number) => {
    if (openCourseId !== courseId) {
      setLoadingDetail(true)
      try {
        const res = await api.get<ApiEnvelope<CourseDetail>>(`/api/courses/${courseId}`)
        setOpenCourseId(courseId)
        setOpenCourseDetail(res.data.data)
        setSelectedLessonId(res.data.data.lessons?.[0]?.id ?? null)
      } catch {
        toast.error('Failed to load course detail')
        return
      } finally {
        setLoadingDetail(false)
      }
    }

    setShowAppendForCourseId(courseId)
  }

  const onPickAppendVideos = (e: ChangeEvent<HTMLInputElement>) => {
    setAppendVideos(Array.from(e.target.files || []))
  }

  const onPickAppendResources = (e: ChangeEvent<HTMLInputElement>) => {
    setAppendResources(Array.from(e.target.files || []))
  }

  const appendContent = async (courseId: number) => {
    if (appendVideos.length === 0 && appendResources.length === 0) {
      toast.error('Please pick videos or resources first')
      return
    }

    setAppending(true)
    try {
      for (const file of appendVideos) {
        const fd = new FormData()
        fd.append('video', file)
        fd.append('title', guessTitle(file.name))

        await api.post(`/api/courses/${courseId}/lessons`, fd)
      }

      for (const file of appendResources) {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('title', file.name)

        await api.post(`/api/courses/${courseId}/resources/upload`, fd)
      }

      const detailRes = await api.get<ApiEnvelope<CourseDetail>>(`/api/courses/${courseId}`)
      setOpenCourseDetail(detailRes.data.data)
      if (!selectedLessonId && detailRes.data.data.lessons.length > 0) {
        setSelectedLessonId(detailRes.data.data.lessons[0].id)
      }
      setAppendVideos([])
      setAppendResources([])
      await loadCourses()
      toast.success('Content appended successfully')
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Failed to append content'))
    } finally {
      setAppending(false)
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">My Courses</h1>
            <p className="mt-1 text-sm text-slate-500">
              All your courses are listed here. Click Create Course to add title, description, videos, and resources in one go.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            + Create Course
          </button>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          {loading ? (
            <p className="text-sm text-slate-400">Loading courses...</p>
          ) : courses.length === 0 ? (
            <p className="text-sm text-slate-500">No courses yet. Click Create Course to add your first one.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {courses.map((course, idx) => (
                <div key={course.id} className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                  <div className={`relative h-48 ${previewVideos[course.id] ? 'bg-slate-900' : `bg-gradient-to-br ${courseGradients[idx % courseGradients.length]}`}`}>
                    <span className="absolute left-3 top-3 rounded-md bg-emerald-400 px-2 py-1 text-[10px] font-extrabold tracking-widest text-slate-900">
                      {inferCourseTag(course.title)}
                    </span>
                    {previewVideos[course.id] ? (
                      <button
                        onClick={() => openCourseForPlayback(course.id)}
                        className="group relative h-full w-full"
                        aria-label={`Play preview for ${course.title}`}
                      >
                        <video
                          src={toBackendAssetUrl(previewVideos[course.id].videoUrl)}
                          className="h-full w-full object-cover"
                          muted
                          preload="metadata"
                        />
                        <div className="absolute inset-0 bg-black/20 transition group-hover:bg-black/35" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/80 text-slate-900 shadow-lg transition group-hover:scale-105">
                            ▶
                          </span>
                        </div>
                      </button>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-5xl font-black text-white/80">{course.title.charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="truncate text-2xl font-extrabold text-slate-900 leading-none">{course.title}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600 min-h-[2.5rem]">{course.description || 'No description yet.'}</p>
                    <p className="mt-2 text-sm font-semibold text-slate-700">{course.lessonCount + course.resourceCount} content items</p>
                    <p className="mt-1 text-xs text-slate-500">By {course.creatorName || 'You'}</p>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => toggleDetail(course.id)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        {openCourseId === course.id ? 'Hide Content' : 'View Content'}
                      </button>
                      <button
                        onClick={() => openAddMoreContent(course.id)}
                        className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                      >
                        Add More Content
                      </button>
                      <button
                        onClick={() => deleteCourse(course.id)}
                        className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {openCourseId === course.id && (
                    <div className="border-t border-slate-200 bg-slate-50 p-4">
                      {loadingDetail || !openCourseDetail ? (
                        <p className="text-sm text-slate-400">Loading content...</p>
                      ) : (
                        <div className="space-y-4">
                          {showAppendForCourseId === course.id && (
                            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                              <div className="mb-2 flex items-center justify-between">
                                <h4 className="text-sm font-bold text-blue-900">Add More Content</h4>
                                <button
                                  onClick={() => setShowAppendForCourseId(null)}
                                  className="rounded-md border border-blue-200 bg-white px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100"
                                >
                                  Hide
                                </button>
                              </div>
                              <p className="mt-1 text-xs text-blue-700">
                                You can upload multiple videos and resources at once. New uploads are appended to existing content.
                              </p>
                              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                                <div>
                                  <label className="mb-1 block text-xs font-semibold text-blue-800">Videos (multiple)</label>
                                  <input type="file" multiple accept="video/*" onChange={onPickAppendVideos} className="w-full text-sm" />
                                  <p className="mt-1 text-xs text-blue-700">{appendVideos.length} selected</p>
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs font-semibold text-blue-800">Resources (multiple)</label>
                                  <input type="file" multiple onChange={onPickAppendResources} className="w-full text-sm" />
                                  <p className="mt-1 text-xs text-blue-700">{appendResources.length} selected</p>
                                </div>
                              </div>
                              <div className="mt-3 flex justify-end">
                                <button
                                  onClick={() => appendContent(course.id)}
                                  disabled={appending}
                                  className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                                >
                                  {appending ? 'Appending...' : 'Append Content'}
                                </button>
                              </div>
                            </div>
                          )}

                          {openCourseDetail.lessons.length > 0 ? (
                            (() => {
                              const activeLesson = openCourseDetail.lessons.find((lesson) => lesson.id === selectedLessonId) || openCourseDetail.lessons[0]
                              return (
                                <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.8fr_1fr]">
                                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                                    <div className="relative aspect-video bg-black">
                                      <video
                                        key={activeLesson.id}
                                        controls
                                        className="h-full w-full object-contain"
                                        src={toBackendAssetUrl(activeLesson.videoUrl)}
                                      />
                                      <span className="absolute left-3 top-3 rounded-full bg-indigo-500 px-3 py-1 text-[10px] font-extrabold tracking-widest text-white">
                                        NOW PLAYING
                                      </span>
                                    </div>
                                    <div className="p-3">
                                      <p className="text-lg font-bold text-slate-900">{activeLesson.title}</p>
                                      <p className="text-xs text-slate-500">{activeLesson.description || activeLesson.videoName}</p>
                                    </div>
                                  </div>

                                  <div className="max-h-[420px] overflow-y-auto rounded-xl border border-slate-200 bg-white p-2">
                                    <p className="px-2 py-1 text-xs font-extrabold tracking-widest text-slate-500">VIDEO PLAYLIST</p>
                                    <div className="space-y-2">
                                      {openCourseDetail.lessons.map((lesson) => {
                                        const active = lesson.id === activeLesson.id
                                        return (
                                          <button
                                            key={lesson.id}
                                            onClick={() => setSelectedLessonId(lesson.id)}
                                            className={`w-full rounded-lg border px-3 py-2 text-left transition ${active ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                                          >
                                            <p className={`truncate text-sm font-semibold ${active ? 'text-indigo-700' : 'text-slate-800'}`}>{lesson.title}</p>
                                            <p className="truncate text-xs text-slate-500">{lesson.videoName}</p>
                                          </button>
                                        )
                                      })}
                                    </div>
                                  </div>
                                </div>
                              )
                            })()
                          ) : (
                            <p className="text-sm text-slate-500">No videos.</p>
                          )}

                          <div>
                            <h4 className="text-sm font-extrabold tracking-widest text-slate-500">RESOURCES</h4>
                            {openCourseDetail.resources.length === 0 ? (
                              <p className="mt-1 text-sm text-slate-500">No resources.</p>
                            ) : (
                              <div className="mt-2 space-y-2">
                                {openCourseDetail.resources.map((res) => (
                                  <a
                                    key={res.id}
                                    href={toBackendAssetUrl(res.fileUrl)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                  >
                                    <span className="truncate font-semibold">{res.title || res.fileName}</span>
                                    <span className="ml-3 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-extrabold tracking-widest text-emerald-700">RESOURCE</span>
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setShowCreate(false)} />
          <div className="relative w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Create Course</h2>
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-lg border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Course Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter course title"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Course Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Describe what learners will get from this course"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <label className="mb-2 block text-xs font-semibold text-slate-600">Upload Videos (multiple)</label>
                <input type="file" multiple accept="video/*" onChange={onPickVideos} className="w-full text-sm" />
                <p className="mt-2 text-xs text-slate-500">{videoFiles.length} video file(s) selected</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <label className="mb-2 block text-xs font-semibold text-slate-600">Upload Resources (multiple)</label>
                <input type="file" multiple onChange={onPickResources} className="w-full text-sm" />
                <p className="mt-2 text-xs text-slate-500">{resourceFiles.length} resource file(s) selected</p>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  onClick={() => {
                    setShowCreate(false)
                    resetCreateForm()
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={createCourseInOneGo}
                  disabled={creating}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {creating ? 'Creating...' : 'Create Course'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
