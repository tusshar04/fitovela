# Product brief

Last updated: 2026-11-14

Status: first product/design proposal prepared for discussion; recommendations below are not founder-approved requirements. This document owns the current product understanding. [Decisions](DECISIONS.md) records why important choices were made.

## Founder direction

Fitovela is envisioned as a website selling personalized diet plans to women. Meta ads would bring visitors to an entry point suited to the ad's category, followed by an assessment, food preferences, an assessment summary, and a purchase offer.

Categories mentioned by the founder:

- General weight loss for women.
- PCOS/PCOD-related weight management.
- Menopause-related weight management.
- Thyroid-related weight management.
- Diabetes-related nutrition or weight management.
- General diet plans; inflammation was also mentioned as a possible assessment topic.

These are candidate categories, not an agreed launch scope or verified medical claims.

## Proposed customer journey

1. Arrive from a category-specific advertisement.
2. Answer an assessment questionnaire.
3. Select dietary preferences, such as vegetarian, non-vegetarian, or eggs.
4. Select preferred regional cuisines, including South Indian, North Indian, Bengali, Punjabi, and Odia; the final taxonomy is open.
5. View a personalized assessment summary.
6. View a persuasive offer for a customized diet plan and purchase it.
7. Receive the purchased plan through a delivery method still to be defined.

This sequence is a hypothesis to evaluate during product design, not a finalized screen flow.

## Assumptions awaiting decisions

| Topic | Current proposal | Still unresolved |
| --- | --- | --- |
| Price | Approximately INR 499. | Final price, offer, taxes, and whether payment is one-time or recurring. |
| Assessment | Questions about goals, symptoms, and health context. | Purpose, evidence, scoring, permissible conclusions, and professional review. |
| Personalization | Adapt to food type, regional cuisine, and customer needs. | Nutrition rules, generation method, and review/quality process. |
| Offer | Customized diet plan. | Plan duration, exact contents, support, revisions, and refund terms. |
| Acquisition | Meta ads across multiple women's segments. | Initial segment, geography, languages, budget, and launch sequence. |

The founder described helping visitors check for conditions through questions. Whether and how any condition-related assessment is appropriate remains an explicit open question. Do not implement diagnostic outputs or treat the proposed questionnaire as clinically validated. Assessment purpose, wording, evidence, and professional review must be resolved before implementing health conclusions.

## Questions for product discovery

- Who is the first customer segment, and what problem are we promising to solve?
- What exactly does a paying customer receive, when, and for how long?
- What role will qualified nutrition or medical professionals have in assessment and plan quality?
- How will known conditions, medications, allergies, pregnancy, and other relevant circumstances affect eligibility or referral?
- What information is necessary to personalize the product, and how will consent, access, retention, and deletion work?
- What can be shown before payment, and what becomes available afterward?
- How will customers receive support, corrections, and refunds?
- What evidence and truthful claims will support the offer, and how will funnel performance and customer outcomes be evaluated?

Resolve these during discovery; this list does not authorize implementation or select the answers.

## Founder-provided references

