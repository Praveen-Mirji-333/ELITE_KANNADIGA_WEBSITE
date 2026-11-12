'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, Shield, X, Lock, Mail, Gamepad } from 'lucide-react'
import {
  getUserProfile,
  registerWithEmailPasswordUid,
  loginWithEmailAndPassword,
} from '../../lib/supabase'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (role: 'admin' | 'user') => void
  forceLock?: boolean
}

export function AuthModal({ isOpen, onClose, onSuccess, forceLock = false }: AuthModalProps) {
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [freeFireUid, setFreeFireUid] = useState('')

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
        const res = await registerWithEmailPasswordUid({
          email,
          password,
          freeFireUid,
        })
        if (!res.success || !res.profile) {
          throw new Error(res.error || 'Registration failed.')
        }

        setSuccessMsg(
          `Welcome to ELITE Kannada! Email & UID ${res.profile.free_fire_uid || freeFireUid} bound successfully. Entering Arena...`
        )
        setTimeout(() => {
          onSuccess(res.role === 'admin' ? 'admin' : 'user')
          if (!forceLock) onClose()
        }, 1100)
      } else {
        const res = await loginWithEmailAndPassword(email, password)
        if (!res.success || !res.profile) {
          throw new Error(res.error || 'Login failed.')
        }

        const role = res.role === 'admin' ? 'admin' : 'user'
        setSuccessMsg(
          role === 'admin'
            ? 'Welcome Administrator! Entering Control Center...'
            : `Welcome back, ${res.profile.ign || 'Player'}! Entering Arena Dashboard...`
        )

        setTimeout(() => {
          onSuccess(role)
          if (!forceLock) onClose()
        }, 1000)
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please verify your inputs.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto neu-theme ${
        forceLock ? 'bg-canvas/95 backdrop-blur-2xl' : 'bg-black/40 backdrop-blur-md'
      }`}
    >
      {forceLock && (
        <>
          <div className="absolute top-[10%] left-[20%] h-80 w-80 rounded-full bg-brand/10 blur-[130px] pointer-events-none" />
          <div className="absolute bottom-[10%] right-[20%] h-80 w-80 rounded-full bg-brand-muted blur-[130px] pointer-events-none" />
        </>
      )}

      <div className="relative my-auto w-full max-w-md modal-panel p-5 sm:p-7 max-h-[94vh] overflow-y-auto no-scrollbar">
        {!forceLock && (
          <button
            onClick={onClose}
            className="neu-circle absolute right-4 top-4 h-8 w-8 text-ink-muted hover:text-ink transition"
            aria-label="Close authentication modal"
          >
            <X size={16} />
          </button>
        )}

        {/* Branding Header */}
        <div className="mb-5 sm:mb-6 text-center">
          <div className="mx-auto mb-3 h-14 w-14 sm:h-16 sm:w-16 rounded-full neu-circle p-1 shadow-md bg-canvas flex items-center justify-center">
            <img src="/logo.png" alt="ELITE Kannada" className="h-full w-full rounded-full object-cover" />
          </div>

          <p className="text-[11px] sm:text-xs font-extrabold uppercase tracking-widest text-brand-bright flex items-center justify-center gap-1.5">
            <Shield size={13} /> {forceLock ? 'ACCESS RESTRICTED • LOGIN REQUIRED' : 'ELITE KANNADA ARENA'}
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold uppercase text-ink tracking-tight mt-1">
            ELITE <span className="text-brand">ಕನ್ನಡಿಗ</span>
          </h2>
          <p className="mt-1 text-xs text-ink-muted max-w-xs mx-auto">
            {forceLock
              ? 'Please log in with your Email & Password or register with Email, Password & UID.'
              : 'Join the premier Free Fire competitive community in Karnataka.'}
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="mb-5 grid grid-cols-2 neu-tabs w-full p-1 gap-1">
          <button
            type="button"
            onClick={() => {
              setAuthMode('register')
              setErrorMsg('')
              setSuccessMsg('')
            }}
            className={`py-2 text-[11px] sm:text-xs font-bold tracking-wider uppercase rounded-full transition ${
              authMode === 'register'
                ? 'neu-tab-btn active text-white'
                : 'neu-tab-btn text-ink-muted hover:text-ink'
            }`}
          >
            REGISTER
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('login')
              setErrorMsg('')
              setSuccessMsg('')
            }}
            className={`py-2 text-[11px] sm:text-xs font-bold tracking-wider uppercase rounded-full transition ${
              authMode === 'login'
                ? 'neu-tab-btn active text-white'
                : 'neu-tab-btn text-ink-muted hover:text-ink'
            }`}
          >
            LOGIN
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 border border-brand bg-brand-muted p-3 text-xs text-brand-bright">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 flex items-center gap-2 border border-line-strong bg-surface-3 p-3 text-xs text-ink">
            <CheckCircle2 size={16} />
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold tracking-widest text-ink-muted">
              EMAIL ADDRESS *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-ink-subtle" size={16} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="player@example.com"
                autoComplete="email"
                className="w-full border border-line bg-surface-2 py-2.5 pl-10 pr-4 text-base sm:text-sm text-ink placeholder-ink-subtle focus:border-brand focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold tracking-widest text-ink-muted">
              PASSWORD *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-ink-subtle" size={16} />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
                className="w-full border border-line bg-surface-2 py-2.5 pl-10 pr-4 text-base sm:text-sm text-ink placeholder-ink-subtle focus:border-brand focus:outline-none"
              />
            </div>
          </div>

          {authMode === 'register' && (
            <div>
              <label className="mb-1 block text-xs font-bold tracking-widest text-ink-muted">
                FREE FIRE GAME UID *
              </label>
              <div className="relative">
                <Gamepad className="absolute left-3 top-3 text-ink-subtle" size={16} />
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={freeFireUid}
                  onChange={(e) => setFreeFireUid(e.target.value.replace(/\s+/g, ''))}
                  placeholder="e.g. 1928374650"
                  className="w-full border border-line bg-surface-2 py-2.5 pl-10 pr-4 text-base sm:text-sm text-ink placeholder-ink-subtle focus:border-brand focus:outline-none"
                />
              </div>
              <p className="mt-1 text-xs text-ink-subtle">
                Unique UID permanently bound to your email address after registration.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full bg-brand py-3.5 font-display text-xs font-extrabold tracking-widest text-ink transition hover:bg-brand disabled:opacity-50 uppercase shadow-lg shadow-brand/20"
          >
            {loading
              ? 'VERIFYING CREDENTIALS...'
              : authMode === 'register'
                ? 'REGISTER & BIND EMAIL + UID'
                : 'LOGIN TO ARENA'}
          </button>
        </form>

        <div className="mt-5 border-t border-line-subtle pt-4 text-center">
          {authMode === 'register' ? (
            <button
              type="button"
              onClick={() => {
                setAuthMode('login')
                setErrorMsg('')
                setSuccessMsg('')
              }}
              className="text-xs font-bold tracking-wider text-ink-muted hover:text-brand-bright transition"
            >
              ALREADY REGISTERED? <span className="text-brand-bright underline">LOGIN WITH EMAIL</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setAuthMode('register')
                setErrorMsg('')
                setSuccessMsg('')
              }}
              className="text-xs font-bold tracking-wider text-ink-muted hover:text-brand-bright transition"
            >
              NEW PLAYER? <span className="text-brand-bright underline">REGISTER WITH EMAIL &amp; UID</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
