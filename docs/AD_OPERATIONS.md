# Fitovela ad reporting and launch checks

Owner: Codex, FTV-025. Status: independently reviewed implementation on `feat/ftv-024-launch-tracking`, **not deployed**. Current account IDs and Meta setup status live in [STATE.md](STATE.md). No advertising delivery changes are made by this code.

## Launch order agreed by the founder

1. Complete Fitovela's own Meta app/token, Tushar access, dataset and permitted website events.
2. Verify Cashfree payment confirmation and delivery, and configure the dashboard webhook for success/refund events.
3. Deploy verified Slack order alerts and hourly reporting; observe a scheduled run.
4. Founder supplies billing details.
5. Create/review the campaign using the supplied five image pairs, INR 1,000 **total per day**, all objects **PAUSED**. Launch only after a separate explicit instruction.

The campaign's objective, audience, placements, caption/headline, destination and tracking still need a concrete final review under the standing Ads Manager rules. No purchase-optimisation claim is made until the dataset's actual permitted events are checked.

## Secrets and recipients

All resources below are in GCP project `fitovela-prod`; always pass an explicit project flag. Do not reuse tarot's Meta token, dataset, webhook recipients or global gcloud project setting.

| Secret | Purpose | Verified status on 17 November 2026 |
| --- | --- | --- |
| `slack-order-webhook-url` | Founder-supplied Fitovela order channel | Stored; a labelled setup test returned HTTP 200 / `ok` |
| `slack-report-webhook-url` | Founder-supplied Fitovela report channel | Stored; a labelled setup test returned HTTP 200 / `ok` |
| `ops-report-secret` | Bearer authentication for internal reporting routes | Generated, stored; no schedule installed yet |
| `meta-marketing-api-token` | Fitovela ad management/reporting | Stored; 60-day SYSTEM_USER token, correct app/scopes/account/Insights verified |

The existing `fitovela-app` service identity can read all four secrets. No secret values belong in files, arguments, logs, screenshots or documentation. The runtime environment maps them through `scripts/deploy.sh`. Meta reporting is enabled in that script after verifying Fitovela’s own token and exact account identity.

## Paid-order alerts

- A Firestore transaction commits the paid order and a small pending notification together. Concurrent browser returns and Cashfree retries preserve the first paid snapshot.
- The immediate alert and recovery worker atomically claim the same delivery ID. Confirmed Slack sends are not resent.
- Message: amount, plan duration, provider, order ID and paid time in IST. It contains no email, phone, condition, assessment answer, intensive-track label or private plan URL. It states that the alert does not confirm email delivery.
- A definitive Slack rejection can retry. Timeouts, network errors and 5xx responses are marked **uncertain**, because Slack incoming webhooks cannot guarantee exactly-once delivery. Stale in-flight sends also require inspection; automatic retries would risk duplicate messages.
- Recovery runs in bounded batches from the pending queue, not by scanning all customers. The launch cutoff prevents old orders being announced as new. Demo orders are never sent.
- The existing email sender still has its prior delivery/retry behavior. This task does not claim that a Slack alert proves an email arrived.

## Hourly report

Proposed schedules, installed only after deployment: `fitovela-hourly-report` at `5 * * * *` in `Asia/Kolkata`; `fitovela-order-alert-recovery` every five minutes. `scripts/configure-reporting.py` defaults to inspection; `--apply` installs only these two named jobs. Requests use the reporting secret. The routes reject missing/wrong secrets with 401.

Authenticated Scheduler calls use the original `X-CloudScheduler-ScheduleTime` across retries, including after midnight. Each report shows the IST day through the latest completed hour plus that hour separately. At 00:05 it reports the previous completed day. Revenue follows the backend's `paidAt` confirmation timestamp; refunds follow Cashfree's processed timestamp. Meta data can settle later.

