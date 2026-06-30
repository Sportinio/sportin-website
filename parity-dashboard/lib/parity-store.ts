import { requireSql } from "./db";
import {
  REPO_CONFIG,
  STAGE_ORDER,
  stageRank,
  slugToTitle,
  type Platform,
  type Stage,
} from "./stages";

export interface ParityCard {
  id: string;
  repo: string;
  feature_slug: string;
  platform: Platform;
  title: string;
  current_stage: Stage;
  is_lead: boolean;
  pr_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ParityEvent {
  id: number;
  card_id: string;
  from_stage: Stage | null;
  to_stage: Stage;
  at: string;
  source: string;
  actor: string | null;
  pr_url: string | null;
  pr_number: number | null;
}

function cardId(repo: string, slug: string, platform: Platform): string {
  return `${repo}:${slug}:${platform}`;
}

export interface TransitionInput {
  repo: string;
  slug: string;
  platform: Platform;
  toStage: Stage;
  at: string; // ISO timestamp of the git event
  title?: string;
  actor?: string | null;
  prUrl?: string | null;
  prNumber?: number | null;
  source?: "github" | "manual";
  /** Manual moves may go backwards; github events only ever advance forward. */
  allowBackward?: boolean;
}

/**
 * Apply a lane transition for one card. Idempotent + monotonic for github
 * events: upserts the card, and only records an event (and advances
 * current_stage) when the new stage is strictly ahead of the current one.
 * Creating a lead-platform card also ensures the Android replica exists.
 */
export async function applyTransition(input: TransitionInput): Promise<void> {
  const sql = requireSql();
  const cfg = REPO_CONFIG[input.repo];
  if (!cfg) throw new Error(`Unknown repo: ${input.repo}`);
  if (!cfg.platforms.includes(input.platform)) {
    throw new Error(`Repo ${input.repo} has no platform ${input.platform}`);
  }

  const id = cardId(input.repo, input.slug, input.platform);
  const title = input.title?.trim() || slugToTitle(input.slug);
  const isLead = input.platform === cfg.lead;
  const source = input.source ?? "github";

  // Upsert the card (without touching current_stage yet).
  const existing = await sql`
    insert into parity_cards (id, repo, feature_slug, platform, title, is_lead, pr_url, current_stage)
    values (${id}, ${input.repo}, ${input.slug}, ${input.platform}, ${title}, ${isLead}, ${input.prUrl ?? null}, 'backlog')
    on conflict (id) do update
      set title  = coalesce(nullif(excluded.title, ''), parity_cards.title),
          pr_url = coalesce(excluded.pr_url, parity_cards.pr_url),
          updated_at = now()
    returning current_stage
  ` as { current_stage: Stage }[];

  const current = existing[0]?.current_stage ?? "backlog";

  const forward = stageRank(input.toStage) > stageRank(current);
  const shouldMove =
    input.toStage !== current && (forward || (input.allowBackward ?? source === "manual"));

  if (shouldMove) {
    await sql`
      insert into parity_events (card_id, from_stage, to_stage, at, source, actor, pr_url, pr_number)
      values (${id}, ${current}, ${input.toStage}, ${input.at}, ${source}, ${input.actor ?? null}, ${input.prUrl ?? null}, ${input.prNumber ?? null})
    `;
    await sql`
      update parity_cards set current_stage = ${input.toStage}, updated_at = now() where id = ${id}
    `;
  }

  // iOS leads on mobile -> ensure the Android replica exists in Backlog so the
  // lag is always visible. It advances off Android's own branches/PRs (or a
  // manual move), never automatically from iOS.
  if (isLead) {
    for (const platform of cfg.platforms) {
      if (platform === cfg.lead) continue;
      const replicaId = cardId(input.repo, input.slug, platform);
      await sql`
        insert into parity_cards (id, repo, feature_slug, platform, title, is_lead, current_stage)
        values (${replicaId}, ${input.repo}, ${input.slug}, ${platform}, ${title}, false, 'backlog')
        on conflict (id) do nothing
      `;
    }
  }
}

export async function getCards(repos?: string[]): Promise<ParityCard[]> {
  const sql = requireSql();
  const rows = repos?.length
    ? ((await sql`select * from parity_cards where repo = any(${repos}) order by feature_slug, platform`) as ParityCard[])
    : ((await sql`select * from parity_cards order by repo, feature_slug, platform`) as ParityCard[]);
  return rows;
}

export async function getEvents(cardIds?: string[]): Promise<ParityEvent[]> {
  const sql = requireSql();
  const rows = cardIds?.length
    ? ((await sql`select * from parity_events where card_id = any(${cardIds}) order by card_id, at`) as ParityEvent[])
    : ((await sql`select * from parity_events order by card_id, at`) as ParityEvent[]);
  return rows;
}

/** Manual create / move a card from the UI (writes an event like any other). */
export async function manualMove(
  repo: string,
  slug: string,
  platform: Platform,
  toStage: Stage,
  title?: string,
): Promise<void> {
  await applyTransition({
    repo,
    slug,
    platform,
    toStage,
    at: new Date().toISOString(),
    title,
    source: "manual",
    actor: "manual",
  });
}

export { STAGE_ORDER };
