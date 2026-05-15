"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DashboardData, FeatureRow, FeatureStatus, PRRef } from "@/lib/types";

// ── Column definitions ────────────────────────────────────────────────

type ColKey = "num" | "priority" | "feature" | "ios" | "android" | "drift" | "stale" | "updated";
interface ColDef {
  key: ColKey;
  label: string;
  width: number;
  min: number;
  align?: "left" | "center" | "right";
  sortable?: boolean;
}
const DEFAULT_COLS: ColDef[] = [
  { key: "num", label: "#", width: 56, min: 40, align: "right", sortable: true },
  { key: "priority", label: "PRI", width: 64, min: 48, align: "center", sortable: true },
  { key: "feature", label: "FEATURE", width: 320, min: 160, align: "left", sortable: true },
  { key: "ios", label: "iOS", width: 72, min: 56, align: "center" },
  { key: "android", label: "AND", width: 72, min: 56, align: "center" },
  { key: "drift", label: "DRIFT", width: 100, min: 72, align: "center", sortable: true },
  { key: "stale", label: "STALE", width: 64, min: 56, align: "center", sortable: true },
  { key: "updated", label: "UPDATED", width: 96, min: 64, align: "right", sortable: true },
];
const LS_WIDTHS = "sportin-parity-col-widths-v2";
const LS_SORT = "sportin-parity-sort-v1";
const LS_FILTERS = "sportin-parity-filters-v1";
const STALE_MS = 5 * 24 * 60 * 60 * 1000; // 5 days

// ── Helpers ──────────────────────────────────────────────────────────

const STATUS_COLOR: Record<FeatureStatus, string> = {
  merged: "bg-ok",
  in_review: "bg-warn",
  in_progress: "bg-warn/60",
  not_started: "bg-bad",
};
const STATUS_LABEL: Record<FeatureStatus, string> = {
  merged: "Merged",
  in_review: "Open PR",
  in_progress: "Draft",
  not_started: "Not started",
};
const PR_COLOR: Record<PRRef["status"], string> = {
  merged: "text-ok",
  open: "text-warn",
  draft: "text-warn/70",
  closed: "text-muted line-through",
};

function timeAgo(iso: string) {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "today";
  if (days === 1) return "1d";
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  return `${Math.floor(months / 12)}y`;
}

function isStalePR(pr: PRRef): boolean {
  if (pr.status !== "open" && pr.status !== "draft") return false;
  return Date.now() - new Date(pr.updatedAt).getTime() > STALE_MS;
}
function stalePRs(f: FeatureRow): PRRef[] {
  return [...f.ios.prs, ...f.android.prs].filter(isStalePR);
}

type DriftKind = "ios-ahead" | "android-ahead" | "parity" | "pending";
function driftOf(f: FeatureRow): DriftKind {
  if (f.ios.status === "merged" && f.android.status !== "merged") return "ios-ahead";
  if (f.android.status === "merged" && f.ios.status !== "merged") return "android-ahead";
  if (f.ios.status === "merged" && f.android.status === "merged") return "parity";
  return "pending";
}

function driftIcon(kind: DriftKind) {
  switch (kind) {
    case "ios-ahead": return { glyph: "→", label: "iOS ahead", className: "text-bad" };
    case "android-ahead": return { glyph: "←", label: "Android ahead", className: "text-bad" };
    case "parity": return { glyph: "✓", label: "Parity", className: "text-ok" };
    case "pending": return { glyph: "·", label: "Pending", className: "text-muted" };
  }
}

