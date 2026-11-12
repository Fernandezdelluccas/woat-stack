import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { buildQuestions, GAME_TYPES, getGradeFromClassroom } from '../js/game.mjs';

function createApp(initialData = {}, validSchoolCode = 'CODIGO-DE-TESTE', sharedStorage = null, withSupabase = true, supabaseClientOverride = null) {
  const storage = sharedStorage || new Map(Object.entries(initialData));
  const localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
  };
  const window = withSupabase ? {
    teacherSupabaseClient: supabaseClientOverride,
    supabaseClient: supabaseClientOverride || {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        signInAnonymously: async () => ({ data: { user: { id: 'anonymous-test', is_anonymous: true } }, error: null }),
      },
      rpc: async (functionName, args) => ({
        data: functionName === 'validate_school_access_code' && args.p_code === validSchoolCode,
        error: null,
      }),
    },
  } : {};
  const source = fs.readFileSync(new URL('../js/app-state.js', import.meta.url), 'utf8');
  vm.runInNewContext(source, { window, localStorage, TextEncoder, Date, Math, JSON, Array });
  return window.GeniosApp;
}

function hashPassword(password) {
  let hash = 2166136261;
  for (const byte of new TextEncoder().encode(password.trim())) {
    hash ^= byte;
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

test('perfis escolares e externos têm login e dados separados', async () => {
  const app = createApp();
  assert.equal((await app.authorizeSchoolEnrollment({ code: 'CODIGO-DE-TESTE', turma: '4º ano' })).ok, true);
  const school = app.registerUser({ nome: 'Aluna', password: '2580', turma: '4º ano', accountType: 'school' });
  const outside = app.registerUser({ nome: 'Visitante', password: '1357', turma: 'Visitante', accountType: 'outside' });
  assert.equal(school.ok, true);
  assert.equal(outside.ok, true);
  assert.equal(app.loginUser({ nome: 'Aluna', turma: '4º ano', password: '2580', accountType: 'outside' }).ok, false);
  assert.equal(app.loginUser({ nome: 'Aluna', turma: '4º ano', password: '2580', accountType: 'school' }).ok, true);

  app.setUnlockedCosmetics(['starter', 'base-cat']);
  app.unlockAchievement('first-game');
  app.saveGameSession({ gameKey: 'adicao', points: 48, acertos: 4, erros: 0, seconds: 82, bestStreak: 4 });

  assert.equal(app.loginUser({ nome: 'Visitante', password: '1357', accountType: 'outside' }).ok, true);
  assert.deepEqual(Array.from(app.getUnlockedCosmetics()), ['starter']);
  assert.deepEqual(Array.from(app.getAchievements()), []);
  assert.equal(app.getGameHistory().length, 0);

  assert.equal(app.loginUser({ nome: 'Aluna', turma: '4º ano', password: '2580', accountType: 'school' }).ok, true);
  assert.deepEqual(Array.from(app.getUnlockedCosmetics()), ['starter', 'base-cat']);
  assert.equal(app.getGameHistory().length, 1);
});

test('perfil legado sem tipo continua entrando como conta escolar', () => {
  const profile = {
    nome: 'Perfil antigo',
    email: 'antigo@aluno.local',
    passwordHash: hashPassword('senha123'),
    turma: '4º ano',
    avatar: '🦊',
  };
  const app = createApp({ 'genios-player': JSON.stringify(profile) });
  assert.equal(app.loginUser({ email: profile.email, password: 'senha123', accountType: 'school' }).ok, true);
});

test('sair da conta mantém o perfil e o progresso para o próximo acesso', () => {
  const storage = new Map();
  const app = createApp({}, 'CODIGO-DE-TESTE', storage);
  assert.equal(app.registerUser({ nome: 'Visitante', password: '7531', accountType: 'outside' }).ok, true);
  app.saveGameSession({ gameKey: 'adicao', points: 36, acertos: 3, erros: 0, seconds: 80 });

  app.logoutUser();

  assert.equal(app.getPlayer(), null);
  assert.equal(storage.has('genios-session'), false);
  assert.equal(storage.has('genios-accounts'), true);
  assert.equal(app.loginUser({ nome: 'Visitante', password: '7531', accountType: 'outside' }).ok, true);
  assert.equal(app.getGameHistory().length, 1);
});

test('desafios criados pelo professor ficam disponíveis só para os alunos da turma', () => {
  const storage = new Map();
  const teacherApp = createApp({}, 'CODIGO-DE-TESTE', storage);
  const created = teacherApp.createChallenge({
    title: 'Missão das tabuadas',
    game: 'multiplicacao',
    target: 3,
    turma: '4º ano',
  });

  const studentApp = createApp({}, 'CODIGO-DE-TESTE', storage);
  assert.equal(created.ok, true);
  assert.deepEqual(Array.from(studentApp.getChallenges('4º ano'), (item) => item.title), ['Missão das tabuadas']);
  assert.deepEqual(Array.from(studentApp.getChallenges('5º ano')), []);
  assert.equal(studentApp.getChallenges('4º ano')[0].target, 3);
  assert.equal(teacherApp.createChallenge({ title: 'Sem turma' }).ok, false);
});

test('painel publica missão para turma e catálogo do aluno inicia jogo com meta', () => {
  const teacher = fs.readFileSync(new URL('../professor.html', import.meta.url), 'utf8');
  const student = fs.readFileSync(new URL('../matematica.html', import.meta.url), 'utf8');
  const game = fs.readFileSync(new URL('../js/game-runner.js', import.meta.url), 'utf8');
  assert.ok(teacher.includes('id="challengeClass"'));
  assert.ok(teacher.includes("turma: document.getElementById('challengeClass').value"));
  assert.ok(teacher.includes('result.challenge.turma'));
  assert.ok(student.includes('getChallenges(player.turma)'));
  assert.ok(student.includes('jogo.html?${params.toString()}'));
  assert.ok(student.includes("goal: String(challenge.target)"));
  assert.ok(game.includes("searchParams.get('goal')"));
  assert.ok(game.includes('challengeId'));
});

test('missão remota é publicada pelo professor e listada ao aluno autenticado da turma', async () => {
  let remoteChallenge;
  const teacherClient = {
    auth: { getSession: async () => ({ data: { session: { user: { id: 'teacher-1', is_anonymous: false } } }, error: null }) },
    from(table) {
      assert.equal(table, 'class_challenges');
      return {
        insert(row) {
          remoteChallenge = { ...row, id: 'remote-challenge-1', created_at: new Date().toISOString() };
          return { select() { return this; }, single: async () => ({ data: { id: remoteChallenge.id }, error: null }) };
        },
      };
    },
  };
  const teacherApp = createApp({}, 'CODIGO-DE-TESTE', new Map(), true, teacherClient);
  const created = teacherApp.createChallenge({ title: 'Tabuada', game: 'multiplicacao', target: 3, turma: '4º ano' });
  const published = await teacherApp.publishClassChallenge(created.challenge);
  assert.equal(published.ok, true);
  assert.equal(remoteChallenge.teacher_user_id, 'teacher-1');
  assert.equal(remoteChallenge.target, 3);

  const studentClient = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      signInAnonymously: async () => ({ data: { user: { id: 'student-1', is_anonymous: true } }, error: null }),
    },
    rpc: async (name, args) => {
      assert.equal(name, 'create_student_profile');
      assert.equal(args.p_turma, '4º ano');
      return { data: 'student-profile-1', error: null };
    },
    from(table) {
      if (table === 'profiles') {
        return {
          select() { return this; },
          eq() { return this; },
          maybeSingle: async () => ({ data: null, error: null }),
        };
      }
      assert.equal(table, 'class_challenges');
      return {
        select() { return this; },
        eq() { return this; },
        order: async () => ({ data: [remoteChallenge], error: null }),
      };
    },
  };
  const studentApp = createApp({}, 'CODIGO-DE-TESTE', new Map(), true, studentClient);
  await studentApp.authorizeLocalSchoolEnrollment({ turma: '4º ano' });
  studentApp.registerUser({ nome: 'Bia', password: '1234', turma: '4º ano', accountType: 'school' });
  const listed = await studentApp.getRemoteClassChallenges('4º ano');
  assert.equal(listed.ok, true);
  assert.equal(listed.challenges[0].title, 'Tabuada');
  assert.equal(listed.challenges[0].target, 3);
});

test('aluno tem saída de conta e botão visível para voltar dos jogos', () => {
  const materials = fs.readFileSync(new URL('../materias.html', import.meta.url), 'utf8');
  const game = fs.readFileSync(new URL('../jogo.html', import.meta.url), 'utf8');
  assert.ok(materials.includes('id="playerLogoutButton"'));
  assert.ok(materials.includes('window.GeniosApp.logoutUser()'));
  assert.ok(materials.includes('Excluir meu perfil'));
  assert.ok(game.includes('class="btn btn--primary game-back-button"'));
  assert.ok(game.includes('← Voltar aos jogos'));
  assert.ok(game.includes('id="exitPausedGameButton"'));
  assert.ok(game.includes('href="matematica.html" class="btn btn--ghost game-pause-exit"'));
});

