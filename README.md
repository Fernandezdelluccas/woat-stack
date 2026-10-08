# Gênios do Jogo

Plataforma estática de atividades de matemática em HTML, CSS e JavaScript.

## Executar localmente

```bash
npm install
npm start
```

Abra `http://localhost:3000`. Para rodar a suíte de testes:

```bash
npm test
```

## Publicar no Vercel

Use a raiz do repositório como Root Directory, Framework Preset `Other` e deixe Build Command e Output Directory vazios. O projeto não precisa de etapa de build.

## Dados e autenticação

Os perfis, pontuações, sessões, desafios, cosméticos e conquistas ficam no `localStorage` deste navegador e dispositivo. As opções “Da escola” e “De fora” separam os tipos de perfil na interface, mas não verificam domínio escolar e não sincronizam contas entre dispositivos.

O arquivo `supabase/schema.sql` prepara tabelas para perfis, sessões, respostas, pontuações e progresso. Para persistência remota real, aplique o schema no Supabase, conecte o cliente nas páginas e configure Supabase Auth e políticas RLS antes de permitir gravações públicas. A chave `anon` do cliente não substitui autenticação nem autorização.