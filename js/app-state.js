(function () {
  const STORAGE_KEYS = {
    player: 'genios-player',
    accounts: 'genios-accounts',
    ranking: 'genios-ranking',
    professor: 'genios-professor-auth',
    coins: 'genios-coins',
    gameHistory: 'genios-game-history',
    gameDraft: 'genios-game-draft',
    questionReports: 'genios-question-reports',
    gamePreferences: 'genios-game-preferences',
    cosmetics: 'genios-cosmetics',
    selectedCosmetic: 'genios-selected-cosmetic',
    character: 'genios-character',
    achievements: 'genios-achievements',
    challenges: 'genios-challenges',
    classChallenges: 'genios-class-challenges',
  };
  const PROFILE_STATE_KEYS = [
    STORAGE_KEYS.gamePreferences,
    STORAGE_KEYS.cosmetics,
    STORAGE_KEYS.selectedCosmetic,
    STORAGE_KEYS.character,
    STORAGE_KEYS.achievements,
    STORAGE_KEYS.questionReports,
  ];
  let profileStateSyncTimer = null;

  const cosmeticsCatalog = [
    { id: 'starter', label: 'Mascote base', emoji: '🦊', price: 0, unlocks: ['🦊'] },
    { id: 'wizard', label: 'Chapéu mágico', emoji: '🧢', price: 40, unlocks: ['🧢'] },
    { id: 'rainbow', label: 'Fita arco-íris', emoji: '🎀', price: 60, unlocks: ['🎀'] },
    { id: 'star', label: 'Óculos estrela', emoji: '🕶️', price: 90, unlocks: ['🕶️'] },
    { id: 'crown', label: 'Coroa', emoji: '👑', price: 120, unlocks: ['👑'] },
  ];

  const characterCatalog = [
    { id: 'base-fox', slot: 'base', category: 'personagem', label: 'Raposa', emoji: '🦊', price: 0 },
    { id: 'base-cat', slot: 'base', category: 'personagem', label: 'Gatinho', emoji: '🐱', price: 25 },
    { id: 'base-owl', slot: 'base', category: 'personagem', label: 'Corujinha', emoji: '🦉', price: 25 },
    { id: 'base-dino', slot: 'base', category: 'personagem', label: 'Dinossauro', emoji: '🦕', price: 30 },
    { id: 'base-unicorn', slot: 'base', category: 'personagem', label: 'Unicórnio', emoji: '🦄', price: 45 },
    { id: 'base-robot', slot: 'base', category: 'personagem', label: 'Robô', emoji: '🤖', price: 40 },
    { id: 'base-panda', slot: 'base', category: 'personagem', label: 'Panda', emoji: '🐼', price: 35 },
    { id: 'base-penguin', slot: 'base', category: 'personagem', label: 'Pinguim', emoji: '🐧', price: 35 },
    { id: 'base-lion', slot: 'base', category: 'personagem', label: 'Leãozinho', emoji: '🦁', price: 50 },
    { id: 'base-koala', slot: 'base', category: 'personagem', label: 'Coala', emoji: '🐨', price: 45 },
    { id: 'base-frog', slot: 'base', category: 'personagem', label: 'Sapinho', emoji: '🐸', price: 35 },
    { id: 'base-bear', slot: 'base', category: 'personagem', label: 'Ursinho', emoji: '🐻', price: 45 },
    { id: 'base-chick', slot: 'base', category: 'personagem', label: 'Pintinho', emoji: '🐤', price: 30 },
    { id: 'base-octopus', slot: 'base', category: 'personagem', label: 'Polvinho', emoji: '🐙', price: 50 },
    { id: 'hair-none', slot: 'hair', category: 'cabelo', label: 'Sem acessório', emoji: '', price: 0 },
    { id: 'hair-rainbow', slot: 'hair', category: 'cabelo', label: 'Laço arco-íris', emoji: '🎀', price: 35 },
    { id: 'hair-cap', slot: 'hair', category: 'cabelo', label: 'Boné', emoji: '🧢', price: 45 },
    { id: 'hair-crown', slot: 'hair', category: 'cabelo', label: 'Coroa', emoji: '👑', price: 120 },
    { id: 'hair-flower', slot: 'hair', category: 'cabelo', label: 'Flor', emoji: '🌼', price: 30 },
    { id: 'hair-star', slot: 'hair', category: 'cabelo', label: 'Estrela', emoji: '🌟', price: 45 },
    { id: 'accessory-none', slot: 'accessory', category: 'acessório', label: 'Sem acessório', emoji: '', price: 0 },
    { id: 'accessory-glasses', slot: 'accessory', category: 'acessório', label: 'Óculos estrela', emoji: '🕶️', price: 90 },
    { id: 'accessory-headphones', slot: 'accessory', category: 'acessório', label: 'Fone colorido', emoji: '🎧', price: 80 },
    { id: 'accessory-backpack', slot: 'accessory', category: 'acessório', label: 'Mochila', emoji: '🎒', price: 65 },
    { id: 'accessory-scarf', slot: 'accessory', category: 'acessório', label: 'Cachecol', emoji: '🧣', price: 45 },
    { id: 'accessory-wand', slot: 'accessory', category: 'acessório', label: 'Varinha mágica', emoji: '🪄', price: 75 },
  ];

  const achievementCatalog = [
    { id: 'first-game', title: 'Primeira aventura', description: 'Termine seu primeiro jogo.', emoji: '🚀' },
    { id: 'ten-correct', title: 'Mente afiada', description: 'Acerte 10 perguntas em uma aventura.', emoji: '🧠' },
    { id: 'coin-collector', title: 'Colecionador', description: 'Junte 100 moedas.', emoji: '★' },
    { id: 'five-games', title: 'Viajante', description: 'Complete cinco aventuras.', emoji: '🧭' },
    { id: 'all-subjects', title: 'Explorador', description: 'Jogue os cinco minijogos.', emoji: '🗺️' },
    { id: 'perfect-game', title: 'Precisão total', description: 'Termine uma aventura sem erros.', emoji: '🎯' },
    { id: 'streak-master', title: 'Sequência brilhante', description: 'Acerte cinco questões seguidas.', emoji: '🔥' },
    { id: 'speed-run', title: 'Raciocínio veloz', description: 'Conclua uma aventura em até 2 minutos.', emoji: '⚡' },
  ];
  let schoolEnrollmentPermit = null;

  function readJson(key, fallback) {
    try {
      const saved = localStorage.getItem(key);
      if (!saved) return fallback;
      return JSON.parse(saved) ?? fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function hashString(value) {
    const bytes = new TextEncoder().encode(value.trim());
    let hash = 2166136261;
    for (let i = 0; i < bytes.length; i += 1) {
      hash ^= bytes[i];
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16);
  }

  function normalizePlayer(player) {
    if (!player || typeof player !== 'object') return null;
    return {
      nome: String(player.nome || 'Jogador').trim(),
      email: String(player.email || '').trim(),
      turma: String(player.turma || '4º ano'),
      avatar: String(player.avatar || '🦊'),
      accountType: player.accountType === 'outside' ? 'outside' : 'school',
      passwordHash: String(player.passwordHash || ''),
      supabaseProfileId: String(player.supabaseProfileId || ''),
      supabaseUserId: String(player.supabaseUserId || ''),
      localOnly: Boolean(player.localOnly),
      coins: Number(player.coins || 0),
      lastPlayed: player.lastPlayed || new Date().toISOString(),
    };
  }

  function getPlayer() {
    const player = readJson(STORAGE_KEYS.player, null);
    return normalizePlayer(player);
  }

  function getScopedStorageKey(key) {
    const player = getPlayer();
    return player?.email ? `${key}:${encodeURIComponent(player.email)}` : key;
  }

  function readScopedJson(key, fallback) {
    const scopedKey = getScopedStorageKey(key);
    if (scopedKey !== key) {
      const migrationKey = `genios-migrated:${key}`;
      const legacyValue = localStorage.getItem(key);
      if (legacyValue && localStorage.getItem(migrationKey) !== 'true') {
        localStorage.setItem(scopedKey, legacyValue);
        localStorage.setItem(migrationKey, 'true');
      }
    }
    return readJson(scopedKey, fallback);
  }

  function writeScopedJson(key, value) {
    writeJson(getScopedStorageKey(key), value);
    if (PROFILE_STATE_KEYS.includes(key)) queueProfileStateSync();
  }

  function queueProfileStateSync() {
    const player = getPlayer();
    if (!player || player.localOnly || typeof window.setTimeout !== 'function') return;
    if (profileStateSyncTimer !== null) window.clearTimeout(profileStateSyncTimer);
    profileStateSyncTimer = window.setTimeout(() => {
      profileStateSyncTimer = null;
      syncProfileState();
    }, 1200);
  }

  function getAccounts() {
    const accounts = readJson(STORAGE_KEYS.accounts, null);
    if (Array.isArray(accounts)) return accounts.map(normalizePlayer).filter(Boolean);

    const legacyPlayer = normalizePlayer(readJson(STORAGE_KEYS.player, null));
    const migratedAccounts = legacyPlayer?.email && legacyPlayer?.passwordHash ? [legacyPlayer] : [];
    writeJson(STORAGE_KEYS.accounts, migratedAccounts);
    return migratedAccounts;
  }

  function setPlayer(player) {
    const normalized = normalizePlayer(player);
    if (!normalized || !normalized.nome) return null;
    writeJson(STORAGE_KEYS.player, normalized);

    const accounts = getAccounts();
    const accountIndex = accounts.findIndex((account) => account.email === normalized.email);
    if (accountIndex >= 0) {
      accounts[accountIndex] = { ...accounts[accountIndex], ...normalized };
      writeJson(STORAGE_KEYS.accounts, accounts);
    }

    return normalized;
  }

  async function getAnonymousSupabaseUser() {
    const client = window.supabaseClient;
    if (!client?.auth?.getSession || !client.auth.signInAnonymously) {
      return { ok: false, message: 'Supabase Auth não está disponível.' };
    }

    try {
      const { data, error } = await client.auth.getSession();
      if (error) return { ok: false, message: 'Não foi possível verificar a sessão remota.' };
      let user = data?.session?.user;
      if (user && user.is_anonymous !== true) {
        return { ok: false, message: 'A sessão atual não é um perfil de aluno anônimo.' };
      }

      if (!user) {
        const result = await client.auth.signInAnonymously();
        if (result.error || !result.data?.user) {
          return { ok: false, message: 'Ative o login anônimo no Supabase para sincronizar neste aparelho.' };
        }
        user = result.data.user;
      }

      if (user.is_anonymous !== true) {
        return { ok: false, message: 'O Supabase não retornou uma sessão anônima válida.' };
      }
      return { ok: true, client, user };
    } catch (error) {
      return { ok: false, message: 'O Supabase não respondeu; os dados continuam neste aparelho.' };
    }
  }

  async function syncActiveProfile() {
    const player = getPlayer();
    if (!player) return { ok: false, localOnly: true, message: 'Nenhum perfil está ativo.' };
    if (player.localOnly) return { ok: false, localOnly: true, message: 'O modo de teste local não envia dados ao Supabase.' };

    const auth = await getAnonymousSupabaseUser();
    if (!auth.ok) return { ...auth, localOnly: true };
    if (player.supabaseUserId && player.supabaseUserId !== auth.user.id) {
      return { ok: false, localOnly: true, message: 'A sessão remota original foi perdida; os dados continuam neste aparelho para evitar duplicar o perfil.' };
    }

    const { data: existing, error: lookupError } = await auth.client
      .from('profiles')
      .select('id')
      .eq('auth_user_id', auth.user.id)
      .eq('nome', player.nome)
      .eq('turma', player.turma)
      .maybeSingle();
    if (lookupError) return { ok: false, localOnly: true, message: 'Não foi possível consultar o perfil remoto.' };

    let profileId = existing?.id;
    if (!profileId) {
      const { data, error } = await auth.client.rpc('create_student_profile', {
        p_nome: player.nome,
        p_turma: player.turma,
        p_avatar: player.avatar,
        p_account_type: player.accountType,
      });
      if (error || typeof data !== 'string' || data.length === 0) {
        return { ok: false, localOnly: true, message: 'O perfil continua neste aparelho; não foi possível sincronizá-lo.' };
      }
      profileId = data;
    }

    const syncedPlayer = { ...player, supabaseProfileId: profileId, supabaseUserId: auth.user.id };
    setPlayer(syncedPlayer);
    return { ok: true, profileId, userId: auth.user.id, client: auth.client };
  }

  function clearPlayer() {
    localStorage.removeItem(STORAGE_KEYS.player);
  }

  async function authorizeSchoolEnrollment({ code, turma }) {
    const cleanCode = String(code || '').trim();
    const cleanClass = String(turma || '').trim();
    if (!cleanCode || !cleanClass) {
      return { ok: false, message: 'Peça ao professor o código da sua turma.' };
    }
    if (!window.supabaseClient) {
      return { ok: false, message: 'A validação da escola está indisponível. Peça ajuda ao professor.' };
    }

    const auth = await getAnonymousSupabaseUser();
    if (!auth.ok) return { ok: false, message: auth.message };

    const { data, error } = await auth.client.rpc('validate_school_access_code', {
      p_code: cleanCode,
      p_turma: cleanClass,
    });
    if (error) {
      console.error('Erro ao validar código escolar:', error.message);
      return { ok: false, message: 'Não foi possível validar o código agora. Tente novamente.' };
    }
    if (data !== true) {
      return { ok: false, message: 'Código da escola incorreto ou não liberado para esta turma.' };
    }

    schoolEnrollmentPermit = {
      turma: cleanClass,
      expiresAt: Date.now() + 60_000,
    };
    return { ok: true };
  }

  function authorizeLocalSchoolEnrollment({ turma }) {
    const cleanClass = String(turma || '').trim();
    if (!cleanClass) return { ok: false, message: 'Selecione a turma para o perfil local.' };
    schoolEnrollmentPermit = {
      turma: cleanClass,
      expiresAt: Date.now() + 60_000,
      local: true,
    };
    return { ok: true, local: true };
  }

  function registerUser({ nome, email, password, turma, avatar, accountType }) {
    const safeName = String(nome || '').trim();
    const safeAccountType = accountType === 'outside' ? 'outside' : 'school';
    const safeClass = String(turma || (safeAccountType === 'outside' ? 'Visitante' : '')).trim();
    if (!safeName || !password || (safeAccountType === 'school' && !safeClass)) {
      return { ok: false, message: 'Informe seu nome, PIN e turma.' };
    }
    if (!/^\d{4}$/.test(String(password))) {
      return { ok: false, message: 'O PIN precisa ter exatamente 4 números.' };
    }
    if (safeAccountType === 'school') {
      const permitIsValid = schoolEnrollmentPermit
        && schoolEnrollmentPermit.turma === safeClass
        && schoolEnrollmentPermit.expiresAt >= Date.now();
      schoolEnrollmentPermit = null;
      if (!permitIsValid) {
        return { ok: false, message: 'Peça ao professor o código da sua turma antes de criar o perfil.' };
      }
    }

    const identity = `${safeAccountType}|${safeName.toLocaleLowerCase('pt-BR')}|${safeClass.toLocaleLowerCase('pt-BR')}`;
    const safeEmail = email
      ? String(email).trim().toLowerCase()
      : `perfil-${hashString(identity)}@genios.local`;

    const accounts = getAccounts();
    if (accounts.some((account) => account.email?.toLowerCase() === safeEmail)) {
      return {
        ok: false,
        message: email
          ? 'Este e-mail já está em uso.'
          : 'Esse nome já tem perfil nessa turma. Tente outro apelido.',
      };
    }

    const profile = {
      nome: safeName,
      email: safeEmail,
      turma: turma || '4º ano',
      avatar: avatar || '🦊',
      accountType: safeAccountType,
      passwordHash: hashString(password),
      coins: 0,
      lastPlayed: new Date().toISOString(),
    };

    accounts.push(profile);
    writeJson(STORAGE_KEYS.accounts, accounts);
    writeJson(STORAGE_KEYS.player, profile);
    return { ok: true, profile };
  }

  function loginUser({ email, nome, turma, password, accountType }) {
    const safeEmail = String(email || '').trim().toLowerCase();
    const safeName = String(nome || '').trim().toLocaleLowerCase('pt-BR');
    const safeClass = String(turma || '').trim().toLocaleLowerCase('pt-BR');
    const accounts = getAccounts();
    const candidates = safeEmail
      ? accounts.filter((account) => account.email?.toLowerCase() === safeEmail)
      : accounts.filter((account) => (
          account.nome.toLocaleLowerCase('pt-BR') === safeName
          && (!accountType || account.accountType === accountType)
          && (account.accountType === 'outside' || account.turma.toLocaleLowerCase('pt-BR') === safeClass)
        ));
    if (candidates.length === 0) {
      return {
        ok: false,
        code: 'PROFILE_NOT_FOUND',
        message: 'Esse perfil ainda não foi criado neste dispositivo.',
      };
    }

    const stored = candidates.find((account) => account.passwordHash === hashString(password));
    if (!stored || (accountType && stored.accountType !== accountType)) {
      return { ok: false, code: 'INVALID_PIN', message: 'Esse PIN não corresponde ao perfil.' };
    }

    const player = normalizePlayer(stored);
    localStorage.setItem('genios-session', 'true');
    setPlayer({ ...player, lastPlayed: new Date().toISOString() });
    return { ok: true, profile: player };
  }

  function logoutUser() {
    localStorage.removeItem('genios-session');
    clearPlayer();
  }

  function getCoins() {
    const player = getPlayer();
    if (!player) return 0;
    return Number(player.coins || 0);
  }

  function addCoins(amount) {
    const player = getPlayer();
    if (!player) return 0;
    const nextCoins = Math.max(0, Number(player.coins || 0) + Number(amount || 0));
    setPlayer({ ...player, coins: nextCoins });
    return nextCoins;
  }

  function getUnlockedCosmetics() {
    const saved = readScopedJson(STORAGE_KEYS.cosmetics, ['starter']);
    return Array.isArray(saved) ? saved : ['starter'];
  }

  function setUnlockedCosmetics(list) {
    writeScopedJson(STORAGE_KEYS.cosmetics, list);
  }

  function getSelectedCosmetic() {
    return localStorage.getItem(getScopedStorageKey(STORAGE_KEYS.selectedCosmetic)) || 'starter';
  }

  function setSelectedCosmetic(id) {
    const unlocked = getUnlockedCosmetics();
    if (!unlocked.includes(id)) return false;
    localStorage.setItem(getScopedStorageKey(STORAGE_KEYS.selectedCosmetic), id);
    const player = getPlayer();
    if (player) {
      const nextAvatar = cosmeticsCatalog.find((item) => item.id === id)?.emoji || player.avatar || '🦊';
      setPlayer({ ...player, avatar: nextAvatar });
    }
    queueProfileStateSync();
    return true;
  }

  function buyCosmetic(id) {
    const item = cosmeticsCatalog.find((entry) => entry.id === id);
    if (!item) return { ok: false, message: 'Item não encontrado.' };

    const player = getPlayer();
    const unlocked = getUnlockedCosmetics();
    if (unlocked.includes(id)) {
      return { ok: true, message: 'Você já desbloqueou este item.', alreadyOwned: true };
    }

    const coins = Number(player?.coins || 0);
    if (coins < item.price) {
      return { ok: false, message: 'Moedas insuficientes para esse item.' };
    }

    const nextCoins = coins - item.price;
    setPlayer({ ...(player || { nome: 'Jogador' }), coins: nextCoins, avatar: player?.avatar || '🦊' });
    setUnlockedCosmetics([...unlocked, id]);
    return { ok: true, message: 'Item desbloqueado!', coins: nextCoins };
  }

  function getCharacterUnlocks() {
    const unlocked = getUnlockedCosmetics();
    return Array.from(new Set([...unlocked, 'base-fox', 'hair-none', 'accessory-none']));
  }

  function getEquippedCharacter() {
    const defaultLook = {
      base: 'base-fox',
      hair: 'hair-none',
      accessory: 'accessory-none',
    };
    const saved = readScopedJson(STORAGE_KEYS.character, defaultLook);
    return { ...defaultLook, ...(saved && typeof saved === 'object' ? saved : {}) };
  }

  function equipCharacterItem(id) {
    const item = characterCatalog.find((entry) => entry.id === id);
    if (!item || !getCharacterUnlocks().includes(id)) return false;
    writeScopedJson(STORAGE_KEYS.character, { ...getEquippedCharacter(), [item.slot]: id });
    if (item.slot === 'base') {
      const player = getPlayer();
      if (player) setPlayer({ ...player, avatar: item.emoji });
    }
    return true;
  }

  function buyCharacterItem(id) {
    const item = characterCatalog.find((entry) => entry.id === id);
    if (!item) return { ok: false, message: 'Item não encontrado.' };
    if (getCharacterUnlocks().includes(id)) return { ok: true, alreadyOwned: true };

    const player = getPlayer();
    const coins = Number(player?.coins || 0);
    if (coins < item.price) return { ok: false, message: 'Moedas insuficientes para esse item.' };

    setPlayer({ ...(player || { nome: 'Jogador' }), coins: coins - item.price });
    setUnlockedCosmetics([...getUnlockedCosmetics(), id]);
    return { ok: true, coins: coins - item.price };
  }

  function getAchievements() {
    return readScopedJson(STORAGE_KEYS.achievements, []);
  }

  function unlockAchievement(id) {
    if (!achievementCatalog.some((item) => item.id === id)) return false;
    const current = getAchievements();
    if (current.includes(id)) return false;
    writeScopedJson(STORAGE_KEYS.achievements, [...current, id]);
    return true;
  }

  function getGameHistory() {
    const history = readScopedJson(STORAGE_KEYS.gameHistory, []);
    return Array.isArray(history) ? history : [];
  }

  function getGameDraft(gameKey) {
    const draft = readScopedJson(STORAGE_KEYS.gameDraft, null);
    return draft && (!gameKey || draft.gameKey === gameKey) ? draft : null;
  }

  function saveGameDraft(draft) {
    const gameKeys = ['adicao', 'subtracao', 'multiplicacao', 'divisao', 'formas'];
    if (!draft || !gameKeys.includes(draft.gameKey) || !Array.isArray(draft.questions)) return false;
    writeScopedJson(STORAGE_KEYS.gameDraft, {
      ...draft,
      index: Math.max(0, Math.floor(Number(draft.index) || 0)),
      savedAt: new Date().toISOString(),
    });
    return true;
  }

  function clearGameDraft() {
    localStorage.removeItem(getScopedStorageKey(STORAGE_KEYS.gameDraft));
  }

  function getGamePreferences(gameKey) {
    const preferences = readScopedJson(STORAGE_KEYS.gamePreferences, {});
    return preferences?.[gameKey] || { goalTarget: 2, untimed: false };
  }

  function saveGamePreferences(gameKey, preferences) {
    const validGames = ['adicao', 'subtracao', 'multiplicacao', 'divisao', 'formas'];
    if (!validGames.includes(gameKey)) return false;
    const current = readScopedJson(STORAGE_KEYS.gamePreferences, {});
    const goalTarget = Math.max(1, Math.min(4, Math.floor(Number(preferences?.goalTarget) || 2)));
    writeScopedJson(STORAGE_KEYS.gamePreferences, {
      ...current,
      [gameKey]: { goalTarget, untimed: Boolean(preferences?.untimed) },
    });
    return true;
  }

  function saveQuestionReport(report) {
    const clean = {
      id: `report-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      gameKey: ['adicao', 'subtracao', 'multiplicacao', 'divisao', 'formas'].includes(report?.gameKey) ? report.gameKey : 'adicao',
      prompt: String(report?.prompt || '').trim().slice(0, 500),
      reason: String(report?.reason || '').trim().slice(0, 500),
      createdAt: new Date().toISOString(),
    };
    if (!clean.prompt || !clean.reason) return { ok: false, message: 'Escolha um motivo e descreva o problema.' };
    const reports = readScopedJson(STORAGE_KEYS.questionReports, []);
    writeScopedJson(STORAGE_KEYS.questionReports, [clean, ...reports].slice(0, 30));
    return { ok: true, report: clean };
  }

  function exportActiveProfile() {
    const player = getPlayer();
    if (!player) return { ok: false, message: 'Entre em um perfil primeiro.' };
    const account = getAccounts().find((item) => item.email === player.email);
    if (!account) return { ok: false, message: 'Não foi possível encontrar os dados deste perfil.' };

    const scopedData = {};
    [STORAGE_KEYS.gameHistory, STORAGE_KEYS.gameDraft, STORAGE_KEYS.gamePreferences, STORAGE_KEYS.cosmetics, STORAGE_KEYS.selectedCosmetic, STORAGE_KEYS.character, STORAGE_KEYS.achievements, STORAGE_KEYS.challenges, STORAGE_KEYS.questionReports]
      .forEach((key) => {
        const stored = localStorage.getItem(getScopedStorageKey(key));
        if (stored !== null) scopedData[key] = JSON.parse(stored);
      });

    return { ok: true, backup: { version: 1, exportedAt: new Date().toISOString(), account, scopedData } };
  }

  function importProfileBackup(backup) {
    const account = normalizePlayer(backup?.account);
    if (backup?.version !== 1 || !account?.email || !account.passwordHash || !account.nome || !backup.scopedData) {
      return { ok: false, message: 'Este arquivo não parece ser uma cópia válida de perfil.' };
    }

    const accounts = getAccounts();
    const accountIndex = accounts.findIndex((item) => item.email === account.email);
    if (accountIndex >= 0) accounts[accountIndex] = account;
    else accounts.push(account);
    writeJson(STORAGE_KEYS.accounts, accounts);
    setPlayer(account);

    [STORAGE_KEYS.gameHistory, STORAGE_KEYS.gameDraft, STORAGE_KEYS.gamePreferences, STORAGE_KEYS.cosmetics, STORAGE_KEYS.selectedCosmetic, STORAGE_KEYS.character, STORAGE_KEYS.achievements, STORAGE_KEYS.challenges, STORAGE_KEYS.questionReports]
      .forEach((key) => {
        if (Object.hasOwn(backup.scopedData, key)) writeScopedJson(key, backup.scopedData[key]);
      });
    return { ok: true, profile: account };
  }

  async function deleteActiveProfile() {
    const player = getPlayer();
    if (!player) return { ok: false, message: 'Nenhum perfil está ativo.' };
    if (player.supabaseProfileId && !player.localOnly) {
      const auth = await getAnonymousSupabaseUser();
      if (!auth.ok) return { ok: false, message: 'Não foi possível confirmar a sessão remota; o perfil local foi mantido.' };
      try {
        const { error } = await auth.client.from('profiles')
          .delete()
          .eq('id', player.supabaseProfileId)
          .eq('auth_user_id', auth.user.id);
        if (error) return { ok: false, message: 'Não foi possível excluir o perfil remoto; os dados locais foram mantidos.' };
      } catch (error) {
        return { ok: false, message: 'A conexão falhou; os dados locais foram mantidos.' };
      }
    }
    const accounts = getAccounts().filter((account) => account.email !== player.email);
    writeJson(STORAGE_KEYS.accounts, accounts);
    [STORAGE_KEYS.player, 'genios-session'].forEach((key) => localStorage.removeItem(key));
    [STORAGE_KEYS.gameHistory, STORAGE_KEYS.gameDraft, STORAGE_KEYS.gamePreferences, STORAGE_KEYS.cosmetics, STORAGE_KEYS.selectedCosmetic, STORAGE_KEYS.character, STORAGE_KEYS.achievements, STORAGE_KEYS.challenges, STORAGE_KEYS.questionReports]
      .forEach((key) => localStorage.removeItem(`${key}:${encodeURIComponent(player.email)}`));

    if (player.accountType === 'school') {
      const rankingKey = `${STORAGE_KEYS.ranking}:school:${encodeURIComponent(player.turma)}`;
      const ranking = readJson(rankingKey, []);
      writeJson(rankingKey, ranking.filter((entry) => entry.name !== player.nome || entry.turma !== player.turma));
    }
    return { ok: true };
  }

  function saveGameSession(session) {
    const gameKeys = ['adicao', 'subtracao', 'multiplicacao', 'divisao', 'formas'];
    const validated = validateScore(session);
    const entry = {
      id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      gameKey: gameKeys.includes(session?.gameKey) ? session.gameKey : 'adicao',
      points: validated.points,
      correct: validated.correct,
      wrong: validated.wrong,
      seconds: Math.max(0, Math.floor(Number(session?.seconds) || 0)),
      bestStreak: Math.max(0, Math.floor(Number(session?.bestStreak) || 0)),
      answers: Array.isArray(session?.answers) ? session.answers.slice(0, 100) : [],
      challengeId: String(session?.challengeId || '').slice(0, 80),
      challengeTitle: String(session?.challengeTitle || '').slice(0, 80),
      completedAt: new Date().toISOString(),
    };
    const history = [...getGameHistory(), entry].slice(-100);
    writeScopedJson(STORAGE_KEYS.gameHistory, history);
    return history;
  }

  async function syncGameSession(session) {
    if (!session?.id) return { ok: false, localOnly: true, message: 'Sessão sem identificador local.' };
    const profile = await syncActiveProfile();
    if (!profile.ok) return profile;

    const validated = validateScore({ points: session.points, acertos: session.correct, erros: session.wrong });
    try {
      const { error } = await profile.client.from('game_sessions').insert({
        profile_id: profile.profileId,
        client_session_id: session.id,
        game_key: session.gameKey,
        score: validated.points,
        correct_answers: validated.correct,
        wrong_answers: validated.wrong,
        elapsed_seconds: Math.max(0, Math.floor(Number(session.seconds) || 0)),
        best_streak: Math.max(0, Math.floor(Number(session.bestStreak) || 0)),
        answer_log: Array.isArray(session.answers) ? session.answers.slice(0, 100) : [],
        challenge_id: session.challengeId || null,
        challenge_title: session.challengeTitle || null,
      });

      if (error && error.code !== '23505') {
        return { ok: false, localOnly: true, message: 'A partida continua salva neste aparelho; não foi possível sincronizar.' };
      }

      const history = getGameHistory().map((entry) => (
        entry.id === session.id ? { ...entry, syncedAt: new Date().toISOString() } : entry
      ));
      writeScopedJson(STORAGE_KEYS.gameHistory, history);
      return { ok: true, duplicate: error?.code === '23505' };
    } catch (error) {
      return { ok: false, localOnly: true, message: 'A partida continua salva neste aparelho; a conexão falhou.' };
    }
  }

  async function syncPendingGameSessions() {
    const pending = getGameHistory().filter((session) => !session.syncedAt);
    let synced = 0;
    for (const session of pending) {
      const result = await syncGameSession(session);
      if (result.ok) synced += 1;
      else return { ...result, synced, pending: pending.length - synced };
    }
    return { ok: true, synced, pending: 0 };
  }

  function mergeProfileStateValue(key, localValue, remoteValue) {
    if (localValue === null || localValue === undefined) return remoteValue;
    if (remoteValue === null || remoteValue === undefined) return localValue;
    if (Array.isArray(localValue) && Array.isArray(remoteValue)) {
      const values = [...remoteValue, ...localValue];
      const unique = new Map(values.map((item) => [item?.id || item, item]));
      return Array.from(unique.values()).slice(-100);
    }
    if (localValue && remoteValue && typeof localValue === 'object' && typeof remoteValue === 'object') {
      return { ...remoteValue, ...localValue };
    }
    return key === STORAGE_KEYS.selectedCosmetic ? localValue : remoteValue;
  }

  async function syncProfileState() {
    const profile = await syncActiveProfile();
    if (!profile.ok) return profile;
    const player = getPlayer();
    const state = {};
    PROFILE_STATE_KEYS.forEach((key) => {
      const raw = localStorage.getItem(getScopedStorageKey(key));
      if (raw === null) return;
      try { state[key] = JSON.parse(raw); } catch (error) { state[key] = null; }
    });

    try {
      const { error } = await profile.client.from('profile_state').upsert({
        profile_id: profile.profileId,
        payload: { version: 1, coins: Number(player?.coins || 0), state },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'profile_id' });
      if (error) return { ok: false, localOnly: true, message: 'Dados mantidos neste aparelho; não foi possível sincronizar as preferências.' };
      return { ok: true };
    } catch (error) {
      return { ok: false, localOnly: true, message: 'Dados mantidos neste aparelho; a conexão falhou.' };
    }
  }

  async function hydrateProfileState() {
    const profile = await syncActiveProfile();
    if (!profile.ok) return profile;

    try {
      const { data, error } = await profile.client.from('profile_state')
        .select('payload')
        .eq('profile_id', profile.profileId)
        .maybeSingle();
      if (error) return { ok: false, localOnly: true, message: 'Não foi possível carregar as preferências remotas.' };

      const payload = data?.payload;
      if (!payload || payload.version !== 1 || !payload.state) return syncProfileState();

      PROFILE_STATE_KEYS.forEach((key) => {
        if (!Object.hasOwn(payload.state, key)) return;
        const localValue = readJson(getScopedStorageKey(key), null);
        const merged = mergeProfileStateValue(key, localValue, payload.state[key]);
        localStorage.setItem(getScopedStorageKey(key), JSON.stringify(merged));
      });

      const player = getPlayer();
      if (player && Number.isFinite(Number(payload.coins))) {
        setPlayer({ ...player, coins: Math.max(Number(player.coins || 0), Number(payload.coins)) });
      }
      return syncProfileState();
    } catch (error) {
      return { ok: false, localOnly: true, message: 'Não foi possível carregar o estado remoto.' };
    }
  }

  function getChallenges(turma) {
    const challenges = readJson(STORAGE_KEYS.classChallenges, []);
    if (!Array.isArray(challenges)) return [];
    const cleanClass = String(turma || '').trim();
    return cleanClass ? challenges.filter((challenge) => challenge.turma === cleanClass) : challenges;
  }

  function markChallengeSynced(localChallengeId, supabaseId) {
    const challenges = readJson(STORAGE_KEYS.classChallenges, []);
    if (!Array.isArray(challenges)) return;
    writeJson(STORAGE_KEYS.classChallenges, challenges.map((challenge) => (
      challenge.id === localChallengeId ? { ...challenge, supabaseId } : challenge
    )));
  }

  async function publishClassChallenge(challenge) {
    const client = window.supabaseClient;
    if (!client?.auth?.getSession) {
      return { ok: false, localOnly: true, message: 'Missão salva neste navegador; Auth docente indisponível.' };
    }

    try {
      const { data, error: authError } = await client.auth.getSession();
      const user = data?.session?.user;
      if (authError || !user || user.is_anonymous === true) {
        return { ok: false, localOnly: true, message: 'Entre com a conta docente autorizada para publicar a missão.' };
      }

      const { data: remote, error } = await client.from('class_challenges').insert({
        teacher_user_id: user.id,
        local_challenge_id: challenge.id,
        title: challenge.title,
        game_key: challenge.game,
        turma: challenge.turma,
        target: challenge.target,
        active: true,
      }).select('id').single();

      if (error && error.code !== '23505') {
        return { ok: false, localOnly: true, message: 'Missão salva neste navegador; não foi possível publicar no Supabase.' };
      }

      let supabaseId = remote?.id;
      if (!supabaseId) {
        const { data: existing, error: lookupError } = await client.from('class_challenges')
          .select('id')
          .eq('teacher_user_id', user.id)
          .eq('local_challenge_id', challenge.id)
          .maybeSingle();
        if (lookupError || !existing?.id) {
          return { ok: false, localOnly: true, message: 'A missão está local, mas não foi possível confirmar a publicação.' };
        }
        supabaseId = existing.id;
      }

      markChallengeSynced(challenge.id, supabaseId);
      return { ok: true, supabaseId };
    } catch (error) {
      return { ok: false, localOnly: true, message: 'Missão salva neste navegador; a conexão com o Supabase falhou.' };
    }
  }

  async function getRemoteClassChallenges(turma) {
    const cleanClass = String(turma || '').trim();
    if (!cleanClass) return { ok: false, challenges: [], message: 'Turma não informada.' };
    const profile = await syncActiveProfile();
    if (!profile.ok) return { ...profile, challenges: [] };

    try {
      const { data, error } = await profile.client.from('class_challenges')
        .select('id, local_challenge_id, title, game_key, turma, target, created_at')
        .eq('turma', cleanClass)
        .eq('active', true)
        .order('created_at', { ascending: false });
      if (error) return { ok: false, localOnly: true, challenges: [], message: 'Não foi possível carregar missões remotas.' };

      return {
        ok: true,
        challenges: (data || []).map((challenge) => ({
          id: challenge.id,
          supabaseId: challenge.id,
          localId: challenge.local_challenge_id || '',
          title: challenge.title,
          game: challenge.game_key,
          turma: challenge.turma,
          target: challenge.target,
          createdAt: challenge.created_at,
        })),
      };
    } catch (error) {
      return { ok: false, localOnly: true, challenges: [], message: 'Não foi possível carregar missões remotas.' };
    }
  }

  async function getRemoteClassRanking(turma) {
    const cleanClass = String(turma || '').trim();
    const player = getPlayer();
    if (!player || player.accountType !== 'school' || !cleanClass || player.turma !== cleanClass) {
      return { ok: false, localOnly: true, ranking: [], message: 'Ranking remoto disponível apenas para a turma do perfil escolar.' };
    }

    const profile = await syncActiveProfile();
    if (!profile.ok) return { ...profile, ranking: [] };

    try {
      const { data, error } = await profile.client.rpc('get_class_game_ranking', { p_turma: cleanClass });
      if (error) return { ok: false, localOnly: true, ranking: [], message: 'Não foi possível carregar o ranking remoto.' };
      return { ok: true, ranking: data || [] };
    } catch (error) {
      return { ok: false, localOnly: true, ranking: [], message: 'Não foi possível carregar o ranking remoto.' };
    }
  }

  function createChallenge(challenge) {
    const clean = {
      id: `challenge-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: String(challenge?.title || '').trim().slice(0, 80),
      game: ['adicao', 'subtracao', 'multiplicacao', 'divisao', 'formas'].includes(challenge?.game) ? challenge.game : 'adicao',
      target: Math.min(4, Math.max(1, Math.floor(Number(challenge?.target) || 2))),
      turma: String(challenge?.turma || '').trim().slice(0, 80),
      createdAt: new Date().toISOString(),
    };
    if (!clean.title) return { ok: false, message: 'Digite um nome para o desafio.' };
    if (!clean.turma) return { ok: false, message: 'Selecione a turma que receberá o desafio.' };
    const challenges = [clean, ...getChallenges()].slice(0, 100);
    writeJson(STORAGE_KEYS.classChallenges, challenges);
    return { ok: true, challenge: clean };
  }

  function validateScore(scoreData) {
    const correct = Math.max(0, Math.min(100, Number(scoreData?.acertos || 0)));
    const wrong = Math.max(0, Math.min(100, Number(scoreData?.erros || 0)));
    const points = Math.max(0, Math.min(5000, Number(scoreData?.points || 0)));
    return { correct, wrong, points };
  }

  function getRanking() {
    const player = getPlayer();
    if (!player || player.accountType !== 'school') return [];

    const rankingKey = `${STORAGE_KEYS.ranking}:school:${encodeURIComponent(player.turma)}`;
    const savedRanking = readJson(rankingKey, null);
    if (!Array.isArray(savedRanking)) {
      const oldRanking = readJson(getScopedStorageKey(STORAGE_KEYS.ranking), []);
      const previousPlayerScore = Array.isArray(oldRanking)
        ? oldRanking.filter((item) => item.name === player.nome && item.turma === player.turma)
        : [];
      writeJson(rankingKey, previousPlayerScore);
      return previousPlayerScore;
    }
    return savedRanking.map((item) => ({ ...item }));
  }

  function upsertScore(player, scoreData) {
    const activePlayer = getPlayer();
    if (
      !activePlayer
      || activePlayer.accountType !== 'school'
      || activePlayer.email !== player?.email
    ) return [];

    player = activePlayer;
    const ranking = getRanking();
    const validated = validateScore(scoreData);
    const entry = {
      name: player?.nome || 'Jogador',
      avatar: player?.avatar || '🦊',
      turma: player?.turma || '4º ano',
      points: validated.points,
      acertos: validated.correct,
      erros: validated.wrong,
      tempo: scoreData?.tempo || '00:00',
      updatedAt: new Date().toISOString(),
    };

    const existingIndex = ranking.findIndex((item) => item.name === entry.name && item.turma === entry.turma);
    if (existingIndex >= 0) {
      ranking[existingIndex] = {
        ...ranking[existingIndex],
        ...entry,
        points: Math.max(ranking[existingIndex].points || 0, entry.points),
      };
    } else {
      ranking.push(entry);
    }

    const sorted = ranking
      .filter((item) => Number(item.points) > 0)
      .sort((a, b) => Number(b.points) - Number(a.points));

    const rankingKey = `${STORAGE_KEYS.ranking}:school:${encodeURIComponent(player.turma)}`;
    writeJson(rankingKey, sorted.slice(0, 10));
    return sorted.slice(0, 10);
  }

  function setTeacherSession(value) {
    localStorage.setItem(STORAGE_KEYS.professor, value ? 'true' : 'false');
  }

  function isTeacherLoggedIn() {
    return localStorage.getItem(STORAGE_KEYS.professor) === 'true';
  }

  window.GeniosApp = {
    STORAGE_KEYS,
    cosmeticCatalog: cosmeticsCatalog,
    characterCatalog,
    getPlayer,
    setPlayer,
    registerUser,
    loginUser,
    logoutUser,
    clearPlayer,
    getRanking,
    upsertScore,
    addCoins,
    getCoins,
    getUnlockedCosmetics,
    setUnlockedCosmetics,
    getSelectedCosmetic,
    setSelectedCosmetic,
    buyCosmetic,
    getCharacterUnlocks,
    getEquippedCharacter,
    equipCharacterItem,
    buyCharacterItem,
    achievementCatalog,
    getAchievements,
    getGameHistory,
    saveGameSession,
    syncGameSession,
    syncPendingGameSessions,
    syncActiveProfile,
    syncProfileState,
    hydrateProfileState,
    getGameDraft,
    saveGameDraft,
    clearGameDraft,
    getGamePreferences,
    saveGamePreferences,
    saveQuestionReport,
    exportActiveProfile,
    importProfileBackup,
    deleteActiveProfile,
    unlockAchievement,
    getChallenges,
    createChallenge,
    publishClassChallenge,
    getRemoteClassChallenges,
    getRemoteClassRanking,
    validateScore,
    setTeacherSession,
    isTeacherLoggedIn,
    authorizeSchoolEnrollment,
    authorizeLocalSchoolEnrollment,
  };
})();