test('cadastro de criança exige código da escola e PIN de quatro dígitos', async () => {
  const app = createApp();
  assert.equal(app.registerUser({ nome: 'Bia', password: '12x4', turma: '3º ano', accountType: 'school' }).ok, false);
  assert.equal((await app.authorizeSchoolEnrollment({ code: 'ERRADO', turma: '3º ano' })).ok, false);
  assert.equal(app.registerUser({ nome: 'Bia', password: '2468', turma: '3º ano', accountType: 'school' }).ok, false);
  assert.equal((await app.authorizeSchoolEnrollment({ code: 'CODIGO-DE-TESTE', turma: '3º ano' })).ok, true);
  assert.equal(app.registerUser({ nome: 'Bia', password: '2468', turma: '3º ano', accountType: 'school' }).ok, true);
  assert.equal((await app.authorizeSchoolEnrollment({ code: 'CODIGO-DE-TESTE', turma: '3º ano' })).ok, true);
  assert.equal(app.registerUser({ nome: 'Bia', password: '9753', turma: '3º ano', accountType: 'school' }).ok, false);
  assert.equal(app.loginUser({ nome: 'Bia', turma: '3º ano', password: '2468', accountType: 'school' }).ok, true);
  assert.equal(app.loginUser({ nome: 'Bia', turma: '3º ano', password: '1111', accountType: 'school' }).ok, false);
});

test('código privado do professor habilita escola e o PIN do aluno sobrevive a recarga', async () => {
  const storage = new Map();
  const firstVisit = createApp({}, 'CODIGO-DE-TESTE', storage);
  assert.equal((await firstVisit.authorizeSchoolEnrollment({ code: 'CODIGO-DE-TESTE', turma: '5º ano' })).ok, true);
  const registered = firstVisit.registerUser({ nome: 'Pedro', password: '4826', turma: '5º ano', accountType: 'school' });
  assert.equal(registered.ok, true);
  const visitor = firstVisit.registerUser({ nome: 'Convidada', password: '7391', accountType: 'outside' });
  assert.equal(visitor.ok, true);

  const reloadedApp = createApp({}, 'CODIGO-DE-TESTE', storage);
  assert.equal(reloadedApp.loginUser({ nome: 'Pedro', turma: '5º ano', password: '4826', accountType: 'school' }).ok, true);
  assert.equal(reloadedApp.getPlayer().nome, 'Pedro');
  assert.equal(reloadedApp.loginUser({ nome: 'Convidada', password: '7391', accountType: 'outside' }).ok, true);
  assert.equal(reloadedApp.getPlayer().accountType, 'outside');
});

test('perfil pode ser exportado, restaurado e excluído sem remover dados de outros perfis', async () => {
  const originalStorage = new Map();
  const app = createApp({}, 'CODIGO-DE-TESTE', originalStorage);
  await app.authorizeSchoolEnrollment({ code: 'CODIGO-DE-TESTE', turma: '4º ano' });
  const student = app.registerUser({ nome: 'Lia', password: '7531', turma: '4º ano', accountType: 'school' });
  app.saveGameSession({ gameKey: 'adicao', points: 36, acertos: 3, erros: 0, seconds: 80 });
  app.saveGameDraft({ gameKey: 'adicao', questions: [], index: 0 });
  app.saveGamePreferences('adicao', { goalTarget: 3, untimed: true });
  const backup = app.exportActiveProfile();
  assert.equal(backup.ok, true);

  const secondStorage = new Map();
  const restoredApp = createApp({}, 'CODIGO-DE-TESTE', secondStorage);
  assert.equal(restoredApp.importProfileBackup(backup.backup).ok, true);
  assert.equal(restoredApp.loginUser({ nome: 'Lia', turma: '4º ano', password: '7531', accountType: 'school' }).ok, true);
  assert.equal(restoredApp.getGameHistory().length, 1);
  assert.equal((await restoredApp.deleteActiveProfile()).ok, true);
  assert.equal(restoredApp.getPlayer(), null);
  assert.equal(secondStorage.has('genios-game-draft:lia%40aluno.local'), false);
  assert.equal(secondStorage.has('genios-game-preferences:lia%40aluno.local'), false);
  assert.equal(student.ok, true);
});

test('relatório de questão valida campos e fica salvo no perfil ativo', () => {
  const app = createApp();
  const guest = app.registerUser({ nome: 'Visitante', password: '7531', accountType: 'outside' });
  assert.equal(guest.ok, true);
  assert.equal(app.loginUser({ nome: 'Visitante', password: '7531', accountType: 'outside' }).ok, true);
  assert.equal(app.saveQuestionReport({ gameKey: 'adicao', prompt: '2 + 2?' }).ok, false);
  assert.equal(app.saveQuestionReport({ gameKey: 'adicao', prompt: '2 + 2?', reason: 'Enunciado confuso' }).ok, true);
  assert.equal(app.exportActiveProfile().backup.scopedData['genios-question-reports'].length, 1);
});

test('login explica perfil inexistente separadamente de PIN incorreto', async () => {
  const app = createApp();
  assert.equal(app.loginUser({ nome: 'Pedro', turma: '5º ano', password: '4826', accountType: 'school' }).code, 'PROFILE_NOT_FOUND');
  await app.authorizeSchoolEnrollment({ code: 'CODIGO-DE-TESTE', turma: '5º ano' });
  assert.equal(app.registerUser({ nome: 'Pedro', password: '4826', turma: '5º ano', accountType: 'school' }).ok, true);
  assert.equal(app.loginUser({ nome: 'Pedro', turma: '5º ano', password: '1111', accountType: 'school' }).code, 'INVALID_PIN');
});

test('entrada usa versão nova do módulo de login para descartar cache antigo', () => {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.ok(html.includes('js/app-state.js?v=23'));
});

test('ajuda de acesso explica criação e entrada e destaca caminhos alternativos', () => {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const styles = fs.readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
  assert.match(html, /<details class="login-help">/);
  assert.ok(html.includes('Toque em <strong>Já tenho perfil</strong>'));
  assert.ok(html.includes('Toque em <strong>Primeiro acesso</strong>'));
  assert.ok(html.includes('código fornecido pela diretoria'));
  assert.ok(html.includes('Acessar a área do professor'));
  assert.ok(html.includes('Abrir modo de teste local'));
  assert.ok(styles.includes('.login-help__step'));
  assert.ok(styles.includes('.login-support__item'));
});

test('página inicial prioriza retomar a partida e recolhe recursos secundários', () => {
  const html = fs.readFileSync(new URL('../materias.html', import.meta.url), 'utf8');
  const styles = fs.readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
  assert.ok(html.includes('id="continueGameCard"'));
  assert.ok(html.includes('getGameDraft?.()'));
  assert.ok(html.includes('Retomar partida'));
  assert.ok(html.includes('lastSession.gameKey'));
  assert.equal((html.match(/<details class="dashboard-extra">/g) || []).length, 4);
  assert.ok(styles.includes('.continue-card'));
  const inlineScripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(inlineScripts.length, 1);
  assert.doesNotThrow(() => new Function(inlineScripts[0][1]));
});

test('jogos novos começam sem cronômetro e mantêm a preferência escolhida', () => {
  const app = createApp();
  assert.equal(app.getGamePreferences('adicao').untimed, true);
  app.saveGamePreferences('adicao', { goalTarget: 2, untimed: false });
  assert.equal(app.getGamePreferences('adicao').untimed, false);

  const game = fs.readFileSync(new URL('../jogo.html', import.meta.url), 'utf8');
  const runner = fs.readFileSync(new URL('../js/game-runner.js', import.meta.url), 'utf8');
  assert.match(game, /id="untimedMode" checked/);
  assert.ok(runner.includes('{ goalTarget: 2, untimed: true }'));
  assert.ok(runner.includes("['speed-run', !state.untimed && state.seconds <= 120]"));
});

test('cadastro escolar falha fechado sem Supabase e não aceita código legado', async () => {
  const app = createApp({}, 'CODIGO-DE-TESTE', null, false);
  assert.equal((await app.authorizeSchoolEnrollment({ code: 'ESCOLA2026', turma: '4º ano' })).ok, false);
  assert.equal((await app.authorizeSchoolEnrollment({ code: 'CODIGO-DE-TESTE', turma: '4º ano' })).ok, false);
  assert.equal(Object.hasOwn(app, 'provisionalSchoolCode'), false);
});

test('modo local permite testar perfis escolares sem RPC e sem código compartilhado', () => {
  const app = createApp({}, 'CODIGO-DE-TESTE', null, false);
  const authorization = app.authorizeLocalSchoolEnrollment({ turma: '4º ano' });
  assert.equal(authorization.ok, true);
  assert.equal(authorization.local, true);
  assert.equal(app.registerUser({ nome: 'Aluno local', password: '4826', turma: '4º ano', accountType: 'school' }).ok, true);
  assert.equal(app.authorizeLocalSchoolEnrollment({ turma: '' }).ok, false);
});

test('perfis do modo local nunca são enviados ao Supabase', async () => {
  const app = createApp();
  const profile = app.registerUser({ nome: 'Demo local', password: '4826', accountType: 'outside' });
  app.setPlayer({ ...profile.profile, localOnly: true });
  const result = await app.syncActiveProfile();
  assert.equal(result.ok, false);
  assert.equal(result.localOnly, true);
});

