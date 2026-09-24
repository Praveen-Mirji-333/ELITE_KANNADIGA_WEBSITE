import Link from 'next/link'

const logoUrl = '/logo.png'

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#050505] px-5 py-12 lg:px-10">
      <div className="mx-auto grid max-w-[1440px] gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <img
              src={logoUrl}
              alt="ELITE Kannada emblem"
              className="h-14 w-14 rounded-full"
            />
            <div>
              <p className="font-display text-xl font-black tracking-widest text-white">
                ELITE
              </p>
              <p className="text-xs font-bold text-red-500">ಕನ್ನಡಿಗ</p>
            </div>
          </div>
          <p className="mt-5 max-w-xs text-sm leading-6 text-white/40">
            Play. Compete. Dominate. The home of Karnataka&apos;s most competitive Free Fire community.
          </p>
        </div>

        <div>
          <p className="eyebrow mb-5">NAVIGATION</p>
          <Link href="/tournaments" className="mb-3 block text-sm text-white/45 transition hover:text-red-500">
            Tournaments Arena
          </Link>
          <Link href="/leaderboard" className="mb-3 block text-sm text-white/45 transition hover:text-red-500">
            Leaderboard Rankings
          </Link>
          <Link href="/live" className="mb-3 block text-sm text-white/45 transition hover:text-red-500">
            Live Arena
          </Link>
          <Link href="/guilds" className="mb-3 block text-sm text-white/45 transition hover:text-red-500">
            Guild Wars
          </Link>
          <Link href="/achievements" className="mb-3 block text-sm text-white/45 transition hover:text-red-500">
            Hall of Fame
          </Link>
        </div>

        <div>
          <p className="eyebrow mb-5">LEGAL & SAFETY</p>
          <Link href="/privacy" className="mb-3 block text-sm text-white/45 transition hover:text-red-500">
            Privacy Policy
          </Link>
          <Link href="/terms" className="mb-3 block text-sm text-white/45 transition hover:text-red-500">
            Terms of Service
          </Link>
          <Link href="/guidelines" className="mb-3 block text-sm text-white/45 transition hover:text-red-500">
            Community Guidelines
          </Link>
        </div>

        <div>
          <p className="eyebrow mb-5">CONNECT</p>
          <Link href="/contact" className="mb-3 block text-sm text-white/45 transition hover:text-red-500">
            Contact Support
          </Link>
        </div>
      </div>

      <div className="mx-auto mt-12 flex max-w-[1440px] flex-col justify-between gap-3 border-t border-white/10 pt-5 text-[10px] font-bold tracking-widest text-white/25 sm:flex-row">
        <span>© 2026 ELITE ಕನ್ನಡಿಗ. ALL RIGHTS RESERVED.</span>
        <span>POWERED BY NEXT.JS & SUPABASE DATABASE</span>
      </div>
    </footer>
  )
}
