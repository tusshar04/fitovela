# Product brief

Last updated: 2026-11-14

Status: initial founder brief; discovery and design have not started. This document owns the current product understanding. [Decisions](DECISIONS.md) records why important choices were made.

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

These are inspiration links supplied by the founder. They have not been audited, and their claims, effectiveness, or design have not been accepted as evidence. Advertising tracking parameters have been omitted from the stored links.

## Implementation status

No product screens, assessment logic, payment flow, meal-plan engine, analytics, technology stack, or hosting have been selected or built. The current work is the shared project foundation. See [State](STATE.md) for the next task.