- Paid revenue and order counts come from confirmed backend orders, excluding demo orders. The production query selects financial summary fields and excludes meal plans/contact details.
- Successful merchant refunds are stored once by Cashfree refund ID. They must match the order, original paid payment, INR and a valid amount. Refunds for extra/failed payment attempts do not reduce paid-order revenue. Existing refunds require one initial backfill before launch.
- Spend comes from **GET-only** Meta Insights, including paused ads that spent during the reporting day. Each run verifies Fitovela's exact ad account, business, INR and IST time zone. Pagination is bounded; incomplete responses never become zero spend.
- `Revenue after ads/refunds = gross paid revenue − successful refunds − Meta spend`. It **excludes gateway fees, GST adjustments and operating costs**, so it is not net profit. Fee/GST inputs are not yet agreed. Missing Meta data withholds spend and margin.
- Ad attribution requires an exact `utm_content` ad ID returned from this Fitovela account. Storefront totals include organic/unattributed sales; these are not claimed as Meta conversions. Top-ad CPA uses backend matched order counts.
- Uncertain notification counts are surfaced. The reporter never changes budgets, audiences, copy, delivery or any other ad configuration.

## Cashfree evidence and remaining setup

On 17 November 2026, read-only checks found one INR 199 backend paid order. Cashfree independently returned `PAID`, `INR`, amount 199 and the exact notify URL `https://fitovela.com/api/webhooks/cashfree`. Cloud Run logged a POST to that route returning 200 at 12:16:14 UTC. Cashfree also returned one **successful full refund of INR 199**. This corrects the earlier handoff saying no completed payment existed; it does not by itself prove inbox delivery or the founder's on-screen plan experience.

The site already supplies `order_meta.notify_url` for every order. Cashfree's default `NOTIFY_URL` integration therefore already delivers payment events. Dashboard endpoint registration still needs inspection; the explicit success/refund subscription should be configured after the refund handler is deployed. Do not create duplicate endpoint registrations blindly. Backfill the existing successful refund before relying on revenue-after-refunds totals.

Primary documentation checked on 17 November 2026:

- [Cashfree webhook overview](https://www.cashfree.com/docs/api-reference/payments/latest/webhooks/overview): notify URL versus configured endpoints, at-least-once delivery, retries and signatures.
- [Cashfree payment payloads](https://www.cashfree.com/docs/api-reference/payments/latest/payments/webhooks).
- [Cashfree refund payloads](https://www.cashfree.com/docs/api-reference/payments/latest/refunds/webhooks): successful merchant refunds versus automatic extra-payment refunds.
- [Meta hourly breakdowns](https://developers.facebook.com/docs/marketing-api/insights/breakdowns/): advertiser-time-zone spend breakdown.

## Tracking boundary

No Pixel or CAPI code is installed yet. Meta's actual dataset creation UI offers `Health & wellness condition` for a business associated with medical conditions, and warns that this category may limit or block data sharing. The founder approved creation and Business Tools Terms. Dataset `1488170726709981` is now created with that category and connected to Fitovela’s India ad account; portfolio-wide automatic Meta-managed CAPI was unchecked. Events Manager shows “Events blocked”, Core setup on, and automatic advanced matching off. There are no received events or domain-specific category rows yet, so no claim is made that Purchase or other lower-funnel events can be used.

Before enabling tracking, inspect the resulting dataset's permitted events. Keep assessment answers, condition results, body measurements, medicines, diet track, contact fields and private result/plan URLs out of advertising payloads. Do not rename restricted events or miscategorise the business to bypass Meta restrictions. Browser SDK automatic collection and page URL/referrer leakage require an explicit privacy review before it can run anywhere in the assessment funnel.

## Release and verification

Payment/security changes require independent review under [AGENTS.md](../AGENTS.md). Reviewer `/root/review_launch_reporting` approved commit `03aa9ee50d394d84815b4fb845fb6734d784f5af`, independently rerunning typecheck, all 105 tests, whitespace and shell/Python syntax checks. Author also passed production build. Review fixes enrich late payment references without replacement, attempt email before Slack, and preserve scheduler retry windows. Current origin/main’s media changes were merged without application conflicts. Follow-up `8c0c9ba` enables the Meta reporting flag after token/account/Insights verification; independent follow-up review passed on that exact commit. No production deploy or scheduler installation yet.

Release steps: reconcile current `origin/main`, merge/push without a PR, deploy from clean main, verify private endpoints reject unauthenticated requests, backfill the verified refund, install schedules, and inspect an actual scheduled report plus an authorised test order alert. A forced Scheduler run can carry a future scheduled timestamp, which the guard rejects; use the authenticated endpoint without that header for a manual test, then observe the real :05 run. Keep all campaign/ad-set/ad statuses PAUSED. Actual creation writes, tracking event receipt and billing require separate launch checks.
