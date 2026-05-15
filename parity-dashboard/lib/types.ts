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
}

export type FeatureStatus = "merged" | "in_review" | "in_progress" | "not_started";

export interface FeatureRow {
  number: number;
  title: string;
  url: string;
  priority: "P0" | "P1" | "P2" | null;
  ios: { status: FeatureStatus; prs: PRRef[] };
  android: { status: FeatureStatus; prs: PRRef[] };
  createdAt: string;
  updatedAt: string;
  closed: boolean;
}

export interface DashboardData {
  features: FeatureRow[];
  iosAhead: number;
  androidAhead: number;
  fetchedAt: string;
  warnings: string[];
  config: {
    featuresRepo: string;
    iosRepo: string;
    androidRepo: string;
    iosAheadLimit: number;
  };
}
