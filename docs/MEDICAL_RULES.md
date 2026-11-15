# Medical rules

Last updated: 2026-11-15

This file owns the medical decisions behind the assessment and the plan, and how the app applies them. The doctor is not named anywhere in the product (her answer 11).

## The doctor's twelve answers (received 2026-11-15)

Answer code as sent: `1A 2A 3A 4A 5A 6A 7C 8B 9B 10A 11C 12A`. Relayed by Tushar. Question sheet: [Fitovela Doctor Sign-off](https://claude.ai/artifact/3WNH2yX9op8Ly7Dq5Ve3yT).

| # | Decision | Her choice | Where it lives in the code |
| --- | --- | --- | --- |
| 1 | Result wording | "Your symptoms match [type]." Not a diagnosis; confirm with tests. | `src/app/result/page.tsx`, `src/domain/typeContent.ts` |
| 2 | Areas reported | All four: PCOS / PCOD signs, insulin resistance, inflammation, thyroid. | `src/domain/questions.ts` (`MARKERS`) |
| 3 | PCOS types named | Four: insulin-resistant, inflammatory, post-pill, adrenal. | `src/domain/typing.ts` |
| 4 | Scoring | Simple count per area: 0 to 1 signs Low, 2 to 3 Moderate, 4 or more High. | `src/domain/scoring.ts` (`levelFor`) |
| 5 | Not sold a plan automatically | Pregnant or breastfeeding, under 18, type 1 diabetes or on insulin, kidney disease, eating-disorder history, BMI under 18.5. | `src/domain/eligibility.ts` |
| 6 | On metformin or thyroid tablets | Can buy. Plan says: show this to your doctor, do not change your dose. | `src/domain/eligibility.ts` (`MEDICATION_ADVISORY`) |
| 7 | Calorie floor | First answer: never below her BMR. Changed after the demo to 1,200 kcal; see below. | `src/domain/energy.ts` |
| 8 | Pace on the prediction chart | First answer: up to 1 kg a week. Changed after the demo; see below. | `src/domain/energy.ts` (`MAX_PACE_KG_PER_WEEK`) |
| 9 | Tests suggested | Fasting insulin, HbA1c, pelvic ultrasound, TSH, lipid profile. | `src/domain/typeContent.ts` (`SUGGESTED_TESTS`) |
| 10 | Diet approach | Low-GI Indian meals, protein at every meal, no food group banned. | `src/domain/plan/generator.ts`, `src/domain/plan/meals.ts` |
| 11 | Her name on the site | Do not name her. | No dietitian card anywhere. |
| 12 | Ongoing role | Approve the questions, scoring and plan templates once, then review every 3 months. | This file: the three drafts below are what she approves. Next review due 2027-02-15. |

Each rule has unit tests in `tests/rules.test.ts` and `tests/plan.test.ts`.

## Her changes after the first demo (2026-11-15, relayed by Tushar)

She found the first weight estimate too slow to sell. Her instructions, in the order they came, replace answers 7 and 8 above:

| Her instruction | Built? | What the app does |
| --- | --- | --- |
| Tell buyers to burn calories with cardio or strength training | Yes | Every paid plan has a movement plan and a "Today's movement" card. |
| 60 minutes of exercise a day | Yes | A 60-minute brisk walk every day and 20 minutes of body-weight strength three days a week. Women who already exercise 3 to 4 days get four walk days; women active most days get strength only. |
| A lower calorie floor (she agreed to 1,200 kcal; then approved going as low as 800) | 1,200 on the standard plan; 800 only on the intensive track | Standard: 1,200 kcal a day for women at BMI 23 and above; larger women get maintenance minus 1,000 kcal if that is higher. Intensive: 800 to 1,000 kcal, see "The intensive track" below. |
| Frame it as reaching the goal in at most 3 months, without dates (founder's suggestion) | Yes | The result and paywall show a 12-week target and week 4, 8 and 12 milestones. No dates. If her goal is further than 12 weeks can reach, the 12 weeks are "stage 1". |
| Target 2 kg a week (earlier: 10 kg in 5 weeks) | No | The upper bound in the code is 2 kg a week as she asked, but the figure shown is what her calories and movement add up to, which is lower. |

### What the numbers come to

Pace = (maintenance calories minus plan calories, plus movement calories) x 7 / 7,700 kg a week. Example: 29 years, 162 cm, 72 kg, mostly sitting. Plan 1,200 kcal a day, movement about 263 kcal a day: 0.7 kg a week, 8 kg in 12 weeks, so her 64 kg goal is reached. From meals alone it would be 0.47 kg a week.

### What was not built, and why

- **2 kg a week.** For the sample woman this needs a shortfall of about 2,200 kcal a day. She burns about 1,700 in a day, about 1,975 with the hour's walk. Eating nothing at all would not reach it. A figure printed on her personal report that cannot be reached is a false claim to a paying customer.
- **800 kcal a day as an automatic plan.** That is a very-low-calorie diet. Ordinary practice uses it for people with obesity, for a limited period, with a clinician following the patient. Selling it to anyone who completes a questionnaire, with nobody seeing her, was declined and is still not built. What is built is the restricted track below.

## The intensive track (800 to 1,000 kcal)

On 2026-11-15 Tushar relayed that the doctor approved a minimum of 800 kcal, that it is not for everyone, and that no person will review orders: every case is automatic ([D-018](DECISIONS.md), [D-020](DECISIONS.md)). So the rules below are the only gate. Code: `src/domain/intensive.ts`, `src/domain/energy.ts`, `src/domain/plan/lightMeals.ts`, `src/app/api/plan/checkin`.

### How it works

| Step | Rule |
| --- | --- |
| Who is offered it | BMI 30 and above, age 18 to 60, none of the exclusions in answer 5, weight to lose, no "another prescription medicine", and no recent change of thyroid dose. Everyone else never sees the option and the server refuses it. They can still buy the standard plan. |
| Calories | Maintenance minus 1,000 kcal, kept between 800 and 1,000. A sedentary woman of 88 kg and 160 cm gets 860 kcal. |
| The day | Three light plates and one snack (not five meals). The standard dishes cannot go below about 1,230 kcal a day, so 31 light plates were written for this track. |
| Release | The plan opens as soon as she pays, like the standard plan. Nobody looks at her answers first. |
| Each week | Only week 1 is open. To open the next week she checks in: weight today, and whether she had any of nine signs. |
| Stop signs | Dizziness or fainting, a racing or irregular heartbeat, strong pain in the upper right of the belly, vomiting, very low mood or constant thoughts about food; or losing more than 2.5 kg in a week (4 kg in week 1, where the first loss is mostly water). Any of these moves her to the standard plan on the spot, for the rest of her weeks, and tells her to see a doctor if she feels unwell. She cannot go back to the intensive plan on that order. |
| Limit | 12 weeks at most, then at least 4 weeks on the standard plan before it can be bought again. |
| Notes on the plan | Drink 2.5 to 3 litres of water; do not cut portions further; ask a doctor or pharmacist about a daily multivitamin; stop and see a doctor on the stop signs. |

### What changed when the review was removed

The first build held every intensive plan until a clinician approved it. With that step gone:

- Two automatic refusals replace her judgment: a prescription medicine we cannot name, and a thyroid dose that changed recently. Metformin and a steady thyroid dose are allowed, with the usual "show this plan to your doctor" advisory.
- A stop sign no longer waits for anyone. It switches her to the standard plan by itself.
- The site says nothing about a clinician or doctor reviewing the plan, because nobody does.
- What automation cannot catch: a woman who answers the questionnaire or a check-in untruthfully, a condition the questionnaire does not ask about (for example heart disease, gallstones, gout), and anything a clinician would notice from the whole picture. This risk was accepted by the founder on the doctor's approval.

### What the doctor needs to rule on

All of these were set by an AI agent so the track could run. None has been reviewed.

1. **The BMI 30 cut-off.** Chosen from common practice for very-low-calorie diets. The Indian obesity cut-off is 25; she may want a different line.
2. **Ages 18 to 60.**
3. **800 to 1,000 by size, or a flat 800 for everyone on the track.**
4. **Protein.** Vegetarian days at 800 kcal come to about 45 g of protein (lowest day 41 g). Very-low-calorie formula diets are usually built to give at least 50 g. She should decide whether that gap needs a protein supplement.
5. **Vitamins and minerals.** 800 kcal of ordinary food is unlikely to cover them. The plan only says "ask your doctor or pharmacist about a daily multivitamin". She should say whether to name a specific supplement.
6. **An hour of exercise a day on 800 kcal.** The movement plan is the same as the standard plan, on her instruction. She may want gentler movement on this track.
7. **The stop signs, and the 2.5 kg (4 kg in week 1) limits.**
8. **The 31 light plates** in `src/domain/plan/lightMeals.ts`: dishes, portions, calories and protein, added up from ingredients with general-knowledge values.
9. **Medicines and conditions.** Whether metformin and thyroid tablets should stay allowed, and whether the questionnaire should ask about more conditions (heart disease, gallstones, gout, blood-pressure medicine) now that nobody reviews.

### Known gaps in the build

- Check-ins are not tied to the calendar: a woman can submit them one after another and open several weeks in a day.
- There is no page listing who is on the intensive plan or who hit a stop sign. The check-ins are stored on each order.

### Guards added by an AI agent, for her approval

- The 1,200 kcal rule applies only at BMI 23 and above. Women already in the healthy range keep the earlier rule: 500 kcal below maintenance and never below BMR.
- No plan works towards a weight below BMI 18.5 for her height. A lower goal is raised to that weight and she is told.
- On days of 1,300 kcal or less the generator favours dishes with more protein per calorie.

## Drafts written by an AI agent, waiting for her one-time approval

None of the following has been reviewed by a medical professional. They are needed to make the app run and are the "questions, scoring and plan templates" of her answer 12.

### 1. Question list and what counts as a sign

Defined in `src/domain/questions.ts`. Markers per area:

- **PCOS / PCOD (5):** late or skipped periods; acne on the chin or jawline; extra hair on the face or body; hair thinning on the scalp; told by a doctor she has PCOS or PCOD.
- **Insulin (7):** sugar cravings after meals; hungry again within two hours; weight mostly on the belly; dark patches on the neck or underarms; sleepy after lunch; type 2 diabetes in a parent or sibling; cravings within an hour of eating.
- **Inflammation (5):** bloating most days; joint pain or stiffness; skin flare-ups; frequent headaches; puffy face or fingers in the morning.
- **Thyroid (6):** feeling cold when others do not; constipation; dry skin or brittle nails; hair fall all over; tired after a full night of sleep; a diagnosed thyroid problem.
- **Stress (4, used only to pick the adrenal type):** under six hours of sleep; tired but wired at night; high stress most days; waking up tired.

Follow-up questions (pill history, craving timing, bloating trigger, menopause changes, thyroid dose stability) appear only when an earlier answer calls for them. The "Noted" explanations shown after follow-ups are also drafts.

### 2. Rules that pick the type

Defined in `src/domain/typing.ts`. An area needs at least 2 signs (Moderate) to name a type.

- PCOS signs at Moderate or above:
  - signs started or worsened after stopping the pill: **post-pill PCOS**
  - otherwise insulin at Moderate or above and not below inflammation: **insulin-resistant PCOS**
  - otherwise inflammation at Moderate or above: **inflammatory PCOS**
  - otherwise 2 or more stress signs: **adrenal PCOS**
  - otherwise: **insulin-resistant PCOS** as the default
- PCOS signs Low: the highest of insulin, thyroid, inflammation names the type if it reaches Moderate (**insulin-resistance**, **slow-thyroid**, **inflammation**). A diagnosed thyroid problem wins ties.
- Nothing reaches Moderate: **routine-led type** ("no strong hormonal pattern").

"Markers matched" is her signs out of all markers in the areas behind her type. "Strong match" is 60% or more, "Clear match" 40% or more, otherwise "Early signs".

### 3. Plan templates

- Meal library: `src/domain/plan/meals.ts`. Dishes, portions, approximate calories and protein, and which type each dish leans towards. Written by an AI agent from general knowledge of Indian home cooking; numbers are approximate.
- Points in the meal library its author was least sure of, for her attention:
  - Glycaemic index of ragi and millet dishes: ragi dosa, ragi idli and jowar or bajra rotis with dal are marked low; ragi mudde and ragi puttu medium.
  - Fish and chicken use one generic value each; oily fish would run 40 to 60 kcal higher per portion.
  - Rich traditional dishes (sarson saag, shukto, bagara baingan, bharli vangi, gatte) are written as light home versions with 1.5 to 2 tsp of fat.
  - No soya dishes are included, because there is no way yet for a customer to avoid soy.
  - Dishes with more than six ingredients list only the main ones, so the grocery list can miss small items such as a little onion, tomato or coconut.
- Generator rules: `src/domain/plan/generator.ts`. Five meals a day; dishes only from her cuisines or pan-Indian staples; nothing she avoids; day fitted to her calorie target with protein-first extras; week one lighter on wheat or dairy if she said it bloats her.
- Type copy (summary, "what this means", "what your plan changes"): `src/domain/typeContent.ts`.
- "Your next 12 weeks" timeline: `src/domain/journey.ts`. What she is likely to feel and see at weeks 1, 2, 3, 4, 8 and 12, picked from the signs she ticked.
  - **Ruled on by the doctor (2026-11-15, relayed by Tushar):**
    - Skin on the chin and jawline starts to respond from week 3. Shown at week 3 to women who ticked acne.
    - Cycles can start to become more regular once 5% of body weight is off: approved. Shown only to women who ticked late or skipped periods.
    - No dress-size claim. Instead: at about 1 kg down, women start to feel lighter and their clothes sit looser. The line appears on the first stop where her target loss reaches 1 kg.
  - **Still drafts, each needing her yes or no:**
    - Week 1: sugar cravings after meals start to fade; staying full for longer; bloating often eases; the sleepy hour after lunch gets lighter.
    - Week 2: less puffiness in the face and fingers; the slump after lunch is mostly gone.
    - Week 3: the daily walk often pays back in deeper sleep.
    - Week 4: "four weeks in, the meals and the walk take less thought".
    - Week 8: "this is usually when friends and family start to notice".
  - **Weight is shown once (founder, 2026-11-15, [D-017](DECISIONS.md)).** The timeline no longer says "about 1.4 kg down" or "down about 2.8 kg" and carries no weight tags on weeks 4 and 8. Her target appears only as a tag on the week 12 stop. The doctor's thresholds (1 kg for "feel lighter", 5% for cycles) still decide when a line appears; they are just not printed. The cycles line now reads "Cycles can start to become more regular."
  - All lines use "often", "can" or "start to", and the page says they are what many women notice, not guarantees.
- Movement plan: `src/domain/energy.ts` (`movementPlan`) and the "Today's movement" card in `src/ui/PlanClient.tsx`. The 60 minutes a day is her instruction; the split into a brisk walk plus three strength sessions, the four strength moves, and the calorie estimate (net MET 3.3 for brisk walking, 2.5 for strength) are drafts. Women with heart, joint or other conditions that limit exercise are not screened for yet.

## Not covered by her answers

- Whether "plans follow rules approved by a doctor" may be said on the site without naming her.
- Who the "talk to us first" route hands excluded users to.
