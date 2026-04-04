'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import api from '@/lib/api'
import { MatchSuggestion, Match, CourseSummary, CourseDetail } from '@/types'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function SearchPage() {
  const { user } = useAuthStore()
  const router = useRouter()

  const normalizeDisplayName = (name?: string, email?: string) => {
    const clean = (name || '').trim().replace(/\s+/g, ' ')
    const emailKey = (email || '').toLowerCase()

    const knownByEmail: Record<string, string> = {
      'alice@email.com': 'Alice Chen',
      'bob@email.com': 'Bob Smith',
      'charlie@email.com': 'Charlie Kim',
    }

    if (emailKey && knownByEmail[emailKey]) {
      return knownByEmail[emailKey]
    }

    const knownByName: Record<string, string> = {
      'alice chennn': 'Alice Chen',
      'charlie kimmmm': 'Charlie Kim',
      'charlie kimm': 'Charlie Kim',
    }

    const lower = clean.toLowerCase()
    if (knownByName[lower]) {
      return knownByName[lower]
    }

    return clean || 'User'
  }
  const [suggestions, setSuggestions] = useState<MatchSuggestion[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [publicCourses, setPublicCourses] = useState<CourseSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [requesting, setRequesting] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'discover' | 'matches'>('discover')
  const [matchFilter, setMatchFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [coursePreview, setCoursePreview] = useState<CourseDetail | null>(null)
  const [previewOwnerName, setPreviewOwnerName] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/api/matches/suggestions'),
      api.get('/api/matches'),
      api.get('/api/courses/public'),
    ]).then(([s, m, c]) => {
      setSuggestions(s.data.data)
      setMatches(m.data.data)
      setPublicCourses(c.data.data || [])
    }).catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  const sendRequest = async (targetUserId: number, s1?: number, s2?: number) => {
    setRequesting(targetUserId)
    try {
      await api.post('/api/matches', { targetUserId, skill1Id: s1, skill2Id: s2 })
      toast.success('Match request sent! 🎉')
      setSuggestions(prev => prev.filter(s => s.user.id !== targetUserId))
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed')
    } finally {
      setRequesting(null)
    }
  }

  const handleAction = async (id: number, action: 'accept' | 'reject') => {
    try {
      const res = await api.put(`/api/matches/${id}/${action}`)
      setMatches(prev => prev.map(m => m.id === id ? res.data.data : m))
      toast.success(action === 'accept' ? '🎉 Match accepted!' : 'Match rejected')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Action failed')
    }
  }

  const openCoursePreview = async (course: CourseSummary, ownerName: string) => {
    setPreviewLoading(true)
    setPreviewOwnerName(ownerName)
    try {
      const res = await api.get(`/api/courses/${course.id}`)
      setCoursePreview(res.data.data)
    } catch {
      toast.error('Failed to load course preview')
    } finally {
      setPreviewLoading(false)
    }
  }

  const closeCoursePreview = () => {
    setCoursePreview(null)
    setPreviewOwnerName('')
  }

  const gradients = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  ]

  const matchCounts = {
    'All': matches.length,
    'Active': matches.filter(m => m.status === 'ACCEPTED').length,
    'Pending': matches.filter(m => m.status === 'PENDING').length,
    'Completed': matches.filter(m => m.status === 'REJECTED').length,
  }

  const filteredMatches = matchFilter === 'All' ? matches
    : matchFilter === 'Active' ? matches.filter(m => m.status === 'ACCEPTED')
    : matchFilter === 'Pending' ? matches.filter(m => m.status === 'PENDING')
    : matches.filter(m => m.status === 'REJECTED')

  const filteredSuggestions = suggestions.filter((s) => {
    const allSkills = [...s.theirOfferedSkills, ...s.theirWantedSkills]
    const skillNames = allSkills.map((sk) => sk.skillName.toLowerCase())

    const query = searchQuery.trim().toLowerCase()
    const searchPass = !query || skillNames.some((name) => name.includes(query))

    return searchPass
  })

  // Reusable card style
  const cardStyle: React.CSSProperties = {
    background: 'white',
    borderRadius: '20px',
    border: '1px solid #e5e7eb',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  }

  // Responsive grid — 3 cols desktop, 2 tablet, 1 mobile
  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '1.25rem',
  }

  return (
    <AppLayout>
      <div style={{ maxWidth: '1100px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#111827', marginBottom: '0.5rem' }}>
            Discover Your Next Masterclass
          </h1>
          <p style={{ fontSize: '15px', color: '#6b7280', maxWidth: '420px', margin: '0 auto', lineHeight: 1.6 }}>
            Trade your expertise for the skills you've always wanted to learn. No currency, just community.
          </p>
        </div>

        {/* Search Bar */}
        <div style={{ display: 'flex', gap: '12px', maxWidth: '700px', margin: '0 auto 1.25rem' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', color: '#9ca3af' }}>🔍</span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '0.875rem 1rem 0.875rem 2.75rem', border: '1.5px solid #e5e7eb', borderRadius: '12px', fontSize: '15px', outline: 'none', background: 'white', boxSizing: 'border-box', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
              placeholder="Search skills..."
            />
          </div>
          <button style={{ padding: '0.875rem 1.5rem', background: '#1a56db', color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Find Match
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '2rem', flexWrap: 'wrap' }}>
        </div>

        {/* Main Tabs */}
        <div style={{ display: 'flex', borderBottom: '2px solid #f3f4f6', marginBottom: '2rem' }}>
          {[
            { key: 'discover', label: '🔍 Discover Skills', count: filteredSuggestions.length },
            { key: 'matches', label: '🤝 My Matches', count: matches.length },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              style={{ padding: '0.75rem 1.5rem', fontSize: '15px', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', color: activeTab === tab.key ? '#1a56db' : '#9ca3af', borderBottom: `2px solid ${activeTab === tab.key ? '#1a56db' : 'transparent'}`, marginBottom: '-2px', transition: 'all 0.2s' }}
            >
              {tab.label}
              <span style={{ marginLeft: '6px', fontSize: '12px', background: activeTab === tab.key ? '#dbeafe' : '#f3f4f6', color: activeTab === tab.key ? '#1a56db' : '#9ca3af', padding: '2px 8px', borderRadius: '999px', fontWeight: 700 }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* ── DISCOVER TAB ── */}
        {activeTab === 'discover' && (
          <>
            {loading ? (
              <div style={gridStyle}>
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} style={{ background: 'white', borderRadius: '20px', height: '360px', border: '1px solid #e5e7eb' }} />
                ))}
              </div>
            ) : filteredSuggestions.length === 0 ? (
              <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #e5e7eb', padding: '4rem', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🌿</div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', marginBottom: '0.5rem' }}>No matching results</h3>
                <p style={{ color: '#9ca3af', marginBottom: '1.25rem', fontSize: '14px' }}>Try adjusting your search or filters</p>
                <Link href="/skills" style={{ background: '#1a56db', color: 'white', padding: '0.625rem 1.5rem', borderRadius: '10px', textDecoration: 'none', fontWeight: 600, fontSize: '14px' }}>
                  Reset by Adding Skills
                </Link>
              </div>
            ) : (
              <div style={gridStyle}>
                {filteredSuggestions.map((s, idx) => (
                  <div key={s.user.id} style={cardStyle}>
                    {/* Banner */}
                    <div style={{ height: '140px', background: gradients[idx % gradients.length], position: 'relative' }}>
                      <div style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', borderRadius: '999px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.matchScore >= 3 ? '#10b981' : '#f59e0b', display: 'inline-block' }} />
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'white' }}>{s.matchScore >= 3 ? '98' : s.matchScore >= 2 ? '85' : '72'}% MATCH</span>
                      </div>
                      <div style={{ position: 'absolute', bottom: '-20px', right: '16px', width: '44px', height: '44px', borderRadius: '50%', background: 'white', border: '3px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800, color: '#1a56db', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                        {normalizeDisplayName(s.user.name, s.user.email).charAt(0)}
                      </div>
                    </div>
                    {/* Body */}
                    <div style={{ padding: '1.25rem', paddingTop: '1.75rem' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#111827', marginBottom: '2px' }}>{normalizeDisplayName(s.user.name, s.user.email)}</h3>
                      <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '1rem' }}>
                        {s.user.location ? `📍 ${s.user.location}` : 'Community Member'}
                      </p>
                      <div style={{ marginBottom: '0.625rem' }}>
                        <p style={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af', letterSpacing: '0.08em', marginBottom: '6px' }}>OFFERS</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {s.theirOfferedSkills.map(sk => (
                            <span key={sk.id} style={{ fontSize: '11px', fontWeight: 600, color: '#065f46', background: '#d1fae5', padding: '2px 10px', borderRadius: '999px' }}>{sk.skillName}</span>
                          ))}
                        </div>
                      </div>
                      <div style={{ marginBottom: '1rem' }}>
                        <p style={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af', letterSpacing: '0.08em', marginBottom: '6px' }}>WANTS</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {s.theirWantedSkills.map(sk => (
                            <span key={sk.id} style={{ fontSize: '11px', fontWeight: 600, color: '#374151', background: '#f3f4f6', padding: '2px 10px', borderRadius: '999px' }}>{sk.skillName}</span>
                          ))}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Link href={`/profile/${s.user.id}`} style={{ flex: 1, padding: '0.625rem', background: 'white', color: '#111827', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '13px', fontWeight: 700, textDecoration: 'none', textAlign: 'center' }}>
                          View Profile
                        </Link>
                        <button
                          onClick={() => sendRequest(s.user.id, s.theirWantedSkills[0]?.id, s.theirOfferedSkills[0]?.id)}
                          disabled={requesting === s.user.id}
                          style={{ flex: 1, padding: '0.625rem', background: requesting === s.user.id ? '#e5e7eb' : '#1a56db', color: requesting === s.user.id ? '#9ca3af' : 'white', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: requesting === s.user.id ? 'not-allowed' : 'pointer' }}
                        >
                          {requesting === s.user.id ? '⏳' : 'Request Swap'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {filteredSuggestions.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2.5rem' }}>
                <button style={{ padding: '0.75rem 2rem', border: '1.5px solid #e5e7eb', borderRadius: '999px', fontSize: '14px', fontWeight: 600, color: '#374151', background: 'white', cursor: 'pointer' }}>
                  Load More Opportunities
                </button>
              </div>
            )}
          </>
        )}

        {/* ── MATCHES TAB ── */}
        {activeTab === 'matches' && (
          <>
            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              {Object.entries(matchCounts).map(([label, count]) => (
                <button
                  key={label}
                  onClick={() => setMatchFilter(label)}
                  style={{ padding: '0.5rem 1.25rem', borderRadius: '999px', fontSize: '13px', fontWeight: 600, border: `1.5px solid ${matchFilter === label ? '#1a56db' : '#e5e7eb'}`, background: matchFilter === label ? '#dbeafe' : 'white', color: matchFilter === label ? '#1a56db' : '#6b7280', cursor: 'pointer' }}
                >
                  {label} ({count})
                </button>
              ))}
            </div>

            {loading ? (
              <div style={gridStyle}>
                {[1, 2, 3].map(i => <div key={i} style={{ background: 'white', borderRadius: '20px', height: '360px', border: '1px solid #e5e7eb' }} />)}
              </div>
            ) : filteredMatches.length === 0 ? (
              <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #e5e7eb', padding: '4rem', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🤝</div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', marginBottom: '0.5rem' }}>No matches found</h3>
                <p style={{ color: '#9ca3af', marginBottom: '1.25rem', fontSize: '14px' }}>Start by discovering skill partners</p>
                <button onClick={() => setActiveTab('discover')} style={{ background: '#1a56db', color: 'white', padding: '0.625rem 1.5rem', borderRadius: '10px', border: 'none', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>
                  Discover Skills
                </button>
              </div>
            ) : (
              <div style={gridStyle}>
                {filteredMatches.map((match, idx) => {
                  const other = match.user1?.id === user?.id ? match.user2 : match.user1
                  const otherDisplayName = normalizeDisplayName(other?.name, other?.email)
                  const isReceiver = match.user2?.id === user?.id
                  const partnerCourses = publicCourses.filter(course => course.creatorId === other?.id)
                  return (
                    <div
                      key={match.id}
                      style={{ ...cardStyle, cursor: other?.id ? 'pointer' : 'default' }}
                      role={other?.id ? 'button' : undefined}
                      tabIndex={other?.id ? 0 : -1}
                      onClick={() => {
                        if (other?.id) router.push(`/profile/${other.id}`)
                      }}
                      onKeyDown={(e) => {
                        if (!other?.id) return
                        if (e.target !== e.currentTarget) return
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          router.push(`/profile/${other.id}`)
                        }
                      }}
                    >
                      {/* Banner — same as Discover card */}
                      <div style={{ height: '140px', background: gradients[idx % gradients.length], position: 'relative' }}>
                        {/* Status Badge */}
                        <div style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', borderRadius: '999px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: match.status === 'ACCEPTED' ? '#10b981' : match.status === 'PENDING' ? '#f59e0b' : '#9ca3af', display: 'inline-block' }} />
                          <span style={{ fontSize: '11px', fontWeight: 700, color: 'white' }}>{match.status}</span>
                        </div>
                        {/* Avatar */}
                        <div style={{ position: 'absolute', bottom: '-20px', right: '16px', width: '44px', height: '44px', borderRadius: '50%', background: 'white', border: '3px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800, color: '#1a56db', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                          {otherDisplayName.charAt(0)}
                        </div>
                      </div>
                      {/* Body */}
                      <div style={{ padding: '1.25rem', paddingTop: '1.75rem' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#111827', marginBottom: '2px' }}>{otherDisplayName}</h3>
                        <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '1rem' }}>
                          {other?.location ? `📍 ${other.location}` : 'Community Member'}
                        </p>
                        <div style={{ marginBottom: '0.625rem' }}>
                          <p style={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af', letterSpacing: '0.08em', marginBottom: '6px' }}>TEACHING</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {match.skill1?.skillName
                              ? <span style={{ fontSize: '11px', fontWeight: 600, color: '#065f46', background: '#d1fae5', padding: '2px 10px', borderRadius: '999px' }}>{match.skill1.skillName}</span>
                              : <span style={{ fontSize: '11px', color: '#9ca3af' }}>—</span>
                            }
                          </div>
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                          <p style={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af', letterSpacing: '0.08em', marginBottom: '6px' }}>LEARNING</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {match.skill2?.skillName
                              ? <span style={{ fontSize: '11px', fontWeight: 600, color: '#374151', background: '#f3f4f6', padding: '2px 10px', borderRadius: '999px' }}>{match.skill2.skillName}</span>
                              : <span style={{ fontSize: '11px', color: '#9ca3af' }}>—</span>
                            }
                          </div>
                        </div>

                        {match.status === 'ACCEPTED' && (
                          <div style={{ marginBottom: '1rem', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '0.625rem', background: '#fafafa' }}>
                            <p style={{ fontSize: '10px', fontWeight: 700, color: '#6b7280', letterSpacing: '0.08em', marginBottom: '6px' }}>PARTNER COURSES</p>
                            {partnerCourses.length === 0 ? (
                              <p style={{ fontSize: '12px', color: '#9ca3af' }}>No course shared yet.</p>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {partnerCourses.slice(0, 3).map(course => (
                                  <button
                                    key={course.id}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      openCoursePreview(course, otherDisplayName || 'Teacher')
                                    }}
                                    style={{ border: '1px solid #e5e7eb', borderRadius: '8px', background: 'white', padding: '8px 10px', textAlign: 'left', cursor: 'pointer' }}
                                  >
                                    <p style={{ fontSize: '12px', fontWeight: 700, color: '#111827', marginBottom: '2px' }}>{course.title}</p>
                                    <p style={{ fontSize: '11px', color: '#6b7280' }}>{course.lessonCount} video(s) • {course.resourceCount} resource(s)</p>
                                  </button>
                                ))}
                                {partnerCourses.length > 3 && (
                                  <p style={{ fontSize: '11px', color: '#6b7280' }}>+{partnerCourses.length - 3} more course(s)</p>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {match.status === 'ACCEPTED' && (
                            <>
                              <Link href={`/messages/${match.id}`} onClick={(e) => e.stopPropagation()} style={{ flex: 1, padding: '0.625rem', background: '#1a56db', color: 'white', borderRadius: '10px', fontSize: '13px', fontWeight: 700, textDecoration: 'none', textAlign: 'center' }}>
                                💬 Message
                              </Link>
                              <Link href={`/profile/${other.id}`} onClick={(e) => e.stopPropagation()} style={{ padding: '0.625rem 1rem', background: 'white', color: '#111827', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '13px', fontWeight: 700, textDecoration: 'none', textAlign: 'center' }}>
                                ⭐ Rate on Profile
                              </Link>
                            </>
                          )}
                          {match.status === 'PENDING' && isReceiver && (
                            <>
                              <button onClick={(e) => { e.stopPropagation(); handleAction(match.id, 'accept') }} style={{ flex: 1, padding: '0.625rem', background: '#1a56db', color: 'white', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                                ✓ Accept
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleAction(match.id, 'reject') }} style={{ padding: '0.625rem 1rem', background: 'white', color: '#ef4444', border: '1.5px solid #fca5a5', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                                ✕
                              </button>
                            </>
                          )}
                          {match.status === 'PENDING' && !isReceiver && (
                            <>
                              <button disabled style={{ flex: 1, padding: '0.625rem', background: '#f3f4f6', color: '#9ca3af', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'not-allowed' }}>
                                ⏳ Waiting...
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleAction(match.id, 'reject') }} style={{ padding: '0.625rem 1rem', background: 'white', color: '#ef4444', border: '1.5px solid #fca5a5', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                                Cancel
                              </button>
                            </>
                          )}
                          {match.status === 'REJECTED' && (
                            <Link href={`/profile/${other.id}`} onClick={(e) => e.stopPropagation()} style={{ flex: 1, padding: '0.625rem', background: 'white', color: '#111827', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '13px', fontWeight: 700, textDecoration: 'none', textAlign: 'center' }}>
                              👤 View Profile
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            {filteredMatches.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2.5rem' }}>
                <button style={{ padding: '0.75rem 2rem', border: '1.5px solid #e5e7eb', borderRadius: '999px', fontSize: '14px', fontWeight: 600, color: '#374151', background: 'white', cursor: 'pointer' }}>
                  Show More Matches
                </button>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        {(previewLoading || coursePreview) && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div style={{ width: 'min(980px, 100%)', maxHeight: '90vh', overflowY: 'auto', background: 'white', borderRadius: '18px', border: '1px solid #e5e7eb', boxShadow: '0 20px 45px rgba(15, 23, 42, 0.25)' }}>
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #eef2f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '11px', letterSpacing: '0.08em', color: '#6b7280', fontWeight: 700 }}>COURSE PREVIEW</p>
                  <h3 style={{ margin: '4px 0 0', fontSize: '18px', color: '#0f172a' }}>{coursePreview?.title || 'Loading...'}</h3>
                  {!!previewOwnerName && <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>By {previewOwnerName}</p>}
                </div>
                <button onClick={closeCoursePreview} style={{ border: '1px solid #e2e8f0', background: 'white', color: '#334155', borderRadius: '10px', fontWeight: 700, fontSize: '12px', cursor: 'pointer', padding: '0.5rem 0.75rem' }}>
                  Close
                </button>
              </div>

              {previewLoading || !coursePreview ? (
                <div style={{ padding: '2rem 1.25rem', color: '#64748b', fontSize: '14px' }}>Loading course content...</div>
              ) : (
                <div style={{ padding: '1rem 1.25rem 1.25rem', display: 'grid', gap: '1rem' }}>
                  <div style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)', border: '1px solid #dbeafe', borderRadius: '12px', padding: '0.875rem' }}>
                    <p style={{ margin: 0, fontWeight: 700, color: '#1e3a8a', fontSize: '13px' }}>Description</p>
                    <p style={{ margin: '6px 0 0', color: '#1f2937', fontSize: '13px', lineHeight: 1.6 }}>{coursePreview.description || 'No description provided by teacher.'}</p>
                  </div>

                  <div>
                    <p style={{ margin: 0, fontWeight: 800, color: '#111827', fontSize: '14px' }}>Video Lessons ({coursePreview.lessons.length})</p>
                    {coursePreview.lessons.length === 0 ? (
                      <p style={{ color: '#9ca3af', fontSize: '13px' }}>No videos uploaded yet.</p>
                    ) : (
                      <div style={{ display: 'grid', gap: '0.875rem', marginTop: '0.625rem' }}>
                        {coursePreview.lessons.map((lesson) => (
                          <div key={lesson.id} style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '0.75rem' }}>
                            <p style={{ margin: 0, color: '#0f172a', fontWeight: 700, fontSize: '13px' }}>{lesson.title}</p>
                            <p style={{ margin: '4px 0 8px', color: '#64748b', fontSize: '12px' }}>{lesson.description || lesson.videoName}</p>
                            <video controls style={{ width: '100%', borderRadius: '10px', background: '#020617' }} src={lesson.videoUrl.startsWith('http') ? lesson.videoUrl : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9090'}${lesson.videoUrl}`} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <p style={{ margin: 0, fontWeight: 800, color: '#111827', fontSize: '14px' }}>Resources ({coursePreview.resources.length})</p>
                    {coursePreview.resources.length === 0 ? (
                      <p style={{ color: '#9ca3af', fontSize: '13px' }}>No resources uploaded yet.</p>
                    ) : (
                      <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.625rem' }}>
                        {coursePreview.resources.map((resource) => (
                          <a
                            key={resource.id}
                            href={resource.fileUrl.startsWith('http') ? resource.fileUrl : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9090'}${resource.fileUrl}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e5e7eb', background: '#f8fafc', borderRadius: '10px', padding: '0.625rem 0.75rem', textDecoration: 'none' }}
                          >
                            <span style={{ color: '#1f2937', fontSize: '12px', fontWeight: 700 }}>{resource.title || resource.fileName}</span>
                            <span style={{ color: '#64748b', fontSize: '11px' }}>{resource.fileSize || 'Open'}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <footer style={{ borderTop: '1px solid #e5e7eb', marginTop: '4rem', paddingTop: '2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '2rem', marginBottom: '1.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div style={{ width: '22px', height: '22px', background: '#1a56db', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                    <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                </div>
                <span style={{ fontWeight: 700, fontSize: '14px', color: '#111827' }}>Skill-Swap Hub</span>
              </div>
              <p style={{ fontSize: '12px', color: '#9ca3af', lineHeight: 1.6 }}>
                The curated commons for knowledge exchange.
              </p>
            </div>
            {[
              { title: 'PLATFORM', links: ['About', 'Community Guidelines', 'Success Stories'] },
              { title: 'LEGAL', links: ['Privacy Policy', 'Terms of Service', 'Cookie Settings'] },
              { title: 'SUPPORT', links: ['Contact Support', 'Help Center', 'Safety Tips'] },
            ].map(col => (
              <div key={col.title}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#111827', letterSpacing: '0.08em', marginBottom: '10px' }}>{col.title}</div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {col.links.map(l => (
                    <li key={l}><a href="#" style={{ fontSize: '12px', color: '#9ca3af', textDecoration: 'none' }}>{l}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div style={{ fontSize: '12px', color: '#d1d5db', textAlign: 'center', paddingBottom: '1rem' }}>
            © 2024 Skill-Swap Hub. The Curated Commons.
          </div>
        </footer>

      </div>
    </AppLayout>
  )
}