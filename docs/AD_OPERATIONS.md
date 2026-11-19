# Fitovela ad reporting and launch checks

Owner: Codex, FTV-025. Status: independently reviewed implementation on `feat/ftv-024-launch-tracking`, **deployed as `14988c961bba`**. Current account IDs and Meta setup status live in [STATE.md](STATE.md). No advertising delivery changes are made by this code.

## Launch order agreed by the founder

1. Complete Fitovela's own Meta app/token, Tushar access, dataset and permitted website events.
2. Verify Cashfree payment confirmation and delivery, and configure the dashboard webhook for success/refund events.
3. Deploy verified Slack order alerts and hourly reporting; observe a scheduled run.
4. Founder supplies billing details.
5. Create/review the campaign using the supplied five image pairs, INR 1,000 **total per day**, all objects **PAUSED**. Launch only after a separate explicit instruction.

The founder later explicitly authorised launch and added two videos plus automatic music on the statics. FTV-030 owns the live Purchase campaign and current delivery state in [STATE.md](STATE.md). The exact approved settings, copy, destinations, media hashes and published IDs are in [campaign-draft.json](../ads/static/campaign-draft.json). FTV-028 corrects the mistaken Traffic launch to Sales/Website/Purchase. The Traffic campaign is paused; current IDs and activation state are in STATE.md. A missing Purchase signal must never be treated as permission to substitute Link clicks.

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

Founder instruction, 19 November 2026 (FTV-036): when the **last completed hour** has confirmed **INR 0 ad spend and 0 paid orders**, return `skipped` without claiming a delivery or sending anything to Slack. Earlier activity that day, refunds or outstanding notification reviews do not trigger a quiet-hour report. Any spend or paid order keeps the existing report, including its day-to-date totals. An unavailable Meta lookup is not zero and still produces the existing warning. The hourly schedule and individual paid-order alerts stay enabled. Deployed as `61cab6f23c20` on 19 November; a real zero/zero hour returned HTTP 200 / `skipped` on the live endpoint, leaving the existing delivery record unchanged.

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

**FTV-030 live release, 18 November 2026 (`d1022874a2f7`, Cloud Run `fitovela-00018-teh`, 100% traffic):** the founder explicitly directed commerce-only Pixel/CAPI installation and Purchase campaign activation. The earlier FTV-028 hold was an internal inference about the product, not a Meta rejection or an outstanding owner approval. The founder clarified that Fitovela is a diet/nutrition company and that no report information should be sent. Dataset `1488170726709981` and its existing category/Core setup remain unchanged; no event renaming or restriction bypass is used.

### What the implementation sends

- Measurement is **on by default** since FTV-032 ([D-028](DECISIONS.md)): the landing page asks nothing and shows no banner. For a browser with no stored choice, or with it already on, an image Pixel records a public landing `PageView`. Before FTV-032 this needed an explicit **Allow** on a banner. There is no Meta JavaScript SDK, automatic event collection or advanced matching. Only the root URL without any query parameters is supplied; HTTP referrers are disabled.
- A **Purchase** is created only by the first verified Cashfree paid-order transaction. The allowlist is event name, stable hashed-order event ID, actual paid time, website action source, actual public `/unlock` checkout URL, INR amount/currency, genuine click/browser identifiers and the checkout browser user agent. No email/phone matching or IP field is sent by CAPI. Meta naturally receives the browser IP on an image request.
- Assessment answers, symptoms, condition/type results, body measurements, medicines, plan/tier/track, cuisine/meal preferences, contact fields, report/plan contents and private links never enter the outgoing payload. FTV-029's detailed first-party behaviour stream remains separate and is never forwarded.
- On the new paid plan view, a first-party endpoint validates the paid order, original session and current consent, then claims at most one browser Purchase. Its image request has the same event ID/value as CAPI, no page/referrer URL, and `referrerPolicy=no-referrer`. No script reads the report DOM. The browser event is optional; the webhook can complete server delivery without a browser return.
- Turning it off leaves the funnel/payment intact. The privacy page is the only place with the control (`Ad measurement: on/off · change`). The stored record says whether it is on by default or by her own choice. A stored "off" is checked before both server dispatch and browser claim, and neither the default nor an automatic landing refresh can switch it back on while her browser keeps the cookie (400 days, renewed at every landing). Already-sent events cannot be recalled.

### Reliability and operations

The paid transaction atomically creates a separate `metaDeliveries` outbox. The existing five-minute `/api/ops/notifications` schedule recovers failed/stale deliveries with the same ID/time, exponential delay, a maximum of eight attempts and a 24-hour retry window. Advertising errors do not fail payment fulfilment. Old orders and demo payments are not backfilled. Payloads/tokens/user identifiers are not logged. `sent` means API `events_received:1`, **not** proof of processing, matching, attribution or optimisation. Inspect Events Manager and actual sales for those outcomes.

Deployment flags: `META_EVENTS_ENABLED=1`, `META_PIXEL_ID=1488170726709981`; existing Secret Manager token supplies CAPI. Set the events flag to `0` and deploy to disable future collection/dispatch. Reporting reads remain independently enabled. The primary implementation references are Meta's [image Pixel/deduplication guide](https://developers.facebook.com/documentation/ads-commerce/conversions-api/deduplicate-pixel-and-server-events), [click identifiers](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/fbp-and-fbc) and [required parameters](https://developers.facebook.com/documentation/ads-commerce/conversions-api/best-practices).

