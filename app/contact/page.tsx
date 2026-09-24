import Link from 'next/link'
import { ArrowLeft, Mail, MessageSquare, ShieldAlert } from 'lucide-react'

export const metadata = {
  title: 'Contact Support | ELITE ಕನ್ನಡಿಗ',
  description: 'Get in touch with ELITE ಕನ್ನಡಿಗ community administrators',
}

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-[#f5f5f5] px-4 sm:px-6 py-12 sm:py-20 max-w-4xl 2xl:max-w-5xl mx-auto">
      <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold text-red-500 hover:text-white mb-6 sm:mb-8">
        <ArrowLeft size={16} /> RETURN TO ARENA
      </Link>
      <h1 className="font-display text-3xl sm:text-5xl font-black uppercase text-white mb-6">CONTACT & SUPPORT</h1>
      <div className="grid gap-6 sm:grid-cols-2 border-t border-white/10 pt-8">
        <div className="border border-white/10 bg-white/5 p-6">
          <Mail className="text-red-500 mb-3" size={32} />
          <h3 className="font-display text-lg font-bold text-white uppercase">EMAIL SUPPORT</h3>
          <p className="text-xs text-white/60 mt-1 mb-4">For tournament inquiries, sponsorship, or general support.</p>
          <a href="mailto:support@elitekannadiga.com" className="text-sm font-bold text-red-400 hover:underline">
            support@elitekannadiga.com
          </a>
        </div>
        <div className="border border-white/10 bg-white/5 p-6">
          <MessageSquare className="text-red-500 mb-3" size={32} />
          <h3 className="font-display text-lg font-bold text-white uppercase">COMMUNITY DISCORD</h3>
          <p className="text-xs text-white/60 mt-1 mb-4">Join our live player chat and instant ticket system.</p>
          <span className="text-sm font-bold text-white">Discord: ELITE ಕನ್ನಡಿಗ Official</span>
        </div>
      </div>
    </main>
  )
}
