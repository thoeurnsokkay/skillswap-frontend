'use client'
import { useEffect, useState } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import ConfirmModal from '@/components/ConfirmModal'
import api from '@/lib/api'
import { User } from '@/types'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { Ban, Pencil, ShieldCheck, Trash2 } from 'lucide-react'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [roleFilter, setRoleFilter] = useState('All Roles')
  const [statusFilter, setStatusFilter] = useState('All')
  const [page, setPage] = useState(1)
  const [creatingUser, setCreatingUser] = useState(false)
  const [savingCreate, setSavingCreate] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [pendingDeleteUserId, setPendingDeleteUserId] = useState<number | null>(null)
  const [deletingUser, setDeletingUser] = useState(false)
  const [pendingToggleUserId, setPendingToggleUserId] = useState<number | null>(null)
  const [togglingUser, setTogglingUser] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'USER' as 'USER' | 'ADMIN',
    location: '',
    bio: '',
    isActive: true
  })
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    role: 'USER' as 'USER' | 'ADMIN',
    location: '',
    bio: '',
    isActive: true
  })
  const PER_PAGE = 8

  useEffect(() => {
    api.get('/api/admin/users').then(res => setUsers(res.data.data)).catch(() => toast.error('Failed')).finally(() => setLoading(false))
  }, [])

  const toggleBan = async (id: number) => {
    try {
      setTogglingUser(true)
      const res = await api.put(`/api/admin/users/${id}/ban`)
      setUsers(prev => prev.map(u => u.id===id ? res.data.data : u))
      setPendingToggleUserId(null)
      toast.success(res.data.message)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed')
    } finally {
      setTogglingUser(false)
    }
  }

  const deleteUser = async (id: number) => {
    try {
      setDeletingUser(true)
      await api.delete(`/api/admin/users/${id}`)
      setUsers(prev => prev.filter(u => u.id!==id))
      setPendingDeleteUserId(null)
      toast.success('Deleted')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed')
    } finally {
      setDeletingUser(false)
    }
  }

  const openEdit = (user: User) => {
    setEditingUser(user)
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'USER',
      location: user.location || '',
      bio: user.bio || '',
      isActive: user.isActive !== false
    })
  }

  const saveEdit = async () => {
    if (!editingUser) return
    if (!editForm.name.trim()) {
      toast.error('Name is required')
      return
    }
    if (!editForm.email.trim()) {
      toast.error('Email is required')
      return
    }

    setSavingEdit(true)
    try {
      const res = await api.put(`/api/admin/users/${editingUser.id}`, {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        role: editForm.role,
        location: editForm.location.trim() || null,
        bio: editForm.bio.trim() || null,
        isActive: editForm.isActive
      })
      setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? res.data.data : u)))
      setEditingUser(null)
      toast.success('User updated')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update user')
    } finally {
      setSavingEdit(false)
    }
  }

  const openCreate = () => {
    setCreateForm({
      name: '',
      email: '',
      password: '',
      role: 'USER',
      location: '',
      bio: '',
      isActive: true
    })
    setCreatingUser(true)
  }

  const saveCreate = async () => {
    if (!createForm.name.trim()) return toast.error('Name is required')
    if (!createForm.email.trim()) return toast.error('Email is required')
    if (createForm.password.length < 6) return toast.error('Password must be at least 6 characters')

    setSavingCreate(true)
    try {
      const res = await api.post('/api/admin/users', {
        name: createForm.name.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        role: createForm.role,
        location: createForm.location.trim() || null,
        bio: createForm.bio.trim() || null,
        isActive: createForm.isActive
      })
      setUsers((prev) => [res.data.data, ...prev])
      setCreatingUser(false)
      toast.success('User created')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create user')
    } finally {
      setSavingCreate(false)
    }
  }

  const exportUsersCsv = () => {
    if (filtered.length === 0) return toast.error('No users to export')

    const headers = ['Name', 'Email', 'Role', 'Status', 'Location', 'Created At']
    const rows = filtered.map((u) => [
      u.name,
      u.email,
      u.role,
      u.isActive !== false ? 'ACTIVE' : 'INACTIVE',
      u.location || '',
      u.createdAt || ''
    ])

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
    const csvText = XLSX.utils.sheet_to_csv(worksheet, { FS: ',', RS: '\n' })
    const blob = new Blob([`\uFEFF${csvText}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `users-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success('CSV exported')
  }

  const exportUsersExcel = () => {
    if (filtered.length === 0) return toast.error('No users to export')

    const rows = filtered.map((u) => ({
      Name: u.name,
      Email: u.email,
      Role: u.role,
      Status: u.isActive !== false ? 'ACTIVE' : 'INACTIVE',
      Location: u.location || '',
      'Created At': u.createdAt || ''
    }))

    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Users')
    XLSX.writeFile(workbook, `users-${new Date().toISOString().slice(0, 10)}.xlsx`)
    toast.success('Excel exported (.xlsx)')
  }

  const filtered = users.filter((u) => {
    const roleOk = roleFilter === 'All Roles' || u.role === roleFilter
    const statusOk =
      statusFilter === 'All' ||
      (statusFilter === 'Active' && u.isActive !== false) ||
      (statusFilter === 'Suspended' && u.isActive === false)
    return roleOk && statusOk
  })
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const paginated = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE)

  const resetFilters = () => {
    setRoleFilter('All Roles')
    setStatusFilter('All')
    setPage(1)
  }

  return (
    <AdminLayout title="User Management" subtitle="Manage, monitor and audit platform participants."
      actions={
        <>
          <button className="sh-btn sh-btn-outline" onClick={exportUsersCsv} disabled={loading}>Export CSV</button>
          <button className="sh-btn sh-btn-outline" onClick={exportUsersExcel} disabled={loading}>Export Excel</button>
          <button className="sh-btn sh-btn-primary" onClick={openCreate}>👥+ Add New User</button>
        </>
      }>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        {[
          { label:'ROLE:', value: roleFilter, setter: setRoleFilter, opts:['All Roles','USER','ADMIN'] },
          { label:'STATUS:', value: statusFilter, setter: setStatusFilter, opts:['All','Active','Suspended'] },
        ].map(f => (
          <div key={f.label} className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-semibold">{f.label}</span>
            <select value={f.value} onChange={e => { f.setter(e.target.value); setPage(1) }} className="sh-select">
              {f.opts.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
        ))}
        <button onClick={resetFilters} className="text-blue-600 text-sm font-medium hover:underline">⊘ Reset Filters</button>
      </div>

      <div className="sh-card overflow-hidden">
        <table className="sh-table">
          <thead><tr>{['USER','ROLE','STATUS','LAST ACTIVE','ACTIONS'].map(h=><th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {loading ? [1,2,3,4].map(i=><tr key={i}><td colSpan={5}><div className="h-10 bg-gray-100 rounded animate-pulse"/></td></tr>)
            : paginated.map(u => (
              <tr key={u.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-sm">{u.name.charAt(0)}</div>
                    <div><p className="font-semibold text-sm text-gray-900">{u.name}</p><p className="text-xs text-gray-400">{u.email}</p></div>
                  </div>
                </td>
                <td>
                  <span className={`badge text-xs uppercase ${u.role==='ADMIN' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700'}`}>{u.role}</span>
                </td>
                <td>
                  <div className="flex items-center gap-1.5">
                    <span className={u.isActive!==false ? 'dot-active' : 'dot-suspended'}/>
                    <span className={`text-sm font-medium ${u.isActive!==false ? 'text-blue-600':'text-red-500'}`}>{u.isActive!==false?'Active':'Suspended'}</span>
                  </div>
                </td>
                <td className="text-gray-500 text-sm">Recently</td>
                <td>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEdit(u)}
                      title="Edit user"
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors text-sm"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setPendingToggleUserId(u.id)}
                      title={u.isActive!==false ? 'Ban user' : 'Unban user'}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-yellow-50 text-gray-400 hover:text-yellow-600 transition-colors text-sm"
                    >
                      {u.isActive !== false ? <Ban size={14} /> : <ShieldCheck size={14} />}
                    </button>
                    <button
                      onClick={() => setPendingDeleteUserId(u.id)}
                      title="Delete user"
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors text-sm"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100">
          <p className="text-sm text-gray-500">Showing <b>{Math.min((page-1)*PER_PAGE+1,filtered.length)}-{Math.min(page*PER_PAGE,filtered.length)}</b> of <b>{filtered.length}</b> users</p>
          <div className="pagination">
            <button className="page-btn-arrow" onClick={()=>setPage(p=>Math.max(1,p-1))}>‹</button>
            {Array.from({length:Math.min(totalPages,5)},(_,i)=>i+1).map(p=>(
              <button key={p} onClick={()=>setPage(p)} className={`page-btn flex items-center justify-center ${page===p?'active':''}`}>{p}</button>
            ))}
            <button className="page-btn-arrow" onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>›</button>
          </div>
        </div>
      </div>

      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Edit User</h3>
              <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="p-5 grid grid-cols-1 gap-4">
              <div>
                <label className="form-label">Name</label>
                <input
                  className="form-input"
                  value={editForm.name}
                  onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                />
              </div>

              <div>
                <label className="form-label">Email</label>
                <input
                  className="form-input"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Role</label>
                  <select
                    className="form-input"
                    value={editForm.role}
                    onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value as 'USER' | 'ADMIN' }))}
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Status</label>
                  <select
                    className="form-input"
                    value={editForm.isActive ? 'ACTIVE' : 'INACTIVE'}
                    onChange={(e) => setEditForm((p) => ({ ...p, isActive: e.target.value === 'ACTIVE' }))}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label">Location</label>
                <input
                  className="form-input"
                  value={editForm.location}
                  onChange={(e) => setEditForm((p) => ({ ...p, location: e.target.value }))}
                />
              </div>

              <div>
                <label className="form-label">Bio</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={editForm.bio}
                  onChange={(e) => setEditForm((p) => ({ ...p, bio: e.target.value }))}
                />
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button className="sh-btn sh-btn-outline" onClick={() => setEditingUser(null)} disabled={savingEdit}>Cancel</button>
              <button className="sh-btn sh-btn-primary" onClick={saveEdit} disabled={savingEdit}>
                {savingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {creatingUser && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Add New User</h3>
              <button onClick={() => setCreatingUser(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="p-5 grid grid-cols-1 gap-4">
              <div>
                <label className="form-label">Name</label>
                <input className="form-input" value={createForm.name} onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))} />
              </div>

              <div>
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={createForm.email} onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))} />
              </div>

              <div>
                <label className="form-label">Password</label>
                <input className="form-input" type="password" value={createForm.password} onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Role</label>
                  <select className="form-input" value={createForm.role} onChange={(e) => setCreateForm((p) => ({ ...p, role: e.target.value as 'USER' | 'ADMIN' }))}>
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Status</label>
                  <select className="form-input" value={createForm.isActive ? 'ACTIVE' : 'INACTIVE'} onChange={(e) => setCreateForm((p) => ({ ...p, isActive: e.target.value === 'ACTIVE' }))}>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label">Location</label>
                <input className="form-input" value={createForm.location} onChange={(e) => setCreateForm((p) => ({ ...p, location: e.target.value }))} />
              </div>

              <div>
                <label className="form-label">Bio</label>
                <textarea className="form-input" rows={3} value={createForm.bio} onChange={(e) => setCreateForm((p) => ({ ...p, bio: e.target.value }))} />
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button className="sh-btn sh-btn-outline" onClick={() => setCreatingUser(false)} disabled={savingCreate}>Cancel</button>
              <button className="sh-btn sh-btn-primary" onClick={saveCreate} disabled={savingCreate}>
                {savingCreate ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={pendingDeleteUserId !== null}
        title="Delete User"
        message="Delete this user permanently? This action cannot be undone."
        confirmText="Delete User"
        loading={deletingUser}
        onCancel={() => setPendingDeleteUserId(null)}
        onConfirm={() => {
          if (pendingDeleteUserId !== null) deleteUser(pendingDeleteUserId)
        }}
      />

      <ConfirmModal
        open={pendingToggleUserId !== null}
        title={(users.find((u) => u.id === pendingToggleUserId)?.isActive !== false) ? 'Suspend User' : 'Unsuspend User'}
        message={(users.find((u) => u.id === pendingToggleUserId)?.isActive !== false)
          ? 'Are you sure you want to suspend this user?'
          : 'Are you sure you want to unsuspend this user?'}
        confirmText={(users.find((u) => u.id === pendingToggleUserId)?.isActive !== false) ? 'Suspend' : 'Unsuspend'}
        loading={togglingUser}
        onCancel={() => setPendingToggleUserId(null)}
        onConfirm={() => {
          if (pendingToggleUserId !== null) toggleBan(pendingToggleUserId)
        }}
      />
    </AdminLayout>
  )
}
