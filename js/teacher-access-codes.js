(() => {
  const form = document.getElementById('schoolCodeForm');
  const classInput = document.getElementById('schoolCodeClass');
  const challengeClassInput = document.getElementById('challengeClass');
  const usesInput = document.getElementById('schoolCodeUses');
  const expiryInput = document.getElementById('schoolCodeExpiry');
  const feedback = document.getElementById('schoolCodeFeedback');
  const resultPanel = document.getElementById('newSchoolCode');
  const list = document.getElementById('schoolCodesList');

  if (!form || !window.supabaseClient) return;

  function showFeedback(message, isError = false) {
    feedback.textContent = message;
    feedback.classList.toggle('is-error', isError);
  }

  function createCode() {
    const bytes = new Uint8Array(12);
    window.crypto.getRandomValues(bytes);
    return `TURMA-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
  }

  async function hashCode(code) {
    const bytes = new TextEncoder().encode(code.trim().toUpperCase());
    const digest = await window.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  function renderNewCode(code, turma) {
    resultPanel.replaceChildren();
    const message = document.createElement('p');
    message.textContent = `Código da turma ${turma}. Copie e entregue aos alunos agora; ele não poderá ser consultado novamente.`;
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
        showFeedback('Código copiado. Compartilhe somente com os alunos desta turma.');
      } catch (error) {
        showFeedback('Selecione e copie o código exibido.', true);
      }
    });
    resultPanel.append(message, value, copyButton);
    resultPanel.hidden = false;
  }

  async function loadCodes() {
    list.replaceChildren();
    const { data: authData, error: authError } = await window.supabaseClient.auth.getUser();
    const teacherId = authData?.user?.id;
    if (authError || !teacherId) return;

    const { data: classes, error: classError } = await window.supabaseClient
      .from('teacher_classes')
      .select('turma')
      .eq('teacher_id', teacherId)
      .order('turma');
    const classPlaceholder = new Option('Selecione uma turma autorizada', '');
    classInput.replaceChildren(classPlaceholder);
    challengeClassInput?.replaceChildren(new Option('Selecione uma turma autorizada', ''));
    if (classError || !classes?.length) {
      classInput.disabled = true;
      if (challengeClassInput) challengeClassInput.disabled = true;
      const message = document.createElement('p');
      message.className = 'hint';
      message.textContent = 'Sua conta ainda não está associada a uma turma. Peça ao administrador para configurar teacher_classes no Supabase.';
      list.appendChild(message);
      return;
    }

    classes.forEach(({ turma }) => {
      classInput.add(new Option(turma, turma));
      challengeClassInput?.add(new Option(turma, turma));
    });
    classInput.disabled = false;
    if (challengeClassInput) challengeClassInput.disabled = false;

    const { data, error } = await window.supabaseClient
      .from('school_access_codes')
      .select('code_hash, school_name, turma, enabled, max_uses, used_count, expires_at, created_at')
      .eq('created_by', teacherId)
      .order('created_at', { ascending: false });

    if (error) {
      const message = document.createElement('p');
      message.className = 'hint';
      message.textContent = 'Associe sua conta de professor às turmas no Supabase para gerenciar códigos.';
      list.appendChild(message);
      return;
    }

    if (!data?.length) {
      const message = document.createElement('p');
      message.className = 'hint';
      message.textContent = 'Nenhum código criado para suas turmas.';
      list.appendChild(message);
      return;
    }

    data.forEach((item) => {
      const row = document.createElement('article');
      row.className = 'teacher-code-item';
      const details = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = `${item.turma} · ${item.enabled ? 'Ativo' : 'Revogado'}`;
      const uses = document.createElement('span');
      uses.textContent = `${Math.max(0, item.max_uses - item.used_count)} cadastros restantes`;
      details.append(title, uses);
      row.appendChild(details);

      if (item.enabled) {
        const revokeButton = document.createElement('button');
        revokeButton.type = 'button';
        revokeButton.className = 'btn btn--ghost';
        revokeButton.textContent = 'Revogar';
        revokeButton.addEventListener('click', async () => {
          const { data: revoked, error: revokeError } = await window.supabaseClient.rpc('revoke_school_access_code', {
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

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    resultPanel.hidden = true;
    const turma = classInput.value;
    const maxUses = Number(usesInput.value);
    if (!turma || !Number.isInteger(maxUses) || maxUses < 1 || maxUses > 500) {
      showFeedback('Escolha uma turma e um limite entre 1 e 500 cadastros.', true);
      return;
    }

    const code = createCode();
    const codeHash = await hashCode(code);
    const { data, error } = await window.supabaseClient.rpc('create_school_access_code', {
      p_code_hash: codeHash,
      p_turma: turma,
      p_max_uses: maxUses,
      p_expires_at: expiryInput.value ? new Date(`${expiryInput.value}T23:59:59`).toISOString() : null,
    });

    if (error || data !== true) {
      showFeedback('Código não criado. Confira se sua conta está associada a esta turma no Supabase.', true);
      return;
    }

    renderNewCode(code, turma);
    showFeedback('Código criado. Copie e entregue somente aos alunos desta turma.');
    form.reset();
    usesInput.value = '30';
    await loadCodes();
  });

  document.addEventListener('professor:login', loadCodes);
})();