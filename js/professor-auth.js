(function () {
  const loginSection = document.getElementById('loginSection');
  const dashboardSection = document.getElementById('dashboardSection');
  const form = document.getElementById('professorLoginForm');
  const emailInput = document.getElementById('professorEmail');
  const passwordInput = document.getElementById('professorPassword');
  const passwordConfirmation = document.getElementById('teacherPasswordConfirmation');
  const passwordConfirmationField = document.getElementById('teacherPasswordConfirmationField');
  const forgotPasswordButton = document.getElementById('teacherForgotPassword');
  const backToLoginButton = document.getElementById('teacherBackToLogin');
  const errorText = document.getElementById('loginError');
  const logoutButton = document.getElementById('logoutProfessor');
  const cancelButton = document.getElementById('cancelProfessorLogin');
  const teacherNavigation = document.getElementById('teacherNavigation');
  const brandLink = document.querySelector('.topbar__inner .brand');
  const nameInput = document.getElementById('teacherName');
  const nameField = document.getElementById('teacherNameField');
  const emailField = document.getElementById('teacherEmailField');
  const passwordField = document.getElementById('teacherPasswordField');
  const codeInput = document.getElementById('teacherInviteCode');
  const codeField = document.getElementById('teacherCodeField');
  const modeSwitch = document.getElementById('teacherModeSwitch');
  const loginModeButton = document.getElementById('teacherModeLogin');
  const registerModeButton = document.getElementById('teacherModeRegister');
  const authTitle = document.getElementById('teacherAuthTitle');
  const authIntro = document.getElementById('teacherAuthIntro');
  const authHint = document.getElementById('teacherAuthHint');
  const submitButton = document.getElementById('teacherAuthSubmit');
  const noticeText = document.getElementById('loginNotice');
  const welcomeText = document.getElementById('teacherWelcome');
  const localDemo = window.location.search === '?modo=local';
  let authAttempt = 0;
  let mode = 'login';
  let pendingUser = null;
  const recoveryRedirect = new URL(window.location.search || '', window.location.origin || 'http://localhost').searchParams.get('recuperacao') === '1';
  let recoverySession = false;

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
      const { data, error } = await window.teacherSupabaseClient
        .from('teacher_accounts')
        .select('user_id, display_name')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) return { ok: false, allowed: false };
      return { ok: true, allowed: Boolean(data?.user_id), displayName: data?.display_name || '' };
    } catch (error) {
      return { ok: false, allowed: false };
    }
  }

  function showError(message) {
    errorText.textContent = message;
    errorText.style.display = 'block';
    if (noticeText) noticeText.style.display = 'none';
  }

  function hideError() {
    errorText.style.display = 'none';
  }

  function showNotice(message) {
    if (!noticeText) return;
    noticeText.textContent = message;
    noticeText.style.display = message ? 'block' : 'none';
  }

  const modeTexts = {
    login: {
      title: 'Login do Professor',
      intro: 'Entre com seu e-mail e sua senha. Ainda não tem conta? Toque em Criar conta e use o código de convite da diretoria.',
      hint: 'Sua sessão fica salva neste navegador até você tocar em Sair.',
      submit: 'Entrar',
    },
    register: {
      title: 'Criar conta de professor',
      intro: 'Peça à diretoria o código de convite, crie sua senha e confirme o e-mail quando o sistema pedir.',
      hint: 'Use uma senha com pelo menos 8 caracteres. O código libera somente as turmas escolhidas pela diretoria.',
      submit: 'Criar conta',
    },
    complete: {
      title: 'Concluir cadastro',
      intro: 'Seu e-mail está confirmado. Informe seu nome e o código de convite da diretoria para liberar o painel.',
      hint: 'Se esta não é a conta certa, toque em Cancelar e voltar para sair dela.',
      submit: 'Concluir cadastro',
    },
    forgot: {
      title: 'Recuperar senha',
      intro: 'Informe o e-mail usado na sua conta para receber um link de recuperação.',
      hint: 'Confira também a pasta de spam. O link de recuperação expira.',
      submit: 'Enviar link de recuperação',
    },
    recovery: {
      title: 'Escolher nova senha',
      intro: 'Digite e confirme uma nova senha para sua conta.',
      hint: 'Use pelo menos 8 caracteres.',
      submit: 'Salvar nova senha',
    },
  };

  function setMode(nextMode) {
    mode = nextMode;
    const registering = mode === 'register';
    const completing = mode === 'complete';
    const recovering = mode === 'recovery';
    const forgot = mode === 'forgot';
    const text = modeTexts[mode];
    nameField.hidden = !(registering || completing);
    codeField.hidden = !(registering || completing);
    emailField.hidden = completing || recovering;
    passwordField.hidden = completing || forgot;
    emailInput.required = !completing && !recovering;
    passwordInput.required = !completing && !forgot;
    if (passwordConfirmationField) passwordConfirmationField.hidden = !recovering;
    if (passwordConfirmation) passwordConfirmation.required = recovering;
    nameInput.required = registering || completing;
    codeInput.required = registering || completing;
    passwordInput.autocomplete = registering || recovering ? 'new-password' : 'current-password';
    passwordInput.placeholder = registering || recovering ? 'Crie uma senha com 8 ou mais caracteres' : 'Digite sua senha';
    passwordInput.minLength = registering || recovering ? 8 : 0;
    modeSwitch.hidden = completing || forgot || recovering;
    if (forgotPasswordButton) forgotPasswordButton.hidden = mode !== 'login';
    if (backToLoginButton) backToLoginButton.hidden = !forgot;
    loginModeButton.classList.toggle('is-active', mode === 'login');
    loginModeButton.setAttribute('aria-pressed', String(mode === 'login'));
    registerModeButton.classList.toggle('is-active', registering);
    registerModeButton.setAttribute('aria-pressed', String(registering));
    authTitle.textContent = text.title;
    authIntro.textContent = text.intro;
    authHint.textContent = text.hint;
    submitButton.textContent = text.submit;
    hideError();
  }

  function openDashboard(userId, displayName) {
    pendingUser = null;
    setLoggedIn(true);
    hideError();
    showNotice('');
    form.reset();
    if (welcomeText) {
      welcomeText.textContent = displayName ? `Olá, ${displayName}! Sua sessão fica salva neste navegador.` : '';
      welcomeText.hidden = !displayName;
    }
    document.dispatchEvent(new CustomEvent('professor:login', { detail: { userId } }));
  }

  function enterCompletion(user, message) {
    pendingUser = user;
    setLoggedIn(false);
    setMode('complete');
    nameInput.value = user.user_metadata?.display_name || '';
    showNotice(message || '');
  }

  async function finishRegistration(user, displayName, code, currentAttempt) {
    const { data, error } = await window.teacherSupabaseClient.rpc('register_teacher', {
      p_code: code.trim(),
      p_display_name: displayName.trim(),
    });
    if (currentAttempt !== authAttempt) return;
    if (error || data !== true) {
      enterCompletion(user);
      showError(error
        ? 'Não foi possível validar o convite. Confira a conexão e se o schema do Supabase está atualizado.'
        : 'Código de convite inválido, vencido ou esgotado. Peça um novo código à diretoria.');
      return;
    }

    const access = await hasTeacherAccess(user.id);
    if (currentAttempt !== authAttempt) return;
    if (!access.ok || !access.allowed) {
      enterCompletion(user);
      showError('O cadastro foi enviado, mas não foi possível confirmar a autorização. Tente novamente.');
      return;
    }
    openDashboard(user.id, access.displayName);
  }

  async function registerAccount(currentAttempt) {
    const displayName = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const code = codeInput.value;
    if (displayName.length < 2) return showError('Informe seu nome.');
    if (password.length < 8) return showError('Crie uma senha com pelo menos 8 caracteres.');
    if (code.trim().length < 12) return showError('Informe o código de convite fornecido pela diretoria.');

    const { data, error } = await window.teacherSupabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: `${window.location.origin}/professor.html`,
      },
    });
    if (currentAttempt !== authAttempt) return;
    const alreadyRegistered = error?.code === 'user_already_exists'
      || String(error?.message || '').toLowerCase().includes('already registered')
      || (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0);
    if (alreadyRegistered) return showError('Este e-mail já tem cadastro. Toque em Entrar e use sua senha.');
    if (error || !data?.user) {
      return showError(error?.code === 'weak_password'
        ? 'Senha fraca. Use pelo menos 8 caracteres, misturando letras e números.'
        : 'Não foi possível criar a conta agora. Confira o e-mail e tente novamente.');
    }

    if (!data.session) {
      setMode('login');
      passwordInput.value = '';
      showNotice(`Enviamos um e-mail de confirmação para ${email}. Confirme o e-mail e volte para entrar; você informará o código de convite para concluir o cadastro.`);
      return;
    }
    await finishRegistration(data.user, displayName, code, currentAttempt);
  }

  async function loginAccount(currentAttempt) {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const { data, error } = await window.teacherSupabaseClient.auth.signInWithPassword({ email, password });
    if (currentAttempt !== authAttempt) return;
    if (error || !data?.user) {
      const errorText = String(error?.message || '').toLowerCase();
      const invalidCredentials = error?.status === 400
        || error?.status === 401
        || error?.code === 'invalid_credentials'
        || errorText.includes('invalid login credentials')
        || errorText.includes('invalid credentials');
      const unconfirmed = error?.code === 'email_not_confirmed' || errorText.includes('email not confirmed');
      showError(unconfirmed
        ? 'Confirme seu e-mail pelo link que enviamos antes de entrar.'
        : invalidCredentials
        ? 'E-mail ou senha incorretos.'
        : 'Não foi possível conectar ao serviço de autenticação. Verifique a conexão e tente novamente.');
      return;
    }

    const access = await hasTeacherAccess(data.user.id);
    if (currentAttempt !== authAttempt) {
      await window.teacherSupabaseClient.auth.signOut();
      return;
    }
    if (!access.ok) {
      await window.teacherSupabaseClient.auth.signOut();
      setLoggedIn(false);
      showError('Não foi possível verificar sua autorização. Tente novamente ou peça ao administrador para conferir o Supabase.');
      return;
    }
    if (!access.allowed) {
      form.reset();
      enterCompletion(data.user, 'Conta confirmada. Falta só o código de convite da diretoria para liberar o painel.');
      return;
    }

    openDashboard(data.user.id, access.displayName);
  }

  async function completeAccount(currentAttempt) {
    const displayName = nameInput.value.trim();
    if (!pendingUser) return showError('Sua sessão expirou. Entre novamente.');
    if (displayName.length < 2) return showError('Informe seu nome.');
    if (codeInput.value.trim().length < 12) return showError('Informe o código de convite fornecido pela diretoria.');
    const access = await hasTeacherAccess(pendingUser.id);
    if (currentAttempt !== authAttempt) return;
    if (!access.ok) return showError('Não foi possível verificar sua autorização. Tente novamente.');
    if (access.allowed) return openDashboard(pendingUser.id, access.displayName);
    await finishRegistration(pendingUser, displayName, codeInput.value, currentAttempt);
  }

  async function sendPasswordRecovery(currentAttempt) {
    const { error } = await window.teacherSupabaseClient.auth.resetPasswordForEmail(emailInput.value.trim(), {
      redirectTo: `${window.location.origin}/professor.html?recuperacao=1`,
    });
    if (currentAttempt !== authAttempt) return;
    if (error) return showError('Não foi possível solicitar a recuperação. Confira o e-mail e tente novamente.');
    showNotice('Se o e-mail estiver cadastrado, enviaremos um link para redefinir sua senha.');
  }

  async function updatePassword(currentAttempt) {
    if (!recoverySession) return showError('Este link de recuperação não é válido. Solicite outro.');
    if (passwordInput.value.length < 8) return showError('Crie uma senha com pelo menos 8 caracteres.');
    if (passwordInput.value !== passwordConfirmation.value) return showError('As senhas não coincidem.');
    const { error } = await window.teacherSupabaseClient.auth.updateUser({ password: passwordInput.value });
    if (currentAttempt !== authAttempt) return;
    if (error) return showError('Não foi possível alterar a senha. Solicite um novo link ou tente novamente.');
    recoverySession = false;
    passwordInput.value = '';
    passwordConfirmation.value = '';
    const { error: signOutError } = await window.teacherSupabaseClient.auth.signOut({ scope: 'local' });
    if (signOutError) return showError('Senha alterada, mas não foi possível encerrar a sessão. Atualize a página e entre novamente.');
    if (window.history?.replaceState) window.history.replaceState(null, '', window.location.pathname);
    setMode('login');
    showNotice('Senha alterada. Entre com sua nova senha.');
  }

  loginModeButton.addEventListener('click', () => { showNotice(''); setMode('login'); });
  registerModeButton.addEventListener('click', () => { showNotice(''); setMode('register'); });
  forgotPasswordButton?.addEventListener('click', () => { showNotice(''); setMode('forgot'); });
  backToLoginButton?.addEventListener('click', () => { showNotice(''); setMode('login'); });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const currentAttempt = ++authAttempt;
    hideError();
    if (!window.teacherSupabaseClient) {
      showError('Autenticação indisponível. Peça ao administrador para configurar o Supabase.');
      return;
    }

    submitButton.disabled = true;
    for (const button of [loginModeButton, registerModeButton, forgotPasswordButton, backToLoginButton]) {
      if (button) button.disabled = true;
    }
    try {
      if (mode === 'register') await registerAccount(currentAttempt);
      else if (mode === 'complete') await completeAccount(currentAttempt);
      else if (mode === 'forgot') await sendPasswordRecovery(currentAttempt);
      else if (mode === 'recovery') await updatePassword(currentAttempt);
      else await loginAccount(currentAttempt);
    } catch (error) {
      console.error('Erro na autenticação do professor:', error);
      if (currentAttempt === authAttempt) showError('Não foi possível concluir a operação. Confira a conexão e tente novamente.');
    } finally {
      submitButton.disabled = false;
      for (const button of [loginModeButton, registerModeButton, forgotPasswordButton, backToLoginButton]) {
        if (button) button.disabled = false;
      }
    }
  });

  logoutButton.addEventListener('click', async () => {
    if (!localDemo && window.teacherSupabaseClient) {
      try {
        const { error } = await window.teacherSupabaseClient.auth.signOut();
        if (error) {
          if (welcomeText) {
            welcomeText.textContent = 'Não foi possível sair. Verifique a conexão e tente novamente.';
            welcomeText.hidden = false;
          }
          return;
        }
      } catch (error) {
        console.error('Erro ao sair da conta docente:', error);
        if (welcomeText) {
          welcomeText.textContent = 'Não foi possível sair. Verifique a conexão e tente novamente.';
          welcomeText.hidden = false;
        }
        return;
      }
    }
    setLoggedIn(false);
    hideError();
    returnToStudentLogin();
  });

  cancelButton?.addEventListener('click', async () => {
    if ((mode === 'complete' || mode === 'recovery') && window.teacherSupabaseClient) {
      try {
        const { error } = await window.teacherSupabaseClient.auth.signOut({ scope: 'local' });
        if (error) return showError('Não foi possível sair. Verifique a conexão e tente novamente.');
      } catch (error) {
        console.error('Erro ao sair da conta docente:', error);
        return showError('Não foi possível sair. Verifique a conexão e tente novamente.');
      }
    }
    returnToPreviousPage();
  });

  loginSection.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    if (mode === 'complete' || mode === 'recovery') cancelButton.click();
    else returnToPreviousPage();
  });

  async function restoreSession() {
    if (localDemo) {
      setLoggedIn(true);
      document.getElementById('localTeacherNotice').hidden = false;
      return;
    }

    if (!window.teacherSupabaseClient) {
      setLoggedIn(false);
      return;
    }

    const currentAttempt = authAttempt;
    let data;
    let error;
    try {
      ({ data, error } = await window.teacherSupabaseClient.auth.getSession());
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
    if (recoveryRedirect || recoverySession) {
      setLoggedIn(false);
      if (recoverySession && user) {
        setMode('recovery');
      } else {
        setMode('forgot');
        showError('O link de recuperação é inválido ou expirou. Solicite outro.');
      }
      return;
    }
    if (!user && window.supabaseClient) {
      let oldData;
      let oldError;
      try {
        ({ data: oldData, error: oldError } = await window.supabaseClient.auth.getSession());
      } catch (sessionError) {
        setLoggedIn(false);
        showError('Não foi possível verificar a sessão anterior. Atualize a página e tente novamente.');
        return;
      }
      if (currentAttempt !== authAttempt) return;
      if (oldError) {
        setLoggedIn(false);
        showError('Não foi possível verificar a sessão anterior. Atualize a página e tente novamente.');
        return;
      }
      const oldSession = oldData?.session;
      if (oldSession?.user && !oldSession.user.is_anonymous) {
        try {
          const { error: clearError } = await window.supabaseClient.auth.signOut({ scope: 'local' });
          if (clearError) {
            setLoggedIn(false);
            showError('Não foi possível separar a sessão anterior. Atualize a página e tente novamente.');
            return;
          }
          if (currentAttempt !== authAttempt) return;
          setLoggedIn(false);
          showNotice('Por uma atualização de segurança, entre novamente para separar sua sessão da sessão dos alunos.');
          return;
        } catch (sessionError) {
          setLoggedIn(false);
          showError('Não foi possível separar a sessão anterior. Atualize a página e tente novamente.');
          return;
        }
      }
    }
    const restoredUser = data?.session?.user;
    if (!restoredUser || restoredUser.is_anonymous) {
      setLoggedIn(false);
      return;
    }

    const access = await hasTeacherAccess(restoredUser.id);
    if (currentAttempt !== authAttempt) return;
    if (!access.ok) {
      setLoggedIn(false);
      showError('Não foi possível verificar sua autorização. Tente novamente ou peça ao administrador para conferir o Supabase.');
      return;
    }
    if (!access.allowed) {
      enterCompletion(restoredUser, 'Conta confirmada. Falta só o código de convite da diretoria para liberar o painel.');
      return;
    }

    openDashboard(restoredUser.id, access.displayName);
  }

  if (!localDemo && window.teacherSupabaseClient?.auth?.onAuthStateChange) {
    window.teacherSupabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session?.user) {
        recoverySession = true;
        setLoggedIn(false);
        setMode('recovery');
        showNotice('');
      }
    });
  }
  restoreSession();
})();
