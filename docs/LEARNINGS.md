# Verified learnings

This file owns reusable discoveries backed by evidence. It is not a session diary, a replacement for [decisions](DECISIONS.md), or a place to record untested assumptions.

## L-001 — Share instructions through an import

- **Verified:** 2026-11-14.
- **Scope:** repository guidance for Codex and Claude Code; verify loading when using another Claude surface or a materially different client version.
- **Finding:** Codex uses `AGENTS.md` for durable repository guidance. Claude Code supports importing another instruction file through `@path` syntax. A `CLAUDE.md` containing `@AGENTS.md` provides a shared rule source.
- **Evidence:** [OpenAI guidance](https://learn.chatgpt.com/guides/best-practices) and [Claude Code instruction imports](https://code.claude.com/docs/en/memory#import-additional-files), checked during foundation planning.
- **Prevention:** Change the shared rules in `AGENTS.md`; do not copy them into `CLAUDE.md` or private memory as a second authoritative version.
- **Limit:** File-based instructions guide behavior; they do not themselves enforce Git permissions, run reviews, or synchronize separate checkouts. The actual Claude session has not yet been checked for loading this repository's import.
- **Recheck when:** A client fails to load project instructions or a client/configuration change affects instruction discovery. Confirm the loaded files in the actual session.

## L-002 — The reference funnels use different conversion approaches

- **Inspected:** 2026-11-14.
- **Scope:** visible first-party landing pages; no form submissions or purchases.
- **Observation:** [Swastha360](https://swastha360.com/health-assessment) presents a six-step nutrition assessment, asks about concerns/goals/budget, and asks for name and WhatsApp details before the report action. [ToneOp Fit](https://pcos.toneopfit.com/) presents a direct PCOS diet-plan offer, a seven-day bundle advertised at INR 99 at inspection, repeated purchase CTAs, testimonials, and urgency elements.
- **Method:** Swastha360 page content was retrieved through web browsing. ToneOp did not load through the web retrieval tool; its page was inspected through native Chrome accessibility controls. No personal data was entered.
- **Conclusion:** These demonstrate assessment-led lead capture and direct-offer selling. Combining a useful free profile with a concrete plan preview is a Fitovela design hypothesis, not an observed conversion result.
- **Limit:** Their testimonials, medical claims, urgency, prices over time, and conversion performance are not independently verified. Do not copy health claims or infer business success from a landing page.
- **Recheck when:** Planning a live competitive comparison or pricing experiment; offers and page content can change.

## L-003 — A questionnaire must not be treated as a condition diagnosis

- **Verified:** 2026-11-14.
- **Scope:** the distinction between a nutrition profile and clinical diagnosis; not a complete clinical protocol.
- **Evidence:** [WHO on PCOS diagnosis](https://www.who.int/news-room/fact-sheets/detail/polycystic-ovary-syndrome) describes diagnostic criteria and excluding other causes. [NIDDK on diabetes diagnosis](https://www.niddk.nih.gov/health-information/diabetes/overview/tests-diagnosis) describes clinical blood tests and tests to identify diabetes type.
- **Finding:** These sources do not support diagnosing PCOS or diabetes type from the proposed food/symptom quiz. Reported symptoms, a stated diagnosis, screening results, and a clinician's diagnosis must not be conflated.
- **Application:** The initial prototype reflects answers as a food profile, makes no diagnostic score, and illustrates a professional-review route. This conservative route is a proposed product response, not a medical rule derived verbatim from those sources.
- **Recheck when:** Defining real intake, clinical claims, or condition-specific nutrition rules; obtain appropriate professional review and current primary guidance.

## Recording a new learning

Use the next stable ID. Include:

- Date and scope/environment.
- The observation or reproducible failure.
- Evidence: relevant commit/PR, test, command result, or primary source.
- Root cause and verified correction, when applicable.
- A concrete prevention step and a condition for rechecking.

Record confidence and limitations. If evidence is missing, keep the question with its task instead of calling it verified. Correct or supersede an outdated learning with an explanation. Promote repeated, durable prevention steps into the appropriate rule or automated check, then link rather than duplicating the full rule here.
