create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  turma text not null,
  avatar text,
  created_at timestamptz default now()
);

create table if not exists game_sessions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  game_key text not null,
  score integer not null default 0,
  correct_answers integer not null default 0,
  wrong_answers integer not null default 0,
  elapsed_seconds integer not null default 0,
  created_at timestamptz default now()
);

create table if not exists rankings (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  score integer not null default 0,
  turma text not null,
  updated_at timestamptz default now()
);

create index if not exists idx_rankings_score on rankings(score desc);
