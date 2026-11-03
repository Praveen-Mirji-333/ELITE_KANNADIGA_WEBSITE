import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'
import { GlobalAuthGate } from '../components/auth/GlobalAuthGate'

export const metadata: Metadata = {
  title: {
    default: 'ELITE ಕನ್ನಡಿಗ | Karnataka Free Fire Tournaments',
    template: '%s | ELITE ಕನ್ನಡಿಗ',
  },
  description:
    'The official ELITE ಕನ್ನಡಿಗ Free Fire gaming community — tournaments, leaderboards, guild wars, and verified match results.',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#f0f0f0',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className="antialiased neu-theme">
        <GlobalAuthGate>{children}</GlobalAuthGate>
        <Analytics />
      </body>
    </html>
  )
}

