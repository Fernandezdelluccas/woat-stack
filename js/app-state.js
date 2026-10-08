(function () {
  const PROVISIONAL_SCHOOL_CODE = 'ESCOLA2026';
  const STORAGE_KEYS = {
    player: 'genios-player',
    accounts: 'genios-accounts',
    ranking: 'genios-ranking',
    professor: 'genios-professor-auth',
    coins: 'genios-coins',
    gameHistory: 'genios-game-history',
    cosmetics: 'genios-cosmetics',
    selectedCosmetic: 'genios-selected-cosmetic',
    character: 'genios-character',
    achievements: 'genios-achievements',
    challenges: 'genios-challenges',
  };

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

  function clearPlayer() {
    localStorage.removeItem(STORAGE_KEYS.player);
  }

  async function authorizeSchoolEnrollment({ code, turma }) {
    const cleanCode = String(code || '').trim();
    const cleanClass = String(turma || '').trim();
    if (!cleanCode || !cleanClass) {
      return { ok: false, message: 'Peça ao professor o código da sua turma.' };
    }
    if (cleanCode.toUpperCase() === PROVISIONAL_SCHOOL_CODE) {
      schoolEnrollmentPermit = {
        turma: cleanClass,
        expiresAt: Date.now() + 60_000,
      };
      return { ok: true, provisional: true };
    }
    if (!window.supabaseClient) {
      return { ok: false, message: 'A validação da escola está indisponível. Peça ajuda ao professor.' };
    }

    const { data, error } = await window.supabaseClient.rpc('validate_school_access_code', {
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
      completedAt: new Date().toISOString(),
    };
    const history = [...getGameHistory(), entry].slice(-100);
    writeScopedJson(STORAGE_KEYS.gameHistory, history);
    return history;
  }

  function getChallenges() {
    return readScopedJson(STORAGE_KEYS.challenges, []);
  }

  function createChallenge(challenge) {
    const clean = {
      id: `challenge-${Date.now()}`,
      title: String(challenge?.title || '').trim().slice(0, 80),
      game: ['adicao', 'subtracao', 'multiplicacao', 'divisao', 'formas'].includes(challenge?.game) ? challenge.game : 'adicao',
      target: Math.min(20, Math.max(1, Number(challenge?.target || 5))),
      createdAt: new Date().toISOString(),
    };
    if (!clean.title) return { ok: false, message: 'Digite um nome para o desafio.' };
    const challenges = [clean, ...getChallenges()].slice(0, 10);
    writeScopedJson(STORAGE_KEYS.challenges, challenges);
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
    provisionalSchoolCode: PROVISIONAL_SCHOOL_CODE,
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
    unlockAchievement,
    getChallenges,
    createChallenge,
    validateScore,
    setTeacherSession,
    isTeacherLoggedIn,
    authorizeSchoolEnrollment,
  };
})();
