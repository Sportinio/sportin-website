import { fetchDashboard } from "@/lib/github";
import { Header } from "@/components/Header";
import { ParityTable } from "@/components/ParityTable";

// Revalidate cache every 60 seconds. Manual refresh still works (hard reload).
export const revalidate = 60;
export const dynamic = "force-dynamic";

export default async function Page() {
  let error: string | null = null;
  let data = null;
  try {
    data = await fetchDashboard();
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      {error ? (
        <div className="rounded-xl border border-bad/40 bg-bad/10 p-6">
          <h1 className="text-lg font-semibold text-bad">Dashboard error</h1>
          <pre className="mt-3 whitespace-pre-wrap text-xs text-text/80">{error}</pre>
          <p className="mt-4 text-xs text-muted">
            Check <code>.env.local</code> against <code>.env.example</code>. The token needs read
            access on all three repos: features-tracker, iOS, Android.
          </p>
        </div>
      ) : data ? (
        <>
          <Header data={data} />
          <ParityTable data={data} />
          <footer className="mt-8 text-center text-[11px] text-muted">
            Convention: open an issue in <code>{data.config.featuresRepo}</code> with label{" "}
            <code>feature</code> for each new feature. Reference it from PRs with{" "}
            <code>Closes #N</code>. Tag priority with <code>P0</code> / <code>P1</code> /{" "}
            <code>P2</code>.
          </footer>
        </>
      ) : null}
    </main>
  );
}
