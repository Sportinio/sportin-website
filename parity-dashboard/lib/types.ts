export type Platform = "ios" | "android";

export type PRStatus = "merged" | "open" | "draft" | "closed";

export interface PRRef {
  number: number;
  title: string;
  url: string;
  status: PRStatus;
  mergedAt: string | null;
  updatedAt: string;
  author: string | null;
  mergeCommitSha: string | null;
  /** Branches whose recent history contains this PR's merge commit. */
  branches: string[];
}

export type FeatureStatus = "merged" | "in_review" | "in_progress" | "not_started";

export interface PlatformBucket {
  status: FeatureStatus;
  prs: PRRef[];
  /** At least one merged PR is in `main`. */
  released: boolean;
  /** At least one merged PR is only in `dev` (not yet in main). */
  staged: boolean;
}

export interface FeatureRow {
  number: number;
  title: string;
  url: string;
  priority: "P0" | "P1" | "P2" | null;
  ios: PlatformBucket;
  android: PlatformBucket;
  createdAt: string;
  updatedAt: string;
  closed: boolean;
}

export interface DashboardData {
  features: FeatureRow[];
  iosAhead: number;
  androidAhead: number;
  releasedCount: number;
  stagedCount: number;
  fetchedAt: string;
  warnings: string[];
  latestRelease: { tag: string; date: string } | null;
  config: {
    featuresRepo: string;
    iosRepo: string;
    androidRepo: string;
    iosAheadLimit: number;
    mainBranch: string;
    devBranch: string;
  };
}
