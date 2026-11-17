# Fitovela ad reporting and launch checks

Owner: Codex, FTV-025. Status: independently reviewed implementation on `feat/ftv-024-launch-tracking`, **deployed as `14988c961bba`**. Current account IDs and Meta setup status live in [STATE.md](STATE.md). No advertising delivery changes are made by this code.

## Launch order agreed by the founder

1. Complete Fitovela's own Meta app/token, Tushar access, dataset and permitted website events.
2. Verify Cashfree payment confirmation and delivery, and configure the dashboard webhook for success/refund events.
3. Deploy verified Slack order alerts and hourly reporting; observe a scheduled run.
4. Founder supplies billing details.
5. Create/review the campaign using the supplied five image pairs, INR 1,000 **total per day**, all objects **PAUSED**. Launch only after a separate explicit instruction.

The founder later explicitly authorised launch and added two videos plus automatic music on the statics. FTV-028 owns the corrected Purchase campaign and current review/delivery state in [STATE.md](STATE.md). The exact approved settings, copy, destinations, media hashes and published IDs are in [campaign-draft.json](../ads/static/campaign-draft.json). FTV-028 corrects the mistaken Traffic launch to Sales/Website/Purchase. The Traffic campaign is paused; current IDs and the blocked activation state are in STATE.md. A missing Purchase signal must never be treated as permission to substitute Link clicks.

## Secrets and recipients

All resources below are in GCP project `fitovela-prod`; always pass an explicit project flag. Do not reuse tarot's Meta token, dataset, webhook recipients or global gcloud project setting.

| Secret | Purpose | Verified status on 17 November 2026 |
| --- | --- | --- |
| `slack-order-webhook-url` | Founder-supplied Fitovela order channel | Stored; a labelled setup test returned HTTP 200 / `ok` |
| `slack-report-webhook-url` | Founder-supplied Fitovela report channel | Stored; a labelled setup test returned HTTP 200 / `ok` |
| `ops-report-secret` | Bearer authentication for internal reporting routes | Generated, stored; both schedules installed |
| `meta-marketing-api-token` | Fitovela ad management/reporting | Stored; 60-day SYSTEM_USER token, correct app/scopes/account/Insights verified |

The existing `fitovela-app` service identity can read all four secrets. No secret values belong in files, arguments, logs, screenshots or documentation. The runtime environment maps them through `scripts/deploy.sh`. Meta reporting is enabled in that script after verifying Fitovela’s own token and exact account identity.

## Paid-order alerts

- A Firestore transaction commits the paid order and a small pending notification together. Concurrent browser returns and Cashfree retries preserve the first paid snapshot.
- The immediate alert and recovery worker atomically claim the same delivery ID. Confirmed Slack sends are not resent.
- Message: amount, plan duration, provider, order ID and paid time in IST. It contains no email, phone, condition, assessment answer, intensive-track label or private plan URL. It states that the alert does not confirm email delivery.
- A definitive Slack rejection can retry. Timeouts, network errors and 5xx responses are marked **uncertain**, because Slack incoming webhooks cannot guarantee exactly-once delivery. Stale in-flight sends also require inspection; automatic retries would risk duplicate messages.
- Recovery runs in bounded batches from the pending queue, not by scanning all customers. The launch cutoff prevents old orders being announced as new. Demo orders are never sent.
- The existing email sender still has its prior delivery/retry behavior. This task does not claim that a Slack alert proves an email arrived.

## Behaviour events and the drop-off report

