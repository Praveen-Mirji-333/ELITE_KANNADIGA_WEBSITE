import { LegalPage } from '../../components/layout/LegalPage'

export const metadata = {
  title: 'Community Guidelines | ELITE ಕನ್ನಡಿಗ',
  description: 'Esports Community Guidelines for ELITE ಕನ್ನಡಿಗ',
}

export default function GuidelinesPage() {
  return (
    <LegalPage
      kicker="Community"
      title="Community guidelines"
      description="ELITE ಕನ್ನಡಿಗ runs on three rules: respect your opponents, play clean, and report disputes through official channels."
    >
      <p>
        These guidelines apply to all community spaces, including match rooms,
        livestreams, Discord, and submitted clips.
      </p>

      <h2>1. Respect every gamer</h2>
      <p>
        Harassment, hate speech, threats, or sustained toxicity in community
        chats, livestreams, or clips will result in account suspension.
      </p>

      <h2>2. Clip submission guidelines</h2>
      <p>
        Submitted clips must be genuine gameplay recorded by the player. Spamming
        duplicates or posting offensive content may lead to a clip ban.
      </p>

      <h2>3. Match conduct</h2>
      <p>
        Follow moderator instructions, join rooms on time, and report disputes
        through official channels instead of in public chat.
      </p>
    </LegalPage>
  )
}
