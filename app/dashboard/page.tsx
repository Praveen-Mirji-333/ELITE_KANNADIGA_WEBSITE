'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { User, LogIn, Sparkles } from 'lucide-react'
import { Navbar } from '../../components/Navbar'
import { Footer } from '../../components/Footer'
import { PlayerDashboard } from '../../components/dashboard/PlayerDashboard'
import { getUserProfile } from '../../lib/supabase'
import type { Profile } from '../../lib/types'

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [dashboardOpen, setDashboardOpen] = useState(true)

  async function loadUser() {
    try {
      const prof = await getUserProfile()
      setProfile(prof)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUser()
  }, [])

  if (loading) {
    return (
      <main className="min-h-screen bg-[#050505] text-[#f5f5f5] flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="font-display text-sm uppercase tracking-widest text-amber-400 animate-pulse">
            LOADING ARENA DASHBOARD...
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#050505] text-[#f5f5f5]">
      <div className="noise" />
      <Navbar />

      {!profile ? (
        <div className="site-container pt-32 pb-24 flex flex-col items-center justify-center text-center">
          <div className="border border-red-900/60 bg-gradient-to-b from-red-950/40 to-black p-8 sm:p-12 max-w-md w-full shadow-2xl">
            <User className="mx-auto text-red-500 mb-4" size={48} />
            <h1 className="font-display text-2xl font-black uppercase text-white tracking-tight">
              PLAYER LOGIN REQUIRED
            </h1>
            <p className="mt-2 text-xs text-white/60 leading-relaxed">
              Sign in with your Free Fire IGN / UID to access your player dashboard, manage registrations, and view the live tournament points table.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Link
                href="/login"
                className="bg-red-600 hover:bg-red-500 px-6 py-3 text-xs font-black uppercase tracking-widest text-white transition flex items-center justify-center gap-2"
              >
                <LogIn size={15} /> Sign In / Register
              </Link>
              <Link
                href="/"
                className="border border-white/10 hover:border-white/30 px-6 py-2.5 text-xs font-bold text-white/50 hover:text-white transition"
              >
                Return to Home
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="site-container pt-28 pb-12">
            <div className="flex items-center justify-between border-b border-white/10 pb-6">
              <div>
                <p className="eyebrow flex items-center gap-2 mb-1">
                  <Sparkles size={12} className="text-amber-400" /> ELITE WARRIOR HQ
                </p>
                <h1 className="font-display text-2xl sm:text-4xl font-black uppercase text-white">
                  {profile.ign}’S ARENA DASHBOARD
                </h1>
              </div>
              <button
                onClick={() => setDashboardOpen(true)}
                className="bg-red-600 hover:bg-red-500 px-4 py-2 text-xs font-black uppercase tracking-wider text-white transition"
              >
                Open Dashboard Modal
              </button>
            </div>
          </div>

          <PlayerDashboard
            isOpen={dashboardOpen}
            onClose={() => setDashboardOpen(false)}
            profile={profile}
            onProfileUpdated={loadUser}
          />
        </>
      )}

      <Footer />
    </main>
  )
}
