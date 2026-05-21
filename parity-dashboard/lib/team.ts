import { getConfig } from "./config";

/** Commit record after aggregation. */
export interface RawCommit {
  oid: string;
  message: string;
  committedDate: string; // ISO
  authoredDate: string;  // ISO — may differ from committedDate when history is rewritten
  additions: number;
  deletions: number;
  author: string; // login or fallback name
  aiAssisted: boolean;
  branches: string[]; // branches we saw this OID on
}

export interface DayStat {
  date: string;        // YYYY-MM-DD
  commits: number;
  additions: number;
  deletions: number;
  firstAt: string | null;
  lastAt: string | null;
  activeMinutes: number; // last - first per day, capped at 8h
  aiAssistedCommits: number;
  /** Max commits within any rolling 10-minute window. ≥3 = strong burst signal. */
  maxBurst: number;
  /** Time (minutes) covered by the largest burst — small numbers + many commits = suspicious. */
  burstSpanMinutes: number;
  /** Branches touched this day. */
  branches: string[];
}

export interface AuthorStats {
  author: string;
  commits: number;
  additions: number;
  deletions: number;
  aiAssistedCommits: number;
  aiAssistedPct: number;
  activeDays: number;
  totalActiveMinutes: number;
  avgActiveMinutesPerDay: number;
  avgCommitSize: number;
  byDay: Record<string, DayStat>;
  lastSeenAt: string | null;
  firstSeenAt: string | null;
  /** All branches this author has touched in the range. */
  branchesTouched: string[];
}

export interface TeamData {
  authors: AuthorStats[];
  dayRange: { from: string; to: string; days: number };
  totals: {
    commits: number;
    additions: number;
    deletions: number;
    aiAssistedCommits: number;
  };
  warnings: string[];
  fetchedAt: string;
  /** Repo we scanned. */
  repo: string;
  /** Branch names that were scanned. */
  branchesScanned: string[];
}

const GH_GRAPHQL = "https://api.github.com/graphql";

interface CommitNode {
  oid: string;
  message: string;
  committedDate: string;
  authoredDate: string;
  additions: number;
  deletions: number;
  author: {
    name?: string;
    email?: string;
    user?: { login?: string } | null;
  } | null;
}

const BRANCHES_QUERY = /* GraphQL */ `
  query Branches($org: String!, $repo: String!) {
    repository(owner: $org, name: $repo) {
      refs(refPrefix: "refs/heads/", first: 100) {
        nodes { name }
      }
    }
  }
`;

const COMMITS_QUERY = /* GraphQL */ `
  query Commits($org: String!, $repo: String!, $branch: String!, $since: GitTimestamp!) {
    repository(owner: $org, name: $repo) {
      ref(qualifiedName: $branch) {
        target {
          ... on Commit {
            history(first: 100, since: $since) {
              nodes {
                oid
                message
                committedDate
                authoredDate
                additions
                deletions
                author {
                  name
                  email
                  user { login }
                }
              }
            }
          }
        }
      }
    }
  }
`;

async function gh<T>(
  token: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<T | null> {
  try {
    const res = await fetch(GH_GRAPHQL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "sportin-parity-dashboard",
      },
      body: JSON.stringify({ query, variables }),
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.errors) return null;
    return json.data as T;
  } catch {
    return null;
  }
}

async function fetchAllBranchNames(
  token: string,
  org: string,
  repo: string,
): Promise<string[]> {
  const data = await gh<{
    repository: { refs: { nodes: { name: string }[] } };
  }>(token, BRANCHES_QUERY, { org, repo });
  return data?.repository.refs.nodes.map((n) => n.name) || [];
}

async function fetchBranchCommits(
  token: string,
  org: string,
  repo: string,
  branch: string,
  since: string,
): Promise<CommitNode[]> {
  const data = await gh<{
    repository: { ref: { target: { history: { nodes: CommitNode[] } } } | null };
  }>(token, COMMITS_QUERY, {
    org,
    repo,
    branch: `refs/heads/${branch}`,
    since,
  });
  return data?.repository?.ref?.target?.history?.nodes || [];
}

