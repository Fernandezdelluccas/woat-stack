(() => {
  const panel = document.getElementById('directorPanel');
  if (!panel) return;

  const localDemo = new URLSearchParams(window.location.search).get('modo') === 'local';
  if (localDemo || !window.createEphemeralSupabaseClient) {
    panel.hidden = true;
    return;
  }

  const loginForm = document.getElementById('directorLoginForm');
  const emailInput = document.getElementById('directorEmail');
  const passwordInput = document.getElementById('directorPassword');
  const loginError = document.getElementById('directorLoginError');
  const loginSection = document.getElementById('directorLogin');
  const codesSection = document.getElementById('directorCodes');
  const welcome = document.getElementById('directorWelcome');
  const logoutButton = document.getElementById('directorLogout');
  const codeForm = document.getElementById('schoolCodeForm');
  const classInput = document.getElementById('schoolCodeClass');
  const usesInput = document.getElementById('schoolCodeUses');
  const expiryInput = document.getElementById('schoolCodeExpiry');
  const feedback = document.getElementById('schoolCodeFeedback');
  const resultPanel = document.getElementById('newSchoolCode');
  const list = document.getElementById('schoolCodesList');
  const inviteForm = document.getElementById('teacherInviteForm');
  const inviteUsesInput = document.getElementById('teacherInviteUses');
  const inviteDaysInput = document.getElementById('teacherInviteDays');
  const inviteFeedback = document.getElementById('teacherInviteFeedback');
  const invitePanel = document.getElementById('newTeacherInvite');

  let client = null;
  let directorId = null;

  function showLoginError(message) {
    loginError.textContent = message;
    loginError.hidden = !message;
  }

  function showFeedback(message, isError = false) {
    feedback.textContent = message;
    feedback.classList.toggle('is-error', isError);
  }

  function createCode(prefix = 'TURMA') {
    const bytes = new Uint8Array(12);
    window.crypto.getRandomValues(bytes);
    return `${prefix}-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
  }

  async function hashCode(code) {
    const bytes = new TextEncoder().encode(code.trim().toUpperCase());
    const digest = await window.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  function setLoggedIn(value, displayName = '') {
    loginSection.hidden = value;
    codesSection.hidden = !value;
    welcome.textContent = value ? `Diretoria: ${displayName}` : '';
    if (!value) {
      resultPanel.hidden = true;
      resultPanel.replaceChildren();
      list.replaceChildren();
      showFeedback('');
      if (invitePanel) {
        invitePanel.hidden = true;
        invitePanel.replaceChildren();
      }
      if (inviteFeedback) inviteFeedback.textContent = '';
    }
  }

  async function signOut() {
    const current = client;
    client = null;
    directorId = null;
    if (current) await current.auth.signOut();
    setLoggedIn(false);
  }

  function renderNewCode(code, turma, target = resultPanel, notify = showFeedback, description = '') {
    target.replaceChildren();
    const message = document.createElement('p');
    message.textContent = description || `Código da turma ${turma}. Copie e repasse aos professores agora; ele não poderá ser consultado novamente.`;
    const value = document.createElement('code');
    value.className = 'teacher-code-value';
    value.textContent = code;
    const copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.className = 'btn btn--ghost';
    copyButton.textContent = 'Copiar código';
    copyButton.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(code);
        notify('Código copiado. Compartilhe somente com os responsáveis.');
      } catch (error) {
        notify('Selecione e copie o código exibido.', true);
      }
    });
    target.append(message, value, copyButton);
    target.hidden = false;
  }

  async function loadCodes() {
    list.replaceChildren();
    const { data, error } = await client
      .from('school_access_codes')
      .select('code_hash, turma, enabled, max_uses, used_count, expires_at, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    const note = (text) => {
      const message = document.createElement('p');
      message.className = 'hint';
      message.textContent = text;
      list.appendChild(message);
    };
    if (error) return note('Não foi possível carregar os códigos criados.');
    if (!data?.length) return note('Nenhum código criado ainda.');

    data.forEach((item) => {
      const row = document.createElement('article');
      row.className = 'teacher-code-item';
      const details = document.createElement('div');
      const title = document.createElement('strong');
      const expired = item.expires_at && new Date(item.expires_at) <= new Date();
      const status = !item.enabled ? 'Revogado' : expired ? 'Expirado' : 'Ativo';
      title.textContent = `${item.turma} · ${status}`;
      const uses = document.createElement('span');
      uses.textContent = `${Math.max(0, item.max_uses - item.used_count)} de ${item.max_uses} cadastros restantes`;
      details.append(title, uses);
      row.appendChild(details);

      if (item.enabled && !expired) {
        const revokeButton = document.createElement('button');
        revokeButton.type = 'button';
        revokeButton.className = 'btn btn--ghost';
        revokeButton.textContent = 'Revogar';
        revokeButton.addEventListener('click', async () => {
          const { data: revoked, error: revokeError } = await client.rpc('revoke_school_access_code', {
            p_code_hash: item.code_hash,
            p_turma: item.turma,
          });
          if (revokeError || revoked !== true) {
            showFeedback('Não foi possível revogar este código.', true);
            return;
          }
          showFeedback(`Código da turma ${item.turma} revogado.`);
          await loadCodes();
        });
        row.appendChild(revokeButton);
      }
      list.appendChild(row);
    });
  }

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    showLoginError('');
    const candidate = window.createEphemeralSupabaseClient();
    const { data, error } = await candidate.auth.signInWithPassword({
      email: emailInput.value.trim(),
      password: passwordInput.value,
    });
    if (error || !data?.user) {
      showLoginError('E-mail ou senha incorretos.');
      return;
    }

    const { data: director, error: directorError } = await candidate
      .from('school_directors')
      .select('display_name')
      .eq('user_id', data.user.id)
      .maybeSingle();
    if (directorError) {
      await candidate.auth.signOut();
      showLoginError('Não foi possível consultar a autorização da diretoria. Aplique o schema atualizado do Supabase e tente novamente.');
      return;
    }
    if (!director) {
      await candidate.auth.signOut();
      showLoginError('Esta conta não pertence à diretoria da escola.');
      return;
    }

    client = candidate;
    directorId = data.user.id;
    loginForm.reset();
    setLoggedIn(true, director.display_name);
    await loadCodes();
  });

  codeForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    resultPanel.hidden = true;
    const turma = classInput.value;
    const maxUses = Number(usesInput.value);
    if (!client || !directorId) {
      showFeedback('Entre com a conta da diretoria para criar códigos.', true);
      return;
    }
    if (!turma || !Number.isInteger(maxUses) || maxUses < 1 || maxUses > 500) {
      showFeedback('Escolha uma turma e um limite entre 1 e 500 cadastros.', true);
      return;
    }

    const code = createCode();
    const { data, error } = await client.rpc('create_school_access_code', {
      p_code_hash: await hashCode(code),
      p_turma: turma,
      p_max_uses: maxUses,
      p_expires_at: expiryInput.value ? new Date(`${expiryInput.value}T23:59:59`).toISOString() : null,
    });
    if (error || data !== true) {
      showFeedback('Código não criado. Confira a validade e se sua conta está cadastrada como diretoria.', true);
      return;
    }

    renderNewCode(code, turma);
    showFeedback('Código criado. Ele aparece completo apenas agora.');
    codeForm.reset();
    usesInput.value = '30';
    await loadCodes();
  });

  inviteForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    invitePanel.hidden = true;
    const setInviteFeedback = (message, isError = false) => {
      inviteFeedback.textContent = message;
      inviteFeedback.classList.toggle('is-error', isError);
    };
    if (!client || !directorId) {
      setInviteFeedback('Entre com a conta da diretoria para convidar professores.', true);
      return;
    }

    const turmas = Array.from(inviteForm.querySelectorAll?.('input[name="teacherInviteClass"]') || [])
      .filter((input) => input.checked)
      .map((input) => input.value);
    const maxUses = Number(inviteUsesInput.value);
    const days = Number(inviteDaysInput.value);
    if (!turmas.length || !Number.isInteger(maxUses) || maxUses < 1 || maxUses > 50 || !Number.isInteger(days) || days < 1 || days > 30) {
      setInviteFeedback('Escolha ao menos uma turma, de 1 a 50 professores e validade de 1 a 30 dias.', true);
      return;
    }

    const code = createCode('PROF');
    const { data, error } = await client.rpc('create_teacher_invite_code', {
      p_code_hash: await hashCode(code),
      p_turmas: turmas,
      p_max_uses: maxUses,
      p_expires_at: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
    });
    if (error || data !== true) {
      setInviteFeedback('Convite não criado. Aplique o schema atualizado do Supabase e confirme que sua conta é da diretoria.', true);
      return;
    }

    renderNewCode(code, '', invitePanel, setInviteFeedback, `Convite para ${turmas.join(', ')}, válido por ${days} dia(s). Copie e envie ao professor agora; ele não poderá ser consultado novamente.`);
    setInviteFeedback('Convite criado. O professor deve abrir a Área do professor, tocar em Criar conta e informar este código.');
    inviteForm.reset?.();
  });

  logoutButton.addEventListener('click', signOut);
  window.addEventListener('pagehide', () => { client?.auth.signOut(); });
})();
