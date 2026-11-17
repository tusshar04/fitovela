# Project state and handoff

Last updated: 2026-11-17

This file owns current coordination. Read [AGENTS.md](../AGENTS.md) before acting. Branch state can change after this document is written; inspect Git at every handoff. Work is merged straight into `main`; pull requests are not used ([D-010](DECISIONS.md)).

## Current stage

In production, **payments on** since 2026-11-17 (Cashfree). The app runs on Cloud Run in Mumbai (GCP project `fitovela-prod`) behind `fitovela.com`, with Firestore as the database. A visitor can take the assessment, see her report and the paywall, and pay. No real payment has been completed yet. See [D-021](DECISIONS.md) and [D-025](DECISIONS.md).

## Production — FTV-012 (Claude, started 2026-11-15)

| Piece | Status on 2026-11-15 |
| --- | --- |
| Cloud Run service `fitovela`, `asia-south1` | Live. Release `d057487` (FTV-019, Cashfree switched on), deployed and checked through `fitovela.com` on 2026-11-17. Its own address is `https://fitovela-pflkmzgscq-el.a.run.app`; the Worker forwards to it. |
| Firestore, `asia-south1` | Live, used by the service. First real use of the Firestore driver. |
| Domain | **Live at https://fitovela.com.** DNS is at Cloudflare (nameservers `norm` and `teagan.ns.cloudflare.com`, the same account as tarot). The Worker `fitovela-edge` (source in `edge/`) forwards `fitovela.com` to the Cloud Run service; `www` and plain http redirect to `https://fitovela.com`. Checked through the domain: pages, a full assessment, cookies, security headers. The Google load balancer is deleted. Workers free plan: 100,000 requests a day. |
| Login codes by SMS | Switched on, through tarot's 2Factor key. Tested by Tushar with his own phone on 2026-11-15. The SMS wording is whatever template tarot's 2Factor account uses. |
| Email | **Switched on.** Amazon SES, sender `care@fitovela.com`, domain verified by DKIM on 2026-11-15, Fitovela's own send-only key. Checked against the SES mailbox simulator; no real customer email has been sent yet. |
| Payments | **Switched on, 2026-11-17: Cashfree, production keys** (Secret Manager: `cashfree-app-id`, `cashfree-secret-key`; `CASHFREE_ENABLED=1` in `scripts/deploy.sh`). Checked on `fitovela.com` with a synthetic visit: the pay button opens Cashfree's real checkout for the right amount with her mobile number already filled; leaving without paying returns her to the paywall with a message. **Not yet checked: a completed payment** (plan opening on return, and a real signed webhook). The first real payment should be made by the founder and followed in the logs. To switch off: set `CASHFREE_ENABLED=0` and deploy. The older Razorpay code is still in the repo, unused. |
| Mailbox `care@fitovela.com` | Created by Tushar in GoDaddy. It is the address on the site and the sender of plan emails. |
| Policies | Privacy, terms, refund and contact pages are live. Written by an AI agent; not reviewed by a lawyer; no registered business name or address on them yet. |

**Deploy:** from a clean `main` equal to `origin/main`, run `scripts/deploy.sh`. It builds the commit, deploys a candidate, checks it and only then moves traffic. **Roll back:** `scripts/deploy.sh rollback` lists revisions and prints the command. Deploys are manual; GitHub Actions is not set up.

**Open, in order:** (1) one real ₹ payment by the founder before ads start, to confirm the plan opens and the webhook is accepted, then a refund from the Cashfree dashboard; (2) business name and address on the policy pages; (3) Meta Pixel; (4) switch Cloudflare Workers to the paid plan (USD 5 a month) on the day ads start. The free allowance of 100,000 requests a day is shared with tarot, whose busiest day since late August was about 5,000; Fitovela reaches the limit at roughly 2,000 to 4,000 ad visitors a day.

### Still stand-ins

| Area | Today | Needed |
| --- | --- | --- |
| Ad tracking | None. | Meta Pixel and Conversions API. |
| Reviews, live counter | Hidden. | Real ones, to come from the doctor via Tushar. |
| Photos | Unsplash stand-ins in `public/img/`. | Licensed or shot images. |
| Medical drafts | In force on the doctor's interim answer ("go with your recommendations for now"). | Her review when she returns ([MEDICAL_RULES.md](MEDICAL_RULES.md)). |
| Deploy automation | A script run by hand. | GitHub Actions with Workload Identity Federation, as tarot has. |

### FTV-005 and FTV-006 — movement plan and 12-week target (Claude, 2026-11-15, merged)

After the doctor's feedback on the demo: a movement plan in every paid plan (now 60 minutes a day), a 1,200 kcal floor above the healthy BMI range, and a 12-week target with no dates, with the 12-week plan as the default tier ([D-015](DECISIONS.md)). She also asked for a 2 kg a week target; it is not built. Her 800 kcal request is built as the intensive track (FTV-010 below).

### FTV-007 — week-by-week journey (Claude, 2026-11-15, merged)

