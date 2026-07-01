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

// Live board projection from GitHub, built to match the real workflow: fixes are
// pushed straight to `testing`, then promoted to `main` (production). So the unit
// of work is a COMMIT, keyed by its message so the same fix on testing and main
// correlates even if the SHA changes on promotion.
//
//   Testing lane = recent commits on testing not yet on main
//   Main lane    = recent commits on main (shipped to production)
//   Dev lane     = work-in-progress: open PRs + pushed feature branches
//
// Timings come from real commit dates. No database needed for display.

const GH_GRAPHQL = "https://api.github.com/graphql";

// Cap on commit-cards so a branch that is hundreds of commits ahead doesn't
// flood the board. Most-recent first; truncation is surfaced as a warning.
const MAX_COMMIT_CARDS = 60;
const HISTORY_DEPTH = 100; // GitHub GraphQL caps history(first:) at 100

const QUERY = /* GraphQL */ `
  query LiveBoard($owner: String!, $name: String!, $testingRef: String!, $mainRef: String!) {
    repository(owner: $owner, name: $name) {
      testing: ref(qualifiedName: $testingRef) {
        target { ... on Commit { history(first: ${HISTORY_DEPTH}) { nodes { oid messageHeadline committedDate author { user { login } name } } } } }
      }
      main: ref(qualifiedName: $mainRef) {
        target { ... on Commit { history(first: ${HISTORY_DEPTH}) { nodes { oid messageHeadline committedDate author { user { login } name } } } } }
      }
      refs(refPrefix: "refs/heads/", first: 100) {
        nodes { name target { ... on Commit { committedDate author { user { login } name } } } }
      }
      openPRs: pullRequests(first: 100, states: OPEN, orderBy: { field: UPDATED_AT, direction: DESC }) {
        nodes { number title url createdAt headRefName author { login } }
      }
    }
  }
`;

interface GHCommit {
  oid: string;
  messageHeadline: string;
  committedDate: string;
  author?: { user?: { login?: string } | null; name?: string } | null;
}
interface GHRef {
  name: string;
  target: { committedDate?: string; author?: { user?: { login?: string } | null; name?: string } | null } | null;
}
interface GHPR {
  number: number;
  title: string;
  url: string;
  createdAt: string;
  headRefName: string;
  author?: { login?: string } | null;
}
interface GHResult {
  testing: { target?: { history?: { nodes: GHCommit[] } } | null } | null;
  main: { target?: { history?: { nodes: GHCommit[] } } | null } | null;
  refs: { nodes: GHRef[] };
  openPRs: { nodes: GHPR[] };
}

const SKIP_BRANCHES = ["main", "dev", "testing", "master"];
function isNoiseBranch(b: string): boolean {
  return (
    SKIP_BRANCHES.includes(b) ||
    b.startsWith("dependabot/") ||
    b.startsWith("archive/") ||
    b.startsWith("renovate/")
  );
}
function isMergeCommit(headline: string): boolean {
  return /^merge (branch|pull request|remote)/i.test(headline.trim());
}
/** Normalized key for correlating the same fix across testing and main. */
function commitKey(headline: string): string {
  return headline.trim().replace(/\s+/g, " ").toLowerCase();
}
function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "commit"
  );
}
function actorOf(c: { author?: { user?: { login?: string } | null; name?: string } | null }): string | null {
  return c.author?.user?.login ?? c.author?.name ?? null;
}

async function fetchRepo(
  token: string,
  owner: string,
  name: string,
  testingRef: string,
  mainRef: string,
): Promise<GHResult | null> {
  const res = await fetch(GH_GRAPHQL, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: QUERY, variables: { owner, name, testingRef, mainRef } }),
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

interface CommitInfo {
  at: string;
  actor: string | null;
  title: string;
}

/** Dedup a commit history by message key, keeping the OLDEST occurrence (when
 *  the fix first entered that branch). History is newest-first, so overwrite. */
