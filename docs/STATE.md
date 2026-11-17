# Project state and handoff

Last updated: 2026-11-17

This file owns current coordination. Read [AGENTS.md](../AGENTS.md) before acting. Branch state can change after this document is written; inspect Git at every handoff. Work is merged straight into `main`; pull requests are not used ([D-010](DECISIONS.md)).

## Current stage

In production, **payments on** since 2026-11-17 (Cashfree). The app runs on Cloud Run in Mumbai (GCP project `fitovela-prod`) behind `fitovela.com`, with Firestore as the database. A visitor can take the assessment, see her report and the paywall, and pay. A completed INR 199 payment and its full refund were verified read-only at Cashfree on 2026-11-17; the matching production webhook returned 200. On-screen plan access and email arrival still need confirmation. See [D-021](DECISIONS.md) and [D-025](DECISIONS.md).

## Production — FTV-012 (Claude, started 2026-11-15)

| Piece | Status on 2026-11-15 |
| --- | --- |
| Cloud Run service `fitovela`, `asia-south1` | Live. Release `d057487` (FTV-019, Cashfree switched on), deployed and checked through `fitovela.com` on 2026-11-17. Its own address is `https://fitovela-pflkmzgscq-el.a.run.app`; the Worker forwards to it. |
| Firestore, `asia-south1` | Live, used by the service. First real use of the Firestore driver. |
| Domain | **Live at https://fitovela.com.** DNS is at Cloudflare (nameservers `norm` and `teagan.ns.cloudflare.com`, the same account as tarot). The Worker `fitovela-edge` (source in `edge/`) forwards `fitovela.com` to the Cloud Run service; `www` and plain http redirect to `https://fitovela.com`. Checked through the domain: pages, a full assessment, cookies, security headers. The Google load balancer is deleted. Workers free plan: 100,000 requests a day. |
| Login codes by SMS | Switched on, through tarot's 2Factor key. Tested by Tushar with his own phone on 2026-11-15. The SMS wording is whatever template tarot's 2Factor account uses. |
| Email | **Switched on.** Amazon SES, sender `care@fitovela.com`, domain verified by DKIM on 2026-11-15, Fitovela's own send-only key. Checked against the SES mailbox simulator; no real customer email has been sent yet. |
| Payments | **Switched on, 2026-11-17: Cashfree, production keys** (Secret Manager: `cashfree-app-id`, `cashfree-secret-key`; `CASHFREE_ENABLED=1` in `scripts/deploy.sh`). Checked on `fitovela.com` with a synthetic visit: the pay button opens Cashfree's real checkout for the right amount with her mobile number already filled; leaving without paying returns her to the paywall with a message. **Verified 2026-11-17:** a real INR 199 paid order, its successful full refund at Cashfree, and a matching production webhook POST returning 200. **Still unverified:** plan opening on return and actual email arrival. To switch off: set `CASHFREE_ENABLED=0` and deploy. The older Razorpay code is still in the repo, unused. |
| Mailbox `care@fitovela.com` | Created by Tushar in GoDaddy. It is the address on the site and the sender of plan emails. |
| Policies | Privacy, terms, refund and contact pages are live. Written by an AI agent; not reviewed by a lawyer; no registered business name or address on them yet. |

**Deploy:** from a clean `main` equal to `origin/main`, run `scripts/deploy.sh`. It builds the commit, deploys a candidate, checks it and only then moves traffic. **Roll back:** `scripts/deploy.sh rollback` lists revisions and prints the command. Deploys are manual; GitHub Actions is not set up.

**Open, in order:** (1) confirm the paid plan opens and its email arrives; the INR 199 payment, webhook acceptance and full refund are already verified; (2) business name and address on the policy pages; (3) Meta Pixel; (4) switch Cloudflare Workers to the paid plan (USD 5 a month) on the day ads start. The free allowance of 100,000 requests a day is shared with tarot, whose busiest day since late August was about 5,000; Fitovela reaches the limit at roughly 2,000 to 4,000 ad visitors a day.

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

### FTV-020 — five static ads, first drafts (Claude, 2026-11-17, merged)

