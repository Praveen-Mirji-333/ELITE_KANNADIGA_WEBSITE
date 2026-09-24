import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Terms of Service | ELITE ಕನ್ನಡಿಗ',
  description: 'Terms of Service and Fair Play rules for ELITE ಕನ್ನಡಿಗ',
}

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-[#f5f5f5] px-4 sm:px-6 py-12 sm:py-20 max-w-4xl 2xl:max-w-5xl mx-auto">
      <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold text-red-500 hover:text-white mb-6 sm:mb-8">
        <ArrowLeft size={16} /> RETURN TO ARENA
      </Link>
      <h1 className="font-display text-3xl sm:text-5xl font-black uppercase text-white mb-6">TERMS OF SERVICE</h1>
      <div className="space-y-6 text-sm text-white/70 leading-relaxed border-t border-white/10 pt-6">
        <p>
          By participating in <strong>ELITE ಕನ್ನಡಿಗ</strong> tournaments, custom rooms, and leaderboards, you agree to follow our Terms of Service and Anti-Cheat Rules.
        </p>
        <h2 className="font-display text-lg font-bold text-white uppercase">1. Fair Play & Anti-Cheat Policy</h2>
        <p>
          Third-party hacks, scripts, macros, emulator exploits, or teaming in solo tournaments are strictly prohibited. Violators will face an immediate ban and forfeiture of all XP and tournament rewards.
        </p>
        <h2 className="font-display text-lg font-bold text-white uppercase">2. Tournament Eligibility</h2>
        <p>
          Players must submit accurate Free Fire UIDs to claim prize pools. Placement disputes are reviewed exclusively by official ELITE Kannada tournament moderators.
        </p>
      </div>
    </main>
  )
}
