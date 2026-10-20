import { buildQuestions, getGameDefinition, formatAnswer } from './game.mjs?v=10';

const gameKey = new URLSearchParams(window.location.search).get('game') || 'adicao';
const manualTutorialRequested = new URLSearchParams(window.location.search).get('tutorial') === 'manual';
const gameInfo = getGameDefinition(gameKey);
const baseQuestions = buildQuestions(gameKey, 7);
const player = window.GeniosApp?.getPlayer?.() || { nome: 'Jogador', turma: '4º ano', avatar: '🦊', coins: 0 };
const gamePreferences = window.GeniosApp?.getGamePreferences?.(gameKey) || { goalTarget: 2, untimed: false };

const state = {
  index: 0,
  score: 0,
  correct: 0,
  wrong: 0,
  seconds: 0,
  timerId: null,
  level: 1,
  levelTarget: gamePreferences.goalTarget,
  retryReason: '',
  totalCorrect: 0,
  totalWrong: 0,
  currentStreak: 0,
  bestStreak: 0,
  answers: [],
  paused: false,
  awaitingAdvance: false,
  untimed: gamePreferences.untimed,
  completed: false,
  advanceTimerId: null,
  pendingAction: null,
  pendingDelay: 0,
  pendingAt: 0,
};

const questionMeta = document.getElementById('questionMeta');
const questionVisual = document.getElementById('questionVisual');
const questionExample = document.getElementById('questionExample');
const questionPrompt = document.getElementById('questionPrompt');
const answerFeedback = document.getElementById('answerFeedback');
const optionsGrid = document.getElementById('optionsGrid');
const progressBar = document.getElementById('progressBar');
const progressDots = document.getElementById('progressDots');
const scoreEl = document.getElementById('score');
const acertosEl = document.getElementById('acertos');
const errosEl = document.getElementById('erros');
const tempoEl = document.getElementById('tempo');
const companionBubble = document.getElementById('companionBubble');
const gameCompanion = document.getElementById('gameCompanion');
const goalTargetInput = document.getElementById('goalTarget');
const untimedModeInput = document.getElementById('untimedMode');
const pauseGameButton = document.getElementById('pauseGameButton');
const pauseOverlay = document.getElementById('gamePauseOverlay');
const pauseStatus = document.getElementById('pauseStatus');
const resumeGameButton = document.getElementById('resumeGameButton');
const restartGameButton = document.getElementById('restartGameButton');
const questionCard = document.querySelector('.question-card');
const scratchBoard = document.getElementById('scratchBoard');
const scratchCanvas = document.getElementById('scratchCanvas');
const scratchFeedback = document.getElementById('scratchFeedback');
const questionReportForm = document.getElementById('questionReportForm');
const questionReportFeedback = document.getElementById('questionReportFeedback');
const companionDefaultAvatar = player.avatar || '🦊';
let petPressTimer = null;
let petLongPress = false;
let petTapCount = 0;
let petTapResetTimer = null;

const levelMap = {
  1: { label: 'Nível 1 · Primeiros passos', target: 2, totalQuestions: 4 },
  2: { label: 'Nível 2 · Mais confiança', target: 3, totalQuestions: 4 },
  3: { label: 'Nível 3 · Raciocínio rápido', target: 3, totalQuestions: 5 },
  4: { label: 'Nível 4 · Desafios divertidos', target: 4, totalQuestions: 5 },
  5: { label: 'Nível 5 · Mestre da aventura', target: 4, totalQuestions: 6 },
};
const maxLevel = Object.keys(levelMap).length;

function getQuestionsForLevel() {
  const levelConfig = levelMap[state.level] || levelMap[1];
  const requestedTotal = levelConfig.totalQuestions || 4;
  const recentContexts = (window.GeniosApp?.getGameHistory?.() || [])
    .filter((session) => session.gameKey === gameKey)
    .flatMap((session) => (session.answers || []).map((answer) => answer.contextId).filter(Boolean))
    .slice(-20);
  const usedInCurrentGame = state.answers.map((answer) => answer.contextId).filter(Boolean);
  const generatedQuestions = buildQuestions(gameKey, requestedTotal + 3, {
    excludeContextIds: [...recentContexts, ...usedInCurrentGame],
  });
  return generatedQuestions.slice(0, requestedTotal);
}

let currentQuestions = getQuestionsForLevel();
const savedGameDraft = window.GeniosApp?.getGameDraft?.(gameKey);
const isRestoringGame = Boolean(savedGameDraft?.questions?.length);

if (isRestoringGame) {
  Object.assign(state, {
    index: savedGameDraft.index,
    score: savedGameDraft.score,
    correct: savedGameDraft.correct,
    wrong: savedGameDraft.wrong,
    seconds: savedGameDraft.seconds,
    level: savedGameDraft.level,
    levelTarget: savedGameDraft.levelTarget,
    totalCorrect: savedGameDraft.totalCorrect,
    totalWrong: savedGameDraft.totalWrong,
    currentStreak: savedGameDraft.currentStreak,
    bestStreak: savedGameDraft.bestStreak,
    answers: savedGameDraft.answers,
    retryReason: savedGameDraft.retryReason,
    untimed: savedGameDraft.untimed,
    awaitingAdvance: Boolean(savedGameDraft.awaitingAdvance),
    pendingDelay: Math.max(0, Number(savedGameDraft.pendingDelay) || 0),
    paused: true,
  });
  if (state.awaitingAdvance) state.pendingAction = advanceAfterAnswer;
  currentQuestions = savedGameDraft.questions;
}

