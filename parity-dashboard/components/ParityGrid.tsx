import type { DashboardData } from "@/lib/types";
import { StatusDot } from "./StatusDot";
import { PRList } from "./PRList";

const PRI_COLOR: Record<string, string> = {
  P0: "bg-bad/15 text-bad border-bad/40",
  P1: "bg-warn/15 text-warn border-warn/40",
  P2: "bg-surface2 text-muted border-border",
};

function PriorityBadge({ priority }: { priority: string | null }) {
  if (!priority) return <span className="text-xs text-muted">—</span>;
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-wider ${
        PRI_COLOR[priority] || PRI_COLOR.P2
      }`}
    >
      {priority}
    </span>
  );
}

function driftBadge(ios: string, android: string) {
  if (ios === "merged" && android !== "merged") {
    return <span className="text-bad text-[10px] font-semibold uppercase tracking-wider">iOS ahead</span>;
  }
  if (android === "merged" && ios !== "merged") {
    return <span className="text-bad text-[10px] font-semibold uppercase tracking-wider">Android ahead</span>;
  }
  if (ios === "merged" && android === "merged") {
    return <span className="text-ok text-[10px] font-semibold uppercase tracking-wider">Parity</span>;
  }
  return <span className="text-muted text-[10px] font-semibold uppercase tracking-wider">Pending</span>;
}

export function ParityGrid({ data }: { data: DashboardData }) {
  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className="grid grid-cols-[80px_1fr_1fr_1fr_120px] gap-0 border-b border-border bg-surface2 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted">
        <div>Priority</div>
        <div>Feature</div>
        <div>iOS</div>
        <div>Android</div>
        <div className="text-right">Drift</div>
      </div>

      {data.features.length === 0 ? (
        <div className="px-4 py-12 text-center text-sm text-muted">
          No features tagged yet. Open an issue in{" "}
          <code className="font-mono">{data.config.featuresRepo}</code> with label{" "}
          <code className="font-mono">feature</code>.
        </div>
      ) : (
        data.features.map((f) => (
          <div
            key={f.number}
            className="grid grid-cols-[80px_1fr_1fr_1fr_120px] gap-4 border-b border-border px-4 py-4 last:border-0 hover:bg-surface2/40"
          >
            <div className="flex items-start pt-1">
              <PriorityBadge priority={f.priority} />
            </div>

            <div>
              <a
                href={f.url}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-text hover:underline"
                title={f.title}
              >
                #{f.number} {f.title}
              </a>
              <div className="mt-1 text-[11px] text-muted">
                Updated {new Date(f.updatedAt).toLocaleDateString()}
              </div>
            </div>

            <div className="space-y-2">
              <StatusDot status={f.ios.status} />
              <PRList prs={f.ios.prs} />
            </div>

            <div className="space-y-2">
              <StatusDot status={f.android.status} />
              <PRList prs={f.android.prs} />
            </div>

            <div className="flex items-start justify-end pt-1">
              {driftBadge(f.ios.status, f.android.status)}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
