import { fetchTeam } from "@/lib/team";
import { TeamView } from "@/components/TeamView";
import { NavTabs } from "@/components/NavTabs";

export const revalidate = 60;
export const dynamic = "force-dynamic";

export default async function TeamPage() {
  let error: string | null = null;
  let data = null;
  try {
    data = await fetchTeam(30);
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <NavTabs />
      {error ? (
        <div className="rounded-xl border border-bad/40 bg-bad/10 p-6">
          <h1 className="text-lg font-semibold text-bad">Team page error</h1>
          <pre className="mt-3 whitespace-pre-wrap text-xs text-text/80">{error}</pre>
        </div>
      ) : data ? (
        <TeamView data={data} />
      ) : null}
    </main>
  );
}
