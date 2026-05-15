import type { DashboardData } from "@/lib/types";

function Stat({
  label, value, danger, accent,
}: { label: string; value: string; danger?: boolean; accent?: "ok" | "staged" }) {
  const valueColor = danger
    ? "text-bad"
    : accent === "ok"
      ? "text-ok"
      : accent === "staged"
        ? "text-staged"
        : "text-text";
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${valueColor}`}>{value}</div>
    </div>
  );
}

function timeAgo(iso: string) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function Header({ data }: { data: DashboardData }) {
  const driftWarning = data.iosAhead > data.config.iosAheadLimit;
  return (
    <header className="mb-6 space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mobile Parity</h1>
          <p className="text-sm text-muted">
            iOS · {data.config.iosRepo} &nbsp;·&nbsp; Android · {data.config.androidRepo} &nbsp;·&nbsp; Features · {data.config.featuresRepo}
          </p>
          <p className="mt-1 text-xs text-muted">
            Branches:&nbsp;
            <span className="text-ok">{data.config.mainBranch}</span> (released)&nbsp;·&nbsp;
            <span className="text-staged">{data.config.devBranch}</span> (staged)
            {data.latestRelease ? (
              <>
                &nbsp;·&nbsp; Latest tag:&nbsp;
                <span className="font-mono text-text">{data.latestRelease.tag}</span>
                <span className="text-muted/70"> · {timeAgo(data.latestRelease.date)}</span>
              </>
            ) : null}
          </p>
        </div>
        <div className="text-right text-xs text-muted">
          Fetched {new Date(data.fetchedAt).toLocaleTimeString()}
          <br />
          Auto-refresh every 60s
        </div>
      </div>

      {driftWarning ? (
        <div className="rounded-lg border border-bad/40 bg-bad/10 px-4 py-3 text-sm text-bad">
          <strong>iOS ahead by {data.iosAhead} features.</strong> Cap is {data.config.iosAheadLimit}.
          Stop shipping new iOS work and help Android catch up.
        </div>
      ) : null}

      {data.warnings.length ? (
        <details className="rounded-lg border border-warn/40 bg-warn/5 px-4 py-3 text-sm text-warn">
          <summary className="cursor-pointer font-semibold">
            {data.warnings.length} warning{data.warnings.length === 1 ? "" : "s"} (click to expand)
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
            {data.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </details>
      ) : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        <Stat label="Total" value={String(data.features.length)} />
        <Stat label="Released" value={String(data.releasedCount)} accent="ok" />
        <Stat label="Staged" value={String(data.stagedCount)} accent="staged" />
        <Stat label="iOS ahead" value={String(data.iosAhead)} danger={driftWarning} />
        <Stat label="Android ahead" value={String(data.androidAhead)} />
        <Stat
          label="Stale PRs"
          value={String(
            data.features.reduce((acc, f) => {
              const open = [...f.ios.prs, ...f.android.prs].filter(
                (p) => (p.status === "open" || p.status === "draft") &&
                  Date.now() - new Date(p.updatedAt).getTime() > 5 * 86400000,
              );
              return acc + open.length;
            }, 0),
          )}
        />
      </div>
    </header>
  );
}
