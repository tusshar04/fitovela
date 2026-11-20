# Product brief

Last updated: 2026-11-14

Status: the founder has accepted the product hook, the funnel shape and the visual direction. The doctor has answered her twelve questions ([MEDICAL_RULES.md](MEDICAL_RULES.md)). A first working build runs on localhost; nothing is deployed. This document owns the current product understanding; [Decisions](DECISIONS.md) records why.

## Fitovela in one paragraph

Women in India arrive from a Meta ad about weight that will not move. A free two-minute symptom assessment checks her answers against four possible causes. Since 2026-11-18 ([D-030](DECISIONS.md)) the answer is not free: the paywall tells her how many signs were found and that her type is ready, and her report (the pattern her answers match) opens together with her diet plan, built from the food she already cooks, when she pays.

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
| 1 | Landing | A hook headline, a teaser of what the report holds, and four age buttons as the only action. No photos in the age step. A live count of women checked today. | The ad click turns into the first answer with no extra step. |
| 2 | Questions | One question per screen, grouped as Hormones, Insulin, Inflammation, Thyroid, Food. A live count of signals found. | Feels like an assessment in progress, not a form. |
| 3 | Reading her answers | After the first few answers: what was noted, "choosing your next questions", and questions skipped because they do not apply to her. It moves on by itself after 2.5 seconds; there is no button (FTV-033). | Shows the questionnaire is reacting to her, and respects her time. |
| 4 | Follow-up | A question that quotes her earlier answer ("Because you said…") and, once she taps, a note on what that answer changed. | Makes every answer feel heard. |
| 5 | What we see so far | "It was never your willpower", signals per area, two areas still unchecked. | Emotional connection and a reason to finish. |
| 6 | Food | Cuisine photo tiles (up to two), vegetarian / egg / non-veg. | Makes the plan feel personal before she sees a price. |
| 7 | Report ready | Her answers are "analysed" across 4 systems, then she gives her email (the report and plan are sent there once she unlocks them) and mobile number (her login, by one-time code), with a skip. The button says "Continue", not "Show my result". | Captures the lead at peak curiosity; gives her an account without a password. |
| 8 | Report | **Paid since FTV-035.** Her type, markers matched, a score per area, what it means, her first weeks and BMI. It opens from a card at the top of her plan and from her plan email (`/plan/<token>/report`). Only a woman who cannot buy (pregnant or breastfeeding, under 18) still sees it free, on `/result`. | What she pays to find out. |
| 9 | Paywall | Comes straight after the questions. A locked report first: her type blurred, how strongly her answers match, how many signs were found and how many of the 4 systems stand out, and locked rows for each system's score, what it means and her diet. Then "Unlock your report and diet plan", a recap of her own answers, her first weeks, two plan lengths (4 and 12 weeks) priced per day, guarantee, sample meals, FAQ. The page is sent those counts and the strength label only, never her type or which system scored what. | Curiosity about her own result becomes the reason to buy now. |
| 10 | Plan | Each day's five meals with portions, two swaps per meal, and a grocery list for each week. Sent by email; she can return by logging in. | What she actually receives. |

The founder's brief for the question flow: she should feel her inputs are being processed and the next question depends on them, feel inspired and connected along the way, and feel good enough about the time she invested that buying on the paywall is an impulse.

