create extension if not exists pgcrypto;

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
alter table profiles add column if not exists auth_user_id uuid references auth.users(id) on delete cascade;
create index if not exists idx_profiles_auth_user on profiles(auth_user_id, turma);
create unique index if not exists idx_profiles_auth_identity
  on profiles(auth_user_id, lower(nome), lower(turma))
  where auth_user_id is not null;

create table if not exists profile_state (
  profile_id uuid primary key references profiles(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists teacher_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  school_name text not null,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists teacher_classes (
  teacher_id uuid not null references teacher_accounts(user_id) on delete cascade,
  turma text not null,
  primary key (teacher_id, turma)
);

create table if not exists student_enrollment_permits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  turma text not null,
  expires_at timestamptz not null
);

alter table teacher_accounts enable row level security;
alter table teacher_classes enable row level security;
alter table student_enrollment_permits enable row level security;
revoke all on table teacher_accounts, teacher_classes from anon, authenticated;
revoke all on table student_enrollment_permits from anon, authenticated;
grant select on table teacher_accounts, teacher_classes to authenticated;

drop policy if exists teacher_accounts_read_self on teacher_accounts;
create policy teacher_accounts_read_self on teacher_accounts
  for select to authenticated using (user_id = auth.uid());
drop policy if exists teacher_classes_read_self on teacher_classes;
create policy teacher_classes_read_self on teacher_classes
  for select to authenticated using (teacher_id = auth.uid());

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
alter table game_sessions add column if not exists best_streak integer not null default 0 check (best_streak >= 0);
alter table game_sessions add column if not exists client_session_id text;
alter table game_sessions add column if not exists challenge_id text;
alter table game_sessions add column if not exists challenge_title text;
create index if not exists idx_game_sessions_profile_date on game_sessions(profile_id, created_at desc);
create index if not exists idx_game_sessions_game_date on game_sessions(game_key, created_at desc);
create unique index if not exists idx_game_sessions_client_session on game_sessions(client_session_id) where client_session_id is not null;

create table if not exists rankings (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  score integer not null default 0 check (score >= 0),
  turma text not null,
  account_type text not null default 'school' check (account_type = 'school'),
  updated_at timestamptz default now()
);

alter table rankings add column if not exists account_type text not null default 'school';

create index if not exists idx_rankings_score on rankings(score desc);
create unique index if not exists idx_rankings_profile_unique on rankings(profile_id) where profile_id is not null;

create table if not exists pontuacoes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  nome_aluno text not null,
  turma text not null,
  account_type text not null default 'school' check (account_type = 'school'),
  professor text not null default '',
  pontos integer not null default 0 check (pontos >= 0),
  updated_at timestamptz not null default now(),
  unique (nome_aluno, turma, professor)
);

alter table pontuacoes add column if not exists account_type text not null default 'school';

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
  teacher_user_id uuid references teacher_accounts(user_id) on delete set null,
  local_challenge_id text,
  title text not null check (char_length(title) between 1 and 80),
  game_key text not null check (game_key in ('adicao', 'subtracao', 'multiplicacao', 'divisao', 'formas')),
  turma text not null,
  target integer not null default 2 check (target between 1 and 4),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table class_challenges add column if not exists teacher_user_id uuid references teacher_accounts(user_id) on delete set null;
alter table class_challenges add column if not exists local_challenge_id text;
alter table class_challenges add column if not exists active boolean not null default true;
create unique index if not exists idx_class_challenges_teacher_local on class_challenges(teacher_user_id, local_challenge_id) where local_challenge_id is not null;

alter table profiles enable row level security;
alter table profile_state enable row level security;
alter table game_sessions enable row level security;
alter table respostas enable row level security;
alter table progresso_fases enable row level security;
alter table profile_achievements enable row level security;
alter table profile_customizations enable row level security;
alter table class_challenges enable row level security;
revoke all on table profiles, profile_state, game_sessions, respostas, progresso_fases,
  profile_achievements, profile_customizations, class_challenges
  from anon, authenticated;

