import { NavTabs } from "@/components/NavTabs";
import { fetchBoardCards } from "@/lib/board-github";
import { Board } from "./Board";

export const revalidate = 60;
export const dynamic = "force-dynamic";

export default async function BoardPage() {
  let error: string | null = null;
  let cards = [] as Awaited<ReturnType<typeof fetchBoardCards>>["cards"];
  let warnings: string[] = [];

  try {
    const result = await fetchBoardCards();
    cards = result.cards;
    warnings = result.warnings;
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  return (
    <main className="mx-auto max-w-[1600px] px-6 py-6">
      <NavTabs />

      <header className="mb-6 flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text">
            Project Board
          </h1>
          <p className="mt-1 text-xs text-muted">
            Every <code className="text-staged">feature/*</code> branch and PR
            across your repos. Cards show where each feature currently sits.
            Drag Android cards manually as Android catches up.
          </p>
        </div>
        <div className="text-xs text-muted">{cards.length} GitHub cards</div>
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
          <pre className="mt-2 whitespace-pre-wrap text-xs text-text/80">
            {error}
          </pre>
          <p className="mt-3 text-xs text-muted">
            Make sure GITHUB_TOKEN and GITHUB_ORG are set with read access on
            sportin-pro, rork-sportin-io, and sportin-pro-mobile.
          </p>
        </div>
      ) : (
        <Board githubCards={cards} />
      )}
    </main>
  );
}