Founder instruction: five static ads on our hook, after he shared competitor ads (ToneOp, Nutritiondaily, a PDF planner, Fitelo, Disha). Sources are in `ads/static/` (one HTML file per ad, shared `ads.css`); `ads/static/render.sh` writes PNGs to `ads/static/out/` in two sizes, 1080 x 1350 for feed and 1080 x 1920 for Reels and Stories with Meta's covered zones left empty. **Founder approved these five ads for a paused campaign on 2026-11-17; not uploaded to Meta yet.** Every claim is taken from the live site (free, 2 minutes, four areas, type names, the first-4-weeks lines, plans from INR 199). Photos are the Unsplash stand-ins from `public/img/`, food only, no faces. Ad 2 is in Hinglish; the product's language is still undecided in [PRODUCT.md](PRODUCT.md). Found while writing them: the landing page (hook C) says "No salads" but the meal library has salad dishes; the ads do not repeat that line and the landing page is unchanged. Self-review only; checked on screen in both sizes.

### FTV-022 — quiz video ad, English and Hinglish captions (Claude, 2026-11-17, merged)

Founder instruction, after approving the static ads: a video of the real assessment, with captions in English and in Hinglish. It is 21 seconds, 1080 x 1920, 30 frames a second, no sound: three boxes are ticked on the insulin question, "Reading your answers", "Building your report", the type, the four scores, "Your first 4 weeks", the locked diet, the three prices, a closing card. Every screen is a screenshot of the real app taken by `ads/video/capture.mjs` from one synthetic visit (a made-up woman whose answers match insulin-resistant PCOS); `ads/video/quiz.html` (first named `video.html`) lays them out and `ads/video/render.mjs` writes `ads/video/out/fitovela-quiz-en.mp4` and `-hi.mp4` through headless Chrome and ffmpeg. The MP4 files are not in Git (they are rebuilt by the script); the copies are in the primary checkout on Tushar's Mac. If the app's screens change, run the capture again. **Drafts: not uploaded to Meta.** The Hinglish wording is Claude's and has not been checked by a native speaker other than the founder. Self-review only; frames from both finished files were looked at, including the taps and the screen changes.

### FTV-023 — script for a second video, "Same diet, two women" (Claude, 2026-11-17, proposed)

After the quiz video the founder said "go ahead"; Claude took that as the second video it had recommended. [ads/video/story-script.md](../ads/video/story-script.md) holds a 30-second shot list, the voiceover in Hinglish and English, and prompts for an AI video tool. Two phone-only clips cut from the quiz video for shots 5 and 6 are in `ads/video/out/` on Tushar's Mac (`insert-quiz-ticks.mp4`, `insert-type-result.mp4`; not in Git). **Proposed, not approved; no footage or voice exists.** Claude cannot generate either.

### FTV-024 — three text videos, English and Hinglish (Claude, 2026-11-17, merged)

