import type { DashboardData } from "@/lib/types";

function Stat({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${danger ? "text-bad" : "text-text"}`}>{value}</div>
    </div>
  );
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

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total features" value={String(data.features.length)} />
        <Stat
          label="At parity"
          value={String(
            data.features.filter((f) => f.ios.status === "merged" && f.android.status === "merged").length,
          )}
        />
        <Stat label="iOS ahead" value={String(data.iosAhead)} danger={driftWarning} />
        <Stat label="Android ahead" value={String(data.androidAhead)} />
      </div>
    </header>
  );
}
