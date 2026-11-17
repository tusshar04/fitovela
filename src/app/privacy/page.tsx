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
        <li><b>How you reached us and used the site:</b> the ad or link you came from; which pages and steps you saw and how long you spent on them; how far you scrolled and which buttons you tapped; whether a form box was filled in, but not what you typed; the type of phone and browser you used; and any errors the page ran into.</li>
      </ul>

      <h2>Why we use it</h2>
      <ul>
        <li>To build your report and your diet plan, and to decide which plans are safe to offer you.</li>
        <li>To send your report and plan to your email address, and to log you in with a one-time code sent to your mobile number.</li>
        <li>To take payment, give refunds and keep the records the law requires.</li>
        <li>To see where people leave the site and what they tap, so we can improve it. For this we look at totals, not at individuals. This record stays with us and is not sent to advertisers.</li>
        <li>To send you recipes and offers, only if you ticked that box. You can stop these at any time.</li>
      </ul>
      <p>We use your information because you asked for a report or a plan and agreed to this policy when you started the assessment.</p>

      <h2>Who else handles it</h2>
      <p>We do not sell your information and we do not share your health answers with advertisers. A small number of companies process it for us, only to provide their service:</p>
      <ul>
        <li>Google Cloud, which hosts the site and the database on servers in Mumbai, India.</li>
        <li>Our email and SMS delivery providers, who receive your email address or mobile number and the message we send you.</li>
        <li>Our payment provider, Cashfree Payments. We pass it your mobile number and email address with your order, so that you do not have to type them again, and it receives your payment details directly from you.</li>
      </ul>
      <p>We will also disclose information if the law requires us to.</p>

      <h2>Optional ad measurement</h2>
      <p>Only if you choose “Allow”, we share a visit to our public landing page and a confirmed purchase with Meta (Facebook and Instagram). This includes the purchase amount and currency, a random event identifier, advertising click and browser identifiers, and browser information. Meta also receives your IP address when your browser loads its measurement image. This helps us measure ads and find people likely to buy a plan.</p>
      <p>We do not send your answers, symptoms, condition results, body measurements, food preferences, report, plan contents, email address, phone number or private plan link to Meta. Our detailed site-usage log stays with us. You can decline or turn off future sharing below; that does not undo events already sent. Meta processes the shared data under its <a href="https://www.facebook.com/privacy/policy/" rel="noreferrer">Privacy Policy</a>.</p>

      <h2>Cookies</h2>
      <p>We set two cookies that the site needs to work: one keeps your assessment together while you answer it, and one keeps you logged in after you enter your one-time code. If you allow ad measurement, we also set advertising identifiers and a cookie remembering that choice for up to 90 days. You can change the choice using the button at the end of this page; refusing does not affect your assessment or purchase. Your browser also keeps a random number for the length of your visit, so that we can count one visit as one visit. It is not a cookie, it holds nothing about you, and it is gone when you close the tab.</p>

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
