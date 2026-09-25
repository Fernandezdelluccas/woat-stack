(function () {
  const STORAGE_KEYS = {
    player: 'genios-player',
    ranking: 'genios-ranking',
    professor: 'genios-professor-auth',
    coins: 'genios-coins',
    cosmetics: 'genios-cosmetics',
    selectedCosmetic: 'genios-selected-cosmetic',
    character: 'genios-character',
    achievements: 'genios-achievements',
    challenges: 'genios-challenges',
  };

  const defaultRanking = [
    { name: 'Sofia', avatar: '🦄', turma: '4º ano', points: 980 },
    { name: 'Pedro', avatar: '🤖', turma: '4º ano', points: 915 },
    { name: 'Ana', avatar: '🦊', turma: '3º ano', points: 870 },
    { name: 'Lucas', avatar: '🦕', turma: '3º ano', points: 760 },
    { name: 'Beatriz', avatar: '🐱', turma: '5º ano', points: 705 },
    { name: 'Enzo', avatar: '🦉', turma: '2º ano', points: 640 },
  ];

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
    { id: 'hair-none', slot: 'hair', category: 'cabelo', label: 'Sem acessório', emoji: '', price: 0 },
    { id: 'hair-rainbow', slot: 'hair', category: 'cabelo', label: 'Laço arco-íris', emoji: '🎀', price: 35 },
    { id: 'hair-cap', slot: 'hair', category: 'cabelo', label: 'Boné', emoji: '🧢', price: 45 },
    { id: 'hair-crown', slot: 'hair', category: 'cabelo', label: 'Coroa', emoji: '👑', price: 120 },
    { id: 'outfit-basic', slot: 'outfit', category: 'roupa', label: 'Roupa aventureira', emoji: '👕', price: 0 },
    { id: 'outfit-blue', slot: 'outfit', category: 'roupa', label: 'Moletom azul', emoji: '🧥', price: 55 },
    { id: 'outfit-sport', slot: 'outfit', category: 'roupa', label: 'Uniforme esportivo', emoji: '🥋', price: 70 },
    { id: 'accessory-none', slot: 'accessory', category: 'acessório', label: 'Sem acessório', emoji: '', price: 0 },
    { id: 'accessory-glasses', slot: 'accessory', category: 'acessório', label: 'Óculos estrela', emoji: '🕶️', price: 90 },
    { id: 'accessory-headphones', slot: 'accessory', category: 'acessório', label: 'Fone colorido', emoji: '🎧', price: 80 },
    { id: 'accessory-backpack', slot: 'accessory', category: 'acessório', label: 'Mochila', emoji: '🎒', price: 65 },
  ];

  const achievementCatalog = [
    { id: 'first-game', title: 'Primeira aventura', description: 'Termine seu primeiro jogo.', emoji: '🚀' },
    { id: 'ten-correct', title: 'Mente afiada', description: 'Acerte 10 perguntas.', emoji: '🧠' },
    { id: 'coin-collector', title: 'Colecionador', description: 'Junte 100 moedas.', emoji: '★' },
    { id: 'all-subjects', title: 'Explorador', description: 'Jogue os cinco minijogos.', emoji: '🗺️' },
  ];

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
      passwordHash: String(player.passwordHash || ''),
      coins: Number(player.coins || 0),
      lastPlayed: player.lastPlayed || new Date().toISOString(),
    };
  }

  function getPlayer() {
    const player = readJson(STORAGE_KEYS.player, null);
    return normalizePlayer(player);
  }

  function setPlayer(player) {
    const normalized = normalizePlayer(player);
    if (!normalized || !normalized.nome) return null;
    writeJson(STORAGE_KEYS.player, normalized);
    return normalized;
  }

  function clearPlayer() {
    localStorage.removeItem(STORAGE_KEYS.player);
  }

  function registerUser({ nome, email, password, turma, avatar }) {
    const safeEmail = String(email || '').trim().toLowerCase();
    const safeName = String(nome || '').trim();
    if (!safeName || !safeEmail || !password) return { ok: false, message: 'Dados incompletos.' };

    const existing = readJson(STORAGE_KEYS.player, null);
    if (existing && existing.email && existing.email.toLowerCase() === safeEmail) {
      return { ok: false, message: 'Este e-mail já está em uso.' };
    }

    const profile = {
      nome: safeName,
      email: safeEmail,
      turma: turma || '4º ano',
      avatar: avatar || '🦊',
      passwordHash: hashString(password),
      coins: 0,
      lastPlayed: new Date().toISOString(),
    };

    writeJson(STORAGE_KEYS.player, profile);
    return { ok: true, profile };
  }

  function loginUser({ email, password }) {
    const safeEmail = String(email || '').trim().toLowerCase();
    const stored = readJson(STORAGE_KEYS.player, null);
    if (!stored || !stored.email || stored.email.toLowerCase() !== safeEmail) {
      return { ok: false, message: 'E-mail ou senha incorretos.' };
    }

    if (stored.passwordHash !== hashString(password)) {
      return { ok: false, message: 'E-mail ou senha incorretos.' };
    }

    const player = normalizePlayer(stored);
    localStorage.setItem('genios-session', 'true');
    writeJson(STORAGE_KEYS.player, { ...player, lastPlayed: new Date().toISOString() });
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
    const saved = readJson(STORAGE_KEYS.cosmetics, ['starter']);
    return Array.isArray(saved) ? saved : ['starter'];
  }

  function setUnlockedCosmetics(list) {
    writeJson(STORAGE_KEYS.cosmetics, list);
  }

  function getSelectedCosmetic() {
    return localStorage.getItem(STORAGE_KEYS.selectedCosmetic) || 'starter';
  }

  function setSelectedCosmetic(id) {
    const unlocked = getUnlockedCosmetics();
    if (!unlocked.includes(id)) return false;
    localStorage.setItem(STORAGE_KEYS.selectedCosmetic, id);
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
    return Array.from(new Set([...unlocked, 'base-fox', 'hair-none', 'outfit-basic', 'accessory-none']));
  }

  function getEquippedCharacter() {
    const defaultLook = {
      base: 'base-fox',
      hair: 'hair-none',
      outfit: 'outfit-basic',
      accessory: 'accessory-none',
    };
    const saved = readJson(STORAGE_KEYS.character, defaultLook);
    return { ...defaultLook, ...(saved && typeof saved === 'object' ? saved : {}) };
  }

  function equipCharacterItem(id) {
    const item = characterCatalog.find((entry) => entry.id === id);
    if (!item || !getCharacterUnlocks().includes(id)) return false;
    writeJson(STORAGE_KEYS.character, { ...getEquippedCharacter(), [item.slot]: id });
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
    return readJson(STORAGE_KEYS.achievements, []);
  }

  function unlockAchievement(id) {
    if (!achievementCatalog.some((item) => item.id === id)) return false;
    const current = getAchievements();
    if (current.includes(id)) return false;
    writeJson(STORAGE_KEYS.achievements, [...current, id]);
    return true;
  }

  function getChallenges() {
    return readJson(STORAGE_KEYS.challenges, []);
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
    writeJson(STORAGE_KEYS.challenges, challenges);
    return { ok: true, challenge: clean };
  }

  function validateScore(scoreData) {
    const correct = Math.max(0, Math.min(100, Number(scoreData?.acertos || 0)));
    const wrong = Math.max(0, Math.min(100, Number(scoreData?.erros || 0)));
    const points = Math.max(0, Math.min(5000, Number(scoreData?.points || 0)));
    return { correct, wrong, points };
  }

  function getRanking() {
    const ranking = readJson(STORAGE_KEYS.ranking, defaultRanking);
    if (!Array.isArray(ranking) || ranking.length === 0) {
      writeJson(STORAGE_KEYS.ranking, defaultRanking);
      return [...defaultRanking];
    }
    return ranking;
  }

  function upsertScore(player, scoreData) {
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

    writeJson(STORAGE_KEYS.ranking, sorted.slice(0, 10));
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
    unlockAchievement,
    getChallenges,
    createChallenge,
    validateScore,
    setTeacherSession,
    isTeacherLoggedIn,
  };
})();
