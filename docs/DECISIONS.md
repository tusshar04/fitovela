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

- **Status:** superseded by [D-023](#d-023--prices-199-299-and-399-harder-selling-copy-less-detail-before-she-pays) the same day (the prices only; the 12-week steer stands).
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
- **Decision:** Fitovela runs in a new GCP project, `fitovela-prod`, on the billing account tarot uses: Cloud Run service `fitovela` and Firestore, both in `asia-south1`. Login codes go by SMS through tarot's 2Factor account and email through tarot's Amazon SES account, sent from `care@fitovela.com`. Payments go through Razorpay. The domain `fitovela.com` (registered at GoDaddy, DNS at Cloudflare) is served through a Cloudflare Worker that forwards to the service, as tarot's global site is, because Cloud Run cannot map a custom domain directly in Mumbai. Deploys are run by hand with `scripts/deploy.sh` from `main`.
- **Reason:** Founder instruction to deploy, reusing what tarot already has. A separate project keeps customers' health answers, costs and access apart from tarot.
- **Evidence:** Founder message of 2026-11-15. Tarot's setup was read from its repository (no secret values were read).
- **Implementation:** `Dockerfile`, `scripts/deploy.sh`, `src/server/email.ts` (SES), `src/server/auth.ts` (2Factor, with a 60-second resend wait and 5 codes an hour), `src/server/payments.ts`, `src/server/fulfil.ts` and `/api/webhooks/razorpay`. The Fitovela runtime account was given read access to one of tarot's secrets (`twofactor-api-key`); the value was never copied or displayed. Tarot's SES key is locked to tarot's own address, so Fitovela has its own send-only AWS user, `fitovela-ses-sender`, allowed to send only from `care@fitovela.com`; its key is in Fitovela's Secret Manager (`ses-access-key-id`, `ses-secret-access-key`). `auth-secret` is Fitovela's own.
- **Consequences to know:** Fitovela and tarot share the 2Factor balance and SMS template, and share SES sending limits and reputation. The Cloudflare Workers free plan allows 100,000 requests a day across the account's Workers; one visitor makes dozens of requests, so a paid-ads funnel can exceed it, and the paid plan is USD 5 a month.
- **Change made 2026-11-15:** the first version used a Google load balancer (about USD 18 a month). At the founder's request it was replaced the same day: `fitovela.com` was added to tarot's Cloudflare account on the free plan, the nameservers at GoDaddy were changed to Cloudflare's, all 14 DNS records (site, mailbox, both DKIM sets) were carried over, the Worker `fitovela-edge` was attached to `fitovela.com` and `www.fitovela.com`, "Always Use HTTPS" was switched on, Worker request logs were switched off, and the load balancer was deleted.
- **Revisit when:** Fitovela should have its own 2Factor or SES keys; deploys should run from GitHub Actions; or traffic needs more than 4 instances.
- **Supersedes:** the "nothing is deployed" state in D-011 and D-013.

## D-022 — Sell the first month; no weight on the timeline; no pill question

- **Status:** accepted; implemented.
- **Date:** 2026-11-15.
- **Decision owner:** Tushar, relaying the doctor's view that the result and paywall undersell.
- **Decision:** (1) The timeline leads with weeks 1 to 4, written to speak to what she is self-conscious about and how good it feels when it eases. Weeks 8 and 12 are folded under a small "Show weeks 8 and 12" line. (2) No stop mentions weight: the week 12 target tag and the "goal reached" and "stage 1" lines are removed. (3) The question about stopping a birth-control pill is removed, and with it the post-pill PCOS type, because few women in India use the pill for birth control.
- **Reason:** Founder instruction of 2026-11-15: "we should be selling hard targets in a month", "all the weeks milestone should be hitting user insecurity and making them feel good, no more weight loss point", and the pill page "is not applicable to indian audience".
- **Limits the agent kept, and told the founder:** the lines name her complaint easing (cravings, bloat, waistband, puffy face, skin, tiredness); they do not tell her that her body looks bad. No "will", guarantee or cure. Skin, cycles and dark patches keep "start to" or "can". Nothing is claimed about hair. The doctor's thresholds (1 kg before the clothes line, 5% before the cycles line, week 3 for skin) still decide when a line appears. The footnote that these are what many women notice stays.
- **Implementation:** `src/domain/journey.ts`, `src/ui/JourneyCard.tsx`, `src/ui/UnlockClient.tsx`, `src/domain/questions.ts`, `src/domain/typing.ts`, `src/domain/typeContent.ts`; tests in `tests/journey.test.ts` and `tests/rules.test.ts`. The new lines are listed for the doctor in [MEDICAL_RULES.md](MEDICAL_RULES.md).
- **Consequences to know:** The paywall headline is now four weeks while the tier to steer everyone to is 12 weeks ([D-019](DECISIONS.md)); watch whether the 4-week tier's share rises. Her target weight still appears in the paywall recap and the folded numbers chart. The doctor's answer 3A named four PCOS types; three are now reachable.
- **Revisit when:** The doctor rules on the new lines; Meta rejects an ad over the landing page's wording; or the tier mix moves away from 12 weeks.
- **Supersedes:** the "weight once, on the week 12 stop" part of D-017 and the "Your next 12 weeks" framing of D-016. Narrows answer 3 in D-012.

## D-023 — Prices 199, 299 and 399; harder-selling copy; less detail before she pays

- **Status:** accepted; implemented.
- **Date:** 2026-11-15.
- **Decision owner:** Tushar.
- **Decision:** (1) Launch prices are INR 199 for 1 week, 299 for 4 weeks and 399 for 12 weeks. (2) The timeline sells hard: its lines name the moments she is embarrassed by (sucking her stomach in, loose clothes to cover up, the back row in photos, relatives' comments) and take them away. (3) Before she pays, the pages say only "Your basic movement plan"; the walk and strength details appear in the plan she buys. (4) The paywall says "Protein-rich meals from everyday home food, covering your basic protein needs" in place of "Protein at every meal". (5) The "Birth-control pill" tick box is removed from the medicines question.
- **Reason:** Founder instructions of 2026-11-15: the new prices; "we need to sell hard ... your goal is to write best marketing lines for the business", with Meta's ad review his to deal with; seeing the exercise detail puts buyers off; and many women read "protein" as protein powder, which carries a taboo.
- **Evidence:** Founder messages. No conversion data. Standard plans were checked to give 58 g of protein a day or more across diets, cuisines and calorie targets, which is what the "covering" line rests on.
- **Limits the agent kept:** no "will", guarantee or cure; skin, cycles, dark patches and bloating keep "start to" or "can"; nothing about hair; the doctor's thresholds still decide when a line appears; "the first person asks" shows in week 4 only when her target loss by then is about 2.5 kg. On the intensive track the protein line drops "covering your basic protein needs", because vegetarian days there sit at about 45 g. The folded numbers on the result page still say the target assumes her meals and her movement plan every day.
- **Implementation:** `src/domain/offer.ts`, `src/domain/journey.ts`, `src/domain/typeContent.ts`, `src/ui/UnlockClient.tsx`, `src/ui/TargetCard.tsx`, `src/app/result/page.tsx`, `src/domain/questions.ts`. The regular prices after the 15-minute window (INR 399, 599 and 799, twice the launch price rounded up to end in 99) were chosen by Claude and are not confirmed by the founder.
- **Consequences to know:** At INR 399 a sale has to cover the ad cost of every visitor who does not buy; no ad-cost figure exists yet. A buyer learns that the movement plan is 60 minutes a day only after paying; the 7-day refund covers her. The paywall FAQ says "No powders or supplements", which is not true of the intensive plan (a daily multivitamin and, on low-protein days, a scoop of protein). Founder, 2026-11-15, on being shown this: both stay as they are. The FAQ line is there because women read "powders and supplements" as gym products; what the intensive plan asks for is, in his view, ordinary and accepted.
- **Revisit when:** Ad tests give a cost per purchase; refund requests cite the movement plan; or the doctor rules on the lines.
- **Supersedes:** the prices in D-019; the "never tell her that her body looks bad" limit recorded in D-022.

## D-024 — The launch-price timer restarts on every visit to the paywall

- **Status:** accepted; implemented.
- **Date:** 2026-11-15.
- **Decision owner:** Tushar.
- **Decision:** The 15-minute launch-price countdown starts again each time she opens or refreshes the paywall. The regular price (INR 399, 599, 799) is charged only if she keeps the page open until the countdown reaches zero and pays without reloading.
- **Reason:** Founder instruction of 2026-11-15, "restart every visit, lets keep it simple", after being told that a woman who left and came back after 15 minutes was shown double the price for 30 days.
- **Alternatives shown to him:** one second chance on her first return (the agent's recommendation); restart after 24 hours; leave the strict deadline.
- **Evidence:** Founder message. No conversion data.
- **Implementation:** `src/app/unlock/page.tsx` sets `offerStartedAt` on every view; `src/app/api/order/route.ts` still charges by that time. The terms page wording was changed to match.
- **Consequences to know:** The deadline is no longer a real one: a refresh brings the launch price back, and a visitor who notices may trust the page less. The page still says "Launch price held for" with a countdown. In practice almost every buyer pays the launch price, so the struck-through prices are reference prices that few or no one pays; advertising rules on reference prices have not been checked.
- **Revisit when:** Conversion data shows whether the countdown helps; or a complaint or an ad review cites the timer or the struck-through prices.
- **Supersedes:** the "countdown is real" behaviour from the first build (FTV-004).

## D-025 — Cashfree is the payment gateway; she types her details once

- **Status:** accepted; implemented; switched on in production on 2026-11-17 at the founder's instruction ("use them and enable cashfree"). A completed INR 199 payment, matching webhook acceptance and full refund were verified on 2026-11-17; actual plan opening and email arrival remain unverified (see [AD_OPERATIONS.md](AD_OPERATIONS.md)).
- **Date:** 2026-11-15.
- **Decision owner:** Tushar.
- **Decision:** Payments go through Cashfree. The buyer gives her email and mobile number once, on Fitovela (pre-filled on the paywall if she gave them at the report step). Both are sent to Cashfree with the order, so Cashfree's page asks only how she wants to pay.
- **Reason:** Founder instruction of 2026-11-15: "start the cashfree integration ... user does not have to enter information twice or basic information from user should suffice lowest friction possible".
- **Choices made by the agent, not the founder:**
  - *Full-page hand-off to Cashfree's checkout, not a pop-up.* Ad traffic opens inside the Instagram and Facebook in-app browsers, where pop-ups and UPI app links inside frames are the likelier thing to break. Not tested in those browsers.
  - *Email stays required.* A woman who pays in her UPI app and never returns to the browser gets her plan only through the emailed link.
  - *A plan is delivered only on Cashfree's word:* either its API says the order is PAID in INR for our amount when her browser returns, or a webhook signed with the secret key says so. Nothing in the return address is trusted.
  - *All payment methods are left on;* which ones show, and in what order, is set in the Cashfree dashboard.
  - API version `2026-01-01`, read from Cashfree's documentation on 2026-11-15.
- **Evidence:** Founder message; Cashfree documentation (create order, get order, payments for an order, webhook signature, web checkout). No payment has been run against Cashfree.
- **Implementation:** `src/server/payments.ts`, `src/app/api/order/route.ts`, `src/app/api/order/return/route.ts`, `src/app/api/webhooks/cashfree/route.ts`, `src/app/api/order/confirm/route.ts`, `src/ui/UnlockClient.tsx`, `scripts/deploy.sh` (`CASHFREE_ENABLED`). The privacy page now names Cashfree and says what is passed to it.
- **Consequences to know:** The Razorpay code written earlier stays in the repo, unused unless its keys are set; remove it once Cashfree has taken real payments. Refunds are made by hand in the Cashfree dashboard.
- **Revisit when:** Keys arrive (run a sandbox payment, then one real payment); payment drop-off inside in-app browsers is measured; or email turns out to cost sales.
- **Supersedes:** "Razorpay ... added later" in D-013 and the Razorpay wiring described in D-021.

## Adding or changing a decision

Assign the next stable ID and record status, date, owner, choice, reason, evidence, implementation status, and revisit conditions. Identify who accepted a decision; do not represent an agent suggestion as founder approval.

For a changed decision, preserve the old record, mark it superseded, and link to the replacement. Record rejected alternatives only when the reason will prevent repeated debate. Evidence can be a dated founder instruction, PR/commit, primary source, experiment, or reproducible check.

## D-026 — Record visitor behaviour in our own event log, never her answers

- **Status:** accepted; implemented (FTV-029). Release state is in [STATE.md](STATE.md).
- **Date:** 2026-11-18.
- **Decision owner:** Tushar.
- **Decision:** The site records how every page is used: page views, seconds on screen, scroll depth, sections seen, taps (on buttons and on things that are not buttons), form boxes touched, load speed and script errors, plus named moments in the assessment and on the prices page. The record goes to the `events` collection in our own database and is read with `scripts/funnel-report.mjs`.
- **Reason:** Founder instruction of 2026-11-18, after the first 40 minutes of ads produced visits and no assessment starts and the site could not say what those visitors did: "capture as many events as we can ... we need to learn from user behaviours drops and clicks everything".
- **Choices made by the agent, not the founder:**
  - *Answers stay out of the event log.* An event names the question she is on, never the option she picked or anything she typed; on the assessment, plan and account pages a tap is recorded by the kind of element only. Her answers are already saved with her session, so nothing is lost. Email addresses and long numbers are masked before an event is stored.
  - *First-party only.* Nothing in this log is sent to Meta or any other company. The Meta Pixel and Conversions API remain off ([AD_OPERATIONS.md](AD_OPERATIONS.md)).
  - *No new cookie.* A random visit number is kept in the browser tab's session storage and links what she did before tapping her age to the session that follows.
  - *The browser cannot write funnel or payment events.* It may send only a fixed list of behaviour names; "payment_confirmed" and the other server events can be written by the server alone.
  - *The privacy page was reworded* to say this is collected. The founder has not read the new wording.
- **Evidence:** Founder message. On 2026-11-18 production had 61 landing loads from the Facebook and Instagram apps and no way to tell a preloaded page from a person who read it.
- **Implementation:** `src/server/events.ts`, `src/app/api/event/route.ts`, `src/ui/track.ts`, `src/ui/Tracker.tsx`, `scripts/funnel-report.mjs`, `tests/events.test.ts`; `data-sec` and `data-ev` marks on the landing, report and prices pages.



## D-027 — separate commerce measurement from assessment information

- **Date:** 2026-11-18
- **Status:** accepted; implementation in FTV-030, release status in STATE.md. The "optional" part (asking her first) is superseded by [D-028](#d-028--ad-measurement-is-on-by-default-no-banner); what is sent is unchanged.
- **Owner instruction:** install Pixel and CAPI and activate the existing Purchase campaign. Fitovela is a diet/nutrition company; do not send report information to Meta. This supersedes the inferred FTV-028 internal approval hold, not any actual Meta platform restriction.
- **Decision:** optional advertising measurement with generic public landing and verified paid Cashfree Purchase events, explicit field allowlists, browser/server deduplication and retryable transactional delivery. An image Pixel avoids third-party JavaScript accessing assessment/report pages. No assessment, health, contact, meal-preference or private-link data is sent. Detailed first-party behaviour tracking from D-026 remains internal.
- **Launch scope:** status-only activation of the existing seven approved ads, Purchase ad set and Sales campaign at INR 1,000/day, women 18–60 in India, existing Facebook/Instagram placements and exact creatives. Old Traffic and failed duplicate static ads stay paused. No claim that receipt alone establishes conversion processing or profitable delivery.

## D-028 — Ad measurement is on by default; no banner

- **Date:** 2026-11-18
- **Status:** accepted; implemented in FTV-032, release status in STATE.md. Supersedes the opt-in prompt of D-027.
- **Owner instruction:** "remove the banner", and, when asked what should then happen to Meta's signals, "On for everyone".
- **Evidence:** the FTV-030 "Allow ad measurement?" banner was pinned to the bottom of the landing page. Measured on the live site at 393 x 740 it covered all four age buttons, and at 360 x 640 the two on screen. The only real ad visitor that morning (Instagram, Android, 07:08 IST) tapped the "Tap your age to begin" label seven times in four seconds, chose "No thanks", and only then could tap her age. Because she declined, Meta would not have been told had she paid. The dataset had received one PageView in total, from a test.
- **Decision:** nothing is asked on the landing page. A browser with no stored choice has measurement switched on at its first landing, and the stored record says it was the default (`basis: 'default'`) rather than her choice. A stored "off" always wins: the default can never switch it back on. Off is kept in a cookie that lasts 400 days (the longest a browser allows) and is renewed at every landing; if she clears her cookies, or stays away longer, the default applies again. The privacy page states that it is on without asking and keeps the on/off control.
- **Unchanged:** what is sent (a public landing PageView and a verified paid Purchase with amount and currency, click and browser identifiers) and what is never sent (answers, results, measurements, contact details, report, plan, private links). Turning it off is still checked before the server and the browser send a Purchase.
- **Limit:** this is opt-out, not consent. No lawyer has reviewed it against Indian data-protection law, and the founder has not read the new privacy wording. Anyone who chose "No thanks" on the old banner stays off, though her cookie from that banner lasts 90 days unless she lands again, which renews it to 400. The privacy page promises an email before a significant change applies; none was sent, and whether any real person has left an email address was not checked.

## D-029 — Sell the standard plan to four groups that were told "talk to us first"

- **Date:** 2026-11-18
- **Status:** accepted; implemented in FTV-034, release status in STATE.md. Narrows the exclusion list of the doctor's answer 5 ([MEDICAL_RULES.md](MEDICAL_RULES.md)).
- **Owner instruction:** "we dont sell plan if someone clicks on diabetes or anything and we say talk to us.. no need, doctor said our meal plans are solid, we can sell them as well. so remove that talk to us and start selling to all". Asked which of the six groups, the founder chose: all but pregnant or breastfeeding and under 18.
- **Decision:** type 1 diabetes or insulin, kidney disease, eating-disorder history and BMI under 18.5 can buy the standard plan. Pregnant or breastfeeding women and under-18s still see "talk to us first", because the plan cuts calories to as low as 1,200 a day and for them the cut itself is the risk.
- **No doctor line:** Claude proposed that the four groups always see "Show this plan to your doctor before you start"; the founder declined ("this but with no doctor line"). They see it only if they also take metformin or thyroid tablets.
- **Added by Claude, not asked for:** the four groups are never given the intensive (800 to 1,000 kcal) track, which is otherwise chosen automatically at BMI 30 and above; and an underweight woman's calorie target covers her movement plan, so that the plan is not set to make her lose.
- **Evidence and limits:** the doctor's view reached the project through the founder; there is nothing from her in writing. Four points are open for her and listed in MEDICAL_RULES.md: an unchanged insulin dose on a lower-carbohydrate plan with no warning, protein at every meal for a kidney patient, calorie and weight figures shown to a woman with an eating disorder, and the full movement plan and timeline lines for an underweight woman.

## D-030 — The report is paid: the paywall comes straight after the questions

- **Date:** 2026-11-18
- **Status:** accepted; implemented in FTV-035, release status in STATE.md. Supersedes the "free report, paid diet" split of [D-007](#d-007--the-assessment-is-the-product-the-diet-is-the-unlock); the "Your symptoms match…" wording of the doctor's answer 1 is unchanged and now appears in the paid report.
- **Owner instruction:** "i believe people are coming to see the diagnosis and dropping.. can we hide the diagnosis result and make people pay by building the curiosity on the paywall page.. so that they pay to get answers and diet together".
- **Decision:** a woman who can buy never sees `/result`; it sends her to `/unlock`. The paywall opens with a locked report: her type blurred, how strongly her answers match (a label and a coarse bar), the number of signs found, how many of the four systems stand out, and locked rows. Her report opens with her paid plan at `/plan/<token>/report`, linked from the top of the plan and from the plan email. A woman who cannot buy (pregnant or breastfeeding, under 18) still gets her report free, since there is nothing to sell her.
- **What is still free, chosen by Claude:** the number of signs found, how many systems stand out, and the strength label. They keep "free symptom check" from being empty, and they are the curiosity hook. The type, its description, each system's level and "what it means" are not sent to the paywall page at all; the blurred text is a stand-in. "x of y markers matched" is left out because y differs for every type and would name it.
- **Not hidden, and known:** the questions themselves still show a count of signals per area and, on "What we see so far", a line such as "Your answers show signs linked to PCOS and insulin resistance"; the paywall's recap of her own signs and its plan lines differ by type; and a woman who ticks "pregnant or breastfeeding" gets the report free. The paywall has no strength bar only for the routine-led type, so its absence marks that type; a few rare sign counts fit one type only, which she could work out only with the scoring rules. A woman with no signs is still told her report "names your type"; what she buys says no strong hormonal pattern was found. A woman who has paid and comes back to `/result` or `/unlock` sees the paywall; her report is behind her email link and the login.
- **Wording changed with it:** the landing page no longer says "your free report", "opens when you finish", "you get a score for each one, and your type" or "see what your body has been trying to tell you"; the tag reads "Free assessment · 2 minutes". The hook headlines ("Find out why.", "Which one is yours?") and "Your report is ready" on the email step stay. The email step says "Continue", and that the report and plan are sent "when you unlock them".
- **Evidence and limits:** on 18 November, 11:30 to 14:07 IST, 5 ad visitors finished the questions, all 5 went on from the report to the prices, 1 tapped pay and none paid. That is too few people to show that the free report is why they left; this is the founder's judgement, to be tested by the next visitors. **The live ad text still says "Explore your report" and the video end cards say "Take the free check"; the "First four weeks" static says "Get your free report"; the quiz video shows the type and the four scores as screens she reaches free.** Those are in Meta and are the founder's to change. A woman who expected a free result may leave or ask for a refund; watch both.
