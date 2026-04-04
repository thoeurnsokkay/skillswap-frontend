'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'
import { LayoutDashboard, Users, GraduationCap, AlertTriangle, Star } from 'lucide-react'

const adminLinks = [
  { href: '/admin',         label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users',   label: 'Users',     icon: Users },
  { href: '/admin/skills',  label: 'Skills',    icon: GraduationCap },
    { href: '/admin/reports', label: 'Reports',   icon: AlertTriangle },
  { href: '/admin/reviews', label: 'Reviews',   icon: Star },
]

export default function AdminLayout({ children, title, subtitle, actions }: {
  children: React.ReactNode; title?: string; subtitle?: string; actions?: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout, init } = useAuthStore()
  const displayName = user?.name || 'Admin'

  useEffect(() => { init() }, [])
  useEffect(() => {
    const token = localStorage.getItem('token')
    const u = localStorage.getItem('user')
    if (!token || !u) { router.push('/login'); return }
    const parsed = JSON.parse(u)
    if (parsed.role !== 'ADMIN') { router.push('/dashboard') }
  }, [])

  const handleLogout = () => { logout(); toast.success('Logged out!'); router.push('/login') }

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-slate-100">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/>
            </svg>
          </div>
          <div>
            <div className="font-bold text-sm text-gray-900">SkillHub</div>
            <div className="text-xs text-blue-600 font-medium">Admin Portal</div>
          </div>
        </div>

        <div className="px-4 pt-4 pb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Management</div>
        <nav className="flex-1 px-3 py-2 space-y-1">
          {adminLinks.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border border-blue-100 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}>
                <span className="w-5 flex justify-center"><Icon size={16} /></span>
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-slate-100 p-3 bg-slate-50/60">
          <div className="flex items-center gap-2.5 p-2 rounded-lg mb-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-900 truncate">{displayName}</div>
              <div className="text-xs text-blue-600">Super Admin</div>
            </div>
            <button onClick={handleLogout} className="px-2 py-1 rounded-md text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors" title="Logout">Sign out</button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="admin-content">
        {/* Topbar */}
        <div className="admin-topbar">
          <div className="flex items-center justify-end w-full">
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        </div>

        {/* Page Content */}
        <div className="p-6">
          {(title || subtitle) && (
            <div className="mb-6">
              {title && <h1 className="text-2xl font-bold text-gray-900">{title}</h1>}
              {subtitle && <p className="text-gray-400 text-sm mt-0.5">{subtitle}</p>}
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  )
}
