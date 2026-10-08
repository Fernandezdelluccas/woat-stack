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

Crianças entram com nome/apelido e PIN de quatro dígitos. O perfil escolar também exige turma e um código privado emitido pelo professor; esse código é validado no Supabase antes de criar o perfil. Sem o schema e a função RPC, o cadastro escolar falha fechado. Visitantes não pedem turma e não consultam nem pontuam no ranking interno.

Para habilitar o cadastro escolar:

1. Aplique `supabase/schema.sql` no SQL Editor do Supabase.
2. Gere um código aleatório longo por turma e execute, substituindo os valores:

```sql
insert into public.school_access_codes (code_hash, school_name, turma)
values (
  encode(digest(upper('CODIGO-SECRETO-LONGO-DA-TURMA'), 'sha256'), 'hex'),
  'Nome da escola',
  '4º ano'
);
```

3. Entregue o código somente aos alunos daquela turma. Cada código permite até 100 cadastros e pode ser desativado na tabela `school_access_codes`.

Os perfis, partidas, cosméticos, desafios e conquistas ainda são guardados neste navegador e dispositivo; não há sincronização remota de contas. Pontuações remotas estão fechadas para acesso anônimo até a configuração de autenticação e políticas RLS por aluno/turma. A chave `anon` do Supabase é pública e não deve ser usada como única autorização.
