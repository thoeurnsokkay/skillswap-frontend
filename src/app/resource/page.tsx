'use client'

import { useEffect, useMemo, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import ResourceList from '@/components/ResourceList'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import { Match, Resource } from '@/types'
import toast from 'react-hot-toast'

type MatchFilter = 'ALL' | number | null

export default function ResourcePage() {
  const { user: me } = useAuthStore()
  const [matches, setMatches] = useState<Match[]>([])
  const [selectedMatchId, setSelectedMatchId] = useState<MatchFilter>(null)
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [resourceLoading, setResourceLoading] = useState(false)

  const normalizeResources = (items: Resource[]) => {
    const uniqueById = new Map<number, Resource>()
    items.forEach((item) => uniqueById.set(item.id, item))
    return Array.from(uniqueById.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }

  useEffect(() => {
    if (!me) return

    setLoading(true)
    api.get('/api/matches')
      .then((res) => {
        const allMatches: Match[] = res.data?.data ?? []
        const acceptedMatches = allMatches.filter((m) =>
          m.status === 'ACCEPTED' && (m.user1?.id === me.id || m.user2?.id === me.id)
        )
        setMatches(acceptedMatches)
        setSelectedMatchId(acceptedMatches.length > 0 ? 'ALL' : null)
      })
      .catch(() => {
        setMatches([])
        setSelectedMatchId(null)
        toast.error('Failed to load your matches')
      })
      .finally(() => setLoading(false))
  }, [me])

  useEffect(() => {
    if (!selectedMatchId) {
      setResources([])
      return
    }

    if (matches.length === 0) {
      setResources([])
      return
    }

    setResourceLoading(true)

    if (selectedMatchId === 'ALL') {
      Promise.all(
        matches.map((m) =>
          api.get(`/api/resources/match/${m.id}`)
            .then((res) => (Array.isArray(res.data) ? res.data : (res.data?.data ?? [])))
            .catch(() => [])
        )
      )
        .then((allLists) => {
          const flat = allLists.flat()
          setResources(normalizeResources(flat))
        })
        .catch(() => {
          setResources([])
          toast.error('Failed to load resources')
        })
        .finally(() => setResourceLoading(false))
      return
    }

    api.get(`/api/resources/match/${selectedMatchId}`)
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : (res.data?.data ?? [])
        setResources(normalizeResources(data))
      })
      .catch(() => {
        setResources([])
        toast.error('Failed to load resources')
      })
      .finally(() => setResourceLoading(false))
  }, [selectedMatchId, matches])

  const uploadFile = async (file: File) => {
    if (!me?.id) {
      toast.error('Please login first')
      return
    }
    if (!selectedMatchId || selectedMatchId === 'ALL') {
      toast.error('Choose a specific match to upload files')
      return
    }
    if (matches.length === 0) {
      toast.error('Please select an accepted match first')
      return
    }

    setResourceLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('matchId', String(selectedMatchId))

      const res = await api.post('/api/resources/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      setResources((prev) => [res.data, ...prev])
      toast.success('File uploaded')
    } catch {
      toast.error('Upload failed')
    } finally {
      setResourceLoading(false)
    }
  }

  const deleteResource = async (id: number) => {
    try {
      await api.delete(`/api/resources/${id}`)
      setResources((prev) => prev.filter((r) => r.id !== id))
      toast.success('Deleted successfully')
    } catch {
      toast.error('Failed to delete file')
    }
  }

  const selectedMatch = useMemo(
    () => (typeof selectedMatchId === 'number' ? matches.find((m) => m.id === selectedMatchId) ?? null : null),
    [matches, selectedMatchId]
  )

  const partnerName = selectedMatch
    ? (selectedMatch.user1.id === me?.id ? selectedMatch.user2.name : selectedMatch.user1.name)
    : null

  const viewSubtitle = selectedMatchId === 'ALL'
    ? 'Showing files from all accepted matches'
    : (partnerName ? `Currently viewing files shared with ${partnerName}` : 'Select an accepted match to view files')

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shared Resources</h1>
          <p className="text-sm text-gray-500 mt-1">Upload and manage files for your accepted skill swaps.</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="font-semibold text-slate-900">Match Workspace</h2>
              <p className="text-xs text-slate-500 mt-1">
                {viewSubtitle}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <button
              type="button"
              onClick={() => setSelectedMatchId('ALL')}
              disabled={loading || matches.length === 0}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${selectedMatchId === 'ALL' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:text-emerald-700'}`}
            >
              All Matches
            </button>
            {matches.map((m) => {
              const otherName = m.user1.id === me?.id ? m.user2.name : m.user1.name
              const active = selectedMatchId === m.id
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMatchId(m.id)}
                  disabled={loading}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${active ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:text-emerald-700'}`}
                >
                  {`#${m.id} ${otherName}`}
                </button>
              )
            })}
          </div>

          <ResourceList
            resources={resources}
            loading={resourceLoading || loading}
            uploaderId={me?.id ?? 0}
            onUpload={uploadFile}
            onDelete={deleteResource}
          />
        </div>
      </div>
    </AppLayout>
  )
}