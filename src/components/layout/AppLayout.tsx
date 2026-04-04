'use client'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from './Sidebar'
import { useAuthStore } from '@/store/authStore'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { init } = useAuthStore()
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    //  init inside useEffect only — never in render body
    init()

    const token = localStorage.getItem('token')
    if (!token) router.push('/login')
  }, []) // empty array

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Sidebar />
      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-6 py-16">
          {children}
        </div>
      </div>
    </div>
  )
}