if (goalTargetInput) goalTargetInput.value = String(state.levelTarget);
if (untimedModeInput) untimedModeInput.checked = state.untimed;
if (state.untimed) tempoEl.textContent = 'Sem limite';

function startTimer() {
  if (state.untimed || state.paused || state.timerId !== null || state.completed) return;
  state.timerId = window.setInterval(() => {
    state.seconds += 1;
    tempoEl.textContent = state.untimed ? 'Sem limite' : formatElapsed(state.seconds);
  }, 1000);
}

function saveCurrentDraft() {
  if (state.completed || !window.GeniosApp?.saveGameDraft) return;
  window.GeniosApp.saveGameDraft({
    gameKey,
    questions: currentQuestions,
    index: state.index,
    score: state.score,
    correct: state.correct,
    wrong: state.wrong,
    seconds: state.seconds,
    level: state.level,
    levelTarget: state.levelTarget,
    totalCorrect: state.totalCorrect,
    totalWrong: state.totalWrong,
    currentStreak: state.currentStreak,
    bestStreak: state.bestStreak,
    answers: state.answers,
    retryReason: state.retryReason,
    untimed: state.untimed,
    awaitingAdvance: state.awaitingAdvance,
    pendingDelay: state.pendingDelay,
    scratchData: scratchCanvas?.toDataURL('image/png') || '',
  });
}

function restoreScratchDrawing(dataUrl) {
  if (!dataUrl || !scratchCanvas) return;
  const image = new Image();
  image.onload = () => {
    const context = scratchCanvas.getContext('2d');
    context?.drawImage(image, 0, 0, scratchCanvas.width, scratchCanvas.height);
  };
  image.src = dataUrl;
}

if (savedGameDraft?.scratchData) restoreScratchDrawing(savedGameDraft.scratchData);

function runPendingAction() {
  if (!state.pendingAction || state.paused || state.completed) return;
  const action = state.pendingAction;
  state.pendingAction = null;
  state.advanceTimerId = null;
  state.pendingDelay = 0;
  state.awaitingAdvance = false;
  action();
}

function advanceAfterAnswer() {
  if (state.index >= currentQuestions.length - 1) {
    finishLevel();
    return;
  }
  state.index += 1;
  renderQuestion();
  saveCurrentDraft();
}

function schedulePendingAction(action, delay) {
  state.pendingAction = action;
  state.pendingDelay = delay;
  state.pendingAt = Date.now();
  state.advanceTimerId = window.setTimeout(runPendingAction, delay);
}

function pauseGame() {
  if (state.paused || state.completed) return;
  state.paused = true;
  window.clearInterval(state.timerId);
  state.timerId = null;
  if (state.advanceTimerId !== null) {
    window.clearTimeout(state.advanceTimerId);
    state.pendingDelay = Math.max(0, state.pendingDelay - (Date.now() - state.pendingAt));
    state.advanceTimerId = null;
  }
  saveCurrentDraft();
  pauseOverlay.hidden = false;
  pauseGameButton.setAttribute('aria-pressed', 'true');
  pauseGameButton.textContent = 'Continuar';
  questionCard.inert = true;
  resumeGameButton.focus();
}

function resumeGame() {
  if (!state.paused) return;
  state.paused = false;
  pauseOverlay.hidden = true;
  questionCard.inert = false;
  pauseGameButton.setAttribute('aria-pressed', 'false');
  pauseGameButton.textContent = 'Pausar';
  startTimer();
  if (state.pendingAction) {
    state.pendingAt = Date.now();
    state.advanceTimerId = window.setTimeout(runPendingAction, state.pendingDelay);
  }
  saveCurrentDraft();
}

function formatElapsed(totalSeconds) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function renderProgressDots() {
  progressDots.innerHTML = '';
  for (let i = 0; i < currentQuestions.length; i += 1) {
    const dot = document.createElement('span');
    if (i < state.index) dot.classList.add('done');
    if (i === state.index) dot.classList.add('current');
    progressDots.appendChild(dot);
  }
}

function renderQuestion() {
  const current = currentQuestions[state.index];

  if (!current) {
    finishLevel();
    return;
  }

  questionMeta.textContent = `${levelMap[state.level]?.label || 'Desafio'} · ${gameInfo.label}`;
  speakToPlayer('LEIA A HISTÓRIA E OBSERVE O EXEMPLO VISUAL. DEPOIS ESCOLHA UMA RESPOSTA.');
  renderQuestionVisual(current.visual);
  if (questionExample) {
    questionExample.textContent = current.example || '';
    questionExample.hidden = !current.example;
  }
  questionPrompt.textContent = current.prompt;
  if (answerFeedback) answerFeedback.textContent = '';
  optionsGrid.innerHTML = '';

  current.options.forEach((option) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'option-btn';
    button.textContent = formatAnswer(option);
    button.addEventListener('click', () => answerQuestion(button, option, current.correctAnswer, current.explanation));
    if (state.awaitingAdvance) {
      button.disabled = true;
      if (String(option) === String(current.correctAnswer)) button.classList.add('is-correct');
      const lastAnswer = state.answers.at(-1);
      if (lastAnswer && String(option) === lastAnswer.answer && !lastAnswer.correct) button.classList.add('is-wrong');
    }
    optionsGrid.appendChild(button);
  });

  renderProgressDots();
  const percent = (state.index / currentQuestions.length) * 100;
  progressBar.style.width = `${percent}%`;
  progressBar.setAttribute('aria-valuenow', String(Math.round(percent)));
  saveCurrentDraft();
}

