import { Mail, MessageSquare } from 'lucide-react'
import { LegalPage } from '../../components/layout/LegalPage'

export const metadata = {
  title: 'Contact Support | ELITE ಕನ್ನಡಿಗ',
  description: 'Get in touch with ELITE ಕನ್ನಡಿಗ community administrators',
}

export default function ContactPage() {
  return (
    <LegalPage
      kicker="Support"
      title="Contact & support"
      description="For tournament inquiries, sponsorships, account issues, or general community support, use one of the channels below."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card p-5 sm:p-6">
          <span className="grid h-10 w-10 place-items-center rounded-lg border border-line bg-surface-2 text-brand-bright">
            <Mail size={19} />
          </span>
          <h2 className="!mt-4 text-base font-semibold text-ink">Email support</h2>
          <p className="text-sm text-ink-muted">
            Best for tournament inquiries, sponsorship, and account issues.
          </p>
          <a
            href="mailto:support@elitekannadiga.com"
            className="mt-4 inline-block text-sm font-semibold text-brand-bright hover:underline"
          >
            support@elitekannadiga.com
          </a>
        </div>

        <div className="card p-5 sm:p-6">
          <span className="grid h-10 w-10 place-items-center rounded-lg border border-line bg-surface-2 text-brand-bright">
            <MessageSquare size={19} />
          </span>
          <h2 className="!mt-4 text-base font-semibold text-ink">Community Discord</h2>
          <p className="text-sm text-ink-muted">
            Join the live player chat for quick questions and match coordination.
          </p>
          <span className="mt-4 inline-block text-sm font-semibold text-ink">
            ELITE ಕನ್ನಡಿಗ Official
          </span>
        </div>
      </div>
    </LegalPage>
  )
}