Separate from the hourly Slack report and from Meta. Since FTV-029 ([D-026](DECISIONS.md)) every page writes behaviour events to the `events` collection: `page_view`, `engaged` (3, 10, 20, 30, 60, 120, 300 seconds on screen), `first_touch`, `scroll` (25/50/75/90/100%), `section_view`, `tap`, `tap_dead` (a tap on something that is not a button), `rage_tap`, `field_focus`, `field_blur`, `toggle`, `page_exit`, `perf`, `js_error`, and the named moments `age_tap`, `session_error`, `question_view`, `question_back`, `save_error`, `form_error`, `lead_submit`, `lead_skip_tap`, `tier_select`, `checkout_tap`, `checkout_error`, `offer_expired`. Browser events carry `source: 'browser'` and a `visitId`; server events (`landing_view`, `age_selected`, `question_answered`, `result_view`, `unlock_view`, `order_created`, `payment_confirmed` and the rest) are unchanged.

`landing_view` is counted on the server and so includes Meta's crawler (`ua: meta_crawler`) and pages the Facebook app loads before a tap. The count of people is the browser's `page_view`.

Read it with `node scripts/funnel-report.mjs` (today in IST; `--hours 6`, `--since <time>`, `--ad <ad id>`). It needs `gcloud auth login` as someone who can read Firestore in `fitovela-prod`, prints totals only, and changes nothing. No event holds an answer, a typed value, a contact detail or a plan link, and none of it is sent to Meta. On the assessment, plan and account pages a tap is stored without its position or the element's state, because either would give away the answer; off the landing page a tap that misses every button is stored by its tag alone, because some blocks appear only for certain answers; `checkout_error` stores a short code, not the message.

Known limit: the per-visitor and per-address brakes on `/api/event` (400 and 4,000 events a minute) rely on Cloudflare's visitor address. Someone calling the Cloud Run address directly can get round them; the body is still capped at 16 KB and 40 events, and only the listed names are stored.

## Hourly report

Installed schedules: `fitovela-hourly-report` at `5 * * * *` in `Asia/Kolkata`; `fitovela-order-alert-recovery` every five minutes. `scripts/configure-reporting.py` defaults to inspection; `--apply` installs only these two named jobs. Requests use the reporting secret. The routes reject missing/wrong secrets with 401.

Authenticated Scheduler calls use the original `X-CloudScheduler-ScheduleTime` across retries, including after midnight. Each report shows the IST day through the latest completed hour plus that hour separately. At 00:05 it reports the previous completed day. Revenue follows the backend's `paidAt` confirmation timestamp; refunds follow Cashfree's processed timestamp. Meta data can settle later.

- Paid revenue and order counts come from confirmed backend orders, excluding demo orders. The production query selects financial summary fields and excludes meal plans/contact details.
- Successful merchant refunds are stored once by Cashfree refund ID. They must match the order, original paid payment, INR and a valid amount. Refunds for extra/failed payment attempts do not reduce paid-order revenue. The pre-existing successful ₹199 refund was backfilled and read back on 17 November 2026.
- Spend comes from **GET-only** Meta Insights, including paused ads that spent during the reporting day. Each run verifies Fitovela's exact ad account, business, INR and IST time zone. Pagination is bounded; incomplete responses never become zero spend.
- `Revenue after ads/refunds = gross paid revenue − successful refunds − Meta spend`. It **excludes gateway fees, GST adjustments and operating costs**, so it is not net profit. Fee/GST inputs are not yet agreed. Missing Meta data withholds spend and margin.
- Ad attribution requires an exact `utm_content` ad ID returned from this Fitovela account. Storefront totals include organic/unattributed sales; these are not claimed as Meta conversions. Top-ad CPA uses backend matched order counts.
- Uncertain notification counts are surfaced. The reporter never changes budgets, audiences, copy, delivery or any other ad configuration.

## Cashfree evidence and remaining setup

On 17 November 2026, read-only checks found one INR 199 backend paid order. Cashfree independently returned `PAID`, `INR`, amount 199 and the exact notify URL `https://fitovela.com/api/webhooks/cashfree`. Cloud Run logged a POST to that route returning 200 at 12:16:14 UTC. Cashfree also returned one **successful full refund of INR 199**. This corrects the earlier handoff saying no completed payment existed; it does not by itself prove inbox delivery or the founder's on-screen plan experience.

