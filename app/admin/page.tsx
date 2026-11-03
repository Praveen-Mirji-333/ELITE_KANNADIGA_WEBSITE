'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import { getUserProfile } from '../../lib/supabase'
import { AdminDashboard } from '../../components/admin/AdminDashboard'

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const prof = await getUserProfile()
      if (prof?.role === 'admin') {
        setIsAdmin(true)
      } else {
        setIsAdmin(false)
      }
      setLoading(false)
    }
    init()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas text-ink neu-theme flex items-center justify-center">
        <p className="font-display text-lg tracking-widest text-brand-bright animate-pulse">
          VERIFYING ADMIN CREDENTIALS...
        </p>
      </div>
    )
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-canvas text-ink neu-theme flex flex-col items-center justify-center p-6 text-center">
        <div className="card max-w-md p-8 flex flex-col items-center">
          <ShieldCheck className="text-brand-bright mb-4" size={48} />
          <h1 className="font-display text-2xl font-extrabold uppercase text-ink">ACCESS RESTRICTED</h1>
          <p className="mt-2 text-sm text-ink-muted">
            You must be logged in as an authorized Admin to view the Admin Control Center.
          </p>
          <Link href="/" className="btn-primary mt-6">
            RETURN TO ARENA HOME
          </Link>
        </div>
      </div>
    )
  }

  return <AdminDashboard isOpen={true} onClose={() => (window.location.href = '/')} />
}
