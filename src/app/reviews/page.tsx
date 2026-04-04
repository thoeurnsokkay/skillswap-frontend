'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ReviewsPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/matches')
  }, [router])

  return null
}
