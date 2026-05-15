/**
 * Reads dashboard config from env vars. Supports two modes:
 *
 *   MODE A — two-repo (separate iOS / Android repos):
 *     IOS_REPO=ios-app
 *     ANDROID_REPO=android-app
 *     Platform is determined by which repo the PR is in.
 *
 *   MODE B — single-repo (both platforms in one monorepo):
 *     MOBILE_REPO=rork-sportin-io
 *     IOS_PATH=ios/         (path prefix matching iOS files)
 *     ANDROID_PATH=android/ (path prefix matching Android files)
 *     Platform is determined by which paths the PR touches.
 *     A PR that touches both counts toward both platforms.
 *
 * Shared env (both modes):
 *   GITHUB_TOKEN          fine-grained PAT, read access on the repos.
 *   GITHUB_ORG            e.g. "Sportinio"
 *   FEATURES_REPO         repo holding the tracking issues, e.g. "mobile-features"
 *   FEATURE_LABEL         optional, defaults to "feature"
 *   IOS_AHEAD_LIMIT       optional integer, defaults to 3
 */
export type Mode = "single" | "split";

export interface Config {
  token: string;
  org: string;
  featuresRepo: string;
  featureLabel: string;
  iosAheadLimit: number;
  mode: Mode;
  // split-mode only
  iosRepo?: string;
  androidRepo?: string;
  // single-mode only
  mobileRepo?: string;
  iosPath?: string;
  androidPath?: string;
  missing: string[];
}

export function getConfig(): Config {
  const token = process.env.GITHUB_TOKEN || "";
  const org = process.env.GITHUB_ORG || "";
  const featuresRepo = process.env.FEATURES_REPO || "";
  const featureLabel = process.env.FEATURE_LABEL || "feature";
  const iosAheadLimit = parseInt(process.env.IOS_AHEAD_LIMIT || "3", 10);

  const mobileRepo = process.env.MOBILE_REPO || "";
  const iosRepo = process.env.IOS_REPO || "";
  const androidRepo = process.env.ANDROID_REPO || "";

  // Pick mode: MOBILE_REPO wins if set. Else use split mode.
  const mode: Mode = mobileRepo ? "single" : "split";

  const missing: string[] = [];
  if (!token) missing.push("GITHUB_TOKEN");
  if (!org) missing.push("GITHUB_ORG");
  if (!featuresRepo) missing.push("FEATURES_REPO");

  if (mode === "split") {
    if (!iosRepo) missing.push("IOS_REPO");
    if (!androidRepo) missing.push("ANDROID_REPO");
  }

  return {
    token,
    org,
    featuresRepo,
    featureLabel,
    iosAheadLimit,
    mode,
    iosRepo: iosRepo || undefined,
    androidRepo: androidRepo || undefined,
    mobileRepo: mobileRepo || undefined,
    iosPath: process.env.IOS_PATH || "ios/",
    androidPath: process.env.ANDROID_PATH || "android/",
    missing,
  };
}