function dayKey(iso: string) {
  return iso.slice(0, 10);
}

function detectAI(message: string): boolean {
  const lc = message.toLowerCase();
  return (
    lc.includes("co-authored-by: claude") ||
    lc.includes("co-authored-by: kiro") ||
    lc.includes("co-authored-by: cursor") ||
    lc.includes("co-authored-by: github copilot") ||
    lc.includes("🤖 generated with") ||
    lc.includes("generated with claude code") ||
    (lc.includes("[skip ci]") && lc.includes("automated"))
  );
}

/**
 * Sliding-window count: maximum number of commits within any 10-minute window.
 * 3+ commits in a window strongly suggests batched landings rather than real work.
 */
function computeBurst(times: number[]): { maxBurst: number; burstSpanMs: number } {
  if (times.length === 0) return { maxBurst: 0, burstSpanMs: 0 };
  const sorted = [...times].sort((a, b) => a - b);
  const window = 10 * 60 * 1000;
  let max = 1;
  let burstSpan = 0;
  let left = 0;
  for (let right = 0; right < sorted.length; right++) {
    while (sorted[right] - sorted[left] > window) left++;
    const count = right - left + 1;
    if (count > max) {
      max = count;
      burstSpan = sorted[right] - sorted[left];
    }
  }
  return { maxBurst: max, burstSpanMs: burstSpan };
}

