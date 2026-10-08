create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  turma text not null,
  avatar text,
  email text unique,
  account_type text not null default 'school' check (account_type in ('school', 'outside')),
  created_at timestamptz default now()
);

alter table profiles add column if not exists email text;
alter table profiles add column if not exists account_type text not null default 'school';

create table if not exists game_sessions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  game_key text not null,
  score integer not null default 0 check (score >= 0),
  correct_answers integer not null default 0 check (correct_answers >= 0),
  wrong_answers integer not null default 0 check (wrong_answers >= 0),
  elapsed_seconds integer not null default 0 check (elapsed_seconds >= 0),
  answer_log jsonb not null default '[]'::jsonb,
  created_at timestamptz default now()
);

alter table game_sessions add column if not exists answer_log jsonb not null default '[]'::jsonb;
create index if not exists idx_game_sessions_profile_date on game_sessions(profile_id, created_at desc);
create index if not exists idx_game_sessions_game_date on game_sessions(game_key, created_at desc);

create table if not exists rankings (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  score integer not null default 0 check (score >= 0),
  turma text not null,
  updated_at timestamptz default now()
);

create index if not exists idx_rankings_score on rankings(score desc);
create unique index if not exists idx_rankings_profile_unique on rankings(profile_id) where profile_id is not null;

create table if not exists pontuacoes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  nome_aluno text not null,
  turma text not null,
  professor text not null default '',
  pontos integer not null default 0 check (pontos >= 0),
  updated_at timestamptz not null default now(),
  unique (nome_aluno, turma, professor)
);

create table if not exists respostas (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  nome_aluno text not null,
  turma text not null,
  fase_key text not null,
  correta boolean not null,
  pergunta text,
  resposta text,
  resposta_correta text,
  created_at timestamptz not null default now()
);

create table if not exists progresso_fases (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  nome_aluno text not null,
  turma text not null,
  fase_key text not null,
  nivel_atual integer not null default 1 check (nivel_atual between 1 and 20),
  niveis_concluidos integer not null default 0 check (niveis_concluidos between 0 and 20),
  concluida boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (nome_aluno, turma, fase_key)
);

create table if not exists profile_achievements (
  profile_id uuid not null references profiles(id) on delete cascade,
  achievement_key text not null,
  unlocked_at timestamptz not null default now(),
  primary key (profile_id, achievement_key)
);

create table if not exists profile_customizations (
  profile_id uuid not null references profiles(id) on delete cascade,
  slot text not null check (slot in ('base', 'hair', 'outfit', 'accessory')),
  item_id text not null,
  equipped_at timestamptz not null default now(),
  primary key (profile_id, slot)
);

create table if not exists class_challenges (
  id uuid primary key default gen_random_uuid(),
  teacher_profile_id uuid references profiles(id) on delete set null,
  title text not null check (char_length(title) between 1 and 80),
  game_key text not null check (game_key in ('adicao', 'subtracao', 'multiplicacao', 'divisao', 'formas')),
  turma text not null,
  target integer not null default 5 check (target between 1 and 20),
  created_at timestamptz not null default now()
);

create index if not exists idx_pontuacoes_turma_score on pontuacoes(turma, pontos desc);
create index if not exists idx_pontuacoes_professor_turma on pontuacoes(professor, turma);
create index if not exists idx_respostas_student_date on respostas(turma, nome_aluno, created_at desc);
create index if not exists idx_progresso_fases_student on progresso_fases(nome_aluno, turma, fase_key);
create index if not exists idx_class_challenges_turma on class_challenges(turma, created_at desc);
