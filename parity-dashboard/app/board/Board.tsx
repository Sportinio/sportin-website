"use client";

import { useMemo, useState } from "react";
import {
  STAGES,
  PLATFORM_LABEL,
  REPO_CONFIG,
  type Stage,
  type Platform,
} from "@/lib/stages";
import type { ParityCard } from "@/lib/parity-store";
import type { ActorMetric, AndroidLag, CardTiming } from "@/lib/metrics";

const STAGE_DOT: Record<Stage, string> = {
  backlog: "bg-muted/40",
  dev: "bg-staged",
  testing: "bg-warn",
  main: "bg-ok",
};
const STAGE_BORDER: Record<Stage, string> = {
  backlog: "border-muted/40",
  dev: "border-staged",
  testing: "border-warn",
  main: "border-ok",
};

function fmtHours(h: number | null | undefined): string {
  if (h == null) return "—";
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 24) return `${h.toFixed(1)}h`;
  const d = Math.floor(h / 24);
  const r = Math.round(h % 24);
  return r ? `${d}d ${r}h` : `${d}d`;
}

function ageHours(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 3600000;
}

type RepoFilter = "all" | string;

export function Board({
  cards,
  actors,
  lag,
  timings,
}: {
  cards: ParityCard[];
  actors: ActorMetric[];
  lag: AndroidLag;
  timings: Record<string, CardTiming>;
}) {
  const repos = Object.values(REPO_CONFIG);
  const [repoFilter, setRepoFilter] = useState<RepoFilter>("all");
  const visibleRepos = repoFilter === "all" ? repos : repos.filter((r) => r.id === repoFilter);

  return (
    <div className="space-y-6">
      <MetricsStrip actors={actors} lag={lag} cardCount={cards.length} />

      {repos.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-muted">Project</span>
          <Chip active={repoFilter === "all"} onClick={() => setRepoFilter("all")}>
            All
          </Chip>
          {repos.map((r) => (
            <Chip key={r.id} active={repoFilter === r.id} onClick={() => setRepoFilter(r.id)}>
              {r.label}
            </Chip>
          ))}
        </div>
      )}

      {visibleRepos.map((repo) => {
        const repoCards = cards.filter((c) => c.repo === repo.id);
        return (
          <section key={repo.id} className="rounded-xl border border-border bg-surface">
            <header className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-text">{repo.label}</h2>
              <span className="text-[11px] text-muted">{repoCards.length} cards</span>
            </header>

            <div className="overflow-x-auto">
              <div className="min-w-[900px] p-3">
                <div
                  className="grid gap-2"
                  style={{ gridTemplateColumns: `120px repeat(${STAGES.length}, 1fr)` }}
                >
                  <div />
                  {STAGES.map((s) => (
                    <div key={s.id} className="flex items-center gap-1.5 px-2 pb-1">
                      <span className={`h-1.5 w-1.5 rounded-full ${STAGE_DOT[s.id]}`} />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                        {s.label}
                      </span>
                    </div>
                  ))}

                  {repo.platforms.map((platform) => (
                    <PlatformRow
                      key={platform}
                      platform={platform}
                      cards={repoCards.filter((c) => c.platform === platform)}
                      timings={timings}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function PlatformRow({
  platform,
  cards,
  timings,
}: {
  platform: Platform;
  cards: ParityCard[];
  timings: Record<string, CardTiming>;
}) {
  return (
    <>
      <div className="flex items-center px-2 py-2 text-xs font-semibold text-text">
        {PLATFORM_LABEL[platform]}
      </div>
      {STAGES.map((s) => {
        const items = cards
          .filter((c) => c.current_stage === s.id)
          .sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at));
        return (
          <div
            key={s.id}
            className={`min-h-[80px] rounded-lg border-t-2 bg-bg p-1.5 ${STAGE_BORDER[s.id]}`}
          >
            <div className="space-y-1.5">
              {items.map((c) => (
                <CardChip key={c.id} card={c} timing={timings[c.id]} />
              ))}
              {items.length === 0 && (
                <div className="px-2 py-3 text-center text-[10px] text-muted/50">—</div>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}

function CardChip({ card, timing }: { card: ParityCard; timing?: CardTiming }) {
  const [open, setOpen] = useState(false);
  const inLane = card.current_stage === "backlog" ? null : ageHours(card.updated_at);
  return (
    <div
      onClick={() => setOpen((o) => !o)}
      className="cursor-pointer rounded border border-border bg-surface2 p-2 shadow-sm transition hover:border-muted/40"
    >
      <h3 className="text-[12px] font-medium leading-snug text-text">{card.title}</h3>
      <div className="mt-1 flex items-center gap-2 text-[10px] text-muted">
        {timing?.actor && <span>@{timing.actor}</span>}
        {inLane != null && <span>· {fmtHours(inLane)} in lane</span>}
      </div>
      {open && (
        <div className="mt-2 space-y-1 border-t border-border pt-2 text-[10px] text-text/70">
          <p className="font-mono text-muted">{card.feature_slug}</p>
          {timing?.cycleHours != null && <p>Cycle (Dev→Main): {fmtHours(timing.cycleHours)}</p>}
          {timing?.buildHours != null && <p>Build (Test→Main): {fmtHours(timing.buildHours)}</p>}
          {timing?.hoursInStage &&
            Object.entries(timing.hoursInStage).map(([stage, h]) => (
              <p key={stage}>
                {stage}: {fmtHours(h)}
              </p>
            ))}
          {card.pr_url && (
            <a
              href={card.pr_url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="block text-staged underline"
            >
              View PR
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function MetricsStrip({
  actors,
  lag,
  cardCount,
}: {
  actors: ActorMetric[];
  lag: AndroidLag;
  cardCount: number;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <Stat
        label="Android behind iOS"
        value={`${lag.behindCount} features`}
        sub={
          lag.avgDaysBehind != null
            ? `avg ${lag.avgDaysBehind.toFixed(1)}d after iOS`
            : `avg gap ${lag.avgStageGap.toFixed(1)} lanes`
        }
        tone="warn"
      />
      <Stat label="Tracked cards" value={`${cardCount}`} sub="across all platforms" />
      <div className="rounded-xl border border-border bg-surface p-3">
        <div className="text-[11px] font-bold uppercase tracking-wider text-muted">
          Build time by developer
        </div>
        <div className="mt-2 space-y-1">
          {actors.length === 0 && <p className="text-[11px] text-muted">No data yet.</p>}
          {actors.slice(0, 5).map((a) => (
            <div key={a.actor} className="flex items-center justify-between text-[11px]">
              <span className="text-text">@{a.actor}</span>
              <span className="text-muted">
                {a.shipped} shipped · cycle {fmtCycle(a.avgCycleHours)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function fmtCycle(h: number | null): string {
  if (h == null) return "—";
  if (h < 24) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "warn";
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="text-[11px] font-bold uppercase tracking-wider text-muted">{label}</div>
      <div className={`mt-1 text-xl font-semibold ${tone === "warn" ? "text-warn" : "text-text"}`}>
        {value}
      </div>
      <div className="text-[11px] text-muted">{sub}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
        active ? "bg-staged text-bg" : "bg-surface text-muted hover:bg-surface2 hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}
