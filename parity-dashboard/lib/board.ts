export type CardStatus = "backlog" | "local" | "dev" | "released";
export type CardPlatform = "ios" | "android" | "web" | "backend";
export type CardRepo = "sportin-pro" | "sportin-pro-mobile" | "rork-sportin-io";

export interface BoardCard {
  id: string;
  feature_slug: string;
  title: string;
  description: string | null;
  repo: CardRepo;
  platform: CardPlatform;
  status: CardStatus;
  github_branch: string | null;
  github_pr_url: string | null;
  is_manual: boolean;
  created_at: string;
  updated_at: string;
}

export const STATUSES: { id: CardStatus; label: string }[] = [
  { id: "backlog", label: "Backlog" },
  { id: "local", label: "Local" },
  { id: "dev", label: "In Dev" },
  { id: "released", label: "Released" },
];

export const PLATFORM_LABEL: Record<CardPlatform, string> = {
  ios: "iOS",
  android: "Android",
  web: "Web",
  backend: "Backend",
};

export const STATUS_COLOR: Record<CardStatus, string> = {
  backlog: "border-muted/50",
  local: "border-staged",
  dev: "border-warn",
  released: "border-ok",
};

export const STATUS_DOT: Record<CardStatus, string> = {
  backlog: "bg-muted/40",
  local: "bg-staged",
  dev: "bg-warn",
  released: "bg-ok",
};
