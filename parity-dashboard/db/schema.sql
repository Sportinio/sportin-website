-- Parity board — event-sourced state (Neon Postgres).
--
-- Two tables:
--   parity_cards   one row per feature x platform (iOS feature auto-spawns an
--                  Android replica). Holds the *current* projection.
--   parity_events  append-only log of lane transitions. This is the source of
--                  truth for all time analytics (time-in-lane, cycle time,
--                  build time, per-developer attribution).
--
-- Stages: backlog -> dev -> testing -> main
--   (no "build" lane in v1 — added once an EAS/CI/release-tag signal exists)

create table if not exists parity_cards (
  id            text primary key,                 -- "${repo}:${slug}:${platform}"
  repo          text not null,
  feature_slug  text not null,
  platform      text not null,                    -- ios | android | web
  title         text not null,
  current_stage text not null default 'backlog',  -- backlog | dev | testing | main
  is_lead       boolean not null default false,   -- iOS leads on mobile
  pr_url        text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (repo, feature_slug, platform)
);

create table if not exists parity_events (
  id         bigserial primary key,
  card_id    text not null references parity_cards(id) on delete cascade,
  from_stage text,
  to_stage   text not null,
  at         timestamptz not null,               -- when the transition happened (git timestamp)
  source     text not null default 'github',     -- github | manual
  actor      text,                               -- PR/commit author (Vlad attribution)
  pr_url     text,
  pr_number  integer,
  created_at timestamptz not null default now()
);

create index if not exists parity_events_card_idx on parity_events (card_id, at);
create index if not exists parity_cards_repo_idx   on parity_cards (repo, platform);
