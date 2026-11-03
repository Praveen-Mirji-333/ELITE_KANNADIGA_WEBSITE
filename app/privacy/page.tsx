import { LegalPage } from '../../components/layout/LegalPage'

export const metadata = {
  title: 'Privacy Policy | ELITE ಕನ್ನಡಿಗ',
  description: 'Privacy Policy for ELITE ಕನ್ನಡಿಗ Gaming Community',
}

export default function PrivacyPage() {
  return (
    <LegalPage
      kicker="Privacy"
      title="Privacy policy"
      description="How ELITE ಕನ್ನಡಿಗ collects, protects, and handles player data."
    >
      <p>
        Welcome to <strong>ELITE ಕನ್ನಡಿಗ</strong>. Your privacy is important to
        our community. This policy explains what we collect, why we collect it,
        and how it is protected.
      </p>

      <h2>1. Information we collect</h2>
      <p>
        We collect basic gaming profile information such as your in-game name
        (IGN), Free Fire UID, username, avatar preference, and tournament
        participation history. This data is used to maintain leaderboards,
        verify registrations, and run tournament brackets.
      </p>

      <h2>2. Security and database protection</h2>
      <p>
        Authentication credentials and database transactions are protected with
        Supabase Row Level Security (RLS). We do not sell or share personal data
        with third parties for advertising.
      </p>

      <h2>3. Cookies and sessions</h2>
      <p>
        We use session cookies only to keep you signed in and to preserve your
        authenticated state across community sessions.
      </p>

      <h2>4. Contact</h2>
      <p>
        For privacy questions or data removal requests, contact{' '}
        <a href="mailto:support@elitekannadiga.com">
          support@elitekannadiga.com
        </a>
        .
      </p>
    </LegalPage>
  )
}
