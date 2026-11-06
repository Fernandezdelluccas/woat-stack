import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../js/professor-auth.js', import.meta.url), 'utf8');

async function setup({ recovery = false, expired = false, authorized = false } = {}) {
  class Element {
    constructor() {
      this.style = {};
      this.value = '';
      this.handlers = {};
      this.hidden = false;
      this.classList = { toggle() {} };
    }
    addEventListener(type, handler) { this.handlers[type] = handler; }
    setAttribute() {}
    reset() {}
  }
  const ids = [
    'loginSection', 'dashboardSection', 'professorLoginForm', 'professorEmail',
    'professorPassword', 'teacherPasswordConfirmation', 'teacherPasswordConfirmationField',
    'teacherForgotPassword', 'teacherBackToLogin', 'loginError', 'logoutProfessor',
    'cancelProfessorLogin', 'teacherNavigation', 'teacherAuthTitle', 'teacherAuthIntro',
    'teacherModeSwitch', 'teacherModeLogin', 'teacherModeRegister', 'teacherNameField',
    'teacherName', 'teacherEmailField', 'teacherPasswordField', 'teacherCodeField',
    'teacherInviteCode', 'teacherAuthHint', 'teacherAuthSubmit', 'loginNotice', 'teacherWelcome',
  ];
  const elements = Object.fromEntries(ids.map((id) => [id, new Element()]));
  const user = { id: 'teacher', user_metadata: { display_name: 'Ana' } };
  const calls = [];
  let callback;
  const auth = {
    onAuthStateChange(handler) { callback = handler; },
    async getSession() {
      if (recovery) callback('PASSWORD_RECOVERY', { user });
      return { data: { session: recovery ? { user } : null }, error: null };
    },
    async signUp(options) {
      calls.push(['signup', options]);
      return { data: { user, session: null }, error: null };
    },
    async signInWithPassword() {
      return { data: { user }, error: null };
    },
    async resetPasswordForEmail(email, options) {
      calls.push(['reset', email, options]);
      return { error: null };
    },
    async updateUser(data) {
      calls.push(['update', data]);
      return { error: null };
    },
    async signOut(options) {
      calls.push(['signout', options]);
      return { error: null };
    },
  };
  const client = {
    auth,
    from() {
      return {
        select() { return this; },
        eq() { return this; },
        async maybeSingle() {
          return { data: authorized ? { user_id: user.id, display_name: 'Ana' } : null, error: null };
        },
      };
    },
    async rpc(name, args) {
      calls.push(['rpc', name, args]);
      authorized = true;
      return { data: true, error: null };
    },
  };
  const events = [];
  const document = {
    referrer: '',
    getElementById: (id) => elements[id] || null,
    querySelector: () => null,
    dispatchEvent: (event) => events.push(event),
  };
  const window = {
    location: {
      origin: 'https://jogo.example',
      pathname: '/professor.html',
      search: recovery || expired ? '?recuperacao=1' : '',
      replace() {},
    },
    history: { replaceState() { calls.push(['clear-url']); } },
    teacherSupabaseClient: client,
    GeniosApp: { setTeacherSession() {} },
  };
  vm.runInNewContext(source, {
    window, document, URL, console,
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options?.detail; } },
  });
  await new Promise((resolve) => setImmediate(resolve));
  const submit = () => elements.professorLoginForm.handlers.submit({ preventDefault() {} });
  return { elements, calls, auth, events, submit };
}

test('cadastro com confirmação exige convite ao concluir e abre painel após autorização', async () => {
  const { elements: e, calls, events, submit } = await setup();
  e.teacherModeRegister.handlers.click();
  e.teacherName.value = 'Ana';
  e.professorEmail.value = 'ana@escola.test';
  e.professorPassword.value = 'senha-forte';
  e.teacherInviteCode.value = 'PROF-123456789012';
  await submit();
  assert.equal(calls[0][0], 'signup');
  assert.equal(calls[0][1].options.emailRedirectTo, 'https://jogo.example/professor.html');
  assert.match(e.loginNotice.textContent, /confirmação/);
  e.professorPassword.value = 'senha-forte';
  await submit();
  assert.equal(e.teacherAuthTitle.textContent, 'Concluir cadastro');
  e.teacherName.value = 'Ana';
  e.teacherInviteCode.value = 'PROF-123456789012';
  await submit();
  assert.equal(calls.find((call) => call[0] === 'rpc')[1], 'register_teacher');
  assert.equal(e.dashboardSection.style.display, 'block');
  assert.equal(events.at(-1).detail.userId, 'teacher');
});

