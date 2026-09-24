'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Database,
  HelpCircle,
  LogIn,
  LogOut,
  Menu,
  ShieldCheck,
  User,
  X,
} from 'lucide-react'
import { Profile } from '../lib/types'
import { checkSupabaseConnection, fetchSiteSetting, getUserProfile, supabase } from '../lib/supabase'
import { AuthModal } from './auth/AuthModal'
import { PlayerDashboard } from './dashboard/PlayerDashboard'
import { QuizModal } from './qna/QuizModal'
import { AdminDashboard } from './admin/AdminDashboard'

const logoUrl = '/logo.png'

const SHOW_LIVE_SECTION = false // Set to true to show Live section again

const navItems = [
  { name: 'HOME', path: '/' },
  { name: 'TOURNAMENTS', path: '/tournaments' },
  ...(SHOW_LIVE_SECTION ? [{ name: 'LIVE', path: '/live' }] : []),
  { name: 'LEADERBOARD', path: '/leaderboard' },
  { name: 'GUILDS', path: '/guilds' },
  { name: 'ACHIEVEMENTS', path: '/achievements' },
]

export function Navbar() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [dbConnected, setDbConnected] = useState<boolean | null>(null)
  const [userProfile, setUserProfile] = useState<Profile | null>(null)
  const [showGuildSection, setShowGuildSection] = useState(true)

  // Modals
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [dashboardOpen, setDashboardOpen] = useState(false)
  const [quizModalOpen, setQuizModalOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)

  async function loadSettings() {
    const guildSetting = await fetchSiteSetting('show_guild_section', 'true')
    setShowGuildSection(guildSetting)
  }

  useEffect(() => {
    async function init() {
      const res = await checkSupabaseConnection()
      setDbConnected(res.connected)
      await loadSettings()
      loadUser()
    }
    init()

    const handleSettingsUpdate = () => {
      loadSettings()
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('site_settings_updated', handleSettingsUpdate)
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUser()
    })

    return () => {
      subscription.unsubscribe()
      if (typeof window !== 'undefined') {
        window.removeEventListener('site_settings_updated', handleSettingsUpdate)
      }
    }
  }, [])

  useEffect(() => {
    loadSettings()
  }, [adminOpen])

  async function loadUser() {
    const prof = await getUserProfile()
    setUserProfile(prof)
  }

  const handleAuthSuccess = (role: 'admin' | 'user') => {
    loadUser()
    if (role === 'admin') {
      setAdminOpen(true)
      setDashboardOpen(false)
    } else {
      setDashboardOpen(true)
      setAdminOpen(false)
    }
  }

  const handleProfileClick = () => {
    if (!userProfile) {
      setAuthModalOpen(true)
      setDashboardOpen(false)
      setAdminOpen(false)
      return
    }
    if (userProfile.role === 'admin') {
      setAdminOpen(true)
      setDashboardOpen(false)
    } else {
      setDashboardOpen(true)
      setAdminOpen(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUserProfile(null)
    setAdminOpen(false)
    setDashboardOpen(false)
  }

  const filteredNavItems = navItems.filter((item) => item.path !== '/guilds' || showGuildSection)

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-[#050505]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-5 lg:px-10">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <img
              src={logoUrl}
              alt="ELITE Kannada emblem"
              className="h-12 w-12 rounded-full object-cover transition hover:scale-105"
            />
            <div className="hidden leading-none sm:block">
              <span className="font-display text-lg font-black tracking-[0.16em]">
                ELITE
              </span>
              <span className="ml-2 text-sm font-bold text-red-500">
                ಕನ್ನಡಿಗ
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden items-center gap-7 lg:flex">
            {filteredNavItems.map((item) => {
              const isActive = pathname === item.path
              return (
                <Link
                  key={item.name}
                  href={item.path}
                  className={`nav-link relative py-1 text-xs font-black tracking-widest transition ${isActive ? 'text-red-500 active' : 'text-white/70 hover:text-white'
                    }`}
                >
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* DB Status */}
            <div className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold sm:flex">
              <Database
                size={12}
                className={dbConnected ? 'text-emerald-400' : 'text-amber-400'}
              />
              <span className="tracking-widest text-white/70">DB:</span>
              <span
                className={dbConnected ? 'text-emerald-400' : 'text-amber-400'}
              >
                {dbConnected === null
                  ? 'CONNECTING...'
                  : dbConnected
                    ? 'CONNECTED'
                    : 'INITIALIZED'}
              </span>
            </div>

            {/* QnA Arena Button */}
            <button
              onClick={() => setQuizModalOpen(true)}
              className="hidden items-center gap-1.5 border border-amber-500/40 bg-amber-950/40 px-3 py-1.5 text-[10px] font-black tracking-widest text-amber-400 transition hover:bg-amber-500 hover:text-black sm:flex"
            >
              <HelpCircle size={13} /> QnA ARENA
            </button>

            {/* Auth / Account Profile Button & Logout */}
            {userProfile ? (
              <div className="flex items-center gap-3">
                {userProfile.role === 'admin' && (
                  <button
                    onClick={() => {
                      setAdminOpen(true)
                      setDashboardOpen(false)
                    }}
                    className="flex items-center gap-2 border border-amber-500 bg-amber-950/60 px-3 py-1.5 text-[10px] font-black tracking-widest text-amber-400 transition hover:bg-amber-500 hover:text-black"
                  >
                    <ShieldCheck size={13} /> ADMIN
                  </button>
                )}

                <button
                  onClick={handleProfileClick}
                  className="relative group p-0.5 rounded-full border-2 border-red-600/80 bg-red-950/40 transition hover:border-red-500 hover:scale-105 shadow-md"
                  title={`${userProfile.ign || 'User'} - Open Profile`}
                >
                  {userProfile.avatar_url && !userProfile.avatar_url.includes('hebbkx1anhila5yf') && !userProfile.avatar_url.includes('/logo.png') ? (
                    <img
                      src={userProfile.avatar_url}
                      alt={userProfile.ign || 'User Profile'}
                      className="h-9 w-9 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-red-700 flex items-center justify-center">
                      <span className="text-[11px] font-black text-white">
                        {(userProfile.ign || userProfile.username || 'U').slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-emerald-500 border border-black">
                  </span>
                </button>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 border border-red-800/80 bg-red-950/60 px-2.5 py-1.5 text-[10px] font-black tracking-widest text-red-400 transition hover:bg-red-600 hover:text-white"
                  title="Logout"
                >
                  <LogOut size={13} /> LOGOUT
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="flex items-center gap-1.5 border border-red-700 bg-red-600 px-4 py-2 text-[10px] font-black tracking-widest transition hover:bg-red-500"
              >
                <LogIn size={13} /> LOGIN / SIGNUP
              </button>
            )}

            {/* Mobile Hamburger */}
            <button
              className="text-white lg:hidden"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {menuOpen && (
          <nav className="border-t border-white/10 bg-[#0b0b0d] px-6 py-5 lg:hidden">
            {filteredNavItems.map((item) => (
              <Link
                key={item.name}
                href={item.path}
                onClick={() => setMenuOpen(false)}
                className={`block border-b border-white/5 py-3 text-xs font-bold tracking-widest ${pathname === item.path ? 'text-red-500' : 'text-white/70'
                  }`}
              >
                {item.name}
              </Link>
            ))}
            <button
              onClick={() => {
                setMenuOpen(false)
                setQuizModalOpen(true)
              }}
              className="mt-3 block w-full text-left py-3 text-xs font-bold tracking-widest text-amber-400"
            >
              QnA ARENA (+10 XP)
            </button>
          </nav>
        )}
      </header>

      {/* Shared Modals */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />
      <PlayerDashboard
        isOpen={dashboardOpen}
        onClose={() => setDashboardOpen(false)}
        profile={userProfile}
        onProfileUpdated={() => loadUser()}
      />
      <QuizModal
        isOpen={quizModalOpen}
        onClose={() => setQuizModalOpen(false)}
        onXPClaimed={() => loadUser()}
      />
      <AdminDashboard isOpen={adminOpen} onClose={() => setAdminOpen(false)} />
    </>
  )
}
