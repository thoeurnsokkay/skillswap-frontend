'use client'
import { useEffect, useState } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import ConfirmModal from '@/components/ConfirmModal'
import api from '@/lib/api'
import { Skill, User } from '@/types'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { AlertTriangle, Check, CheckCircle2, Download, FileText, Flag, Plus, RotateCcw, Trash2 } from 'lucide-react'

export default function AdminSkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'Pending Approval' | 'Active Skills' | 'Archived'>('Pending Approval')
  const [categoryFilter, setCategoryFilter] = useState('All Categories')
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date')
  const [page, setPage] = useState(1)
  const [creatingSkill, setCreatingSkill] = useState(false)
  const [savingCreateSkill, setSavingCreateSkill] = useState(false)
  const [pendingDeleteSkillId, setPendingDeleteSkillId] = useState<number | null>(null)
  const [deletingSkill, setDeletingSkill] = useState(false)
  const [createForm, setCreateForm] = useState({
    userId: '',
    skillName: '',
    category: '',
    type: 'OFFERED' as 'OFFERED' | 'WANTED',
    level: 'BEGINNER' as 'BEGINNER' | 'INTERMEDIATE' | 'EXPERT',
  })
  const PER_PAGE = 6

  useEffect(() => {
    Promise.all([api.get('/api/skills'), api.get('/api/skills/categories'), api.get('/api/admin/users')])
      .then(([skillRes, categoryRes, userRes]) => {
        setSkills(skillRes.data?.data ?? [])
        setCategories(categoryRes.data?.data ?? [])
        setUsers(userRes.data?.data ?? [])
      })
      .catch(() => toast.error('Failed to load skills'))
      .finally(() => setLoading(false))
  }, [])

  const openCreateSkill = () => {
    setCreateForm({
      userId: '',
      skillName: '',
      category: categories[0] || '',
      type: 'OFFERED',
      level: 'BEGINNER',
    })
    setCreatingSkill(true)
  }

  const createSkillForUser = async () => {
    if (!createForm.userId) {
      toast.error('Please select a user')
      return
    }
    if (!createForm.skillName.trim()) {
      toast.error('Skill name is required')
      return
    }

    try {
      setSavingCreateSkill(true)
      const payload = {
        userId: Number(createForm.userId),
        skillName: createForm.skillName.trim(),
        category: createForm.category.trim() || 'General',
        type: createForm.type,
        level: createForm.level,
      }

      const res = await api.post('/api/admin/skills', payload)
      const created: Skill = res.data?.data
      setSkills((prev) => [created, ...prev])
      setCreatingSkill(false)
      toast.success('Skill created for user')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create skill')
    } finally {
      setSavingCreateSkill(false)
    }
  }

  const deleteSkill = async (id: number) => {
    try {
      setDeletingSkill(true)
      await api.delete(`/api/skills/${id}`)
      setSkills(prev => prev.filter(s => s.id!==id))
      setPendingDeleteSkillId(null)
      toast.success('Skill deleted')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed')
    } finally {
      setDeletingSkill(false)
    }
  }

  const approveSkill = async (id: number) => {
    try {
      const res = await api.put(`/api/admin/skills/${id}/approve`)
      const updated: Skill = res.data?.data
      setSkills((prev) => prev.map((s) => (s.id === id ? { ...s, moderationStatus: updated?.moderationStatus ?? 'ACTIVE' } : s)))
      toast.success('Skill approved')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to approve skill')
    }
  }

  const archiveSkill = async (id: number) => {
    try {
      const res = await api.put(`/api/admin/skills/${id}/archive`)
      const updated: Skill = res.data?.data
      setSkills((prev) => prev.map((s) => (s.id === id ? { ...s, moderationStatus: updated?.moderationStatus ?? 'ARCHIVED' } : s)))
      toast.success('Skill archived')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to archive skill')
    }
  }

  const restoreSkill = async (id: number) => {
    try {
      const res = await api.put(`/api/admin/skills/${id}/restore`)
      const updated: Skill = res.data?.data
      setSkills((prev) => prev.map((s) => (s.id === id ? { ...s, moderationStatus: updated?.moderationStatus ?? 'PENDING' } : s)))
      toast.success('Skill restored to pending')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to restore skill')
    }
  }

  const statusOf = (skill: Skill): 'PENDING' | 'ACTIVE' | 'ARCHIVED' => {
    if (skill.moderationStatus === 'ACTIVE') return 'ACTIVE'
    if (skill.moderationStatus === 'ARCHIVED') return 'ARCHIVED'
    if (skill.moderationStatus === 'PENDING') return 'PENDING'
    if (skill.type === 'WANTED') return 'PENDING'
    if (skill.type === 'OFFERED') return 'ACTIVE'
    return 'PENDING'
  }

  const parseSkillTime = (skill: Skill): number => {
    if (!skill.createdAt) return 0
    const t = new Date(skill.createdAt).getTime()
    return Number.isFinite(t) ? t : 0
  }

  const formatSkillDate = (skill: Skill): string => {
    const time = parseSkillTime(skill)
    if (!time) return 'N/A'
    return new Date(time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const pendingCount = skills.filter((s) => statusOf(s) === 'PENDING').length
  const activeCount = skills.filter((s) => statusOf(s) === 'ACTIVE').length
  const archivedCount = skills.filter((s) => statusOf(s) === 'ARCHIVED').length

  const stats = [
    { label:'PENDING APPROVAL', val: pendingCount, Icon: FileText, iconBg:'bg-amber-50', iconColor:'text-amber-600', color:'text-amber-600' },
    { label:'ACTIVE SKILLS',    val: activeCount,  Icon: CheckCircle2, iconBg:'bg-blue-50', iconColor:'text-blue-600', color:'text-blue-600' },
    { label:'FLAGGED SKILLS',   val: archivedCount, Icon: AlertTriangle, iconBg:'bg-red-50', iconColor:'text-red-600', color:'text-red-600' },
  ]

  const tabFiltered = skills.filter((skill) => {
    if (tab === 'Pending Approval') return statusOf(skill) === 'PENDING'
    if (tab === 'Active Skills') return statusOf(skill) === 'ACTIVE'
    return statusOf(skill) === 'ARCHIVED'
  })

  const categoryFiltered = tabFiltered.filter((skill) => {
    if (categoryFilter === 'All Categories') return true
    return (skill.category || '').toLowerCase() === categoryFilter.toLowerCase()
  })

  const sortedSkills = [...categoryFiltered].sort((a, b) => {
    if (sortBy === 'name') return a.skillName.localeCompare(b.skillName)
    return parseSkillTime(b) - parseSkillTime(a)
  })

  const totalPages = Math.max(1, Math.ceil(sortedSkills.length / PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const paginatedSkills = sortedSkills.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE)

  const TAB_OPTIONS: Array<'Pending Approval' | 'Active Skills' | 'Archived'> = ['Pending Approval', 'Active Skills', 'Archived']

  const exportSkillData = () => {
    if (sortedSkills.length === 0) {
      toast.error('No skill data to export')
      return
    }

    const rows = sortedSkills.map((sk) => ({
      Skill: sk.skillName,
      Category: sk.category,
      Type: sk.type,
      Level: sk.level,
      'Submitted By': sk.userName,
      Date: formatSkillDate(sk),
      Status: statusOf(sk)
    }))

    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Skills')
    XLSX.writeFile(workbook, `skills-${new Date().toISOString().slice(0, 10)}.xlsx`)
    toast.success('Skill data exported')
  }

  return (
    <AdminLayout actions={
      <div className="flex gap-2">
        <button className="sh-btn sh-btn-primary" onClick={openCreateSkill}> <Plus size={14} /> Create Skill</button>
        <button className="sh-btn sh-btn-outline" onClick={exportSkillData}><Download size={14} /> Export Data</button>
      </div>
    }>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Skills</h1>
          <p className="text-gray-400 text-sm">Review, approve, and organize skills submitted by the community.</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {stats.map(s => (
          <div key={s.label} className="sh-card p-5 flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${s.iconBg}`}>
              <s.Icon size={22} className={s.iconColor} />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{s.label}</p>
              <p className={`text-3xl font-bold ${s.color}`}>{s.val.toString().padStart(2,'0')}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Table Card */}
      <div className="sh-card overflow-hidden mb-5">
        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-5 pt-2">
          {TAB_OPTIONS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`tab text-sm ${tab===t?'active':''}`}>{t}</button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100">
          <select
            className="sh-select text-xs"
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value)
              setPage(1)
            }}
          >
            <option>All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            className="sh-select text-xs"
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as 'date' | 'name')
              setPage(1)
            }}
          >
            <option value="date">Sort by Date</option>
            <option value="name">Sort by Name</option>
          </select>
          <span className="ml-auto text-xs text-gray-400">Showing {paginatedSkills.length} of {sortedSkills.length} items</span>
        </div>

        <table className="sh-table">
          <thead><tr>{['SKILL NAME','CATEGORY','SUBMITTED BY','DATE','STATUS','ACTIONS'].map(h=><th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {loading ? [1,2,3].map(i=><tr key={i}><td colSpan={6}><div className="h-10 bg-gray-100 rounded animate-pulse"/></td></tr>)
            : paginatedSkills.map((sk,i) => {
              const status = statusOf(sk)
              return (
              <tr key={sk.id}>
                <td>
                  <p className="font-semibold text-sm text-gray-900">{sk.skillName}</p>
                  <p className="text-xs text-gray-400">{sk.category}</p>
                </td>
                <td><span className={`badge text-xs uppercase ${i%3===0?'badge-blue':i%3===1?'badge-orange':'badge-green'}`}>{sk.category}</span></td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">{sk.userName?.charAt(0)}</div>
                    <span className="text-sm text-gray-700">{sk.userName}</span>
                  </div>
                </td>
                <td className="text-gray-500 text-sm">{formatSkillDate(sk)}</td>
                <td>
                  <span className={`badge text-xs ${status === 'ACTIVE' ? 'badge-green' : status === 'PENDING' ? 'badge-yellow' : 'badge-red'}`}>
                    {status === 'ACTIVE' ? '● ACTIVE' : status === 'PENDING' ? '● PENDING' : '● ARCHIVED'}
                  </span>
                </td>
                <td>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => approveSkill(sk.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 text-sm"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => status === 'ARCHIVED' ? restoreSkill(sk.id) : archiveSkill(sk.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 text-sm"
                      title={status === 'ARCHIVED' ? 'Restore to pending' : 'Archive skill'}
                    >
                      {status === 'ARCHIVED' ? <RotateCcw size={14} /> : <Flag size={14} />}
                    </button>
                    <button onClick={() => setPendingDeleteSkillId(sk.id)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-sm text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
              )
            })}
          </tbody>
        </table>

        <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100">
          <span className="text-sm text-gray-500">Page {safePage} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              onClick={()=>setPage(p=>Math.max(1,p-1))}
              disabled={safePage <= 1}
              className="sh-btn sh-btn-outline text-xs py-1.5 px-3 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={()=>setPage(p=>Math.min(totalPages,p+1))}
              disabled={safePage >= totalPages}
              className="sh-btn sh-btn-outline text-xs py-1.5 px-3 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {creatingSkill && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Create Skill For User</h3>
              <button onClick={() => setCreatingSkill(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="p-5 grid grid-cols-1 gap-4">
              <div>
                <label className="form-label">User</label>
                <select
                  className="form-input"
                  value={createForm.userId}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, userId: e.target.value }))}
                >
                  <option value="">Select user</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Skill Name</label>
                <input
                  className="form-input"
                  value={createForm.skillName}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, skillName: e.target.value }))}
                  placeholder="Ex: React, Guitar, Photography"
                />
              </div>

              <div>
                <label className="form-label">Category</label>
                <input
                  className="form-input"
                  value={createForm.category}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, category: e.target.value }))}
                  placeholder="Ex: Technology"
                  list="skill-categories"
                />
                <datalist id="skill-categories">
                  {categories.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Type</label>
                  <select
                    className="form-input"
                    value={createForm.type}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, type: e.target.value as 'OFFERED' | 'WANTED' }))}
                  >
                    <option value="OFFERED">OFFERED</option>
                    <option value="WANTED">WANTED</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Level</label>
                  <select
                    className="form-input"
                    value={createForm.level}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, level: e.target.value as 'BEGINNER' | 'INTERMEDIATE' | 'EXPERT' }))}
                  >
                    <option value="BEGINNER">BEGINNER</option>
                    <option value="INTERMEDIATE">INTERMEDIATE</option>
                    <option value="EXPERT">EXPERT</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button className="sh-btn sh-btn-outline" onClick={() => setCreatingSkill(false)} disabled={savingCreateSkill}>Cancel</button>
              <button className="sh-btn sh-btn-primary" onClick={createSkillForUser} disabled={savingCreateSkill}>
                {savingCreateSkill ? 'Creating...' : 'Create Skill'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={pendingDeleteSkillId !== null}
        title="Delete Skill"
        message="Delete this skill permanently? This action cannot be undone."
        confirmText="Delete Skill"
        loading={deletingSkill}
        onCancel={() => setPendingDeleteSkillId(null)}
        onConfirm={() => {
          if (pendingDeleteSkillId !== null) deleteSkill(pendingDeleteSkillId)
        }}
      />
    </AdminLayout>
  )
}