test('sessões pendentes são sincronizadas com o perfil remoto e ficam idempotentes', async () => {
  const profiles = [];
  const sessions = [];
  let profileState;
  const supabaseClient = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      signInAnonymously: async () => ({ data: { user: { id: 'anonymous-1', is_anonymous: true } }, error: null }),
    },
    rpc: async (name, args) => {
      assert.equal(name, 'create_student_profile');
      const profile = { auth_user_id: 'anonymous-1', nome: args.p_nome, turma: args.p_turma, id: 'profile-1' };
      profiles.push(profile);
      return { data: profile.id, error: null };
    },
    from(table) {
      if (table === 'profiles') {
        const filters = {};
        return {
          select() { return this; },
          eq(key, value) { filters[key] = value; return this; },
          maybeSingle: async () => ({ data: profiles.find((profile) => Object.entries(filters).every(([key, value]) => profile[key] === value)) || null, error: null }),
        };
      }
      if (table === 'profile_state') {
        return { upsert: async (row) => { profileState = row; return { error: null }; } };
      }
      assert.equal(table, 'game_sessions');
      return { insert: async (session) => { sessions.push(session); return { error: null }; } };
    },
  };
  const app = createApp({}, 'CODIGO-DE-TESTE', null, true, supabaseClient);
  const player = app.registerUser({ nome: 'Nina', password: '4826', accountType: 'outside' });
  const history = app.saveGameSession({
    gameKey: 'adicao', points: 36, acertos: 3, erros: 1, seconds: 75, bestStreak: 2,
    answers: [{ prompt: '2 + 2?', answer: '4', correctAnswer: '4', correct: true }],
    challengeId: 'challenge-local-1', challengeTitle: 'Missão da turma',
  });
  app.saveGamePreferences('adicao', { goalTarget: 3, untimed: true });
  app.unlockAchievement('first-game');

  const result = await app.syncPendingGameSessions();
  const stateResult = await app.syncProfileState();

  assert.equal(player.ok, true);
  assert.equal(result.ok, true);
  assert.equal(result.synced, 1);
  assert.equal(stateResult.ok, true);
  assert.equal(profiles[0].auth_user_id, 'anonymous-1');
  assert.equal(sessions[0].profile_id, profiles[0].id);
  assert.equal(sessions[0].client_session_id, history.at(-1).id);
  assert.equal(sessions[0].challenge_id, 'challenge-local-1');
  assert.equal(profileState.profile_id, profiles[0].id);
  assert.equal(profileState.payload.state['genios-game-preferences'].adicao.goalTarget, 3);
  assert.ok(profileState.payload.state['genios-achievements'].includes('first-game'));
  assert.ok(app.getGameHistory()[0].syncedAt);
});

test('falha do Auth anônimo mantém a partida local e pendente', async () => {
  const app = createApp({}, 'CODIGO-DE-TESTE', null, true, {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      signInAnonymously: async () => ({ data: null, error: { message: 'anonymous provider disabled' } }),
    },
  });
  assert.equal(app.registerUser({ nome: 'Kai', password: '4826', accountType: 'outside' }).ok, true);
  app.saveGameSession({ gameKey: 'adicao', points: 12, acertos: 1, erros: 0, seconds: 30 });

  const result = await app.syncPendingGameSessions();

  assert.equal(result.ok, false);
  assert.equal(result.localOnly, true);
  assert.equal(result.pending, 1);
  assert.equal(app.getGameHistory().length, 1);
  assert.equal(app.getGameHistory()[0].syncedAt, undefined);
});

test('ranking local aceita somente escolares ativos e compartilha apenas com a turma', async () => {
  const app = createApp();
  await app.authorizeSchoolEnrollment({ code: 'CODIGO-DE-TESTE', turma: '4º ano' });
  const school = app.registerUser({ nome: 'Aluna A', password: '2580', turma: '4º ano', accountType: 'school' });
  await app.authorizeSchoolEnrollment({ code: 'CODIGO-DE-TESTE', turma: '4º ano' });
  const classmate = app.registerUser({ nome: 'Aluno B', password: '1357', turma: '4º ano', accountType: 'school' });
  const guest = app.registerUser({ nome: 'Visitante', password: '2468', accountType: 'outside' });

  app.loginUser({ nome: 'Aluna A', turma: '4º ano', password: '2580', accountType: 'school' });
  app.upsertScore(school.profile, { points: 80 });
  app.loginUser({ nome: 'Aluno B', turma: '4º ano', password: '1357', accountType: 'school' });
  app.upsertScore(classmate.profile, { points: 70 });
  assert.equal(app.getRanking().length, 2);

  app.loginUser({ nome: 'Visitante', password: '2468', accountType: 'outside' });
  assert.deepEqual(Array.from(app.getRanking()), []);
  assert.deepEqual(Array.from(app.upsertScore(guest.profile, { points: 9999 })), []);
  app.loginUser({ nome: 'Aluna A', turma: '4º ano', password: '2580', accountType: 'school' });
  assert.deepEqual(app.getRanking().map((entry) => entry.name), ['Aluna A', 'Aluno B']);
});

test('ranking remoto só consulta a turma do aluno escolar autenticado', async () => {
  let queriedClass = '';
  const supabaseClient = {
    auth: {
      getSession: async () => ({ data: { session: { user: { id: 'anonymous-1', is_anonymous: true } } }, error: null }),
      signInAnonymously: async () => ({ data: { user: { id: 'anonymous-1', is_anonymous: true } }, error: null }),
    },
    from(table) {
      assert.equal(table, 'profiles');
      const filters = {};
      return {
        select() { return this; },
        eq(key, value) { filters[key] = value; return this; },
        maybeSingle: async () => ({ data: { id: 'profile-1', ...filters }, error: null }),
      };
    },
    rpc: async (name, args) => {
      if (name === 'validate_school_access_code') return { data: true, error: null };
      assert.equal(name, 'get_class_game_ranking');
      queriedClass = args.p_turma;
      return { data: [{ profile_id: 'profile-1', nome_aluno: 'Bia', turma: '4º ano', pontos: 48 }], error: null };
    },
  };
  const app = createApp({}, 'CODIGO-DE-TESTE', null, true, supabaseClient);
  await app.authorizeSchoolEnrollment({ code: 'CODIGO-DE-TESTE', turma: '4º ano' });
  app.registerUser({ nome: 'Bia', password: '1234', turma: '4º ano', accountType: 'school' });

  const ranking = await app.getRemoteClassRanking('4º ano');
  const denied = await app.getRemoteClassRanking('5º ano');
  assert.equal(ranking.ok, true);
  assert.equal(ranking.ranking[0].pontos, 48);
  assert.equal(queriedClass, '4º ano');
  assert.equal(denied.ok, false);
  assert.equal(queriedClass, '4º ano');
});

test('cada operação gera exemplos práticos e contextos variados', () => {
  for (const gameKey of Object.keys(GAME_TYPES)) {
    const questions = buildQuestions(gameKey, 7);
    assert.equal(questions.length, 7);
    assert.equal(new Set(questions.map((question) => question.prompt)).size, 7);
    for (const question of questions) {
      assert.ok(question.example.startsWith('Exemplo prático:'));
      assert.ok(question.options.some((option) => String(option) === String(question.correctAnswer)));
    }
  }
});

test('Frações gera quatro alternativas próprias e fica disponível em jogo e missões', () => {
  const questions = buildQuestions('fracoes', 10);
  for (const question of questions) {
    assert.equal(question.options.length, 4);
    assert.equal(new Set(question.options).size, 4);
    assert.ok(question.options.includes(question.correctAnswer));
    const [numerator, denominator] = question.correctAnswer.split('/').map(Number);
    assert.ok(numerator > 0 && numerator < denominator);
    assert.ok(denominator >= 2 && denominator <= 10);
  }
  const math = fs.readFileSync(new URL('../matematica.html', import.meta.url), 'utf8');
  const teacher = fs.readFileSync(new URL('../professor.html', import.meta.url), 'utf8');
  const appState = fs.readFileSync(new URL('../js/app-state.js', import.meta.url), 'utf8');
  const schema = fs.readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8');
  assert.ok(math.includes('jogo.html?game=fracoes'));
  assert.ok(teacher.includes('<option value="fracoes">Frações</option>'));
  assert.ok(appState.includes("'formas', 'fracoes'"));
  assert.ok(schema.includes("'formas', 'fracoes'"));
});