function speakToPlayer(message) {
  if (!companionBubble) return;
  companionBubble.classList.remove('is-speaking');
  window.requestAnimationFrame(() => {
    companionBubble.textContent = message.toUpperCase();
    companionBubble.classList.add('is-speaking');
  });
}

function setupScratchBoard() {
  if (!scratchCanvas) return;
  const context = scratchCanvas.getContext('2d');
  if (!context) {
    scratchFeedback.textContent = 'O quadro não está disponível neste navegador.';
    return;
  }

  let drawing = false;
  let color = '#153a33';
  let erasing = false;
  const size = document.getElementById('scratchSize');

  function getPoint(event) {
    const bounds = scratchCanvas.getBoundingClientRect();
    return {
      x: (event.clientX - bounds.left) * (scratchCanvas.width / bounds.width),
      y: (event.clientY - bounds.top) * (scratchCanvas.height / bounds.height),
    };
  }

  scratchCanvas.addEventListener('pointerdown', (event) => {
    if (state.paused) return;
    event.preventDefault();
    drawing = true;
    scratchCanvas.setPointerCapture(event.pointerId);
    const point = getPoint(event);
    context.beginPath();
    context.moveTo(point.x, point.y);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.lineWidth = Number(size.value) * (scratchCanvas.width / scratchCanvas.clientWidth);
    context.strokeStyle = color;
    context.globalCompositeOperation = erasing ? 'destination-out' : 'source-over';
  });

  scratchCanvas.addEventListener('pointermove', (event) => {
    if (!drawing) return;
    const point = getPoint(event);
    context.lineTo(point.x, point.y);
    context.stroke();
  });

  const endStroke = () => {
    if (!drawing) return;
    drawing = false;
    context.closePath();
    saveCurrentDraft();
  };
  scratchCanvas.addEventListener('pointerup', endStroke);
  scratchCanvas.addEventListener('pointercancel', endStroke);

  let keyboardPoint = { x: scratchCanvas.width / 2, y: scratchCanvas.height / 2 };
  scratchCanvas.addEventListener('keydown', (event) => {
    const directions = {
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
    };
    const direction = directions[event.key];
    if (!direction) return;
    event.preventDefault();
    const nextPoint = {
      x: Math.max(0, Math.min(scratchCanvas.width, keyboardPoint.x + direction.x * (event.shiftKey ? 18 : 7))),
      y: Math.max(0, Math.min(scratchCanvas.height, keyboardPoint.y + direction.y * (event.shiftKey ? 18 : 7))),
    };
    if (event.shiftKey) {
      context.beginPath();
      context.moveTo(keyboardPoint.x, keyboardPoint.y);
      context.lineTo(nextPoint.x, nextPoint.y);
      context.lineWidth = Number(size.value) * (scratchCanvas.width / scratchCanvas.clientWidth);
      context.lineCap = 'round';
      context.strokeStyle = color;
      context.globalCompositeOperation = erasing ? 'destination-out' : 'source-over';
      context.stroke();
      saveCurrentDraft();
      scratchFeedback.textContent = 'Traço desenhado pelo teclado.';
    } else {
      scratchFeedback.textContent = 'Lápis movido. Use Shift mais uma seta para desenhar.';
    }
    keyboardPoint = nextPoint;
  });

  const pencil = document.getElementById('scratchPencil');
  const eraser = document.getElementById('scratchEraser');
  const selectTool = (useEraser) => {
    erasing = useEraser;
    pencil.classList.toggle('is-active', !erasing);
    eraser.classList.toggle('is-active', erasing);
    pencil.setAttribute('aria-pressed', String(!erasing));
    eraser.setAttribute('aria-pressed', String(erasing));
  };
  pencil.addEventListener('click', () => selectTool(false));
  eraser.addEventListener('click', () => selectTool(true));

  document.querySelectorAll('.scratch-color').forEach((button) => {
    button.addEventListener('click', () => {
      color = button.dataset.color;
      document.querySelectorAll('.scratch-color').forEach((item) => {
        const selected = item === button;
        item.classList.toggle('is-active', selected);
        item.setAttribute('aria-pressed', String(selected));
      });
      selectTool(false);
    });
  });

  document.getElementById('scratchClear').addEventListener('click', () => {
    context.clearRect(0, 0, scratchCanvas.width, scratchCanvas.height);
    saveCurrentDraft();
    scratchFeedback.textContent = 'Quadro limpo.';
  });

  document.getElementById('scratchSave').addEventListener('click', () => {
    const download = document.createElement('a');
    download.download = `rascunho-${gameKey}.png`;
    download.href = scratchCanvas.toDataURL('image/png');
    download.click();
    scratchFeedback.textContent = 'Desenho salvo no dispositivo.';
  });
}

