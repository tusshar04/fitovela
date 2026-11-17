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

- **Verified:** 2026-11-17, Fitovela ad account `1457307065897121`, Graph API v25.0 and Tushar's authorised Chrome Person 1 session.
- **Finding:** The system-user token successfully created a paused campaign/ad set and uploaded all 12 media files. The first creative-creation request then failed with `100 / 1885183`, explicitly citing the app's Development mode. Do not describe media upload or reporting access as proof that creative creation works.
- **Browser evidence:** Bulk import accepted seven drafts, but the editor returned `3738001`: imported ads cannot be published until several weeks of compliant advertising history. A fresh ad made with the native Create flow under the same campaign also displayed that message after saving; the cause of that inheritance is unconfirmed. Review and publish opened payment setup because no payment method was present. Neither browser publication nor activation succeeded.
- **Format correction:** Export the current native configuration before preparing an import. This account exports the objective as `Traffic` plus `New Objective: Yes`; `Outcome Traffic` is rejected. Selecting `fit.o.vela` in native UI exports Instagram actor `30336590792597009`, whereas the connected Instagram Graph identity is `17841411335046415`. They are different identifier forms, not different Instagram accounts.
- **Evidence:** Local journals, the native draft export, saved error AX and payment screenshot in `/Users/tushar/.codex/artifacts/fitovela/ads-2026-11-17/`; current task and draft IDs are in `STATE.md` and `ads/static/campaign-draft.json`.
- **Prevention / limits:** Check each capability separately, retain rejected-write receipts, and never blindly retry a rejected publication, change permissions/app mode, or claim drafts are live. Recheck after billing, draft cleanup or Meta eligibility changes; no verified correction for the publication restriction is recorded yet.

## Recording a new learning

Use the next stable ID. Include:

- Date and scope/environment.
- The observation or reproducible failure.
- Evidence: relevant commit/PR, test, command result, or primary source.
- Root cause and verified correction, when applicable.
- A concrete prevention step and a condition for rechecking.

Record confidence and limitations. If evidence is missing, keep the question with its task instead of calling it verified. Correct or supersede an outdated learning with an explanation. Promote repeated, durable prevention steps into the appropriate rule or automated check, then link rather than duplicating the full rule here.
