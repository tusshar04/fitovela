# Fitovela

Fitovela is an early-stage website concept for personalized diet plans for women, with visitors arriving from category-specific Meta ads.

A first working build runs on localhost. Payments, email, SMS codes and deployment are not connected yet; see [State](docs/STATE.md).

## Run it

```sh
nvm use            # Node 24.19, same as tarot
npm install
npm run dev        # http://localhost:3000
```

Landing variants: `/?h=a`, `/?h=b`, `/?h=c`; add `&c=pcos|thyroid|menopause|diabetes|weightloss` for the ad category. Local data is written to `.data/` (sessions, orders, the email outbox and the event log).

## Production

Live at https://fitovela.com (Cloud Run in Mumbai, GCP project `fitovela-prod`, behind a Cloudflare Worker whose source is in `edge/`). What is switched on is in [docs/STATE.md](docs/STATE.md).

```
scripts/deploy.sh            # deploy the tip of main: build, candidate, checks, then traffic
scripts/deploy.sh rollback   # list revisions and how to go back to one
```

Secrets are in Secret Manager; none are in this repository. Local development needs none: without keys it uses a demo checkout, writes emails to `.data/outbox/` and shows login codes on screen.

## Video music versions

The approved pairings are Iktara for the English Types video and Love You Zindagi for the English Tried video. Rebuild from the existing silent renders and the founder's local recordings:

```sh
python3 ads/video/mix-music.py --video-dir /Users/tushar/fitovela/ads/video/out \
  --music-dir '/Users/tushar/Desktop/new songs' --output-dir /path/to/new-output-folder
```

Requires Python 3.11+ and ffmpeg/ffprobe. The recipe pins source hashes because different recordings or video renders need fresh timing. It refuses to overwrite outputs, copies the original video stream, and writes separate `-v2.mp4` files plus `music-mix-manifest-v2.json`. Revision 2 lowers Iktara to −21 LUFS and uses pitch-preserving tempo adjustment to align the three card reveals. Love You Zindagi keeps its opening/chorus timing at −18 LUFS and continues through the final frame. Both retain full music at the end, with only a 5 ms de-click. Recordings and exports stay outside Git; this command does not upload or publish ads.

## Start here

| Document | Owns |
| --- | --- |
| [AGENTS.md](AGENTS.md) | Shared working instructions for Codex, Claude, and other contributors. |
| [CLAUDE.md](CLAUDE.md) | Claude entry point importing the shared instructions. |
| [Product](docs/PRODUCT.md) | Current product understanding, requirements, assumptions, and open questions. |
| [Decisions](docs/DECISIONS.md) | Reasons for important choices and their approval/supersession history. |
| [State](docs/STATE.md) | Active ownership, current progress, and the next handoff. |
| [Learnings](docs/LEARNINGS.md) | Verified discoveries and prevention of recurring mistakes. |
| [Medical rules](docs/MEDICAL_RULES.md) | The doctor's answers, how the app applies them, and drafts awaiting her approval. |
| [Ads](ads/) | `ads/static/`: ad artboards as HTML, and `render.sh` to turn them into PNGs. `ads/video/`: the quiz video, built from screenshots of the app by `capture.mjs` and `render.mjs`. Status is in State. |
| [Ad operations](docs/AD_OPERATIONS.md) | Cashfree verification, Slack order alerts, hourly ad reporting, and tracking/release checks. |

Read the shared instructions and current state before starting work. Each topic has one authoritative home; other documents should link to it.

## Contribution and release path

```text
Task and acceptance criteria
  -> feature/task branch in its own worktree
  -> implementation and relevant checks
  -> merge straight into main and push (no pull requests)
  -> production deployment from main (future; not configured)
```

`main` is the integration branch and intended future production source. Feature, fix, and documentation work is done on a task branch and merged straight into `main`; the project does not use pull requests. See [AGENTS.md](AGENTS.md) for the complete workflow.

### Starting a task

From the primary checkout, after inspecting its status:

```sh
git status --short --branch
git fetch origin
git worktree add --no-track -b feat/ftv-002-short-description ../fitovela-worktrees/ftv-002-short-description origin/main
```

Use the actual assigned task ID, a unique branch, and an unused worktree path. Run subsequent edits and commits inside that worktree. When the task is done, merge the branch into `main` from the primary checkout and run `git push origin main`.

The primary checkout stays on `main`; update it with `git pull --ff-only` only when clean. Never use two agents to edit the same working directory concurrently.

## Current tooling

- Stack: TypeScript, Next.js, Node 24. Firestore in production (`STORE_DRIVER=firestore`), JSON files under `.data/` locally.
- Checks: `npm test` (unit tests for every medical rule and the plan generator), `npm run typecheck`, `npm run build`.
- CI, branch protection, hosting, and production deployment: not yet configured.
- Documentation checks: `git diff --check` and verification of local Markdown links.

Add real setup and verification commands here when the application stack is selected. Do not document placeholder commands as working tooling.
