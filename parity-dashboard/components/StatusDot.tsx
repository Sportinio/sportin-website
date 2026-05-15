import type { FeatureStatus } from "@/lib/types";

const LABEL: Record<FeatureStatus, string> = {
  merged: "Merged",
  in_review: "In review",
  in_progress: "In progress",
  not_started: "Not started",
};

const DOT: Record<FeatureStatus, string> = {
  merged: "bg-ok",
  in_review: "bg-warn",
  in_progress: "bg-warn/60",
  not_started: "bg-bad",
};

export function StatusDot({ status }: { status: FeatureStatus }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${DOT[status]}`} />
      <span className="text-xs text-muted">{LABEL[status]}</span>
    </span>
  );
}
