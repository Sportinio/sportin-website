# SportIn Mobile Parity Dashboard

A tiny Next.js dashboard that shows iOS vs Android feature parity at a glance.
Green = merged. Yellow = open PR. Red = no PR. Warns when iOS drifts ahead by
more than N features.

## How it works

**Convention (Option A — tracking issues):**

1. Every feature is a GitHub Issue in a tracking repo (e.g. `Sportinio/mobile-features`)
   labeled `feature`.
2. Optional priority label: `P0`, `P1`, or `P2`.
3. PRs in your iOS repo (`Sportinio/ios-app`) and Android repo (`Sportinio/android-app`)
   reference the tracking issue via `Closes #N`, `Fixes #N`, or "Development" link.
4. The dashboard reads the tracking issues, pairs the cross-referenced PRs by repo,
   and shows you the parity grid.

## Setup

```bash
cd parity-dashboard
cp .env.example .env.local
# edit .env.local with your token + repo names

npm install
npm run dev
# open http://localhost:3030
```

## GitHub token

Create a **fine-grained personal access token** at
https://github.com/settings/tokens?type=beta with:

- **Resource owner:** your org (`Sportinio`)
- **Repository access:** only the 3 repos used (features tracker, iOS, Android)
- **Repository permissions (read-only):**
  - Contents: Read
  - Issues: Read
  - Metadata: Read (auto)
  - Pull requests: Read

Paste into `.env.local` as `GITHUB_TOKEN=...`.

## Deploy to Vercel

```bash
npx vercel
# follow prompts. Set env vars in the Vercel dashboard (same as .env.local).
```

Recommended: protect the deployment with Vercel Password Protection (Vercel Pro)
or add basic auth middleware so it's not public.

## Adding new features

1. Open an issue in `Sportinio/mobile-features` with label `feature`. Title it as
   the feature ("NFC check-in", "Streak tracker", "Class booking v2"). Add `P0` /
   `P1` / `P2` label for priority.
2. When you open a PR on iOS, write `Closes Sportinio/mobile-features#42` in the
   PR description. Same on Android.
3. Refresh the dashboard (auto-refreshes every 60s).

The dashboard automatically:

- Shows green when both platforms merged.
- Shows yellow when a PR is open but not merged.
- Shows red when no PR exists yet for that platform.
- Sorts drift items (one platform merged, other not) to the top.
- Banners a warning when iOS is ahead by more than `IOS_AHEAD_LIMIT` features.

## Optional next steps

- Slack webhook on PR-merged for daily summary.
- Per-feature drill-down panel.
- GitHub OAuth gate so only org members can view.
- Cache layer (Upstash Redis) if you hit GitHub rate limits.
