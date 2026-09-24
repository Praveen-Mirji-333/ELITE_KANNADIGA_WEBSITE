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
      <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-[#050505]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 sm:h-20 2xl:h-24 max-w-[1440px] 2xl:max-w-[1800px] 3xl:max-w-[2200px] items-center justify-between px-3 sm:px-6 lg:px-10 2xl:px-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 sm:gap-3 shrink-0">
            <img
              src={logoUrl}
              alt="ELITE Kannada emblem"
              className="h-9 w-9 sm:h-12 sm:w-12 2xl:h-14 2xl:w-14 rounded-full object-cover transition hover:scale-105"
            />
            <div className="leading-tight">
              <span className="font-display text-sm sm:text-lg 2xl:text-xl font-black tracking-[0.14em] text-white">
                ELITE
              </span>
              <span className="ml-1.5 text-xs sm:text-sm 2xl:text-base font-bold text-red-500">
                ಕನ್ನಡಿಗ
              </span>
            </div>
          </Link>

          {/* Navigation Links (Desktop & Ultrawide) */}
          <nav className="hidden items-center gap-5 xl:gap-7 2xl:gap-10 lg:flex">
            {filteredNavItems.map((item) => {
              const isActive = pathname === item.path
              return (
                <Link
                  key={item.name}
                  href={item.path}
                  className={`nav-link relative py-1 text-xs 2xl:text-sm font-black tracking-widest transition ${
                    isActive ? 'text-red-500 active' : 'text-white/70 hover:text-white'
                  }`}
                >
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-3 2xl:gap-4">
            {/* DB Status */}
            <div className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] 2xl:text-xs font-bold md:flex">
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
              className="hidden items-center gap-1.5 border border-amber-500/40 bg-amber-950/40 px-3 py-1.5 text-[10px] 2xl:text-xs font-black tracking-widest text-amber-400 transition hover:bg-amber-500 hover:text-black sm:flex"
            >
              <HelpCircle size={13} /> QnA ARENA
            </button>

            {/* Auth / Account Profile Button & Logout */}
            {userProfile ? (
              <div className="flex items-center gap-1.5 sm:gap-2.5">
                {userProfile.role === 'admin' && (
                  <button
                    onClick={() => {
                      setAdminOpen(true)
                      setDashboardOpen(false)
                    }}
                    className="flex items-center gap-1 border border-amber-500 bg-amber-950/60 px-2 py-1 sm:px-3 sm:py-1.5 text-[9px] sm:text-[10px] 2xl:text-xs font-black tracking-widest text-amber-400 transition hover:bg-amber-500 hover:text-black"
                  >
                    <ShieldCheck size={12} className="sm:size-[13px]" /> ADMIN
                  </button>
                )}

                <button
                  onClick={handleProfileClick}
                  className="relative group p-0.5 rounded-full border-2 border-red-600/80 bg-red-950/40 transition hover:border-red-500 hover:scale-105 shadow-md shrink-0"
                  title={`${userProfile.ign || 'User'} - Open Profile`}
                >
                  {userProfile.avatar_url && !userProfile.avatar_url.includes('hebbkx1anhila5yf') && !userProfile.avatar_url.includes('/logo.png') ? (
                    <img
                      src={userProfile.avatar_url}
                      alt={userProfile.ign || 'User Profile'}
                      className="h-8 w-8 sm:h-9 sm:w-9 2xl:h-11 2xl:w-11 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-8 w-8 sm:h-9 sm:w-9 2xl:h-11 2xl:w-11 rounded-full bg-red-700 flex items-center justify-center">
                      <span className="text-[10px] sm:text-[11px] 2xl:text-xs font-black text-white">
                        {(userProfile.ign || userProfile.username || 'U').slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5 sm:h-3 sm:w-3 items-center justify-center rounded-full bg-emerald-500 border border-black">
                  </span>
                </button>

                <button
                  onClick={handleLogout}
                  className="hidden sm:flex items-center gap-1 border border-red-800/80 bg-red-950/60 px-2.5 py-1.5 text-[10px] 2xl:text-xs font-black tracking-widest text-red-400 transition hover:bg-red-600 hover:text-white"
                  title="Logout"
                >
                  <LogOut size={12} /> LOGOUT
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="flex items-center gap-1 sm:gap-1.5 border border-red-700 bg-red-600 px-2.5 py-1.5 sm:px-4 sm:py-2 text-[9px] sm:text-[10px] 2xl:text-xs font-black tracking-wider transition hover:bg-red-500 shrink-0"
              >
                <LogIn size={12} className="sm:size-[13px]" />
                <span>LOGIN</span>
                <span className="hidden xs:inline">/ SIGNUP</span>
              </button>
            )}

            {/* Mobile Hamburger */}
            <button
              className="p-1.5 text-white/80 hover:text-white lg:hidden"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle navigation menu"
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {menuOpen && (
          <nav className="border-t border-white/10 bg-[#0b0b0d]/98 backdrop-blur-2xl px-5 py-4 lg:hidden max-h-[calc(100vh-4rem)] overflow-y-auto space-y-3">
            {userProfile && (
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-red-700 flex items-center justify-center font-bold text-sm text-white overflow-hidden border border-red-500">
                    {userProfile.avatar_url && !userProfile.avatar_url.includes('hebbkx1anhila5yf') && !userProfile.avatar_url.includes('/logo.png') ? (
                      <img src={userProfile.avatar_url} alt={userProfile.ign} className="h-full w-full object-cover" />
                    ) : (
                      (userProfile.ign || 'U').slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div>
                    <p className="font-display font-black text-sm text-white">{userProfile.ign || userProfile.username}</p>
                    <p className="text-[10px] font-mono text-amber-400">UID: {userProfile.free_fire_uid || 'N/A'}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    handleLogout()
                  }}
                  className="flex items-center gap-1 border border-red-800/80 bg-red-950/60 px-3 py-1.5 text-[10px] font-bold text-red-400"
                >
                  <LogOut size={12} /> LOGOUT
                </button>
              </div>
            )}

            <div className="space-y-1">
              {filteredNavItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.path}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center justify-between border-b border-white/5 py-3 text-xs font-bold tracking-widest transition ${
                    pathname === item.path ? 'text-red-500 pl-2 border-l-2 border-l-red-500' : 'text-white/70 hover:text-white'
                  }`}
                >
                  <span>{item.name}</span>
                  <span className="text-[10px] text-white/20">→</span>
                </Link>
              ))}
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => {
                  setMenuOpen(false)
                  setQuizModalOpen(true)
                }}
                className="w-full text-center py-2.5 border border-amber-500/50 bg-amber-950/40 text-xs font-bold tracking-widest text-amber-400"
              >
                🎮 QnA ARENA (+10 XP)
              </button>

              <div className="flex items-center justify-between px-2 py-2 text-[10px] font-bold text-white/50 border border-white/5">
                <span className="flex items-center gap-1.5">
                  <Database size={11} className={dbConnected ? 'text-emerald-400' : 'text-amber-400'} />
                  DATABASE STATUS
                </span>
                <span className={dbConnected ? 'text-emerald-400' : 'text-amber-400'}>
                  {dbConnected ? 'ONLINE & CONNECTED' : 'INITIALIZED'}
                </span>
              </div>
            </div>
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
