import { NextRequest, NextResponse } from "next/server";
import { applyTransition } from "@/lib/parity-store";
import {
  REPO_CONFIG,
  branchToStage,
  slugFromBranch,
  type Platform,
  type Stage,
} from "@/lib/stages";

export const dynamic = "force-dynamic";

/**
 * Event ingest from GitHub Actions (parity-tracker.yml).
 *
 * Auth: shared secret in the `x-parity-secret` header == PARITY_INGEST_SECRET.
 * This route is exempt from the basic-auth middleware (see middleware.ts).
 *
 * Two shapes, both POST JSON:
 *
 *   push to a feature branch -> Dev lane
 *     { kind: "push", repo, branch, actor, at, prUrl? }
 *
 *   PR merged -> stage from base branch (dev | testing | main)
 *     { kind: "merge", repo, headBranch, baseBranch, title?, actor, at, prUrl?, prNumber? }
 *
 * Platform: for single-platform repos (rork = iOS) it's implied by the repo
 * config; multi-platform repos may pass `platform` explicitly.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.PARITY_INGEST_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "ingest not configured" }, { status: 503 });
  }
  if (req.headers.get("x-parity-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const repo = String(body.repo ?? "");
  const cfg = REPO_CONFIG[repo];
  if (!cfg) {
    return NextResponse.json({ skipped: `unknown repo ${repo}` }, { status: 200 });
  }

  const at = typeof body.at === "string" ? body.at : new Date().toISOString();
  const actor = body.actor ? String(body.actor) : null;
  const prUrl = body.prUrl ? String(body.prUrl) : null;
  const prNumber = typeof body.prNumber === "number" ? body.prNumber : null;
  const kind = String(body.kind ?? "");

  // Resolve platform(s): explicit override, else the repo's configured platforms
  // (for a single-platform repo like rork this is just the lead).
  const explicit = body.platform ? [String(body.platform) as Platform] : null;
  const platforms: Platform[] = explicit ?? (cfg.platforms.includes(cfg.lead) ? [cfg.lead] : cfg.platforms);

  let slug: string | null = null;
  let toStage: Stage | null = null;
  let title: string | undefined;

  if (kind === "push") {
    slug = slugFromBranch(cfg, String(body.branch ?? ""));
    toStage = "dev";
  } else if (kind === "merge") {
    slug = slugFromBranch(cfg, String(body.headBranch ?? ""));
    toStage = branchToStage(cfg, String(body.baseBranch ?? ""));
    title = body.title ? String(body.title) : undefined;
  } else {
    return NextResponse.json({ error: "unknown kind" }, { status: 400 });
  }

  if (!slug) {
    return NextResponse.json({ skipped: "no feature slug in branch" }, { status: 200 });
  }
  if (!toStage) {
    return NextResponse.json({ skipped: "branch is not a tracked lane" }, { status: 200 });
  }

  try {
    for (const platform of platforms) {
      await applyTransition({
        repo,
        slug,
        platform,
        toStage,
        at,
        title,
        actor,
        prUrl,
        prNumber,
        source: "github",
      });
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, repo, slug, stage: toStage, platforms });
}
