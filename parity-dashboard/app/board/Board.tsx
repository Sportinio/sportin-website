"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  STATUSES,
  PLATFORM_LABEL,
  STATUS_COLOR,
  STATUS_DOT,
  type BoardCard,
  type CardStatus,
  type CardPlatform,
  type CardRepo,
} from "@/lib/board";
import { BOARD_REPOS } from "@/lib/board-github";

type RepoFilter = "all" | CardRepo;

interface ManualCard extends BoardCard {
  is_manual: true;
}

type StatusOverrides = Record<string, CardStatus>;

const LS_MANUAL = "sportin-board-manual";
const LS_OVERRIDES = "sportin-board-overrides";

function loadManual(): ManualCard[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_MANUAL);
    return raw ? (JSON.parse(raw) as ManualCard[]) : [];
  } catch {
    return [];
  }
}

function saveManual(cards: ManualCard[]) {
  try {
    localStorage.setItem(LS_MANUAL, JSON.stringify(cards));
  } catch {}
}

function loadOverrides(): StatusOverrides {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LS_OVERRIDES);
    return raw ? (JSON.parse(raw) as StatusOverrides) : {};
  } catch {
    return {};
  }
}

function saveOverrides(o: StatusOverrides) {
  try {
    localStorage.setItem(LS_OVERRIDES, JSON.stringify(o));
  } catch {}
}

