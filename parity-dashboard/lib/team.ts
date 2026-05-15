import { getConfig } from "./config";

/** Commit record after aggregation. */
export interface RawCommit {
  oid: string;
  message: string;
  committedDate: string; // ISO
  additions: number;
  deletions: number;
  author: string; // login or fallback name
  aiAssisted: boolean;
  branch: string;
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
}

const GH_GRAPHQL = "https://api.github.com/graphql";

interface BranchHistory {
  nodes: Array<{
    oid: string;
    message: string;
    committedDate: string;
    additions: number;
    deletions: number;
    author: { name?: string; email?: string; user?: { login?: string } | null } | null;
  }>;
}

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

async function fetchBranchCommits(
  token: string,
  org: string,
  repo: string,
  branch: string,
  since: string,
): Promise<BranchHistory["nodes"]> {
  try {
    const res = await fetch(GH_GRAPHQL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "sportin-parity-dashboard",
      },
      body: JSON.stringify({
        query: COMMITS_QUERY,
        variables: { org, repo, branch: `refs/heads/${branch}`, since },
      }),
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data?.repository?.ref?.target?.history?.nodes || [];
  } catch {
    return [];
  }
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
    lc.includes("[skip ci]") && lc.includes("automated") // weak signal
  );
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
      warnings: ["Team page requires GITHUB_TOKEN, GITHUB_ORG, and a configured mobile repo."],
      fetchedAt: new Date().toISOString(),
    };
  }

  const sinceDate = new Date(Date.now() - days * 86400000);
  const since = sinceDate.toISOString();

  // Pull from main + dev. Each branch's history covers everything that merged
  // into it, so this captures the bulk of activity. (Direct-to-feature-branch
  // commits that never merged are not counted — by design.)
  const [mainNodes, devNodes] = await Promise.all([
    fetchBranchCommits(cfg.token, cfg.org, repo, cfg.mainBranch, since),
    fetchBranchCommits(cfg.token, cfg.org, repo, cfg.devBranch, since),
  ]);

  const seen = new Map<string, RawCommit>();
  function intake(nodes: BranchHistory["nodes"], branch: string) {
    for (const n of nodes) {
      if (seen.has(n.oid)) continue;
      const login = n.author?.user?.login || n.author?.name || n.author?.email || "unknown";
      seen.set(n.oid, {
        oid: n.oid,
        message: n.message,
        committedDate: n.committedDate,
        additions: n.additions,
        deletions: n.deletions,
        author: login,
        aiAssisted: detectAI(n.message),
        branch,
      });
    }
  }
  intake(mainNodes, cfg.mainBranch);
  intake(devNodes, cfg.devBranch);

  if (seen.size === 0) {
    warnings.push(
      `No commits found in the last ${days} days on ${cfg.mainBranch} or ${cfg.devBranch} of ${cfg.org}/${repo}.`,
    );
  }

  // Aggregate by author.
  const byAuthor = new Map<string, RawCommit[]>();
  for (const c of seen.values()) {
    const arr = byAuthor.get(c.author) ?? [];
    arr.push(c);
    byAuthor.set(c.author, arr);
  }

  const authors: AuthorStats[] = [];
  for (const [author, list] of byAuthor.entries()) {
    list.sort((a, b) => a.committedDate.localeCompare(b.committedDate));

    const byDay = new Map<string, RawCommit[]>();
    for (const c of list) {
      const k = dayKey(c.committedDate);
      const arr = byDay.get(k) ?? [];
      arr.push(c);
      byDay.set(k, arr);
    }

    const dayStats: Record<string, DayStat> = {};
    let totalActive = 0;
    let activeDays = 0;
    for (const [date, commits] of byDay.entries()) {
      commits.sort((a, b) => a.committedDate.localeCompare(b.committedDate));
      const firstAt = commits[0].committedDate;
      const lastAt = commits[commits.length - 1].committedDate;
      const spanMs = Math.max(0, new Date(lastAt).getTime() - new Date(firstAt).getTime());
      let activeMin = Math.round(spanMs / 60000);
      // single-commit day: assume ~10 min of work to be fair
      if (commits.length === 1) activeMin = 10;
      // cap at 8h to filter out overnight outliers (anomaly cleanup)
      activeMin = Math.min(activeMin, 8 * 60);

      const additions = commits.reduce((a, c) => a + c.additions, 0);
      const deletions = commits.reduce((a, c) => a + c.deletions, 0);
      const aiAssistedCommits = commits.reduce((a, c) => a + (c.aiAssisted ? 1 : 0), 0);

      dayStats[date] = {
        date,
        commits: commits.length,
        additions,
        deletions,
        firstAt,
        lastAt,
        activeMinutes: activeMin,
        aiAssistedCommits,
      };
      totalActive += activeMin;
      activeDays++;
    }

    const additions = list.reduce((a, c) => a + c.additions, 0);
    const deletions = list.reduce((a, c) => a + c.deletions, 0);
    const aiAssistedCommits = list.reduce((a, c) => a + (c.aiAssisted ? 1 : 0), 0);

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
      avgCommitSize: list.length > 0 ? Math.round((additions + deletions) / list.length) : 0,
      byDay: dayStats,
      lastSeenAt: list[list.length - 1]?.committedDate || null,
      firstSeenAt: list[0]?.committedDate || null,
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

  const today = new Date();
  return {
    authors,
    dayRange: {
      from: sinceDate.toISOString().slice(0, 10),
      to: today.toISOString().slice(0, 10),
      days,
    },
    totals,
    warnings,
    fetchedAt: new Date().toISOString(),
  };
}