function setupQuestionTools() {
  goalTargetInput.value = String(state.levelTarget);
  untimedModeInput.checked = state.untimed;

  goalTargetInput.addEventListener('change', () => {
    state.levelTarget = Number(goalTargetInput.value);
    window.GeniosApp?.saveGamePreferences?.(gameKey, { goalTarget: state.levelTarget, untimed: state.untimed });
    saveCurrentDraft();
  });

  untimedModeInput.addEventListener('change', () => {
    state.untimed = untimedModeInput.checked;
    tempoEl.textContent = state.untimed ? 'Sem limite' : formatElapsed(state.seconds);
    window.GeniosApp?.saveGamePreferences?.(gameKey, { goalTarget: state.levelTarget, untimed: state.untimed });
    if (state.untimed) {
      window.clearInterval(state.timerId);
      state.timerId = null;
    } else {
      startTimer();
    }
    saveCurrentDraft();
  });

  pauseGameButton.setAttribute('aria-pressed', String(state.paused));
  pauseGameButton.textContent = state.paused ? 'Continuar' : 'Pausar';
  if (isRestoringGame) {
    pauseStatus.textContent = 'Partida salva encontrada. Continue ou comece novamente.';
    pauseOverlay.hidden = false;
    questionCard.inert = true;
    restartGameButton.hidden = false;
    scoreEl.textContent = `${state.score} pts`;
    acertosEl.textContent = `${state.correct} acertos`;
    errosEl.textContent = `${state.wrong} erros`;
    tempoEl.textContent = state.untimed ? 'Sem limite' : formatElapsed(state.seconds);
    renderQuestion();
  }

  pauseGameButton.addEventListener('click', () => {
    if (state.paused) resumeGame();
    else pauseGame();
  });
  resumeGameButton.addEventListener('click', resumeGame);
  restartGameButton.addEventListener('click', () => {
    window.GeniosApp?.clearGameDraft?.();
    window.location.reload();
  });

  document.getElementById('toggleScratchButton').addEventListener('click', (event) => {
    const button = event.currentTarget;
    scratchBoard.hidden = !scratchBoard.hidden;
    button.setAttribute('aria-expanded', String(!scratchBoard.hidden));
    button.textContent = scratchBoard.hidden ? 'Abrir rascunho' : 'Fechar rascunho';
    if (!scratchBoard.hidden) scratchCanvas.focus();
  });
  setupScratchBoard();

  const readButton = document.getElementById('readQuestionButton');
  readButton.addEventListener('click', () => {
    const synthesis = window.speechSynthesis;
    if (!synthesis || typeof window.SpeechSynthesisUtterance !== 'function') {
      speakToPlayer('Leitura em voz alta indisponível neste navegador.');
      return;
    }
    if (synthesis.speaking) {
      synthesis.cancel();
      readButton.textContent = 'Ouvir questão';
      return;
    }
    const current = currentQuestions[state.index];
    const utterance = new window.SpeechSynthesisUtterance([current?.prompt, current?.example].filter(Boolean).join('. '));
    utterance.lang = 'pt-BR';
    utterance.rate = Number(localStorage.getItem('genios-voice-rate')) || 1;
    utterance.onend = () => { readButton.textContent = 'Ouvir questão'; };
    synthesis.cancel();
    synthesis.speak(utterance);
    readButton.textContent = 'Parar leitura';
  });

  const reportButton = document.getElementById('reportQuestionButton');
  reportButton.addEventListener('click', () => {
    questionReportForm.hidden = !questionReportForm.hidden;
    reportButton.setAttribute('aria-expanded', String(!questionReportForm.hidden));
  });
  document.getElementById('cancelQuestionReport').addEventListener('click', () => {
    questionReportForm.reset();
    questionReportForm.hidden = true;
    reportButton.setAttribute('aria-expanded', 'false');
  });
  questionReportForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const current = currentQuestions[state.index];
    const details = document.getElementById('questionReportDetails').value.trim();
    const result = window.GeniosApp?.saveQuestionReport?.({
      gameKey,
      prompt: current?.prompt,
      reason: `${document.getElementById('questionReportReason').value}${details ? `: ${details}` : ''}`,
    });
    questionReportFeedback.textContent = result?.ok
      ? 'Obrigado. Seu relato foi guardado neste perfil.'
      : result?.message || 'Não foi possível guardar o relato.';
    if (result?.ok) questionReportForm.reset();
  });

  if (isRestoringGame) {
    state.paused = true;
    pauseGameButton.setAttribute('aria-pressed', 'true');
    pauseGameButton.textContent = 'Continuar';
    pauseStatus.textContent = 'Encontramos uma partida salva. Continue de onde parou ou comece novamente.';
    pauseOverlay.hidden = false;
    questionCard.inert = true;
    restartGameButton.hidden = false;
    scoreEl.textContent = `${state.score} pts`;
    acertosEl.textContent = `${state.correct} acertos`;
    errosEl.textContent = `${state.wrong} erros`;
    tempoEl.textContent = state.untimed ? 'Sem limite' : formatElapsed(state.seconds);
    renderQuestion();
  }

}

function getPetAffectionPhrase() {
  const name = String(player.nome || 'CAMPEÃO').toUpperCase();
  const phrases = [
    `EI, ${name}! QUE BOM TER VOCÊ AQUI!`,
    `VOCÊ É DEMAIS, ${name}! VAMOS JOGAR JUNTOS?`,
    'ESSE CARINHO DEIXOU MEU DIA MAIS FELIZ!',
    'EU ACREDITO EM VOCÊ! UMA PERGUNTA DE CADA VEZ.',
  ];
  return phrases[petTapCount % phrases.length];
}

