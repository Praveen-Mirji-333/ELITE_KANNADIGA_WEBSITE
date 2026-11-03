'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Gamepad,
  Lock,
  Mail,
  Shield,
  User,
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
  const pathname = usePathname()
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

  // Allow immediate public access to Home Page and public community pages
  if (pathname === '/' || pathname.startsWith('/tournaments') || pathname.startsWith('/leaderboard') || pathname.startsWith('/live') || pathname.startsWith('/guilds') || pathname.startsWith('/achievements') || pathname.startsWith('/privacy') || pathname.startsWith('/terms') || pathname.startsWith('/guidelines') || pathname.startsWith('/contact')) {
    return <>{children}</>
  }

  // 1. Initial session verification
  if (authChecking) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-canvas text-ink">
        <div className="h-14 w-14 animate-pulse rounded-full border border-line p-1">
          <img
            src="/logo.png"
            alt="ELITE ಕನ್ನಡಿಗ"
            className="h-full w-full rounded-full object-cover"
          />
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-ink-subtle">
          Verifying arena access...
        </p>
      </div>
    )
  }

  // 2. Protected-route login portal
  if (!userProfile) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-canvas text-ink">
        <div
          className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-brand/10 blur-[120px]"
          aria-hidden="true"
        />

        <div className="relative mx-auto grid min-h-screen w-full max-w-6xl items-start gap-8 px-4 pb-10 pt-6 sm:gap-10 sm:pt-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16 lg:px-8">
          {/* Brand panel */}
          <div className="hidden lg:block">
            <a href="/" className="inline-flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center overflow-hidden rounded-full border border-line bg-surface">
                <img src="/logo.png" alt="" className="h-full w-full object-cover" />
              </span>
              <span className="flex items-baseline gap-1.5">
                <span className="text-base font-bold tracking-[0.12em] text-ink">
                  ELITE
                </span>
                <span className="font-kannada text-sm font-semibold text-brand-bright">
                  ಕನ್ನಡಿಗ
                </span>
              </span>
            </a>

            <h1 className="display-hero mt-10 text-ink">
              Enter the{' '}
              <span className="block text-brand-bright">arena.</span>
            </h1>
            <p className="text-lead mt-5 max-w-md">
              One player identity for verified tournaments, live standings,
              guild rosters, and every ELITE ಕನ್ನಡಿಗ event.
            </p>

            <ul className="mt-8 space-y-3.5">
              {[
                'Verified tournament brackets and results',
                'One Free Fire UID across every event',
                'Secure player and admin access',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-ink-muted">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-brand-bright" />
                  {item}
                </li>
              ))}
            </ul>

            <a
              href="/"
              className="mt-10 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted transition-colors hover:text-brand-bright"
            >
              Back to home
              <ArrowRight size={14} />
            </a>
          </div>

          {/* Form */}
          <div className="mx-auto w-full max-w-md">
            <a href="/" className="mb-6 flex items-center gap-3 lg:hidden">
              <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-line bg-surface">
                <img src="/logo.png" alt="" className="h-full w-full object-cover" />
              </span>
              <span className="flex items-baseline gap-1.5">
                <span className="text-sm font-bold tracking-[0.12em] text-ink">ELITE</span>
                <span className="font-kannada text-xs font-semibold text-brand-bright">
                  ಕನ್ನಡಿಗ
                </span>
              </span>
            </a>

            <div className="card p-5 sm:p-7">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-subtle">
                <Shield size={14} className="text-brand-bright" />
                Secure player access
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink">
                {authMode === 'register'
                  ? 'Create your player account'
                  : authMode === 'admin_login'
                    ? 'Administrator login'
                    : 'Welcome back'}
              </h2>
              <p className="mt-1 text-sm text-ink-muted">
                {authMode === 'register'
                  ? 'Register with your Free Fire UID and in-game name.'
                  : authMode === 'admin_login'
                    ? 'Sign in with your administrator email and password.'
                    : 'Sign in with your registered Free Fire UID.'}
              </p>

              <div className="mt-5 grid grid-cols-3 gap-1 rounded-lg border border-line bg-surface-2 p-1">
                {(
                  [
                    ['player_login', 'Login'],
                    ['register', 'Register'],
                    ['admin_login', 'Admin'],
                  ] as const
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setAuthMode(mode)
                      setErrorMsg('')
                      setSuccessMsg('')
                    }}
                    className={`min-h-9 min-w-0 rounded-md px-1 text-[11px] font-semibold uppercase tracking-normal transition-colors sm:px-2 sm:text-xs sm:tracking-[0.06em] ${
                      authMode === mode
                        ? 'bg-brand text-white'
                        : 'text-ink-muted hover:bg-surface-3 hover:text-ink'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {errorMsg && (
                <div
                  className="mt-4 flex items-start gap-2 rounded-lg border border-brand-border bg-brand-muted p-3 text-xs text-brand-bright"
                  role="alert"
                >
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-line-strong bg-surface-3 p-3 text-xs text-ink">
                  <CheckCircle2 size={16} className="shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                {authMode === 'player_login' && (
                  <div>
                    <label className="label mb-1.5 block" htmlFor="login-uid">
                      Free Fire UID
                    </label>
                    <div className="relative">
                      <Gamepad className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" size={16} />
                      <input
                        id="login-uid"
                        type="text"
                        required
                        value={freeFireUid}
                        onChange={(event) => setFreeFireUid(event.target.value)}
                        placeholder="e.g. 1928374650"
                        className="field h-11 pl-10"
                        autoComplete="username"
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-ink-subtle">
                      Use the UID registered with ELITE ಕನ್ನಡಿಗ.
                    </p>
                  </div>
                )}

                {authMode === 'register' && (
                  <>
                    <div>
                      <label className="label mb-1.5 block" htmlFor="register-uid">
                        Free Fire UID
                      </label>
                      <div className="relative">
                        <Gamepad className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" size={16} />
                        <input
                          id="register-uid"
                          type="text"
                          required
                          value={freeFireUid}
                          onChange={(event) => setFreeFireUid(event.target.value)}
                          placeholder="e.g. 1928374650"
                          className="field h-11 pl-10"
                          autoComplete="username"
                        />
                      </div>
                      <p className="mt-1.5 text-xs text-ink-subtle">
                        This becomes your unique player identity.
                      </p>
                    </div>

                    <div>
                      <label className="label mb-1.5 block" htmlFor="register-ign">
                        Player name (IGN)
                      </label>
                      <div className="relative">
                        <User className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" size={16} />
                        <input
                          id="register-ign"
                          type="text"
                          required
                          value={ign}
                          onChange={(event) => setIgn(event.target.value)}
                          placeholder="e.g. ELITE_RAHUL"
                          className="field h-11 pl-10"
                          autoComplete="nickname"
                        />
                      </div>
                      <p className="mt-1.5 text-xs text-ink-subtle">
                        Shown on leaderboards and guild rosters.
                      </p>
                    </div>
                  </>
                )}

                {authMode === 'admin_login' && (
                  <>
                    <div>
                      <label className="label mb-1.5 block" htmlFor="admin-email">
                        Admin email
                      </label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" size={16} />
                        <input
                          id="admin-email"
                          type="email"
                          required
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          placeholder="admin@elitekannadiga.com"
                          className="field h-11 pl-10"
                          autoComplete="email"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="label mb-1.5 block" htmlFor="admin-password">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" size={16} />
                        <input
                          id="admin-password"
                          type="password"
                          required
                          minLength={6}
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          placeholder="••••••••"
                          className="field h-11 pl-10"
                          autoComplete="current-password"
                        />
                      </div>
                    </div>
                  </>
                )}

                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading
                    ? 'Verifying...'
                    : authMode === 'register'
                      ? 'Create account'
                      : authMode === 'admin_login'
                        ? 'Login as admin'
                        : 'Login'}
                </button>
              </form>

              <div className="mt-5 border-t border-line-subtle pt-4 text-center">
                {authMode === 'register' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('player_login')
                      setErrorMsg('')
                      setSuccessMsg('')
                    }}
                    className="text-xs font-medium text-ink-muted transition-colors hover:text-brand-bright"
                  >
                    Already registered?{' '}
                    <span className="font-semibold text-brand-bright underline">
                      Login with UID
                    </span>
                  </button>
                ) : authMode === 'player_login' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('register')
                      setErrorMsg('')
                      setSuccessMsg('')
                    }}
                    className="text-xs font-medium text-ink-muted transition-colors hover:text-brand-bright"
                  >
                    New player?{' '}
                    <span className="font-semibold text-brand-bright underline">
                      Create an account
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('player_login')
                      setErrorMsg('')
                      setSuccessMsg('')
                    }}
                    className="text-xs font-medium text-ink-muted transition-colors hover:text-brand-bright"
                  >
                    Return to{' '}
                    <span className="font-semibold text-brand-bright underline">
                      player login
                    </span>
                  </button>
                )}
              </div>
            </div>

            <p className="mt-4 text-center text-xs leading-relaxed text-ink-subtle">
              By continuing you agree to the{' '}
              <a href="/terms" className="text-ink-muted underline hover:text-brand-bright">
                terms of service
              </a>{' '}
              and{' '}
              <a href="/privacy" className="text-ink-muted underline hover:text-brand-bright">
                privacy policy
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
