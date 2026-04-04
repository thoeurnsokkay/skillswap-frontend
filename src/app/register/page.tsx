'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import toast from 'react-hot-toast'
import api from '@/lib/api'

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(4, 'Password must be at least 4 characters'),
  confirmPassword: z.string(),
  bio: z.string().max(300).optional(),
  location: z.string().max(100).optional(),
}).refine(d => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})
type Form = z.infer<typeof schema>

export default function RegisterPage() {
  const router = useRouter()
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: Form) => {
    try {
      const { confirmPassword, ...payload } = data
      await api.post('/api/auth/register', payload)
      toast.success('Account created! Please sign in 🎉')
      router.push('/login')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Registration failed')
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f0f4f8', fontFamily: "'DM Sans', sans-serif" }}>

      {/* Navbar */}
      <nav style={{ background: 'white', borderBottom: '1px solid #e8edf2', padding: '0 2rem', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent:'center', alignItems: 'center', padding: '3rem 1rem' }}>

        {/* Card */}
        <div style={{ background: 'white', borderRadius: '20px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', width: '100%', maxWidth: '480px', overflow: 'hidden' }}>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #f3f4f6' }}>
            <Link
              href="/login"
              style={{ flex: 1, padding: '1rem', fontSize: '15px', fontWeight: 600, background: 'none', cursor: 'pointer', color: '#9ca3af', borderBottom: '2px solid transparent', textDecoration: 'none', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              Login
            </Link>
            <button
              style={{ flex: 1, padding: '1rem', fontSize: '15px', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', color: '#1a56db', borderBottom: '2px solid #1a56db' }}
            >
              Register
            </button>
          </div>

          <div style={{ padding: '1.75rem' }}>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              {/* Name */}
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>
                  Full Name *
                </label>
                <input
                  placeholder="John Doe"
                  {...register('name')}
                  style={{ width: '100%', padding: '0.75rem 1rem', border: `1.5px solid ${errors.name ? '#ef4444' : '#e5e7eb'}`, borderRadius: '10px', fontSize: '14px', outline: 'none', background: '#f9fafb', color: '#111827', boxSizing: 'border-box' as const }}
                />
                {errors.name && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.name.message}</p>}
              </div>

              {/* Email */}
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  placeholder="john@example.com"
                  {...register('email')}
                  style={{ width: '100%', padding: '0.75rem 1rem', border: `1.5px solid ${errors.email ? '#ef4444' : '#e5e7eb'}`, borderRadius: '10px', fontSize: '14px', outline: 'none', background: '#f9fafb', color: '#111827', boxSizing: 'border-box' as const }}
                />
                {errors.email && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.email.message}</p>}
              </div>

              {/* Password */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>
                    Password *
                  </label>
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
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#9ca3af' }}
                    >
                      {showPass ? '🙈' : '👁'}
                    </button>
                  </div>
                  {errors.password && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.password.message}</p>}
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>
                    Confirm *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="••••••••"
                      {...register('confirmPassword')}
                      style={{ width: '100%', padding: '0.75rem 2.5rem 0.75rem 1rem', border: `1.5px solid ${errors.confirmPassword ? '#ef4444' : '#e5e7eb'}`, borderRadius: '10px', fontSize: '14px', outline: 'none', background: '#f9fafb', color: '#111827', boxSizing: 'border-box' as const }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#9ca3af' }}
                    >
                      {showConfirm ? '🙈' : '👁'}
                    </button>
                  </div>
                  {errors.confirmPassword && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.confirmPassword.message}</p>}
                </div>
              </div>

              {/* Terms */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <input
                  type="checkbox"
                  required
                  style={{ marginTop: '2px', width: '16px', height: '16px', flexShrink: 0, accentColor: '#1a56db' }}
                />
                <label style={{ fontSize: '12px', color: '#6b7280', lineHeight: 1.5 }}>
                  I agree to the{' '}
                  <span style={{ color: '#1a56db', fontWeight: 600, cursor: 'pointer' }}>Terms of Service</span>
                  {' '}and{' '}
                  <span style={{ color: '#1a56db', fontWeight: 600, cursor: 'pointer' }}>Privacy Policy</span>.
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                style={{ width: '100%', padding: '0.875rem', background: isSubmitting ? '#93c5fd' : '#1a56db', color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 700, cursor: isSubmitting ? 'not-allowed' : 'pointer', marginTop: '0.25rem' }}
              >
                {isSubmitting ? '⏳ Creating...' : 'Create Account →'}
              </button>
            </form>
          </div>
        </div>

        {/* Login link */}
        <p style={{ marginTop: '1.5rem', fontSize: '14px', color: '#6b7280' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#1a56db', fontWeight: 600, textDecoration: 'none' }}>
            Login here
          </Link>
        </p>
      </div>
    </div>
  )
}