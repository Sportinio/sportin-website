"use client";

import { useMemo, useState } from "react";
import type { AuthorStats, DayStat, TeamData } from "@/lib/team";

function fmtMinutes(min: number) {
  if (min <= 0) return "0m";
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function fmtNum(n: number) {
  return n.toLocaleString();
}

function pct(x: number) {
  return Math.round(x * 100) + "%";
}

function lastNDays(n: number): string[] {
  const out: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function weekday(date: string) {
  const d = new Date(date + "T12:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

// ── Activity heatmap (last N days) ────────────────────────────────────

function ActivityHeatmap({
  author,
  days,
}: {
  author: AuthorStats;
  days: string[];
}) {
  const maxCommits = Math.max(1, ...days.map((d) => author.byDay[d]?.commits || 0));
  return (
    <div className="flex gap-[3px]">
      {days.map((d) => {
        const stat = author.byDay[d];
        const intensity = stat ? Math.min(1, stat.commits / maxCommits) : 0;
        const bg =
          intensity === 0
            ? "bg-surface2/40"
            : intensity < 0.34
              ? "bg-ok/30"
              : intensity < 0.67
                ? "bg-ok/60"
                : "bg-ok";
        const title = stat
          ? `${d} (${weekday(d)}): ${stat.commits} commit${stat.commits === 1 ? "" : "s"} · ${fmtMinutes(stat.activeMinutes)} active`
          : `${d} (${weekday(d)}): no commits`;
        return <span key={d} title={title} className={`h-5 w-2.5 rounded-sm ${bg}`} />;
      })}
    </div>
  );
}

// ── Per-day commit time bands (visualizes active window) ──────────────

function ActiveTimeBars({
  author,
  days,
}: {
  author: AuthorStats;
  days: string[];
}) {
  const recent = days.slice(-14);
  return (
    <div className="space-y-1">
      {recent.map((d) => {
        const stat = author.byDay[d];
        return <DayBar key={d} date={d} stat={stat} />;
      })}
    </div>
  );
}

function DayBar({ date, stat }: { date: string; stat?: DayStat }) {
  if (!stat) {
    return (
      <div className="flex items-center gap-2 text-[10px] text-muted/50">
        <span className="w-12 font-mono">{date.slice(5)}</span>
        <span className="w-8">{weekday(date)}</span>
        <span className="flex-1 italic">no commits</span>
      </div>
    );
  }
  // Position the bar based on commit time within 0–24h window.
  const firstH = new Date(stat.firstAt!).getHours() + new Date(stat.firstAt!).getMinutes() / 60;
  const lastH = new Date(stat.lastAt!).getHours() + new Date(stat.lastAt!).getMinutes() / 60;
  const left = (firstH / 24) * 100;
  const width = Math.max(1, ((lastH - firstH) / 24) * 100);
  return (
    <div className="flex items-center gap-2 text-[10px] text-muted">
      <span className="w-12 font-mono">{date.slice(5)}</span>
      <span className="w-8">{weekday(date)}</span>
      <div className="relative flex-1 h-3 rounded bg-surface2">
        <div
          className="absolute top-0 h-full rounded bg-ok"
          style={{ left: `${left}%`, width: `${width}%` }}
          title={`${timeLabel(stat.firstAt!)} → ${timeLabel(stat.lastAt!)} · ${fmtMinutes(stat.activeMinutes)}`}
        />
      </div>
      <span className="w-12 text-right">{stat.commits}c</span>
      <span className="w-16 text-right">{fmtMinutes(stat.activeMinutes)}</span>
    </div>
  );
}

// ── Author card ───────────────────────────────────────────────────────

function AuthorCard({
  author,
  days,
  rangeDays,
}: {
  author: AuthorStats;
  days: string[];
  rangeDays: number;
}) {
  // Compute last-7-day stats for the recent-trend line.
  const last7 = days.slice(-7);
  const last7Stats = last7.reduce(
    (acc, d) => {
      const s = author.byDay[d];
      if (!s) return acc;
      return {
        commits: acc.commits + s.commits,
        additions: acc.additions + s.additions,
        deletions: acc.deletions + s.deletions,
        activeMinutes: acc.activeMinutes + s.activeMinutes,
        activeDays: acc.activeDays + 1,
      };
    },
    { commits: 0, additions: 0, deletions: 0, activeMinutes: 0, activeDays: 0 },
  );

  const expectedWorkdays = Math.min(rangeDays, 22); // assume ~22 workdays in a month
  const workdayRatio = author.activeDays / expectedWorkdays;
  const expectedActivePerDay = 4 * 60; // 4h is the "real coding" benchmark
  const activeRatio = author.avgActiveMinutesPerDay / expectedActivePerDay;

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">{author.author}</h3>
          <p className="text-xs text-muted">
            Last commit:{" "}
            {author.lastSeenAt
              ? new Date(author.lastSeenAt).toLocaleDateString() +
                " " +
                new Date(author.lastSeenAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
              : "never"}
          </p>
        </div>
        {author.aiAssistedPct >= 0.4 ? (
          <span className="inline-flex items-center rounded border border-staged/40 bg-staged/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-staged">
            AI-assisted {pct(author.aiAssistedPct)}
          </span>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label={`Commits · ${rangeDays}d`} value={fmtNum(author.commits)} />
        <Metric
          label={`Active days · ${rangeDays}d`}
          value={`${author.activeDays}/${expectedWorkdays}`}
          danger={workdayRatio < 0.5}
        />
        <Metric
          label="Avg active / day"
          value={fmtMinutes(author.avgActiveMinutesPerDay)}
          danger={author.avgActiveMinutesPerDay < 60}
          warn={author.avgActiveMinutesPerDay >= 60 && author.avgActiveMinutesPerDay < expectedActivePerDay}
        />
        <Metric label="Avg commit size" value={`${fmtNum(author.avgCommitSize)} LoC`} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label={`Last 7d commits`} value={String(last7Stats.commits)} />
        <Metric label={`Last 7d active`} value={fmtMinutes(last7Stats.activeMinutes)} />
        <Metric label="LoC added" value={`+${fmtNum(author.additions)}`} accent="ok" />
        <Metric label="LoC removed" value={`-${fmtNum(author.deletions)}`} accent="bad" />
      </div>

      <div className="mt-5">
        <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted">
          <span>Daily activity · {rangeDays}d</span>
          <span>
            <span className="mr-2">●</span>more commits
          </span>
        </div>
        <ActivityHeatmap author={author} days={days} />
      </div>

      <div className="mt-5">
        <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted">
          <span>Active window (last 14d)</span>
          <span>00:00 ──────────── 12:00 ──────────── 23:59</span>
        </div>
        <ActiveTimeBars author={author} days={days} />
      </div>
    </div>
  );
}

function Metric({
  label, value, danger, warn, accent,
}: { label: string; value: string; danger?: boolean; warn?: boolean; accent?: "ok" | "bad" }) {
  const color = danger
    ? "text-bad"
    : warn
      ? "text-warn"
      : accent === "ok"
        ? "text-ok"
        : accent === "bad"
          ? "text-bad/70"
          : "text-text";
  return (
    <div className="rounded-lg border border-border bg-surface2/40 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted">{label}</div>
      <div className={`mt-0.5 text-lg font-semibold ${color}`}>{value}</div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────

export function TeamView({ data }: { data: TeamData }) {
  const [range, setRange] = useState<7 | 14 | 30>(30);
  const allDays = useMemo(() => lastNDays(range), [range]);

  return (
    <>
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team Activity</h1>
          <p className="text-sm text-muted">
            Commit activity on main + dev. Aggregated per author. Shared between you and Vlad so the
            numbers are visible to everyone on the team.
          </p>
          <p className="mt-1 text-[11px] text-muted/80">
            Active window = first commit → last commit on each day (capped at 8h). Approximates working
            time but doesn't capture thinking, debugging, or AI-prompting that didn't land in commits.
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-full border border-border p-1 text-xs">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setRange(d as 7 | 14 | 30)}
              className={`rounded-full px-3 py-1 ${range === d ? "bg-surface2 text-text" : "text-muted hover:text-text"}`}
            >
              {d}d
            </button>
          ))}
        </div>
      </header>

      {data.warnings.length ? (
        <div className="mb-4 rounded-lg border border-warn/40 bg-warn/10 px-4 py-3 text-xs text-warn">
          {data.warnings.map((w, i) => (
            <p key={i}>{w}</p>
          ))}
        </div>
      ) : null}

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="Authors" value={String(data.authors.length)} />
        <Metric label={`Commits · ${range}d`} value={fmtNum(data.totals.commits)} />
        <Metric label="LoC added" value={`+${fmtNum(data.totals.additions)}`} accent="ok" />
        <Metric label="AI-assisted commits" value={`${data.totals.aiAssistedCommits} / ${data.totals.commits}`} />
      </div>

      <div className="space-y-4">
        {data.authors.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface px-4 py-12 text-center text-sm text-muted">
            No commit activity in the last {range} days.
          </div>
        ) : (
          data.authors.map((a) => (
            <AuthorCard key={a.author} author={a} days={allDays} rangeDays={range} />
          ))
        )}
      </div>

      <footer className="mt-8 text-center text-[11px] text-muted">
        Range: {data.dayRange.from} → {data.dayRange.to} · {data.dayRange.days} days · fetched{" "}
        {new Date(data.fetchedAt).toLocaleTimeString()}
      </footer>
    </>
  );
}