test('todos os minijogos respeitam o limite de conteúdo da série escolhida', () => {
  const rules = {
    1: { total: 20, factor: 3, divisor: 3, quotient: 4, fraction: 4, shapes: ['Círculo', 'Triângulo', 'Quadrado'] },
    2: { total: 100, factor: 5, divisor: 5, quotient: 6, fraction: 6, shapes: ['Círculo', 'Triângulo', 'Quadrado', 'Retângulo'] },
    3: { total: 1000, factor: 9, divisor: 9, quotient: 10, fraction: 8, shapes: ['Círculo', 'Triângulo', 'Quadrado', 'Retângulo', 'Pentágono'] },
    4: { total: 10000, factor: 10, divisor: 10, quotient: 10, fraction: 10, shapes: ['Círculo', 'Triângulo', 'Quadrado', 'Retângulo', 'Pentágono', 'Hexágono'] },
    5: { total: 100000, factor: 12, divisor: 12, quotient: 12, fraction: 12, shapes: ['Círculo', 'Triângulo', 'Quadrado', 'Retângulo', 'Pentágono', 'Hexágono'] },
  };
  for (const grade of [1, 2, 3, 4, 5]) {
    for (const gameKey of Object.keys(GAME_TYPES)) {
      const questions = buildQuestions(gameKey, 40, { grade });
      assert.ok(questions.every((question) => question.grade === grade), `${gameKey}: série não propagada`);
      for (const question of questions) {
        if (gameKey === 'adicao' || gameKey === 'subtracao') {
          assert.ok(question.correctAnswer <= rules[grade].total, `${gameKey}: excedeu o limite da série ${grade}`);
        }
        if (gameKey === 'multiplicacao') {
          assert.ok(question.correctAnswer <= rules[grade].factor ** 2, `multiplicação excedeu a série ${grade}`);
        }
        if (gameKey === 'divisao') {
          const divisor = Number(question.prompt.match(/em (\d+) grupos/)?.[1]);
          assert.ok(divisor <= rules[grade].divisor, `divisor excedeu a série ${grade}`);
          assert.ok(question.correctAnswer <= rules[grade].quotient, `quociente excedeu a série ${grade}`);
        }
        if (gameKey === 'fracoes') {
          const denominator = Number(question.correctAnswer.split('/')[1]);
          assert.ok(denominator <= rules[grade].fraction, `fração excedeu a série ${grade}`);
        }
        if (gameKey === 'formas') {
          assert.ok(rules[grade].shapes.includes(question.correctAnswer), `forma não ensinada na série ${grade}`);
          if (question.correctAnswer === 'Círculo') assert.ok(!question.visual.groups.includes('0 lados'));
        }
      }
    }
  }
  assert.deepEqual([1, 2, 3, 4, 5].map((grade) => getGradeFromClassroom(`${grade}º ano`)), [1, 2, 3, 4, 5]);
  assert.equal(getGradeFromClassroom('Visitante'), 4);
  assert.equal(getGradeFromClassroom('8º ano'), 4);

  const runner = fs.readFileSync(new URL('../js/game-runner.js', import.meta.url), 'utf8');
  const html = fs.readFileSync(new URL('../jogo.html', import.meta.url), 'utf8');
  assert.ok(runner.includes('grade: schoolGrade'));
  assert.ok(runner.includes('Conteúdo até o ${schoolGrade}º ano'));
  assert.ok(html.includes('js/game-runner.js?v=20'));
});

test('scripts inline de todas as páginas compilam e perfis não entram em innerHTML', () => {
  const pages = fs.readdirSync(new URL('..', import.meta.url)).filter((file) => file.endsWith('.html'));
  for (const page of pages) {
    const html = fs.readFileSync(new URL(`../${page}`, import.meta.url), 'utf8');
    for (const [, script] of html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)) {
      assert.doesNotThrow(() => new Function(script), `${page} contém script inline inválido`);
    }
  }
  for (const [file, selector] of [['jogo.html', 'userChip'], ['matematica.html', 'userChip'], ['materias.html', 'userChip'], ['js/nav.js', 'chip']]) {
    const source = fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    assert.ok(!source.includes(`${selector}.innerHTML`), `${file} não deve interpretar nome de perfil como HTML`);
  }
});

test('personalização não oferece roupas e mantém conquistas ampliadas', () => {
  const app = createApp();
  assert.equal(app.characterCatalog.some((item) => item.category === 'roupa'), false);
  const materials = fs.readFileSync(new URL('../materias.html', import.meta.url), 'utf8');
  assert.equal(materials.includes('data-category="roupa"'), false);
  assert.equal(materials.includes('characterOutfit'), false);
  for (const id of ['first-game', 'five-games', 'all-subjects', 'perfect-game', 'streak-master', 'speed-run']) {
    assert.ok(app.achievementCatalog.some((achievement) => achievement.id === id));
  }
});

test('pet da loja levita suavemente e respeita movimento reduzido', () => {
  const html = fs.readFileSync(new URL('../materias.html', import.meta.url), 'utf8');
  const css = fs.readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
  assert.ok(html.includes('class="character-preview__float"'));
  assert.ok(css.includes('@keyframes studioPetFloat'));
  assert.ok(css.includes('@keyframes studioPetShadow'));
  assert.ok(css.includes('.character-preview__float,\n  .character-preview::after'));
});

test('pergunta e mascote ficam lado a lado em telas largas e empilham no celular', () => {
  const html = fs.readFileSync(new URL('../jogo.html', import.meta.url), 'utf8');
  const css = fs.readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
  assert.ok(html.includes('class="game-companion"'));
  assert.ok(html.includes('class="question-content"'));
  assert.ok(css.includes('"question companion"'));
  assert.ok(css.includes('grid-area: settings;'));
  assert.ok(css.includes('font-size: clamp(6rem, 12vw, 8rem)'));
  assert.ok(css.includes('@media (max-width: 680px)'));
  assert.ok(css.includes('font-size: clamp(5rem, 18vw, 7rem)'));
  assert.equal(css.includes('.game-companion {\n  position: absolute'), false);
});

test('exemplo prático visual tem ícone e grupos ampliados que podem quebrar linha', () => {
  const css = fs.readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
  assert.ok(css.includes('grid-template-areas: "icon groups" "caption caption"'));
  assert.ok(css.includes('min-height: 154px'));
  assert.ok(css.includes('font-size: 3.1rem'));
  assert.ok(css.includes('overflow-wrap: anywhere'));
  assert.ok(css.includes('white-space: normal'));
});

test('login do professor exige Auth e papel docente, e retorna à página interna de origem', async () => {
  const professorHtml = fs.readFileSync(new URL('../professor.html', import.meta.url), 'utf8');
  assert.ok(!professorHtml.includes('123456') && !professorHtml.includes('Acesso provisório:'), 'não deve expor senha docente de demonstração');
  class Element {
    constructor() { this.style = {}; this.value = ''; this.handlers = {}; this.hidden = false; this.textContent = ''; this.classList = { toggle() {} }; }
    setAttribute() {}
    addEventListener(type, handler) { this.handlers[type] = handler; }
    reset() { this.value = ''; }
  }

  const ids = ['loginSection', 'dashboardSection', 'professorLoginForm', 'professorEmail', 'professorPassword', 'loginError', 'logoutProfessor', 'cancelProfessorLogin', 'teacherNavigation', 'teacherAuthTitle', 'teacherAuthIntro', 'teacherModeSwitch', 'teacherModeLogin', 'teacherModeRegister', 'teacherNameField', 'teacherName', 'teacherEmailField', 'teacherPasswordField', 'teacherCodeField', 'teacherInviteCode', 'teacherAuthHint', 'teacherAuthSubmit', 'loginNotice', 'teacherWelcome'];
  const elements = Object.fromEntries(ids.map((id) => [id, new Element()]));
  elements.loginSection.style.display = 'block';
  elements.dashboardSection.style.display = 'none';
  elements.teacherNavigation.hidden = true;
  elements.teacherNavigation.style.display = 'none';
  const brand = { href: 'index.html' };
  const documentEvents = {};
  const document = {
    referrer: 'https://jogo.example/materias.html#avatar-store',
    getElementById: (id) => elements[id] || null,
    querySelector: () => brand,
    dispatchEvent: (event) => { documentEvents[event.type] = event; },
  };
  const storage = new Map([['genios-professor-auth', 'false']]);
  const localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
  };
  let redirect = '';
  let teacherAllowed = true;
  let teacherLookupFails = false;
  let loginFailure = null;
  let signOutCount = 0;
  let studentSignOutCount = 0;
  const window = {
    location: { origin: 'https://jogo.example', pathname: '/professor.html', replace: (path) => { redirect = path; } },
    supabaseClient: { auth: {
      getSession: async () => ({ data: { session: { user: { id: 'student', is_anonymous: true } } }, error: null }),
      signOut: async () => { studentSignOutCount += 1; return { error: null }; },
    } },
    teacherSupabaseClient: {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        signInWithPassword: async ({ email, password }) => loginFailure
          ? { data: { user: null }, error: loginFailure }
          : ({
          data: email === 'docente@escola.test' && password === 'segredo' ? { user: { id: 'teacher-1' } } : { user: null },
          error: email === 'docente@escola.test' && password === 'segredo' ? null : { message: 'invalid credentials' },
          }),
        signOut: async () => { signOutCount += 1; return { error: null }; },
      },
      from(table) {
        assert.equal(table, 'teacher_accounts');
        const query = {
          select() { return query; },
          eq() { return query; },
          maybeSingle: async () => ({
            data: teacherAllowed && !teacherLookupFails ? { user_id: 'teacher-1' } : null,
            error: teacherLookupFails ? { message: 'database unavailable' } : null,
          }),
        };
        return query;
      },
    },
    GeniosApp: {
      setTeacherSession: (value) => localStorage.setItem('genios-professor-auth', value),
      isTeacherLoggedIn: () => localStorage.getItem('genios-professor-auth') === 'true',
    },
  };
  const source = fs.readFileSync(new URL('../js/professor-auth.js', import.meta.url), 'utf8');
  vm.runInNewContext(source, { window, document, localStorage, URL, CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options?.detail; } } });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(elements.teacherNavigation.hidden, true);
  assert.equal(elements.teacherNavigation.style.display, 'none');
  assert.equal(brand.href, '/materias.html#avatar-store');
  elements.cancelProfessorLogin.handlers.click();
  assert.equal(redirect, '/materias.html#avatar-store');
  redirect = '';
  elements.loginSection.handlers.keydown({ key: 'Escape', preventDefault() {} });
  assert.equal(redirect, '/materias.html#avatar-store');

  elements.professorEmail.value = 'docente@escola.test';
  elements.professorPassword.value = 'segredo';
  await elements.professorLoginForm.handlers.submit({ preventDefault() {} });

  assert.equal(elements.teacherNavigation.hidden, false);
  assert.equal(elements.dashboardSection.style.display, 'block');
  assert.ok(documentEvents['professor:login']);

  await elements.logoutProfessor.handlers.click();
  assert.equal(localStorage.getItem('genios-professor-auth'), 'false');
  assert.equal(studentSignOutCount, 0);
  assert.equal(redirect, 'index.html');

  teacherAllowed = false;
  await elements.professorLoginForm.handlers.submit({ preventDefault() {} });
  assert.equal(elements.dashboardSection.style.display, 'none');
  assert.equal(signOutCount, 1, 'conta sem papel docente segue para concluir cadastro sem sair');
  assert.equal(elements.teacherAuthSubmit.textContent.length > 0, true);

  elements.teacherModeLogin.handlers.click();
  teacherLookupFails = true;
  await elements.professorLoginForm.handlers.submit({ preventDefault() {} });
  assert.match(elements.loginError.textContent, /Não foi possível verificar sua autorização/);

  elements.teacherModeLogin.handlers.click();
  loginFailure = { status: 503, message: 'Auth service unavailable' };
  await elements.professorLoginForm.handlers.submit({ preventDefault() {} });
  assert.match(elements.loginError.textContent, /Não foi possível conectar ao serviço de autenticação/);
});

