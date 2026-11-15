import { SUPPORT_EMAIL } from '@/domain/company';
import { LegalPage } from '@/ui/Legal';

export const metadata = { title: 'Privacy Policy · Fitovela' };

export default function PrivacyPage() {
  const mail = <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>;
  return (
    <LegalPage title="Privacy Policy">
      <p>Fitovela (“we”) runs fitovela.com. This page says what we collect when you use it, why, and what you can ask us to do with it. The answers you give us are about your health, so we treat them as sensitive.</p>

      <h2>What we collect</h2>
      <ul>
        <li><b>Your assessment answers:</b> your age, height, weight and goal weight; the symptoms you tick; medicines and conditions you tell us about; and your food preferences.</li>
        <li><b>Your contact details:</b> your email address and mobile number, if you give them.</li>
        <li><b>Your order:</b> which plan you bought, what you paid, and the payment reference from our payment provider. We never see or store your card, UPI or bank details.</li>
        <li><b>Weekly check-ins,</b> if you are on the intensive plan: your weight and the signs you report.</li>
        <li><b>How you reached us and used the site:</b> the ad or link you came from, and which steps of the assessment you completed.</li>
      </ul>

      <h2>Why we use it</h2>
      <ul>
        <li>To build your report and your diet plan, and to decide which plans are safe to offer you.</li>
        <li>To send your report and plan to your email address, and to log you in with a one-time code sent to your mobile number.</li>
        <li>To take payment, give refunds and keep the records the law requires.</li>
        <li>To see where people leave the assessment so we can improve it. For this we look at totals, not at individuals.</li>
        <li>To send you recipes and offers, only if you ticked that box. You can stop these at any time.</li>
      </ul>
      <p>We use your information because you asked for a report or a plan and agreed to this policy when you started the assessment.</p>

      <h2>Who else handles it</h2>
      <p>We do not sell your information and we do not share your health answers with advertisers. A small number of companies process it for us, only to provide their service:</p>
      <ul>
        <li>Google Cloud, which hosts the site and the database on servers in Mumbai, India.</li>
        <li>Our email and SMS delivery providers, who receive your email address or mobile number and the message we send you.</li>
        <li>Our payment provider, who receives your payment details directly from you.</li>
      </ul>
      <p>We will also disclose information if the law requires us to.</p>

      <h2>Cookies</h2>
      <p>We set two cookies that the site needs to work: one keeps your assessment together while you answer it, and one keeps you logged in after you enter your one-time code. We do not set advertising cookies.</p>

      <h2>How long we keep it</h2>
      <p>We keep your answers, report and plan so that you can come back to them. Ask us to delete them and we will, within 30 days. We keep order and payment records for as long as tax law requires, even after a deletion request.</p>

      <h2>Your choices</h2>
      <ul>
        <li>Ask for a copy of what we hold about you.</li>
        <li>Ask us to correct it or delete it.</li>
        <li>Withdraw your consent. We will then stop using your information, and your plan will no longer be available.</li>
        <li>Stop marketing messages.</li>
      </ul>
      <p>For any of these, write to {mail} from the email address you gave us. We reply within 7 working days.</p>

      <h2>Children</h2>
      <p>Fitovela is for adults. Do not use it if you are under 18.</p>

      <h2>Complaints</h2>
      <p>If you are unhappy with how we have handled your information, write to our grievance officer at {mail}. If we do not resolve it, you may complain to the Data Protection Board of India.</p>

      <h2>Changes</h2>
      <p>If we change this policy we will update the date at the top. If the change is significant we will tell you by email before it applies to you.</p>
    </LegalPage>
  );
}
