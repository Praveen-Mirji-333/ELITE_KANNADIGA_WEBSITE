'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, Shield, X, Lock, Mail, User, Gamepad } from 'lucide-react'
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
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(true)
  const [isAdminLogin, setIsAdminLogin] = useState(false)

  // Registration & Player Login state
  const [freeFireUid, setFreeFireUid] = useState('')
  const [ign, setIgn] = useState('')

  // Admin Login state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // When modal opens, default to Registration mode for unregistered / logged out users
  useEffect(() => {
    if (isOpen) {
      setIsSignUp(true)
      setIsAdminLogin(false)
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
      if (isSignUp) {
        // Player Registration using Game UID and Player Name
        const res = await registerPlayerWithUid(freeFireUid, ign)
        if (!res.success || !res.profile) {
          throw new Error(res.error || 'Registration failed.')
        }

        setSuccessMsg(
          `Welcome to ELITE Kannada, ${res.profile.ign || ign}! Account registered successfully.`
        )
        setTimeout(() => {
          onSuccess(res.role === 'admin' ? 'admin' : 'user')
          onClose()
        }, 1200)
      } else if (isAdminLogin) {
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
            ? 'Welcome Admin! Opening Control Center...'
            : 'Logged in successfully! Opening Player Dashboard...'
        )

        setTimeout(() => {
          onSuccess(role)
          onClose()
        }, 1000)
      } else {
        // Player Login using ONLY Game UID
        const res = await loginPlayerWithUid(freeFireUid)
        if (!res.success || !res.profile) {
          throw new Error(res.error || 'Login failed.')
        }

        setSuccessMsg(`Welcome back, ${res.profile.ign || 'Player'}! Logged in successfully.`)
        setTimeout(() => {
          onSuccess(res.role === 'admin' ? 'admin' : 'user')
          onClose()
        }, 1000)
      }
    } catch (err: any) {
      const msg = err.message || ''
      if (msg.toLowerCase().includes('invalid login credentials')) {
        setErrorMsg('Invalid login details. If you are a new player, click "CREATE PLAYER ACCOUNT" below.')
      } else {
        setErrorMsg(msg || 'Authentication failed. Please check your inputs.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-md border border-red-800/60 bg-[#0c0c0e] p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-white/60 hover:text-white"
        >
          <X size={20} />
        </button>

        <div className="mb-6 flex items-center gap-3">
          <Shield className="text-red-500" size={32} />
          <div>
            <h3 className="font-display text-2xl font-black uppercase text-white">
              {isSignUp
                ? 'PLAYER REGISTRATION'
                : isAdminLogin
                  ? 'ADMIN LOGIN'
                  : 'PLAYER LOGIN'}
            </h3>
            <p className="text-[10px] font-bold tracking-widest text-red-500">
              {isSignUp
                ? 'REGISTER WITH GAME UID & PLAYER NAME'
                : isAdminLogin
                  ? 'ADMINISTRATOR AUTHENTICATION'
                  : 'ENTER YOUR GAME UID TO LOGIN'}
            </p>
          </div>
        </div>

        {/* Mode switcher tabs for Login */}
        {!isSignUp && (
          <div className="mb-5 flex border border-white/10 bg-white/5 p-1">
            <button
              type="button"
              onClick={() => {
                setIsAdminLogin(false)
                setErrorMsg('')
                setSuccessMsg('')
              }}
              className={`flex-1 py-1.5 text-[11px] font-bold tracking-wider transition ${!isAdminLogin
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-white/60 hover:text-white'
                }`}
            >
              PLAYER LOGIN (UID)
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAdminLogin(true)
                setErrorMsg('')
                setSuccessMsg('')
              }}
              className={`flex-1 py-1.5 text-[11px] font-bold tracking-wider transition ${isAdminLogin
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-white/60 hover:text-white'
                }`}
            >
              ADMIN LOGIN
            </button>
          </div>
        )}

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
          {isSignUp && (
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
                    className="w-full border border-white/15 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/30 focus:border-red-500 focus:outline-none"
                  />
                </div>
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
                    className="w-full border border-white/15 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/30 focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>
            </>
          )}

          {/* PLAYER LOGIN VIEW (UID ONLY) */}
          {!isSignUp && !isAdminLogin && (
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
                  placeholder="Enter your Free Fire UID (e.g. 1928374650)"
                  className="w-full border border-white/15 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/30 focus:border-red-500 focus:outline-none"
                />
              </div>
              <p className="mt-1.5 text-[10px] text-white/40">
                Enter your Game UID to access your account instantly without a password.
              </p>
            </div>
          )}

          {/* ADMIN LOGIN VIEW (EMAIL & PASSWORD) */}
          {!isSignUp && isAdminLogin && (
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
                    className="w-full border border-white/15 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/30 focus:border-red-500 focus:outline-none"
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
                    className="w-full border border-white/15 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/30 focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full bg-red-600 py-3 font-display text-xs font-black tracking-widest text-white transition hover:bg-red-500 disabled:opacity-50"
          >
            {loading
              ? 'VERIFYING CREDENTIALS...'
              : isSignUp
                ? 'JOIN AS PLAYER'
                : isAdminLogin
                  ? 'LOGIN AS ADMIN'
                  : 'LOGIN WITH UID'}
          </button>
        </form>

        <div className="mt-6 border-t border-white/10 pt-4 text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp)
              setIsAdminLogin(false)
              setErrorMsg('')
              setSuccessMsg('')
            }}
            className="text-xs font-bold tracking-widest text-white/60 hover:text-red-400"
          >
            {isSignUp
              ? 'ALREADY HAVE AN ACCOUNT? LOGIN WITH UID'
              : 'NEW PLAYER? CREATE PLAYER ACCOUNT'}
          </button>
        </div>
      </div>
    </div>
  )
}
