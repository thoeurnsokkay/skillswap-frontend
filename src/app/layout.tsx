import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'
export const metadata: Metadata = { title: 'Skill-Swap Hub', description: 'Exchange skills with people around you' }
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster position="top-right" toastOptions={{
          style: { borderRadius: '8px', fontFamily: 'Inter, sans-serif', fontSize: '0.875rem' },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } }
        }} />
      </body>
    </html>
  )
}
