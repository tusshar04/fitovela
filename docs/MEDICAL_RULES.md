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
| 7 | Calorie floor | No fixed number; never below her BMR. | `src/domain/energy.ts` |
| 8 | Pace on the prediction chart | Up to 1 kg a week. | `src/domain/energy.ts` (`MAX_PACE_KG_PER_WEEK`) |
| 9 | Tests suggested | Fasting insulin, HbA1c, pelvic ultrasound, TSH, lipid profile. | `src/domain/typeContent.ts` (`SUGGESTED_TESTS`) |
| 10 | Diet approach | Low-GI Indian meals, protein at every meal, no food group banned. | `src/domain/plan/generator.ts`, `src/domain/plan/meals.ts` |
| 11 | Her name on the site | Do not name her. | No dietitian card anywhere. |
| 12 | Ongoing role | Approve the questions, scoring and plan templates once, then review every 3 months. | This file: the three drafts below are what she approves. Next review due 2027-02-15. |

Each rule has unit tests in `tests/rules.test.ts` and `tests/plan.test.ts`.

### How answers 7 and 8 interact

Calories are her maintenance minus 500 kcal, but never below BMR (Mifflin-St Jeor). The pace shown is her real deficit converted to kg a week, capped at 1. For a sedentary woman the BMR floor leaves a small deficit, so the honest pace is often 0.25 to 0.5 kg a week and the cap rarely applies. Example: 29 years, 162 cm, 72 kg, sedentary gives 1,430 kcal a day and about 0.26 kg a week.

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

## Not covered by her answers

- Whether "plans follow rules approved by a doctor" may be said on the site without naming her.
- Who the "talk to us first" route hands excluded users to.
