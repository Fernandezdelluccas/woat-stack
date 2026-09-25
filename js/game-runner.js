import { buildQuestions, getGameDefinition, formatAnswer } from './game.mjs';

const gameKey = new URLSearchParams(window.location.search).get('game') || 'adicao';
const manualTutorialRequested = new URLSearchParams(window.location.search).get('tutorial') === 'manual';
const gameInfo = getGameDefinition(gameKey);
const baseQuestions = buildQuestions(gameKey, 7);
const player = window.GeniosApp?.getPlayer?.() || { nome: 'Jogador', turma: '4º ano', avatar: '🦊', coins: 0 };

const state = {
  index: 0,
  score: 0,
  correct: 0,
  wrong: 0,
  seconds: 0,
  timerId: null,
  level: 1,
  levelTarget: 2,
  retryReason: '',
};

const questionMeta = document.getElementById('questionMeta');
const questionVisual = document.getElementById('questionVisual');
const questionPrompt = document.getElementById('questionPrompt');
const optionsGrid = document.getElementById('optionsGrid');
const progressBar = document.getElementById('progressBar');
const progressDots = document.getElementById('progressDots');
const scoreEl = document.getElementById('score');
const acertosEl = document.getElementById('acertos');
const errosEl = document.getElementById('erros');
const tempoEl = document.getElementById('tempo');
const companionBubble = document.getElementById('companionBubble');
const gameCompanion = document.getElementById('gameCompanion');
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
  const generatedQuestions = buildQuestions(gameKey, requestedTotal + 3);
  return generatedQuestions.slice(0, requestedTotal);
}

let currentQuestions = getQuestionsForLevel();

function startTimer() {
  state.timerId = window.setInterval(() => {
    state.seconds += 1;
    tempoEl.textContent = formatElapsed(state.seconds);
  }, 1000);
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
  questionPrompt.textContent = current.prompt;
  optionsGrid.innerHTML = '';

  current.options.forEach((option) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'option-btn';
    button.textContent = formatAnswer(option);
    button.addEventListener('click', () => answerQuestion(button, option, current.correctAnswer, current.explanation));
    optionsGrid.appendChild(button);
  });

  renderProgressDots();
  const percent = (state.index / currentQuestions.length) * 100;
  progressBar.style.width = `${percent}%`;
}

function speakToPlayer(message) {
  if (!companionBubble) return;
  companionBubble.classList.remove('is-speaking');
  window.requestAnimationFrame(() => {
    companionBubble.textContent = message.toUpperCase();
    companionBubble.classList.add('is-speaking');
  });
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
    playPetSound();
    gameCompanion.classList.add('is-petted');
    petTapCount += 1;
    if (petTapResetTimer) window.clearTimeout(petTapResetTimer);
    petTapResetTimer = window.setTimeout(() => { petTapCount = 0; }, 1800);
    if (petTapCount >= 3) {
      speakToPlayer('QUER MUDAR DE PET? CLIQUE E SEGURE EM MIM PARA ABRIR A LOJA!');
    } else {
      speakToPlayer(getPetAffectionPhrase());
    }
    window.setTimeout(() => gameCompanion.classList.remove('is-petted'), 650);
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
  const isCorrect = selectedValue === correctValue || String(selectedValue) === String(correctValue);
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
    state.score += 12;
    speakToPlayer(state.correct % 2 === 0 ? 'MANDOU BEM! VOCÊ ENTENDEU A IDEIA.' : 'BOA! ESSE RACIOCÍNIO ESTÁ CERTO.');
    if (window.GeniosApp && typeof window.GeniosApp.addCoins === 'function') {
      window.GeniosApp.addCoins(10);
    }
  } else {
    state.wrong += 1;
    state.score = Math.max(0, state.score - 4);
    state.retryReason = explanation;
    speakToPlayer(`DICA: ${explanation}`);
  }

  scoreEl.textContent = `${state.score} pts`;
  acertosEl.textContent = `${state.correct} acertos`;
  errosEl.textContent = `${state.wrong} erros`;

  window.setTimeout(() => {
    if (state.index >= currentQuestions.length - 1) {
      finishLevel();
      return;
    }

    state.index += 1;
    renderQuestion();
  }, isCorrect ? 900 : 4000);
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
  const target = levelMap[state.level]?.target || 2;
  const passed = state.correct >= target;

  if (passed && state.level < maxLevel) {
    triggerLevelCelebration();
    state.level += 1;
    state.index = 0;
    state.correct = 0;
    state.wrong = 0;
    currentQuestions = getQuestionsForLevel();
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
    renderQuestion();
  });
}

function finishGame() {
  window.clearInterval(state.timerId);

  if (window.GeniosApp) {
    if (window.GeniosApp.unlockAchievement?.('first-game')) showAchievementToast('first-game');
    if (state.correct >= 10 && window.GeniosApp.unlockAchievement?.('ten-correct')) showAchievementToast('ten-correct');
    if (window.GeniosApp.getCoins?.() >= 100 && window.GeniosApp.unlockAchievement?.('coin-collector')) showAchievementToast('coin-collector');
  }

  if (window.GeniosApp && typeof window.GeniosApp.upsertScore === 'function') {
    window.GeniosApp.upsertScore(player, {
      points: state.score,
      acertos: state.correct,
      erros: state.wrong,
      tempo: formatElapsed(state.seconds),
    });
  }

  questionMeta.textContent = 'Jogo concluído';
  questionPrompt.textContent = `Você terminou com ${state.score} pontos!`;
  speakToPlayer('PARABÉNS! VOCÊ CONCLUIU A AVENTURA. VEJA SUAS MOEDAS E CONQUISTAS.');
  optionsGrid.innerHTML = `
    <div class="card" style="grid-column: 1 / -1;">
      <p class="hint text-center" style="margin: 0;">Acertos: ${state.correct} · Erros: ${state.wrong} · Tempo: ${formatElapsed(state.seconds)}</p>
      <div style="margin-top: 16px; text-align: center;">
        <a href="matematica.html" class="btn btn--primary">Voltar às matérias</a>
      </div>
    </div>
  `;
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

showTutorial({ automatic: !manualTutorialRequested }).then(() => {
  startTimer();
  renderQuestion();
});
