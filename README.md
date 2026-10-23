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

Crianças entram com nome/apelido e PIN de quatro dígitos. O perfil escolar pede turma e um código privado fornecido pelo professor; o cadastro visitante não pede código. O código é validado pelo RPC do Supabase e não há código provisório embutido no site. Visitantes não consultam nem pontuam no ranking da escola.

Para habilitar o cadastro escolar, sincronização do jogo e painel docente:

1. Anonymous Sign-Ins está habilitado neste projeto e é usado para vincular o perfil local a uma identidade Supabase sem e-mail.
2. Reaplique o conteúdo completo e atualizado de `supabase/schema.sql` no SQL Editor do projeto `vvcdxxcdhmetfvdtwkpq`. A versão anterior executada ainda não continha `profile_state` nem o RPC `get_class_game_ranking`.
3. Crie contas docentes no Supabase Auth e associe cada UUID às turmas autorizadas em `teacher_accounts` e `teacher_classes`.
4. O docente autorizado cria códigos privados e missões no painel. Códigos são guardados somente como hash; partidas concluídas sincronizam com `game_sessions`, o estado do perfil com `profile_state` e missões com `class_challenges`. O ranking é agregado das partidas e as missões ficam visíveis apenas à turma autorizada.

Exemplo de provisionamento inicial de professor, substituindo o UUID e os nomes:

```sql
insert into public.teacher_accounts (user_id, school_name, display_name)
values ('UUID-DO-USUARIO-AUTH', 'Nome da escola', 'Nome do professor');

insert into public.teacher_classes (teacher_id, turma)
values ('UUID-DO-USUARIO-AUTH', '4º ano');
```

As telas mantêm uma cópia local e tentam sincronizar sessões, ranking, missões, preferências, cosméticos, conquistas e relatos quando o Auth/RLS está disponível. O quadro e o desenho de rascunho permanecem locais. A identidade anônima é vinculada ao navegador e não recupera automaticamente o perfil em outro aparelho. A pontuação é calculada no cliente e não deve ser tratada como inviolável para competição ou recompensa de valor real. A chave publicável fica no cliente; nunca coloque uma chave `secret`/`service_role` no navegador.
