/**
 * Reads dashboard config from env vars.
 *
 * Expected env (set in .env.local or Vercel project settings):
 *   GITHUB_TOKEN          fine-grained PAT, read access on the 3 repos below
 *   GITHUB_ORG            e.g. "Sportinio"
 *   FEATURES_REPO         repo holding the tracking issues, e.g. "mobile-features"
 *   IOS_REPO              e.g. "ios-app"
 *   ANDROID_REPO          e.g. "android-app"
 *   FEATURE_LABEL         optional, defaults to "feature"
 *   IOS_AHEAD_LIMIT       optional integer, defaults to 3
 */
export function getConfig() {
  const token = process.env.GITHUB_TOKEN || "";
  const org = process.env.GITHUB_ORG || "";
  const featuresRepo = process.env.FEATURES_REPO || "";
  const iosRepo = process.env.IOS_REPO || "";
  const androidRepo = process.env.ANDROID_REPO || "";
  const featureLabel = process.env.FEATURE_LABEL || "feature";
  const iosAheadLimit = parseInt(process.env.IOS_AHEAD_LIMIT || "3", 10);

  const missing: string[] = [];
  if (!token) missing.push("GITHUB_TOKEN");
  if (!org) missing.push("GITHUB_ORG");
  if (!featuresRepo) missing.push("FEATURES_REPO");
  if (!iosRepo) missing.push("IOS_REPO");
  if (!androidRepo) missing.push("ANDROID_REPO");

  return { token, org, featuresRepo, iosRepo, androidRepo, featureLabel, iosAheadLimit, missing };
}
