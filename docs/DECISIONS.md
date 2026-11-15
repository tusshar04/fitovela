# Decisions

This file owns the rationale and history of important decisions. Current product requirements live in [PRODUCT.md](PRODUCT.md); working rules live in [AGENTS.md](../AGENTS.md). Link to those sources instead of maintaining duplicate specifications here.

Statuses: **proposed**, **accepted**, **superseded**, or **rejected**. Acceptance does not prove implementation; record implementation evidence separately.

## D-001 — Shared repository record

- **Status:** accepted.
- **Date:** 2026-11-14.
- **Decision owner:** Tushar.
- **Decision:** Codex and Claude use one versioned set of working rules, product context, decisions, task state, and verified learnings. Every topic has one canonical home.
- **Reason:** Avoid repeated discovery, conflicting documents, and dependence on individual conversations or private memories.
- **Evidence:** The founder accepted the proposed working agreement and requested creation of its documents.
- **Implementation:** The document map is in [README.md](../README.md); `CLAUDE.md` imports `AGENTS.md` rather than copying its contents.
- **Revisit when:** The structure cannot support actual tasks without duplication. Add specialized documents only when needed.
- **Supersedes:** nothing.

## D-002 — Task ownership and evidence-based review

- **Status:** accepted.
- **Date:** 2026-11-14.
- **Decision owner:** Tushar.
- **Decision:** Use one owner per task, sequential work initially, and isolated worktrees for concurrent implementation. Review significant changes independently and preserve verified corrections in the shared record.
- **Reason:** Prevent overlapping edits and make disagreements resolvable through evidence.
- **Evidence:** The founder accepted the proposed working agreement and confirmed separate worktrees.
- **Implementation:** The ownership, review, and handoff rules are in [AGENTS.md](../AGENTS.md). Coordination is currently manual; no automatic Codex-to-Claude dispatch is configured.
- **Revisit when:** Multiple concurrent tasks justify additional coordination tooling.
- **Supersedes:** nothing.

## D-003 — Feature branches, main integration, and future production

- **Status:** accepted; its pull-request requirement is superseded by D-010. Deployment and enforcement not yet implemented.
- **Date:** 2026-11-14.
- **Decision owner:** Tushar.
- **Decision:** Work happens on task branches in separate worktrees and reaches `main` through PRs. `main` is the intended source of future production deployments.
- **Reason:** Keep changes reviewable and connect production releases to integrated, verified revisions.
- **Evidence:** The founder explicitly requested feature branches merged into `main`, with future production deployment triggered from that flow.
- **Implementation:** Branch/worktree/PR conventions are documented. CI checks, branch protections, hosting, preview deployments, production triggers, and rollback remain a future infrastructure task.
- **Bootstrap note:** The repository had no commits or remote branches. One empty root commit established `main` so the foundation itself could be delivered through a feature-branch PR. This does not establish an ongoing direct-push exception.
- **Revisit when:** Selecting hosting and release controls. Any alternative production branch strategy requires an explicit decision.
- **Supersedes:** nothing.