test('recuperação envia link e permite alterar senha somente após evento de recuperação', async () => {
  const request = await setup();
  request.elements.teacherForgotPassword.handlers.click();
  request.elements.professorEmail.value = 'ana@escola.test';
  await request.submit();
  assert.equal(request.calls[0][1], 'ana@escola.test');
  assert.equal(request.calls[0][2].redirectTo, 'https://jogo.example/professor.html?recuperacao=1');
  assert.match(request.elements.loginNotice.textContent, /Se o e-mail estiver cadastrado/);

  const reset = await setup({ recovery: true });
  assert.equal(reset.elements.teacherAuthTitle.textContent, 'Escolher nova senha');
  reset.elements.professorPassword.value = 'senha-nova';
  reset.elements.teacherPasswordConfirmation.value = 'diferente';
  await reset.submit();
  assert.match(reset.elements.loginError.textContent, /não coincidem/);
  assert.equal(reset.calls.length, 0);
  reset.elements.teacherPasswordConfirmation.value = 'senha-nova';
  await reset.submit();
  assert.equal(reset.calls[0][0], 'update');
  assert.equal(reset.calls[0][1].password, 'senha-nova');
  assert.equal(reset.calls[1][1].scope, 'local');
  assert.equal(reset.elements.teacherAuthTitle.textContent, 'Login do Professor');
  assert.match(reset.elements.loginNotice.textContent, /Senha alterada/);
});

test('falha de rede é exibida no formulário docente', async () => {
  const { elements, auth, submit } = await setup();
  auth.signInWithPassword = async () => { throw new Error('offline'); };
  await submit();
  assert.match(elements.loginError.textContent, /Confira a conexão/);
  assert.equal(elements.teacherAuthSubmit.disabled, false);
});

test('link de recuperação expirado não permite trocar a senha', async () => {
  const { elements, calls } = await setup({ expired: true });
  assert.equal(elements.teacherAuthTitle.textContent, 'Recuperar senha');
  assert.match(elements.loginError.textContent, /inválido ou expirou/);
  assert.equal(calls.some((call) => call[0] === 'update'), false);
});

test('relatório busca todas as páginas de alunos e processa partidas em lotes', async () => {
  class Element {
    constructor(text = '', value = '') { this.textContent = text; this.value = value; this.children = []; this.hidden = false; }
    addEventListener() {}
    append(...items) { this.children.push(...items); }
    appendChild(item) { this.children.push(item); }
    add(item) { this.children.push(item); }
    replaceChildren(...items) { this.children = items; }
  }
  const ids = ['teacherReportPanel', 'teacherReportFeedback', 'teacherReportRows', 'teacherQuestionReports', 'reportStudentCount', 'reportSessionCount', 'reportAccuracy', 'reportClassFilter', 'reportGameFilter', 'refreshTeacherReport', 'exportTeacherReport', 'challengeClass', 'challengeSubmit', 'challengeFeedback'];
  const elements = Object.fromEntries(ids.map((id) => [id, new Element()]));
  const students = Array.from({ length: 1001 }, (_, index) => ({ id: `p${index}`, nome: `Aluno ${index}`, turma: '4º ano' }));
  const profilePages = [];
  const sessionBatches = [];
  const stateBatches = [];
  const client = {
    from(table) {
      let batch;
      return {
        select() { return this; },
        eq() { return this; },
        in(field, values) { if (field === 'profile_id') batch = values; return this; },
        order() { return this; },
        async range(start, end) {
          if (table === 'profiles') {
            profilePages.push(start);
            return { data: students.slice(start, end + 1), error: null };
          }
          sessionBatches.push(batch.length);
          return { data: [], error: null };
        },
        then(resolve, reject) {
          if (table === 'profile_state') stateBatches.push(batch.length);
          const data = table === 'teacher_classes' ? [{ turma: '4º ano' }] : [];
          return Promise.resolve({ data, error: null }).then(resolve, reject);
        },
      };
    },
  };
  const listeners = {};
  const document = {
    getElementById: (id) => elements[id] || null,
    createElement: () => new Element(),
    addEventListener(type, handler) { (listeners[type] ||= []).push(handler); },
  };
  const dashboard = fs.readFileSync(new URL('../js/professor-dashboard.js', import.meta.url), 'utf8');
  vm.runInNewContext(dashboard, {
    window: { teacherSupabaseClient: client, location: { search: '' } },
    document, localStorage: { getItem: () => null }, Option: Element,
    URL, Blob, Date, Map, Set, String, Number,
  });
  await Promise.all(listeners['professor:login'].map((handler) => handler({ detail: { userId: 'teacher' } })));
  assert.deepEqual(profilePages, [0, 1000]);
  assert.deepEqual(sessionBatches, [200, 200, 200, 200, 200, 1]);
  assert.deepEqual(stateBatches, sessionBatches);
  assert.equal(elements.reportStudentCount.textContent, '1001');
});
