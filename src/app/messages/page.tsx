'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import api from '@/lib/api'
import { Match, Message } from '@/types'
import { useAuthStore } from '@/store/authStore'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { useRef } from 'react'
import axios from 'axios'
import { useSearchParams } from 'next/navigation'

const msgSchema = z.object({ content: z.string().min(1) })
type MsgForm = z.infer<typeof msgSchema>

export default function MessagesPage() {
  const searchParams = useSearchParams()
  const { user } = useAuthStore()
  const [matches, setMatches] = useState<Match[]>([])
  const [selected, setSelected] = useState<Match|null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [busyMessageId, setBusyMessageId] = useState<number | null>(null)
  const [deleteModalMessageId, setDeleteModalMessageId] = useState<number | null>(null)
  const [showVideoCall, setShowVideoCall] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('All')
  const [nowTs, setNowTs] = useState(Date.now())
  const bottomRef = useRef<HTMLDivElement>(null)
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<MsgForm>({ resolver: zodResolver(msgSchema) })

  const loadMessages = async (matchId: number) => {
    const res = await api.get(`/api/messages/match/${matchId}`)
    const rows: Message[] = res.data.data ?? []
    rows.sort((a, b) => {
      const ta = a.sentAt ? new Date(a.sentAt).getTime() : 0
      const tb = b.sentAt ? new Date(b.sentAt).getTime() : 0
      if (ta !== tb) return ta - tb
      return a.id - b.id
    })
    setMessages(rows)
  }

  const sortMessages = (rows: Message[]) => {
    return [...rows].sort((a, b) => {
      const ta = a.sentAt ? new Date(a.sentAt).getTime() : 0
      const tb = b.sentAt ? new Date(b.sentAt).getTime() : 0
      if (ta !== tb) return ta - tb
      return a.id - b.id
    })
  }

  const formatClock = (dateValue: Date) => {
    return dateValue.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
  }

  const formatMessageTime = (value?: string, messageId?: number) => {
    if (!value) {
      return '--:--'
    }
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) {
      return '--:--'
    }
    return formatClock(d)
  }

  const formatRelativeTime = (value?: string) => {
    if (!value) return 'now'
    const t = new Date(value).getTime()
    if (Number.isNaN(t)) return 'now'
    const diffSec = Math.max(0, Math.floor((nowTs - t) / 1000))
    if (diffSec < 60) return 'now'
    const mins = Math.floor(diffSec / 60)
    if (mins < 60) return `${mins}m`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h`
    return new Date(t).toLocaleDateString()
  }

  useEffect(() => {
    api.get('/api/matches?status=ACCEPTED').then(res => {
      setMatches(res.data.data)
    }).catch(() => toast.error('Failed')).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (matches.length === 0) return
    const fromQuery = Number(searchParams.get('matchId'))
    if (fromQuery) {
      const target = matches.find(m => m.id === fromQuery)
      if (target && selected?.id !== target.id) {
        setSelected(target)
        return
      }
    }

    if (!selected) {
      setSelected(matches[0])
    }
  }, [matches, searchParams, selected])

  useEffect(() => {
    const id = window.setInterval(() => setNowTs(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (!selected) return
    setShowVideoCall(false)
    setEditingId(null)
    setEditingContent('')
    loadMessages(selected.id).catch(() => {})
    api.put(`/api/messages/match/${selected.id}/read`).catch(() => {})
  }, [selected])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const onSend = async (data: MsgForm) => {
    if (!selected) return
    try {
      const content = data.content.trim()
      if (!content) return

      const res = await api.post('/api/messages', { matchId: selected.id, content })
      const sentMsg: Message = {
        ...res.data.data,
        content: res.data.data?.content ?? content,
        sentAt: res.data.data?.sentAt ?? new Date().toISOString(),
      }

      setMessages(prev => {
        const withoutDup = prev.filter(m => m.id !== sentMsg.id)
        return sortMessages([...withoutDup, sentMsg])
      })

      loadMessages(selected.id).catch(() => {})
      reset()

      toast.success(`Message sent at ${formatMessageTime(sentMsg.sentAt, sentMsg.id)}`)

      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        const other = selected.user1.id === user?.id ? selected.user2 : selected.user1
        const preview = content.slice(0, 60)
        new Notification('Skill-Swap', {
          body: `Sent to ${other.name}: ${preview}${preview.length >= 60 ? '...' : ''}`,
        })
      }
    } catch (error) {
      const serverMsg = axios.isAxiosError(error) ? error.response?.data?.message : undefined
      toast.error(serverMsg || 'Failed to send message')
    }
  }

  const startEdit = (msg: Message) => {
    setEditingId(msg.id)
    setEditingContent(msg.content)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingContent('')
  }

  const saveEdit = async () => {
    if (!editingId || !selected) return
    const content = editingContent.trim()
    if (!content) {
      toast.error('Message cannot be empty')
      return
    }
    try {
      setBusyMessageId(editingId)
      const res = await api.put(`/api/messages/${editingId}`, { content })
      setMessages(prev => prev.map(m => (m.id === editingId ? { ...m, ...res.data.data, content } : m)))
      toast.success('Message updated')
      cancelEdit()
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined
      const serverMsg = axios.isAxiosError(error) ? error.response?.data?.message : undefined

      // Backward-compatible fallback for servers without PUT /api/messages/{id}.
      if (status === 404 || status === 405) {
        try {
          await api.delete(`/api/messages/${editingId}`)
          const sendRes = await api.post('/api/messages', { matchId: selected.id, content })
          const replacement = { ...sendRes.data.data, sentAt: sendRes.data.data?.sentAt || new Date().toISOString() }
          setMessages(prev => {
            const withoutOld = prev.filter(m => m.id !== editingId)
            return [...withoutOld, replacement]
          })
          toast.success('Message updated')
          cancelEdit()
          return
        } catch {
          toast.error('Failed to update message')
          return
        }
      }

      toast.error(serverMsg || 'Failed to update message')
    } finally {
      setBusyMessageId(null)
    }
  }

  const deleteMessage = async (id: number) => {
    try {
      setBusyMessageId(id)
      await api.delete(`/api/messages/${id}`)
      setMessages(prev => prev.filter(m => m.id !== id))
      toast.success('Message deleted')
      if (editingId === id) cancelEdit()
      setDeleteModalMessageId(null)
    } catch {
      toast.error('Failed to delete message')
    } finally {
      setBusyMessageId(null)
    }
  }

  const getVideoCallUrl = () => {
    if (!selected) return ''
    const roomName = `skillswap-match-${selected.id}`
    return `https://meet.jit.si/${roomName}`
  }

  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row h-[calc(100vh-120px)] bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Left: Conversation List */}
        <div className="w-full md:w-72 md:border-r border-b md:border-b-0 border-gray-100 flex flex-col flex-shrink-0 h-64 md:h-auto">
          <div className="p-4 border-b border-gray-100">
            <h1 className="font-bold text-gray-900 text-lg mb-3">Messages</h1>
            <div className="flex gap-3 border-b border-gray-100 -mx-4 px-4">
              {['All','Unread','Archived'].map(t => (
                <button key={t} className={`tab text-xs pb-2 ${tab===t?'active':''}`} onClick={() => setTab(t)}>{t}</button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? <div className="p-4 space-y-3">{[1,2,3].map(i=><div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse"/>)}</div>
            : matches.length === 0 ? <div className="p-6 text-center text-gray-400 text-sm">No conversations yet</div>
            : matches.map(m => {
              const other = m.user1.id === user?.id ? m.user2 : m.user1
              return (
                <button key={m.id} onClick={() => setSelected(m)}
                  className={`w-full flex items-center gap-3 p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors text-left ${selected?.id===m.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}>
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
                    {other.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm text-gray-900 truncate">{other.name}</p>
                      <span className="text-xs text-gray-400 flex-shrink-0">{formatRelativeTime(m.createdAt)}</span>
                    </div>
                    <p className="text-xs text-blue-600 truncate">{m.skill1?.skillName} ↔ {m.skill2?.skillName}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Right: Chat */}
        {selected ? (() => {
          const other = selected.user1.id === user?.id ? selected.user2 : selected.user1
          return (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between px-4 md:px-5 py-3.5 border-b border-gray-100 bg-white">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">{other.name.charAt(0)}</div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-blue-500 rounded-full border-2 border-white"/>
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-900">{other.name}</p>
                    <p className="text-xs text-blue-500 font-medium">● Online</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-600 text-lg"
                    onClick={() => setShowVideoCall(true)}
                    title="Start video call"
                  >
                    📹
                  </button>
                  <button className="text-gray-400 hover:text-gray-600 text-lg">⋮</button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 md:p-5 space-y-4 bg-gray-50/30">
                {messages.length === 0 ? (
                  <div className="text-center py-10 text-gray-400"><p className="text-3xl mb-2">👋</p><p className="text-sm">Say hi to {other.name}!</p></div>
                ) : (() => {
                  let lastDate = ''
                  return messages.map(msg => {
                    const isMe = msg.sender.id === user?.id
                    const d = new Date(msg.sentAt).toLocaleDateString()
                    const showDate = d !== lastDate; lastDate = d
                    return (
                      <div key={msg.id}>
                        {showDate && <div className="text-center text-xs text-gray-400 font-medium my-3 uppercase tracking-wide">Today</div>}
                        <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} gap-2.5`}>
                          {!isMe && <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold self-end flex-shrink-0">{msg.sender.name.charAt(0)}</div>}
                          <div className={`max-w-[85%] sm:max-w-sm px-4 py-2.5 rounded-2xl text-sm shadow-sm ${isMe ? 'bg-blue-500 text-white rounded-br-md' : 'bg-white text-gray-800 rounded-bl-md border border-gray-100'}`}>
                            {editingId === msg.id ? (
                              <div className="space-y-2">
                                <textarea
                                  value={editingContent}
                                  onChange={(e) => setEditingContent(e.target.value)}
                                  rows={2}
                                  className="w-full rounded-lg border border-white/60 px-2 py-1 text-sm text-gray-900"
                                />
                                <div className="flex gap-2 justify-end">
                                  <button
                                    type="button"
                                    className="text-xs px-2 py-1 rounded bg-white/80 text-gray-700"
                                    onClick={cancelEdit}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    className="text-xs px-2 py-1 rounded bg-white text-blue-700 font-semibold"
                                    onClick={saveEdit}
                                    disabled={busyMessageId === msg.id}
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p>{msg.content}</p>
                                <p className={`text-xs mt-1 ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                                  {formatMessageTime(msg.sentAt, msg.id)}
                                </p>
                                {isMe && (
                                  <div className="mt-1 flex gap-2 justify-end">
                                    <button
                                      type="button"
                                      className="text-xs underline text-white/90 hover:text-white"
                                      onClick={() => startEdit(msg)}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      className="text-xs underline text-white/90 hover:text-white"
                                      onClick={() => setDeleteModalMessageId(msg.id)}
                                      disabled={busyMessageId === msg.id}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                })()}
                <div ref={bottomRef}/>
              </div>
              <form onSubmit={handleSubmit(onSend)} className="flex items-center gap-3 px-4 py-3 border-t border-gray-100 bg-white">
                <button type="button" className="text-gray-400 hover:text-blue-500 text-xl flex-shrink-0">+</button>
                <input {...register('content')} placeholder="Type your message..." className="form-input flex-1 text-sm" />
                <button type="button" className="hidden sm:inline text-gray-400 hover:text-yellow-500 flex-shrink-0">😊</button>
                <button type="submit" disabled={isSubmitting} className="w-9 h-9 bg-blue-500 rounded-xl flex items-center justify-center text-white hover:bg-blue-600 transition-colors flex-shrink-0">
                  ➤
                </button>
              </form>
            </div>
          )
        })() : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center"><div className="text-5xl mb-3">💬</div><p>Select a conversation</p></div>
          </div>
        )}
      </div>

      {showVideoCall && selected && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-5xl bg-white rounded-xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <p className="font-semibold text-gray-900">Video Call</p>
              <button
                type="button"
                className="text-sm px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200"
                onClick={() => setShowVideoCall(false)}
              >
                Close
              </button>
            </div>
            <iframe
              title="Skill-Swap Video Call"
              src={getVideoCallUrl()}
              allow="camera; microphone; fullscreen; display-capture"
              className="w-full h-[75vh]"
            />
          </div>
        </div>
      )}

      {deleteModalMessageId !== null && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-2xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Delete Message</h3>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-gray-600">Are you sure you want to delete this message?</p>
            </div>
            <div className="px-5 pb-4 flex items-center justify-end gap-2">
              <button
                type="button"
                className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                onClick={() => setDeleteModalMessageId(null)}
                disabled={busyMessageId === deleteModalMessageId}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-3 py-1.5 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                onClick={() => deleteMessage(deleteModalMessageId)}
                disabled={busyMessageId === deleteModalMessageId}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
