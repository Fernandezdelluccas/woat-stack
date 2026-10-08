import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { buildQuestions, GAME_TYPES } from '../js/game.mjs';

function createApp(initialData = {}, validSchoolCode = 'CODIGO-DE-TESTE', sharedStorage = null) {
  const storage = sharedStorage || new Map(Object.entries(initialData));
  const localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
  };
  const window = {
    supabaseClient: {
      rpc: async (functionName, args) => ({
        data: functionName === 'validate_school_access_code' && args.p_code === validSchoolCode,
        error: null,
      }),
    },
  };
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

test('código provisório habilita escola e o PIN do aluno sobrevive a recarga', async () => {
  const storage = new Map();
  const firstVisit = createApp({}, 'CODIGO-DE-TESTE', storage);
  assert.equal((await firstVisit.authorizeSchoolEnrollment({ code: 'escola2026', turma: '5º ano' })).ok, true);
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

test('login explica perfil inexistente separadamente de PIN incorreto', async () => {
  const app = createApp();
  assert.equal(app.loginUser({ nome: 'Pedro', turma: '5º ano', password: '4826', accountType: 'school' }).code, 'PROFILE_NOT_FOUND');
  await app.authorizeSchoolEnrollment({ code: 'ESCOLA2026', turma: '5º ano' });
  assert.equal(app.registerUser({ nome: 'Pedro', password: '4826', turma: '5º ano', accountType: 'school' }).ok, true);
  assert.equal(app.loginUser({ nome: 'Pedro', turma: '5º ano', password: '1111', accountType: 'school' }).code, 'INVALID_PIN');
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

test('login do professor esconde matérias e sai para a tela inicial', () => {
  class Element {
    constructor() { this.style = {}; this.value = ''; this.handlers = {}; this.hidden = false; }
    addEventListener(type, handler) { this.handlers[type] = handler; }
    reset() { this.value = ''; }
  }

  const ids = ['loginSection', 'dashboardSection', 'professorLoginForm', 'professorEmail', 'professorPassword', 'loginError', 'logoutProfessor', 'cancelProfessorLogin', 'teacherNavigation'];
  const elements = Object.fromEntries(ids.map((id) => [id, new Element()]));
  const brand = { href: 'materias.html' };
  const document = { getElementById: (id) => elements[id] || null, querySelector: () => brand };
  const storage = new Map([['genios-professor-auth', 'false']]);
  const localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
  };
  let redirect = '';
  const window = {
    location: { replace: (path) => { redirect = path; } },
    GeniosApp: {
      setTeacherSession: (value) => localStorage.setItem('genios-professor-auth', value),
      isTeacherLoggedIn: () => localStorage.getItem('genios-professor-auth') === 'true',
    },
  };
  const source = fs.readFileSync(new URL('../js/professor-auth.js', import.meta.url), 'utf8');
  vm.runInNewContext(source, { window, document, localStorage });

  assert.equal(elements.teacherNavigation.hidden, true);
  assert.equal(elements.teacherNavigation.style.display, 'none');
  assert.equal(brand.href, 'index.html');
  elements.loginSection.handlers.keydown({ key: 'Escape', preventDefault() {} });
  assert.equal(redirect, 'index.html');

  elements.professorEmail.value = 'professor@escola.com';
  elements.professorPassword.value = '123456';
  elements.professorLoginForm.handlers.submit({ preventDefault() {} });
  assert.equal(elements.teacherNavigation.hidden, false);
  assert.equal(elements.dashboardSection.style.display, 'block');

  elements.logoutProfessor.handlers.click();
  assert.equal(localStorage.getItem('genios-professor-auth'), 'false');
  assert.equal(redirect, 'index.html');
});

test('login infantil exige código apenas ao cadastrar perfil escolar e nunca mostra e-mail', () => {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  for (const marker of ['data-account-type="school"', 'data-account-type="outside"', 'data-auth-mode="login"', 'data-auth-mode="register"', 'id="loginFeedback"', 'autocomplete="nickname"', 'inputmode="numeric"', 'id="schoolCodeField"', 'authorizeSchoolEnrollment', 'supabase-js@2', 'ESCOLA2026', 'professor@escola.com', '123456']) {
    assert.ok(html.includes(marker), `controle ausente: ${marker}`);
  }
  assert.ok(!html.includes('id="email"'), 'a tela infantil não deve pedir e-mail');
  assert.ok(!html.includes('emailInput'), 'o controlador da tela não deve ler e-mail');
  const inlineScripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(inlineScripts.length, 1);
  assert.doesNotThrow(() => new Function(inlineScripts[0][1]));
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
});