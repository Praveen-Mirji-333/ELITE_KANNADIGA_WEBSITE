'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '../../components/Navbar'
import { getUserProfile } from '../../lib/supabase'

export default function LoginPage() {
  const router = useRouter()

  useEffect(() => {
    async function checkUser() {
      const prof = await getUserProfile()
      if (prof) {
        router.push('/')
      }
    }
    checkUser()
  }, [router])

  return (
    <main className="min-h-screen bg-[#050505] text-[#f5f5f5]">
      <div className="noise" />
      <Navbar />
    </main>
  )
}