function petTap() {
  playPetSound();
  gameCompanion.classList.add('is-petted');
  petTapCount += 1;
  if (petTapResetTimer) window.clearTimeout(petTapResetTimer);
  petTapResetTimer = window.setTimeout(() => { petTapCount = 0; }, 1800);
  speakToPlayer(petTapCount >= 3
    ? 'QUER MUDAR DE PET? SEGURE OU ATIVE O MASCOTE PARA ABRIR A LOJA!'
    : getPetAffectionPhrase());
  window.setTimeout(() => gameCompanion.classList.remove('is-petted'), 650);
}

function reactToAnswer(isCorrect) {
  if (!gameCompanion) return;
  if (isCorrect) burstCruzeiroStars();
  gameCompanion.classList.remove('is-correct', 'is-wrong');
  void gameCompanion.offsetWidth;
  gameCompanion.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
  gameCompanion.textContent = isCorrect ? '🤩' : '😅';
  window.setTimeout(() => {
    gameCompanion.classList.remove('is-correct', 'is-wrong');
    gameCompanion.textContent = companionDefaultAvatar;
  }, 950);
}

function burstCruzeiroStars() {
  const burst = document.createElement('div');
  burst.className = 'cruzeiro-star-burst';
  burst.setAttribute('aria-hidden', 'true');
  for (let index = 0; index < 8; index += 1) {
    const star = document.createElement('img');
    star.className = 'cruzeiro-star';
    star.src = 'assets/logo-cruzeiro-do-sul-estrela-512.webp';
    star.alt = '';
    star.style.setProperty('--star-x', `${Math.cos(index * Math.PI / 4) * 150}px`);
    star.style.setProperty('--star-y', `${Math.sin(index * Math.PI / 4) * 125 - 30}px`);
    star.style.setProperty('--star-delay', `${index * 35}ms`);
    burst.appendChild(star);
  }
  document.querySelector('.question-card')?.appendChild(burst);
  window.setTimeout(() => burst.remove(), 1100);
}

function playPetSound() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  const audioContext = new AudioContextClass();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(520, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(760, audioContext.currentTime + 0.12);
  gain.gain.setValueAtTime(0.001, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.16, audioContext.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.2);
  oscillator.addEventListener('ended', () => audioContext.close());
}

function playAnswerSound(isCorrect) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  const audioContext = new AudioContextClass();
  audioContext.resume().then(() => {
    const notes = isCorrect ? [660, 880] : [220, 170];
    notes.forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const start = audioContext.currentTime + index * 0.1;
      oscillator.type = isCorrect ? 'sine' : 'triangle';
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.42, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.17);
    });
    window.setTimeout(() => audioContext.close(), 380);
  });
}