The site already supplies `order_meta.notify_url` for every order. After the founder completed Cashfree's questionnaire, the dashboard independently confirmed its existing `NOTIFY_URL` subscription: version `2023-08-01`, event **success payment**, DEFAULT retries. That registration was preserved.

Added and verified after reload: `https://fitovela.com/api/webhooks/cashfree`, version **2025-01-01**, event **refund only**, DEFAULT retries after 2, 10 and 30 minutes. Version 2026-01-01 did not offer refund in this merchant's event selector; 2025-01-01 did. Cashfree's endpoint test passed, with matching production POST/200 at 16:46:48 UTC. This proves endpoint acceptance and saved configuration, not receipt of a new real refund. No duplicate success-payment endpoint was added. Local visual evidence: `/Users/tushar/.codex/artifacts/fitovela/launch-2026-11-17/cashfree-webhooks.png`.

Refund `156664209`, payment `7024990333`, was verified as SUCCESS / MERCHANT_INITIATED / INR 199 with processed time 12:38:45 UTC, then added once to the reporting ledger using the handler’s stable hashed ID. The backend paid payment reference and amount matched; the new record was read back exactly. No refund was initiated by this operation.

Primary documentation checked on 17 November 2026:

- [Cashfree webhook overview](https://www.cashfree.com/docs/api-reference/payments/latest/webhooks/overview): notify URL versus configured endpoints, at-least-once delivery, retries and signatures.
- [Cashfree payment payloads](https://www.cashfree.com/docs/api-reference/payments/latest/payments/webhooks).
- [Cashfree refund payloads](https://www.cashfree.com/docs/api-reference/payments/latest/refunds/webhooks): successful merchant refunds versus automatic extra-payment refunds.
- [Meta hourly breakdowns](https://developers.facebook.com/docs/marketing-api/insights/breakdowns/): advertiser-time-zone spend breakdown.

## Tracking boundary

No Pixel or CAPI code is installed. **Purchase delivery is paused pending a permitted signal for this assessment-linked product.** Meta's actual dataset creation UI offers `Health & wellness condition` for a business associated with medical conditions, and warns that this category may limit or block data sharing. The founder approved creation and Business Tools Terms. Dataset `1488170726709981` is now created with that category and connected to Fitovela’s India ad account; portfolio-wide automatic Meta-managed CAPI was unchecked. On 17 November Events Manager showed “Events blocked”, Core setup on, and automatic advanced matching off. On 18 November there was still no confirmed/processed Purchase event or domain-specific category row, so no claim is made that Purchase or other lower-funnel events can be used.

Before enabling tracking, inspect the resulting dataset's permitted events. Keep assessment answers, condition results, body measurements, medicines, diet track, contact fields and private result/plan URLs out of advertising payloads. Do not rename restricted events or miscategorise the business to bypass Meta restrictions. Browser SDK automatic collection and page URL/referrer leakage require an explicit privacy review before it can run anywhere in the assessment funnel.

An isolated server connection check on 17 November used the dataset's Test Events code and one generic `TestEvent`, with synthetic data and no purchase value. API receipt was HTTP 200 / `events_received:1`. On 18 November, after the founder confirmed the on-screen acknowledgement, native event-status inspection showed that TestEvent under **Action required**, while **Blocked (none)** and **Confirmed (none)** did not list Purchase. Ads Manager confirms that the dataset has no conversion events set up. API acceptance and an empty blocked list are not evidence of a permitted/processed Purchase. No fake Purchase or historical-customer backfill was sent.

### Purchase privacy review — 18 November 2026

The authenticated [Meta Business Tools Terms, section 1.h](https://www.facebook.com/legal/terms/businesstools) prohibit data based directly or indirectly on health information. [Meta's category restrictions guidance](https://business.facebook.com/business/help/511197658391698) distinguishes Core setup (parameter/URL restrictions), particular-event restrictions and full restrictions. Core setup alone does not prove Purchase is technically blocked. The accurate Health & wellness condition category remains unchanged.

Independent reviewer `/root/review_launch_reporting` reviewed application commit `730fa5ed2cf8512684a2372e842b96ecd06e55ae` and the captured primary terms. **Product-specific inference:** Fitovela's paid item is a plan for the user's symptom-assessment result, with eligibility and plan generation based on health answers (`src/server/fulfil.ts`). Sending a person-linked Purchase for that item can itself disclose health-derived activity, even without condition fields. The reviewer did not approve a live CAPI/Pixel transmission path for this unchanged funnel. This is not a blanket conclusion that generic diet-plan purchases are prohibited, nor a claim that Meta has explicitly blocked this unseen Purchase event.

**Required next evidence:** authoritative, product-specific clarification about whether this assessment-linked paid-plan conversion may be shared with Meta. The existing privacy policy also does not cover Meta conversion sharing; the recipes/offers checkbox is not consent for advertising measurement. A genuinely independent generic purchase flow would require an explicitly scoped product change and a new review. Do not merely rename the event, strip identifying health words, substitute an inaccurate source URL/action source, or change category to get around the restriction. No customer identifiers or health data were transmitted to Meta in FTV-028, and no app code was changed/deployed.

If a permitted flow is established, review an atomic paid-order outbox with stable deduplication ID and actual event time; bounded retries; a strict field allowlist; genuine click identifiers and actual browser metadata; correct disclosures/choices; and validation that distinguishes receipt from processing. Existing first-party paid-order/refund/UTM reporting continues without sending these customers to Meta. Primary technical references: [CAPI required parameters](https://developers.facebook.com/documentation/ads-commerce/conversions-api/best-practices), [click identifiers](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/fbp-and-fbc), [delivery/testing guidance](https://developers.facebook.com/documentation/ads-commerce/conversions-api/using-the-api). Local UI and readback evidence: `/Users/tushar/.codex/artifacts/fitovela/ads-2026-11-17/`.

## Release and verification

Payment/security changes require independent review under [AGENTS.md](../AGENTS.md). Reviewer `/root/review_launch_reporting` approved commit `03aa9ee50d394d84815b4fb845fb6734d784f5af`, independently rerunning typecheck, all 105 tests, whitespace and shell/Python syntax checks. Author also passed production build. Review fixes enrich late payment references without replacement, attempt email before Slack, and preserve scheduler retry windows. Current origin/main’s media changes were merged without application conflicts. Follow-up `8c0c9ba` enables the Meta reporting flag after token/account/Insights verification; independent follow-up review passed on that exact commit. Deployed `14988c961bba` on 17 November 2026 to `fitovela-00014-tot`; build and candidate smoke checks passed, public health reports that release, and Cloud Run reports 100% traffic. Both ops endpoints returned 401 without auth; authenticated report returned `sent`, recovery returned `checked:0`. The exact production Meta reader independently returned zero rows / ₹0 spend. Both scheduler jobs are enabled; an actual recovery run at 16:20:04 UTC returned HTTP 200. The first hourly scheduled run at **22:05 IST** returned HTTP 200; Firestore delivery `report-2026-11-17-21` independently records **sent** at 16:35:02 UTC.

Remaining checks: observe an actual paid-order alert and refund notification when new transactions occur; confirm plan access/email arrival; resolve permitted website tracking. Founder approval and billing were subsequently completed; FTV-028 owns current campaign delivery. Earlier labelled Slack destination tests passed, but no new real payment was created for testing. A forced Scheduler run can carry a future scheduled timestamp, which the guard rejects; use the authenticated endpoint without that header for a manual test. The earlier PAUSED requirement was superseded by explicit launch approval. Native ad publication and API status activation are verified in FTV-027; live website tracking remains disabled. The founder's new Meta system user **Agent** coexists with **Fitovela Automation**; no credentials or access were changed in this follow-up. Documentation-only updates were self-reviewed; production code and serving release are unchanged.