The result, paywall and plan now lead with a personalised "Your next 12 weeks" timeline; weights are supporting tags and the chart is folded under "See the numbers" ([D-016](DECISIONS.md)). The timeline lines are a draft for the doctor.

### FTV-008 and FTV-009 — doctor's journey rulings; sleeker design (Claude, 2026-11-15, merged)

The doctor's three rulings on the timeline are applied (skin at week 3, cycles line kept, "feel lighter" at about 1 kg in place of a dress-size claim). After the founder's review the whole funnel was restyled to be sleeker and weight is now mentioned once, on the week 12 stop ([D-017](DECISIONS.md)). Self-review only; checked on screen.

### FTV-010 and FTV-011 — intensive track, automatic; new prices (Claude, 2026-11-15, merged)

Women at BMI 30 and above can choose an 800 to 1,000 kcal intensive plan on the paywall ([D-018](DECISIONS.md)). On the founder's instruction it is fully automatic ([D-020](DECISIONS.md)): it opens on payment, weekly check-ins open each week, and a stop sign moves her to the standard plan. The first build's clinician review and `/review` page are removed. Prices were set to INR 399, 599 and 799 ([D-019](DECISIONS.md)); they changed again in FTV-016. The clinical settings and 31 light plates are drafts: nine points for the doctor are in [MEDICAL_RULES.md](MEDICAL_RULES.md). Self-review only; run end to end on localhost.

### FTV-015 — first-month timeline, no weight on it, pill question removed (Claude, 2026-11-15, merged)

On the founder's instruction, relaying the doctor's view that the pages undersold ([D-022](DECISIONS.md)): the timeline is now "Your first 4 weeks", written to speak to what she is self-conscious about; weeks 8 and 12 are under "Show weeks 8 and 12"; no stop mentions weight. The birth-control pill question and the post-pill type are removed. The new lines are drafts listed for the doctor in [MEDICAL_RULES.md](MEDICAL_RULES.md). Self-review only; no independent reviewer was available.

### FTV-016 — prices 199/299/399, harder copy, less detail before paying (Claude, 2026-11-15, merged)

Founder instructions ([D-023](DECISIONS.md)): new prices; the timeline lines rewritten to sell hard; the paywall and report say only "Your basic movement plan"; "Protein-rich meals from everyday home food" in place of "Protein at every meal"; the "Birth-control pill" tick box removed. The paywall FAQ says "No powders or supplements" while the intensive plan asks for a multivitamin and sometimes a protein scoop; the founder was shown this and decided both stay. Self-review only; no independent reviewer was available.

### FTV-017 — launch-price timer restarts on every visit (Claude, 2026-11-15, merged)

Founder instruction ([D-024](DECISIONS.md)): the 15-minute countdown starts again each time she opens or refreshes the paywall, so a returning visitor is offered the launch price again. Self-review only; checked on screen.

### FTV-018 — Cashfree checkout (Claude, 2026-11-15, merged)

Founder instruction: integrate Cashfree with the least typing for the buyer ([D-025](DECISIONS.md)). She gives her email and mobile number once (pre-filled if she gave them at the report step); both go to Cashfree with the order, so its page asks only how she wants to pay. Cashfree returns her to `/api/order/return`, which asks Cashfree whether the order is paid before opening the plan; the webhook delivers the plan if she never comes back. **Not yet run against Cashfree**: there are no keys. Checked against a local stand-in for its API (create, return unpaid, pending, wrong amount, paid; signed, unsigned, duplicate and wrong-amount webhooks) and on screen up to the hand-off, where Cashfree's sandbox rejected the made-up session as expected. Payment code needs independent review under AGENTS.md; none was available, so this is self-review only.

### FTV-019 — Cashfree switched on (Claude, 2026-11-17, merged)

The founder supplied production keys and asked for Cashfree to be enabled. Keys stored in Secret Manager, flag set, deployed. Verified with the real keys: order creation and order lookup at Cashfree; the live checkout page from `fitovela.com` (the domain is accepted by Cashfree's whitelist; `127.0.0.1` is refused, as it should be). Three unpaid test orders (prefix `fv_`, synthetic customer) now sit in the Cashfree account. A completed payment is still unverified. Self-review only.

### Exact next step

The "Open, in order" list under Production above.

## Other open work

- **FTV-002 (Codex):** draft [PR #2](https://github.com/tusshar04/fitovela/pull/2), not merged. Its food-first, no-condition-result proposal conflicts with accepted D-007. Tushar to decide whether it is closed or reworked.

## Completed

- **FTV-003:** product brief rewritten around the assessment-led funnel; merged 2026-11-14.
- **FTV-001:** shared documents and workflow; [PR #1](https://github.com/tusshar04/fitovela/pull/1).

## Coordination notes

One writer is active at a time initially. For simultaneous work, the user or designated coordinator must assign distinct tasks before work starts and serialize updates to this file. Ownership recorded only in an unmerged branch is not a global reservation.

At handoff, record the owner, status, branch/worktree, commit, checks/results, open issues, and next action. Keep full history in commits rather than growing a session log here.
