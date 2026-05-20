"use client";

import { useState, useEffect, useRef } from "react";
import { NavTabs } from "@/components/NavTabs";
import {
  SEED_ITEMS,
  COLUMNS,
  REPOS,
  PLATFORMS,
  TYPES,
  PRIORITIES,
  type BoardItem,
  type ColumnId,
} from "./data";

const STORAGE_KEY = "sportin-board-items";
const COLLAPSED_KEY = "sportin-board-collapsed";

function loadItems(): BoardItem[] {
  if (typeof window === "undefined") return SEED_ITEMS;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return SEED_ITEMS;
}

function saveItems(items: BoardItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

function loadCollapsed(): Set<ColumnId> {
  if (typeof window === "undefined") return new Set();
  try {
    const saved = localStorage.getItem(COLLAPSED_KEY);
    if (saved) return new Set(JSON.parse(saved));
  } catch {}
  return new Set();
}

function saveCollapsed(cols: Set<ColumnId>) {
  try {
    localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...cols]));
  } catch {}
}

const TYPE_COLORS: Record<BoardItem["type"], string> = {
  feature: "bg-staged/20 text-staged",
  "tech-debt": "bg-warn/20 text-warn",
  security: "bg-bad/20 text-bad",
  architecture: "bg-staged/15 text-staged",
  bug: "bg-warn/25 text-warn",
};

const PRIORITY_COLORS: Record<BoardItem["priority"], string> = {
  critical: "bg-bad text-white",
  high: "bg-bad/30 text-bad",
  medium: "bg-warn/30 text-warn",
  low: "bg-muted/30 text-muted",
};

const REPO_LABELS: Record<string, string> = {
  "sportin-pro": "Web",
  "sportin-pro-mobile": "Mobile",
  "rork-sportin-io": "SportIn.io",
};

const REPO_COLORS: Record<string, string> = {
  "sportin-pro": "bg-ok/20 text-ok",
  "sportin-pro-mobile": "bg-staged/20 text-staged",
  "rork-sportin-io": "bg-warn/20 text-warn",
};

const COLUMN_COLORS: Record<ColumnId, string> = {
  backlog: "border-muted/50",
  todo: "border-staged",
  "in-progress": "border-warn",
  done: "border-ok",
};

type Filters = {
  repo: string | null;
  platform: string | null;
  type: string | null;
  priority: string | null;
  search: string;
};

function Card({
  item,
  onDragStart,
  onStatusChange,
  onDelete,
}: {
  item: BoardItem;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onStatusChange: (id: string, status: ColumnId) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, item.id)}
      onClick={() => setExpanded(!expanded)}
      className="group cursor-grab rounded-lg border border-border bg-surface2 p-3 shadow-sm transition hover:border-muted/40 active:cursor-grabbing"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium text-text leading-snug">
          {item.title}
        </h3>
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${PRIORITY_COLORS[item.priority]}`}
        >
          {item.priority}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${REPO_COLORS[item.repo]}`}
        >
          {REPO_LABELS[item.repo]}
        </span>
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${TYPE_COLORS[item.type]}`}
        >
          {item.type}
        </span>
        <span className="rounded bg-border px-1.5 py-0.5 text-[10px] font-medium text-muted">
          {item.platform}
        </span>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          <p className="text-xs text-text/70 leading-relaxed">
            {item.description}
          </p>
          {item.source && (
            <p className="text-[10px] font-mono text-muted">{item.source}</p>
          )}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {COLUMNS.filter((c) => c.id !== item.status).map((col) => (
              <button
                key={col.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusChange(item.id, col.id);
                }}
                className="rounded bg-border px-2 py-1 text-[10px] text-muted transition hover:bg-border/70 hover:text-text"
              >
                {col.label}
              </button>
            ))}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item.id);
              }}
              className="ml-auto rounded bg-bad/10 px-2 py-1 text-[10px] text-bad transition hover:bg-bad/20"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AddCardForm({
  columnId,
  onAdd,
  onCancel,
}: {
  columnId: ColumnId;
  onAdd: (item: Omit<BoardItem, "id">) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [repo, setRepo] = useState<BoardItem["repo"]>("sportin-pro");
  const [platform, setPlatform] = useState<BoardItem["platform"]>("web");
  const [type, setType] = useState<BoardItem["type"]>("feature");
  const [priority, setPriority] = useState<BoardItem["priority"]>("medium");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({
      title: title.trim(),
      description: description.trim(),
      repo,
      platform,
      type,
      priority,
      status: columnId,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-2 rounded-lg border border-border bg-surface2 p-3"
    >
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Card title..."
        className="w-full rounded bg-bg px-2 py-1.5 text-sm text-text placeholder:text-muted outline-none focus:ring-1 focus:ring-staged/50"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        rows={2}
        className="w-full rounded bg-bg px-2 py-1.5 text-xs text-text placeholder:text-muted outline-none focus:ring-1 focus:ring-staged/50 resize-none"
      />
      <div className="grid grid-cols-2 gap-1.5">
        <select
          value={repo}
          onChange={(e) => setRepo(e.target.value as BoardItem["repo"])}
          className="rounded bg-bg px-2 py-1 text-[11px] text-text outline-none"
        >
          {REPOS.map((r) => (
            <option key={r} value={r}>{REPO_LABELS[r]}</option>
          ))}
        </select>
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value as BoardItem["platform"])}
          className="rounded bg-bg px-2 py-1 text-[11px] text-text outline-none"
        >
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as BoardItem["type"])}
          className="rounded bg-bg px-2 py-1 text-[11px] text-text outline-none"
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as BoardItem["priority"])}
          className="rounded bg-bg px-2 py-1 text-[11px] text-text outline-none"
        >
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>
      <div className="flex justify-end gap-1.5">
        <button
          type="button"
          onClick={onCancel}
          className="rounded px-3 py-1 text-xs text-muted transition hover:text-text"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded bg-staged px-3 py-1 text-xs font-medium text-bg transition hover:bg-staged/80"
        >
          Add
        </button>
      </div>
    </form>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
        active
          ? "bg-staged text-bg"
          : "bg-surface text-muted hover:bg-surface2 hover:text-text"
      }`}
    >
      {label}
    </button>
  );
}

