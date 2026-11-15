import { SUPPORT_EMAIL } from '@/domain/company';
import { LegalPage } from '@/ui/Legal';

export const metadata = { title: 'Refund Policy · Fitovela' };

export default function RefundPage() {
  const mail = <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>;
  return (
    <LegalPage title="Refund and Cancellation Policy">
      <h2>7-day money-back guarantee</h2>
      <p>If your plan does not suit you, write to {mail} within 7 days of buying and we refund the full amount. You do not need to give a reason.</p>

      <h2>How to ask</h2>
      <ul>
        <li>Email {mail} from the address you used to buy, or tell us the mobile number on the order.</li>
        <li>We confirm within 2 working days.</li>
        <li>The refund goes back to the way you paid. It usually reaches you within 5 to 7 working days of our confirmation, depending on your bank.</li>
      </ul>

      <h2>After 7 days</h2>
      <p>After 7 days a plan is not refundable, because the whole plan is delivered to you at once. If something went wrong on our side, for example you were charged twice or your plan never opened, write to us at any time and we will put it right.</p>

      <h2>Cancellation</h2>
      <p>Every plan is a one-time payment. Nothing renews, so there is nothing to cancel.</p>

      <h2>Delivery</h2>
      <p>Your plan is digital. It opens on screen as soon as your payment succeeds and a link is sent to your email address. Nothing is shipped.</p>
    </LegalPage>
  );
}
