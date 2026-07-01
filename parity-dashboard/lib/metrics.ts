import type { ParityCard, ParityEvent } from "./parity-store";
import { STAGE_ORDER, stageRank, type Platform, type Stage } from "./stages";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export interface CardTiming {
  cardId: string;
  /** Hours spent in each stage (only stages the card has left are "closed"). */
  hoursInStage: Partial<Record<Stage, number>>;
  /** Dev -> Main wall-clock in hours, if the card reached main. */
  cycleHours: number | null;
  /** Testing -> Main wall-clock in hours (the v1 "build time" proxy). */
  buildHours: number | null;
  /** True once the card has reached main (shipped), regardless of measurable cycle. */
  reachedMain: boolean;
  /** Actor credited with the work (earliest event's actor). */
  actor: string | null;
}

/** Per-card durations derived from the event log. */
export function computeCardTimings(events: ParityEvent[]): Map<string, CardTiming> {
  const byCard = new Map<string, ParityEvent[]>();
  for (const e of events) {
    const list = byCard.get(e.card_id) ?? [];
    list.push(e);
    byCard.set(e.card_id, list);
  }

  const out = new Map<string, CardTiming>();
  for (const [cardId, evs] of byCard) {
    evs.sort((a, b) => +new Date(a.at) - +new Date(b.at));
    const hoursInStage: Partial<Record<Stage, number>> = {};
    for (let i = 0; i < evs.length - 1; i++) {
      const stage = evs[i].to_stage;
      const dur = (+new Date(evs[i + 1].at) - +new Date(evs[i].at)) / 3600000;
      hoursInStage[stage] = (hoursInStage[stage] ?? 0) + dur;
    }

    const at = (s: Stage) => {
      const e = evs.find((x) => x.to_stage === s);
      return e ? +new Date(e.at) : null;
    };
    const first = evs[0] ? +new Date(evs[0].at) : null;
    const testing = at("testing");
    const main = at("main");

    out.set(cardId, {
      cardId,
      hoursInStage,
      // Cycle = total lead time from first tracked activity to shipping on main
      // (order-agnostic, so it holds regardless of lane ordering).
      cycleHours: first != null && main != null && main > first ? (main - first) / 3600000 : null,
      // Build = time from entering Testing to shipping on main.
      buildHours: testing != null && main != null ? (main - testing) / 3600000 : null,
      reachedMain: main != null,
      actor: evs[0]?.actor ?? null,
    });
  }
  return out;
}

export interface ActorMetric {
  actor: string;
  shipped: number; // cards reaching main
  avgCycleHours: number | null;
  avgBuildHours: number | null;
}

export function computeActorMetrics(events: ParityEvent[]): ActorMetric[] {
  const timings = [...computeCardTimings(events).values()];
  const byActor = new Map<string, CardTiming[]>();
  for (const t of timings) {
    const a = t.actor ?? "unknown";
    const list = byActor.get(a) ?? [];
    list.push(t);
    byActor.set(a, list);
  }
  const avg = (xs: (number | null)[]) => {
    const v = xs.filter((x): x is number => x != null);
    return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
  };
  return [...byActor.entries()]
    .map(([actor, ts]) => ({
      actor,
      shipped: ts.filter((t) => t.reachedMain).length,
      avgCycleHours: avg(ts.map((t) => t.cycleHours)),
      avgBuildHours: avg(ts.map((t) => t.buildHours)),
    }))
    .sort((a, b) => b.shipped - a.shipped);
}

export interface AndroidLag {
  /** Features where iOS is strictly ahead of Android. */
  behindCount: number;
  /** Average stage gap (iOS rank - Android rank) across mobile features. */
  avgStageGap: number;
  /**
   * Average days iOS reached main before Android did, across features where
   * both shipped. null until at least one Android feature ships.
   */
  avgDaysBehind: number | null;
}

/** How far Android trails iOS, computed live from the card projection + events. */
export function computeAndroidLag(
  cards: ParityCard[],
  events: ParityEvent[],
): AndroidLag {
  const byKey = new Map<string, Partial<Record<Platform, ParityCard>>>();
  for (const c of cards) {
    if (c.platform !== "ios" && c.platform !== "android") continue;
    const key = `${c.repo}:${c.feature_slug}`;
    const entry = byKey.get(key) ?? {};
    entry[c.platform] = c;
    byKey.set(key, entry);
  }

  let behind = 0;
  let gapSum = 0;
  let pairs = 0;
  const mainAt = (cardId: string) => {
    const e = events.find((x) => x.card_id === cardId && x.to_stage === "main");
    return e ? +new Date(e.at) : null;
  };
  const daysBehind: number[] = [];

  for (const { ios, android } of byKey.values()) {
    if (!ios || !android) continue;
    pairs++;
    const gap = stageRank(ios.current_stage) - stageRank(android.current_stage);
    if (gap > 0) behind++;
    gapSum += gap;
    const iMain = mainAt(ios.id);
    const aMain = mainAt(android.id);
    if (iMain != null && aMain != null) daysBehind.push((aMain - iMain) / MS_PER_DAY);
  }

  return {
    behindCount: behind,
    avgStageGap: pairs ? gapSum / pairs : 0,
    avgDaysBehind: daysBehind.length
      ? daysBehind.reduce((s, x) => s + x, 0) / daysBehind.length
      : null,
  };
}

export { STAGE_ORDER };
