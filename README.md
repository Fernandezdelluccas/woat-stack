# Gênios do Jogo

Plataforma estática de atividades de matemática em HTML, CSS e JavaScript.

## Executar localmente

```bash
npm install
npm start
```

Abra `http://localhost:3000`. Para rodar os testes:

```bash
npm test
```

## Publicar no Vercel

Use a raiz do repositório como Root Directory, Framework Preset `Other` e deixe Build Command e Output Directory vazios.

## Acesso escolar e visitante

Crianças entram com nome/apelido e PIN de quatro dígitos. O perfil escolar pede turma e um código privado fornecido pela diretoria; o cadastro visitante não pede código. O código é validado pelo RPC do Supabase e não há código provisório embutido no site. Visitantes não consultam nem pontuam no ranking da escola.

Para habilitar o cadastro escolar, sincronização do jogo e painel docente:

1. Anonymous Sign-Ins está habilitado neste projeto e é usado para vincular o perfil local a uma identidade Supabase sem e-mail.
2. Reaplique o conteúdo completo e atualizado de `supabase/schema.sql` no SQL Editor do projeto `vvcdxxcdhmetfvdtwkpq`. O banco já tem `profile_state`, mas ainda precisa da correção do RPC `get_class_game_ranking`, da tabela `school_directors` e do suporte a Frações nas missões.
3. Crie contas no Supabase Auth: a da diretoria entra em `school_directors`; as docentes entram em `teacher_accounts` e `teacher_classes` (turmas autorizadas).
4. Somente a diretoria cria e revoga códigos de cadastro, pelo painel "Diretoria" da tela inicial (a sessão dela fica só em memória e não afeta o perfil do aluno). Códigos são guardados somente como hash; partidas concluídas sincronizam com `game_sessions`, o estado do perfil com `profile_state` e missões com `class_challenges`. O ranking é agregado das partidas e as missões ficam visíveis apenas à turma autorizada.

Exemplo de provisionamento da diretoria, substituindo o UUID e os nomes:

```sql
insert into public.school_directors (user_id, school_name, display_name)
values ('UUID-DO-USUARIO-AUTH', 'Nome da escola', 'Nome da diretora');
```

Exemplo de provisionamento de professor, substituindo o UUID e os nomes:

```sql
insert into public.teacher_accounts (user_id, school_name, display_name)
values ('UUID-DO-USUARIO-AUTH', 'Nome da escola', 'Nome do professor');

insert into public.teacher_classes (teacher_id, turma)
values ('UUID-DO-USUARIO-AUTH', '4º ano');
```

As telas mantêm uma cópia local e tentam sincronizar sessões, ranking, missões, preferências, cosméticos, conquistas e relatos quando o Auth/RLS está disponível. O quadro e o desenho de rascunho permanecem locais. A identidade anônima é vinculada ao navegador e não recupera automaticamente o perfil em outro aparelho. As sessões do professor e do aluno usam armazenamentos separados. Professores que entraram antes dessa separação precisam entrar novamente uma vez. A pontuação é calculada no cliente e não deve ser tratada como inviolável para competição ou recompensa de valor real. A chave publicável fica no cliente; nunca coloque uma chave `secret`/`service_role` no navegador.

**Limitação importante:** as permissões e o ranking ainda identificam turmas pelo ano, sem separar escolas. Não utilize o mesmo banco para várias escolas até que o isolamento por escola e a migração dos perfis existentes sejam implementados e validados.

## Área do professor (cadastro e login reais)

1. Reaplique `supabase/schema.sql` no SQL Editor do Supabase (cria `teacher_invite_codes`, `create_teacher_invite_code` e `register_teacher`).
2. A diretoria entra no painel de códigos (página inicial) e usa **Convidar professor(a)** para gerar um código `PROF-…` com turmas, número de usos e validade.
3. O professor abre `professor.html`, escolhe **Criar conta**, informa nome, e-mail, senha e o código. Se a confirmação de e-mail estiver ativa, ele confirma pelo link recebido e conclui o cadastro informando nome e código.
4. A sessão fica salva no navegador (Supabase Auth); ao voltar, o painel abre direto. Use **Sair** para encerrar.
5. Em Supabase → Authentication → URL Configuration, permita `<origem do site>/professor.html` e `<origem do site>/professor.html?recuperacao=1` como Redirect URLs. Configure o envio de e-mails no Supabase e teste os links de confirmação e recuperação no domínio publicado.

O professor pode recuperar a senha pelo link **Esqueci minha senha**. Missões publicadas são carregadas do Supabase; missões que não puderam ser publicadas permanecem no navegador para nova tentativa. O provisionamento manual via SQL em `teacher_accounts`/`teacher_classes` continua possível.
