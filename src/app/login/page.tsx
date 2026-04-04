
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})
type Form = z.infer<typeof schema>

function getErrorMessage(err: any): string {
  if (!err.response) {
    if (err.message === 'Network Error') return 'Cannot reach the server. Check your connection or CORS settings.'
    return err.message || 'An unexpected error occurred.'
  }
  const { status, data } = err.response
  const msg = data?.message || data?.error || data?.data?.message || data?.errors?.[0]?.message || data?.detail || null
  if (msg) return msg
  switch (status) {
    case 400: return 'Bad request — please check your input.'
    case 401: return 'Invalid email or password.'
    case 403: return 'Your account does not have access.'
    case 404: return 'Login endpoint not found. Check your API URL.'
    case 422: return 'Validation error — please check your input.'
    case 429: return 'Too many attempts. Please wait and try again.'
    case 500: return 'Server error. Please try again later.'
    default: return `Something went wrong (${status}).`
  }
}

export default function LoginPage() {
  const router = useRouter()
  const setAuth = useAuthStore(s => s.setAuth)
  const [showPass, setShowPass] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: Form) => {
    try {
      const res = await api.post('/api/auth/login', data)
      const payload = res.data?.data ?? res.data
      const { token, user } = payload
      if (!token || !user) {
        toast.error('Unexpected response from server. Please try again.')
        return
      }
      setAuth(user, token)
      toast.success(`Welcome back, ${user.name}!`)
      router.push(user.role === 'ADMIN' ? '/admin' : '/dashboard')
    } catch (err: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[Login Error]', {
          status: err.response?.status,
          data: err.response?.data,
          message: err.message,
        })
      }
      toast.error(getErrorMessage(err))
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f0f4f8', fontFamily: "'DM Sans', sans-serif" }}>

      {/* Navbar */}
      <nav style={{ background: 'white', borderBottom: '1px solid #e8edf2', padding: '0 2rem', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <div style={{ width: '28px', height: '28px', background: '#1a56db', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </div>
          <span style={{ fontWeight: 700, color: '#111827', fontSize: '15px' }}>Skill-Swap Hub</span>
        </Link>
        <a href="#" style={{ fontSize: '14px', color: '#1a56db', fontWeight: 600, textDecoration: 'none' }}>Contact Support</a>
      </nav>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column',justifyContent:'center', alignItems: 'center', padding: '3rem 1rem' }}>

        {/* Card */}
        <div style={{ background: 'white', borderRadius: '20px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', width: '100%', maxWidth: '480px', overflow: 'hidden' }}>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #f3f4f6' }}>
            <button
              style={{ flex: 1, padding: '1rem', fontSize: '15px', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', color: '#1a56db', borderBottom: '2px solid #1a56db', transition: 'all 0.2s' }}
            >
              Login
            </button>
            <Link
              href="/register"
              style={{ flex: 1, padding: '1rem', fontSize: '15px', fontWeight: 600, background: 'none', cursor: 'pointer', color: '#9ca3af', borderBottom: '2px solid transparent', textDecoration: 'none', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              Register
            </Link>
          </div>

          <div style={{ padding: '1.75rem' }}>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              {/* Email */}
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="alex@university.edu"
                  {...register('email')}
                  style={{ width: '100%', padding: '0.75rem 1rem', border: `1.5px solid ${errors.email ? '#ef4444' : '#e5e7eb'}`, borderRadius: '10px', fontSize: '14px', outline: 'none', background: '#f9fafb', color: '#111827', boxSizing: 'border-box' as const }}
                />
                {errors.email && (
                  <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Password</label>
                  <span style={{ fontSize: '13px', color: '#1a56db', fontWeight: 500, cursor: 'pointer' }}>Forgot?</span>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...register('password')}
                    style={{ width: '100%', padding: '0.75rem 2.5rem 0.75rem 1rem', border: `1.5px solid ${errors.password ? '#ef4444' : '#e5e7eb'}`, borderRadius: '10px', fontSize: '14px', outline: 'none', background: '#f9fafb', color: '#111827', boxSizing: 'border-box' as const }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '14px' }}
                  >
                    {showPass ? '🙈' : '👁'}
                  </button>
                </div>
                {errors.password && (
                  <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.password.message}</p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                style={{ width: '100%', padding: '0.875rem', background: isSubmitting ? '#93c5fd' : '#1a56db', color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 700, cursor: isSubmitting ? 'not-allowed' : 'pointer', marginTop: '0.25rem' }}
              >
                {isSubmitting ? '⏳ Signing in...' : 'Enter Hub →'}
              </button>
            </form>
          </div>
        </div>

        {/* Sign up link */}
        <p style={{ marginTop: '1.5rem', fontSize: '14px', color: '#6b7280' }}>
          New to the Hub?{' '}
          <Link href="/register" style={{ color: '#1a56db', fontWeight: 600, textDecoration: 'none' }}>
            Create an account
          </Link>
        </p>
      </div>
    </div>
  )
}