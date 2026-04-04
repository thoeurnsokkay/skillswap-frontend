'use client'
import { useState } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import ConfirmModal from '@/components/ConfirmModal'
import toast from 'react-hot-toast'

type ReportStatus = 'Pending' | 'In Progress' | 'Resolved' | 'Dismissed'
type Severity = 'Low' | 'Medium' | 'High'

type ReportItem = {
  id: number
  reporter: string
  reportedUser: string
  content: string
  reason: string
  status: ReportStatus
  severity: Severity
  createdAt: string
}

const INITIAL_REPORTS: ReportItem[] = [
  { id: 1, reporter: 'Sarah Jenkins', reportedUser: 'David Miller', content: 'Advanced React Workshop', reason: 'Misleading content', status: 'Pending', severity: 'Medium', createdAt: '2026-04-03T10:30:00Z' },
  { id: 2, reporter: 'Michael Chen', reportedUser: 'Yoga Basics', content: 'Video Lesson', reason: 'Copyright violation', status: 'Resolved', severity: 'High', createdAt: '2026-04-03T08:10:00Z' },
  { id: 3, reporter: 'Alex Rivera', reportedUser: 'Tom Wilson', content: 'User Profile', reason: 'Harassment', status: 'In Progress', severity: 'High', createdAt: '2026-04-02T15:20:00Z' },
  { id: 4, reporter: 'Elena Rodriguez', reportedUser: 'Intro to Sketching', content: 'Service Posting', reason: 'Spam/Scam', status: 'Dismissed', severity: 'Low', createdAt: '2026-04-02T13:55:00Z' },
  { id: 5, reporter: 'Maya Smith', reportedUser: 'Julian Moss', content: 'Review Section', reason: 'Inappropriate language', status: 'Pending', severity: 'Medium', createdAt: '2026-04-02T09:05:00Z' },
  { id: 6, reporter: 'Chris Nolan', reportedUser: 'Lena Park', content: 'Skill Description', reason: 'Misleading content', status: 'Pending', severity: 'Low', createdAt: '2026-04-01T18:43:00Z' },
  { id: 7, reporter: 'Brian Lee', reportedUser: 'Course JS Mastery', content: 'Paid-only links', reason: 'Spam/Scam', status: 'In Progress', severity: 'Medium', createdAt: '2026-04-01T15:40:00Z' },
  { id: 8, reporter: 'Dina Sam', reportedUser: 'Lucas Gray', content: 'Direct Message', reason: 'Harassment', status: 'Pending', severity: 'High', createdAt: '2026-03-31T20:12:00Z' },
  { id: 9, reporter: 'Sophie Wang', reportedUser: 'English Tutor', content: 'Course Cover', reason: 'Copyright violation', status: 'Resolved', severity: 'High', createdAt: '2026-03-31T16:02:00Z' },
  { id: 10, reporter: 'Jonas Hill', reportedUser: 'Marina Poe', content: 'Public Profile', reason: 'Inappropriate language', status: 'Dismissed', severity: 'Low', createdAt: '2026-03-30T14:08:00Z' },
  { id: 11, reporter: 'Rita Khan', reportedUser: 'Robotics for Kids', content: 'Lesson Notes', reason: 'Misleading content', status: 'In Progress', severity: 'Medium', createdAt: '2026-03-30T09:33:00Z' },
  { id: 12, reporter: 'Tina Moore', reportedUser: 'Aron Bell', content: 'Private Message', reason: 'Harassment', status: 'Pending', severity: 'High', createdAt: '2026-03-29T21:26:00Z' },
]

const PER_PAGE = 6

