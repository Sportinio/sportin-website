import { getConfig } from "./config";
import {
  REPO_CONFIG,
  STAGE_ORDER,
  stageRank,
  slugFromBranch,
  slugToTitle,
  type Stage,
} from "./stages";
import type { ParityCard, ParityEvent } from "./parity-store";

// Live board projection straight from GitHub. Every merged PR / open PR becomes
// a lane transition with its real git timestamp, so the board is populated AND
// metrics are accurate from day one — no database required for display. The
// Supabase store layers on top later for manual cards + a durable going-forward
// log; it returns the same { cards, events } shapes so it drops in seamlessly.

const GH_GRAPHQL = "https://api.github.com/graphql";

const QUERY = /* GraphQL */ `
  query LiveBoard($owner: String!, $name: String!, $dev: String!, $testing: String!, $main: String!) {
    repository(owner: $owner, name: $name) {
      refs(refPrefix: "refs/heads/", first: 100, orderBy: { field: ALPHABETICAL, direction: ASC }) {
        nodes {
          name
          target {
            ... on Commit {
              committedDate
              author { user { login } name }
            }
          }
        }
      }
      devPRs: pullRequests(first: 100, baseRefName: $dev, states: MERGED, orderBy: { field: UPDATED_AT, direction: DESC }) {
        nodes { number title url mergedAt headRefName author { login } }
      }
      testingPRs: pullRequests(first: 100, baseRefName: $testing, states: MERGED, orderBy: { field: UPDATED_AT, direction: DESC }) {
        nodes { number title url mergedAt headRefName author { login } }
      }
      mainPRs: pullRequests(first: 100, baseRefName: $main, states: MERGED, orderBy: { field: UPDATED_AT, direction: DESC }) {
        nodes { number title url mergedAt headRefName author { login } }
      }
      openPRs: pullRequests(first: 100, states: OPEN, orderBy: { field: UPDATED_AT, direction: DESC }) {
        nodes { number title url createdAt headRefName baseRefName author { login } }
      }
    }
  }
`;

interface GHPR {
  number: number;
  title: string;
  url: string;
  mergedAt?: string;
  createdAt?: string;
  headRefName: string;
  baseRefName?: string;
  author?: { login?: string } | null;
}
interface GHRef {
  name: string;
  target: {
    committedDate?: string;
    author?: { user?: { login?: string } | null; name?: string } | null;
  } | null;
}
interface GHResult {
  refs: { nodes: GHRef[] };
  devPRs: { nodes: GHPR[] };
  testingPRs: { nodes: GHPR[] };
  mainPRs: { nodes: GHPR[] };
  openPRs: { nodes: GHPR[] };
}

const SKIP_PREFIXES = ["dependabot/", "archive/", "renovate/"];

function isNoise(branch: string): boolean {
  return (
    SKIP_PREFIXES.some((p) => branch.startsWith(p)) ||
    ["main", "dev", "testing", "master"].includes(branch)
  );
}

/** Slug = everything after the first "/" (feat/foo-bar -> foo-bar), else whole. */
function branchSlug(branch: string): string {
  const i = branch.indexOf("/");
  return i >= 0 ? branch.slice(i + 1) : branch;
}

interface FeatureAccum {
  slug: string;
  title: string;
  prUrl: string;
  prNumber: number;
  events: { stage: Stage; at: string; actor: string | null }[];
}

