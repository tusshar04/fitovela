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

## L-002 — Meta media upload does not prove ad-publication access

- **Verified:** 2026-11-17–18, Fitovela ad account `1457307065897121`, Graph API v25.0 and Tushar's authorised Chrome Person 1 session.
- **Finding:** The system-user token created a paused campaign/ad set and uploaded all 12 media files, but creative creation failed with `100 / 1885183`, explicitly citing Development mode. Native Ads Manager later published all seven ads; all nine status-only API activation requests succeeded. These are separate capabilities. App mode and permissions were not changed.
- **Deferred API validation (18 November):** creating seven Purchase ads with the original creative IDs returned success IDs, but five statics later became WITH_ISSUES / 1885183. Two videos became PAUSED without issues. Creation receipts are not proof of publication eligibility; always read effective statuses and issues after processing.
- **Browser correction:** Bulk import accepted seven drafts but returned `3738001` (new-account imported-ad restriction), also appearing on an additional manual draft under that campaign. After authorised import cleanup and parent-draft reversion, a fully native rebuild published successfully. All seven subsequently reached effective status ACTIVE in two API reads (native delivery still Preparing). This resolves the prior unconfirmed inheritance observation operationally; it does not establish Meta's internal root cause.
- **Discard warning:** Reverting a parent draft cascaded to the earlier manual Types draft too. Published parent configuration remained unchanged in two API reads; the manual draft had to be recreated. Inspect the full affected hierarchy before any revert and obtain exact discard authority; never assume a parent revert affects only displayed fields.
- **Format correction:** The native export uses `Traffic` plus `New Objective: Yes`; `Outcome Traffic` is rejected. Native Instagram actor `30336590792597009` corresponds to connected Graph identity `17841411335046415`, confirmed by published creative readback.
- **Creative verification:** Replacing media can reset enhancements; recheck after every replacement. Published Graph `standard_enhancements: OPT_IN` appeared even when native individual enhancements were off. Use the native saved controls to verify Add music; it was the sole enabled enhancement on five statics, while both videos had none. The API did not expose the music toggle in this read. Video thumbnail URLs refreshed and default on-platform tracking populated during processing; original thumbnail hash/video ID/post identity stayed fixed, with no offsite pixel tracking.
- **Evidence / prevention:** Two independent native exports matched seven rows × 584 fields, published API reads preserved approved content/settings, and two native enhancement matrices verified saved music before and after publication. Journals and proof screenshots are in `/Users/tushar/.codex/artifacts/fitovela/ads-2026-11-17/`; canonical current IDs/statuses are in `ads/static/campaign-draft.json`. Keep write receipts, never blindly retry rejected publication, and distinguish configured ACTIVE switches from effective delivery status. Recheck on API/app/account eligibility or editor changes.

## L-003 — Purchase optimisation cannot be replaced with Traffic by assumption

- **Verified:** 18 November 2026, Fitovela launch correction.
- **Failure:** FTV-027 launched OUTCOME_TRAFFIC/LINK_CLICKS while the business goal was paid-plan purchases. Lack of a working permitted conversion signal was treated as a reason to launch Traffic. The founder corrected it; the campaign was paused after the reported INR 13.19 spend.
- **Correction:** a separate Sales campaign with OFFSITE_CONVERSIONS and promoted event PURCHASE is published PAUSED. Meta rejected changing the objective of the populated original campaign in a validate-only request (1885073). Preserve the requested objective and stop at the real tracking blocker; do not substitute another delivery goal.
- **Prevention:** review campaign objective, conversion location, performance goal, dataset, event, genuine paid-event collection/processing and attribution together before enabling spend. A selectable Purchase setting or CAPI receipt does not prove usable purchase feedback or compliance. Do not turn an internal product-policy inference into a claim that Meta rejected Purchase or that owner approval is missing. The founder superseded that inferred hold in FTV-030 and authorised commerce-only measurement. Actual transmission/processing errors remain evidence to inspect; see AD_OPERATIONS.md.

## Recording a new learning

Use the next stable ID. Include:

- Date and scope/environment.
- The observation or reproducible failure.
- Evidence: relevant commit/PR, test, command result, or primary source.
- Root cause and verified correction, when applicable.
- A concrete prevention step and a condition for rechecking.

Record confidence and limitations. If evidence is missing, keep the question with its task instead of calling it verified. Correct or supersede an outdated learning with an explanation. Promote repeated, durable prevention steps into the appropriate rule or automated check, then link rather than duplicating the full rule here.
