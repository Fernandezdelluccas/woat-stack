import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { buildQuestions, GAME_TYPES } from '../js/game.mjs';

function createApp(initialData = {}) {
  const storage = new Map(Object.entries(initialData));
  const localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
  };
  const window = {};
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

test('perfis escolares e externos têm login e dados separados', () => {
  const app = createApp();
  const school = app.registerUser({ nome: 'Aluna', email: 'aluna@escola.test', password: 'senha123', turma: '4º ano', accountType: 'school' });
  const outside = app.registerUser({ nome: 'Visitante', email: 'fora@example.test', password: 'senha456', turma: 'Visitante', accountType: 'outside' });
  assert.equal(school.ok, true);
  assert.equal(outside.ok, true);
  assert.equal(app.loginUser({ email: school.profile.email, password: 'senha123', accountType: 'outside' }).ok, false);
  assert.equal(app.loginUser({ email: school.profile.email, password: 'senha123', accountType: 'school' }).ok, true);

  app.setUnlockedCosmetics(['starter', 'base-cat']);
  app.unlockAchievement('first-game');
  app.saveGameSession({ gameKey: 'adicao', points: 48, acertos: 4, erros: 0, seconds: 82, bestStreak: 4 });

  assert.equal(app.loginUser({ email: outside.profile.email, password: 'senha456', accountType: 'outside' }).ok, true);
  assert.deepEqual(Array.from(app.getUnlockedCosmetics()), ['starter']);
  assert.deepEqual(Array.from(app.getAchievements()), []);
  assert.equal(app.getGameHistory().length, 0);

  assert.equal(app.loginUser({ email: school.profile.email, password: 'senha123', accountType: 'school' }).ok, true);
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

test('catálogo contém roupas visíveis e conquistas ampliadas', () => {
  const app = createApp();
  assert.ok(app.characterCatalog.some((item) => item.category === 'roupa' && item.id === 'outfit-cape'));
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

test('login mostra escolha escolar/externa e exige senha apenas ao entrar', () => {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  for (const marker of ['data-account-type="school"', 'data-account-type="outside"', 'data-auth-mode="login"', 'data-auth-mode="register"', 'id="loginFeedback"']) {
    assert.ok(html.includes(marker), `controle ausente: ${marker}`);
  }
  const inlineScripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(inlineScripts.length, 1);
  assert.doesNotThrow(() => new Function(inlineScripts[0][1]));
});