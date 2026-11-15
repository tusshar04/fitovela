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

After the doctor's feedback on the demo: a movement plan in every paid plan (now 60 minutes a day), a 1,200 kcal floor above the healthy BMI range, and a 12-week target with no dates, with the 12-week plan as the default tier ([D-015](DECISIONS.md)). She also asked for 800 kcal plans and a 2 kg a week target; neither is built. A supervised "intensive" track is on offer as the way to do 800 kcal; see [MEDICAL_RULES.md](MEDICAL_RULES.md).

### FTV-007 — week-by-week journey (Claude, 2026-11-15, merged)

The result, paywall and plan now lead with a personalised "Your next 12 weeks" timeline; weights are supporting tags and the chart is folded under "See the numbers" ([D-016](DECISIONS.md)). The timeline lines are a draft for the doctor.

### Exact next step

1. Tushar reviews the build on localhost, and decides with the doctor whether to run a supervised intensive track.
2. Send the doctor the three drafts in [MEDICAL_RULES.md](MEDICAL_RULES.md) for approval.
3. Decide the GCP project for deployment (recommended: a new project under the same account as tarot), then a deployment task: Dockerfile, Cloud Run, Firestore, secrets.

## Other open work

- **FTV-002 (Codex):** draft [PR #2](https://github.com/tusshar04/fitovela/pull/2), not merged. Its food-first, no-condition-result proposal conflicts with accepted D-007. Tushar to decide whether it is closed or reworked.

## Completed

- **FTV-003:** product brief rewritten around the assessment-led funnel; merged 2026-11-14.
- **FTV-001:** shared documents and workflow; [PR #1](https://github.com/tusshar04/fitovela/pull/1).

## Coordination notes

One writer is active at a time initially. For simultaneous work, the user or designated coordinator must assign distinct tasks before work starts and serialize updates to this file. Ownership recorded only in an unmerged branch is not a global reservation.

At handoff, record the owner, status, branch/worktree, commit, checks/results, open issues, and next action. Keep full history in commits rather than growing a session log here.