export default function BoardPage() {
  const [items, setItems] = useState<BoardItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    repo: null,
    platform: null,
    type: null,
    priority: null,
    search: "",
  });
  const [addingTo, setAddingTo] = useState<ColumnId | null>(null);
  const [dragOver, setDragOver] = useState<ColumnId | null>(null);
  const [collapsedCols, setCollapsedCols] = useState<Set<ColumnId>>(new Set());
  const dragItem = useRef<string | null>(null);

  useEffect(() => {
    setItems(loadItems());
    setCollapsedCols(loadCollapsed());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) saveItems(items);
  }, [items, mounted]);

  function updateFilter(key: keyof Filters, value: string | null) {
    setFilters((f) => ({
      ...f,
      [key]: f[key] === value ? null : value,
    }));
  }

  function filteredItems(status: ColumnId) {
    return items.filter((item) => {
      if (item.status !== status) return false;
      if (filters.repo && item.repo !== filters.repo) return false;
      if (filters.platform && item.platform !== filters.platform) return false;
      if (filters.type && item.type !== filters.type) return false;
      if (filters.priority && item.priority !== filters.priority) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          (item.source?.toLowerCase().includes(q) ?? false)
        );
      }
      return true;
    });
  }

  function handleDragStart(e: React.DragEvent, id: string) {
    dragItem.current = id;
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent, columnId: ColumnId) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(columnId);
  }

  function handleDrop(columnId: ColumnId) {
    if (dragItem.current) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === dragItem.current ? { ...item, status: columnId } : item,
        ),
      );
      dragItem.current = null;
    }
    setDragOver(null);
  }

  function handleStatusChange(id: string, status: ColumnId) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item)),
    );
  }

  function handleDelete(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  function handleAdd(columnId: ColumnId, data: Omit<BoardItem, "id">) {
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setItems((prev) => [...prev, { ...data, id }]);
    setAddingTo(null);
  }

  function handleReset() {
    if (confirm("Reset board to initial state? All changes will be lost.")) {
      setItems(SEED_ITEMS);
      setCollapsedCols(new Set());
      saveCollapsed(new Set());
    }
  }

  function toggleColumn(id: ColumnId) {
    setCollapsedCols((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveCollapsed(next);
      return next;
    });
  }

  const totalItems = items.length;
  const doneItems = items.filter((i) => i.status === "done").length;
  const criticalOpen = items.filter(
    (i) => i.priority === "critical" && i.status !== "done",
  ).length;
  const securityOpen = items.filter(
    (i) => i.type === "security" && i.status !== "done",
  ).length;

  if (!mounted) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <NavTabs />
        <div className="text-muted">Loading board...</div>
      </main>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-6">
      <NavTabs />

      <header className="mb-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-baseline gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              Project Board
            </h1>
            <span className="text-sm text-muted">
              {doneItems}/{totalItems} done · across 3 repos
            </span>
          </div>

          <div className="flex items-center gap-2">
            {criticalOpen > 0 && (
              <button
                onClick={() => updateFilter("priority", "critical")}
                className="flex items-center gap-1.5 rounded-full bg-bad/20 px-3 py-1 text-xs font-medium text-bad transition hover:bg-bad/30"
              >
                <span className="h-2 w-2 animate-pulse rounded-full bg-bad" />
                {criticalOpen} critical
              </button>
            )}
            {securityOpen > 0 && (
              <button
                onClick={() => updateFilter("type", "security")}
                className="flex items-center gap-1.5 rounded-full bg-bad/10 px-3 py-1 text-xs font-medium text-bad/80 transition hover:bg-bad/20"
              >
                {securityOpen} security
              </button>
            )}
            <button
              onClick={handleReset}
              className="rounded px-3 py-1 text-xs text-muted transition hover:text-text"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={filters.search}
            onChange={(e) =>
              setFilters((f) => ({ ...f, search: e.target.value }))
            }
            placeholder="Search cards..."
            className="w-48 rounded-lg bg-surface px-3 py-1.5 text-xs text-text placeholder:text-muted outline-none focus:ring-1 focus:ring-staged/50"
          />

          <div className="h-4 w-px bg-border" />

          <div className="flex flex-wrap gap-1">
            {REPOS.map((r) => (
              <FilterChip
                key={r}
                label={REPO_LABELS[r]}
                active={filters.repo === r}
                onClick={() => updateFilter("repo", r)}
              />
            ))}
          </div>

          <div className="h-4 w-px bg-border" />

          <div className="flex flex-wrap gap-1">
            {PLATFORMS.map((p) => (
              <FilterChip
                key={p}
                label={p}
                active={filters.platform === p}
                onClick={() => updateFilter("platform", p)}
              />
            ))}
          </div>

          <div className="h-4 w-px bg-border" />

          <div className="flex flex-wrap gap-1">
            {TYPES.map((t) => (
              <FilterChip
                key={t}
                label={t}
                active={filters.type === t}
                onClick={() => updateFilter("type", t)}
              />
            ))}
          </div>

          <div className="h-4 w-px bg-border" />

          <div className="flex flex-wrap gap-1">
            {PRIORITIES.map((p) => (
              <FilterChip
                key={p}
                label={p}
                active={filters.priority === p}
                onClick={() => updateFilter("priority", p)}
              />
            ))}
          </div>

          {(filters.repo ||
            filters.platform ||
            filters.type ||
            filters.priority ||
            filters.search) && (
            <button
              onClick={() =>
                setFilters({
                  repo: null,
                  platform: null,
                  type: null,
                  priority: null,
                  search: "",
                })
              }
              className="text-[11px] text-muted underline transition hover:text-text"
            >
              Clear filters
            </button>
          )}
        </div>
      </header>

      <div className="flex gap-3 overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const colItems = filteredItems(col.id);
          const isCollapsed = collapsedCols.has(col.id);

          if (isCollapsed) {
            return (
              <button
                key={col.id}
                onClick={() => toggleColumn(col.id)}
                className={`flex w-10 shrink-0 flex-col items-center gap-2 rounded-xl border-t-2 bg-surface py-3 transition hover:bg-surface2 ${COLUMN_COLORS[col.id]}`}
                style={{ minHeight: "70vh" }}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted [writing-mode:vertical-lr]">
                  {col.label}
                </span>
                <span className="rounded-full bg-border px-1.5 py-0.5 text-[10px] font-bold text-muted">
                  {colItems.length}
                </span>
              </button>
            );
          }

          return (
            <div
              key={col.id}
              className={`flex min-w-[300px] flex-1 flex-col rounded-xl border-t-2 bg-surface transition-colors ${
                COLUMN_COLORS[col.id]
              } ${dragOver === col.id ? "ring-1 ring-staged/40" : ""}`}
              style={{ minHeight: "70vh" }}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => handleDrop(col.id)}
            >
              <div className="flex items-center justify-between px-3 py-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleColumn(col.id)}
                    className="text-muted hover:text-text"
                    title="Collapse column"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M11 19l-7-7 7-7M18 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
                    {col.label}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-border px-2 py-0.5 text-[10px] font-bold text-muted">
                    {colItems.length}
                  </span>
                  <button
                    onClick={() =>
                      setAddingTo(addingTo === col.id ? null : col.id)
                    }
                    className="flex h-5 w-5 items-center justify-center rounded text-muted transition hover:bg-border hover:text-text"
                    title="Add card"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto px-2 pb-2">
                {addingTo === col.id && (
                  <AddCardForm
                    columnId={col.id}
                    onAdd={(data) => handleAdd(col.id, data)}
                    onCancel={() => setAddingTo(null)}
                  />
                )}
                {colItems.map((item) => (
                  <Card
                    key={item.id}
                    item={item}
                    onDragStart={handleDragStart}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDelete}
                  />
                ))}
                {colItems.length === 0 && !addingTo && (
                  <div className="py-8 text-center text-xs text-muted">
                    {col.id === "done" ? "Nothing completed yet" : "Drop cards here"}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
