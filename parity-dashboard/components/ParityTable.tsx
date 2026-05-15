"use client";

import { useEffect, useRef, useState } from "react";
import type { DashboardData, FeatureRow, FeatureStatus, PRRef } from "@/lib/types";

/**
 * Column definitions. `width` is the initial pixel width.
 * Stored widths persist in localStorage so resizes stick across reloads.
 */
type ColKey = "num" | "priority" | "feature" | "ios" | "android" | "drift" | "updated";
interface ColDef {
  key: ColKey;
  label: string;
  width: number;
  min: number;
  align?: "left" | "center" | "right";
}
const DEFAULT_COLS: ColDef[] = [
  { key: "num", label: "#", width: 56, min: 40, align: "right" },
  { key: "priority", label: "PRI", width: 64, min: 48, align: "center" },
  { key: "feature", label: "FEATURE", width: 360, min: 160, align: "left" },
  { key: "ios", label: "iOS", width: 72, min: 56, align: "center" },
  { key: "android", label: "AND", width: 72, min: 56, align: "center" },
  { key: "drift", label: "DRIFT", width: 100, min: 72, align: "center" },
  { key: "updated", label: "UPDATED", width: 96, min: 64, align: "right" },
];
const LS_KEY = "sportin-parity-col-widths-v1";

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

function driftIcon(ios: FeatureStatus, android: FeatureStatus) {
  if (ios === "merged" && android !== "merged") {
    return { glyph: "→", label: "iOS ahead", className: "text-bad" };
  }
  if (android === "merged" && ios !== "merged") {
    return { glyph: "←", label: "Android ahead", className: "text-bad" };
  }
  if (ios === "merged" && android === "merged") {
    return { glyph: "✓", label: "Parity", className: "text-ok" };
  }
  return { glyph: "·", label: "Pending", className: "text-muted" };
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
  status,
  prs,
  platform,
}: {
  status: FeatureStatus;
  prs: PRRef[];
  platform: string;
}) {
  return (
    <div
      className="pointer-events-auto absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2 rounded-lg border border-border bg-surface2 p-3 text-left text-xs shadow-xl"
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
          {prs.map((pr) => (
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
                <span className="ml-auto">{timeAgo(pr.updatedAt)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusCell({
  status,
  prs,
  platform,
}: {
  status: FeatureStatus;
  prs: PRRef[];
  platform: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="relative flex items-center justify-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${STATUS_COLOR[status]}`} />
      {prs.length > 0 ? (
        <span className="ml-1.5 text-[10px] text-muted">{prs.length}</span>
      ) : null}
      {open ? <PRPopover status={status} prs={prs} platform={platform} /> : null}
    </div>
  );
}

function DriftCell({ ios, android }: { ios: FeatureStatus; android: FeatureStatus }) {
  const d = driftIcon(ios, android);
  return (
    <div className={`flex items-center justify-center gap-1 text-xs ${d.className}`} title={d.label}>
      <span className="font-semibold">{d.glyph}</span>
      <span className="hidden md:inline text-[10px] uppercase tracking-wider">{d.label}</span>
    </div>
  );
}

// ── Resize handle ─────────────────────────────────────────────────────

function ResizeHandle({
  onDragStart,
}: {
  onDragStart: (e: React.MouseEvent) => void;
}) {
  return (
    <span
      onMouseDown={onDragStart}
      onClick={(e) => e.stopPropagation()}
      className="absolute right-0 top-0 z-10 h-full w-1 cursor-col-resize select-none bg-transparent hover:bg-warn/40"
      aria-hidden
    />
  );
}

// ── Main table ────────────────────────────────────────────────────────

export function ParityTable({ data }: { data: DashboardData }) {
  const [cols, setCols] = useState<ColDef[]>(DEFAULT_COLS);
  const dragRef = useRef<{ index: number; startX: number; startWidth: number } | null>(null);

  // Restore widths from localStorage on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(LS_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Record<ColKey, number>;
      setCols((prev) =>
        prev.map((c) => (saved[c.key] && saved[c.key] >= c.min ? { ...c, width: saved[c.key] } : c)),
      );
    } catch {}
  }, []);

  // Persist widths whenever they change.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const map: Record<string, number> = {};
    cols.forEach((c) => (map[c.key] = c.width));
    window.localStorage.setItem(LS_KEY, JSON.stringify(map));
  }, [cols]);

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

  const gridTemplate = cols.map((c) => `${c.width}px`).join(" ");

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      {/* Header */}
      <div
        className="grid border-b border-border bg-surface2 text-[10px] font-semibold uppercase tracking-wider text-muted"
        style={{ gridTemplateColumns: gridTemplate, minWidth: "min-content" }}
      >
        {cols.map((c, i) => (
          <div
            key={c.key}
            className={`relative flex items-center px-3 py-2.5 ${
              c.align === "right" ? "justify-end" : c.align === "center" ? "justify-center" : "justify-start"
            }`}
          >
            <span>{c.label}</span>
            {i < cols.length - 1 ? <ResizeHandle onDragStart={(e) => startDrag(i, e)} /> : null}
          </div>
        ))}
      </div>

      {/* Body */}
      {data.features.length === 0 ? (
        <div className="px-4 py-12 text-center text-sm text-muted">
          No features yet. Open an issue in <code className="font-mono">{data.config.featuresRepo}</code> with label{" "}
          <code className="font-mono">feature</code>.
        </div>
      ) : (
        data.features.map((f) => (
          <FeatureRowView key={f.number} f={f} gridTemplate={gridTemplate} cols={cols} />
        ))
      )}
    </div>
  );
}

function FeatureRowView({
  f,
  gridTemplate,
  cols,
}: {
  f: FeatureRow;
  gridTemplate: string;
  cols: ColDef[];
}) {
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
                <a href={f.url} target="_blank" rel="noreferrer" className="hover:text-text">
                  {f.number}
                </a>
              </div>
            );
          case "priority":
            return (
              <div key={c.key} className={base}>
                {priorityChip(f.priority)}
              </div>
            );
          case "feature":
            return (
              <div key={c.key} className={`${base} min-w-0`}>
                <a
                  href={f.url}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate font-medium text-text hover:underline"
                  title={f.title}
                >
                  {f.title}
                </a>
              </div>
            );
          case "ios":
            return (
              <div key={c.key} className={base}>
                <StatusCell status={f.ios.status} prs={f.ios.prs} platform="iOS" />
              </div>
            );
          case "android":
            return (
              <div key={c.key} className={base}>
                <StatusCell status={f.android.status} prs={f.android.prs} platform="Android" />
              </div>
            );
          case "drift":
            return (
              <div key={c.key} className={base}>
                <DriftCell ios={f.ios.status} android={f.android.status} />
              </div>
            );
          case "updated":
            return (
              <div key={c.key} className={`${base} font-mono text-[11px] text-muted`}>
                {timeAgo(f.updatedAt)}
              </div>
            );
        }
      })}
    </div>
  );
}