- [Swastha360 health assessment](https://swastha360.com/health-assessment).
- [ToneOp Fit PCOS landing page](https://pcos.toneopfit.com/).

These references were inspected on 2026-11-14 for interaction and offer structure. Their medical claims, customer outcomes, and conversion effectiveness have not been validated. Advertising tracking parameters have been omitted from the stored links. Research observations and sources are in [LEARNINGS.md](LEARNINGS.md).

## First design proposal — FTV-002

### Positioning and first release

**Proposed promise:** a practical food plan built around a woman's familiar Indian meals, preferences, and everyday routine.

Recommend leading with general women's weight management while designing one reusable journey with category-specific entry copy. Add condition-specific tracks when their intake, eligibility, nutrition rules, professional review, and service delivery are ready. The recommendation is about limiting initial complexity; it is not a claim that general weight-loss visitors need no health or suitability screening.

An ad's category should select relevant introduction copy, never automatically label a visitor as having a condition. Category, self-reported diagnosis, symptoms, and professional assessment are distinct inputs.

### Customer journey and purpose of each step

| Step | Customer experience | Product reason |
| --- | --- | --- |
| Entry | Relevant promise, an example of familiar food, free-profile CTA, and optional paid-plan price. | Explain relevance and what is being sold before asking for effort. |
| Goal and context | Short questions about goals, routine, known conditions and suitability. Explain sensitive questions and allow appropriate uncertainty choices. | Personalize and identify when self-serve guidance is unsuitable. |
| Food preferences | Vegetarian/eggs/non-vegetarian, multiple cuisines, cooking time, dislikes and allergies. | Let customers recognize their own kitchen in the proposed product. |
| Free summary | Reflect the actual answers, explain practical plan priorities, and show an illustrative meal idea. | Deliver value and demonstrate personalization before payment. |
| Offer | Exact deliverables, duration, total price, sample day, support scope, and terms. | Make the purchase decision concrete. |
| Checkout and delivery | Clear total and purchase terms, payment handling, immediate order acknowledgement, and a reliable way to access the plan. | Complete the promise without losing customers after payment. |
| Use the plan | Daily meals, relevant swaps, shopping support, and printable access. | Make the product useful beyond the initial download. |

The full assessment should ask only questions used by personalization or suitability logic. A possible 10–14-question flow and roughly three-minute target need usability testing. The mockup compresses the flow into three representative sections; it is not a complete intake or validated screening instrument.

### Assessment and result design

Recommend a **food and lifestyle profile** for the first product, with no condition diagnosis, disease subtype, hormone score, or inflammation score generated from unvalidated questions. A validated screening tool, if considered later, would need a separate evidence and implementation decision and must not be presented as a diagnosis.

The free result should make traceable statements such as: “You selected vegetarian meals, North Indian and South Indian cuisines, and around 20 minutes to cook. Your plan should prioritize familiar dishes and quick preparation.” Every claimed personalization should map to an answer or an approved rule.

Reported conditions, medications, pregnancy/breastfeeding, age, allergies, eating-disorder concerns, and other relevant circumstances require a professionally designed suitability process before any real plan is sold. The mockup demonstrates a conservative review route for several example concerns. This is an interaction example, not a complete eligibility policy or a rule permanently excluding all customers with diagnosed conditions.

### Proposed INR 499 offer

Working assumption for this mockup: **one-time INR 499 for a 28-day self-serve digital meal plan** containing four weekly schedules, meal swaps, weekly shopping support, mobile access, and a printable version. Duration, tax treatment, support, refunds, delivery time, and the contents of the actual plan remain unapproved.

Do not promise unlimited coaching or personal nutritionist review at this price until staffing and economics are established. Evaluate revenue after applicable taxes, payment costs, refunds, acquisition, plan preparation, and support before deciding how much manual service is included.

Make the offer persuasive through specific deliverables, recognizable meals, a useful sample, and genuine proof when available. Do not invent reviews, medical credentials, savings against an unestablished price, scarcity, or guaranteed weight-loss outcomes. The first concept deliberately contains no fabricated social proof or countdown.

### Design directions to compare

- **Food-first:** warm cream/sage surfaces, editorial serif headings, familiar meal examples, and a short welcome before questions. Recommended initial brand direction; validate whether the extra introductory screen helps conversion.
- **Quiz-first:** compact sans-serif presentation, direct goal selection, and less introduction. Candidate experiment for visitors already persuaded by an ad.

Both use clear touch targets, one primary next action, visible progress, editable preferences, and one shared downstream journey. They are alternatives to discuss, not two separate products or a decision to maintain duplicate implementations.

### Clickable concept source and scope

The editable mockup is [food-plan-concepts.html](mockups/food-plan-concepts.html). It is an inline visualization fragment, not a production site or an application framework selection. It has two complete entry concepts and previews for goals, health context, food preferences, summary, offer, checkout, professional review, and plan delivery.

Interactions demonstrate diet/cuisine selections carrying forward, a review route with no payment request, day selection, breakfast swaps, and a shopping-list preview. Meals are illustrative, repeat in a short sample cycle, and have no calculated nutrition or prescribed portions. Cooking time changes the summary explanation; it does not currently filter a recipe database. The source labels these limits and the proposed offer.

Answers remain in memory; no backend, analytics, real checkout, contact collection, or medical scoring exists. Only the presentation's current screen can be saved by the conversation host. The full product still needs consent/privacy design, an approved nutrition model, real recipes and quantities, payment/recovery flows, customer access, support and policy design, accessibility, and mobile/browser testing.

### Decisions to resolve in discussion

1. Initial segment: general women's weight management or a condition-specific service with professional involvement?
2. Paid deliverable: 28-day self-serve product, a shorter personally reviewed plan, or a service with continuing support?
3. Entry direction: Food-first or Quiz-first?
4. Who owns and verifies nutrition rules and condition-related care pathways?
5. What creates enough real customization and ongoing usefulness to justify the offer?

## Implementation status

Presentation-only concept screens exist for discussion. No production assessment logic, payment flow, meal-plan engine, analytics, technology stack, or hosting has been selected or built. See [State](STATE.md) for current ownership and handoff.
