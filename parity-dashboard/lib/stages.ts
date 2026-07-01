// Stage model for the event-sourced parity board.
//
// Lanes map to your real git flow: Backlog (planning) -> Dev (feature branch /
// merged to dev) -> Testing (merged to `testing`) -> Main (merged to `main`).
// Build time for v1 is measured as the Testing -> Main duration; a dedicated
// Build lane is added once there is an EAS / CI / release-tag signal.

export type Stage = "backlog" | "testing" | "dev" | "main";

export const STAGES: { id: Stage; label: string }[] = [
  { id: "backlog", label: "Backlog" },
  { id: "testing", label: "Testing" },
  { id: "dev", label: "Dev" },
  { id: "main", label: "Main" },
];

export const STAGE_ORDER: Stage[] = ["backlog", "testing", "dev", "main"];

export function stageRank(s: Stage): number {
  return STAGE_ORDER.indexOf(s);
}

export type Platform = "ios" | "android" | "web";

export const PLATFORM_LABEL: Record<Platform, string> = {
  ios: "iOS",
  android: "Android",
  web: "Web",
};

// Per-repo branch + platform configuration. Only rork is wired for v1;
// sportin-pro (web dashboard) + sportin-pro-mobile (iOS/Android) follow.
export interface RepoConfig {
  id: string;
  label: string;
  platforms: Platform[];
  /** Lead platform — its card drives the Android replica's creation. */
  lead: Platform;
  /** Branch-name prefixes that mean "work in progress" -> Dev lane. */
  featurePrefixes: string[];
  testingBranch: string;
  devBranch: string;
  mainBranch: string;
}

export const REPO_CONFIG: Record<string, RepoConfig> = {
  "rork-sportin-io": {
    id: "rork-sportin-io",
    label: "SportIn.io",
    platforms: ["ios", "android"],
    lead: "ios",
    featurePrefixes: ["feat/", "fix/", "feature/"],
    testingBranch: "testing",
    devBranch: "dev",
    mainBranch: "main",
  },
};

/** Map a merge target branch to a stage, using a repo's branch config. */
export function branchToStage(repo: RepoConfig, baseBranch: string): Stage | null {
  if (baseBranch === repo.mainBranch) return "main";
  if (baseBranch === repo.testingBranch) return "testing";
  if (baseBranch === repo.devBranch) return "dev";
  return null;
}

/** Extract a feature slug from a branch name (strips a known prefix). */
export function slugFromBranch(repo: RepoConfig, branch: string): string | null {
  const clean = branch.replace(/^refs\/heads\//, "");
  for (const prefix of repo.featurePrefixes) {
    if (clean.startsWith(prefix)) return clean.slice(prefix.length);
  }
  return null;
}

export function slugToTitle(slug: string): string {
  return slug
    .split(/[-_/]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
