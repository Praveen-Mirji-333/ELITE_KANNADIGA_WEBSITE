import { LegalPage } from '../../components/layout/LegalPage'

export const metadata = {
  title: 'Terms of Service | ELITE ಕನ್ನಡಿಗ',
  description: 'Terms of Service and Fair Play rules for ELITE ಕನ್ನಡಿಗ',
}

export default function TermsPage() {
  return (
    <LegalPage
      kicker="Terms"
      title="Terms of service"
      description="The rules that apply when you register, compete, and use the ELITE ಕನ್ನಡಿಗ platform."
    >
      <p>
        By participating in <strong>ELITE ಕನ್ನಡಿಗ</strong> tournaments, custom
        rooms, and leaderboards, you agree to these Terms of Service and our
        anti-cheat rules.
      </p>

      <h2>1. Fair play and anti-cheat policy</h2>
      <p>
        Third-party hacks, scripts, macros, emulator exploits, and teaming in
        solo tournaments are strictly prohibited. Violations may result in an
        immediate ban and forfeiture of XP, prizes, and tournament rewards.
      </p>

      <h2>2. Tournament eligibility</h2>
      <p>
        Players must submit accurate Free Fire UIDs to claim prize pools. Placement
        disputes are reviewed exclusively by official ELITE ಕನ್ನಡಿಗ tournament
        moderators.
      </p>

      <h2>3. Account responsibility</h2>
      <p>
        You are responsible for keeping your login credentials secure and for all
        activity performed through your account.
      </p>
    </LegalPage>
  )
}