test('painel docente local abre sem Auth remoto e sai para cadastro local de aluno', async () => {
  class Element {
    constructor() { this.style = {}; this.handlers = {}; this.hidden = false; this.value = ''; this.classList = { toggle() {} }; }
    setAttribute() {}
    addEventListener(type, handler) { this.handlers[type] = handler; }
    reset() {}
  }
  const ids = ['loginSection', 'dashboardSection', 'professorLoginForm', 'professorEmail', 'professorPassword', 'loginError', 'logoutProfessor', 'cancelProfessorLogin', 'teacherNavigation', 'localTeacherNotice', 'teacherWelcome', 'teacherAuthTitle', 'teacherAuthIntro', 'teacherModeSwitch', 'teacherModeLogin', 'teacherModeRegister', 'teacherNameField', 'teacherName', 'teacherEmailField', 'teacherPasswordField', 'teacherCodeField', 'teacherInviteCode', 'teacherAuthHint', 'teacherAuthSubmit', 'loginNotice'];
  const elements = Object.fromEntries(ids.map((id) => [id, new Element()]));
  let redirect = '';
  let remoteCalls = 0;
  let professorLoginEvents = 0;
  const document = {
    referrer: '',
    getElementById: (id) => elements[id] || null,
    querySelector: () => ({ href: '' }),
    dispatchEvent: (event) => { if (event.type === 'professor:login') professorLoginEvents += 1; },
  };
  const storage = new Map();
  const localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
  };
  const window = {
    location: { search: '?modo=local', origin: 'https://jogo.example', pathname: '/professor.html', replace: (path) => { redirect = path; } },
    teacherSupabaseClient: { auth: { getSession: async () => { remoteCalls += 1; return { data: { session: null } }; }, signOut: async () => { remoteCalls += 1; } } },
    GeniosApp: { setTeacherSession: (value) => localStorage.setItem('genios-professor-auth', value) },
  };
  const source = fs.readFileSync(new URL('../js/professor-auth.js', import.meta.url), 'utf8');
  vm.runInNewContext(source, { window, document, localStorage, URL, CustomEvent: class { constructor(type) { this.type = type; } } });
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(elements.loginSection.style.display, 'none');
  assert.equal(elements.dashboardSection.style.display, 'block');
  assert.equal(elements.localTeacherNotice.hidden, false);
  assert.equal(remoteCalls, 0);
  assert.equal(professorLoginEvents, 0);
  await elements.logoutProfessor.handlers.click();
  assert.equal(redirect, 'index.html?modo=local');
  assert.equal(remoteCalls, 0);
});

test('sessões do aluno e do professor usam armazenamento independente', async () => {
  const clients = [];
  const window = {
    supabase: {
      createClient(url, key, options = {}) {
        const client = { options, session: null };
        clients.push(client);
        return client;
      },
    },
  };
  const source = fs.readFileSync(new URL('../js/supabaseClient.js', import.meta.url), 'utf8');
  vm.runInNewContext(source, { window, console });
  assert.notEqual(window.supabaseClient, window.teacherSupabaseClient);
  assert.equal(window.supabaseClient.options.auth.detectSessionInUrl, false);
  assert.equal(window.teacherSupabaseClient.options.auth.storageKey, 'genios-teacher-session');
  window.supabaseClient.session = { user: { id: 'student', is_anonymous: true } };
  window.teacherSupabaseClient.session = { user: { id: 'teacher' } };
  window.teacherSupabaseClient.session = null;
  assert.equal(window.supabaseClient.session.user.id, 'student');
  assert.equal(clients.length, 2);
});

test('sessão docente antiga é encerrada apenas no cliente antigo e solicita novo login', async () => {
  class Element {
    constructor() { this.style = {}; this.value = ''; this.handlers = {}; this.hidden = false; this.classList = { toggle() {} }; }
    addEventListener(type, handler) { this.handlers[type] = handler; }
    setAttribute() {}
    reset() {}
  }
  const ids = ['loginSection', 'dashboardSection', 'professorLoginForm', 'professorEmail', 'professorPassword', 'loginError', 'logoutProfessor', 'cancelProfessorLogin', 'teacherNavigation', 'teacherAuthTitle', 'teacherAuthIntro', 'teacherModeSwitch', 'teacherModeLogin', 'teacherModeRegister', 'teacherNameField', 'teacherName', 'teacherEmailField', 'teacherPasswordField', 'teacherCodeField', 'teacherInviteCode', 'teacherAuthHint', 'teacherAuthSubmit', 'loginNotice', 'teacherWelcome'];
  const elements = Object.fromEntries(ids.map((id) => [id, new Element()]));
  const user = { id: 'teacher-1', is_anonymous: false };
  const session = { user, access_token: 'access', refresh_token: 'refresh' };
  let clearedScope;
  const teacherClient = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
    },
    from: () => ({
      select() { return this; },
      eq() { return this; },
      maybeSingle: async () => ({ data: { user_id: user.id, display_name: 'Professora' }, error: null }),
    }),
  };
  const document = {
    referrer: '',
    getElementById: (id) => elements[id] || null,
    querySelector: () => null,
    dispatchEvent() {},
  };
  const window = {
    location: { search: '', origin: 'https://jogo.example', pathname: '/professor.html' },
    teacherSupabaseClient: teacherClient,
    supabaseClient: { auth: {
      getSession: async () => ({ data: { session }, error: null }),
      signOut: async (options) => { clearedScope = options.scope; return { error: null }; },
    } },
    GeniosApp: { setTeacherSession() {} },
  };
  const source = fs.readFileSync(new URL('../js/professor-auth.js', import.meta.url), 'utf8');
  vm.runInNewContext(source, { window, document, URL, CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options?.detail; } } });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(clearedScope, 'local');
  assert.equal(elements.dashboardSection.style.display, 'none');
  assert.match(elements.loginNotice.textContent, /entre novamente/);
});

