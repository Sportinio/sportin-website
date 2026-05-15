import type { DashboardData, FeatureRow, FeatureStatus, PRRef, PRStatus } from "./types";
import { getConfig } from "./config";

const GH_GRAPHQL = "https://api.github.com/graphql";

/**
 * Convention (Option A — tracking issues):
 *   - Every feature is a GitHub Issue in <org>/<FEATURES_REPO> with label "feature".
 *   - PRs in <org>/<IOS_REPO> and <org>/<ANDROID_REPO> reference the Issue using
 *     "Closes #N", "Fixes #N", or a cross-link. GitHub records these as
 *     CROSS_REFERENCED_EVENT timeline items on the Issue.
 *   - Priority is set via label on the Issue: "P0", "P1", or "P2".
 *
 * For each feature, we pair the PRs by repo (iOS vs Android) and derive a
 * FeatureStatus per platform:
 *   merged       any merged PR
 *   in_review    open non-draft PR
 *   in_progress  draft PR
 *   not_started  no PR
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
                    number
                    title
                    url
                    isDraft
                    merged
                    mergedAt
                    updatedAt
                    closed
                    state
                    author { login }
                    repository { name owner { login } }
                  }
                }
              }
              ... on ConnectedEvent {
                subject {
                  __typename
                  ... on PullRequest {
                    number
                    title
                    url
                    isDraft
                    merged
                    mergedAt
                    updatedAt
                    closed
                    state
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

async function githubFetch(token: string, body: object) {
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
  return json.data;
}

export async function fetchDashboard(): Promise<DashboardData> {
  const cfg = getConfig();
  if (cfg.missing.length) {
    throw new Error(`Missing env vars: ${cfg.missing.join(", ")}`);
  }

  const features: FeatureRow[] = [];
  let cursor: string | null = null;

  for (let page = 0; page < 5; page++) {
    const data = await githubFetch(cfg.token, {
      query: QUERY,
      variables: { org: cfg.org, repo: cfg.featuresRepo, label: cfg.featureLabel, cursor },
    });

    const issues = data.repository?.issues;
    if (!issues) break;

    for (const issue of issues.nodes) {
      const labels: string[] = (issue.labels?.nodes || []).map((l: { name: string }) => l.name);

      const iosPRs: PRRef[] = [];
      const androidPRs: PRRef[] = [];

      for (const ev of issue.timelineItems?.nodes || []) {
        const pr: GHPullRequest | undefined =
          ev.__typename === "CrossReferencedEvent" ? ev.source : ev.subject;
        if (!pr || pr.__typename !== "PullRequest") continue;
        if (pr.repository.owner.login.toLowerCase() !== cfg.org.toLowerCase()) continue;

        const ref: PRRef = {
          number: pr.number,
          title: pr.title,
          url: pr.url,
          status: classifyPR(pr),
          mergedAt: pr.mergedAt,
          updatedAt: pr.updatedAt,
          author: pr.author?.login || null,
        };

        if (pr.repository.name === cfg.iosRepo) iosPRs.push(ref);
        else if (pr.repository.name === cfg.androidRepo) androidPRs.push(ref);
      }

      // De-duplicate PRs by number (a PR can produce both Cross-ref + Connected events).
      const uniq = (arr: PRRef[]) => {
        const map = new Map<number, PRRef>();
        for (const p of arr) {
          const prev = map.get(p.number);
          if (!prev) map.set(p.number, p);
        }
        return Array.from(map.values());
      };

      features.push({
        number: issue.number,
        title: issue.title,
        url: issue.url,
        priority: priorityFromLabels(labels),
        ios: { status: statusFromPRs(uniq(iosPRs)), prs: uniq(iosPRs) },
        android: { status: statusFromPRs(uniq(androidPRs)), prs: uniq(androidPRs) },
        createdAt: issue.createdAt,
        updatedAt: issue.updatedAt,
        closed: issue.closed,
      });
    }

    if (!issues.pageInfo?.hasNextPage) break;
    cursor = issues.pageInfo.endCursor;
  }

  // Drift: iOS-merged but Android-not-merged (and vice versa). Closed/done features
  // (merged on both) don't count toward drift.
  let iosAhead = 0;
  let androidAhead = 0;
  for (const f of features) {
    if (f.ios.status === "merged" && f.android.status !== "merged") iosAhead++;
    if (f.android.status === "merged" && f.ios.status !== "merged") androidAhead++;
  }

  // Sort: drift items first, then by priority, then by updated date.
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

  return {
    features,
    iosAhead,
    androidAhead,
    fetchedAt: new Date().toISOString(),
    config: {
      featuresRepo: `${cfg.org}/${cfg.featuresRepo}`,
      iosRepo: `${cfg.org}/${cfg.iosRepo}`,
      androidRepo: `${cfg.org}/${cfg.androidRepo}`,
      iosAheadLimit: cfg.iosAheadLimit,
    },
  };
}
