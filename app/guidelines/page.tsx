import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Community Guidelines | ELITE ಕನ್ನಡಿಗ',
  description: 'Esports Community Guidelines for ELITE ಕನ್ನಡಿಗ',
}

export default function GuidelinesPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-[#f5f5f5] px-6 py-16 max-w-4xl mx-auto">
      <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold text-red-500 hover:text-white mb-8">
        <ArrowLeft size={16} /> RETURN TO ARENA
      </Link>
      <h1 className="font-display text-4xl font-black uppercase text-white mb-6">COMMUNITY GUIDELINES</h1>
      <div className="space-y-6 text-sm text-white/70 leading-relaxed border-t border-white/10 pt-6">
        <p>
          ELITE ಕನ್ನಡಿಗ is built on respect, sportsmanship, and competitive excellence.
        </p>
        <h2 className="font-display text-lg font-bold text-white uppercase">1. Respect All Gamers</h2>
        <p>
          Harassment, hate speech, or toxicity in community chats, livestreams, or clips will result in account suspension.
        </p>
        <h2 className="font-display text-lg font-bold text-white uppercase">2. Clip Submission Guidelines</h2>
        <p>
          Submitted community clips must be genuine gameplay clutches recorded by the player. Spamming duplicates or offensive content will lead to clip ban.
        </p>
      </div>
    </main>
  )
}