test('relatório docente filtra turmas e minijogos, atualiza métricas e exporta CSV', async () => {
  class Element {
    constructor(text = '', value = '') { this.textContent = text; this.value = value; this.children = []; this.handlers = {}; this.hidden = false; this.disabled = false; }
    addEventListener(type, handler) { this.handlers[type] = handler; }
    append(...items) { this.children.push(...items); }
    appendChild(item) { this.children.push(item); }
    add(item) { this.children.push(item); }
    replaceChildren(...items) { this.children = items; }
    click() { this.handlers.click?.(); this.wasClicked = true; }
  }
  const ids = ['teacherReportPanel', 'teacherReportFeedback', 'teacherReportRows', 'teacherQuestionReports', 'reportGameSummary', 'reportStudentCount', 'reportSessionCount', 'reportAccuracy', 'reportClassFilter', 'reportGameFilter', 'reportStudentFilter', 'reportStartDate', 'reportEndDate', 'refreshTeacherReport', 'exportTeacherReport', 'challengeClass', 'challengeSubmit', 'challengeFeedback'];
  const elements = Object.fromEntries(ids.map((id) => [id, new Element()]));
  elements.reportClassFilter.value = '';
  elements.reportGameFilter.value = '';
  const classes = [{ turma: '4º ano' }, { turma: '5º ano' }];
  const students = [{ id: 'p1', nome: 'Ana', turma: '4º ano' }, { id: 'p2', nome: '=Bia', turma: '5º ano' }];
  const sessions = [
    { profile_id: 'p1', game_key: 'adicao', score: 12, correct_answers: 3, wrong_answers: 1, elapsed_seconds: 60, created_at: '2026-01-10T12:00:00Z' },
    { profile_id: 'p2', game_key: 'fracoes', score: 20, correct_answers: 2, wrong_answers: 0, elapsed_seconds: 90, created_at: '2026-02-10T12:00:00Z' },
  ];
  const states = [];
  const reportCalls = {};
  const resolved = { teacher_classes: classes, profiles: students, profile_state: states };
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'teacher-1' } }, error: null }) },
    from(table) {
      reportCalls[table] = (reportCalls[table] || 0) + 1;
      const query = {
        select() { return this; },
        eq() { return this; },
        in() { return this; },
        order() { return this; },
        range: async () => ({ data: table === 'game_sessions' ? sessions : resolved[table] || [], error: null }),
        then(resolve, reject) { return Promise.resolve({ data: resolved[table] || [], error: null }).then(resolve, reject); },
      };
      return query;
    },
  };
  const listeners = {};
  let exportedBlob;
  let exportedLink;
  const document = {
    getElementById: (id) => elements[id] || null,
    createElement: (tag) => {
      const element = new Element();
      element.tagName = tag;
      if (tag === 'a') exportedLink = element;
      return element;
    },
    addEventListener(type, handler) { (listeners[type] ||= []).push(handler); },
  };
  const window = { location: { search: '' }, teacherSupabaseClient: client };
  const urlApi = { createObjectURL: (blob) => { exportedBlob = blob; return 'blob:report'; }, revokeObjectURL() {} };
  const Option = class extends Element { constructor(text, value) { super(text, value); } };
  const source = fs.readFileSync(new URL('../js/professor-dashboard.js', import.meta.url), 'utf8');
  vm.runInNewContext(source, { window, document, localStorage: { getItem: () => null }, Option, URL: urlApi, Blob, Date, Map, Set, String, Number });

  await Promise.all(listeners['professor:login'].map((handler) => handler({ detail: { userId: 'teacher-1' } })));
  assert.equal(elements.reportStudentCount.textContent, '2');
  assert.equal(elements.reportSessionCount.textContent, '2');
  assert.equal(elements.reportAccuracy.textContent, '83%');
  assert.match(elements.reportGameSummary.children[0].textContent, /Adição: 75% de acertos · 1 erro/);
  assert.equal(elements.reportStudentFilter.children.length, 3);
  assert.equal(elements.challengeClass.disabled, false);
  assert.deepEqual(elements.challengeClass.children.map((option) => option.value), ['', '4º ano', '5º ano']);

  elements.reportClassFilter.value = '5º ano';
  await elements.reportClassFilter.handlers.change();
  elements.reportGameFilter.value = 'fracoes';
  await elements.reportGameFilter.handlers.change();
  assert.equal(elements.reportStudentCount.textContent, '1');
  assert.equal(elements.reportSessionCount.textContent, '1');
  assert.equal(elements.teacherReportRows.children[0].children[0].textContent, '=Bia');

  elements.exportTeacherReport.handlers.click();
  assert.equal(exportedLink.download.startsWith('relatorio-turma-'), true);
  assert.match(await exportedBlob.text(), /"'=Bia";"5º ano";"Frações"/);
  elements.reportClassFilter.value = '';
  elements.reportGameFilter.value = '';
  elements.reportStudentFilter.value = 'p1';
  elements.reportStartDate.value = '2026-01-01';
  elements.reportEndDate.value = '2026-01-31';
  elements.reportStudentFilter.handlers.change();
  assert.equal(elements.reportStudentCount.textContent, '1');
  assert.equal(elements.reportSessionCount.textContent, '1');
  assert.equal(elements.teacherReportRows.children[0].children[0].textContent, 'Ana');
  elements.reportStartDate.value = '2026-02-01';
  elements.reportStartDate.handlers.change();
  assert.match(elements.teacherReportFeedback.textContent, /data inicial/);
  assert.equal(elements.exportTeacherReport.disabled, true);
  await elements.refreshTeacherReport.handlers.click();
  assert.equal(reportCalls.teacher_classes, 3);
});

test('login infantil exige código apenas ao cadastrar perfil escolar e nunca mostra e-mail', () => {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  for (const marker of ['data-account-type="school"', 'data-account-type="outside"', 'data-auth-mode="login"', 'data-auth-mode="register"', 'id="loginFeedback"', 'autocomplete="nickname"', 'inputmode="numeric"', 'id="schoolCodeField"', 'authorizeSchoolEnrollment', 'supabase-js@2']) {
    assert.ok(html.includes(marker), `controle ausente: ${marker}`);
  }
  assert.ok(!html.includes('ESCOLA2026'), 'não deve publicar código escolar compartilhado');
  assert.ok(!html.includes('professor@escola.com') && !html.includes('123456'), 'não deve expor credenciais docentes de demonstração');
  assert.ok(!html.includes('id="email"'), 'a tela infantil não deve pedir e-mail');
  assert.ok(!html.includes('emailInput'), 'o controlador da tela não deve ler e-mail');
  assert.ok(html.includes('if (!localDemo) await window.GeniosApp.hydrateProfileState?.()'));
  const inlineScripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(inlineScripts.length, 1);
  assert.doesNotThrow(() => new Function(inlineScripts[0][1]));
});

test('gestão do perfil expõe exportação, restauração e exclusão confirmada', () => {
  const html = fs.readFileSync(new URL('../materias.html', import.meta.url), 'utf8');
  for (const marker of ['id="exportProfileButton"', 'id="importProfileInput"', 'id="deleteProfileButton"', 'exportActiveProfile()', 'importProfileBackup(backup)', 'deleteActiveProfile()', 'window.confirm']) {
    assert.ok(html.includes(marker), `controle de perfil ausente: ${marker}`);
  }
});

test('jogo expõe atalho de teclado e progresso da fase para tecnologia assistiva', () => {
  const html = fs.readFileSync(new URL('../jogo.html', import.meta.url), 'utf8');
  const runner = fs.readFileSync(new URL('../js/game-runner.js', import.meta.url), 'utf8');
  assert.ok(html.includes('href="#questionPrompt"'));
  assert.ok(html.includes('role="progressbar"'));
  assert.ok(html.includes('aria-valuenow="0"'));
  assert.ok(runner.includes("setAttribute('aria-valuenow', String(Math.round(percent)))"));
});

test('pausa do jogo bloqueia o fundo e mantém o foco dentro do diálogo', () => {
  const runner = fs.readFileSync(new URL('../js/game-runner.js', import.meta.url), 'utf8');
  assert.ok(runner.includes('setPauseBackgroundInert(true)'));
  assert.ok(runner.includes('setPauseBackgroundInert(false)'));
  assert.ok(runner.includes("pauseOverlay.addEventListener('keydown'"));
  assert.ok(runner.includes('event.shiftKey && document.activeElement === first'));
  assert.ok(runner.includes('!event.shiftKey && document.activeElement === last'));
  assert.ok(runner.includes('resumeGameButton.focus()'));
  assert.ok(runner.includes('pauseGameButton.focus()'));
  assert.equal(runner.includes('questionCard.inert'), false);
});

test('feedback de erro informa a alternativa escolhida e a resposta correta', () => {
  const runner = fs.readFileSync(new URL('../js/game-runner.js', import.meta.url), 'utf8');
  assert.ok(runner.includes('Você escolheu ${formatAnswer(selectedValue)}. A resposta correta é ${formatAnswer(correctValue)}.'));
  assert.ok(runner.includes('Tente usar essa ideia na próxima questão.'));
  assert.ok(runner.includes('Muito bem! A resposta é ${formatAnswer(correctValue)}.'));
});

