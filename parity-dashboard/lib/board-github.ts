import { getConfig } from "./config";
import type { BoardCard, CardPlatform, CardRepo, CardStatus } from "./board";

const GH_GRAPHQL = "https://api.github.com/graphql";

export const BOARD_REPOS: {
  id: CardRepo;
  label: string;
  platforms: CardPlatform[];
}[] = [
  { id: "sportin-pro", label: "Web", platforms: ["web"] },
  { id: "rork-sportin-io", label: "SportIn.io", platforms: ["ios", "android"] },
  {
    id: "sportin-pro-mobile",
    label: "SportIn Pro Mobile",
    platforms: ["ios", "android"],
  },
];

const QUERY = /* GraphQL */ `
  query BoardRepo($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      refs(refPrefix: "refs/heads/feature/", first: 100) {
        nodes {
          name
          target {
            ... on Commit {
              committedDate
              author { name }
            }
          }
        }
      }
      mainPRs: pullRequests(
        first: 100
        baseRefName: "main"
        states: MERGED
        orderBy: { field: UPDATED_AT, direction: DESC }
      ) {
        nodes {
          number
          title
          url
          mergedAt
          headRefName
        }
      }
      devPRs: pullRequests(
        first: 100
        baseRefName: "dev"
        states: MERGED
        orderBy: { field: UPDATED_AT, direction: DESC }
      ) {
        nodes {
          number
          title
          url
          mergedAt
          headRefName
        }
      }
      openPRs: pullRequests(
        first: 100
        states: OPEN
        orderBy: { field: UPDATED_AT, direction: DESC }
      ) {
        nodes {
          number
          title
          url
          headRefName
          baseRefName
        }
      }
    }
  }
`;

interface GHRef {
  name: string;
  target: { committedDate?: string; author?: { name?: string } } | null;
}
interface GHPR {
  number: number;
  title: string;
  url: string;
  mergedAt?: string;
  headRefName: string;
  baseRefName?: string;
}
interface GHRepoResult {
  refs: { nodes: GHRef[] };
  mainPRs: { nodes: GHPR[] };
  devPRs: { nodes: GHPR[] };
  openPRs: { nodes: GHPR[] };
}

async function fetchRepo(
  token: string,
  owner: string,
  name: string,
): Promise<GHRepoResult | null> {
  const res = await fetch(GH_GRAPHQL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: QUERY, variables: { owner, name } }),
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(`GitHub ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  if (json.errors) {
    const notFound = json.errors.some(
      (e: { type?: string }) => e.type === "NOT_FOUND",
    );
    if (notFound) return null;
    throw new Error(`GitHub GraphQL: ${JSON.stringify(json.errors)}`);
  }
  return json.data.repository as GHRepoResult;
}

function slugFromBranch(branchOrRef: string): string | null {
  const m = branchOrRef.match(/^(?:refs\/heads\/)?feature\/(.+)$/);
  return m ? m[1] : null;
}

function slugToTitle(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

interface FeatureBucket {
  slug: string;
  title: string;
  branch: string;
  status: CardStatus;
  prUrl?: string;
  lastUpdated?: string;
}

function computeBuckets(repo: GHRepoResult): FeatureBucket[] {
  const map = new Map<string, FeatureBucket>();

  const upgrade = (
    slug: string,
    newStatus: CardStatus,
    extra: Partial<FeatureBucket>,
  ) => {
    const order: CardStatus[] = ["backlog", "local", "dev", "released"];
    const existing = map.get(slug);
    if (!existing) {
      map.set(slug, {
        slug,
        title: extra.title || slugToTitle(slug),
        branch: extra.branch || `feature/${slug}`,
        status: newStatus,
        prUrl: extra.prUrl,
        lastUpdated: extra.lastUpdated,
      });
      return;
    }
    if (order.indexOf(newStatus) > order.indexOf(existing.status)) {
      existing.status = newStatus;
      if (extra.prUrl) existing.prUrl = extra.prUrl;
      if (extra.lastUpdated) existing.lastUpdated = extra.lastUpdated;
    }
  };

  for (const ref of repo.refs.nodes) {
    const slug = slugFromBranch(ref.name);
    if (!slug) continue;
    upgrade(slug, "local", {
      branch: `feature/${slug}`,
      lastUpdated: ref.target?.committedDate,
    });
  }

  for (const pr of repo.openPRs.nodes) {
    const slug = slugFromBranch(pr.headRefName);
    if (!slug) continue;
    upgrade(slug, "local", { prUrl: pr.url });
  }

  for (const pr of repo.devPRs.nodes) {
    const slug = slugFromBranch(pr.headRefName);
    if (!slug) continue;
    upgrade(slug, "dev", { prUrl: pr.url, lastUpdated: pr.mergedAt });
  }

  for (const pr of repo.mainPRs.nodes) {
    const slug = slugFromBranch(pr.headRefName);
    if (!slug) continue;
    upgrade(slug, "released", { prUrl: pr.url, lastUpdated: pr.mergedAt });
  }

  return [...map.values()];
}

export interface BoardFetchResult {
  cards: BoardCard[];
  warnings: string[];
}

export async function fetchBoardCards(): Promise<BoardFetchResult> {
  const cfg = getConfig();
  const warnings: string[] = [];

  if (!cfg.token) throw new Error("GITHUB_TOKEN is not set");
  if (!cfg.org) throw new Error("GITHUB_ORG is not set");

  const cards: BoardCard[] = [];

  for (const repo of BOARD_REPOS) {
    let result: GHRepoResult | null;
    try {
      result = await fetchRepo(cfg.token, cfg.org, repo.id);
    } catch (err) {
      warnings.push(
        `${repo.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
      continue;
    }
    if (!result) {
      warnings.push(`${repo.id}: not found or no access`);
      continue;
    }

    const buckets = computeBuckets(result);

    for (const bucket of buckets) {
      for (const platform of repo.platforms) {
        // iOS leads on mobile: Android shows the same status as GitHub by
        // default. Users override Android with localStorage on the client.
        cards.push({
          id: `${repo.id}:${bucket.slug}:${platform}`,
          feature_slug: bucket.slug,
          title: bucket.title,
          description: null,
          repo: repo.id,
          platform,
          status: bucket.status,
          github_branch: bucket.branch,
          github_pr_url: bucket.prUrl || null,
          is_manual: false,
          created_at: bucket.lastUpdated || new Date().toISOString(),
          updated_at: bucket.lastUpdated || new Date().toISOString(),
        });
      }
    }
  }

  return { cards, warnings };
}
