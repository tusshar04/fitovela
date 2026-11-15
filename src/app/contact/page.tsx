import { SUPPORT_EMAIL } from '@/domain/company';
import { LegalPage } from '@/ui/Legal';

export const metadata = { title: 'Contact · Fitovela' };

export default function ContactPage() {
  return (
    <LegalPage title="Contact us">
      <p>
        Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. We reply within 2 working days, Monday to Saturday.
      </p>
      <h2>Write to us about</h2>
      <ul>
        <li>A question about your report or plan.</li>
        <li>A refund. See the <a href="/refund">Refund Policy</a>.</li>
        <li>Trouble logging in or opening your plan.</li>
        <li>A copy of your information, or having it deleted. See the <a href="/privacy">Privacy Policy</a>.</li>
      </ul>
      <p>Fitovela offers nutrition guidance and cannot give medical advice by email. If you feel unwell, see a doctor.</p>
    </LegalPage>
  );
}
