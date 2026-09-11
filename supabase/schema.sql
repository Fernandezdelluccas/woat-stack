-- GÊNIOS DO JOGO — script de banco (Supabase)
--
-- Como usar: abra o painel do Supabase do projeto -> SQL Editor -> cole este
-- arquivo inteiro -> Run. Pode rodar mais de uma vez sem problema (idempotente).
--
-- O que ele faz:
--   1) Transforma "pontuacoes" numa pontuação ACUMULADA por aluno (hoje o app
--      insere uma linha nova a cada partida; aqui juntamos tudo numa linha só
--      por aluno+turma e passamos a somar em vez de duplicar).
--   2) Cria a função somar_pontos(), chamada pelo app a cada resposta certa,
--      pra pontuação/ranking atualizarem na hora.
--   3) Cria as tabelas novas "progresso_fases" (em que nível/fase cada aluno
--      está) e "respostas" (log de cada pergunta respondida, usado pelo
--      painel do professor).
--   4) Liga o Realtime nas tabelas usadas pelo ranking e pelo progresso.
--
-- Segurança: as políticas abaixo liberam leitura/escrita para a chave anônima
-- (anon), do mesmo jeito que a tabela "pontuacoes" já funciona hoje no app
-- (não existe login real de aluno). Isso é aceitável para o protótipo atual,
-- mas não deve ser usado assim se o projeto crescer além de uma sala de aula.

-- 1) Deduplicar "pontuacoes": soma tudo por (nome_aluno, turma) numa linha só.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'pontuacoes' and column_name = 'id'
  ) then
    with somas as (
      select nome_aluno, turma, sum(pontos) as total
      from pontuacoes
      group by nome_aluno, turma
    ),
    manter as (
      select distinct on (nome_aluno, turma) id, nome_aluno, turma
      from pontuacoes
      order by nome_aluno, turma, id
    )
    update pontuacoes p
    set pontos = s.total
    from manter m
    join somas s on s.nome_aluno = m.nome_aluno and s.turma = m.turma
    where p.id = m.id;

    delete from pontuacoes p
    where not exists (select 1 from manter m where m.id = p.id);
  end if;
end $$;

create unique index if not exists pontuacoes_aluno_turma_uidx
  on pontuacoes (nome_aluno, turma);

-- 2) Função chamada pelo app a cada resposta certa (soma pontos na hora).
create or replace function public.somar_pontos(p_nome text, p_turma text, p_delta integer)
returns void
language plpgsql
security definer
as $$
begin
  insert into pontuacoes (nome_aluno, turma, pontos)
  values (p_nome, p_turma, greatest(p_delta, 0))
  on conflict (nome_aluno, turma)
  do update set pontos = pontuacoes.pontos + excluded.pontos;
end;
$$;

grant execute on function public.somar_pontos(text, text, integer) to anon;

-- 3) Progresso do aluno em cada fase (nível atual, níveis concluídos).
create table if not exists progresso_fases (
  id bigint generated always as identity primary key,
  nome_aluno text not null,
  turma text not null,
  fase_key text not null,
  nivel_atual integer not null default 1,
  niveis_concluidos integer not null default 0,
  concluida boolean not null default false,
  atualizado_em timestamptz not null default now(),
  unique (nome_aluno, turma, fase_key)
);

alter table progresso_fases enable row level security;

drop policy if exists "progresso_fases_select_anon" on progresso_fases;
create policy "progresso_fases_select_anon" on progresso_fases
  for select using (true);

drop policy if exists "progresso_fases_insert_anon" on progresso_fases;
create policy "progresso_fases_insert_anon" on progresso_fases
  for insert with check (true);

drop policy if exists "progresso_fases_update_anon" on progresso_fases;
create policy "progresso_fases_update_anon" on progresso_fases
  for update using (true);

-- 4) Log de cada resposta (usado pelo painel do professor).
create table if not exists respostas (
  id bigint generated always as identity primary key,
  nome_aluno text not null,
  turma text not null,
  fase_key text not null,
  nivel integer not null,
  correta boolean not null,
  pergunta text,
  resposta_dada text,
  resposta_correta text,
  criado_em timestamptz not null default now()
);

alter table respostas enable row level security;

drop policy if exists "respostas_select_anon" on respostas;
create policy "respostas_select_anon" on respostas
  for select using (true);

drop policy if exists "respostas_insert_anon" on respostas;
create policy "respostas_insert_anon" on respostas
  for insert with check (true);

-- 5) Realtime: ranking e progresso atualizam sozinhos no app.
do $$
begin
  begin
    alter publication supabase_realtime add table pontuacoes;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table progresso_fases;
  exception when duplicate_object then null;
  end;
end $$;