export default function AdminReportsPage() {
  const [reports, setReports] = useState<ReportItem[]>(INITIAL_REPORTS)
  const [activeTab, setActiveTab] = useState<'All' | ReportStatus>('All')
  const [query, setQuery] = useState('')
  const [reasonFilter, setReasonFilter] = useState('All Reasons')
  const [page, setPage] = useState(1)
  const [pendingDeleteReportId, setPendingDeleteReportId] = useState<number | null>(null)

  const counts = {
    all: reports.length,
    pending: reports.filter((r) => r.status === 'Pending').length,
    inProgress: reports.filter((r) => r.status === 'In Progress').length,
    resolved: reports.filter((r) => r.status === 'Resolved').length,
    dismissed: reports.filter((r) => r.status === 'Dismissed').length,
    high: reports.filter((r) => r.severity === 'High').length,
  }

  const statusTabs: Array<{ key: 'All' | ReportStatus; label: string }> = [
    { key: 'All', label: `All Reports (${counts.all})` },
    { key: 'Pending', label: `Pending (${counts.pending})` },
    { key: 'In Progress', label: `In Progress (${counts.inProgress})` },
    { key: 'Resolved', label: `Resolved (${counts.resolved})` },
    { key: 'Dismissed', label: `Dismissed (${counts.dismissed})` },
  ]

  const uniqueReasons = ['All Reasons', ...Array.from(new Set(reports.map((r) => r.reason)))]

  const filtered = reports
    .filter((r) => activeTab === 'All' || r.status === activeTab)
    .filter((r) => reasonFilter === 'All Reasons' || r.reason === reasonFilter)
    .filter((r) => {
      const q = query.trim().toLowerCase()
      if (!q) return true
      return [r.reporter, r.reportedUser, r.content, r.reason].some((field) => field.toLowerCase().includes(q))
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const pageStart = (safePage - 1) * PER_PAGE
  const pageData = filtered.slice(pageStart, pageStart + PER_PAGE)

  const changeStatus = (id: number, status: ReportStatus, success: string) => {
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)))
    toast.success(success)
  }

  const removeReport = (id: number) => {
    setReports((prev) => prev.filter((r) => r.id !== id))
    toast.success('Report removed')
  }

  const exportCsv = () => {
    if (filtered.length === 0) {
      toast.error('No reports to export')
      return
    }
    const headers = ['Reporter', 'Reported User', 'Content', 'Reason', 'Status', 'Severity', 'Date']
    const rows = filtered.map((r) => [r.reporter, r.reportedUser, r.content, r.reason, r.status, r.severity, formatDate(r.createdAt)])
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.setAttribute('download', `reports-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('CSV exported')
  }

  const statusClass = (s: string) => {
    if (s==='Pending')     return 'badge-yellow'
    if (s==='Resolved')    return 'badge-green'
    if (s==='In Progress') return 'bg-blue-100 text-blue-700'
    if (s==='Dismissed')   return 'badge-gray'
    return 'badge-gray'
  }

  const severityClass = (s: Severity) => {
    if (s === 'High') return 'bg-red-100 text-red-700'
    if (s === 'Medium') return 'bg-amber-100 text-amber-700'
    return 'bg-blue-100 text-blue-700'
  }

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <AdminLayout
      title="Reported Content"
      subtitle="Review and manage community policy violations across the hub."
      actions={
        <div className="flex gap-2">
          <button onClick={exportCsv} className="sh-btn sh-btn-outline text-xs">↓ Export CSV</button>
          <button onClick={() => toast.success('Resolution log generated')} className="sh-btn sh-btn-primary text-xs">Resolve Queue</button>
        </div>
      }>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key)
              setPage(1)
            }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${activeTab===tab.key ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="sh-card p-4 mb-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(1)
            }}
            placeholder="Search reporter, user, content, or reason..."
            className="sh-input"
          />
          <select
            value={reasonFilter}
            onChange={(e) => {
              setReasonFilter(e.target.value)
              setPage(1)
            }}
            className="sh-select"
          >
            {uniqueReasons.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <button
            onClick={() => {
              setQuery('')
              setReasonFilter('All Reasons')
              setActiveTab('All')
              setPage(1)
            }}
            className="sh-btn sh-btn-outline"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="sh-card overflow-hidden">
        <table className="sh-table">
          <thead>
            <tr>{['Reporter','Reported User/Content','Reason','Date','Status','Actions'].map(h=><th key={h}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {pageData.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-gray-400">No reports found for the current filters.</td>
              </tr>
            ) : pageData.map((r) => (
              <tr key={r.id}>
                <td>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs flex-shrink-0">{r.reporter.charAt(0)}</div>
                    <span className="font-medium text-sm text-gray-900">{r.reporter}</span>
                  </div>
                </td>
                <td>
                  <p className="font-semibold text-sm text-gray-900">{r.reportedUser}</p>
                  <p className="text-xs text-gray-400">{r.content}</p>
                </td>
                <td>
                  <p className="text-sm text-gray-600">{r.reason}</p>
                  <span className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${severityClass(r.severity)}`}>{r.severity}</span>
                </td>
                <td className="text-sm text-gray-500">{formatDate(r.createdAt)}</td>
                <td>
                  <span className={`badge text-xs ${statusClass(r.status)}`}>{r.status}</span>
                </td>
                <td>
                  {r.status === 'Resolved' || r.status === 'Dismissed' ? (
                    <span className="text-xs text-gray-400 italic">{r.status === 'Resolved' ? 'Action completed' : 'No policy violation'}</span>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => changeStatus(r.id, 'In Progress', 'Marked in progress')} className="px-2 py-1 text-xs rounded-md border border-blue-200 text-blue-700 hover:bg-blue-50">Track</button>
                      <button onClick={() => changeStatus(r.id, 'Resolved', 'Report resolved')} className="px-2 py-1 text-xs rounded-md border border-green-200 text-green-700 hover:bg-green-50">Resolve</button>
                      <button onClick={() => changeStatus(r.id, 'Dismissed', 'Report dismissed')} className="px-2 py-1 text-xs rounded-md border border-gray-200 text-gray-600 hover:bg-gray-100">Dismiss</button>
                      <button onClick={() => setPendingDeleteReportId(r.id)} className="px-2 py-1 text-xs rounded-md border border-red-200 text-red-600 hover:bg-red-50">Delete</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100">
          <p className="text-sm text-gray-500">Showing <b>{filtered.length === 0 ? 0 : pageStart + 1} to {Math.min(pageStart + PER_PAGE, filtered.length)}</b> of <b>{filtered.length}</b> results</p>
          <div className="pagination">
            <button className="page-btn-arrow" onClick={() => setPage((p) => Math.max(1, p - 1))}>‹</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 6).map((p) => (
              <button key={p} onClick={() => setPage(p)} className={`page-btn flex items-center justify-center ${p===safePage?'active':''}`}>{p}</button>
            ))}
            <button className="page-btn-arrow" onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>›</button>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={pendingDeleteReportId !== null}
        title="Delete Report"
        message="Delete this report permanently?"
        confirmText="Delete Report"
        onCancel={() => setPendingDeleteReportId(null)}
        onConfirm={() => {
          if (pendingDeleteReportId !== null) {
            removeReport(pendingDeleteReportId)
            setPendingDeleteReportId(null)
          }
        }}
      />
    </AdminLayout>
  )
}
