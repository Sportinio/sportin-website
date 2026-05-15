import type { DashboardData, FeatureRow, FeatureStatus, PRRef, PRStatus } from "./types";
import { getConfig, type Config } from "./config";

const GH_GRAPHQL = "https://api.github.com/graphql";

/**
 * Convention:
 *   - Every feature is a GitHub Issue in <org>/<FEATURES_REPO> with label "feature".
 *   - PRs reference the Issue via "Closes #N", "Fixes #N", or a Development link.
 *   - Priority label on the Issue: "P0", "P1", or "P2".
 *
 * In split-mode the PR's repo determines the platform.
 * In single-mode we look at the files the PR touched to decide whether it's
 * an iOS PR, an Android PR, or both.
 */

const QUERY = /* GraphQL */ `
  query Parity($org: String!, $repo: String!, $label: String!, $cursor: String) {
    repository(owner: $org, name: $repo) {
      issues(
        first: 50
        after: $cursor
        labels: [$label]
        states: [OPEN, CLOSED]
        orderBy: { field: UPDATED_AT, direction: DESC }
      ) {
        pageInfo { hasNextPage endCursor }
        nodes {
          number
          title
          url
          createdAt
          updatedAt
          closed
          labels(first: 20) { nodes { name } }
          timelineItems(itemTypes: [CROSS_REFERENCED_EVENT, CONNECTED_EVENT], first: 50) {
            nodes {
              __typename
              ... on CrossReferencedEvent {
                source {
                  __typename
                  ... on PullRequest {
                    number title url isDraft merged mergedAt updatedAt closed state
                    author { login }
                    repository { name owner { login } }
                  }
                }
              }
              ... on ConnectedEvent {
                subject {
                  __typename
                  ... on PullRequest {
                    number title url isDraft merged mergedAt updatedAt closed state
                    author { login }
                    repository { name owner { login } }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

interface GHPullRequest {
  __typename: "PullRequest";
  number: number;
  title: string;
  url: string;
  isDraft: boolean;
  merged: boolean;
  mergedAt: string | null;
  updatedAt: string;
  closed: boolean;
  state: "OPEN" | "CLOSED" | "MERGED";
  author: { login: string } | null;
  repository: { name: string; owner: { login: string } };
}

function classifyPR(pr: GHPullRequest): PRStatus {
  if (pr.merged) return "merged";
  if (pr.state === "CLOSED") return "closed";
  if (pr.isDraft) return "draft";
  return "open";
}

function statusFromPRs(prs: PRRef[]): FeatureStatus {
  if (prs.some((p) => p.status === "merged")) return "merged";
  if (prs.some((p) => p.status === "open")) return "in_review";
  if (prs.some((p) => p.status === "draft")) return "in_progress";
  return "not_started";
}

function priorityFromLabels(labels: string[]): "P0" | "P1" | "P2" | null {
  const up = labels.map((l) => l.toUpperCase());
  if (up.includes("P0")) return "P0";
  if (up.includes("P1")) return "P1";
  if (up.includes("P2")) return "P2";
  return null;
}

async function githubFetch<T>(token: string, body: object): Promise<T> {
  const res = await fetch(GH_GRAPHQL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "sportin-parity-dashboard",
    },
    body: JSON.stringify(body),
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  if (json.errors) {
    throw new Error("GitHub GraphQL: " + JSON.stringify(json.errors));
  }
  return json.data as T;
}

async function githubRest<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "sportin-parity-dashboard",
    },
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    throw new Error(`GitHub REST ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as T;
}

/**
 * Single-mode: list files touched by a PR and classify by path prefix.
 * Cached for 60s via the fetch revalidate option.
 */
async function classifyPRPaths(
  token: string,
  owner: string,
  repo: string,
  number: number,
  iosPrefix: string,
  androidPrefix: string,
): Promise<{ ios: boolean; android: boolean }> {
  type GHFile = { filename: string };
  const files = await githubRest<GHFile[]>(
    token,
    `/repos/${owner}/${repo}/pulls/${number}/files?per_page=100`,
  );

  let ios = false;
  let android = false;
  const iosLc = iosPrefix.toLowerCase();
  const andLc = androidPrefix.toLowerCase();
  for (const f of files) {
    const lc = f.filename.toLowerCase();
    if (lc.startsWith(iosLc) || lc.includes("/" + iosLc)) ios = true;
    if (lc.startsWith(andLc) || lc.includes("/" + andLc)) android = true;
    if (ios && android) break;
  }
  return { ios, android };
}

function makeRef(pr: GHPullRequest): PRRef {
  return {
    number: pr.number,
    title: pr.title,
    url: pr.url,
    status: classifyPR(pr),
    mergedAt: pr.mergedAt,
    updatedAt: pr.updatedAt,
    author: pr.author?.login || null,
  };
}

