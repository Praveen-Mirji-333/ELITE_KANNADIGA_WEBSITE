'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SitePage } from '../../components/layout/SitePage'
import { getUserProfile } from '../../lib/supabase'

export default function LoginPage() {
  const router = useRouter()

  useEffect(() => {
    async function checkUser() {
      const profile = await getUserProfile()
      if (profile) router.replace('/dashboard')
    }
    checkUser()
  }, [router])

  return (
    <SitePage>
      <div className="site-container flex min-h-[60vh] items-center justify-center py-24">
        <div className="w-full max-w-sm space-y-3 text-center">
          <div className="mx-auto h-10 w-10 animate-pulse rounded-full bg-surface-2" />
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-subtle">
            Checking your session...
          </p>
        </div>
      </div>
    </SitePage>
  )
}
