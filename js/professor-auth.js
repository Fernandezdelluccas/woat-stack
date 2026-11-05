(function () {
  const loginSection = document.getElementById('loginSection');
  const dashboardSection = document.getElementById('dashboardSection');
  const form = document.getElementById('professorLoginForm');
  const emailInput = document.getElementById('professorEmail');
  const passwordInput = document.getElementById('professorPassword');
  const errorText = document.getElementById('loginError');
  const logoutButton = document.getElementById('logoutProfessor');
  const cancelButton = document.getElementById('cancelProfessorLogin');
  const teacherNavigation = document.getElementById('teacherNavigation');
  const brandLink = document.querySelector('.topbar__inner .brand');
  const localDemo = window.location.search === '?modo=local';
  let authAttempt = 0;

  if (!form || !loginSection || !dashboardSection) {
    return;
  }

  function getPreviousPage() {
    if (!document.referrer) return 'index.html';

    try {
      const previousUrl = new URL(document.referrer);
      if (previousUrl.origin === window.location.origin && previousUrl.pathname !== window.location.pathname) {
        return `${previousUrl.pathname}${previousUrl.search}${previousUrl.hash}`;
      }
    } catch (error) {
      return 'index.html';
    }

    return 'index.html';
  }

  const previousPage = getPreviousPage();

  function setLoggedIn(value) {
    if (window.GeniosApp?.setTeacherSession) {
      window.GeniosApp.setTeacherSession(value);
    } else {
      localStorage.setItem('genios-professor-auth', value ? 'true' : 'false');
    }
    loginSection.style.display = value ? 'none' : 'block';
    dashboardSection.style.display = value ? 'block' : 'none';
    if (teacherNavigation) {
      teacherNavigation.hidden = !value;
      teacherNavigation.style.display = value ? '' : 'none';
    }
    if (brandLink) brandLink.href = value ? 'materias.html' : previousPage;
  }

  function returnToStudentLogin() {
    authAttempt += 1;
    window.location.replace(localDemo ? 'index.html?modo=local' : 'index.html');
  }

  function returnToPreviousPage() {
    authAttempt += 1;
    window.location.replace(previousPage);
  }

  async function hasTeacherAccess(userId) {
    try {
      const { data, error } = await window.supabaseClient
        .from('teacher_accounts')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) return { ok: false, allowed: false };
      return { ok: true, allowed: Boolean(data?.user_id) };
    } catch (error) {
      return { ok: false, allowed: false };
    }
  }

  function showError(message) {
    errorText.textContent = message;
    errorText.style.display = 'block';
  }

  function hideError() {
    errorText.style.display = 'none';
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const currentAttempt = ++authAttempt;

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!window.supabaseClient) {
      showError('Autenticação indisponível. Peça ao administrador para configurar o Supabase.');
      return;
    }

    const { data, error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
    if (currentAttempt !== authAttempt) return;
    if (error || !data.user) {
      const errorText = String(error?.message || '').toLowerCase();
      const invalidCredentials = error?.status === 400
        || error?.status === 401
        || error?.code === 'invalid_credentials'
        || errorText.includes('invalid login credentials')
        || errorText.includes('invalid credentials');
      showError(invalidCredentials
        ? 'E-mail ou senha incorretos.'
        : 'Não foi possível conectar ao serviço de autenticação. Verifique a conexão e tente novamente.');
      return;
    }

    const access = await hasTeacherAccess(data.user.id);
    if (currentAttempt !== authAttempt) {
      await window.supabaseClient.auth.signOut();
      return;
    }
    if (!access.ok) {
      await window.supabaseClient.auth.signOut();
      setLoggedIn(false);
      showError('Não foi possível verificar sua autorização. Tente novamente ou peça ao administrador para conferir o Supabase.');
      return;
    }
    if (!access.allowed) {
      await window.supabaseClient.auth.signOut();
      setLoggedIn(false);
      showError('Esta conta não está autorizada para acessar o painel do professor.');
      return;
    }

    setLoggedIn(true);
    hideError();
    form.reset();
    document.dispatchEvent(new CustomEvent('professor:login', { detail: { userId: data.user.id } }));
  });

  logoutButton.addEventListener('click', async () => {
    if (!localDemo && window.supabaseClient) await window.supabaseClient.auth.signOut();
    setLoggedIn(false);
    hideError();
    returnToStudentLogin();
  });

  cancelButton?.addEventListener('click', returnToPreviousPage);

  loginSection.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    returnToPreviousPage();
  });

  async function restoreSession() {
    if (localDemo) {
      setLoggedIn(true);
      document.getElementById('localTeacherNotice').hidden = false;
      return;
    }

    if (!window.supabaseClient) {
      setLoggedIn(false);
      return;
    }

    const currentAttempt = authAttempt;
    let data;
    let error;
    try {
      ({ data, error } = await window.supabaseClient.auth.getSession());
    } catch (sessionError) {
      setLoggedIn(false);
      showError('Não foi possível restaurar a sessão. Atualize a página e tente novamente.');
      return;
    }
    if (currentAttempt !== authAttempt) return;
    const user = data?.session?.user;
    if (error) {
      setLoggedIn(false);
      showError('Não foi possível restaurar a sessão. Atualize a página e tente novamente.');
      return;
    }
    if (!user) {
      setLoggedIn(false);
      return;
    }

    const access = await hasTeacherAccess(user.id);
    if (currentAttempt !== authAttempt) return;
    if (!access.ok) {
      setLoggedIn(false);
      showError('Não foi possível verificar sua autorização. Tente novamente ou peça ao administrador para conferir o Supabase.');
      return;
    }
    if (!access.allowed) {
      await window.supabaseClient.auth.signOut();
      setLoggedIn(false);
      showError('Esta conta não está autorizada para acessar o painel do professor.');
      return;
    }

    setLoggedIn(true);
    document.dispatchEvent(new CustomEvent('professor:login', { detail: { userId: user.id } }));
  }

  restoreSession();
})();
