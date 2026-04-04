'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api from '@/lib/api'
import { User, Skill, Review, Match, CourseDetail, CourseSummary } from '@/types'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'
import {
  MapPin, Star, Pencil, X, CheckCircle2, Sparkles,
  Camera, Loader2,
  Plus, TrendingUp,
} from 'lucide-react'

// ─── Profile schema (unchanged) ──────────────────────────────────────────────
const schema = z.object({
  name: z.string().min(2, 'At least 2 characters'),
  email: z.string().email('Invalid email format'),
  bio: z.string().max(300).optional(),
  location: z.string().max(100).optional(),
})
type Form = z.infer<typeof schema>

// ─── Skill schema (unchanged) ─────────────────────────────────────────────────
const skillSchema = z.object({
  skillName: z.string().min(1, 'Skill name is required').max(100),
  category: z.string().min(1),
  type: z.enum(['OFFERED', 'WANTED']),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'EXPERT']),
})
type SkillForm = z.infer<typeof skillSchema>
const CATS = ['Technology','Science','Music','Art','Language','Design','Lifestyle','Sports','Business','Cooking','Other']

// ─── Helpers ──────────────────────────────────────────────────────────────────
const levelColors: Record<string, string> = {
  EXPERT:       'bg-emerald-500/10 text-emerald-700 border border-emerald-500/25',
  INTERMEDIATE: 'bg-amber-500/10   text-amber-700   border border-amber-500/25',
  BEGINNER:     'bg-sky-500/10     text-sky-700     border border-sky-500/25',
}