function indexHistory(nodes: GHCommit[]): Map<string, CommitInfo> {
  const map = new Map<string, CommitInfo>();
  for (const c of nodes) {
    if (!c.messageHeadline || isMergeCommit(c.messageHeadline)) continue;
    map.set(commitKey(c.messageHeadline), {
      at: c.committedDate,
      actor: actorOf(c),
      title: c.messageHeadline,
    });
  }
  return map;
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

  const repos = Object.values(REPO_CONFIG).filter((r) => !repoIds || repoIds.includes(r.id));

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
        `refs/heads/${repo.testingBranch}`,
        `refs/heads/${repo.mainBranch}`,
      );
    } catch (err) {
      warnings.push(`${repo.id}: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }
    if (!result) {
      warnings.push(`${repo.id}: not found or no access`);
      continue;
    }

    const lead = repo.lead;
    const testingIdx = indexHistory(result.testing?.target?.history?.nodes ?? []);
    const mainIdx = indexHistory(result.main?.target?.history?.nodes ?? []);

    interface Unit {
      key: string;
      slug: string;
      title: string;
      prUrl: string | null;
      current: Stage;
      events: { stage: Stage; at: string; actor: string | null }[];
      lastAt: number;
    }
    const units: Unit[] = [];

    // Commit-based units: everything on testing and/or main.
    const allKeys = new Set([...testingIdx.keys(), ...mainIdx.keys()]);
    for (const key of allKeys) {
      const t = testingIdx.get(key);
      const m = mainIdx.get(key);
      const evs: { stage: Stage; at: string; actor: string | null }[] = [];
      if (t) evs.push({ stage: "testing", at: t.at, actor: t.actor });
      if (m) evs.push({ stage: "main", at: m.at, actor: m.actor });
      evs.sort((a, b) => +new Date(a.at) - +new Date(b.at));
      const title = (m ?? t)!.title;
      units.push({
        key,
        slug: slugify(title),
        title,
        prUrl: null,
        current: m ? "main" : "testing",
        events: evs,
        lastAt: Math.max(...evs.map((e) => +new Date(e.at))),
      });
    }

    // Keep only the most-recent commit units.
    units.sort((a, b) => b.lastAt - a.lastAt);
    if (units.length > MAX_COMMIT_CARDS) {
      warnings.push(
        `${repo.id}: showing ${MAX_COMMIT_CARDS} most-recent commits (of ${units.length}) on testing/main`,
      );
      units.length = MAX_COMMIT_CARDS;
    }

    // Dev lane = work in progress: open PRs + pushed feature branches (no merge).
    const wipKeys = new Set<string>();
    for (const pr of result.openPRs.nodes) {
      if (isNoiseBranch(pr.headRefName)) continue;
      const slug = slugFromBranch(repo, pr.headRefName) ?? pr.headRefName;
      if (wipKeys.has(slug)) continue;
      wipKeys.add(slug);
      units.push({
        key: `wip:${slug}`,
        slug: slugify(slug),
        title: pr.title || slugToTitle(slug),
        prUrl: pr.url,
        current: "dev",
        events: [{ stage: "dev", at: pr.createdAt, actor: pr.author?.login ?? null }],
        lastAt: +new Date(pr.createdAt),
      });
    }
    for (const ref of result.refs.nodes) {
      const slug = slugFromBranch(repo, ref.name);
      if (!slug || wipKeys.has(slug)) continue;
      const at = ref.target?.committedDate;
      if (!at) continue;
      wipKeys.add(slug);
      units.push({
        key: `wip:${slug}`,
        slug: slugify(slug),
        title: slugToTitle(slug),
        prUrl: `https://github.com/${cfg.org}/${repo.id}/tree/${ref.name}`,
        current: "dev",
        events: [{ stage: "dev", at, actor: actorOf(ref.target ?? {}) }],
        lastAt: +new Date(at),
      });
    }

    // Emit cards + events + Android replicas.
    for (const u of units) {
      const leadId = `${repo.id}:${u.slug}:${lead}`;
      const createdAt = u.events[0]?.at ?? new Date().toISOString();
      const updatedAt = u.events[u.events.length - 1]?.at ?? createdAt;

      cards.push({
        id: leadId,
        repo: repo.id,
        feature_slug: u.slug,
        platform: lead,
        title: u.title,
        current_stage: u.current,
        is_lead: true,
        pr_url: u.prUrl,
        created_at: createdAt,
        updated_at: updatedAt,
      });

      let prev: Stage | null = null;
      const ordered = [...u.events].sort((a, b) => stageRank(a.stage) - stageRank(b.stage));
      for (const e of ordered) {
        events.push({
          id: eventId++,
          card_id: leadId,
          from_stage: prev,
          to_stage: e.stage,
          at: e.at,
          source: "github",
          actor: e.actor,
          pr_url: u.prUrl,
          pr_number: null,
        });
        prev = e.stage;
      }

      for (const platform of repo.platforms) {
        if (platform === lead) continue;
        cards.push({
          id: `${repo.id}:${u.slug}:${platform}`,
          repo: repo.id,
          feature_slug: u.slug,
          platform,
          title: u.title,
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