export function Board({ githubCards }: { githubCards: BoardCard[] }) {
  const [mounted, setMounted] = useState(false);
  const [manual, setManual] = useState<ManualCard[]>([]);
  const [overrides, setOverrides] = useState<StatusOverrides>({});
  const [repoFilter, setRepoFilter] = useState<RepoFilter>("all");
  const [adding, setAdding] = useState<{
    repo: CardRepo;
    platform: CardPlatform;
    status: CardStatus;
  } | null>(null);
  const dragId = useRef<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  useEffect(() => {
    setManual(loadManual());
    setOverrides(loadOverrides());
    setMounted(true);
  }, []);

  const cards = useMemo<BoardCard[]>(() => {
    const merged = [...githubCards].map((c) => {
      const ov = overrides[c.id];
      return ov ? { ...c, status: ov } : c;
    });
    return [...merged, ...manual];
  }, [githubCards, overrides, manual]);

  const visibleRepos =
    repoFilter === "all" ? BOARD_REPOS : BOARD_REPOS.filter((r) => r.id === repoFilter);

  function cardsFor(repo: CardRepo, platform: CardPlatform, status: CardStatus) {
    return cards.filter(
      (c) => c.repo === repo && c.platform === platform && c.status === status,
    );
  }

  function handleDrop(repo: CardRepo, platform: CardPlatform, status: CardStatus) {
    const id = dragId.current;
    setDragOver(null);
    dragId.current = null;
    if (!id) return;
    const card = cards.find((c) => c.id === id);
    if (!card || card.repo !== repo || card.platform !== platform) return;
    if (card.status === status) return;

    if (card.is_manual) {
      const next = manual.map((m) => (m.id === id ? { ...m, status } : m));
      setManual(next);
      saveManual(next);
    } else {
      const next = { ...overrides, [id]: status };
      setOverrides(next);
      saveOverrides(next);
    }
  }

  function clearOverride(id: string) {
    const next = { ...overrides };
    delete next[id];
    setOverrides(next);
    saveOverrides(next);
  }

  function deleteManual(id: string) {
    const next = manual.filter((m) => m.id !== id);
    setManual(next);
    saveManual(next);
  }

  function addManual(input: {
    title: string;
    description?: string;
    repo: CardRepo;
    platform: CardPlatform;
    status: CardStatus;
    github_branch?: string;
  }) {
    const id = `manual:${Date.now()}:${Math.random().toString(36).slice(2, 6)}`;
    const slug = input.title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");
    const card: ManualCard = {
      id,
      feature_slug: slug,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      repo: input.repo,
      platform: input.platform,
      status: input.status,
      github_branch: input.github_branch?.trim() || null,
      github_pr_url: null,
      is_manual: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const next = [...manual, card];
    setManual(next);
    saveManual(next);
    setAdding(null);
  }

  if (!mounted) {
    return <div className="py-12 text-center text-xs text-muted">Loading board…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <span className="text-xs uppercase tracking-wider text-muted">Project</span>
        <button
          onClick={() => setRepoFilter("all")}
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
            repoFilter === "all"
              ? "bg-staged text-bg"
              : "bg-surface text-muted hover:bg-surface2 hover:text-text"
          }`}
        >
          All
        </button>
        {BOARD_REPOS.map((r) => (
          <button
            key={r.id}
            onClick={() => setRepoFilter(r.id)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              repoFilter === r.id
                ? "bg-staged text-bg"
                : "bg-surface text-muted hover:bg-surface2 hover:text-text"
            }`}
          >
            {r.label}
          </button>
        ))}
        <span className="ml-2 text-[11px] text-muted">
          {manual.length} manual · {Object.keys(overrides).length} overrides
        </span>
      </div>

      {visibleRepos.map((repo) => {
        const repoCardCount = cards.filter((c) => c.repo === repo.id).length;
        return (
          <section key={repo.id} className="rounded-xl border border-border bg-surface">
            <header className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-text">{repo.label}</h2>
              <span className="text-[11px] text-muted">{repoCardCount} cards</span>
            </header>

            <div className="overflow-x-auto">
              <div className="min-w-[900px] p-3">
                <div
                  className="grid gap-2"
                  style={{
                    gridTemplateColumns: `120px repeat(${STATUSES.length}, 1fr)`,
                  }}
                >
                  <div />
                  {STATUSES.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-1.5 px-2 pb-1"
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[s.id]}`} />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                        {s.label}
                      </span>
                    </div>
                  ))}

                  {repo.platforms.map((platform) => (
                    <PlatformRow
                      key={platform}
                      repo={repo.id}
                      platform={platform}
                      cardsFor={cardsFor}
                      onDragStart={(id) => (dragId.current = id)}
                      onDrop={handleDrop}
                      dragOver={dragOver}
                      setDragOver={setDragOver}
                      onAdd={(status) =>
                        setAdding({ repo: repo.id, platform, status })
                      }
                      onDeleteManual={deleteManual}
                      onClearOverride={clearOverride}
                      hasOverride={(id) => id in overrides}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>
        );
      })}

      {adding && (
        <AddCardModal
          context={adding}
          onClose={() => setAdding(null)}
          onSubmit={addManual}
        />
      )}
    </div>
  );
}

function PlatformRow({
  repo,
  platform,
  cardsFor,
  onDragStart,
  onDrop,
  dragOver,
  setDragOver,
  onAdd,
  onDeleteManual,
  onClearOverride,
  hasOverride,
}: {
  repo: CardRepo;
  platform: CardPlatform;
  cardsFor: (r: CardRepo, p: CardPlatform, s: CardStatus) => BoardCard[];
  onDragStart: (id: string) => void;
  onDrop: (r: CardRepo, p: CardPlatform, s: CardStatus) => void;
  dragOver: string | null;
  setDragOver: (v: string | null) => void;
  onAdd: (s: CardStatus) => void;
  onDeleteManual: (id: string) => void;
  onClearOverride: (id: string) => void;
  hasOverride: (id: string) => boolean;
}) {
  return (
    <>
      <div className="flex items-center px-2 py-2 text-xs font-semibold text-text">
        {PLATFORM_LABEL[platform]}
      </div>
      {STATUSES.map((s) => {
        const cellId = `${repo}-${platform}-${s.id}`;
        const items = cardsFor(repo, platform, s.id);
        return (
          <div
            key={s.id}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(cellId);
            }}
            onDragLeave={() => setDragOver(null)}
            onDrop={() => onDrop(repo, platform, s.id)}
            className={`min-h-[80px] rounded-lg border-t-2 bg-bg p-1.5 transition ${
              STATUS_COLOR[s.id]
            } ${dragOver === cellId ? "ring-1 ring-staged/60" : ""}`}
          >
            <div className="space-y-1.5">
              {items.map((c) => (
                <CardChip
                  key={c.id}
                  card={c}
                  onDragStart={onDragStart}
                  onDeleteManual={onDeleteManual}
                  onClearOverride={onClearOverride}
                  overridden={hasOverride(c.id)}
                />
              ))}
              <button
                onClick={() => onAdd(s.id)}
                className="w-full rounded border border-dashed border-border/60 px-2 py-1 text-[10px] text-muted transition hover:border-muted/50 hover:text-text"
              >
                + Add
              </button>
            </div>
          </div>
        );
      })}
    </>
  );
}

function CardChip({
  card,
  onDragStart,
  onDeleteManual,
  onClearOverride,
  overridden,
}: {
  card: BoardCard;
  onDragStart: (id: string) => void;
  onDeleteManual: (id: string) => void;
  onClearOverride: (id: string) => void;
  overridden: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div
      draggable
      onDragStart={() => onDragStart(card.id)}
      onClick={() => setOpen((o) => !o)}
      className="cursor-grab rounded border border-border bg-surface2 p-2 shadow-sm transition hover:border-muted/40 active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-1.5">
        <h3 className="text-[12px] font-medium leading-snug text-text">
          {card.title}
        </h3>
        <div className="flex shrink-0 gap-1">
          {card.is_manual && (
            <span className="rounded bg-staged/20 px-1 py-0.5 text-[9px] font-bold uppercase text-staged">
              M
            </span>
          )}
          {overridden && (
            <span
              title="Status overridden locally"
              className="rounded bg-warn/20 px-1 py-0.5 text-[9px] font-bold uppercase text-warn"
            >
              O
            </span>
          )}
        </div>
      </div>
      {open && (
        <div className="mt-2 space-y-1.5 border-t border-border pt-2">
          {card.description && (
            <p className="text-[11px] text-text/70">{card.description}</p>
          )}
          {card.github_branch && (
            <p className="font-mono text-[10px] text-muted">{card.github_branch}</p>
          )}
          {card.github_pr_url && (
            <a
              href={card.github_pr_url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="block text-[10px] text-staged underline"
            >
              View PR
            </a>
          )}
          <div className="flex flex-wrap gap-2 pt-1 text-[10px]">
            {overridden && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClearOverride(card.id);
                }}
                className="text-warn underline"
              >
                Clear override
              </button>
            )}
            {card.is_manual && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete "${card.title}"?`)) onDeleteManual(card.id);
                }}
                className="text-bad/80 underline"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AddCardModal({
  context,
  onClose,
  onSubmit,
}: {
  context: { repo: CardRepo; platform: CardPlatform; status: CardStatus };
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description?: string;
    repo: CardRepo;
    platform: CardPlatform;
    status: CardStatus;
    github_branch?: string;
  }) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [branch, setBranch] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      repo: context.repo,
      platform: context.platform,
      status: context.status,
      github_branch: branch.trim() || undefined,
    });
  }

  const repoLabel = BOARD_REPOS.find((r) => r.id === context.repo)?.label;
  const platformLabel = PLATFORM_LABEL[context.platform];
  const statusLabel = STATUSES.find((s) => s.id === context.status)?.label;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-md space-y-3 rounded-xl border border-border bg-surface p-5 shadow-xl"
      >
        <header className="space-y-1">
          <h2 className="text-sm font-semibold text-text">New manual card</h2>
          <p className="text-[11px] text-muted">
            {repoLabel} · {platformLabel} · {statusLabel}
          </p>
        </header>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Feature title"
          className="w-full rounded bg-bg px-3 py-2 text-sm text-text outline-none focus:ring-1 focus:ring-staged/50"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          rows={3}
          className="w-full resize-none rounded bg-bg px-3 py-2 text-xs text-text outline-none focus:ring-1 focus:ring-staged/50"
        />
        <input
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
          placeholder="Link a GitHub branch (optional, e.g. feature/profile-page)"
          className="w-full rounded bg-bg px-3 py-2 font-mono text-xs text-text outline-none focus:ring-1 focus:ring-staged/50"
        />
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-3 py-1.5 text-xs text-muted transition hover:text-text"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded bg-staged px-4 py-1.5 text-xs font-medium text-bg transition hover:bg-staged/80"
          >
            Create
          </button>
        </div>
      </form>
    </div>
  );
}
