import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Privacy Policy | ELITE ಕನ್ನಡಿಗ',
  description: 'Privacy Policy for ELITE ಕನ್ನಡಿಗ Gaming Community',
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-[#f5f5f5] px-6 py-16 max-w-4xl mx-auto">
      <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold text-red-500 hover:text-white mb-8">
        <ArrowLeft size={16} /> RETURN TO ARENA
      </Link>
      <h1 className="font-display text-4xl font-black uppercase text-white mb-6">PRIVACY POLICY</h1>
      <div className="space-y-6 text-sm text-white/70 leading-relaxed border-t border-white/10 pt-6">
        <p>
          Welcome to <strong>ELITE ಕನ್ನಡಿಗ</strong>. Your privacy is paramount to our gaming community. This policy details how we collect, protect, and handle player data.
        </p>
        <h2 className="font-display text-lg font-bold text-white uppercase">1. Information We Collect</h2>
        <p>
          We collect basic gaming profile information such as player IGN, Free Fire UID, username, avatar preferences, and tournament participation history to maintain community leaderboards and tournament brackets.
        </p>
        <h2 className="font-display text-lg font-bold text-white uppercase">2. Security & Database Protection</h2>
        <p>
          Your authentication credentials and database transactions are secured using Supabase Row Level Security (RLS). We never share or sell personal data to third parties.
        </p>
        <h2 className="font-display text-lg font-bold text-white uppercase">3. Community Guidelines & Cookies</h2>
        <p>
          We use session cookies solely to preserve your authenticated state across community sessions.
        </p>
      </div>
    </main>
  )
}