export async function fetchDashboard(): Promise<DashboardData> {
  const cfg: Config = getConfig();
  if (cfg.missing.length) {
    throw new Error(`Missing env vars: ${cfg.missing.join(", ")}`);
  }

  const features: FeatureRow[] = [];
  let cursor: string | null = null;

  type IssuesResponse = {
    repository: {
      issues: {
        pageInfo: { hasNextPage: boolean; endCursor: string };
        nodes: Array<{
          number: number;
          title: string;
          url: string;
          createdAt: string;
          updatedAt: string;
          closed: boolean;
          labels: { nodes: Array<{ name: string }> };
          timelineItems: { nodes: Array<{ __typename: string; source?: GHPullRequest; subject?: GHPullRequest }> };
        }>;
      };
    };
  };

  for (let page = 0; page < 5; page++) {
    const data: IssuesResponse = await githubFetch<IssuesResponse>(cfg.token, {
      query: QUERY,
      variables: { org: cfg.org, repo: cfg.featuresRepo, label: cfg.featureLabel, cursor },
    });

    const issues = data.repository?.issues;
    if (!issues) break;

    for (const issue of issues.nodes) {
      const labels: string[] = (issue.labels?.nodes || []).map((l: { name: string }) => l.name);

      // Collect distinct PRs first; we'll classify after.
      const seenPRs = new Map<string, GHPullRequest>();
      for (const ev of issue.timelineItems?.nodes || []) {
        const pr: GHPullRequest | undefined =
          ev.__typename === "CrossReferencedEvent" ? ev.source : ev.subject;
        if (!pr || pr.__typename !== "PullRequest") continue;
        if (pr.repository.owner.login.toLowerCase() !== cfg.org.toLowerCase()) continue;
        seenPRs.set(`${pr.repository.name}#${pr.number}`, pr);
      }

      const iosPRs: PRRef[] = [];
      const androidPRs: PRRef[] = [];

      for (const pr of seenPRs.values()) {
        if (cfg.mode === "split") {
          if (pr.repository.name === cfg.iosRepo) iosPRs.push(makeRef(pr));
          else if (pr.repository.name === cfg.androidRepo) androidPRs.push(makeRef(pr));
        } else if (cfg.mode === "single" && pr.repository.name === cfg.mobileRepo) {
          try {
            const { ios, android } = await classifyPRPaths(
              cfg.token,
              cfg.org,
              cfg.mobileRepo!,
              pr.number,
              cfg.iosPath || "ios/",
              cfg.androidPath || "android/",
            );
            const ref = makeRef(pr);
            if (ios) iosPRs.push(ref);
            if (android) androidPRs.push(ref);
            // If neither matched (e.g. shared infra PR), don't count toward either.
          } catch {
            // ignore individual PR failures
          }
        }
      }

      features.push({
        number: issue.number,
        title: issue.title,
        url: issue.url,
        priority: priorityFromLabels(labels),
        ios: { status: statusFromPRs(iosPRs), prs: iosPRs },
        android: { status: statusFromPRs(androidPRs), prs: androidPRs },
        createdAt: issue.createdAt,
        updatedAt: issue.updatedAt,
        closed: issue.closed,
      });
    }

    if (!issues.pageInfo?.hasNextPage) break;
    cursor = issues.pageInfo.endCursor;
  }

  // Drift counts: one platform merged, the other not.
  let iosAhead = 0;
  let androidAhead = 0;
  for (const f of features) {
    if (f.ios.status === "merged" && f.android.status !== "merged") iosAhead++;
    if (f.android.status === "merged" && f.ios.status !== "merged") androidAhead++;
  }

  // Drift first, then priority, then recent.
  const priWeight = (p: string | null) => (p === "P0" ? 0 : p === "P1" ? 1 : p === "P2" ? 2 : 3);
  const driftWeight = (f: FeatureRow) =>
    f.ios.status === "merged" && f.android.status !== "merged"
      ? 0
      : f.android.status === "merged" && f.ios.status !== "merged"
        ? 0
        : f.ios.status === "merged" && f.android.status === "merged"
          ? 2
          : 1;
  features.sort((a, b) => {
    const d = driftWeight(a) - driftWeight(b);
    if (d) return d;
    const p = priWeight(a.priority) - priWeight(b.priority);
    if (p) return p;
    return b.updatedAt.localeCompare(a.updatedAt);
  });

  const iosLabel =
    cfg.mode === "split" ? `${cfg.org}/${cfg.iosRepo}` : `${cfg.org}/${cfg.mobileRepo}:${cfg.iosPath}`;
  const androidLabel =
    cfg.mode === "split"
      ? `${cfg.org}/${cfg.androidRepo}`
      : `${cfg.org}/${cfg.mobileRepo}:${cfg.androidPath}`;

  return {
    features,
    iosAhead,
    androidAhead,
    fetchedAt: new Date().toISOString(),
    config: {
      featuresRepo: `${cfg.org}/${cfg.featuresRepo}`,
      iosRepo: iosLabel,
      androidRepo: androidLabel,
      iosAheadLimit: cfg.iosAheadLimit,
    },
  };
}
