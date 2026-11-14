# Product brief

Last updated: 2026-11-14

Status: the founder has accepted the product hook, the funnel shape and the visual direction. Medical rules are waiting for the doctor's sign-off. Nothing is built. This document owns the current product understanding; [Decisions](DECISIONS.md) records why.

## Fitovela in one paragraph

Women in India arrive from a Meta ad about weight that will not move. A free two-minute symptom assessment checks her answers against four possible causes, tells her which pattern they match, and shows her a report. Her diet plan for that pattern, built from the food she already cooks, stays locked until she pays.

## The hook (accepted, [D-007](DECISIONS.md#d-007--the-assessment-is-the-product-the-diet-is-the-unlock))

The assessment is what we sell first. The diet plan is what the result unlocks.

- She should feel that she is being assessed, step by step, and that the result is about her.
- The questionnaire checks four areas: PCOS / PCOD signs, insulin resistance, inflammation, thyroid.
- The result names a type (for example "Insulin-resistant PCOS type"), scores each area Low, Moderate or High, and explains what it means for her weight.
- Food preferences are collected inside the same flow, so the locked plan is already "hers" when she reaches the paywall.

A funnel that opens with "get a diet plan" misses this. Every screen before the paywall should build curiosity about the result.

## Customer journey

| # | Screen | What she sees | Why it is there |
| --- | --- | --- | --- |
| 1 | Landing | "Free 2-minute symptom assessment", a headline matched to the ad, four causes we check, age tiles as the first tap. | The ad click turns into the first answer with no extra step. |
| 2 | Questions | One question per screen, grouped as Hormones, Insulin, Inflammation, Thyroid, Food. A live count of signals found. | Feels like an assessment in progress, not a form. |
| 3 | Early finding | Mid-way: "We are seeing a pattern", signals per area, two areas still unchecked. | Rewards effort and gives a reason to finish. |
| 4 | Food | Cuisine photo tiles (up to two), vegetarian / egg / non-veg. | Makes the plan feel personal before she sees a price. |
| 5 | Report ready | "18 answers checked across 4 systems", then her WhatsApp number, with a skip. | Captures the lead at peak curiosity; lets us follow up. |
| 6 | Result | Her type, markers matched, a score per area, what it means, a weight estimate, and her diet shown blurred and locked. | The payoff of the assessment and the reason to pay. |
| 7 | Paywall | "Unlock the diet for your type": now versus goal, three plan lengths priced per day, guarantee, sample meals, reviews, FAQ. | Converts. |
| 8 | Plan | A day of meals with photos, swaps, grocery list, weekly WhatsApp check-in. | What she actually receives. |

