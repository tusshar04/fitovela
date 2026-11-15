# Project state and handoff

Last updated: 2026-11-15

This file owns current coordination. Read [AGENTS.md](../AGENTS.md) before acting. Branch state can change after this document is written; inspect Git at every handoff. Work is merged straight into `main`; pull requests are not used ([D-010](DECISIONS.md)).

## Current stage

First working build. The full funnel runs on localhost: landing, adaptive questionnaire, result, paywall, demo checkout, generated plan, login. Nothing is deployed. Payments, email sending, SMS codes and ad tracking are not connected yet.

## Current task — FTV-004

| Field | Value |
| --- | --- |
| Goal | Build the product from the approved mockups and the doctor's answers, and run it on localhost. |
| Owner | Claude, assigned by Tushar on 2026-11-15. |
| Status | Built and merged into `main`. Awaiting the founder's review on localhost. |
| Branch | `feat/ftv-004-app` (merged). |
| Run it | `nvm use`, `npm install`, `npm run dev`, then open `http://localhost:3000`. |
| Checks | `npm test`, `npm run typecheck`, `npm run build`. Results are in the merge commit message. |
| Review | Self-review only. No independent, medical or legal review. |

### What works

- Three landing hooks (`/?h=a`, `b`, `c`; ad category with `&c=pcos|thyroid|menopause|diabetes|weightloss`).
- About 18 questions that adapt to earlier answers, with the two interstitial screens.
- Scoring, typing, eligibility and calories per [MEDICAL_RULES.md](MEDICAL_RULES.md).
- Email and mobile capture, result report, paywall with a real 15-minute launch price, demo checkout.
- Plan generator (7, 28 or 84 days), swaps, weekly grocery list, private plan link.
- Login by mobile number and one-time code; `/my-plans`.
- Funnel event log.

### Stand-ins that must be replaced before launch

| Area | Today | Needed |
| --- | --- | --- |
| Payments | Demo checkout; refuses to run in production. | Razorpay keys, order creation, signature check, webhook. |
| Email | Written to `.data/outbox/`. | A provider (tarot uses AWS SES). |
| Login codes | Shown on screen in development. | An SMS provider. |
| Storage | JSON files under `.data/`. | Firestore driver exists but has never been run against a real database. |
| Ad tracking | None. | Meta Pixel and Conversions API. |
| Reviews, live counter | Hidden. | Real ones, to come from the doctor via Tushar. |
| Photos | Unsplash stand-ins in `public/img/`. | Licensed or shot images. |
| Privacy, terms, refund policy | Placeholder pages. | Written and reviewed. |
| Medical drafts | Question list, type rules, meal library and copy written by an AI agent. | The doctor's one-time approval ([MEDICAL_RULES.md](MEDICAL_RULES.md)). |

### FTV-005 and FTV-006 — movement plan and 12-week target (Claude, 2026-11-15, merged)

After the doctor's feedback on the demo: a movement plan in every paid plan (now 60 minutes a day), a 1,200 kcal floor above the healthy BMI range, and a 12-week target with no dates, with the 12-week plan as the default tier ([D-015](DECISIONS.md)). She also asked for a 2 kg a week target; it is not built. Her 800 kcal request is built as the intensive track (FTV-010 below).

### FTV-007 — week-by-week journey (Claude, 2026-11-15, merged)

The result, paywall and plan now lead with a personalised "Your next 12 weeks" timeline; weights are supporting tags and the chart is folded under "See the numbers" ([D-016](DECISIONS.md)). The timeline lines are a draft for the doctor.

### FTV-008 and FTV-009 — doctor's journey rulings; sleeker design (Claude, 2026-11-15, merged)

The doctor's three rulings on the timeline are applied (skin at week 3, cycles line kept, "feel lighter" at about 1 kg in place of a dress-size claim). After the founder's review the whole funnel was restyled to be sleeker and weight is now mentioned once, on the week 12 stop ([D-017](DECISIONS.md)). Self-review only; checked on screen.

### FTV-010 and FTV-011 — intensive track, automatic; new prices (Claude, 2026-11-15, merged)

Women at BMI 30 and above can choose an 800 to 1,000 kcal intensive plan on the paywall ([D-018](DECISIONS.md)). On the founder's instruction it is fully automatic ([D-020](DECISIONS.md)): it opens on payment, weekly check-ins open each week, and a stop sign moves her to the standard plan. The first build's clinician review and `/review` page are removed. Prices are now INR 399, 599 and 799 ([D-019](DECISIONS.md)). The clinical settings and 31 light plates are drafts: nine points for the doctor are in [MEDICAL_RULES.md](MEDICAL_RULES.md). Self-review only; run end to end on localhost.

### Exact next step

1. Tushar reviews the build on localhost. To see the intensive option, enter a weight that gives a BMI of 30 or more (for example 88 kg at 160 cm). Confirm the regular prices shown struck through (INR 799, 1,199, 1,599).
2. Send the doctor the drafts in [MEDICAL_RULES.md](MEDICAL_RULES.md): the three earlier drafts and the nine points on the intensive track.
3. Decide the GCP project for deployment (recommended: a new project under the same account as tarot), then a deployment task: Dockerfile, Cloud Run, Firestore, secrets.

## Other open work

- **FTV-002 (Codex):** draft [PR #2](https://github.com/tusshar04/fitovela/pull/2), not merged. Its food-first, no-condition-result proposal conflicts with accepted D-007. Tushar to decide whether it is closed or reworked.

## Completed

- **FTV-003:** product brief rewritten around the assessment-led funnel; merged 2026-11-14.
- **FTV-001:** shared documents and workflow; [PR #1](https://github.com/tusshar04/fitovela/pull/1).

## Coordination notes

One writer is active at a time initially. For simultaneous work, the user or designated coordinator must assign distinct tasks before work starts and serialize updates to this file. Ownership recorded only in an unmerged branch is not a global reservation.

At handoff, record the owner, status, branch/worktree, commit, checks/results, open issues, and next action. Keep full history in commits rather than growing a session log here.