function priorityChip(p: string | null) {
  if (!p) return <span className="text-muted/60 text-[10px]">—</span>;
  const color =
    p === "P0" ? "bg-bad/15 text-bad border-bad/40"
    : p === "P1" ? "bg-warn/15 text-warn border-warn/40"
    : "bg-surface2 text-muted border-border";
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold ${color}`}>
      {p}
    </span>
  );
}

// ── Hover popover ─────────────────────────────────────────────────────

function PRPopover({
  status, prs, platform,
}: { status: FeatureStatus; prs: PRRef[]; platform: string }) {
  return (
    <div
      className="pointer-events-auto absolute left-1/2 top-full z-50 mt-2 w-72 -translate-x-1/2 rounded-lg border border-border bg-surface2 p-3 text-left text-xs shadow-xl"
      role="dialog"
    >
      <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted">
        <span>{platform}</span>
        <span>{STATUS_LABEL[status]}</span>
      </div>
      {prs.length === 0 ? (
        <p className="text-muted">No pull request yet for this platform.</p>
      ) : (
        <ul className="space-y-2">
          {prs.map((pr) => {
            const stale = isStalePR(pr);
            return (
              <li key={pr.url}>
                <a
                  href={pr.url}
                  target="_blank"
                  rel="noreferrer"
                  className={`block truncate font-medium hover:underline ${PR_COLOR[pr.status]}`}
                  title={pr.title}
                >
                  #{pr.number} {pr.title}
                </a>
                <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted">
                  <span>{pr.status}</span>
                  {pr.author ? <span>· {pr.author}</span> : null}
                  {stale ? <span className="text-bad">· stale</span> : null}
                  <span className="ml-auto">{timeAgo(pr.updatedAt)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function StalePopover({ prs }: { prs: PRRef[] }) {
  return (
    <div className="pointer-events-auto absolute right-0 top-full z-50 mt-2 w-72 rounded-lg border border-border bg-surface2 p-3 text-left text-xs shadow-xl">
      <div className="mb-2 text-[10px] uppercase tracking-wider text-bad">Stale PRs · open &gt; 5 days</div>
      <ul className="space-y-2">
        {prs.map((pr) => (
          <li key={pr.url}>
            <a href={pr.url} target="_blank" rel="noreferrer" className="block truncate font-medium text-warn hover:underline">
              #{pr.number} {pr.title}
            </a>
            <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted">
              {pr.author ? <span>{pr.author}</span> : null}
              <span className="ml-auto">{timeAgo(pr.updatedAt)}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusCell({ status, prs, platform }: { status: FeatureStatus; prs: PRRef[]; platform: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative flex items-center justify-center" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${STATUS_COLOR[status]}`} />
      {prs.length > 0 ? <span className="ml-1.5 text-[10px] text-muted">{prs.length}</span> : null}
      {open ? <PRPopover status={status} prs={prs} platform={platform} /> : null}
    </div>
  );
}

function DriftCell({ kind }: { kind: DriftKind }) {
  const d = driftIcon(kind);
  return (
    <div className={`flex items-center justify-center gap-1 text-xs ${d.className}`} title={d.label}>
      <span className="font-semibold">{d.glyph}</span>
      <span className="hidden md:inline text-[10px] uppercase tracking-wider">{d.label}</span>
    </div>
  );
}

function StaleCell({ stale }: { stale: PRRef[] }) {
  const [open, setOpen] = useState(false);
  if (!stale.length) return <span className="text-muted/40 text-xs">—</span>;
  return (
    <div className="relative flex items-center justify-center" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <span className="inline-flex items-center gap-1 rounded border border-bad/40 bg-bad/10 px-1.5 py-0.5 text-[10px] font-semibold text-bad">
        ⚠ {stale.length}
      </span>
      {open ? <StalePopover prs={stale} /> : null}
    </div>
  );
}

// ── Resize handle ─────────────────────────────────────────────────────

function ResizeHandle({ onDragStart }: { onDragStart: (e: React.MouseEvent) => void }) {
  return (
    <span
      onMouseDown={onDragStart}
      onClick={(e) => e.stopPropagation()}
      className="absolute right-0 top-0 z-10 h-full w-1 cursor-col-resize select-none bg-transparent hover:bg-warn/40"
      aria-hidden
    />
  );
}

// ── Sort & filter state ───────────────────────────────────────────────

type SortDir = "asc" | "desc" | null;
interface SortState { key: ColKey | null; dir: SortDir }

type FilterKey =
  | "drift:ios-ahead" | "drift:android-ahead" | "drift:parity" | "drift:pending"
  | "pri:P0" | "pri:P1" | "pri:P2"
  | "stale";

