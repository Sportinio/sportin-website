"use client";

import { useMemo, useState } from "react";
import type { AuthorStats, CommitSummary, DayStat, TeamData } from "@/lib/team";

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
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isWeekend(date: string): boolean {
  const d = new Date(date + "T12:00:00").getDay();
  return d === 0 || d === 6;
}

/**
 * Working-day filter: drop weekends unless they have activity (so genuine
 * weekend pushes still show up).
 */
function visibleDays(days: string[], byDay: Record<string, DayStat>): string[] {
  return days.filter((d) => !isWeekend(d) || !!byDay[d]);
}

function firstLine(message: string): string {
  return message.split("\n")[0].trim();
}

// Burst suspicion classifier. We treat ≥3 commits within 10 minutes as a
// "batched landing" signal. Stronger when burstSpan is very small.
function burstVerdict(stat: DayStat): {
  label: string;
  level: "ok" | "warn" | "bad";
} {
  if (stat.maxBurst >= 5 && stat.burstSpanMinutes <= 5) {
    return { label: "Batched landing", level: "bad" };
  }
  if (stat.maxBurst >= 3 && stat.burstSpanMinutes <= 10) {
    return { label: "Tight cluster", level: "warn" };
  }
  return { label: "Spread out", level: "ok" };
}

// ── Activity heatmap (last N days) ────────────────────────────────────

