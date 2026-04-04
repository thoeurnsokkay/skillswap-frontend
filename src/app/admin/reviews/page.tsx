'use client'
import { useEffect, useState } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import ConfirmModal from '@/components/ConfirmModal'
import api from '@/lib/api'
import { Review } from '@/types'
import toast from 'react-hot-toast'

type ModerationStatus = 'Live' | 'Flagged' | 'Deleted'

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewStatus, setReviewStatus] = useState<Record<number, ModerationStatus>>({})
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('All Statuses')
  const [ratingFilter, setRatingFilter] = useState('All Ratings')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pendingDeleteReviewId, setPendingDeleteReviewId] = useState<number | null>(null)
  const PER_PAGE = 6

  useEffect(() => {
    api.get('/api/users').then(async usersRes => {
      const users = usersRes.data.data
      if (users.length > 0) {
        const allReviews = await Promise.all(users.map((u: any) => api.get(`/api/reviews/user/${u.id}`)))
        const combined = allReviews.flatMap(r => r.data.data)

        // Deduplicate reviews when the same review appears in multiple user queries.
        const deduped = Array.from(new Map(combined.map((r: Review) => [r.id, r])).values())

        const initialStatus: Record<number, ModerationStatus> = {}
        deduped.forEach((r: Review) => {
          initialStatus[r.id] = r.rating <= 2 ? 'Flagged' : 'Live'
        })

        setReviews(deduped)
        setReviewStatus(initialStatus)
      }
    }).catch(() => toast.error('Failed')).finally(() => setLoading(false))
  }, [])

  const markStatus = (id: number, status: ModerationStatus, message: string) => {
    setReviewStatus(prev => ({ ...prev, [id]: status }))
    toast.success(message)
  }

  const deleteReviewByModal = (id: number) => {
    markStatus(id, 'Deleted', 'Review removed')
    setPendingDeleteReviewId(null)
  }

  const refreshList = () => {
    setLoading(true)
    api.get('/api/users').then(async usersRes => {
      const users = usersRes.data.data
      if (users.length > 0) {
        const allReviews = await Promise.all(users.map((u: any) => api.get(`/api/reviews/user/${u.id}`)))
        const combined = allReviews.flatMap(r => r.data.data)
        const deduped = Array.from(new Map(combined.map((r: Review) => [r.id, r])).values())
        setReviews(deduped)
        setReviewStatus(prev => {
          const next: Record<number, ModerationStatus> = {}
          deduped.forEach((r: Review) => {
            next[r.id] = prev[r.id] ?? (r.rating <= 2 ? 'Flagged' : 'Live')
          })
          return next
        })
      }
      toast.success('Review list refreshed')
    }).catch(() => toast.error('Failed to refresh')).finally(() => setLoading(false))
  }

  const exportCsv = () => {
    if (filtered.length === 0) {
      toast.error('No reviews to export')
      return
    }

    const rows = filtered.map((r) => [
      r.reviewer.name,
      r.reviewee.name,
      r.rating,
      r.comment,
      formatDate(r.createdAt),
      reviewStatus[r.id] ?? 'Live',
    ])

    const header = ['Reviewer', 'Reviewee', 'Rating', 'Comment', 'Date', 'Status']
    const csv = [header, ...rows]
      .map((line) => line.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `reviews-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success('CSV exported')
  }

  const Stars = ({ n }: { n: number }) => (
    <div className="flex gap-0.5">{[1,2,3,4,5].map(i=><span key={i} className={`text-sm ${i<=n?'text-yellow-400':'text-gray-200'}`}>★</span>)}</div>
  )

  const statusClass = (status: ModerationStatus) => {
    if (status === 'Live') return 'badge-green'
    if (status === 'Flagged') return 'badge-red'
    return 'badge-gray'
  }

  const formatDate = (dateString: string) => {
    const time = new Date(dateString).getTime()
    if (!Number.isFinite(time) || time <= 0) return 'N/A'
    return new Date(time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const filtered = reviews.filter((r) => {
    const status = reviewStatus[r.id] ?? 'Live'
    const statusOk = statusFilter === 'All Statuses' || status === statusFilter
    const ratingOk =
      ratingFilter === 'All Ratings' ||
      (ratingFilter === '5 Stars' && r.rating === 5) ||
      (ratingFilter === '4 Stars' && r.rating === 4) ||
      (ratingFilter === '3 Stars' && r.rating === 3) ||
      (ratingFilter === '1-2 Stars' && r.rating <= 2)

    const q = search.trim().toLowerCase()
    const searchOk =
      q.length === 0 ||
      r.reviewer.name.toLowerCase().includes(q) ||
      r.reviewee.name.toLowerCase().includes(q) ||
      r.comment.toLowerCase().includes(q)

    return statusOk && ratingOk && searchOk
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const pageStart = (safePage - 1) * PER_PAGE
  const paginated = filtered.slice(pageStart, pageStart + PER_PAGE)

  const avgRating = reviews.length ? (reviews.reduce((s,r)=>s+r.rating,0)/reviews.length).toFixed(1) : '0.0'
  const flaggedCount = Object.values(reviewStatus).filter((v) => v === 'Flagged').length

  return (
    <AdminLayout
      title="Review Monitoring"
      subtitle="Audit, moderate, and manage community feedback."
      actions={
        <div className="flex gap-2">
          <button className="sh-btn sh-btn-outline text-xs" onClick={exportCsv}>↓ Export CSV</button>
          <button className="sh-btn sh-btn-primary text-xs" onClick={refreshList}>↻ Refresh List</button>
        </div>
      }>

      {/* Filters */}
      <div className="sh-card p-4 mb-5">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">Status Filter</label>
            <select value={statusFilter} onChange={e=>{ setStatusFilter(e.target.value); setPage(1) }} className="sh-select w-full">
              <option>All Statuses</option>
              <option>Live</option>
              <option>Flagged</option>
              <option>Deleted</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">Rating Filter</label>
            <select value={ratingFilter} onChange={e=>{ setRatingFilter(e.target.value); setPage(1) }} className="sh-select w-full">
              <option>All Ratings</option>
              <option>5 Stars</option>
              <option>4 Stars</option>
              <option>3 Stars</option>
              <option>1-2 Stars</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">Search Reviews</label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
              <input value={search} onChange={e=>{ setSearch(e.target.value); setPage(1) }} className="sh-input pl-7 text-sm" placeholder="Search by user or keyword..." />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="sh-card overflow-hidden mb-5">
        <table className="sh-table">
          <thead><tr>{['REVIEWER','REVIEWEE','RATING','COMMENT','DATE','STATUS','ACTIONS'].map(h=><th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {loading ? [1,2,3].map(i=><tr key={i}><td colSpan={7}><div className="h-10 bg-gray-100 rounded animate-pulse"/></td></tr>)
            : filtered.length === 0 ? <tr><td colSpan={7} className="text-center py-10 text-gray-400">No reviews found</td></tr>
            : paginated.map((r) => {
              const status = reviewStatus[r.id] ?? 'Live'
              const isDeleted = status === 'Deleted'
              return (
                <tr key={r.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">{r.reviewer.name.charAt(0)}{r.reviewer.name.split(' ')[1]?.charAt(0)||''}</div>
                      <span className="font-medium text-sm">{r.reviewer.name}</span>
                    </div>
                  </td>
                  <td className="font-medium text-sm text-gray-700">{r.reviewee.name}</td>
                  <td><Stars n={r.rating} /></td>
                  <td className="max-w-xs">
                    <p className={`text-sm leading-relaxed ${isDeleted?'line-through text-gray-300':' text-gray-600'}`}>
                      {isDeleted ? 'Content removed by moderator for violating community guidelines.' : `"${r.comment}"`}
                    </p>
                  </td>
                  <td className="text-gray-500 text-sm whitespace-nowrap">{formatDate(r.createdAt)}</td>
                  <td><span className={`badge text-xs ${statusClass(status)}`}>{status}</span></td>
                  <td>
                    <div className="flex gap-1.5">
                      {isDeleted ? (
                        <button
                          onClick={() => markStatus(r.id, 'Live', 'Review restored')}
                          className="px-2 py-1 text-xs rounded border border-blue-200 text-blue-700 hover:bg-blue-50"
                        >
                          Restore
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => markStatus(r.id, 'Flagged', 'Review flagged')}
                            className="w-6 h-6 flex items-center justify-center rounded hover:bg-yellow-50 text-yellow-500 text-xs"
                            title="Flag review"
                          >
                            ⚠️
                          </button>
                          <button
                            onClick={() => markStatus(r.id, 'Live', 'Review approved')}
                            className="w-6 h-6 flex items-center justify-center rounded hover:bg-blue-50 text-blue-600 text-xs"
                            title="Approve review"
                          >
                            ✅
                          </button>
                          <button
                            onClick={() => setPendingDeleteReviewId(r.id)}
                            className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 text-red-500 text-xs"
                            title="Delete review"
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
          <p className="text-sm text-gray-500">Showing <b>{filtered.length === 0 ? 0 : pageStart + 1} to {Math.min(pageStart + PER_PAGE, filtered.length)}</b> of <b>{filtered.length}</b> reviews</p>
          <div className="pagination">
            <button className="page-btn-arrow" onClick={() => setPage((p) => Math.max(1, p - 1))}>‹</button>
            {Array.from({ length: Math.min(totalPages, 6) }, (_, i) => i + 1).map(p =>
              <button key={p} onClick={() => setPage(p)} className={`page-btn flex items-center justify-center ${p===safePage?'active':''}`}>{p}</button>
            )}
            <button className="page-btn-arrow" onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>›</button>
          </div>
        </div>
      </div>

      {/* Bottom Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon:'📈', label:'AVG. COMMUNITY RATING', val:avgRating, sub:'+0.2 this week', subColor:'text-blue-600' },
          { icon:'🚩', label:'PENDING FLAGS',          val: String(flaggedCount), sub:'Requires action', subColor:'text-gray-400' },
          { icon:'⭐', label:'TOTAL REVIEWS',          val: reviews.length.toString(), sub:'↑ 8% growth', subColor:'text-blue-600' },
        ].map(s => (
          <div key={s.label} className="sh-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">{s.icon}</div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">{s.label}</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-gray-900">{s.val}</span>
              <span className={`text-xs font-semibold mb-1 ${s.subColor}`}>{s.sub}</span>
            </div>
          </div>
        ))}
      </div>

      <ConfirmModal
        open={pendingDeleteReviewId !== null}
        title="Delete Review"
        message="Delete this review from moderation view?"
        confirmText="Delete Review"
        onCancel={() => setPendingDeleteReviewId(null)}
        onConfirm={() => {
          if (pendingDeleteReviewId !== null) deleteReviewByModal(pendingDeleteReviewId)
        }}
      />
    </AdminLayout>
  )
}
