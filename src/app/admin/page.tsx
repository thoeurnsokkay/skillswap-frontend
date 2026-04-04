'use client'
import { useEffect, useState } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import api from '@/lib/api'
import { Skill, User } from '@/types'
import toast from 'react-hot-toast'

interface Stats { totalUsers:number; totalSkills:number; totalMatches:number; totalMessages:number; totalReviews:number }
const CATEGORIES = [
  { name:'Technology & Programming', pct: 42, color:'#2563eb' },
  { name:'Arts & Creative Design',   pct: 24, color:'#3b82f6' },
  { name:'Languages & Literature',   pct: 18, color:'#60a5fa' },
  { name:'Business & Marketing',     pct: 12, color:'#93c5fd' },
  { name:'Health & Wellness',        pct: 4,  color:'#bfdbfe' },
]

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats|null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [userSkillMap, setUserSkillMap] = useState<Record<number, { offered: string; sought: string }>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.get('/api/admin/stats'), api.get('/api/admin/users')])
      .then(async ([s, u]) => {
        const allUsers: User[] = u.data.data ?? []
        setStats(s.data.data)
        setUsers(allUsers)

        const skillRows = await Promise.all(
          allUsers.map(async (user) => {
            try {
              const res = await api.get(`/api/skills/user/${user.id}`)
              const skills: Skill[] = res.data?.data ?? []
              const offered = skills.find((sk) => sk.type === 'OFFERED')?.skillName ?? '—'
              const sought = skills.find((sk) => sk.type === 'WANTED')?.skillName ?? '—'
              return [user.id, { offered, sought }] as const
            } catch {
              return [user.id, { offered: '—', sought: '—' }] as const
            }
          })
        )

        setUserSkillMap(Object.fromEntries(skillRows))
      })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  const statCards = [
    { label:'Total Users',   val: stats?.totalUsers   || 0, change:'+12%', up:true },
    { label:'Total Skills',  val: stats?.totalSkills  || 0, change:'+5%',  up:true },
    { label:'Total Matches', val: stats?.totalMatches || 0, change:'+18%', up:true },
    { label:'Active Users',  val: Math.floor((stats?.totalUsers||0)*0.9), change:'-2%', up:false },
  ]

  const exportCsv = () => {
    if (users.length === 0) {
      toast.error('No data to export')
      return
    }

    const escapeCsv = (value: string) => `"${String(value).replace(/"/g, '""')}"`
    const headers = ['Name', 'Email', 'Skill Offered', 'Skill Sought', 'Status', 'Last Active']
    const rows = users.slice(0, 5).map((u) => [
      u.name,
      u.email,
      userSkillMap[u.id]?.offered ?? '—',
      userSkillMap[u.id]?.sought ?? '—',
      u.isActive !== false ? 'ACTIVE' : 'INACTIVE',
      'Recently'
    ])

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => escapeCsv(cell)).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `recent-user-activity-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success('CSV exported')
  }

  return (
    <AdminLayout
      title="Dashboard Overview"
      subtitle="Real-time platform performance and user engagement metrics.">

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((s,i) => (
          <div key={i} className="sh-card p-5">
            <p className="text-sm text-gray-500 mb-1">{s.label}</p>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-gray-900">{loading ? '...' : s.val.toLocaleString()}</span>
              <span className={`text-xs font-semibold mb-1 ${s.up ? 'text-blue-600' : 'text-red-500'}`}>
                {s.up ? '↑' : '↓'} {s.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Skill Categories */}
      <div className="sh-card p-5 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-gray-900">Skill Categories</h2>
            <button className="text-blue-600 text-sm font-medium hover:underline">View All</button>
          </div>
          <div className="space-y-4">
            {CATEGORIES.map(c => (
              <div key={c.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-gray-700">{c.name}</span>
                  <span className="text-sm font-semibold text-gray-900">{c.pct}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width:`${c.pct}%` }}/>
                </div>
              </div>
            ))}
          </div>
      </div>

      {/* Recent Activity Table */}
      <div className="sh-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Recent User Activity</h2>
          <button
            onClick={exportCsv}
            disabled={loading}
            className="sh-btn sh-btn-outline text-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="sh-table">
            <thead>
              <tr>
                {['USER','SKILL OFFERED','SKILL SOUGHT','STATUS','LAST ACTIVE'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1,2,3].map(i => (
                  <tr key={i}><td colSpan={5}><div className="h-8 bg-gray-100 rounded animate-pulse"/></td></tr>
                ))
              ) : users.slice(0,5).map(u => (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-gray-900">{u.name}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-gray-600 text-sm">{userSkillMap[u.id]?.offered ?? '—'}</td>
                  <td className="text-gray-600 text-sm">{userSkillMap[u.id]?.sought ?? '—'}</td>
                  <td>
                    <span className={`badge ${u.isActive!==false?'badge-green':'badge-red'}`}>
                      {u.isActive!==false?'ACTIVE':'INACTIVE'}
                    </span>
                  </td>
                  <td className="text-gray-400 text-sm">Recently</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  )
}