Clickable mockups of every screen: [Fitovela Funnel Mockups](https://claude.ai/artifact/Vvvz5B2DvDZVXSqYZXJ1Ar) (private to the founder until shared).

## Landing pages

One funnel, one set of question screens. The landing page changes with the ad. Three hooks are mocked up for testing against each other:

| Variant | Hook | Headline |
| --- | --- | --- |
| A | Failure to lose weight | Dieting hard. Weight still stuck? Find out why. |
| B | Free health assessment | Is it PCOS, thyroid or insulin? Check in 2 minutes. |
| C | Diet plan for her type | One diet does not fit every woman. Find yours. |

Each ad category (PCOS / PCOD, thyroid, menopause, diabetes, general weight loss) can get its own version of these. The mockups show the PCOS path. Which category and which hook launch first is not decided.

## How the result is worded

Chosen by the doctor (her answer 1A, [D-012](DECISIONS.md)):

- "Your symptoms match: Insulin-resistant PCOS type", with markers matched and a score per area.
- A short line that this is a symptom assessment and not a medical diagnosis, plus the five tests that would confirm it.

The founder wants the questionnaire to feel like a diagnosis. The product delivers that through structure (sections per body system, signals counting up, follow-up questions that react to her answers, a named type, a report) while the sentence itself says "match".

The result leads with **"Your first 4 weeks"**: a timeline of what she is likely to feel and see at weeks 1, 2, 3 and 4, built from the complaints she ticked (cravings, bloating, a tight waistband, a puffy face, tiredness, skin). Weeks 8 and 12 sit under a small "Show weeks 8 and 12" line. Every stop speaks to something she is self-conscious about and how good it feels when it eases, and no stop mentions weight ([D-022](DECISIONS.md), which replaces the week 12 target tag of [D-017](DECISIONS.md)). Her numbers stay in the folded "See your 12-week numbers" chart. The same timeline appears on the paywall and, week by week, on the plan. It speaks to the complaint from her side and never tells her that her body looks bad.

Behind it, the weight section is a **12-week transformation**: a target weight at week 12 with milestones at weeks 4 and 8, and no dates ([D-015](DECISIONS.md)). It is built from her meals (1,200 kcal a day for most women, on the doctor's instruction) plus an hour of movement a day, and shows what those add up to. If her goal is within reach, the headline is her goal; if not, the 12 weeks are "stage 1". The 12-week plan is the default tier. The doctor also asked for a 2 kg a week target; it is not built, for the reasons in [MEDICAL_RULES.md](MEDICAL_RULES.md).

Women at BMI 30 and above are also offered an **intensive track** of 800 to 1,000 kcal a day on the paywall ([D-018](DECISIONS.md), [D-020](DECISIONS.md)). It is fully automatic: the plan opens on payment, each further week opens after a short check-in, a warning sign at a check-in moves her to the standard plan, and it runs for 12 weeks at most. It costs the same as the standard plan.

## Offer

| Item | Current proposal | Status |
| --- | --- | --- |
| Anchor price | INR 999 for 12 weeks, one-time, no auto-renewal | Founder's choice, 2026-11-20 ([D-031](DECISIONS.md)) |
| Tiers | 4 weeks INR 499, 12 weeks INR 999, each shown per day. The 1-week trial is no longer sold. The 12-week plan is the default and the one to steer everyone to | Founder's prices ([D-031](DECISIONS.md)) |
| Launch price and countdown | 15 minutes, starting again each time she opens the paywall ([D-024](DECISIONS.md)); the regular price (INR 999 and 1,999) applies only if the countdown runs out while she is on the page | Built; the server charges whichever price is live. Regular prices are Claude's, not confirmed |
| Guarantee | 7-day money-back | Proposal; shown on the paywall |
| Contents | Daily meals in her cuisine, two swaps per meal, a grocery list for each week, a daily movement plan | Built. Weekly check-ins on the intensive track only. No eating-out guide is promised |
| Delivery | By email, plus login with mobile number and one-time code | Founder's decision ([D-013](DECISIONS.md)); email and SMS providers not connected |
| Payment | Cashfree hosted checkout ([D-025](DECISIONS.md)); her email and mobile number are sent with the order so she types them once | Built, switched off until keys are supplied; not yet run against Cashfree |

## Design direction (accepted, [D-008](DECISIONS.md#d-008--quiz-funnel-style-and-visual-direction))

- Modelled on the leading quiz funnels (BetterMe, Reverse Health, Noom), localised for India. Chosen by the founder over the long dark sales page used by ToneOp.
- Light pages, large bold sans headlines with an italic serif accent, rani-pink buttons, deep plum for dark cards, a yellow tag for offers.
- Logo: a rani-pink leaf mark with the name set in serif.
- Real photography of Indian women and Indian food. The mockups use Unsplash stand-ins; replace them with licensed or shot images before launch.
- One primary action per screen, large tap targets, phone first.

## Medical rules

The doctor answered all twelve questions on 2026-11-15. Her answers, how the app applies each one, and the three drafts that still need her one-time approval (question list, type rules, meal library) are in [MEDICAL_RULES.md](MEDICAL_RULES.md). She is not named anywhere in the product.

## Rules we keep

- No real customer sees a result until the doctor has approved the drafted question list, type rules and meal library.
- Reviews, user counts and credentials on the site are real, or the slot stays empty.
- Urgency is real: a countdown changes the price when it ends, or it is removed.
- Health answers are collected with consent, used only for the report and plan, and deleted on request.
- Ads do not address the viewer's condition directly ("Do you have PCOS?"); Meta rejects that.

## Not decided yet

- Which category launches first, and in which language (English, Hinglish, Hindi).
- Who excluded visitors ("talk to us first": since D-029 only pregnant or breastfeeding women and under-18s) are handed to.
- Whether email and mobile stay skippable before the result.
- Refund terms, GST treatment, support hours.
- Providers for email and SMS codes; when Cashfree is switched on and the Meta Pixel goes in.
- The GCP project to deploy into.

## What we know and do not know

- Checked on 2026-11-14: ToneOp sells a 7-day PCOS plan at INR 99 (struck from INR 499) on a long sales page with no quiz. Swastha360 runs a six-step assessment, takes the WhatsApp number before the report, and lists plans from INR 999 to INR 4,499 a month. Reverse Health's quiz uses one question per screen with photo answer pills and social-proof breaks.
- Not measured: cost per purchase on Meta, quiz completion, paywall conversion. Claude's rough guess is INR 300 to 1,500 per first purchase, which would make INR 499 alone break-even at best. Test one category on a small budget before building the rest.
- To verify: whether Meta limits purchase-event optimisation for sites it classes as health-condition related.

## Related work

Draft [PR #2](https://github.com/tusshar04/fitovela/pull/2) (Codex, FTV-002) proposes a food-and-lifestyle profile with no condition result. That is the opposite of D-007, so PR #2 needs to be reworked or closed. Its decision IDs D-004 to D-006 are left unused here to avoid a clash.

## Implementation status

The funnel is built and runs on localhost: landing pages, adaptive questionnaire, scoring, result, paywall, demo checkout, plan generator, plan page and login. Plans are generated by rules from a tagged meal library, not written one by one. Payments, email, SMS, ad tracking and deployment are not connected. See [State](STATE.md) for what is a stand-in.