test('Vercel deixa arquivos estáticos passarem e reescreve somente a entrada', () => {
  const config = JSON.parse(fs.readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  assert.deepEqual(config.builds, [
    { src: '*.html', use: '@vercel/static' },
    { src: 'css/**', use: '@vercel/static' },
    { src: 'js/**', use: '@vercel/static' },
    { src: 'img/**', use: '@vercel/static' },
    { src: 'assets/**', use: '@vercel/static' },
  ]);
  assert.deepEqual(config.routes, [
    { src: '/', dest: '/index.html' },
    { src: '/index', dest: '/index.html' },
    { handle: 'filesystem' },
  ]);
});

test('códigos escolares e tabelas de ranking têm proteção server-side no schema', () => {
  const schema = fs.readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8');
  for (const marker of [
    'school_access_codes',
    'validate_school_access_code',
    'security definer',
    'alter table school_access_codes enable row level security',
    'alter table pontuacoes enable row level security',
    'revoke all on table rankings, pontuacoes from anon, authenticated',
  ]) {
    assert.ok(schema.toLowerCase().includes(marker.toLowerCase()), `proteção ausente: ${marker}`);
  }
  const rankingFunction = schema.match(/function public\.get_class_game_ranking\(p_turma text\)[\s\S]*?\$function\$;/)?.[0] || '';
  assert.ok(rankingFunction.includes('profiles.account_type'));
  assert.ok(!rankingFunction.match(/\band\s+account_type\s*=/i));
  assert.ok(schema.includes('create table if not exists school_directors'));
  assert.ok(schema.includes('directors_read_school_access_codes'));
  assert.ok(schema.includes('public.school_directors'));
  assert.ok(schema.includes("'formas', 'fracoes'"));
});

test('dados de jogo e perfis ficam negados por padrão até definir políticas por usuário', () => {
  const schema = fs.readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8').toLowerCase();
  for (const table of ['profiles', 'game_sessions', 'respostas', 'progresso_fases', 'profile_achievements', 'profile_customizations', 'class_challenges']) {
    assert.ok(schema.includes(`alter table ${table} enable row level security`), `RLS ausente em ${table}`);
  }
  assert.ok(schema.includes('revoke all on table profiles, profile_state, game_sessions, respostas, progresso_fases'));
  assert.ok(schema.includes('create policy students_read_own_game_sessions'));
  assert.ok(schema.includes('create policy students_insert_own_game_sessions'));
  assert.ok(schema.includes('create policy class_members_read_active_challenges'));
  assert.ok(schema.includes('create policy teachers_insert_class_challenges'));
  assert.ok(schema.includes('create policy teachers_read_class_profiles'));
  assert.ok(schema.includes('create policy teachers_read_class_game_sessions'));
  assert.ok(schema.includes('auth_user_id = auth.uid()'));
  assert.ok(schema.includes('student_enrollment_permits'));
  assert.ok(schema.includes("coalesce(auth.jwt() ->> 'is_anonymous', 'false') <> 'true'"));
  assert.ok(schema.includes('create or replace function public.create_student_profile'));
  assert.ok(schema.includes("coalesce(p_account_type, '') not in ('school', 'outside')"));
});

test('telas com sincronização carregam o cliente Supabase antes do estado da aplicação', () => {
  for (const file of ['index.html', 'jogo.html', 'matematica.html', 'materias.html', 'professor.html', 'ranking.html']) {
    const html = fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    const clientIndex = html.indexOf('js/supabaseClient.js?v=4');
    const stateIndex = html.indexOf('js/app-state.js?v=23');
    assert.ok(clientIndex >= 0, `${file}: cliente Supabase ausente`);
    assert.ok(stateIndex > clientIndex, `${file}: app-state precisa carregar depois do cliente`);
  }
});

test('ranking prioriza o RPC remoto por turma e renderiza nomes como texto', () => {
  const html = fs.readFileSync(new URL('../ranking.html', import.meta.url), 'utf8');
  assert.ok(html.includes('getRemoteClassRanking?.(player.turma)'));
  assert.ok(html.includes('playerCell.append(avatar, document.createTextNode(` ${playerItem.name}`))'));
  assert.equal(html.includes('${playerItem.name}</td>'), false);
});

test('dock remove tema, mantém música, recupera áudio suspenso e protege o PIN', async () => {
  const storage = new Map();
  const spoken = [];
  const spokenRates = [];
  const documentHandlers = {};
  const appendedScripts = [];
  let audioContextCreations = 0;
  const audioContexts = [];
  const audioTimers = [];
  const rootClasses = new Set();
  const navLinks = [];
  let logoutButton;
  let logoutCount = 0;
  let redirect = '';

  function element() {
    return {
      style: { setProperty(name, value) { this[name] = value; } },
      attributes: {},
      innerHTML: '',
      handlers: {},
      classList: { toggle() {} },
      addEventListener(type, handler) { this.handlers[type] = handler; },
      setAttribute(name, value) { this.attributes[name] = String(value); },
      getAttribute(name) { return this.attributes[name] || null; },
      matches(selector) { return this.matchSelectors?.includes(selector) || false; },
      closest(selector) {
        if (selector === '.app-controls') return null;
        if (selector === '.field') return this.field || null;
        return selector === this.targetSelector ? this : null;
      },
      contains() { return false; },
      querySelector() { return null; },
      innerText: '',
      textContent: '',
      value: '',
    };
  }

  const voiceButton = element();
  const soundButton = element();
  const voiceRateSlider = element();
  const voiceRateValue = element();
  const highContrastToggle = element();
  const volumeSlider = element();
  const volumeValue = element();
  const dock = element();
  const navigation = element();
  navigation.querySelector = () => null;
  navigation.appendChild = (link) => navLinks.push(link);
  const userChip = element();
  userChip.after = (button) => { logoutButton = button; };
  dock.querySelector = (selector) => ({
    '.control-btn--voice': voiceButton,
    '.control-btn--sound': soundButton,
    '#voiceRateSlider': voiceRateSlider,
    '#voiceRateValue': voiceRateValue,
    '#highContrastToggle': highContrastToggle,
    '.volume-slider': volumeSlider,
    '.volume-value': volumeValue,
  })[selector] || null;

  const document = {
    body: { appendChild(element) { appendedScripts.push(element); } },
    documentElement: { classList: { toggle(name, enabled) { if (enabled) rootClasses.add(name); else rootClasses.delete(name); } } },
    addEventListener(type, handler) { documentHandlers[type] = handler; },
    createElement(tagName) { return tagName === 'aside' ? dock : element(); },
    querySelector(selector) {
      if (selector === '.nav') return navigation;
      if (selector === '.user-chip') return userChip;
      return null;
    },
    querySelectorAll() { return []; },
    getElementById() { return null; },
  };
  const localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
  };
  const window = {
    location: { pathname: 'jogo.html', replace: (path) => { redirect = path; } },
    GeniosApp: { logoutUser() { logoutCount += 1; } },
    SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } },
    speechSynthesis: {
      cancel() {},
      getVoices: () => [{ lang: 'pt-BR' }],
      speak: (utterance) => { spoken.push(utterance.text); spokenRates.push(utterance.rate); },
    },
    AudioContext: class {
      constructor() {
        audioContextCreations += 1;
        this.state = 'running';
        this.currentTime = 0;
        this.destination = {};
        this.listeners = {};
        audioContexts.push(this);
      }
      addEventListener(type, handler) { this.listeners[type] = handler; }
      createGain() {
        return {
          gain: { value: 0, setTargetAtTime() {}, setValueAtTime() {}, exponentialRampToValueAtTime() {} },
          connect() {},
        };
      }
      createOscillator() {
        return { type: '', frequency: { setValueAtTime() {} }, connect() {}, start() {}, stop() {} };
      }
      resume() { this.state = 'running'; return Promise.resolve(); }
    },
    setTimeout(callback) { audioTimers.push(callback); return audioTimers.length; },
    clearTimeout() {},
  };
  const source = fs.readFileSync(new URL('../js/nav.js', import.meta.url), 'utf8');
  vm.runInNewContext(source, { window, document, localStorage });
  documentHandlers.DOMContentLoaded();

  assert.equal(volumeSlider.value, 36);
  assert.equal(volumeValue.value, '36%');
  assert.equal(voiceRateSlider.value, '1');
  assert.equal(voiceRateValue.value, '1.0×');
  assert.equal(window.VLibrasWidget.position, 'L');
  assert.equal(appendedScripts[0].src, 'https://vlibras.gov.br/app/vlibras-plugin.js');
  assert.equal(appendedScripts[0].async, true);
  assert.equal(dock.innerHTML.includes('control-btn--theme'), false);
  assert.equal(dock.innerHTML.includes('control-btn--sound'), true);
  assert.match(dock.innerHTML, /class="accessibility-controls" role="group" aria-label="Acessibilidade"/);
  assert.match(dock.innerHTML, /class="sound-control" role="group" aria-label="Música"/);
  assert.match(dock.innerHTML, /<\/details>\s*<\/div>\s*<div class="sound-control"/);
  volumeSlider.value = '57';
  volumeSlider.handlers.input();
  assert.equal(storage.get('exatas-play-volume'), '57');
  assert.equal(volumeValue.value, '57%');
  assert.equal(audioContextCreations, 0);

  voiceRateSlider.value = '1.3';
  voiceRateSlider.handlers.input();
  assert.equal(storage.get('genios-voice-rate'), '1.3');
  assert.equal(voiceRateValue.value, '1.3×');
  highContrastToggle.checked = true;
  highContrastToggle.handlers.change();
  assert.equal(storage.get('genios-high-contrast'), 'true');
  assert.equal(rootClasses.has('high-contrast'), true);
  assert.equal(navLinks[0].textContent, 'Área do professor');
  assert.equal(logoutButton.textContent, 'Sair');
  logoutButton.handlers.click();
  assert.equal(logoutCount, 1);
  assert.equal(redirect, 'index.html');

  voiceButton.handlers.click();
  assert.equal(storage.get('genios-voice-guide'), 'true');
  const enterButton = element();
  enterButton.matchSelectors = ['button, [role="button"]'];
  enterButton.targetSelector = 'button,a,input,select,[role="button"],.tile,.field,.avatar-option,.shop-item,.shop-tab,.option-btn,.question-card__prompt,.question-example,.game-companion__avatar,.game-companion__bubble';
  enterButton.innerText = 'Entrar e jogar';
  documentHandlers.pointerover({ target: enterButton, relatedTarget: null });
  assert.match(spoken.at(-1), /Entrar e jogar/);
  assert.equal(spokenRates.at(-1), 1.3);

  const pinInput = element();
  pinInput.matchSelectors = ['input[type="password"]'];
  pinInput.targetSelector = enterButton.targetSelector;
  pinInput.field = { querySelector: () => ({ textContent: 'PIN secreto' }) };
  pinInput.value = '4826';
  documentHandlers.focusin({ target: pinInput, relatedTarget: null });
  assert.match(spoken.at(-1), /PIN secreto/);
  assert.equal(spoken.at(-1).includes(pinInput.value), false);

  soundButton.handlers.click();
  await Promise.resolve();
  assert.equal(audioContextCreations, 1);
  assert.equal(soundButton.attributes['aria-pressed'], 'true');
  audioContexts[0].state = 'suspended';
  audioContexts[0].listeners.statechange();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(soundButton.attributes['aria-pressed'], 'true');
  soundButton.handlers.click();
  assert.equal(soundButton.attributes['aria-pressed'], 'false');
  audioContexts[0].state = 'closed';
  soundButton.handlers.click();
  await Promise.resolve();
  assert.equal(audioContextCreations, 2);
  assert.equal(soundButton.attributes['aria-pressed'], 'true');
  soundButton.handlers.click();
  assert.ok(audioTimers.length > 0);
});

