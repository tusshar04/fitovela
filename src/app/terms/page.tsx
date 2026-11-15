import { SUPPORT_EMAIL } from '@/domain/company';
import { LegalPage } from '@/ui/Legal';

export const metadata = { title: 'Terms of Use · Fitovela' };

export default function TermsPage() {
  const mail = <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>;
  return (
    <LegalPage title="Terms of Use">
      <p>These terms apply when you use fitovela.com or buy a plan from Fitovela (“we”). By starting the assessment you agree to them and to our <a href="/privacy">Privacy Policy</a>.</p>

      <h2>What Fitovela is</h2>
      <p>Fitovela gives you a symptom assessment and a diet and movement plan based on your answers. It is nutrition guidance.</p>
      <p><b>It is not medical advice, a diagnosis or treatment.</b> The report tells you which pattern your answers match. Only a doctor, with tests, can tell you whether you have a condition such as PCOS, PCOD, a thyroid disorder or diabetes. Nobody at Fitovela examines you or reviews your individual answers before your plan is made.</p>

      <h2>Who can use it</h2>
      <ul>
        <li>You must be 18 or older.</li>
        <li>Do not buy a plan if you are pregnant or breastfeeding, have type 1 diabetes or take insulin, have kidney disease, have or have had an eating disorder, or are underweight. The assessment asks about these and will not offer you a plan if you say yes.</li>
        <li>If you take any medicine or have any health condition, show the plan to your doctor before you start, and never change a dose because of it.</li>
      </ul>

      <h2>Your part</h2>
      <ul>
        <li>Answer the assessment and any check-in truthfully. Your plan and the safety checks depend on it.</li>
        <li>Stop following the plan and see a doctor if you feel unwell: for example dizziness or fainting, a racing heartbeat, chest pain, strong belly pain, or being unable to keep food down.</li>
        <li>The plan is for you only. Do not share or resell it.</li>
      </ul>

      <h2>The intensive plan</h2>
      <p>If we offer you the intensive plan (800 to 1,000 kcal a day) and you choose it, you agree to complete the weekly check-in before each new week, to follow it for 12 weeks at most, and to accept that we will move you to the standard plan if a check-in shows a warning sign.</p>

      <h2>Results</h2>
      <p>The timeline and targets we show are estimates of what many people notice on a plan like yours. They are not a promise. Results depend on how closely you follow the plan and differ from person to person.</p>

      <h2>Price and payment</h2>
      <p>Prices are in Indian rupees and include any applicable taxes. You pay once for the plan length you choose. There is no subscription and nothing renews automatically. A launch price is held for a limited time from when you open the offer page; if the timer on that page runs out, the regular price shown on the page applies.</p>

      <h2>Refunds</h2>
      <p>You can ask for a full refund within 7 days of buying. See our <a href="/refund">Refund Policy</a>.</p>

      <h2>Our content</h2>
      <p>The assessment, reports, plans and everything else on the site belong to Fitovela. You may use them for yourself.</p>

      <h2>Our responsibility</h2>
      <p>We take care to make the plans sound, but food and movement affect everyone differently and we cannot see your full medical picture. To the extent the law allows, we are not liable for loss or harm that results from following a plan against these terms, from untruthful or incomplete answers, or from not seeking medical care when you needed it. Where we are liable, our liability is limited to the amount you paid us.</p>

      <h2>Changes and law</h2>
      <p>We may update these terms; the date at the top shows the latest version. These terms are governed by the laws of India.</p>

      <h2>Contact</h2>
      <p>Write to {mail}.</p>
    </LegalPage>
  );
}
