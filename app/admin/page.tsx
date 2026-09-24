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
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
        <p className="font-display text-lg tracking-widest text-amber-500 animate-pulse">
          VERIFYING ADMIN CREDENTIALS...
        </p>
      </div>
    )
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 text-center">
        <ShieldCheck className="text-red-500 mb-4" size={48} />
        <h1 className="font-display text-3xl font-black uppercase">ACCESS RESTRICTED</h1>
        <p className="mt-2 text-sm text-white/60 max-w-md">
          You must be logged in as an authorized Admin to view the Admin Control Center.
        </p>
        <Link href="/" className="mt-6 text-xs font-bold text-red-500 underline hover:text-red-400">
          RETURN TO ARENA HOME
        </Link>
      </div>
    )
  }

  return <AdminDashboard isOpen={true} onClose={() => (window.location.href = '/')} />
}