test('tela de jogo não duplica IDs de controles', () => {
  const html = fs.readFileSync(new URL('../jogo.html', import.meta.url), 'utf8');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, 'IDs duplicados quebram os listeners dos controles');
});

test('marca usa o GIF animado nos cinco cabeçalhos internos', () => {
  for (const file of ['jogo.html', 'matematica.html', 'materias.html', 'professor.html', 'ranking.html']) {
    const html = fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    assert.ok(html.includes('brand__mark"><img src="img/Icone%20do%20Jogo.gif"'), `${file}: ícone da marca ausente`);
  }
});

test('créditos aparecem em todos os rodapés com a equipe e a faculdade', () => {
  for (const file of ['index.html', 'jogo.html', 'matematica.html', 'materias.html', 'professor.html', 'ranking.html']) {
    const html = fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    assert.ok(html.includes('class="footer-credits"'), `${file}: controle de créditos ausente`);
    assert.ok(html.includes('Pedro Lucas, Vitor, Murillo, Marcelo, Guilherme, Mickael e Helio'), `${file}: equipe ausente`);
    assert.ok(html.includes('<strong>Faculdade:</strong> Cruzeiro do Sul'), `${file}: faculdade ausente`);
  }
});

test('criação de código escolar fica na tela inicial e só a diretoria pode usá-la', () => {
  const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const professor = fs.readFileSync(new URL('../professor.html', import.meta.url), 'utf8');
  const schema = fs.readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8');
  for (const id of ['directorPanel', 'directorLoginForm', 'schoolCodeForm', 'schoolCodeClass', 'newSchoolCode']) {
    assert.ok(index.includes(`id="${id}"`), `tela inicial sem ${id}`);
    assert.ok(!professor.includes(`id="${id}"`), `painel do professor não deve ter ${id}`);
  }
  assert.ok(index.includes('js/director-access-codes.js'));
  assert.ok(index.includes('Peça o código à diretoria'));
  assert.ok(!professor.includes('teacher-access-codes'));
  assert.equal(fs.existsSync(new URL('../js/teacher-access-codes.js', import.meta.url)), false);

  const createFunction = schema.match(/function public\.create_school_access_code[\s\S]*?\$function\$;/)[0];
  const revokeFunction = schema.match(/function public\.revoke_school_access_code[\s\S]*?\$function\$;/)[0];
  assert.ok(createFunction.includes('public.school_directors'));
  assert.ok(!createFunction.includes('teacher_classes') && !createFunction.includes('teacher_accounts'));
  assert.ok(revokeFunction.includes('public.school_directors'));
  assert.ok(fs.readFileSync(new URL('../js/director-access-codes.js', import.meta.url), 'utf8').includes('Aplique o schema atualizado do Supabase'));
  assert.ok(!revokeFunction.includes('teacher_classes'));
  assert.ok(!schema.includes('teachers_read_own_access_codes on school_access_codes\n  for select'));
});

test('painel da diretoria rejeita conta sem papel e cria código com sessão isolada', async () => {
  class Element {
    constructor() { this.children = []; this.handlers = {}; this.hidden = false; this.value = ''; this.textContent = ''; this.className = ''; this.classList = { toggle() {} }; }
    addEventListener(type, handler) { this.handlers[type] = handler; }
    append(...nodes) { this.children.push(...nodes); }
    appendChild(node) { this.children.push(node); }
    replaceChildren(...nodes) { this.children = nodes; }
    reset() {}
  }
  const ids = ['directorPanel', 'directorLoginForm', 'directorEmail', 'directorPassword', 'directorLoginError', 'directorLogin', 'directorCodes', 'directorWelcome', 'directorLogout', 'schoolCodeForm', 'schoolCodeClass', 'schoolCodeUses', 'schoolCodeExpiry', 'schoolCodeFeedback', 'newSchoolCode', 'schoolCodesList'];
  const elements = Object.fromEntries(ids.map((id) => [id, new Element()]));
  elements.directorCodes.hidden = true;
  const rpcCalls = [];
  let signOuts = 0;
  const directors = new Set(['diretor-1']);
  const createClient = () => ({
    auth: {
      signInWithPassword: async ({ email }) => ({ data: { user: { id: email.startsWith('diretor') ? 'diretor-1' : 'professor-1' } }, error: null }),
      signOut: async () => { signOuts += 1; },
    },
    from: () => {
      const query = { userId: null };
      query.select = () => query;
      query.eq = (_column, value) => { query.userId = value; return query; };
      query.order = () => query;
      query.limit = async () => ({ data: [], error: null });
      query.maybeSingle = async () => ({ data: directors.has(query.userId) ? { display_name: 'Maria' } : null, error: null });
      return query;
    },
    rpc: async (name, args) => { rpcCalls.push({ name, args }); return { data: true, error: null }; },
  });
  const window = {
    location: { search: '' },
    crypto: globalThis.crypto,
    createEphemeralSupabaseClient: createClient,
    addEventListener() {},
    supabaseClient: new Proxy({}, { get() { throw new Error('a sessão principal não pode ser usada'); } }),
  };
  const document = { getElementById: (id) => elements[id] || null, createElement: () => new Element() };
  const source = fs.readFileSync(new URL('../js/director-access-codes.js', import.meta.url), 'utf8');
  vm.runInNewContext(source, { window, document, URLSearchParams, TextEncoder, Uint8Array, Date, Number, navigator: {} });

  elements.directorEmail.value = 'professor@escola.com';
  elements.directorPassword.value = 'segredo';
  await elements.directorLoginForm.handlers.submit({ preventDefault() {} });
  assert.equal(elements.directorCodes.hidden, true);
  assert.equal(elements.directorLoginError.hidden, false);
  assert.equal(signOuts, 1);

  elements.directorEmail.value = 'diretor@escola.com';
  await elements.directorLoginForm.handlers.submit({ preventDefault() {} });
  assert.equal(elements.directorCodes.hidden, false);
  assert.equal(elements.directorLogin.hidden, true);
  assert.match(elements.directorWelcome.textContent, /Maria/);

  elements.schoolCodeClass.value = '4º ano';
  elements.schoolCodeUses.value = '25';
  await elements.schoolCodeForm.handlers.submit({ preventDefault() {} });
  assert.equal(rpcCalls.length, 1);
  assert.equal(rpcCalls[0].name, 'create_school_access_code');
  assert.match(rpcCalls[0].args.p_code_hash, /^[a-f0-9]{64}$/);
  assert.equal(rpcCalls[0].args.p_turma, '4º ano');
  assert.equal(rpcCalls[0].args.p_max_uses, 25);
  assert.equal(elements.newSchoolCode.hidden, false);
  assert.match(elements.newSchoolCode.children[1].textContent, /^TURMA-[A-F0-9]{24}$/);

  await elements.directorLogout.handlers.click();
  assert.equal(elements.directorCodes.hidden, true);
  assert.equal(signOuts, 2);
});

test('painel da diretoria some no modo local sem Supabase', () => {
  const panel = { hidden: false };
  const document = { getElementById: (id) => (id === 'directorPanel' ? panel : null) };
  const source = fs.readFileSync(new URL('../js/director-access-codes.js', import.meta.url), 'utf8');
  vm.runInNewContext(source, { window: { location: { search: '?modo=local' } }, document, URLSearchParams });
  assert.equal(panel.hidden, true);
});
test('cadastro docente usa convite da diretoria via RPCs sem policies diretas', () => {
  const schema = fs.readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8');
  const director = fs.readFileSync(new URL('../js/director-access-codes.js', import.meta.url), 'utf8');
  const auth = fs.readFileSync(new URL('../js/professor-auth.js', import.meta.url), 'utf8');
  assert.match(schema, /create table if not exists teacher_invite_codes/);
  assert.match(schema, /function public\.create_teacher_invite_code/);
  assert.match(schema, /function public\.register_teacher/);
  assert.doesNotMatch(schema, /create policy[^;]*teacher_invite_codes/i);
  assert.ok(director.includes('create_teacher_invite_code') && director.includes('PROF'));
  assert.ok(auth.includes("rpc('register_teacher'") && auth.includes('signUp'));
});