Clickable mockups of all eight screens: [Fitovela Funnel Mockups](https://claude.ai/artifact/Vvvz5B2DvDZVXSqYZXJ1Ar) (private to the founder until shared).

## Ad categories and entry headlines

One funnel, one set of screens. Only the landing headline changes with the ad.

| Ad category | Landing headline |
| --- | --- |
| PCOS / PCOD | PCOS, PCOD or insulin? Find your exact type |
| Thyroid | Is it only thyroid? Find your exact type |
| Menopause | Hormones after 40. Find what changed |
| Diabetes | Sugar, insulin or both? Find your exact type |
| General weight loss | Why is the weight stuck? Find your real reason |

The mockups show the PCOS path. Which category launches first is not decided.

## How the result is worded

Current mockup wording, proposed by Claude and waiting for the doctor ([D-009](DECISIONS.md#d-009--result-wording-and-medical-rules-wait-for-the-doctor)):

- "Your symptoms match: Insulin-resistant PCOS type", with markers matched and a score per area.
- A short line that this is a symptom assessment and not a medical diagnosis, plus the tests that would confirm it.

The founder wants the questionnaire to feel like a diagnosis. The mockups deliver that through structure (sections per body system, signals counting up, a named type, a report) while the sentence itself says "match". Whether the wording can go further is question 1 on the doctor's sheet.

## Offer

| Item | Current proposal | Status |
| --- | --- | --- |
| Anchor price | INR 499, one-time, no auto-renewal | Founder's figure |
| Tiers | 1 week INR 199, 4 weeks INR 499, 12 weeks INR 999, each shown per day | Claude's proposal |
| Strike-through prices and countdown | Shown in the mockup | Only allowed if the price really rises when the timer ends |
| Guarantee | 7-day money-back | Proposal |
| Contents | Daily meals in her cuisine, two swaps per meal, weekly grocery list, eating-out guide, weekly WhatsApp check-in | Proposal; depends on who staffs the check-in |
| Payment | UPI, cards, netbanking | Not built |

## Design direction (accepted, [D-008](DECISIONS.md#d-008--quiz-funnel-style-and-visual-direction))

- Modelled on the leading quiz funnels (BetterMe, Reverse Health, Noom), localised for India. Chosen by the founder over the long dark sales page used by ToneOp.
- Light pages, large bold sans headlines with an italic serif accent, rani-pink buttons, deep plum for dark cards, a yellow tag for offers.
- Real photography of Indian women and Indian food. The mockups use Unsplash stand-ins; replace them with licensed or shot images before launch.
- One primary action per screen, large tap targets, phone first.

## Medical sign-off (pending)

A doctor decides twelve points before any real result is shown. She picks one option per question on this sheet: [Fitovela Doctor Sign-off](https://claude.ai/artifact/3WNH2yX9op8Ly7Dq5Ve3yT).

| # | Decision | Controls |
| --- | --- | --- |
| 1 | How the result is worded | The headline of the result screen |
| 2 | Which of the four areas a questionnaire can fairly report | Sections of the quiz and the report |
| 3 | Which PCOS types we name | Result types and plan variants |
| 4 | How symptoms become Low, Moderate, High | Scoring |
| 5 | Who is not sold a plan automatically | Exclusion rules before the paywall |
| 6 | Women on metformin or thyroid tablets | Eligibility and plan wording |
| 7 | Lowest daily calories | Plan rules |
| 8 | Weight-loss pace on the prediction chart | The estimate on the result screen |
| 9 | Tests we suggest | Result footnote |
| 10 | Diet approach for the insulin-resistant type | Plan content |
| 11 | How she appears on the site | Trust section |
| 12 | Her involvement after launch | Review process |

Until she answers, the scores, markers, calorie figures and meal examples in the mockups are sample values, not rules.

## Rules we keep

- No real customer sees a condition result until the doctor has signed off the wording and scoring.
- Reviews, user counts and credentials on the site are real, or the slot stays empty.
- Urgency is real: a countdown changes the price when it ends, or it is removed.
- Health answers are collected with consent, used only for the report and plan, and deleted on request.
- Ads do not address the viewer's condition directly ("Do you have PCOS?"); Meta rejects that.

## Not decided yet

- Which category launches first, and in which language (English, Hinglish, Hindi).
- How plans are produced: fixed templates per type and cuisine, generated, or dietitian-written.
- Delivery: WhatsApp message, web page, PDF, or a mix.
- Whether the WhatsApp number is required or skippable before the result.
- Refund terms, GST treatment, support hours.
- Technology stack, payment provider, analytics, hosting.

## What we know and do not know

- Checked on 2026-11-14: ToneOp sells a 7-day PCOS plan at INR 99 (struck from INR 499) on a long sales page with no quiz. Swastha360 runs a six-step assessment, takes the WhatsApp number before the report, and lists plans from INR 999 to INR 4,499 a month. Reverse Health's quiz uses one question per screen with photo answer pills and social-proof breaks.
- Not measured: cost per purchase on Meta, quiz completion, paywall conversion. Claude's rough guess is INR 300 to 1,500 per first purchase, which would make INR 499 alone break-even at best. Test one category on a small budget before building the rest.
- To verify: whether Meta limits purchase-event optimisation for sites it classes as health-condition related.

## Related work

Draft [PR #2](https://github.com/tusshar04/fitovela/pull/2) (Codex, FTV-002) proposes a food-and-lifestyle profile with no condition result. That is the opposite of D-007. If this brief is merged, PR #2 needs to be reworked or closed; its decision IDs D-004 to D-006 are left unused here to avoid a clash.

## Implementation status

Mockups and the doctor's sheet exist. No assessment logic, plan engine, payment, lead capture, analytics or site has been built. See [State](STATE.md).