IDs D-004 to D-006 are used by proposals in draft [PR #2](https://github.com/tusshar04/fitovela/pull/2) and are left unused here to avoid a clash.

## D-007 — The assessment is the product; the diet is the unlock

- **Status:** accepted.
- **Date:** 2026-11-14.
- **Decision owner:** Tushar.
- **Decision:** The funnel leads with a free symptom assessment across PCOS / PCOD signs, insulin resistance, inflammation and thyroid, plus meal preferences. It tells the visitor which pattern her answers match, then sells the diet plan for that pattern as a paid unlock. The questionnaire should feel like a diagnosis taking place.
- **Reason:** The founder named this the most crucial USP. A funnel that leads with "diet plan" does not differentiate.
- **Evidence:** Founder instruction in the 2026-11-14 design session, after reviewing mockups that led with a diet plan.
- **Implementation:** Mockups only; see [PRODUCT.md](PRODUCT.md). No assessment logic exists.
- **Revisit when:** The doctor's answers limit what a questionnaire may report, or test ads show the assessment hook does not convert.
- **Supersedes:** nothing merged. It conflicts with proposed D-005 in draft PR #2 (food profile, no condition result).

## D-008 — Quiz-funnel style and visual direction

- **Status:** accepted.
- **Date:** 2026-11-14.
- **Decision owner:** Tushar.
- **Decision:** Follow the global quiz-funnel pattern (BetterMe, Reverse Health, Noom) localised for India: age tiles as the first tap, one question per screen, a mid-quiz finding, a prediction chart, and a paywall with a timed offer and three tiers priced per day. Light pages, bold sans headlines with an italic serif accent, rani pink and deep plum, real photography.
- **Reason:** The founder rejected a first set of generic mockups and asked for the selling style of the category leaders. Offered the quiz funnel or the Indian long sales page (ToneOp), he chose the quiz funnel.
- **Evidence:** Founder's choices and "this is good" on the revised mockups, 2026-11-14.
- **Implementation:** [Fitovela Funnel Mockups](https://claude.ai/artifact/Vvvz5B2DvDZVXSqYZXJ1Ar). Photos are Unsplash stand-ins approved for mockups only.
- **Revisit when:** Real ad tests favour another structure.
- **Supersedes:** nothing.

## D-009 — Result wording and medical rules wait for the doctor

- **Status:** superseded by D-012. The doctor chose the "your symptoms match" wording and answered the open rules.
- **Date:** 2026-11-14.
- **Proposer:** Claude; no founder or medical approval claimed.
- **Proposal:** Word the result as "Your symptoms match [type]" with a line that it is not a medical diagnosis and which tests confirm it. Treat scoring cut-offs, exclusions, calorie floor, prediction pace and named PCOS types as open until the doctor picks an option for each on the [sign-off sheet](https://claude.ai/artifact/3WNH2yX9op8Ly7Dq5Ve3yT).
- **Reason:** A questionnaire cannot establish a condition, and a flat "you have PCOS" is the claim most likely to cause legal or ad-account trouble. The diagnostic feel comes from the structure of the assessment.
- **Evidence:** None beyond reasoning; no legal or clinical review yet.
- **Implementation:** Mockup wording and sample values only.
- **Revisit when:** The doctor returns her twelve answers.
- **Supersedes:** nothing.

## D-010 — Merge directly into main; no pull requests

- **Status:** accepted.
- **Date:** 2026-11-14.
- **Decision owner:** Tushar.
- **Decision:** Agents work on a task branch and merge it straight into `main`, then push. Pull requests are not used.
- **Reason:** The founder does not want PRs as a step between finished work and `main`.
- **Evidence:** Founder instruction on 2026-11-14: "do not create prs, just directly merge, change the rule if anywhere it says".
- **Implementation:** [AGENTS.md](../AGENTS.md) and [README.md](../README.md) updated; the PR template removed.
- **Revisit when:** Production deployment from `main` is configured, since every merge would then be a release.
- **Supersedes:** the pull-request requirement in D-003. Task branches, separate worktrees and `main` as the future production source still stand.

## D-011 — Technology stack

- **Status:** accepted.
- **Date:** 2026-11-15.
- **Decision owner:** Tushar (approved the build plan).
- **Decision:** TypeScript on Node 24, Next.js (App Router). Firestore in production; JSON files under `.data/` on localhost behind the same `Store` interface. Container on Cloud Run later, in the same GCP account as tarot.
- **Reason:** Matches tarot's runtime, database and hosting, so there is one set of tools to operate. Firestore has no server to manage and no fixed monthly cost. The Firestore emulator needs Java, which is not installed locally, hence the file driver for development.
- **Evidence:** Tarot's `.nvmrc`, Dockerfile and Firestore usage, inspected 2026-11-15. Founder approved the plan and confirmed Firestore for both projects.
- **Implementation:** Built. The Firestore driver has not been run against a real database yet.
- **Revisit when:** Funnel analysis needs queries Firestore handles badly; Postgres was the considered alternative.
- **Supersedes:** nothing.

## D-012 — The doctor's twelve answers are the medical rules

- **Status:** accepted; three drafts still need her approval.
- **Date:** 2026-11-15.
- **Decision owner:** Tushar, relaying the doctor's answers `1A 2A 3A 4A 5A 6A 7C 8B 9B 10A 11C 12A`.
- **Decision:** The app follows her answers as recorded in [MEDICAL_RULES.md](MEDICAL_RULES.md): "your symptoms match" wording, four areas, four PCOS types, simple-count scoring, the exclusion list, calories never below BMR, pace capped at 1 kg a week, five suggested tests, low-GI Indian meals with protein at every meal, and no naming of the doctor.
- **Reason:** These are medical judgements and hers to make.
- **Evidence:** Answer code pasted by the founder on 2026-11-15.
- **Implementation:** Built and unit-tested. The question list, type-selection rules and meal library were drafted by an AI agent and are not yet approved by her.
- **Revisit when:** Her three-monthly review (next due 2027-02-15), or when she reviews the drafts.
- **Supersedes:** D-009.

## D-013 — Plan by email, login by mobile number, payments and tracking later

- **Status:** accepted.
- **Date:** 2026-11-15.
- **Decision owner:** Tushar.
- **Decision:** The plan is delivered by email, not WhatsApp. The mobile number is collected so customers can log in with a one-time code. Razorpay and the Meta Pixel are added later. Reviews and the live counter wait for real figures from the doctor.
- **Reason:** Founder instruction during the build.
- **Evidence:** Founder message on 2026-11-15.
- **Implementation:** Email and mobile are captured before the result; email content is written to a local outbox; login codes are shown on screen in development; checkout is a demo that refuses to run in production.
- **Revisit when:** Providers are chosen for email, SMS and payments.
- **Supersedes:** the WhatsApp delivery and check-in in earlier mockups.

## D-014 — Lead with a 4-week target built from meals plus movement; no targets the plan cannot reach

- **Status:** superseded by D-015. The founder and doctor did not accept the 4-week framing.
- **Date:** 2026-11-15.
- **Proposer:** Claude. The founder asked for a dynamic target of about 10% of body weight in 4 weeks, after the doctor asked for an inspiring target such as 10 kg in 5 weeks and for cardio and strength guidance.
- **Proposal:** Add a movement plan to every paid plan. Lead the result and paywall with a 4-week target and milestones at the pace her calories and movement actually deliver, capped at 1 kg a week. Do not show a target the plan cannot reach.
- **Reason:** A near-term target and a push to move answer the doctor's concern. A figure of 10% in 4 weeks needs a daily shortfall larger than most users' total daily burn, so printing it on a personal report would be a false claim to a paying customer, with refund, complaint and ad-account consequences, and it conflicts with the doctor's answers 7 and 8.
- **Evidence:** Arithmetic in [MEDICAL_RULES.md](MEDICAL_RULES.md). No conversion data yet for either framing.
- **Implementation:** `src/domain/energy.ts`, `src/ui/TargetCard.tsx`, the paywall and the plan page. Unit-tested.
- **Revisit when:** The doctor answers the two open questions (calorie floor, movement minutes), or ad tests show the target framing does not convert.
- **Supersedes:** the single far-off goal date on the result page.

## D-015 — 12-week transformation: 1,200 kcal floor, an hour of movement a day, no dates

- **Status:** accepted for the parts built; two requests not built and open.
- **Date:** 2026-11-15.
- **Decision owner:** Tushar, relaying the doctor.
- **Decision:** Show a 12-week target with week 4 and 8 milestones and no dates (founder's suggestion: "reach your goal in at most 3 months"). Calorie floor 1,200 kcal and 60 minutes of exercise a day (doctor). The 12-week plan is the default tier. The 7-day money-back guarantee stays.
- **Not built:** the doctor also offered to go as low as 800 kcal a day and asked for a target of 2 kg a week. Claude declined both for a self-serve plan: 2 kg a week cannot be reached by most users even on 800 kcal, and an unsupervised 800 kcal diet for anyone who pays carries a real risk of harm. A supervised intensive track for BMI 30 and above was offered instead.
- **Reason:** A near, concrete target sells; the figure must still be what the plan delivers.
- **Evidence:** Arithmetic and reasoning in [MEDICAL_RULES.md](MEDICAL_RULES.md). No conversion data yet.
- **Implementation:** `src/domain/energy.ts`, `src/ui/TargetCard.tsx`, the paywall, the plan generator and the plan page. Unit-tested. The BMI 23 threshold for the strict rule and the healthy-minimum goal guard were added by Claude and need the doctor's approval.
- **Revisit when:** The founder and doctor decide on a supervised intensive track, or ad tests show the framing does not convert.
- **Supersedes:** D-014, and the doctor's first answers 7 and 8 in D-012.

## D-016 — Sell the week-by-week experience; the numbers support it

- **Status:** accepted for the approach; the wording is a draft.
- **Date:** 2026-11-15.
- **Decision owner:** Tushar.
- **Decision:** Lead the result and paywall with a week-by-week timeline of what she is likely to feel and see ("week 1 you feel it, week 2 your clothes notice…"), personalised from her own answers. Weights become small tags; the chart is folded away. Lines are worded as likely, not promised. Price, the 1,200 kcal and hour-a-day requirement, and the not-a-diagnosis line stay visible.
- **Reason:** The founder judged that a weight figure alone will not sell and asked for a presentation that motivates. Her own complaints, answered week by week, are more persuasive than a number and stay truthful.
- **Evidence:** Founder instruction on 2026-11-15. The individual claims are plausible for a low-GI, protein-forward plan with daily walking but have not been reviewed by the doctor.
- **Implementation:** `src/domain/journey.ts`, `src/ui/JourneyCard.tsx`, result page, paywall and plan page. Unit-tested, including a check that no line uses "will", "guarantee" or "cure".
- **Revisit when:** The doctor reviews the lines, or real customer feedback shows which changes women actually report.
- **Supersedes:** nothing; it sits on top of D-015.

## D-017 — A sleeker interface, and weight mentioned once

- **Status:** accepted and implemented.
- **Date:** 2026-11-15.
- **Decision owner:** Tushar.
- **Decision:** (1) Restyle the whole funnel to be sleeker: white cards with hairline borders and soft shadows in place of pink-filled blocks and thick borders, lighter type weights, thinner progress and level bars, sentence-case buttons, and a quiet timeline. The colours, fonts, logo and the direct-response structure (timer, tiers, locked diet, FOMO) stay. (2) Stop repeating weight. On the result and paywall her target weight appears once, on the week 12 stop of the timeline, plus her goal in the paywall recap; the full numbers stay folded under "See your 12-week numbers". The "Now / In 12 weeks" weight table on the paywall is removed. The result page gets a pinned "Unlock my diet plan" button.
- **Reason:** Founder feedback on the localhost build: "design is not that sleek and avoid mentioning weight too many places".
- **Evidence:** Founder instruction on 2026-11-15. Checked on screen for the landing page, a question, the reading screen, the result, the paywall and a bought plan.
- **Implementation:** `src/app/globals.css`, `src/app/result/page.tsx`, `src/ui/JourneyCard.tsx`, `src/ui/TargetCard.tsx`, `src/ui/UnlockClient.tsx`, `src/app/page.tsx`, `src/domain/journey.ts`. A unit test fails if the timeline wording contains "kg", "weight" or "scale".
- **Revisit when:** The founder reviews it, or ad tests show the weight number converts better than its absence.
- **Supersedes:** the "weights become small tags" part of D-016. Refines D-008 (visual style) without replacing it.

## D-018 — 800 kcal only as a clinician-reviewed intensive track

- **Status:** partly superseded by [D-020](#d-020--the-intensive-track-is-fully-automatic): the clinician review, the pause and `/review` are removed. The track, who is offered it, the light plates, the check-ins and the 12-week limit stand.
- **Date:** 2026-11-15.
- **Decision owner:** Tushar, on the doctor's approval of a minimum of 800 kcal.
- **Decision:** Offer 800 to 1,000 kcal a day as a separate "intensive" track next to the standard plan. It is offered only at BMI 30 and above (ages 18 to 60, no exclusions), the plan stays closed until a clinician approves that woman on `/review`, each new week opens only after a weekly check-in, a stop sign pauses the plan and returns her to the clinician, and it runs 12 weeks at most with a 4-week break before a repeat. The standard plan keeps its 1,200 kcal floor.
- **Reason:** The doctor wants faster loss and approved going as low as 800 kcal. A diet that low is safe to sell only with someone looking at each woman, so the approval is implemented as the supervised track rather than as a lower floor for every buyer.
- **Evidence:** Founder message of 2026-11-15 ("she gave approval for min 800"). Whether she approved this exact supervised design, or expected 800 for everyone, was not confirmed; the build follows the design offered to her earlier ([MEDICAL_RULES.md](MEDICAL_RULES.md)).
- **Implementation:** `src/domain/intensive.ts`, `src/domain/energy.ts` (`track`), `src/domain/plan/lightMeals.ts`, `src/server/plans.ts`, `src/app/review`, `src/app/api/review`, `src/app/api/plan/checkin`, the paywall and the plan page. 12 unit tests. Run end to end on localhost: purchase, pending screen, approval with a note, weekly check-in, stop sign and pause, reopen, move to standard, and refusal below BMI 30.
- **Revisit when:** The doctor rules on the ten open points in MEDICAL_RULES.md; pricing for the track is decided (today it costs the same as the standard plan); or the email provider is connected.
- **Supersedes:** the "800 kcal is not built" part of D-015.

## D-019 — Prices: 399, 599 and 799

- **Status:** accepted and implemented.
- **Date:** 2026-11-15.
- **Decision owner:** Tushar.
- **Decision:** Launch prices are INR 399 for 1 week, 599 for 4 weeks and 799 for 12 weeks. The 12-week plan is the one everyone should buy: it stays the default and is labelled "Most popular · Best value". The intensive track costs the same as the standard plan.
- **Reason:** Founder instruction: keep pricing reasonable and steer everyone to 12 weeks. The small step from 599 to 799 makes the 12-week plan the obvious choice (INR 10 a day against 21 and 57).
- **Evidence:** Founder message of 2026-11-15. No conversion data.
- **Implementation:** `src/domain/offer.ts`. The regular prices charged after the 15-minute window (INR 799, 1,199 and 1,599, twice the launch price) were chosen by Claude and are not confirmed by the founder.
- **Revisit when:** The founder sets the regular prices, or ad tests show a different ladder converts better.
- **Supersedes:** the tier prices proposed in PRODUCT.md (199, 499, 999).

## D-020 — The intensive track is fully automatic

- **Status:** accepted and implemented; the clinical settings remain drafts awaiting the doctor.
- **Date:** 2026-11-15.
- **Decision owner:** Tushar.
- **Decision:** No person reviews an intensive order. The plan opens on payment. The 800 to 1,000 kcal track is still not for everyone: only BMI 30 and above, ages 18 to 60, no exclusions. Two automatic refusals are added in place of the review (an unnamed prescription medicine; a recent change of thyroid dose), and a stop sign at a weekly check-in now moves the woman to the standard plan by itself instead of waiting for a clinician. The `/review` page and its sign-in are deleted, and the site no longer says a clinician reviews anything.
- **Reason:** Founder instruction: "it will be automatic… all cases will be automatic", and 800 kcal is "not for everyone". The doctor is not available to review each order.
- **Evidence:** Founder message of 2026-11-15. Claude had earlier declined an automatic 800 kcal plan for every buyer; it built this because the track is limited to women with obesity, screened by the questionnaire, capped at 12 weeks and stopped automatically on warning signs, which is close to how self-directed 800 kcal programmes are sold. The remaining risk (untruthful answers, conditions the questionnaire does not ask about) is recorded in [MEDICAL_RULES.md](MEDICAL_RULES.md) and was accepted by the founder.
- **Implementation:** `src/domain/intensive.ts`, `src/app/api/plan/checkin`, `src/app/api/order`, the paywall and the plan page. 13 unit tests. Run on localhost: intensive purchase opens at once, clean check-ins open weeks, a stop sign switches the plan to standard, an unnamed medicine is refused, `/review` returns 404.
- **Revisit when:** The doctor rules on the nine open points, or a customer reports harm or a near miss.
- **Supersedes:** the review, pause and `/review` parts of D-018.

## D-021 — Production: its own GCP project, Cloud Run in Mumbai, tarot's SMS and email accounts

- **Status:** accepted; partly live (see [STATE.md](STATE.md) for what is switched on).
- **Date:** 2026-11-15.
- **Decision owner:** Tushar.
- **Decision:** Fitovela runs in a new GCP project, `fitovela-prod`, on the billing account tarot uses: Cloud Run service `fitovela` and Firestore, both in `asia-south1`. Login codes go by SMS through tarot's 2Factor account and email through tarot's Amazon SES account, sent from `care@fitovela.com`. Payments go through Razorpay. The domain `fitovela.com` (registered at GoDaddy) points at a Google load balancer in front of the service, because Cloud Run cannot map a custom domain directly in Mumbai. Deploys are run by hand with `scripts/deploy.sh` from `main`.
- **Reason:** Founder instruction to deploy, reusing what tarot already has. A separate project keeps customers' health answers, costs and access apart from tarot.
- **Evidence:** Founder message of 2026-11-15. Tarot's setup was read from its repository (no secret values were read).
- **Implementation:** `Dockerfile`, `scripts/deploy.sh`, `src/server/email.ts` (SES), `src/server/auth.ts` (2Factor, with a 60-second resend wait and 5 codes an hour), `src/server/payments.ts`, `src/server/fulfil.ts` and `/api/webhooks/razorpay`. The Fitovela runtime account was given read access to one of tarot's secrets (`twofactor-api-key`); the value was never copied or displayed. Tarot's SES key is locked to tarot's own address, so Fitovela has its own send-only AWS user, `fitovela-ses-sender`, allowed to send only from `care@fitovela.com`; its key is in Fitovela's Secret Manager (`ses-access-key-id`, `ses-secret-access-key`). `auth-secret` is Fitovela's own.
- **Consequences to know:** Fitovela and tarot share the 2Factor balance and SMS template, and share SES sending limits and reputation. The load balancer costs roughly USD 18 a month before traffic.
- **Change agreed 2026-11-15:** the founder asked to drop the load balancer and serve the domain through Cloudflare, as tarot does. The proxy Worker is in `edge/`. It needs `fitovela.com` added to the Cloudflare account and the nameservers moved from GoDaddy; until that is done the load balancer still serves the domain. The Workers free plan allows 100,000 requests a day, which a paid-ads funnel can exceed; the paid plan is USD 5 a month.
- **Revisit when:** Fitovela should have its own 2Factor or SES keys; deploys should run from GitHub Actions; or traffic needs more than 4 instances.
- **Supersedes:** the "nothing is deployed" state in D-011 and D-013.

## Adding or changing a decision

Assign the next stable ID and record status, date, owner, choice, reason, evidence, implementation status, and revisit conditions. Identify who accepted a decision; do not represent an agent suggestion as founder approval.

For a changed decision, preserve the old record, mark it superseded, and link to the replacement. Record rejected alternatives only when the reason will prevent repeated debate. Evidence can be a dated founder instruction, PR/commit, primary source, experiment, or reproducible check.