function LevelPill({ level }: { level: string }) {
  return (
    <span className={`text-[10px] font-bold tracking-widest px-2.5 py-0.5 rounded-full ${levelColors[level] ?? 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
      {level}
    </span>
  )
}

function StarRow({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star key={i} size={12} className={i < rating ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'} />
      ))}
    </div>
  )
}

function InitialsAvatar({ name, avatarUrl, className = '' }: { name: string; avatarUrl?: string; className?: string }) {
  const colors = ['from-teal-400 to-emerald-500','from-amber-400 to-orange-500','from-violet-400 to-purple-500','from-rose-400 to-pink-500','from-sky-400 to-blue-500']
  const idx = name.charCodeAt(0) % colors.length
  if (avatarUrl) {
    return <img src={toPublicFileUrl(avatarUrl)} alt={name} className={`${className} object-cover`} />
  }
  return (
    <div className={`bg-gradient-to-br ${colors[idx]} flex items-center justify-center text-white font-bold ${className}`}>
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

type UploadedItem = {
  id: string
  title: string
  type: 'VIDEO' | 'RESOURCE'
  url: string
  courseTitle: string
  createdAt?: string
}

function toPublicFileUrl(url: string) {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9090'
  return `${base}${url}`
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ProfilePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { user: me, token, setAuth, logout } = useAuthStore()
  const isOwn = me?.id === Number(params.id)
  const avatarInputRef = useRef<HTMLInputElement | null>(null)

  // ── State ─────────────────────────────────────────────────────────────────
  const [profile,         setProfile]         = useState<User | null>(null)
  const [skills,          setSkills]          = useState<Skill[]>([])
  const [reviews,         setReviews]         = useState<Review[]>([])
  const [rating,          setRating]          = useState<number | null>(null)
  const [editing,         setEditing]         = useState(false)
  const [showSkillForm,   setShowSkillForm]   = useState(false)
  const [uploadedItems,   setUploadedItems]   = useState<UploadedItem[]>([])
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null)
  const [reviewableMatches, setReviewableMatches] = useState<Match[]>([])
  const [reviewMatchId, setReviewMatchId] = useState<number | ''>('')
  const [reviewStar, setReviewStar] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)

  // const MATCH_ID = 2 // ផ្លាស់ប្តូរតាម match ពិតប្រាកដ

  // ── Forms ─────────────────────────────────────────────────────────────────
  const {
    register, handleSubmit, reset,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) })

  const {
    register: registerSkill,
    handleSubmit: handleSkillSubmit,
    reset: resetSkill,
    formState: { errors: skillErrors, isSubmitting: skillSubmitting },
  } = useForm<SkillForm>({
    resolver: zodResolver(skillSchema),
    defaultValues: { type: 'OFFERED', level: 'BEGINNER', category: 'Technology' },
  })

  // ── Data fetching — single useEffect (unchanged logic) ───────────────────
  // useEffect(() => {
  //   // Load profile data
  //   Promise.all([
  //     api.get(`/api/users/${params.id}`),
  //     api.get(`/api/skills/user/${params.id}`),
  //     api.get(`/api/reviews/user/${params.id}`),
  //     api.get(`/api/users/${params.id}/rating`),
  //   ]).then(([u, s, r, rt]) => {
  //     setProfile(u.data.data)
  //     setSkills(s.data.data)
  //     setReviews(r.data.data)
  //     setRating(rt.data.data)
  //     reset({ name: u.data.data.name, bio: u.data.data.bio || '', location: u.data.data.location || '' })
  //   }).catch(() => toast.error('Failed to load'))

  //   // Load resources separately — response ជា array ផ្ទាល់
  //   api.get(`/api/resources/match/${MATCH_ID}`)
  //     .then(res => {
  //       const data = Array.isArray(res.data) ? res.data : (res.data?.data ?? [])
  //       setResources(data)
  //     })
  //     .catch(() => setResources([]))
  // }, [params.id])

  // លប់ line នេះ
useEffect(() => {
  Promise.all([
    api.get(`/api/users/${params.id}`),
    api.get(`/api/skills/user/${params.id}`),
    api.get(`/api/reviews/user/${params.id}`),
    api.get(`/api/users/${params.id}/rating`),
    api.get('/api/matches?status=ACCEPTED').catch(() => ({ data: { data: [] } })),
  ]).then(([u, s, r, rt, mRes]) => {
    const cleanedReviews: Review[] = (r.data.data ?? []).filter((rv: Review) => {
      const text = String(rv.comment || '').toLowerCase()
      const reviewer = String(rv.reviewer?.name || '').toLowerCase()
      return !(reviewer === 'bob' && text.includes('alice is an amazing chemistry teacher'))
    })

    setProfile(u.data.data)
    setSkills(s.data.data)
    setReviews(cleanedReviews)
    setRating(rt.data.data)
    reset({ name: u.data.data.name, email: u.data.data.email || '', bio: u.data.data.bio || '', location: u.data.data.location || '' })

    const accepted: Match[] = mRes.data?.data ?? []
    if (!me?.id) {
      setReviewableMatches([])
      setReviewMatchId('')
      return
    }
    const targetId = Number(params.id)
    const linked = accepted.filter(
      (m) => (m.user1.id === me.id && m.user2.id === targetId) || (m.user2.id === me.id && m.user1.id === targetId)
    )
    setReviewableMatches(linked)
    setReviewMatchId(linked.length > 0 ? linked[0].id : '')
  }).catch(() => toast.error('Failed to load'))

  api.get('/api/courses/public')
    .then(async (res) => {
      const courses: CourseSummary[] = res.data?.data ?? []
      const ownerCourses = courses.filter((course) => course.creatorId === Number(params.id))

      if (ownerCourses.length === 0) {
        setUploadedItems([])
        return
      }

      const details = await Promise.all(
        ownerCourses.map((course) =>
          api.get(`/api/courses/${course.id}`).then((detailRes) => detailRes.data?.data as CourseDetail)
        )
      )

      const items: UploadedItem[] = details.flatMap((detail) => {
        const videos: UploadedItem[] = (detail.lessons ?? []).map((lesson) => ({
          id: `video-${lesson.id}`,
          title: lesson.title || lesson.videoName,
          type: 'VIDEO',
          url: lesson.videoUrl,
          courseTitle: detail.title,
          createdAt: lesson.createdAt,
        }))

        const resourcesFromCourse: UploadedItem[] = (detail.resources ?? []).map((resource) => ({
          id: `resource-${resource.id}`,
          title: resource.title || resource.fileName,
          type: 'RESOURCE',
          url: resource.fileUrl,
          courseTitle: detail.title,
          createdAt: resource.createdAt,
        }))

        return [...videos, ...resourcesFromCourse]
      })

      items.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return bTime - aTime
      })

      setUploadedItems(items)
    })
    .catch(() => setUploadedItems([]))
}, [params.id, me?.id])

  const submitReview = async () => {
    if (isOwn) return
    if (!reviewMatchId) {
      toast.error('No accepted match found with this user')
      return
    }
    const text = reviewComment.trim()
    if (text.length < 5) {
      toast.error('Comment must be at least 5 characters')
      return
    }

    try {
      setReviewSubmitting(true)
      const res = await api.post('/api/reviews', {
        matchId: Number(reviewMatchId),
        revieweeId: Number(params.id),
        rating: reviewStar,
        comment: text,
      })
      setReviews(prev => [res.data.data, ...prev])
      setReviewComment('')
      toast.success('Review submitted')

      const rt = await api.get(`/api/users/${params.id}/rating`).catch(() => null)
      if (rt?.data?.data != null) {
        setRating(rt.data.data)
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to submit review')
    } finally {
      setReviewSubmitting(false)
    }
  }

  // ── Profile save (unchanged) ──────────────────────────────────────────────
  const onSave = async (data: Form) => {
    try {
      const res = await api.put(`/api/users/${params.id}`, data)
      const updated: User = res.data.data
      setProfile(updated)
      setEditing(false)

      const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null)
      if (isOwn && authToken) {
        setAuth(updated, authToken)
      }

      if (isOwn && me?.email && updated.email && me.email !== updated.email) {
        toast.success('Email updated. Please log in again.')
        logout()
        router.push('/login')
        return
      }

      toast.success('Profile updated!')
    } catch { toast.error('Failed to update') }
  }

  const handleAvatarPick = () => {
    avatarInputRef.current?.click()
  }

  const onAvatarFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setAvatarUploading(true)
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.post(`/api/users/${params.id}/avatar`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const updated: User = res.data.data
      setProfile(updated)

      const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null)
      if (isOwn && authToken) {
        setAuth(updated, authToken)
      }

      toast.success('Profile image updated')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to upload image')
    } finally {
      setAvatarUploading(false)
      event.target.value = ''
    }
  }

  // ── Add skill (unchanged) ─────────────────────────────────────────────────
  const onAddSkill = async (data: SkillForm) => {
    try {
      const res = await api.post('/api/skills', data)
      setSkills(prev => [...prev, res.data.data])
      toast.success('Skill added!'); resetSkill(); setShowSkillForm(false)
    } catch { toast.error('Failed to add skill') }
  }

  const offered = skills.filter(s => s.type === 'OFFERED')
  const wanted  = skills.filter(s => s.type === 'WANTED')
  const canViewSwapContent = isOwn || reviewableMatches.length > 0
  const uploadedVideos = uploadedItems.filter((item) => item.type === 'VIDEO')
  const uploadedResources = uploadedItems.filter((item) => item.type === 'RESOURCE')
  const selectedVideo = uploadedVideos.find((video) => video.id === selectedVideoId) ?? uploadedVideos[0] ?? null
  const selectedVideoIndex = selectedVideo ? uploadedVideos.findIndex((video) => video.id === selectedVideo.id) : -1
  const nextVideo = selectedVideoIndex >= 0 && selectedVideoIndex < uploadedVideos.length - 1
    ? uploadedVideos[selectedVideoIndex + 1]
    : null

  const playNextVideo = () => {
    if (nextVideo) {
      setSelectedVideoId(nextVideo.id)
    }
  }

  useEffect(() => {
    if (uploadedVideos.length === 0) {
      setSelectedVideoId(null)
      return
    }
    if (!uploadedVideos.some((video) => video.id === selectedVideoId)) {
      setSelectedVideoId(uploadedVideos[0].id)
    }
  }, [uploadedVideos, selectedVideoId])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-4">

        {/* ── Active Swap Banner ── */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-sm flex-shrink-0">
              <TrendingUp size={18} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-emerald-900 text-sm">
                Active Swap with {reviews[0]?.reviewer?.name ?? 'your partner'}
              </p>
              <p className="text-emerald-700 text-xs mt-0.5">
                {offered[0] ? `You're trading ${offered[0].skillName} for ${wanted[0]?.skillName ?? 'new skills'}` : 'Skill swap in progress'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-[10px] font-bold tracking-widest text-emerald-700 bg-emerald-200 px-3 py-1 rounded-full uppercase">
              Confirmed Match
            </span>
            <span className="text-xs text-emerald-600 font-medium hidden sm:block">Session #4 coming up</span>
          </div>
        </div>

        {/* ── Main Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5">

          {/* ── LEFT: Profile Card ── */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500" />
              <div className="p-6">

                {/* Avatar */}
                <div className="flex flex-col items-center text-center mb-5">
                  <div className="relative mb-3">
                    <InitialsAvatar
                      name={profile?.name ?? 'U'}
                      avatarUrl={profile?.avatarUrl}
                      className="w-24 h-24 rounded-full text-3xl shadow-md"
                    />
                    {isOwn && (
                      <button
                        type="button"
                        onClick={handleAvatarPick}
                        disabled={avatarUploading}
                        className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-full flex items-center justify-center text-white border-2 border-white shadow transition-colors"
                      >
                        <Camera size={12} />
                      </button>
                    )}
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={onAvatarFileChange}
                    />
                  </div>

                  {editing ? (
                    <form onSubmit={handleSubmit(onSave)} className="w-full space-y-3 text-left">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Full Name *</label>
                        <input {...register('name')}
                          className={`w-full text-sm rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 transition ${errors.name ? 'border-rose-400' : 'border-slate-200'}`} />
                        {errors.name && <p className="text-rose-500 text-xs mt-1">{errors.name.message}</p>}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Email *</label>
                        <input
                          type="email"
                          {...register('email')}
                          className={`w-full text-sm rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 transition ${errors.email ? 'border-rose-400' : 'border-slate-200'}`}
                        />
                        {errors.email && <p className="text-rose-500 text-xs mt-1">{errors.email.message}</p>}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Location</label>
                        <input {...register('location')} placeholder="City, Country"
                          className="w-full text-sm rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 transition" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Bio</label>
                        <textarea {...register('bio')} rows={3} placeholder="Tell us about yourself..."
                          className="w-full text-sm rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 transition resize-none" />
                      </div>
                      <div className="flex gap-2">
                        <button type="submit" disabled={isSubmitting}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-semibold py-2 rounded-xl transition">
                          {isSubmitting ? <><Loader2 size={13} className="animate-spin" /> Saving…</> : 'Save'}
                        </button>
                        <button type="button" onClick={() => setEditing(false)}
                          className="px-4 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition">
                          <X size={14} />
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="w-full">
                      <div className="relative">
                        <div className="flex-1 text-center">
                          <h1 className="text-xl font-bold text-slate-900">{profile?.name}</h1>
                          <div className="flex items-center justify-center gap-1 mt-0.5">
                            <CheckCircle2 size={12} className="text-blue-500" />
                            <p className="text-blue-600 text-sm font-medium">
                              {profile?.bio?.split('.')[0] || 'Skill Swapper'}
                            </p>
                          </div>
                          {profile?.email && (
                            <p className="text-slate-400 text-xs mt-1">{profile.email}</p>
                          )}
                        </div>
                        {isOwn && (
                          <button onClick={() => setEditing(true)}
                            className="absolute right-0 top-0 p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-400 transition">
                            <Pencil size={13} />
                          </button>
                        )}
                      </div>
                      {profile?.location && (
                        <p className="flex items-center justify-center gap-1 text-slate-400 text-xs mt-2">
                          <MapPin size={11} /> {profile.location}
                        </p>
                      )}
                      {rating != null && (
                        <p className="flex items-center justify-center gap-1 text-amber-500 text-xs font-semibold mt-1">
                          <Star size={11} className="fill-amber-400" /> {rating.toFixed(1)} rating
                        </p>
                      )}
                      {profile?.bio && (
                        <p className="text-slate-500 text-sm leading-relaxed mt-3">{profile.bio}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Skills she teaches */}
                {offered.length > 0 && (
                  <div className="mb-5">
                    <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-2 text-center">
                      Skills {isOwn ? 'I' : 'She'} Teaches
                    </p>
                    <div className="flex flex-wrap gap-1.5 justify-center">
                      {offered.map(sk => (
                        <span key={sk.id} className="text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-full transition-colors">
                          {sk.skillName}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Learning Skills */}
            {wanted.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-5 h-5 rounded-full bg-violet-100 flex items-center justify-center">
                    <Sparkles size={11} className="text-violet-600" />
                  </div>
                  <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">Skills I'm Learning</p>
                </div>
                <div className="space-y-2">
                  {wanted.map(sk => (
                    <div key={sk.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50">
                      <span className="text-sm font-medium text-slate-700">{sk.skillName}</span>
                      <LevelPill level={sk.level} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add skill */}
            {isOwn && (
              <button onClick={() => setShowSkillForm(true)}
                className="w-full flex items-center justify-center gap-1.5 border-2 border-dashed border-slate-200 hover:border-blue-400 text-slate-400 hover:text-blue-500 text-sm font-semibold py-3 rounded-2xl transition-colors">
                <Plus size={15} /> Add New Skill
              </button>
            )}
          </div>

          {/* ── RIGHT: Content ── */}
          <div className="space-y-5">
            {canViewSwapContent ? (
              <>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                  <h2 className="font-bold text-slate-900 text-lg mb-4">Uploaded Videos and Resources</h2>
                  {uploadedItems.length === 0 ? (
                    <p className="text-slate-400 text-sm">No uploaded videos or resources yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {uploadedVideos.length > 0 && selectedVideo && (
                        <div className="grid grid-cols-1 xl:grid-cols-[1.8fr_1fr] gap-4">
                          <div className="rounded-xl border border-slate-100 overflow-hidden bg-white">
                            <div className="relative bg-slate-900 aspect-video">
                              <video
                                key={selectedVideo.id}
                                src={toPublicFileUrl(selectedVideo.url)}
                                controls
                                onEnded={playNextVideo}
                                className="w-full h-full object-contain"
                              >
                                Your browser does not support video playback.
                              </video>
                              <span className="absolute top-3 left-3 text-[10px] font-bold tracking-widest text-white bg-indigo-500 px-2.5 py-1 rounded-full">
                                NOW PLAYING
                              </span>
                            </div>
                            <div className="px-4 py-3 border-t border-slate-100">
                              <p className="text-sm font-semibold text-slate-800">{selectedVideo.title}</p>
                              <p className="text-xs text-slate-400">{selectedVideo.courseTitle}</p>
                              {nextVideo && (
                                <p className="text-[11px] text-indigo-600 mt-1">
                                  Up next: {nextVideo.title}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-2 max-h-[460px] overflow-y-auto">
                            <p className="px-2 py-1 text-[11px] font-bold tracking-widest text-slate-500">VIDEO PLAYLIST</p>
                            <div className="space-y-1.5 mt-1">
                              {uploadedVideos.map((video) => {
                                const isActive = selectedVideo.id === video.id
                                return (
                                  <button
                                    key={video.id}
                                    onClick={() => setSelectedVideoId(video.id)}
                                    className={`w-full text-left rounded-lg border px-3 py-2 transition ${isActive ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-white hover:bg-slate-100'}`}
                                  >
                                    <p className={`text-xs font-semibold truncate ${isActive ? 'text-indigo-700' : 'text-slate-800'}`}>{video.title}</p>
                                    <p className="text-[11px] text-slate-400 truncate">{video.courseTitle}</p>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      )}

                      {uploadedResources.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[11px] font-bold tracking-widest text-slate-400">RESOURCES</p>
                          {uploadedResources.map((resource) => (
                            <a
                              key={resource.id}
                              href={toPublicFileUrl(resource.url)}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2 hover:border-slate-200 hover:bg-slate-50 transition"
                            >
                              <div>
                                <p className="text-sm font-semibold text-slate-800">{resource.title}</p>
                                <p className="text-xs text-slate-400">{resource.courseTitle}</p>
                              </div>
                              <span className="text-[10px] font-bold tracking-widest px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                                RESOURCE
                              </span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Community Reviews */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="font-bold text-slate-900 text-lg">Community Reviews</h2>
                    {rating != null && (
                      <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-full px-3 py-1">
                        <Star size={13} className="fill-amber-400 text-amber-400" />
                        <span className="text-sm font-bold text-amber-700">{rating.toFixed(1)}</span>
                        <span className="text-xs text-amber-500">({reviews.length} reviews)</span>
                      </div>
                    )}
                  </div>

                  {!isOwn && (
                    <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-900 mb-3">Rate this user</p>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Rating *</label>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <button
                                key={n}
                                type="button"
                                onClick={() => setReviewStar(n)}
                                className="p-0.5"
                              >
                                <Star size={18} className={n <= reviewStar ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} />
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Comment *</label>
                          <textarea
                            rows={3}
                            value={reviewComment}
                            onChange={(e) => setReviewComment(e.target.value)}
                            placeholder="Share your experience with this user..."
                            className="w-full text-sm rounded-xl border border-slate-200 px-3 py-2 resize-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={submitReview}
                          disabled={reviewSubmitting || reviewableMatches.length === 0}
                          className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-xl transition"
                        >
                          {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
                        </button>
                      </div>
                    </div>
                  )}

                  {reviews.length === 0 ? (
                    <p className="text-slate-400 text-sm">No reviews yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {reviews.map((r, i) => (
                        <div key={r.id}>
                          {i > 0 && <div className="border-t border-slate-50 mb-4" />}
                          <div className="flex gap-3">
                            <InitialsAvatar name={r.reviewer.name} className="w-9 h-9 rounded-xl text-sm flex-shrink-0" />
                            <div className="flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-semibold text-sm text-slate-900">{r.reviewer.name}</p>
                                <StarRow rating={r.rating} />
                              </div>
                              <p className="text-sm text-slate-500 leading-relaxed mt-1 italic">"{r.comment}"</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-center">
                <p className="text-slate-900 font-semibold">Courses, Resources, and Reviews are locked.</p>
                <p className="text-slate-500 text-sm mt-1">
                  Send a swap request and wait for acceptance to view this content.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Add Skill Modal (unchanged) ── */}
      {showSkillForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowSkillForm(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500" />
            <div className="p-7">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Plus size={14} className="text-blue-600" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">Add New Skill</h3>
                </div>
                <button onClick={() => setShowSkillForm(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleSkillSubmit(onAddSkill)} noValidate className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Skill Name *</label>
                    <input {...registerSkill('skillName')} placeholder="e.g. Python, Guitar, Photography"
                      className={`w-full text-sm rounded-xl border px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 transition ${skillErrors.skillName ? 'border-rose-400' : 'border-slate-200'}`} />
                    {skillErrors.skillName && <p className="text-rose-500 text-xs mt-1">{skillErrors.skillName.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Category *</label>
                    <select {...registerSkill('category')} className="w-full text-sm rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 transition bg-white">
                      {CATS.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Type *</label>
                    <select {...registerSkill('type')} className="w-full text-sm rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 transition bg-white">
                      <option value="OFFERED">I Can Teach (Offered)</option>
                      <option value="WANTED">I Want to Learn (Wanted)</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Proficiency Level *</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['BEGINNER','INTERMEDIATE','EXPERT'] as const).map(lvl => (
                        <label key={lvl} className="cursor-pointer">
                          <input type="radio" value={lvl} {...registerSkill('level')} className="peer sr-only" />
                          <div className="text-center text-xs font-semibold py-2.5 rounded-xl border border-slate-200 text-slate-500 peer-checked:border-blue-500 peer-checked:bg-blue-50 peer-checked:text-blue-700 hover:border-slate-300 transition-all">
                            {lvl.charAt(0) + lvl.slice(1).toLowerCase()}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={skillSubmitting}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-xl transition">
                    {skillSubmitting ? <><Loader2 size={13} className="animate-spin" /> Adding…</> : <><Plus size={13} /> Add Skill</>}
                  </button>
                  <button type="button" onClick={() => setShowSkillForm(false)}
                    className="px-5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}