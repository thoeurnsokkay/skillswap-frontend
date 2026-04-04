'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import { Match, Message } from '@/types'
import { Bell } from 'lucide-react'

const userLinks = [
  { href: '/my-course', label: 'My Course' },
  { href: '/matches', label: 'Matches' },
  { href: '/messages', label: 'Messages' },
]

const adminLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/admin', label: 'Admin Panel' },
  { href: '/settings', label: 'Settings' },
]

type AlertItem = {
  id: string
  type: 'message' | 'match'
  title: string
  description: string
  href: string
  createdAt: number
}

const toPublicFileUrl = (url?: string) => {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9090'
  return `${base}${url}`
}

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false) // Fix hydration
  const [isNotifOpen, setIsNotifOpen] = useState(false)
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [unreadAlerts, setUnreadAlerts] = useState(0)
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const notifRef = useRef<HTMLDivElement>(null)
  const pollReadyRef = useRef(false)
  const seenPendingRef = useRef<Set<number>>(new Set())
  const seenIncomingMsgRef = useRef<Set<number>>(new Set())

  // Wait until mounted to show client-side data (localStorage)
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleLogout = () => {
    logout()
    toast.success('Logged out!')
    router.push('/login')
  }

  const handleDeleteAccount = async () => {
    const meId = user?.id
    if (!meId) {
      toast.error('User not found')
      return
    }
    if (!window.confirm('Delete account permanently? This cannot be undone.')) return
    try {
      await api.delete(`/api/users/${meId}`)
      logout()
      toast.success('Account deleted')
      router.push('/')
    } catch {
      toast.error('Failed to delete account')
    }
  }

  const links = user?.role === 'ADMIN' ? adminLinks : userLinks
  const displayName = user?.name ?? 'User'
  
  // Use a fallback while mounting to prevent the "?" vs "A" mismatch
  const initials = (user?.name ?? '?').charAt(0).toUpperCase()

  const pushAlert = (items: AlertItem[]) => {
    if (items.length === 0) return
    const sorted = [...items].sort((a, b) => b.createdAt - a.createdAt)
    setAlerts(prev => [...sorted, ...prev].slice(0, 20))
    setUnreadAlerts(prev => prev + items.length)

    const top = sorted[0]
    toast.success(top.type === 'message' ? `New message: ${top.description}` : `New match: ${top.description}`)

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('Skill-Swap', {
        body: top.type === 'message' ? `New message from ${top.description}` : `New match request from ${top.description}`,
      })
    }
  }

  useEffect(() => {
    if (!mounted) return
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
  }, [mounted])

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!notifRef.current) return
      if (!notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  useEffect(() => {
    if (!mounted || !user?.id || user?.role === 'ADMIN') return

    const pollAlerts = async () => {
      try {
        const matchRes = await api.get('/api/matches')
        const allMatches: Match[] = matchRes.data?.data ?? []
        const myMatches = allMatches.filter(
          m => m.user1?.id === user.id || m.user2?.id === user.id
        )

        const pendingForMe = myMatches.filter(
          m => m.status === 'PENDING' && m.user2?.id === user.id
        )

        const pendingAlerts: AlertItem[] = []
        for (const m of pendingForMe) {
          if (!seenPendingRef.current.has(m.id)) {
            seenPendingRef.current.add(m.id)
            if (pollReadyRef.current) {
              const other = m.user1?.id === user.id ? m.user2 : m.user1
              pendingAlerts.push({
                id: `match-${m.id}`,
                type: 'match',
                title: 'New Match Request',
                description: other?.name || 'New user',
                href: '/matches',
                createdAt: new Date(m.createdAt).getTime() || Date.now(),
              })
            }
          }
        }

        const accepted = myMatches.filter(m => m.status === 'ACCEPTED')
        const msgResponses = await Promise.all(
          accepted.map(m => api.get(`/api/messages/match/${m.id}`).then(res => ({ match: m, messages: (res.data?.data ?? []) as Message[] })).catch(() => ({ match: m, messages: [] as Message[] })))
        )

        const messageAlerts: AlertItem[] = []
        for (const row of msgResponses) {
          const incoming = row.messages.filter(msg => msg.sender?.id !== user.id)
          for (const msg of incoming) {
            if (!seenIncomingMsgRef.current.has(msg.id)) {
              seenIncomingMsgRef.current.add(msg.id)
              if (pollReadyRef.current) {
                messageAlerts.push({
                  id: `msg-${msg.id}`,
                  type: 'message',
                  title: 'New Message',
                  description: msg.sender?.name || 'Partner',
                  href: `/messages?matchId=${row.match.id}`,
                  createdAt: new Date(msg.sentAt).getTime() || Date.now(),
                })
              }
            }
          }
        }

        if (pollReadyRef.current) {
          pushAlert([...pendingAlerts, ...messageAlerts])
        } else {
          pollReadyRef.current = true
        }
      } catch {
        // Silent fail: navbar polling should not break page UI.
      }
    }

    pollAlerts()
    const id = window.setInterval(pollAlerts, 10000)
    return () => window.clearInterval(id)
  }, [mounted, user?.id, user?.role])

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          
          {/* Left: Hamburger + Logo */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 -ml-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
              aria-label="Toggle Menu"
            >
              {/* Custom Hamburger "=_" style icon */}
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isOpen ? (
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 14h12" />
                )}
              </svg>
            </button>

            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/>
                </svg>
              </div>
              <span className="font-bold text-gray-900 truncate">Skill-Swap</span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {links.map(({ href, label }) => {
              const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
              return (
                <Link
                  key={href}
                  href={href}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </Link>
              )
            })}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => {
                  setIsNotifOpen(v => !v)
                  setUnreadAlerts(0)
                }}
                className="relative w-9 h-9 rounded-full border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-700"
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell size={16} />
                {unreadAlerts > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadAlerts > 9 ? '9+' : unreadAlerts}
                  </span>
                )}
              </button>

              {isNotifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 max-w-[90vw] bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <p className="text-sm font-bold text-gray-900">Notifications</p>
                    <Link href="/messages" className="text-xs text-blue-600 hover:text-blue-700" onClick={() => setIsNotifOpen(false)}>
                      View messages
                    </Link>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {alerts.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-gray-500 text-center">No new alerts</p>
                    ) : (
                      alerts.map(item => (
                        <Link
                          key={item.id}
                          href={item.href}
                          onClick={() => setIsNotifOpen(false)}
                          className="block px-4 py-3 border-b border-gray-50 hover:bg-gray-50"
                        >
                          <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                          <p className="text-xs text-gray-600">{item.description}</p>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <Link
              href="/skills"
              className="hidden sm:inline-flex text-sm font-semibold px-4 py-2 rounded-lg transition-all"
            >
              {displayName}
            </Link>

            <div className="relative group">
              <button className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm ring-2 ring-white">
                {user?.avatarUrl ? (
                  <img
                    src={toPublicFileUrl(user?.avatarUrl)}
                    alt={displayName}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  initials
                )}
              </button>

              {/* Dropdown Menu */}
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <div className="px-4 py-2 border-b border-gray-50 mb-1">
                  <p className="text-sm font-bold text-gray-900 truncate">
                    {displayName}
                  </p>
                </div>
                <Link href="/profile" className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Profile</Link>
                <Link href="/settings" className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Settings</Link>
                <button
                  onClick={handleDeleteAccount}
                  className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50"
                >
                  Delete Account
                </button>
                <button 
                  onClick={handleLogout} 
                  className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 font-semibold border-t mt-1 pt-2"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu (The "=_" logic) */}
        <div 
          className={`md:hidden transition-all duration-300 ease-in-out overflow-hidden ${
            isOpen ? 'max-h-[500px] pb-4 opacity-100' : 'max-h-0 opacity-0 invisible'
          }`}
        >
          <nav className="flex flex-col gap-1 pt-2 border-t border-gray-50">
            {links.map(({ href, label }) => {
              const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setIsOpen(false)}
                  className={`px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    isActive ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {label}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>
    </header>
  )
}