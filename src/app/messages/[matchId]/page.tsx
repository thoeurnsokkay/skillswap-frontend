'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
export default function MatchChatRedirect({ params }: { params: { matchId: string } }) {
  const router = useRouter()
  useEffect(() => { router.push(`/messages?matchId=${params.matchId}`) }, [params.matchId, router])
  return null
}