function defaultDriftWeight(kind: DriftKind): number {
  if (kind === "ios-ahead" || kind === "android-ahead") return 0;
  if (kind === "pending") return 1;
  return 2; // parity
}
function priWeight(p: string | null): number {
  return p === "P0" ? 0 : p === "P1" ? 1 : p === "P2" ? 2 : 3;
}

function compareFor(key: ColKey, a: FeatureRow, b: FeatureRow): number {
  switch (key) {
    case "num": return a.number - b.number;
    case "priority": return priWeight(a.priority) - priWeight(b.priority);
    case "feature": return a.title.localeCompare(b.title);
    case "drift": return defaultDriftWeight(driftOf(a)) - defaultDriftWeight(driftOf(b));
    case "stale": return stalePRs(b).length - stalePRs(a).length;
    case "updated": return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    default: return 0;
  }
}

function applyDefaultSort(a: FeatureRow, b: FeatureRow): number {
  const d = defaultDriftWeight(driftOf(a)) - defaultDriftWeight(driftOf(b));
  if (d) return d;
  const p = priWeight(a.priority) - priWeight(b.priority);
  if (p) return p;
  return b.updatedAt.localeCompare(a.updatedAt);
}

// ── Toolbar (filter chips) ────────────────────────────────────────────

function FilterChip({
  active, count, onClick, color, children,
}: { active: boolean; count?: number; onClick: () => void; color: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
        active ? `${color} border-transparent` : "border-border bg-surface text-muted hover:text-text hover:border-muted/40"
      }`}
    >
      {children}
      {typeof count === "number" ? <span className="opacity-75">{count}</span> : null}
    </button>
  );
}

function Toolbar({
  filters, setFilters, counts, totalShown, totalAll,
}: {
  filters: Set<FilterKey>;
  setFilters: (next: Set<FilterKey>) => void;
  counts: Record<FilterKey, number>;
  totalShown: number;
  totalAll: number;
}) {
  function toggle(k: FilterKey) {
    const next = new Set(filters);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    setFilters(next);
  }
  const hasAny = filters.size > 0;
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <span className="text-[10px] uppercase tracking-wider text-muted">Drift</span>
      <FilterChip active={filters.has("drift:ios-ahead")}     count={counts["drift:ios-ahead"]}     onClick={() => toggle("drift:ios-ahead")}     color="bg-bad/20 text-bad">→ iOS</FilterChip>
      <FilterChip active={filters.has("drift:android-ahead")} count={counts["drift:android-ahead"]} onClick={() => toggle("drift:android-ahead")} color="bg-bad/20 text-bad">← AND</FilterChip>
      <FilterChip active={filters.has("drift:parity")}        count={counts["drift:parity"]}        onClick={() => toggle("drift:parity")}        color="bg-ok/20 text-ok">✓ Parity</FilterChip>
      <FilterChip active={filters.has("drift:pending")}       count={counts["drift:pending"]}       onClick={() => toggle("drift:pending")}       color="bg-muted/20 text-text">· Pending</FilterChip>

      <span className="ml-2 text-[10px] uppercase tracking-wider text-muted">Priority</span>
      <FilterChip active={filters.has("pri:P0")} count={counts["pri:P0"]} onClick={() => toggle("pri:P0")} color="bg-bad/20 text-bad">P0</FilterChip>
      <FilterChip active={filters.has("pri:P1")} count={counts["pri:P1"]} onClick={() => toggle("pri:P1")} color="bg-warn/20 text-warn">P1</FilterChip>
      <FilterChip active={filters.has("pri:P2")} count={counts["pri:P2"]} onClick={() => toggle("pri:P2")} color="bg-surface2 text-text">P2</FilterChip>

      <span className="ml-2 text-[10px] uppercase tracking-wider text-muted">Health</span>
      <FilterChip active={filters.has("stale")} count={counts["stale"]} onClick={() => toggle("stale")} color="bg-bad/20 text-bad">⚠ Stale</FilterChip>

      {hasAny ? (
        <button
          type="button"
          onClick={() => setFilters(new Set())}
          className="ml-auto rounded-full border border-border px-2.5 py-1 text-[11px] text-muted hover:text-text hover:border-muted/40"
        >
          Clear ({totalShown}/{totalAll})
        </button>
      ) : (
        <span className="ml-auto text-[11px] text-muted">{totalAll} features</span>
      )}
    </div>
  );
}

// ── Main table ────────────────────────────────────────────────────────

export function ParityTable({ data }: { data: DashboardData }) {
  const [cols, setCols] = useState<ColDef[]>(DEFAULT_COLS);
  const [sort, setSort] = useState<SortState>({ key: null, dir: null });
  const [filters, setFilters] = useState<Set<FilterKey>>(new Set());
  const dragRef = useRef<{ index: number; startX: number; startWidth: number } | null>(null);

  // Restore state from localStorage on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const w = window.localStorage.getItem(LS_WIDTHS);
      if (w) {
        const saved = JSON.parse(w) as Record<ColKey, number>;
        setCols((prev) => prev.map((c) => (saved[c.key] && saved[c.key] >= c.min ? { ...c, width: saved[c.key] } : c)));
      }
    } catch {}
    try {
      const s = window.localStorage.getItem(LS_SORT);
      if (s) setSort(JSON.parse(s));
    } catch {}
    try {
      const f = window.localStorage.getItem(LS_FILTERS);
      if (f) setFilters(new Set(JSON.parse(f) as FilterKey[]));
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const map: Record<string, number> = {};
    cols.forEach((c) => (map[c.key] = c.width));
    window.localStorage.setItem(LS_WIDTHS, JSON.stringify(map));
  }, [cols]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LS_SORT, JSON.stringify(sort));
  }, [sort]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LS_FILTERS, JSON.stringify(Array.from(filters)));
  }, [filters]);

  // Mouse-driven resize.
  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragRef.current) return;
      const { index, startX, startWidth } = dragRef.current;
      const dx = e.clientX - startX;
      setCols((prev) => {
        const next = [...prev];
        const min = next[index].min;
        next[index] = { ...next[index], width: Math.max(min, startWidth + dx) };
        return next;
      });
    }
    function onUp() {
      dragRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  function startDrag(index: number, e: React.MouseEvent) {
    e.preventDefault();
    dragRef.current = { index, startX: e.clientX, startWidth: cols[index].width };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  function clickHeader(c: ColDef) {
    if (!c.sortable) return;
    setSort((prev) => {
      if (prev.key !== c.key) return { key: c.key, dir: "asc" };
      if (prev.dir === "asc") return { key: c.key, dir: "desc" };
      return { key: null, dir: null }; // third click clears
    });
  }

  // Apply filters + sort.
  const visible = useMemo(() => {
    const driftPicks = (["drift:ios-ahead", "drift:android-ahead", "drift:parity", "drift:pending"] as FilterKey[])
      .filter((k) => filters.has(k))
      .map((k) => k.split(":")[1] as DriftKind);
    const priPicks = (["pri:P0", "pri:P1", "pri:P2"] as FilterKey[])
      .filter((k) => filters.has(k))
      .map((k) => k.split(":")[1]);
    const staleOnly = filters.has("stale");

    let rows = data.features.filter((f) => {
      if (driftPicks.length && !driftPicks.includes(driftOf(f))) return false;
      if (priPicks.length && !priPicks.includes(f.priority || "")) return false;
      if (staleOnly && stalePRs(f).length === 0) return false;
      return true;
    });

    if (sort.key && sort.dir) {
      const k = sort.key;
      const dirMul = sort.dir === "asc" ? 1 : -1;
      rows = [...rows].sort((a, b) => compareFor(k, a, b) * dirMul);
    } else {
      rows = [...rows].sort(applyDefaultSort);
    }
    return rows;
  }, [data.features, filters, sort]);

  // Filter chip counts (computed over the full dataset, not filtered view).
  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = {
      "drift:ios-ahead": 0, "drift:android-ahead": 0, "drift:parity": 0, "drift:pending": 0,
      "pri:P0": 0, "pri:P1": 0, "pri:P2": 0, "stale": 0,
    };
    for (const f of data.features) {
      const d = driftOf(f);
      c[`drift:${d}` as FilterKey]++;
      if (f.priority) c[`pri:${f.priority}` as FilterKey]++;
      if (stalePRs(f).length) c.stale++;
    }
    return c;
  }, [data.features]);

  const gridTemplate = cols.map((c) => `${c.width}px`).join(" ");

  return (
    <>
      <Toolbar
        filters={filters}
        setFilters={setFilters}
        counts={counts}
        totalShown={visible.length}
        totalAll={data.features.length}
      />

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        {/* Header */}
        <div
          className="grid border-b border-border bg-surface2 text-[10px] font-semibold uppercase tracking-wider text-muted"
          style={{ gridTemplateColumns: gridTemplate, minWidth: "min-content" }}
        >
          {cols.map((c, i) => {
            const isSorted = sort.key === c.key && sort.dir;
            const arrow = isSorted ? (sort.dir === "asc" ? " ↑" : " ↓") : "";
            return (
              <div
                key={c.key}
                onClick={() => clickHeader(c)}
                className={`relative flex items-center px-3 py-2.5 ${
                  c.align === "right" ? "justify-end" : c.align === "center" ? "justify-center" : "justify-start"
                } ${c.sortable ? "cursor-pointer hover:text-text" : ""}`}
              >
                <span>
                  {c.label}
                  <span className="text-warn">{arrow}</span>
                </span>
                {i < cols.length - 1 ? <ResizeHandle onDragStart={(e) => startDrag(i, e)} /> : null}
              </div>
            );
          })}
        </div>

        {/* Body */}
        {visible.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-muted">
            {data.features.length === 0
              ? <>No features yet. Open an issue in <code className="font-mono">{data.config.featuresRepo}</code> with label <code className="font-mono">feature</code>.</>
              : <>No features match the current filters.</>
            }
          </div>
        ) : (
          visible.map((f) => (
            <FeatureRowView key={f.number} f={f} gridTemplate={gridTemplate} cols={cols} />
          ))
        )}
      </div>
    </>
  );
}

function FeatureRowView({
  f, gridTemplate, cols,
}: { f: FeatureRow; gridTemplate: string; cols: ColDef[] }) {
  const drift = driftOf(f);
  const stale = stalePRs(f);
  return (
    <div
      className="group grid border-b border-border last:border-0 hover:bg-surface2/40"
      style={{ gridTemplateColumns: gridTemplate, minWidth: "min-content" }}
    >
      {cols.map((c) => {
        const base = `flex items-center px-3 py-2.5 text-sm ${
          c.align === "right" ? "justify-end" : c.align === "center" ? "justify-center" : "justify-start"
        }`;
        switch (c.key) {
          case "num":
            return (
              <div key={c.key} className={`${base} font-mono text-xs text-muted`}>
                <a href={f.url} target="_blank" rel="noreferrer" className="hover:text-text">{f.number}</a>
              </div>
            );
          case "priority":
            return <div key={c.key} className={base}>{priorityChip(f.priority)}</div>;
          case "feature":
            return (
              <div key={c.key} className={`${base} min-w-0`}>
                <a href={f.url} target="_blank" rel="noreferrer" className="truncate font-medium text-text hover:underline" title={f.title}>
                  {f.title}
                </a>
              </div>
            );
          case "ios":
            return <div key={c.key} className={base}><StatusCell status={f.ios.status} prs={f.ios.prs} platform="iOS" /></div>;
          case "android":
            return <div key={c.key} className={base}><StatusCell status={f.android.status} prs={f.android.prs} platform="Android" /></div>;
          case "drift":
            return <div key={c.key} className={base}><DriftCell kind={drift} /></div>;
          case "stale":
            return <div key={c.key} className={base}><StaleCell stale={stale} /></div>;
          case "updated":
            return <div key={c.key} className={`${base} font-mono text-[11px] text-muted`}>{timeAgo(f.updatedAt)}</div>;
        }
      })}
    </div>
  );
}
