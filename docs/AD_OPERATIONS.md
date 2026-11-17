# Fitovela ad reporting and launch checks

Owner: Codex, FTV-024. Status: implementation on `feat/ftv-024-launch-tracking`, **not deployed**. Current account IDs and Meta setup status live in [STATE.md](STATE.md). No advertising delivery changes are made by this code.

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
| `meta-marketing-api-token` | Fitovela ad management/reporting | Not generated or verified yet |

The existing `fitovela-app` service identity can read the first three secrets. No secret values belong in files, arguments, logs, screenshots or documentation. The runtime environment maps them through `scripts/deploy.sh`. Meta reporting stays disabled in that script until its own token is verified.

## Paid-order alerts

- A Firestore transaction commits the paid order and a small pending notification together. Concurrent browser returns and Cashfree retries preserve the first paid snapshot.
- The immediate alert and recovery worker atomically claim the same delivery ID. Confirmed Slack sends are not resent.
- Message: amount, plan duration, provider, order ID and paid time in IST. It contains no email, phone, condition, assessment answer, intensive-track label or private plan URL. It states that the alert does not confirm email delivery.
- A definitive Slack rejection can retry. Timeouts, network errors and 5xx responses are marked **uncertain**, because Slack incoming webhooks cannot guarantee exactly-once delivery. Stale in-flight sends also require inspection; automatic retries would risk duplicate messages.
- Recovery runs in bounded batches from the pending queue, not by scanning all customers. The launch cutoff prevents old orders being announced as new. Demo orders are never sent.
- The existing email sender still has its prior delivery/retry behavior. This task does not claim that a Slack alert proves an email arrived.

## Hourly report

Proposed schedules, installed only after deployment: `fitovela-hourly-report` at `5 * * * *` in `Asia/Kolkata`; `fitovela-order-alert-recovery` every five minutes. `scripts/configure-reporting.py` defaults to inspection; `--apply` installs only these two named jobs. Requests use the reporting secret. The routes reject missing/wrong secrets with 401.

Each report shows the IST day through the latest completed hour plus that hour separately. At 00:05 it reports the previous completed day. Revenue follows the backend's `paidAt` confirmation timestamp; refunds follow Cashfree's processed timestamp. Meta data can settle later.

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

No Pixel or CAPI code is installed yet. Meta's actual dataset creation UI offers `Health & wellness condition` for a business associated with medical conditions, and warns that this category may limit or block data sharing. The staged dataset uses that category, with portfolio-wide automatic Meta-managed CAPI unchecked. Creating it accepts Business Tools Terms and is awaiting the founder's final confirmation.

Before enabling tracking, inspect the resulting dataset's permitted events. Keep assessment answers, condition results, body measurements, medicines, diet track, contact fields and private result/plan URLs out of advertising payloads. Do not rename restricted events or miscategorise the business to bypass Meta restrictions. Browser SDK automatic collection and page URL/referrer leakage require an explicit privacy review before it can run anywhere in the assessment funnel.

## Release and verification

Payment/security changes require independent review under [AGENTS.md](../AGENTS.md). Review commit `6002a6c` is pushed on the feature branch. The author ran type checking, 102 tests and a production build on the final implementation. Independent review remains pending; repeat affected checks after review fixes. No application-code merge, production deployment or scheduler installation has happened for FTV-024. Documentation-only progress is shared on main.

After review: reconcile current `origin/main`, merge/push without a PR, deploy from the clean main revision, verify private endpoints reject unauthenticated requests, backfill the verified refund, install schedules, and inspect one actual scheduled report plus an authorised test order alert. Keep all campaign/ad-set/ad statuses PAUSED throughout. Token/API reads, actual creation writes, tracking event receipt and billing must be checked separately before launch.
