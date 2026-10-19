'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, Shield, X, Lock, Mail, User, Gamepad, Sparkles } from 'lucide-react'
import {
  supabase,
  getUserProfile,
  registerPlayerWithUid,
  loginPlayerWithUid,
} from '../../lib/supabase'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (role: 'admin' | 'user') => void
  forceLock?: boolean
}

export function AuthModal({ isOpen, onClose, onSuccess, forceLock = false }: AuthModalProps) {
  const [authMode, setAuthMode] = useState<'register' | 'player_login' | 'admin_login'>('register')

  // Registration & Player Login state
  const [freeFireUid, setFreeFireUid] = useState('')
  const [ign, setIgn] = useState('')

  // Admin Login state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('')
      setSuccessMsg('')
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')
    setLoading(true)

    try {
      if (authMode === 'register') {
        // Player Registration using Game UID and Player Name
        const res = await registerPlayerWithUid(freeFireUid, ign)
        if (!res.success || !res.profile) {
          throw new Error(res.error || 'Registration failed.')
        }

        setSuccessMsg(
          `Welcome to ELITE Kannada, ${res.profile.ign || ign}! Account created successfully. Entering Arena...`
        )
        setTimeout(() => {
          onSuccess(res.role === 'admin' ? 'admin' : 'user')
          if (!forceLock) onClose()
        }, 1100)
      } else if (authMode === 'admin_login') {
        // Admin Login using Email & Password
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error

        const profile = await getUserProfile(data.user.id)
        const role = profile?.role === 'admin' ? 'admin' : 'user'

        setSuccessMsg(
          role === 'admin'
            ? 'Welcome Administrator! Entering Control Center...'
            : 'Logged in successfully! Opening Player Dashboard...'
        )

        setTimeout(() => {
          onSuccess(role)
          if (!forceLock) onClose()
        }, 1000)
      } else {
        // Player Login using ONLY Game UID
        const res = await loginPlayerWithUid(freeFireUid)
        if (!res.success || !res.profile) {
          throw new Error(res.error || 'Login failed.')
        }

        setSuccessMsg(`Welcome back, ${res.profile.ign || 'Player'}! Entering Arena Dashboard...`)
        setTimeout(() => {
          onSuccess(res.role === 'admin' ? 'admin' : 'user')
          if (!forceLock) onClose()
        }, 1000)
      }
    } catch (err: any) {
      const msg = err.message || ''
      if (msg.toLowerCase().includes('invalid login credentials')) {
        setErrorMsg('Invalid login details. If you are a new player, click "REGISTER AS NEW PLAYER" above.')
      } else {
        setErrorMsg(msg || 'Authentication failed. Please verify your inputs.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto ${
        forceLock ? 'bg-[#050505]/95 backdrop-blur-2xl' : 'bg-black/85 backdrop-blur-md'
      }`}
    >
      {/* Background Ambience */}
      {forceLock && (
        <>
          <div className="absolute top-[10%] left-[20%] h-80 w-80 rounded-full bg-red-600/10 blur-[130px] pointer-events-none" />
          <div className="absolute bottom-[10%] right-[20%] h-80 w-80 rounded-full bg-red-900/15 blur-[130px] pointer-events-none" />
        </>
      )}

      <div className="relative my-auto w-full max-w-md border border-red-800/60 bg-[#0c0c0e] p-5 sm:p-7 shadow-2xl max-h-[94vh] overflow-y-auto no-scrollbar rounded-none">
        {!forceLock && (
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-white/60 hover:text-white transition"
          >
            <X size={20} />
          </button>
        )}

        {/* Branding Header */}
        <div className="mb-5 sm:mb-6 text-center">
          <div className="mx-auto mb-3 h-14 w-14 sm:h-16 sm:w-16 rounded-full border-2 border-red-600/60 p-1 shadow-lg bg-black flex items-center justify-center">
            <img src="/logo.png" alt="ELITE Kannada" className="h-full w-full rounded-full object-cover" />
          </div>

          <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-red-500 flex items-center justify-center gap-1.5">
            <Shield size={13} /> {forceLock ? 'ACCESS RESTRICTED • LOGIN REQUIRED' : 'ELITE KANNADA ARENA'}
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-black uppercase text-white tracking-tight mt-1">
            ELITE <span className="text-metallic">ಕನ್ನಡಿಗ</span>
          </h2>
          <p className="mt-1 text-xs text-white/60 max-w-xs mx-auto">
            {forceLock
              ? 'Please log in or register your player account to enter the arena and view your User Dashboard.'
              : 'Join the premier Free Fire competitive community in Karnataka.'}
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="mb-5 grid grid-cols-3 border border-white/10 bg-white/5 p-1 gap-1">
          <button
            type="button"
            onClick={() => {
              setAuthMode('register')
              setErrorMsg('')
              setSuccessMsg('')
            }}
            className={`py-2 text-[10px] sm:text-[11px] font-black tracking-wider uppercase transition ${
              authMode === 'register'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-white/60 hover:text-white'
            }`}
          >
            REGISTER
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('player_login')
              setErrorMsg('')
              setSuccessMsg('')
            }}
            className={`py-2 text-[10px] sm:text-[11px] font-black tracking-wider uppercase transition ${
              authMode === 'player_login'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-white/60 hover:text-white'
            }`}
          >
            LOGIN (UID)
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
                ? 'bg-red-600 text-white shadow-md'
                : 'text-white/60 hover:text-white'
            }`}
          >
            ADMIN
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 border border-red-600/40 bg-red-950/40 p-3 text-xs text-red-400">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 flex items-center gap-2 border border-emerald-500/40 bg-emerald-950/40 p-3 text-xs text-emerald-400">
            <CheckCircle2 size={16} />
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* PLAYER REGISTRATION VIEW */}
          {authMode === 'register' && (
            <>
              <div>
                <label className="mb-1 block text-[10px] font-bold tracking-widest text-white/60">
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
                    className="w-full border border-white/15 bg-white/5 py-2.5 pl-10 pr-4 text-base sm:text-sm text-white placeholder-white/30 focus:border-red-500 focus:outline-none"
                  />
                </div>
                <p className="mt-1 text-[9px] text-white/40">
                  Your Free Fire in-game UID is used as your unique player login key.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold tracking-widest text-white/60">
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
                    className="w-full border border-white/15 bg-white/5 py-2.5 pl-10 pr-4 text-base sm:text-sm text-white placeholder-white/30 focus:border-red-500 focus:outline-none"
                  />
                </div>
                <p className="mt-1 text-[9px] text-white/40">
                  Your official In-Game Name as shown in Free Fire.
                </p>
              </div>
            </>
          )}

          {/* PLAYER LOGIN VIEW (UID ONLY) */}
          {authMode === 'player_login' && (
            <div>
              <label className="mb-1 block text-[10px] font-bold tracking-widest text-white/60">
                ENTER YOUR FREE FIRE GAME UID *
              </label>
              <div className="relative">
                <Gamepad className="absolute left-3 top-3 text-white/40" size={16} />
                <input
                  type="text"
                  required
                  value={freeFireUid}
                  onChange={(e) => setFreeFireUid(e.target.value)}
                  placeholder="e.g. 1928374650"
                  className="w-full border border-white/15 bg-white/5 py-2.5 pl-10 pr-4 text-base sm:text-sm text-white placeholder-white/30 focus:border-red-500 focus:outline-none"
                />
              </div>
              <p className="mt-1.5 text-[10px] text-white/40">
                Enter your registered Free Fire UID to open your User Dashboard immediately.
              </p>
            </div>
          )}

          {/* ADMIN LOGIN VIEW (EMAIL & PASSWORD) */}
          {authMode === 'admin_login' && (
            <>
              <div>
                <label className="mb-1 block text-[10px] font-bold tracking-widest text-white/60">
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
                    className="w-full border border-white/15 bg-white/5 py-2.5 pl-10 pr-4 text-base sm:text-sm text-white placeholder-white/30 focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold tracking-widest text-white/60">
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
                    className="w-full border border-white/15 bg-white/5 py-2.5 pl-10 pr-4 text-base sm:text-sm text-white placeholder-white/30 focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full bg-red-600 py-3.5 font-display text-xs font-black tracking-widest text-white transition hover:bg-red-500 disabled:opacity-50 uppercase shadow-lg shadow-red-900/40"
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

        <div className="mt-5 border-t border-white/10 pt-4 text-center">
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