The founder has no footage or voice to give and asked for more videos made from text, screens and the site. Three more, each in both caption languages, 1080 x 1920, 30 frames a second, no sound: `types` (15 s: "PCOS is not one problem. It has types.", the three type cards), `tried` (15.5 s: "Ate less. Walked more. Gave up rice. Weight? Still stuck.", then the 4 hidden causes) and `weeks` (17.6 s: a sample report's first 4 weeks, then "With roti, rice and dosa. Plans from INR 199"). Pages are `ads/video/types.html`, `tried.html`, `weeks.html` on a shared `kit.js` and `kit.css`; the first video's page is now `quiz.html`. `node ads/video/render.mjs` rebuilds all eight files into `ads/video/out/` (not in Git; copies are in the primary checkout on Tushar's Mac). Every claim is from the live site. The Hinglish lines, including the four week lines, are Claude's translations and are not checked by the doctor. **Drafts: not uploaded to Meta.** Self-review only; frames from all six new files were looked at.

### Exact next step

The "Open, in order" list under Production above.

## Other open work

- **FTV-024 (Codex, launch tracking and reporting, 2026-11-17):** implementation ready for independent review, **not deployed**, on `feat/ftv-024-launch-tracking`, worktree `/Users/tushar/fitovela-worktrees/ftv-024-launch-tracking`. See [AD_OPERATIONS.md](AD_OPERATIONS.md) for acceptance criteria, reporting semantics, secrets, evidence and release steps. Slack order/report secrets plus scheduler-auth secret are stored in `fitovela-prod`; both Slack destinations accepted labelled setup tests. Implemented atomic paid-order/outbox commits, duplicate-safe alerts, signed refund reconciliation, authenticated report/recovery routes, and GET-only Meta spend reporting with missing-data handling. Review commit **`6002a6c`** is pushed to the feature branch. Type checking, 102 tests and production build passed; independent review is pending under AGENTS.md, and permission to delegate it has been requested. Pixel/CAPI code is not installed, token not generated, refund backfill and dashboard refund subscription not applied, schedules not installed. Earlier tentative task number FTV-023 was moved to FTV-024 after the other agent published its distinct video-script task. Preserve its video work. Exact next step: required reviews/Meta final approvals, then verify and deploy the reviewed implementation; keep the INR 1,000/day campaign off.

- **FTV-021 (Codex, Meta setup, 2026-11-17):** in progress; founder requested Fitovela's own business assets under Priya's personal Facebook login, separate from tarot. Handoff branch `docs/ftv-021-meta-setup`, worktree `/Users/tushar/fitovela-worktrees/ftv-021-meta-setup`; documentation self-review only (no application changes or deployment).
  - **Verified in Meta UI:** business portfolio **Fitovela**, ID `1110506178493480`, owns Facebook Page **Fitovela**, ID `1440995739098638`. Priya Chaudhary has full control; the linked Instagram identity also appears in People. No other human was invited. Existing Astro Vela assets were not changed.
  - **Instagram completed:** [@fit.o.vela](https://www.instagram.com/fit.o.vela/), ID `17841411335046415`, is a Business account, category **Health & wellness website**, contact `care@fitovela.com`. The website's pink leaf logo and bio are saved. Business Suite and reloaded portfolio settings confirm ownership by Fitovela and two connected assets: its Facebook Page and **Fitovela | India** ad account. Optional Instagram message access was off during linking. `fitovela.com` remains plain text in the bio; a clickable website link is still pending.
  - **Ad account completed:** **Fitovela | India**, ID `1457307065897121`, created with **INR**, **Asia/Kolkata**, usage **My business** after the founder approved both displayed consents. Ownership and Priya's full access were rechecked after reload. Billing shows **Active**, **INR**, **₹0.00 outstanding**, **no recent spending**, and **no payment method**; business name/address still need billing setup. No campaigns were created or launched. The founder later requested campaign creation at INR 1,000 per day, explicitly kept off; activation is not authorised. The Business Settings internal asset record `120248240652740009` is not the ad account ID.
  - **Business email confirmed:** Meta's Fitovela-specific confirmation email was opened in the authorized `care@fitovela.com` mailbox, then confirmed in Priya's Facebook session. Reloaded Business info no longer shows Pending confirmation. This is email confirmation only: legal-business verification still shows **Unverified**.
  - **Developer registration completed:** the founder completed verification/contact steps, then Codex completed the remaining role-selection step (Marketer). Meta's developer dashboard opened successfully and showed **No apps yet**. The previous developer SMS blocker is resolved for this registration; do not resend codes or repeat registration.
  - **API app verified:** **Fitovela**, ID `1492107119522873`, is owned by the Fitovela portfolio and has the Marketing API ads-management use case. App is unpublished; ads management/read, business management and Page ads/read/list permissions show Ready for testing. No token exists and API write access is **not yet verified**. The founder accepted the displayed system-user non-discrimination policy (success notice observed). The Employee system user **Fitovela Ads Automation** is named but not created; final access approval is pending.
  - **Access / Pixel next steps:** invitation to `tussharonfalak@gmail.com` is staged with Full access: Everything for Fitovela plus its Page, Instagram and India ad account; not sent. Dataset **Fitovela Website** is staged with **Health & wellness condition**, automatic portfolio-wide Meta-managed CAPI unchecked; Create accepts Business Tools Terms and is awaiting approval. No dataset ID exists yet. Dedicated API setup, actual permitted-event checks and billing remain. FTV-024 owns website tracking and Slack reporting; the setup is **not ready for ad launch**.

- **FTV-002 (Codex):** draft [PR #2](https://github.com/tusshar04/fitovela/pull/2), not merged. Its food-first, no-condition-result proposal conflicts with accepted D-007. Tushar to decide whether it is closed or reworked.

## Completed

- **FTV-003:** product brief rewritten around the assessment-led funnel; merged 2026-11-14.
- **FTV-001:** shared documents and workflow; [PR #1](https://github.com/tusshar04/fitovela/pull/1).

## Coordination notes

One writer is active at a time initially. For simultaneous work, the user or designated coordinator must assign distinct tasks before work starts and serialize updates to this file. Ownership recorded only in an unmerged branch is not a global reservation.

At handoff, record the owner, status, branch/worktree, commit, checks/results, open issues, and next action. Keep full history in commits rather than growing a session log here.
