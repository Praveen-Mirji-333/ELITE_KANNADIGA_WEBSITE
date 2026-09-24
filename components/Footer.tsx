import Link from 'next/link'

const logoUrl = '/logo.png'

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#050505] px-4 sm:px-6 lg:px-10 py-12 sm:py-16 2xl:py-20">
      <div className="site-container grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr] 2xl:grid-cols-[1.8fr_1fr_1fr_1fr] gap-8 sm:gap-10 2xl:gap-16">
        <div className="sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-3">
            <img
              src={logoUrl}
              alt="ELITE Kannada emblem"
              className="h-12 w-12 sm:h-14 sm:w-14 rounded-full shrink-0"
            />
            <div>
              <p className="font-display text-xl sm:text-2xl font-black tracking-widest text-white">
                ELITE
              </p>
              <p className="text-xs sm:text-sm font-bold text-red-500">ಕನ್ನಡಿಗ</p>
            </div>
          </div>
          <p className="mt-4 sm:mt-5 max-w-sm text-xs sm:text-sm leading-relaxed text-white/40">
            Play. Compete. Dominate. The home of Karnataka&apos;s most competitive Free Fire community.
          </p>
        </div>

        <div>
          <p className="eyebrow mb-4 sm:mb-5">NAVIGATION</p>
          <div className="space-y-2.5 sm:space-y-3">
            <Link href="/tournaments" className="block text-xs sm:text-sm text-white/45 transition hover:text-red-500">
              Tournaments Arena
            </Link>
            <Link href="/leaderboard" className="block text-xs sm:text-sm text-white/45 transition hover:text-red-500">
              Leaderboard Rankings
            </Link>
            <Link href="/live" className="block text-xs sm:text-sm text-white/45 transition hover:text-red-500">
              Live Arena
            </Link>
            <Link href="/guilds" className="block text-xs sm:text-sm text-white/45 transition hover:text-red-500">
              Guild Wars
            </Link>
            <Link href="/achievements" className="block text-xs sm:text-sm text-white/45 transition hover:text-red-500">
              Hall of Fame
            </Link>
          </div>
        </div>

        <div>
          <p className="eyebrow mb-4 sm:mb-5">LEGAL & SAFETY</p>
          <div className="space-y-2.5 sm:space-y-3">
            <Link href="/privacy" className="block text-xs sm:text-sm text-white/45 transition hover:text-red-500">
              Privacy Policy
            </Link>
            <Link href="/terms" className="block text-xs sm:text-sm text-white/45 transition hover:text-red-500">
              Terms of Service
            </Link>
            <Link href="/guidelines" className="block text-xs sm:text-sm text-white/45 transition hover:text-red-500">
              Community Guidelines
            </Link>
          </div>
        </div>

        <div>
          <p className="eyebrow mb-4 sm:mb-5">CONNECT</p>
          <div className="space-y-2.5 sm:space-y-3">
            <Link href="/contact" className="block text-xs sm:text-sm text-white/45 transition hover:text-red-500">
              Contact Support
            </Link>
          </div>
        </div>
      </div>

      <div className="site-container mt-10 sm:mt-14 flex flex-col sm:flex-row justify-between items-center gap-3 border-t border-white/10 pt-6 text-[10px] sm:text-xs font-bold tracking-widest text-white/30 text-center sm:text-left">
        <span>© 2026 ELITE ಕನ್ನಡಿಗ. ALL RIGHTS RESERVED.</span>
        <span>POWERED BY NEXT.JS & SUPABASE DATABASE</span>
      </div>
    </footer>
  )
}