export async function fetchTeam(days = 30): Promise<TeamData> {
  const cfg = getConfig();
  const warnings: string[] = [];

  const repo = cfg.mode === "single" ? cfg.mobileRepo : cfg.iosRepo;
  if (!cfg.token || !cfg.org || !repo) {
    return {
      authors: [],
      dayRange: { from: "", to: "", days },
      totals: { commits: 0, additions: 0, deletions: 0, aiAssistedCommits: 0 },
      warnings: [
        "Team page requires GITHUB_TOKEN, GITHUB_ORG, and a configured mobile repo.",
      ],
      fetchedAt: new Date().toISOString(),
      repo: "",
      branchesScanned: [],
    };
  }

  const sinceDate = new Date(Date.now() - days * 86400000);
  const since = sinceDate.toISOString();

  // Scan every branch — catches WIP pushed to feature branches that hasn't
  // merged yet. Without this, locally-merged-and-rebased work appears as a
  // single batch on the merge day even when it took multiple days.
  const branches = await fetchAllBranchNames(cfg.token, cfg.org, repo);
  if (branches.length === 0) {
    warnings.push(`No branches found in ${cfg.org}/${repo}.`);
  }

  const branchResults = await Promise.all(
    branches.map(async (b) => ({
      branch: b,
      nodes: await fetchBranchCommits(cfg.token, cfg.org, repo, b, since),
    })),
  );

  const seen = new Map<string, RawCommit>();
  for (const { branch, nodes } of branchResults) {
    for (const n of nodes) {
      const existing = seen.get(n.oid);
      if (existing) {
        if (!existing.branches.includes(branch)) existing.branches.push(branch);
        continue;
      }
      const login =
        n.author?.user?.login || n.author?.name || n.author?.email || "unknown";
      seen.set(n.oid, {
        oid: n.oid,
        message: n.message,
        committedDate: n.committedDate,
        authoredDate: n.authoredDate,
        additions: n.additions,
        deletions: n.deletions,
        author: login,
        aiAssisted: detectAI(n.message),
        branches: [branch],
      });
    }
  }

  if (seen.size === 0) {
    warnings.push(
      `No commits found in the last ${days} days across ${branches.length} branches of ${cfg.org}/${repo}.`,
    );
  }

  const byAuthor = new Map<string, RawCommit[]>();
  for (const c of seen.values()) {
    const arr = byAuthor.get(c.author) ?? [];
    arr.push(c);
    byAuthor.set(c.author, arr);
  }

  const authors: AuthorStats[] = [];
  for (const [author, list] of byAuthor.entries()) {
    list.sort((a, b) => a.committedDate.localeCompare(b.committedDate));

    const byDayMap = new Map<string, RawCommit[]>();
    for (const c of list) {
      const k = dayKey(c.committedDate);
      const arr = byDayMap.get(k) ?? [];
      arr.push(c);
      byDayMap.set(k, arr);
    }

    const dayStats: Record<string, DayStat> = {};
    let totalActive = 0;
    let activeDays = 0;
    for (const [date, commits] of byDayMap.entries()) {
      commits.sort((a, b) => a.committedDate.localeCompare(b.committedDate));
      const firstAt = commits[0].committedDate;
      const lastAt = commits[commits.length - 1].committedDate;
      const spanMs = Math.max(
        0,
        new Date(lastAt).getTime() - new Date(firstAt).getTime(),
      );
      let activeMin = Math.round(spanMs / 60000);
      if (commits.length === 1) activeMin = 10;
      activeMin = Math.min(activeMin, 8 * 60);

      const additions = commits.reduce((a, c) => a + c.additions, 0);
      const deletions = commits.reduce((a, c) => a + c.deletions, 0);
      const aiAssistedCommits = commits.reduce(
        (a, c) => a + (c.aiAssisted ? 1 : 0),
        0,
      );
      const times = commits.map((c) => new Date(c.committedDate).getTime());
      const { maxBurst, burstSpanMs } = computeBurst(times);
      const dayBranches = Array.from(
        new Set(commits.flatMap((c) => c.branches)),
      ).sort();

      dayStats[date] = {
        date,
        commits: commits.length,
        additions,
        deletions,
        firstAt,
        lastAt,
        activeMinutes: activeMin,
        aiAssistedCommits,
        maxBurst,
        burstSpanMinutes: Math.round(burstSpanMs / 60000),
        branches: dayBranches,
      };
      totalActive += activeMin;
      activeDays++;
    }

    const additions = list.reduce((a, c) => a + c.additions, 0);
    const deletions = list.reduce((a, c) => a + c.deletions, 0);
    const aiAssistedCommits = list.reduce(
      (a, c) => a + (c.aiAssisted ? 1 : 0),
      0,
    );
    const branchesTouched = Array.from(
      new Set(list.flatMap((c) => c.branches)),
    ).sort();

    authors.push({
      author,
      commits: list.length,
      additions,
      deletions,
      aiAssistedCommits,
      aiAssistedPct: list.length > 0 ? aiAssistedCommits / list.length : 0,
      activeDays,
      totalActiveMinutes: totalActive,
      avgActiveMinutesPerDay: activeDays > 0 ? Math.round(totalActive / activeDays) : 0,
      avgCommitSize:
        list.length > 0 ? Math.round((additions + deletions) / list.length) : 0,
      byDay: dayStats,
      lastSeenAt: list[list.length - 1]?.committedDate || null,
      firstSeenAt: list[0]?.committedDate || null,
      branchesTouched,
    });
  }

  authors.sort((a, b) => b.commits - a.commits);

  const totals = {
    commits: 0,
    additions: 0,
    deletions: 0,
    aiAssistedCommits: 0,
  };
  for (const a of authors) {
    totals.commits += a.commits;
    totals.additions += a.additions;
    totals.deletions += a.deletions;
    totals.aiAssistedCommits += a.aiAssistedCommits;
  }

  return {
    authors,
    dayRange: {
      from: sinceDate.toISOString().slice(0, 10),
      to: new Date().toISOString().slice(0, 10),
      days,
    },
    totals,
    warnings,
    fetchedAt: new Date().toISOString(),
    repo,
    branchesScanned: branches,
  };
}