function openPetShopPrompt() {
  const modal = document.createElement('div');
  modal.className = 'pet-shop-modal';
  modal.innerHTML = `
    <div class="pet-shop-modal__card" role="dialog" aria-modal="true" aria-labelledby="petShopTitle">
      <span class="eyebrow">MEU COMPANHEIRO</span>
      <div class="pet-shop-modal__pet">${companionDefaultAvatar}</div>
      <h3 id="petShopTitle">QUER TROCAR DE PET?</h3>
      <p>VISITE A LOJA, ESCOLHA UM NOVO COMPANHEIRO E USE SUAS MOEDAS PARA EQUIPÁ-LO.</p>
      <div class="pet-shop-modal__actions">
        <button type="button" class="btn btn--primary" id="goToPetShop">IR PARA A LOJA</button>
        <button type="button" class="btn btn--ghost" id="closePetShop">AGORA NÃO</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById('goToPetShop').addEventListener('click', () => {
    window.location.href = 'materias.html#avatar-store';
  });
  document.getElementById('closePetShop').addEventListener('click', () => modal.remove());
}

function showAchievementToast(achievementId) {
  const achievement = window.GeniosApp?.achievementCatalog?.find((item) => item.id === achievementId);
  if (!achievement) return;

  playAchievementSound();

  const toast = document.createElement('aside');
  toast.className = 'achievement-toast';
  const toastPosition = document.querySelectorAll('.achievement-toast').length;
  toast.style.top = `${24 + toastPosition * 104}px`;
  toast.setAttribute('role', 'status');
  toast.innerHTML = `
    <div class="achievement-toast__shine"></div>
    <div class="achievement-toast__icon">${achievementId === 'coin-collector' ? '<img class="school-logo school-logo--toast" src="assets/logo-cruzeiro-do-sul-estrela-512.webp" alt="Cruzeiro do Sul" />' : achievement.emoji}</div>
    <div class="achievement-toast__copy">
      <small>CONQUISTA DESBLOQUEADA</small>
      <strong>${achievement.title.toUpperCase()}</strong>
      <span>${achievement.description.toUpperCase()}</span>
    </div>
  `;
  document.body.appendChild(toast);
  window.setTimeout(() => toast.classList.add('is-visible'), 40);
  window.setTimeout(() => {
    toast.classList.remove('is-visible');
    window.setTimeout(() => toast.remove(), 450);
  }, 5200);
}

function playAchievementSound() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  const audioContext = new AudioContextClass();
  audioContext.resume().then(() => {
    [523, 659, 784, 1047].forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const start = audioContext.currentTime + index * 0.12;
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.24, start + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.23);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.24);
    });
    window.setTimeout(() => audioContext.close(), 700);
  });
}

if (gameCompanion) {
  gameCompanion.addEventListener('pointerenter', () => {
    gameCompanion.classList.add('is-hovered');
    speakToPlayer('OI! PASSE O MOUSE OU TOQUE EM MIM PARA INTERAGIR!');
  });

  gameCompanion.addEventListener('pointerleave', () => gameCompanion.classList.remove('is-hovered'));
  gameCompanion.addEventListener('focus', () => gameCompanion.classList.add('is-hovered'));
  gameCompanion.addEventListener('blur', () => gameCompanion.classList.remove('is-hovered'));
  gameCompanion.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    petTap();
  });

  gameCompanion.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    petLongPress = false;
    petPressTimer = window.setTimeout(() => {
      petLongPress = true;
      gameCompanion.classList.add('is-loved');
      speakToPlayer('VAMOS ESCOLHER UM NOVO AMIGO PARA A AVENTURA?');
      openPetShopPrompt();
      window.setTimeout(() => gameCompanion.classList.remove('is-loved'), 700);
    }, 650);
  });

  gameCompanion.addEventListener('pointerup', () => {
    window.clearTimeout(petPressTimer);
    if (petLongPress) return;
    petTap();
  });

  gameCompanion.addEventListener('pointercancel', () => window.clearTimeout(petPressTimer));
}

function renderQuestionVisual(visual) {
  if (!questionVisual) return;
  if (!visual) {
    questionVisual.innerHTML = '';
    questionVisual.hidden = true;
    return;
  }

  questionVisual.hidden = false;
  questionVisual.innerHTML = `
    <div class="question-visual__icon">${visual.icon}</div>
    <div class="question-visual__groups">
      ${visual.groups.map((group) => `<span>${group}</span>`).join('<b>+</b>')}
    </div>
    <small>${visual.caption}</small>
  `;
}

function answerQuestion(button, selectedValue, correctValue, explanation) {
  if (state.paused || state.awaitingAdvance || state.completed) return;
  const isCorrect = selectedValue === correctValue || String(selectedValue) === String(correctValue);
  const current = currentQuestions[state.index];
  state.answers.push({
    prompt: current?.prompt || '',
    answer: String(selectedValue),
    correctAnswer: String(correctValue),
    correct: isCorrect,
    contextId: current?.contextId || '',
  });
  reactToAnswer(isCorrect);
  playAnswerSound(isCorrect);

  document.querySelectorAll('.option-btn').forEach((btn) => {
    btn.disabled = true;
    const value = btn.textContent;
    const matches = value === String(correctValue) || value === String(selectedValue);
    if (String(value) === String(correctValue)) {
      btn.classList.add('is-correct');
    }
    if (!isCorrect && matches && String(value) !== String(correctValue)) {
      btn.classList.add('is-wrong');
    }
  });

  if (isCorrect) {
    state.correct += 1;
    state.totalCorrect += 1;
    state.currentStreak += 1;
    state.bestStreak = Math.max(state.bestStreak, state.currentStreak);
    state.score += 12;
    speakToPlayer(state.correct % 2 === 0 ? 'MANDOU BEM! VOCÊ ENTENDEU A IDEIA.' : 'BOA! ESSE RACIOCÍNIO ESTÁ CERTO.');
    if (answerFeedback) answerFeedback.textContent = `Acertou! ${formatAnswer(correctValue)}. ${explanation}`;
    if (window.GeniosApp && typeof window.GeniosApp.addCoins === 'function') {
      window.GeniosApp.addCoins(10);
    }
  } else {
    state.wrong += 1;
    state.totalWrong += 1;
    state.currentStreak = 0;
    state.score = Math.max(0, state.score - 4);
    state.retryReason = explanation;
    speakToPlayer(`DICA: ${explanation}`);
    if (answerFeedback) answerFeedback.textContent = `Vamos revisar: ${explanation}`;
  }

  scoreEl.textContent = `${state.score} pts`;
  acertosEl.textContent = `${state.correct} acertos`;
  errosEl.textContent = `${state.wrong} erros`;

  state.awaitingAdvance = true;
  schedulePendingAction(advanceAfterAnswer, isCorrect ? 900 : 4000);
  saveCurrentDraft();
}

function triggerLevelCelebration() {
  burstCruzeiroStars();
  const celebration = document.createElement('div');
  celebration.className = 'star-burst is-active';
  celebration.setAttribute('aria-hidden', 'true');
  celebration.innerHTML = `
    <img class="star-burst__selo" src="assets/logo-cruzeiro-do-sul-estrela-512.webp" alt="" />
  `;
  document.querySelector('.question-card')?.appendChild(celebration);
  window.setTimeout(() => celebration.remove(), 1200);
}

function finishLevel() {
  const target = state.levelTarget || levelMap[state.level]?.target || 2;
  const passed = state.correct >= target;

  if (passed && state.level < maxLevel) {
    triggerLevelCelebration();
    state.level += 1;
    state.index = 0;
    state.correct = 0;
    state.wrong = 0;
    currentQuestions = getQuestionsForLevel();
    saveCurrentDraft();
    questionMeta.textContent = `${levelMap[state.level]?.label || 'Próxima fase'} · ${gameInfo.label}`;
    questionPrompt.textContent = `Nível concluído! 🎉 Vamos para ${levelMap[state.level]?.label || 'a próxima aventura'}!`;
    speakToPlayer('NÍVEL CONCLUÍDO! VOCÊ ESTÁ PRONTO PARA A PRÓXIMA MISSÃO!');
    optionsGrid.innerHTML = `
      <div class="card" style="grid-column: 1 / -1;">
        <p class="hint text-center" style="margin: 0;">Parabéns! Você terminou este nível e desbloqueou o próximo desafio.</p>
        <div style="margin-top: 16px; text-align: center;">
          <button type="button" class="btn btn--primary" id="nextLevelBtn">Próxima fase</button>
        </div>
      </div>
    `;
    progressDots.innerHTML = '';
    progressBar.style.width = '100%';
    progressBar.setAttribute('aria-valuenow', '100');

    const nextButton = document.getElementById('nextLevelBtn');
    nextButton.addEventListener('click', () => {
      renderQuestion();
    });
    return;
  }

  if (passed && state.level >= maxLevel) {
    finishGame();
    return;
  }

  const reason = state.retryReason || 'Tente identificar o grupo da operação e pensar na ideia por trás do cálculo.';
  speakToPlayer('VOCÊ PODE PASSAR DEPOIS DE REVISAR. VAMOS ENTENDER JUNTOS O QUE ACONTECEU.');
  questionMeta.textContent = 'Revise e tente de novo';
  questionPrompt.textContent = 'Você ainda não passou esta fase.';
  optionsGrid.innerHTML = `
    <div class="card" style="grid-column: 1 / -1;">
      <p class="hint text-center" style="margin: 0;">${reason}</p>
      <div style="margin-top: 16px; text-align: center;">
        <button type="button" class="btn btn--primary" id="retryLevelBtn">Tentar novamente</button>
      </div>
    </div>
  `;

  const retryButton = document.getElementById('retryLevelBtn');
  retryButton.addEventListener('click', () => {
    state.index = 0;
    state.correct = 0;
    state.wrong = 0;
    currentQuestions = getQuestionsForLevel();
    state.retryReason = '';
    saveCurrentDraft();
    renderQuestion();
  });
}

function finishGame() {
  state.completed = true;
  window.clearInterval(state.timerId);
  window.clearTimeout(state.advanceTimerId);
  state.timerId = null;
  state.advanceTimerId = null;
  window.GeniosApp?.clearGameDraft?.();

  if (window.GeniosApp) {
    const history = window.GeniosApp.saveGameSession?.({
      gameKey,
      points: state.score,
      acertos: state.totalCorrect,
      erros: state.totalWrong,
      seconds: state.seconds,
      bestStreak: state.bestStreak,
      answers: state.answers,
    }) || [];
    const playedGames = new Set(history.map((session) => session.gameKey));
    const achievements = [
      ['first-game', history.length >= 1],
      ['ten-correct', state.totalCorrect >= 10],
      ['coin-collector', window.GeniosApp.getCoins?.() >= 100],
      ['five-games', history.length >= 5],
      ['all-subjects', playedGames.size >= 5],
      ['perfect-game', state.totalWrong === 0],
      ['streak-master', state.bestStreak >= 5],
      ['speed-run', state.seconds <= 120],
    ];

    achievements.forEach(([id, earned]) => {
      if (earned && window.GeniosApp.unlockAchievement?.(id)) showAchievementToast(id);
    });
  }

  if (window.GeniosApp && typeof window.GeniosApp.upsertScore === 'function') {
    window.GeniosApp.upsertScore(player, {
      points: state.score,
      acertos: state.totalCorrect,
      erros: state.totalWrong,
      tempo: formatElapsed(state.seconds),
    });
  }

  questionMeta.textContent = 'Aventura concluída';
  progressBar.style.width = '100%';
  progressBar.setAttribute('aria-valuenow', '100');
  questionPrompt.textContent = `Você terminou com ${state.score} pontos!`;
  speakToPlayer('PARABÉNS! VOCÊ CONCLUIU A AVENTURA. VEJA SUAS MOEDAS E CONQUISTAS.');
  const summary = document.createElement('section');
  summary.className = 'game-result-summary';
  summary.setAttribute('aria-labelledby', 'gameResultTitle');
  const heading = document.createElement('h2');
  heading.id = 'gameResultTitle';
  heading.textContent = 'Resumo da aventura';
  const metrics = document.createElement('p');
  metrics.className = 'game-result-summary__metrics';
  metrics.textContent = `Acertos: ${state.totalCorrect} · Erros: ${state.totalWrong} · Melhor sequência: ${state.bestStreak} · Tempo: ${state.untimed ? 'Sem limite' : formatElapsed(state.seconds)}`;
  summary.append(heading, metrics);

  const missedAnswers = state.answers.filter((answer) => !answer.correct);
  if (missedAnswers.length > 0) {
    const reviewTitle = document.createElement('h3');
    reviewTitle.textContent = 'Vamos revisar';
    const reviewList = document.createElement('ul');
    missedAnswers.forEach((answer) => {
      const item = document.createElement('li');
      item.textContent = `${answer.prompt} Sua resposta: ${answer.answer}. Resposta: ${answer.correctAnswer}.`;
      reviewList.appendChild(item);
    });
    summary.append(reviewTitle, reviewList);
  } else {
    const perfect = document.createElement('p');
    perfect.textContent = 'Você acertou todas as questões desta aventura!';
    summary.appendChild(perfect);
  }

  const backLink = document.createElement('a');
  backLink.href = 'matematica.html';
  backLink.className = 'btn btn--primary';
  backLink.textContent = 'Voltar às matérias';
  summary.appendChild(backLink);
  optionsGrid.replaceChildren(summary);
  progressDots.innerHTML = '';
  progressBar.style.width = '100%';
}

function showTutorial({ automatic = true } = {}) {
  const alreadySeen = localStorage.getItem('genios-tutorial-seen');
  if (automatic && alreadySeen === 'true') return Promise.resolve();

  const modal = document.createElement('div');
  modal.className = 'tutorial-modal';
  modal.innerHTML = `
    <div class="tutorial-card">
      <span class="eyebrow">Primeira missão guiada</span>
      <h3 id="tutorialTitle">Veja como jogar</h3>
      <p id="tutorialText" class="tutorial-text">O jogo vai resolver uma questão de exemplo para você.</p>
      <div class="tutorial-demo" aria-live="polite">
        <div class="tutorial-demo__prompt" id="tutorialPrompt"></div>
        <div class="tutorial-demo__options" id="tutorialOptions"></div>
      </div>
      <div class="tutorial-tip" id="tutorialTip">Observe o caminho e depois será a sua vez.</div>
      <div class="tutorial-actions">
        <button type="button" class="btn btn--primary" id="tutorialNext">Continuar</button>
        <button type="button" class="btn btn--ghost tutorial-skip" id="tutorialSkip">Pular tutorial</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  const title = document.getElementById('tutorialTitle');
  const text = document.getElementById('tutorialText');
  const prompt = document.getElementById('tutorialPrompt');
  const options = document.getElementById('tutorialOptions');
  const tip = document.getElementById('tutorialTip');
  const nextButton = document.getElementById('tutorialNext');
  const demoQuestion = {
    prompt: 'Na feira, havia 3 maçãs e chegaram mais 2. Quantas maçãs há agora?',
    options: ['4', '5', '6'],
    correct: '5',
  };

  prompt.textContent = demoQuestion.prompt;
  options.innerHTML = demoQuestion.options.map((option) => `<span class="tutorial-option">${option}</span>`).join('');

  let resolveTutorial;
  const timeouts = [];
  const finish = () => {
    timeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
    localStorage.setItem('genios-tutorial-seen', 'true');
    modal.remove();
    if (resolveTutorial) resolveTutorial();
  };

  document.getElementById('tutorialSkip').addEventListener('click', finish);

  return new Promise((resolve) => {
    resolveTutorial = resolve;
    const showStepOne = () => {
      title.textContent = '1. Leia a história';
      text.textContent = 'Cada pergunta conta uma situação do dia a dia. Primeiro, entenda o que aconteceu.';
      tip.textContent = 'Aqui precisamos juntar 3 maçãs com mais 2.';
    };

    const showStepTwo = () => {
      title.textContent = '2. Escolha uma resposta';
      text.textContent = 'Agora o jogo mostra algumas opções. A resposta certa vai ser destacada.';
      options.querySelectorAll('.tutorial-option').forEach((option) => {
        if (option.textContent === demoQuestion.correct) option.classList.add('is-correct');
      });
      tip.textContent = '3 + 2 = 5. Acertar também rende moedas!';
    };

    const showStepThree = () => {
      title.textContent = '3. Continue tentando';
      text.textContent = 'Se errar, você pode passar pela fase, mas terá que revisar a explicação para concluí-la.';
      tip.textContent = 'Pronto! Agora é a sua vez de jogar.';
      nextButton.textContent = 'Começar a jogar';
    };

    if (automatic) {
      nextButton.style.display = 'none';
      timeouts.push(window.setTimeout(showStepOne, 900));
      timeouts.push(window.setTimeout(showStepTwo, 2500));
      timeouts.push(window.setTimeout(showStepThree, 4900));
      timeouts.push(window.setTimeout(finish, 6700));
      return;
    }

    let step = 0;
    nextButton.addEventListener('click', () => {
      step += 1;
      if (step === 1) showStepOne();
      if (step === 2) showStepTwo();
      if (step >= 3) finish();
    });
  });
}

const tutorialButton = document.getElementById('tutorialButton');
if (tutorialButton) {
  tutorialButton.addEventListener('click', async () => {
    if (state.timerId) {
      window.clearInterval(state.timerId);
      state.timerId = null;
    }

    tutorialButton.disabled = true;
    localStorage.removeItem('genios-tutorial-seen');
    await showTutorial({ automatic: false });
    startTimer();
    tutorialButton.disabled = false;
  });
}

setupQuestionTools();

if (isRestoringGame) {
  pauseStatus.textContent = 'Encontramos uma partida salva. Continue de onde parou ou comece novamente.';
  pauseOverlay.hidden = false;
} else {
  showTutorial({ automatic: !manualTutorialRequested }).then(() => {
    startTimer();
    renderQuestion();
  });
}