function ActivityHeatmap({
  author,
  days,
}: {
  author: AuthorStats;
  days: string[];
}) {
  const workdays = visibleDays(days, author.byDay);
  const maxCommits = Math.max(
    1,
    ...workdays.map((d) => author.byDay[d]?.commits || 0),
  );
  return (
    <div className="flex gap-[3px]">
      {workdays.map((d) => {
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
  // Show last ~14 working days (plus weekends with activity).
  const recent = visibleDays(days, author.byDay).slice(-14);
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div className="space-y-1">
      {recent.map((d) => (
        <DayBar
          key={d}
          date={d}
          stat={author.byDay[d]}
          expanded={expanded === d}
          onToggle={() => setExpanded((e) => (e === d ? null : d))}
        />
      ))}
    </div>
  );
}

function DayBar({
  date,
  stat,
  expanded,
  onToggle,
}: {
  date: string;
  stat?: DayStat;
  expanded: boolean;
  onToggle: () => void;
}) {
  if (!stat) {
    return (
      <div className="flex items-center gap-2 text-[10px] text-muted/50">
        <span className="w-12 font-mono">{date.slice(5)}</span>
        <span className="w-8">{weekday(date)}</span>
        <span className="flex-1 italic">no commits</span>
      </div>
    );
  }
  const firstH =
    new Date(stat.firstAt!).getHours() + new Date(stat.firstAt!).getMinutes() / 60;
  const lastH =
    new Date(stat.lastAt!).getHours() + new Date(stat.lastAt!).getMinutes() / 60;
  const left = (firstH / 24) * 100;
  const width = Math.max(1, ((lastH - firstH) / 24) * 100);
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 rounded text-left text-[10px] text-muted transition hover:bg-surface2/40"
      >
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
        <span className="w-4 text-right text-muted/60">{expanded ? "▾" : "▸"}</span>
      </button>
      {expanded && <CommitList commits={stat.commitList} />}
    </div>
  );
}

function CommitList({ commits }: { commits: CommitSummary[] }) {
  if (commits.length === 0) {
    return (
      <div className="ml-[88px] mt-1 mb-2 text-[10px] italic text-muted">
        No commits recorded.
      </div>
    );
  }
  const sorted = [...commits].sort((a, b) =>
    a.committedDate.localeCompare(b.committedDate),
  );
  const dayTotal = sorted.reduce((a, c) => a + c.estimatedMinutes, 0);
  return (
    <div className="ml-[88px] mr-[120px] mt-1 mb-2 space-y-1 rounded-md border border-border/60 bg-surface2/40 p-2">
      {sorted.map((c) => (
        <div
          key={c.oid}
          className="flex items-start gap-2 text-[11px] leading-tight"
        >
          <span className="w-12 shrink-0 font-mono text-muted/80">
            {timeLabel(c.committedDate)}
          </span>
          <span className="w-14 shrink-0 font-mono text-muted/60" title={c.oid}>
            {c.oid.slice(0, 7)}
          </span>
          <span className="flex-1 text-text/90">
            {firstLine(c.message)}
            {c.aiAssisted && (
              <span className="ml-1.5 rounded bg-staged/15 px-1 py-px text-[9px] font-semibold uppercase text-staged">
                AI
              </span>
            )}
          </span>
          <span className="shrink-0 w-20 text-right text-[10px] text-muted/70">
            <span className="text-ok/90">+{c.additions}</span>
            <span className="ml-1 text-bad/80">-{c.deletions}</span>
          </span>
          <span
            className="shrink-0 w-14 text-right text-[10px] font-semibold text-staged"
            title="Estimated work time"
          >
            ~{fmtMinutes(c.estimatedMinutes)}
          </span>
          {c.branches.length > 0 && (
            <span className="shrink-0 max-w-[140px] truncate text-[10px] text-muted/60">
              {c.branches[0]}
              {c.branches.length > 1 ? ` +${c.branches.length - 1}` : ""}
            </span>
          )}
        </div>
      ))}
      <div className="flex items-center justify-end gap-2 border-t border-border/40 pt-1.5 text-[10px] text-muted">
        <span>Day estimate:</span>
        <span className="font-semibold text-staged">~{fmtMinutes(dayTotal)}</span>
      </div>
    </div>
  );
}

// ── 7-day audit panel — designed for verifying paid-hours claims ─────

function AuditPanel({ author, days }: { author: AuthorStats; days: string[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  // Hide weekends with no activity; keep weekends that DO have activity (so
  // anomalous weekend pushes still surface).
  const visible = visibleDays(days, author.byDay);
  const audit = visible.map((d) => {
    const stat = author.byDay[d];
    const weekend = isWeekend(d);
    return { date: d, stat, weekend };
  });

  // Workdays in the original range. Claim = 8h × workdays.
  const workdays = days.filter((d) => !isWeekend(d)).length;
  const claimedHours = workdays * 8;

  // Estimated work signal: sum the per-commit estimates across the whole
  // range (workdays + any weekend pushes). This is the headline metric
  // because it depends on commit *content*, not push timing.
  const estimatedMinutes = audit.reduce(
    (a, e) => a + (e.stat?.estimatedMinutes || 0),
    0,
  );
  const estimatedHours = estimatedMinutes / 60;
  const coverage = claimedHours > 0 ? estimatedHours / claimedHours : 0;

  // Secondary signals (kept for context, not for the headline verdict).
  let suspiciousDays = 0;
  let zeroCommitWorkdays = 0;
  for (const a of audit) {
    if (a.weekend) continue;
    if (!a.stat) {
      zeroCommitWorkdays++;
      continue;
    }
    const v = burstVerdict(a.stat);
    if (v.level === "bad" || v.level === "warn") suspiciousDays++;
  }

  // Verdict thresholds on coverage (estimated work ÷ claimed hours):
  //   ≥ 70%   → consistent
  //   40-70%  → partial
  //   < 40%   → cannot verify
  let verdict: { label: string; color: string; explainer: string };
  if (coverage >= 0.7) {
    verdict = {
      label: "Looks consistent with claimed hours",
      color: "text-ok",
      explainer:
        "Estimated work content (from commit sizes and types) is within range of the claimed hours. Push timing doesn't matter for this — only what landed in the codebase does.",
    };
  } else if (coverage < 0.4) {
    verdict = {
      label: "Cannot verify claimed hours",
      color: "text-bad",
      explainer: `Estimated work output (~${fmtMinutes(estimatedMinutes)}) is well below the ${claimedHours}h being paid for. Either there's substantial unpushed work, or the work isn't happening at the claimed rate.`,
    };
  } else {
    verdict = {
      label: "Partially verifiable",
      color: "text-warn",
      explainer: `Estimated work output (~${fmtMinutes(estimatedMinutes)}) covers ${pct(coverage)} of the ${claimedHours}h claim. Some workdays look real, others may have unpushed work or be light. Worth a 1:1 conversation.`,
    };
  }

  return (
    <div className="mt-5 rounded-lg border border-border bg-bg/40 p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h4 className="text-sm font-semibold text-text">{days.length}-day audit</h4>
        <span className={`text-xs font-semibold ${verdict.color}`}>{verdict.label}</span>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="Workdays in range" value={`${workdays}`} />
        <Metric label="Claimed (8h × wd)" value={`${claimedHours}h`} />
        <Metric
          label="Estimated work"
          value={fmtMinutes(estimatedMinutes)}
          warn={coverage < 0.7 && coverage >= 0.4}
          danger={coverage < 0.4}
        />
        <Metric
          label="Coverage of claim"
          value={pct(coverage)}
          warn={coverage < 0.7 && coverage >= 0.4}
          danger={coverage < 0.4}
        />
      </div>
      {(suspiciousDays > 0 || zeroCommitWorkdays > 0) && (
        <p className="mb-3 text-[10px] text-muted/80">
          Context (not used for verdict):{" "}
          {zeroCommitWorkdays > 0 && (
            <span className="text-warn">
              {zeroCommitWorkdays} zero-commit workday{zeroCommitWorkdays === 1 ? "" : "s"}
            </span>
          )}
          {zeroCommitWorkdays > 0 && suspiciousDays > 0 && " · "}
          {suspiciousDays > 0 && (
            <span className="text-warn">
              {suspiciousDays} day{suspiciousDays === 1 ? "" : "s"} with batched/clustered pushes
            </span>
          )}
        </p>
      )}

      <p className="mb-3 text-[11px] leading-relaxed text-muted">{verdict.explainer}</p>

      <div className="space-y-0.5">
        {audit.length === 0 ? (
          <div className="rounded border border-border/60 px-2 py-3 text-center text-[11px] italic text-muted">
            No working-day activity recorded in the last 7 days.
          </div>
        ) : (
          audit.map(({ date, stat, weekend }) => (
            <AuditRow
              key={date}
              date={date}
              stat={stat}
              weekend={weekend}
              expanded={expanded === date}
              onToggle={() =>
                setExpanded((e) => (e === date ? null : date))
              }
            />
          ))
        )}
      </div>

      <p className="mt-3 text-[10px] leading-relaxed text-muted/80">
        <strong className="text-muted">Estimate model</strong> (vibe-coding,
        review-time-only): base time from LoC (5→1m, 50→5m, 150→10m, 500→20m,
        1500→40m, big→1h max) × type multiplier (<code>fix</code> 0.8,
        <code>feat</code> 1.1, <code>chore</code> 0.6) × 0.85 (team-AI baseline)
        × 0.7 if commit is scoped to <code>(android)</code> or mentions
        parity/port/mirror (replication work) × 0.7 again if an AI co-author is
        explicitly tagged. Cap is 1h on huge diffs — LoC is a weak time proxy
        when the model writes it. Tune with <code>ESTIMATE_SCALE</code> env var
        (e.g. 0.5 = even more aggressive; 1.7 = manual-coding baseline).
      </p>
    </div>
  );
}

function AuditRow({
  date,
  stat,
  weekend,
  expanded,
  onToggle,
}: {
  date: string;
  stat?: DayStat;
  weekend: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const flag = stat ? burstVerdict(stat) : null;
  const flagColor =
    flag?.level === "bad"
      ? "bg-bad/20 text-bad"
      : flag?.level === "warn"
        ? "bg-warn/20 text-warn"
        : "bg-ok/15 text-ok";

  const canExpand = !!stat && stat.commitList.length > 0;

  return (
    <div>
      <button
        type="button"
        onClick={canExpand ? onToggle : undefined}
        disabled={!canExpand}
        className={`grid w-full grid-cols-[55px_45px_1fr_55px_75px_75px_100px_16px] items-center gap-2 rounded px-2 py-1.5 text-left text-[11px] ${
          weekend ? "opacity-60" : ""
        } ${canExpand ? "transition hover:bg-surface2/40" : "cursor-default"}`}
      >
        <span className="font-mono text-muted">{date.slice(5)}</span>
        <span className={weekend ? "text-muted/60" : "text-muted"}>
          {weekday(date)}
          {weekend && <span className="ml-1 text-[9px]">·wk</span>}
        </span>

        {stat ? (
          <span className="truncate text-text/80">
            {timeLabel(stat.firstAt!)} → {timeLabel(stat.lastAt!)}
            {stat.branches.length > 0 && (
              <span className="ml-2 text-muted/70">
                ({stat.branches.slice(0, 2).join(", ")}
                {stat.branches.length > 2 ? ` +${stat.branches.length - 2}` : ""})
              </span>
            )}
          </span>
        ) : (
          <span className="italic text-muted/60">no commits</span>
        )}

        <span className="text-right text-text/70">
          {stat ? `${stat.commits}c` : "—"}
        </span>
        <span
          className="text-right text-text/70"
          title="Active push window — first to last commit landed"
        >
          {stat ? fmtMinutes(stat.activeMinutes) : "—"}
        </span>
        <span
          className="text-right font-semibold text-staged"
          title="Estimated work time from commit content"
        >
          {stat ? `~${fmtMinutes(stat.estimatedMinutes)}` : "—"}
        </span>
        {stat && flag ? (
          <span
            className={`rounded px-1.5 py-0.5 text-center text-[10px] font-semibold ${flagColor}`}
            title={
              stat.maxBurst >= 2
                ? `${stat.maxBurst} commits within ${stat.burstSpanMinutes}m`
                : `single commit`
            }
          >
            {flag.label}
          </span>
        ) : (
          <span />
        )}
        <span className="text-right text-[10px] text-muted/50">
          {canExpand ? (expanded ? "▾" : "▸") : ""}
        </span>
      </button>
      {expanded && stat && <CommitList commits={stat.commitList} />}
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

  const expectedWorkdays = Math.min(rangeDays, 22);
  const workdayRatio = author.activeDays / expectedWorkdays;
  const expectedActivePerDay = 4 * 60;

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
                new Date(author.lastSeenAt).toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "never"}
          </p>
          {author.branchesTouched.length > 0 && (
            <p className="mt-0.5 text-[10px] text-muted/70">
              Branches: {author.branchesTouched.slice(0, 4).join(", ")}
              {author.branchesTouched.length > 4
                ? ` +${author.branchesTouched.length - 4}`
                : ""}
            </p>
          )}
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
          label={`Estimated work · ${rangeDays}d`}
          value={fmtMinutes(author.estimatedMinutes)}
        />
        <Metric label="Avg commit size" value={`${fmtNum(author.avgCommitSize)} LoC`} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label={`Last 7d commits`} value={String(last7Stats.commits)} />
        <Metric label={`Last 7d active`} value={fmtMinutes(last7Stats.activeMinutes)} />
        <Metric
          label="LoC added"
          value={`+${fmtNum(author.additions)}`}
          accent="ok"
        />
        <Metric
          label="LoC removed"
          value={`-${fmtNum(author.deletions)}`}
          accent="bad"
        />
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

      <AuditPanel author={author} days={days} />
    </div>
  );
}

function Metric({
  label,
  value,
  danger,
  warn,
  accent,
}: {
  label: string;
  value: string;
  danger?: boolean;
  warn?: boolean;
  accent?: "ok" | "bad";
}) {
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
  const [range, setRange] = useState<7 | 14 | 30>(14);
  const allDays = useMemo(() => lastNDays(range), [range]);

  return (
    <>
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team Activity</h1>
          <p className="text-sm text-muted">
            Commit activity across <span className="font-mono text-text">{data.branchesScanned.length}</span>{" "}
            branches of {data.repo}. Aggregated per author. Audit panel scales to the
            selected range and surfaces batched landings and zero-commit workdays.
          </p>
          <p className="mt-1 text-[11px] text-muted/80">
            Active window = first commit → last commit on each day (capped at 8h). Truly
            local commits (never pushed) cannot be detected — git's design.
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
        <Metric
          label="LoC added"
          value={`+${fmtNum(data.totals.additions)}`}
          accent="ok"
        />
        <Metric
          label="AI-assisted commits"
          value={`${data.totals.aiAssistedCommits} / ${data.totals.commits}`}
        />
      </div>

      <div className="space-y-4">
        {data.authors.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface px-4 py-12 text-center text-sm text-muted">
            No commit activity in the last {range} days.
          </div>
        ) : (
          data.authors.map((a) => (
            <AuthorCard
              key={a.author}
              author={a}
              days={allDays}
              rangeDays={range}
            />
          ))
        )}
      </div>

      <footer className="mt-8 text-center text-[11px] text-muted">
        Range: {data.dayRange.from} → {data.dayRange.to} · {data.dayRange.days} days ·{" "}
        {data.branchesScanned.length} branches scanned · fetched{" "}
        {new Date(data.fetchedAt).toLocaleTimeString()}
      </footer>
    </>
  );
}
