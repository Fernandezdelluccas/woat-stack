import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

test('painel recarrega missões remotas e oferece nova tentativa só para o próprio professor', async () => {
  class Element {
    constructor() { this.children = []; this.handlers = {}; this.value = ''; this.disabled = false; this.textContent = ''; }
    addEventListener(type, handler) { this.handlers[type] = handler; }
    append(...items) { this.children.push(...items); }
    appendChild(item) { this.children.push(item); }
    replaceChildren(...items) { this.children = items; }
    reset() {}
  }
  const ids = ['challengeForm', 'challengeList', 'challengeFeedback'];
  const elements = Object.fromEntries(ids.map((id) => [id, new Element()]));
  const listeners = {};
  const document = {
    getElementById: (id) => elements[id] || null,
    createElement: () => new Element(),
    addEventListener(type, handler) { (listeners[type] ||= []).push(handler); },
  };
  const pending = { id: 'pending', title: 'Pendente', turma: '4º ano', game: 'adicao', target: 2, teacherUserId: 'teacher' };
  const other = { id: 'other', title: 'Outro professor', turma: '4º ano', game: 'adicao', target: 2, teacherUserId: 'other' };
  const remote = [{ id: 'remote', local_challenge_id: 'old', title: 'Publicada', turma: '4º ano', game_key: 'fracoes', target: 3 }];
  const client = {
    auth: { getSession: async () => ({ data: { session: { user: { id: 'teacher' } } }, error: null }) },
    from(table) {
      assert.equal(table, 'class_challenges');
      return {
        select() { return this; },
        eq(field, id) { assert.equal(field, 'teacher_user_id'); assert.equal(id, 'teacher'); return this; },
        order() { return this; },
        range: async (start, end) => ({ data: remote.slice(start, end + 1), error: null }),
      };
    },
  };
  const window = {
    location: { search: '' },
    teacherSupabaseClient: client,
    GeniosApp: {
      getChallenges: () => [pending, other],
      async publishClassChallenge(challenge) {
        assert.equal(challenge.id, 'pending');
        pending.supabaseId = 'new-remote';
        remote.push({ id: 'new-remote', local_challenge_id: 'pending', title: pending.title, turma: pending.turma, game_key: pending.game, target: pending.target });
        return { ok: true };
      },
    },
  };
  const html = fs.readFileSync(new URL('../professor.html', import.meta.url), 'utf8');
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  vm.runInNewContext(scripts.at(-1)[1], { window, document, console, Set });
  listeners.DOMContentLoaded[0]();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(elements.challengeList.children.length, 2);
  assert.match(elements.challengeList.children[0].children[0].textContent, /Pendente/);
  assert.match(elements.challengeList.children[1].children[0].textContent, /Publicada/);
  await elements.challengeList.children[0].children[2].handlers.click();
  assert.equal(elements.challengeList.children.length, 2);
  assert.equal(elements.challengeList.children.every((item) => item.children.length === 2), true);
  assert.equal(elements.challengeFeedback.textContent, 'Missão publicada.');
});