Historical FTV-028 evidence: a synthetic generic `TestEvent` received API 200 / `events_received:1`; Events Manager subsequently showed it under Action required. The Blocked and Confirmed lists did not contain Purchase. No fake Purchase or historical-customer backfill was sent. The prior review inferred that assessment-linked purchases could be health-derived activity under the terms; it did not establish that Meta had rejected this Purchase event. The founder superseded the inferred internal hold on 18 November. Actual Meta errors/restrictions must still be reported accurately and cannot be evaded. Local captured account evidence: `/Users/tushar/.codex/artifacts/fitovela/ads-2026-11-17/`.

## Release and verification

Payment/security changes require independent review under [AGENTS.md](../AGENTS.md). Reviewer `/root/review_launch_reporting` approved commit `03aa9ee50d394d84815b4fb845fb6734d784f5af`, independently rerunning typecheck, all 105 tests, whitespace and shell/Python syntax checks. Author also passed production build. Review fixes enrich late payment references without replacement, attempt email before Slack, and preserve scheduler retry windows. Current origin/main’s media changes were merged without application conflicts. Follow-up `8c0c9ba` enables the Meta reporting flag after token/account/Insights verification; independent follow-up review passed on that exact commit. Deployed `14988c961bba` on 17 November 2026 to `fitovela-00014-tot`; build and candidate smoke checks passed, public health reports that release, and Cloud Run reports 100% traffic. Both ops endpoints returned 401 without auth; authenticated report returned `sent`, recovery returned `checked:0`. The exact production Meta reader independently returned zero rows / ₹0 spend. Both scheduler jobs are enabled; an actual recovery run at 16:20:04 UTC returned HTTP 200. The first hourly scheduled run at **22:05 IST** returned HTTP 200; Firestore delivery `report-2026-11-17-21` independently records **sent** at 16:35:02 UTC.

Remaining checks: observe an actual paid-order alert and refund notification when new transactions occur; confirm plan access/email arrival; resolve permitted website tracking. Founder approval and billing were subsequently completed; FTV-028 owns current campaign delivery. Earlier labelled Slack destination tests passed, but no new real payment was created for testing. A forced Scheduler run can carry a future scheduled timestamp, which the guard rejects; use the authenticated endpoint without that header for a manual test. The earlier PAUSED requirement was superseded by explicit launch approval. Native ad publication and API status activation are verified in FTV-027; live website tracking remains disabled. The founder's new Meta system user **Agent** coexists with **Fitovela Automation**; no credentials or access were changed in this follow-up. Documentation-only updates were self-reviewed; production code and serving release are unchanged.


FTV-032 release, 18 November 2026 (`b072f7c7ba0b`, Cloud Run `fitovela-00020-gov`, 100% traffic): the landing banner is gone and measurement is on by default ([D-028](DECISIONS.md)). Checked on the live site at two phone sizes: no banner, age buttons tappable, a landing PageView image requested for a new browser and none after turning it off on the privacy page. That check kept its image request from reaching Meta, so receipt of default-on events in the dataset is not yet confirmed.

FTV-030 release verification: independent implementation review passed on `ced6d90`; 125 tests, typecheck and production build passed. The public health check matches the deployed SHA, the measurement preference defaults to unknown/off, and authenticated five-minute recovery succeeds against production Firestore. A real consented landing image Pixel request returned HTTP 200 in isolated native Chrome; the regular profile locally blocked its request. Nine status-only API updates activated the exact seven canonical ads and their parents; two full reads confirm all ACTIVE and all other captured configuration unchanged. Native Ads Manager confirms Active/Website purchase/INR 1,000 and no pending draft. First genuine paid Purchase processing, matching, deduplication and attribution remain to be observed; transport acceptance is not that proof. No fake Purchase or historical backfill was used.

## Ad wording after FTV-035 (2026-11-18)

The report is now paid ([D-030](DECISIONS.md)). The site no longer promises a free report or a free type. The ads in Meta were written before that: the shared text says "Explore your report", both videos end on "Take the free check", the "First four weeks" static says "Get your free report", and the quiz video shows the type and the four scores as free screens. `ads/video/capture.mjs` still captures `/result`, which now redirects to the paywall. The assessment is still free; the result is not. Changing the ad text or creatives is a Meta account change and is the founder's or the campaign owner's, not part of this task.

## "Tried" video paused (2026-11-18, 14:56 IST)

On the founder's instruction ("ok go", after Claude's recommendation), Claude paused ad `120248244667170009` (Tried | Love You Zindagi | Video v2) with one status-only API update and read it back as `PAUSED`. By then it had spent INR 271.95 today for 1,013 impressions, 5 clicks and no landing-page views; the "Types" video had spent INR 386.21 for 16 clicks and 13 landing-page views. Nothing else in the account was changed: budget, ad set, the other six ads and the ad text are as they were.

## Both campaigns paused by the founder (2026-11-19)

The founder paused the Purchase campaign himself. An API read at 11:35 IST on 19 November shows campaign `120248244657940009` and the old Traffic campaign `120248243480500009` both `PAUSED`. Claude made no change in the account.

Totals to that point, from Meta: Purchase INR 934.97, 5,414 impressions, 111 link clicks, 33 landing-page views, 0 purchases; Traffic INR 51.27. From the site's own log since browser tracking began (18 November, 02:20 IST): 61 people saw the landing page, 14 tapped an age, 12 finished the questions, 10 saw the prices page, 1 opened the Cashfree page, 0 paid. Of these, only 3 saw the prices page after the report became paid ([D-030](DECISIONS.md)); that is too few to judge the change.
