'use client'

import { useState, useEffect } from 'react'
import {
  Shield,
  Lock,
  Mail,
  User,
  Gamepad,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import {
  supabase,
  getUserProfile,
  registerPlayerWithUid,
  loginPlayerWithUid,
} from '../../lib/supabase'
import { Profile } from '../../lib/types'

interface GlobalAuthGateProps {
  children: React.ReactNode
}

export function GlobalAuthGate({ children }: GlobalAuthGateProps) {
  const [authChecking, setAuthChecking] = useState(true)
  const [userProfile, setUserProfile] = useState<Profile | null>(null)

  // Auth Form State
  const [authMode, setAuthMode] = useState<'player_login' | 'register' | 'admin_login'>('player_login')
  const [freeFireUid, setFreeFireUid] = useState('')
  const [ign, setIgn] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    let isMounted = true

    async function checkCurrentSession() {
      try {
        const prof = await getUserProfile()
        if (isMounted) {
          setUserProfile(prof)
          setAuthChecking(false)
        }
      } catch {
        if (isMounted) {
          setUserProfile(null)
          setAuthChecking(false)
        }
      }
    }

    checkCurrentSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const prof = await getUserProfile(session.user.id)
        if (isMounted) {
          setUserProfile(prof)
          setAuthChecking(false)
        }
      } else {
        if (isMounted) {
          setUserProfile(null)
          setAuthChecking(false)
        }
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')
    setLoading(true)

    try {
      if (authMode === 'register') {
        // Player Registration with Game UID and Player Name
        const res = await registerPlayerWithUid(freeFireUid, ign)
        if (!res.success || !res.profile) {
          throw new Error(res.error || 'Registration failed. Please try again.')
        }

        setSuccessMsg(`Welcome ${res.profile.ign || ign}! Account created. Entering Arena...`)
        setUserProfile(res.profile)

        setTimeout(() => {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('open_player_dashboard', {
                detail: { role: res.role || 'user' },
              })
            )
          }
        }, 600)
      } else if (authMode === 'admin_login') {
        // Admin Login with Email & Password
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error

        const prof = await getUserProfile(data.user.id)
        const role = prof?.role === 'admin' ? 'admin' : 'user'

        setSuccessMsg(
          role === 'admin'
            ? 'Welcome Administrator! Entering Control Center...'
            : 'Logged in successfully! Opening Player Dashboard...'
        )
        setUserProfile(prof)

        setTimeout(() => {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('open_player_dashboard', {
                detail: { role },
              })
            )
          }
        }, 600)
      } else {
        // Player Login with Free Fire Game UID
        const res = await loginPlayerWithUid(freeFireUid)
        if (!res.success || !res.profile) {
          throw new Error(res.error || 'Login failed. Please verify your Game UID.')
        }

        setSuccessMsg(`Welcome back, ${res.profile.ign || 'Player'}! Entering Arena...`)
        setUserProfile(res.profile)

        setTimeout(() => {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('open_player_dashboard', {
                detail: { role: res.role || 'user' },
              })
            )
          }
        }, 600)
      }
    } catch (err: any) {
      const msg = err.message || ''
      if (msg.toLowerCase().includes('invalid login credentials')) {
        setErrorMsg('Invalid login credentials. If you are a new player, click "REGISTER" above.')
      } else {
        setErrorMsg(msg || 'Authentication failed. Please check your inputs.')
      }
    } finally {
      setLoading(false)
    }
  }

  // 1. Initial Session Verification Screen
  if (authChecking) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#050505] text-white">
        <div className="relative flex flex-col items-center">
          <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full border-2 border-red-600/60 p-1 animate-pulse">
            <img src="/logo.png" alt="ELITE Kannada" className="h-full w-full rounded-full object-cover" />
          </div>
          <p className="mt-4 font-display text-xs sm:text-sm font-black uppercase tracking-widest text-red-500 animate-pulse">
            VERIFYING ELITE ARENA ACCESS...
          </p>
        </div>
      </div>
    )
  }

  // 2. If Not Logged In: Block all routes and strictly render the Login Landing Portal
  if (!userProfile) {
    return (
      <div className="relative min-h-screen bg-[#050505] text-[#f5f5f5] flex items-center justify-center p-4 overflow-hidden">
        <div className="noise" />

        {/* Esports Glow Accents */}
        <div className="absolute top-[10%] left-[15%] h-[350px] w-[350px] rounded-full bg-red-600/10 blur-[140px] pointer-events-none" />
        <div className="absolute bottom-[10%] right-[15%] h-[400px] w-[400px] rounded-full bg-red-950/25 blur-[150px] pointer-events-none" />

        <div className="relative z-10 w-full max-w-md border border-red-800/60 bg-[#0c0c0e]/95 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {/* Header Branding */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 h-16 w-16 sm:h-20 sm:w-20 rounded-full border-2 border-red-600/80 p-1 shadow-2xl bg-black flex items-center justify-center">
              <img src="/logo.png" alt="ELITE Kannada" className="h-full w-full rounded-full object-cover" />
            </div>

            <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-red-500 flex items-center justify-center gap-1.5">
              <Shield size={14} /> OFFICIAL TOURNAMENT PLATFORM
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-black uppercase text-white tracking-tight mt-1">
              ELITE <span className="text-metallic">ಕನ್ನಡಿಗ</span>
            </h1>
            <p className="mt-1.5 text-xs text-white/60 max-w-xs mx-auto">
              Please log in with your Free Fire Game UID or register to unlock access to all tournaments, squads, and your player dashboard.
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="mb-6 grid grid-cols-3 border border-white/10 bg-white/5 p-1 gap-1">
            <button
              type="button"
              onClick={() => {
                setAuthMode('player_login')
                setErrorMsg('')
                setSuccessMsg('')
              }}
              className={`py-2 text-[10px] sm:text-[11px] font-black tracking-wider uppercase transition ${
                authMode === 'player_login'
                  ? 'bg-red-600 text-white shadow-lg'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              LOGIN (UID)
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('register')
                setErrorMsg('')
                setSuccessMsg('')
              }}
              className={`py-2 text-[10px] sm:text-[11px] font-black tracking-wider uppercase transition ${
                authMode === 'register'
                  ? 'bg-red-600 text-white shadow-lg'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              REGISTER
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('admin_login')
                setErrorMsg('')
                setSuccessMsg('')
              }}
              className={`py-2 text-[10px] sm:text-[11px] font-black tracking-wider uppercase transition ${
                authMode === 'admin_login'
                  ? 'bg-red-600 text-white shadow-lg'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              ADMIN
            </button>
          </div>

          {errorMsg && (
            <div className="mb-4 flex items-start gap-2 border border-red-600/40 bg-red-950/40 p-3 text-xs text-red-400">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 flex items-center gap-2 border border-emerald-500/40 bg-emerald-950/40 p-3 text-xs text-emerald-400">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. PLAYER LOGIN (UID ONLY) */}
            {authMode === 'player_login' && (
              <div>
                <label className="mb-1 block text-[10px] font-bold tracking-widest text-white/60 uppercase">
                  FREE FIRE GAME UID *
                </label>
                <div className="relative">
                  <Gamepad className="absolute left-3 top-3 text-white/40" size={16} />
                  <input
                    type="text"
                    required
                    value={freeFireUid}
                    onChange={(e) => setFreeFireUid(e.target.value)}
                    placeholder="Enter your Free Fire UID (e.g. 1928374650)"
                    className="w-full border border-white/15 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/30 focus:border-red-500 focus:outline-none"
                  />
                </div>
                <p className="mt-1.5 text-[10px] text-white/40">
                  Enter your registered Free Fire UID to open your User Dashboard immediately.
                </p>
              </div>
            )}

            {/* 2. PLAYER REGISTRATION */}
            {authMode === 'register' && (
              <>
                <div>
                  <label className="mb-1 block text-[10px] font-bold tracking-widest text-white/60 uppercase">
                    FREE FIRE GAME UID *
                  </label>
                  <div className="relative">
                    <Gamepad className="absolute left-3 top-3 text-white/40" size={16} />
                    <input
                      type="text"
                      required
                      value={freeFireUid}
                      onChange={(e) => setFreeFireUid(e.target.value)}
                      placeholder="e.g. 1928374650"
                      className="w-full border border-white/15 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/30 focus:border-red-500 focus:outline-none"
                    />
                  </div>
                  <p className="mt-1 text-[9px] text-white/40">
                    Your Free Fire Game UID will be your unique player identity key.
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-bold tracking-widest text-white/60 uppercase">
                    PLAYER NAME (IGN) *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 text-white/40" size={16} />
                    <input
                      type="text"
                      required
                      value={ign}
                      onChange={(e) => setIgn(e.target.value)}
                      placeholder="e.g. ELITE_RAHUL"
                      className="w-full border border-white/15 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/30 focus:border-red-500 focus:outline-none"
                    />
                  </div>
                  <p className="mt-1 text-[9px] text-white/40">
                    Your official in-game name shown on leaderboards and guild rosters.
                  </p>
                </div>
              </>
            )}

            {/* 3. ADMIN LOGIN */}
            {authMode === 'admin_login' && (
              <>
                <div>
                  <label className="mb-1 block text-[10px] font-bold tracking-widest text-white/60 uppercase">
                    ADMIN EMAIL ADDRESS *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 text-white/40" size={16} />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@elitekannadiga.com"
                      className="w-full border border-white/15 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/30 focus:border-red-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-bold tracking-widest text-white/60 uppercase">
                    PASSWORD *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 text-white/40" size={16} />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full border border-white/15 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/30 focus:border-red-500 focus:outline-none"
                    />
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full bg-red-600 py-3.5 font-display text-xs font-black tracking-widest text-white uppercase transition hover:bg-red-500 disabled:opacity-50 shadow-xl shadow-red-900/30"
            >
              {loading
                ? 'VERIFYING CREDENTIALS...'
                : authMode === 'register'
                ? 'REGISTER & OPEN USER DASHBOARD'
                : authMode === 'admin_login'
                ? 'LOGIN AS ADMIN'
                : 'LOGIN & OPEN USER DASHBOARD'}
            </button>
          </form>

          {/* Quick Switch Helper */}
          <div className="mt-6 border-t border-white/10 pt-4 text-center">
            {authMode === 'register' ? (
              <button
                type="button"
                onClick={() => {
                  setAuthMode('player_login')
                  setErrorMsg('')
                  setSuccessMsg('')
                }}
                className="text-xs font-bold tracking-wider text-white/60 hover:text-red-400 transition"
              >
                ALREADY REGISTERED? <span className="text-red-500 underline">LOGIN WITH UID</span>
              </button>
            ) : authMode === 'player_login' ? (
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register')
                  setErrorMsg('')
                  setSuccessMsg('')
                }}
                className="text-xs font-bold tracking-wider text-white/60 hover:text-red-400 transition"
              >
                NEW PLAYER? <span className="text-red-500 underline">CREATE PLAYER ACCOUNT</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAuthMode('player_login')
                  setErrorMsg('')
                  setSuccessMsg('')
                }}
                className="text-xs font-bold tracking-wider text-white/60 hover:text-red-400 transition"
              >
                RETURN TO <span className="text-red-500 underline">PLAYER LOGIN</span>
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // 3. User is Authenticated: Render the requested route and children!
  return <>{children}</>
}