grant select, delete on table profiles to authenticated;
drop policy if exists student_profiles_read_own on profiles;
create policy student_profiles_read_own on profiles
  for select to authenticated
  using (auth_user_id = auth.uid() and (auth.jwt() ->> 'is_anonymous') = 'true');
drop policy if exists students_delete_own_profile on profiles;
create policy students_delete_own_profile on profiles
  for delete to authenticated
  using (auth_user_id = auth.uid() and (auth.jwt() ->> 'is_anonymous') = 'true');

create or replace function public.create_student_profile(
  p_nome text,
  p_turma text,
  p_avatar text,
  p_account_type text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  created_profile_id uuid;
  permit_user_id uuid;
begin
  if auth.uid() is null
     or coalesce(auth.jwt() ->> 'is_anonymous', 'false') <> 'true'
     or char_length(btrim(coalesce(p_nome, ''))) not between 1 and 40
     or char_length(btrim(coalesce(p_turma, ''))) not between 1 and 80
      or coalesce(p_account_type, '') not in ('school', 'outside') then
    return null;
  end if;

  if p_account_type = 'school' then
    delete from public.student_enrollment_permits
     where user_id = auth.uid()
       and turma = btrim(p_turma)
       and expires_at > now()
    returning user_id into permit_user_id;
    if permit_user_id is null then return null; end if;
  end if;

  insert into public.profiles (auth_user_id, nome, turma, avatar, account_type)
  values (auth.uid(), btrim(p_nome), btrim(p_turma), coalesce(nullif(btrim(p_avatar), ''), '🦊'), p_account_type)
  returning id into created_profile_id;

  return created_profile_id;
exception when unique_violation then
  return null;
end;
$function$;

revoke all on function public.create_student_profile(text, text, text, text) from public;
grant execute on function public.create_student_profile(text, text, text, text) to authenticated;

drop policy if exists teachers_read_class_profiles on profiles;
create policy teachers_read_class_profiles on profiles
  for select to authenticated
  using (exists (
    select 1 from public.teacher_classes
    where teacher_classes.teacher_id = auth.uid()
      and teacher_classes.turma = profiles.turma
  ));

grant select, insert, update on table profile_state to authenticated;
drop policy if exists students_manage_own_profile_state on profile_state;
create policy students_manage_own_profile_state on profile_state
  for all to authenticated
  using (exists (
    select 1 from public.profiles
    where profiles.id = profile_state.profile_id
      and profiles.auth_user_id = auth.uid()
      and (auth.jwt() ->> 'is_anonymous') = 'true'
  ))
  with check (exists (
    select 1 from public.profiles
    where profiles.id = profile_state.profile_id
      and profiles.auth_user_id = auth.uid()
      and (auth.jwt() ->> 'is_anonymous') = 'true'
  ));
drop policy if exists teachers_read_class_profile_state on profile_state;
create policy teachers_read_class_profile_state on profile_state
  for select to authenticated
  using (exists (
    select 1 from public.profiles
    join public.teacher_classes on teacher_classes.turma = profiles.turma
    where profiles.id = profile_state.profile_id
      and teacher_classes.teacher_id = auth.uid()
  ));

grant select, insert on table game_sessions to authenticated;
drop policy if exists students_read_own_game_sessions on game_sessions;
create policy students_read_own_game_sessions on game_sessions
  for select to authenticated
  using (exists (
    select 1 from profiles
    where profiles.id = game_sessions.profile_id
      and profiles.auth_user_id = auth.uid()
      and profiles.account_type = 'school'
      and (auth.jwt() ->> 'is_anonymous') = 'true'
  ));
drop policy if exists teachers_read_class_game_sessions on game_sessions;
create policy teachers_read_class_game_sessions on game_sessions
  for select to authenticated
  using (exists (
    select 1 from public.profiles
    join public.teacher_classes on teacher_classes.turma = profiles.turma
    where profiles.id = game_sessions.profile_id
      and teacher_classes.teacher_id = auth.uid()
  ));
drop policy if exists students_insert_own_game_sessions on game_sessions;
create policy students_insert_own_game_sessions on game_sessions
  for insert to authenticated
  with check (exists (
    select 1 from profiles
    where profiles.id = game_sessions.profile_id
      and profiles.auth_user_id = auth.uid()
      and (auth.jwt() ->> 'is_anonymous') = 'true'
  ));

grant select, insert, update, delete on table class_challenges to authenticated;
drop policy if exists class_members_read_active_challenges on class_challenges;
create policy class_members_read_active_challenges on class_challenges
  for select to authenticated
  using (
    active and (
      exists (
        select 1 from public.profiles
        where profiles.auth_user_id = auth.uid()
          and profiles.turma = class_challenges.turma
          and (auth.jwt() ->> 'is_anonymous') = 'true'
      )
      or exists (
        select 1 from public.teacher_classes
        where teacher_classes.teacher_id = auth.uid()
          and teacher_classes.turma = class_challenges.turma
      )
    )
  );
drop policy if exists teachers_insert_class_challenges on class_challenges;
create policy teachers_insert_class_challenges on class_challenges
  for insert to authenticated
  with check (
    teacher_user_id = auth.uid()
    and exists (
      select 1 from public.teacher_classes
      where teacher_classes.teacher_id = auth.uid()
        and teacher_classes.turma = class_challenges.turma
    )
  );
drop policy if exists teachers_update_class_challenges on class_challenges;
create policy teachers_update_class_challenges on class_challenges
  for update to authenticated
  using (
    teacher_user_id = auth.uid()
    and exists (
      select 1 from public.teacher_classes
      where teacher_classes.teacher_id = auth.uid()
        and teacher_classes.turma = class_challenges.turma
    )
  )
  with check (
    teacher_user_id = auth.uid()
    and exists (
      select 1 from public.teacher_classes
      where teacher_classes.teacher_id = auth.uid()
        and teacher_classes.turma = class_challenges.turma
    )
  );
drop policy if exists teachers_delete_class_challenges on class_challenges;
create policy teachers_delete_class_challenges on class_challenges
  for delete to authenticated
  using (
    teacher_user_id = auth.uid()
    and exists (
      select 1 from public.teacher_classes
      where teacher_classes.teacher_id = auth.uid()
        and teacher_classes.turma = class_challenges.turma
    )
  );

create or replace function public.get_class_game_ranking(p_turma text)
returns table(profile_id uuid, nome_aluno text, turma text, avatar text, pontos integer, account_type text)
language plpgsql
stable
security definer
set search_path = public
as $function$
begin
  if auth.uid() is null or btrim(coalesce(p_turma, '')) = '' then
    return;
  end if;

  if not (
    exists (
      select 1 from public.profiles
      where auth_user_id = auth.uid()
        and account_type = 'school'
        and turma = btrim(p_turma)
        and (auth.jwt() ->> 'is_anonymous') = 'true'
    )
    or exists (
      select 1 from public.teacher_classes
      where teacher_id = auth.uid() and turma = btrim(p_turma)
    )
  ) then
    return;
  end if;

  return query
    select profiles.id, profiles.nome, profiles.turma, profiles.avatar,
      max(game_sessions.score)::integer, profiles.account_type
    from public.profiles
    join public.game_sessions on game_sessions.profile_id = profiles.id
    where profiles.account_type = 'school'
      and profiles.turma = btrim(p_turma)
    group by profiles.id, profiles.nome, profiles.turma, profiles.avatar, profiles.account_type
    order by max(game_sessions.score) desc, profiles.nome asc
    limit 50;
end;
$function$;

revoke all on function public.get_class_game_ranking(text) from public;
grant execute on function public.get_class_game_ranking(text) to authenticated;

create table if not exists school_access_codes (
  code_hash text primary key,
  school_name text not null,
  turma text not null,
  created_by uuid references teacher_accounts(user_id) on delete set null,
  enabled boolean not null default true,
  max_uses integer not null default 100 check (max_uses > 0),
  used_count integer not null default 0 check (used_count >= 0),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table school_access_codes add column if not exists created_by uuid references teacher_accounts(user_id) on delete set null;

alter table school_access_codes enable row level security;
revoke all on table school_access_codes from anon, authenticated;
grant select on table school_access_codes to authenticated;
drop policy if exists teachers_read_own_access_codes on school_access_codes;
create policy teachers_read_own_access_codes on school_access_codes
  for select to authenticated
  using (
    created_by = auth.uid()
    and exists (
      select 1 from teacher_classes
      where teacher_id = auth.uid() and turma = school_access_codes.turma
    )
  );

create or replace function public.create_school_access_code(
  p_code_hash text,
  p_turma text,
  p_max_uses integer default 100,
  p_expires_at timestamptz default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $function$
declare
  code_created boolean;
begin
  if auth.uid() is null
     or p_code_hash !~ '^[a-f0-9]{64}$'
     or p_max_uses not between 1 and 500
     or not exists (
       select 1 from public.teacher_classes
       where teacher_id = auth.uid() and turma = btrim(p_turma)
     ) then
    return false;
  end if;

  insert into public.school_access_codes (code_hash, school_name, turma, created_by, max_uses, expires_at)
  select p_code_hash, teacher.school_name, btrim(p_turma), auth.uid(), p_max_uses, p_expires_at
    from public.teacher_accounts as teacher
   where teacher.user_id = auth.uid()
  on conflict (code_hash) do nothing
  returning true into code_created;

  return coalesce(code_created, false);
end;
$function$;

create or replace function public.revoke_school_access_code(p_code_hash text, p_turma text)
returns boolean
language plpgsql
security definer
set search_path = public
as $function$
declare
  code_revoked boolean;
begin
  update public.school_access_codes
     set enabled = false
   where code_hash = p_code_hash
     and turma = btrim(p_turma)
     and created_by = auth.uid()
     and exists (
       select 1 from public.teacher_classes
       where teacher_id = auth.uid() and turma = btrim(p_turma)
     )
  returning true into code_revoked;

  return coalesce(code_revoked, false);
end;
$function$;

revoke all on function public.create_school_access_code(text, text, integer, timestamptz) from public;
revoke all on function public.revoke_school_access_code(text, text) from public;
grant execute on function public.create_school_access_code(text, text, integer, timestamptz) to authenticated;
grant execute on function public.revoke_school_access_code(text, text) to authenticated;

create or replace function public.validate_school_access_code(p_code text, p_turma text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $function$
declare
  code_accepted boolean;
begin
  if auth.uid() is null
     or coalesce(auth.jwt() ->> 'is_anonymous', 'false') <> 'true'
     or char_length(btrim(coalesce(p_code, ''))) < 8
     or btrim(coalesce(p_turma, '')) = '' then
    return false;
  end if;

  update public.school_access_codes
     set used_count = used_count + 1
   where code_hash = encode(digest(upper(btrim(p_code)), 'sha256'), 'hex')
     and turma = btrim(p_turma)
     and enabled = true
     and used_count < max_uses
     and (expires_at is null or expires_at > now())
  returning true into code_accepted;

  if not coalesce(code_accepted, false) then
    return false;
  end if;

  insert into public.student_enrollment_permits (user_id, turma, expires_at)
  values (auth.uid(), btrim(p_turma), now() + interval '2 minutes')
  on conflict (user_id) do update
    set turma = excluded.turma,
        expires_at = excluded.expires_at;

  return true;
end;
$function$;

revoke all on function public.validate_school_access_code(text, text) from public;
grant execute on function public.validate_school_access_code(text, text) to anon, authenticated;

alter table rankings enable row level security;
alter table pontuacoes enable row level security;
revoke all on table rankings, pontuacoes from anon, authenticated;

create index if not exists idx_pontuacoes_turma_score on pontuacoes(turma, pontos desc);
create index if not exists idx_pontuacoes_professor_turma on pontuacoes(professor, turma);
create index if not exists idx_respostas_student_date on respostas(turma, nome_aluno, created_at desc);
create index if not exists idx_progresso_fases_student on progresso_fases(nome_aluno, turma, fase_key);
create index if not exists idx_class_challenges_turma on class_challenges(turma, created_at desc);
