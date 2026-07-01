import { NavTabs } from "@/components/NavTabs";
import { fetchLiveBoard } from "@/lib/board-live";
import { computeActorMetrics, computeAndroidLag, computeCardTimings } from "@/lib/metrics";
import { Board } from "./Board";

export const revalidate = 60;
export const dynamic = "force-dynamic";

export default async function BoardPage() {
  let error: string | null = null;
  let cards: Awaited<ReturnType<typeof fetchLiveBoard>>["cards"] = [];
  let events: Awaited<ReturnType<typeof fetchLiveBoard>>["events"] = [];
  let warnings: string[] = [];

  try {
    const result = await fetchLiveBoard();
    cards = result.cards;
    events = result.events;
    warnings = result.warnings;
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  const actors = computeActorMetrics(events);
  const lag = computeAndroidLag(cards, events);
  const timings = Object.fromEntries(computeCardTimings(events));

  return (
    <main className="mx-auto max-w-[1600px] px-6 py-6">
      <NavTabs />

      <header className="mb-6 flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text">Project Board</h1>
          <p className="mt-1 text-xs text-muted">
            Every feature across your repos, placed by where it sits in git:{" "}
            <span className="text-staged">Backlog → Testing → Dev → Main</span>. Cards
            appear on push and move on merge; timings come from real git timestamps.
            iOS leads; each feature carries an Android replica so the gap is always
            visible.
          </p>
        </div>
        <div className="text-xs text-muted">{cards.length} cards</div>
      </header>

      {warnings.length > 0 && (
        <div className="mb-4 rounded-lg border border-warn/40 bg-warn/10 p-3 text-xs text-warn">
          {warnings.map((w) => (
            <div key={w}>· {w}</div>
          ))}
        </div>
      )}

      {error ? (
        <div className="rounded-xl border border-bad/40 bg-bad/10 p-6">
          <h2 className="text-sm font-semibold text-bad">Failed to load board</h2>
          <pre className="mt-2 whitespace-pre-wrap text-xs text-text/80">{error}</pre>
        </div>
      ) : (
        <Board cards={cards} actors={actors} lag={lag} timings={timings} />
      )}
    </main>
  );
}