async function fetchRepo(
  token: string,
  owner: string,
  name: string,
  dev: string,
  testing: string,
  main: string,
): Promise<GHResult | null> {
  const res = await fetch(GH_GRAPHQL, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: QUERY, variables: { owner, name, dev, testing, main } }),
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${await res.text()}`);
  const json = await res.json();
  if (json.errors) {
    if (json.errors.some((e: { type?: string }) => e.type === "NOT_FOUND")) return null;
    throw new Error(`GitHub GraphQL: ${JSON.stringify(json.errors)}`);
  }
  return json.data.repository as GHResult;
}

export interface LiveBoard {
  cards: ParityCard[];
  events: ParityEvent[];
  warnings: string[];
}

export async function fetchLiveBoard(repoIds?: string[]): Promise<LiveBoard> {
  const cfg = getConfig();
  if (!cfg.token) throw new Error("GITHUB_TOKEN is not set");
  if (!cfg.org) throw new Error("GITHUB_ORG is not set");

  const repos = Object.values(REPO_CONFIG).filter(
    (r) => !repoIds || repoIds.includes(r.id),
  );

  const cards: ParityCard[] = [];
  const events: ParityEvent[] = [];
  const warnings: string[] = [];
  let eventId = 1;

  for (const repo of repos) {
    let result: GHResult | null;
    try {
      result = await fetchRepo(
        cfg.token,
        cfg.org,
        repo.id,
        repo.devBranch,
        repo.testingBranch,
        repo.mainBranch,
      );
    } catch (err) {
      warnings.push(`${repo.id}: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }
    if (!result) {
      warnings.push(`${repo.id}: not found or no access`);
      continue;
    }

    const accum = new Map<string, FeatureAccum>();
    const add = (pr: GHPR, stage: Stage, at?: string) => {
      if (!at || isNoise(pr.headRefName)) return;
      const slug = branchSlug(pr.headRefName);
      const entry = accum.get(slug) ?? {
        slug,
        title: pr.title || slug,
        prUrl: pr.url,
        prNumber: pr.number,
        events: [],
      };
      entry.events.push({ stage, at, actor: pr.author?.login ?? null });
      // Keep the title/PR from the furthest-along stage seen.
      entry.title = pr.title || entry.title;
      entry.prUrl = pr.url;
      entry.prNumber = pr.number;
      accum.set(slug, entry);
    };

    for (const pr of result.devPRs.nodes) add(pr, "dev", pr.mergedAt);
    for (const pr of result.testingPRs.nodes) add(pr, "testing", pr.mergedAt);
    for (const pr of result.mainPRs.nodes) add(pr, "main", pr.mergedAt);
    // Open PRs = work in progress -> Dev lane (only if not already merged anywhere).
    for (const pr of result.openPRs.nodes) {
      if (isNoise(pr.headRefName)) continue;
      const slug = branchSlug(pr.headRefName);
      if (accum.has(slug)) continue;
      add(pr, "dev", pr.createdAt);
    }
    // Pushed feature branches with no PR yet -> Dev lane. This is what makes a
    // card appear the moment you push feat/*, fix/*, feature/* — no PR needed.
    for (const ref of result.refs.nodes) {
      const slug = slugFromBranch(repo, ref.name);
      if (!slug || accum.has(slug)) continue;
      const at = ref.target?.committedDate;
      if (!at) continue;
      const actor = ref.target?.author?.user?.login ?? ref.target?.author?.name ?? null;
      accum.set(slug, {
        slug,
        title: slugToTitle(slug),
        prUrl: `https://github.com/${cfg.org}/${repo.id}/tree/${ref.name}`,
        prNumber: 0,
        events: [{ stage: "dev", at, actor }],
      });
    }

    const lead = repo.lead;

    for (const f of accum.values()) {
      // Dedup events per stage (keep earliest), sort chronologically.
      const byStage = new Map<Stage, string>();
      for (const e of f.events) {
        const cur = byStage.get(e.stage);
        if (!cur || new Date(e.at) < new Date(cur)) byStage.set(e.stage, e.at);
      }
      const ordered = [...f.events].sort((a, b) => +new Date(a.at) - +new Date(b.at));
      const stages = ordered
        .filter((e) => byStage.get(e.stage) === e.at)
        .sort((a, b) => stageRank(a.stage) - stageRank(b.stage));

      const current = stages.reduce<Stage>(
        (acc, e) => (stageRank(e.stage) > stageRank(acc) ? e.stage : acc),
        "backlog",
      );
      const leadId = `${repo.id}:${f.slug}:${lead}`;
      const createdAt = ordered[0]?.at ?? new Date().toISOString();
      const updatedAt = ordered[ordered.length - 1]?.at ?? createdAt;

      cards.push({
        id: leadId,
        repo: repo.id,
        feature_slug: f.slug,
        platform: lead,
        title: f.title,
        current_stage: current,
        is_lead: true,
        pr_url: f.prUrl,
        created_at: createdAt,
        updated_at: updatedAt,
      });

      let prev: Stage | null = null;
      for (const e of stages) {
        events.push({
          id: eventId++,
          card_id: leadId,
          from_stage: prev,
          to_stage: e.stage,
          at: e.at,
          source: "github",
          actor: e.actor,
          pr_url: f.prUrl,
          pr_number: f.prNumber,
        });
        prev = e.stage;
      }

      // Android (and any other non-lead platform) replica in Backlog so the lag
      // is visible. No events until Android does its own work.
      for (const platform of repo.platforms) {
        if (platform === lead) continue;
        cards.push({
          id: `${repo.id}:${f.slug}:${platform}`,
          repo: repo.id,
          feature_slug: f.slug,
          platform,
          title: f.title,
          current_stage: "backlog",
          is_lead: false,
          pr_url: null,
          created_at: createdAt,
          updated_at: createdAt,
        });
      }
    }
  }

  return { cards, events, warnings };
}

export { STAGE_ORDER };
