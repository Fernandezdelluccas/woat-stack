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

Crianças entram com nome/apelido e PIN de quatro dígitos. O perfil escolar pede turma e um código privado fornecido pelo professor; o cadastro visitante não pede código. O código é validado pelo RPC do Supabase e não há código provisório embutido no site. Se o RPC ainda não estiver configurado, o cadastro escolar é bloqueado. Visitantes não consultam nem pontuam no ranking interno.

Para habilitar o cadastro escolar e o painel docente:

1. Aplique `supabase/schema.sql` no SQL Editor do Supabase.
2. Crie contas de professor no Supabase Auth. Associe cada UUID de usuário à escola e às turmas autorizadas nas tabelas `teacher_accounts` e `teacher_classes`.
3. O professor autorizado cria códigos privados no painel. O site guarda somente o hash SHA-256; o código em texto é exibido uma única vez. Cada código pode ser limitado por quantidade de cadastros e validade, e pode ser revogado.

Exemplo de provisionamento inicial de professor, substituindo o UUID e os nomes:

```sql
insert into public.teacher_accounts (user_id, school_name, display_name)
values ('UUID-DO-USUARIO-AUTH', 'Nome da escola', 'Nome do professor');

insert into public.teacher_classes (teacher_id, turma)
values ('UUID-DO-USUARIO-AUTH', '4º ano');
```

Os perfis, partidas, cosméticos, desafios e conquistas ainda são guardados neste navegador e dispositivo; não há sincronização remota de contas. Pontuações remotas estão fechadas para acesso anônimo até a configuração de autenticação e políticas RLS por aluno/turma. A chave `anon` do Supabase é pública e não deve ser usada como única autorização.
