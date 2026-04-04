'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ProfileRedirect() {
  const router = useRouter()

  useEffect(() => {
    // ✅ Read localStorage directly — no store, no dependency issues
    try {
      const stored = localStorage.getItem('user')
      if (stored) {
        const user = JSON.parse(stored)
        router.push(`/profile/${user.id}`)
      } else {
        router.push('/login')
      }
    } catch {
      router.push('/login')
    }
  }, []) // ✅ run once only

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-gray-400 text-sm">Loading...</p>
    </div>
  )
}