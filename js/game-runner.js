import { buildQuestions, getGameDefinition, formatAnswer } from './game.mjs';

const gameKey = new URLSearchParams(window.location.search).get('game') || 'adicao';
const gameInfo = getGameDefinition(gameKey);
const questions = buildQuestions(gameKey, 10);

const state = {
  index: 0,
  score: 0,
  correct: 0,
  wrong: 0,
  seconds: 0,
  timerId: null,
};

const questionMeta = document.getElementById('questionMeta');
const questionPrompt = document.getElementById('questionPrompt');
const optionsGrid = document.getElementById('optionsGrid');
const progressBar = document.getElementById('progressBar');
const progressDots = document.getElementById('progressDots');
const scoreEl = document.getElementById('score');
const acertosEl = document.getElementById('acertos');
const errosEl = document.getElementById('erros');
const tempoEl = document.getElementById('tempo');

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
  for (let i = 0; i < questions.length; i += 1) {
    const dot = document.createElement('span');
    if (i < state.index) dot.classList.add('done');
    if (i === state.index) dot.classList.add('current');
    progressDots.appendChild(dot);
  }
}

function renderQuestion() {
  const current = questions[state.index];

  if (!current) {
    finishGame();
    return;
  }

  questionMeta.textContent = `Pergunta ${state.index + 1} de ${questions.length} · ${gameInfo.label}`;
  questionPrompt.textContent = current.prompt;
  optionsGrid.innerHTML = '';

  current.options.forEach((option) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'option-btn';
    button.textContent = formatAnswer(option);
    button.addEventListener('click', () => answerQuestion(button, option, current.correctAnswer));
    optionsGrid.appendChild(button);
  });

  renderProgressDots();
  const percent = ((state.index) / questions.length) * 100;
  progressBar.style.width = `${percent}%`;
}

function answerQuestion(button, selectedValue, correctValue) {
  const isCorrect = selectedValue === correctValue || String(selectedValue) === String(correctValue);

  document.querySelectorAll('.option-btn').forEach((btn) => {
    btn.disabled = true;
    const value = btn.textContent;
    const matches = value === String(correctValue) || value === String(selectedValue);
    if (String(value) === String(correctValue)) {
      btn.classList.add('is-correct');
    }
    if (isCorrect === false && matches && String(value) !== String(correctValue)) {
      btn.classList.add('is-wrong');
    }
  });

  if (isCorrect) {
    state.correct += 1;
    state.score += 10;
  } else {
    state.wrong += 1;
    state.score = Math.max(0, state.score - 5);
  }

  scoreEl.textContent = `${state.score} pts`;
  acertosEl.textContent = `${state.correct} acertos`;
  errosEl.textContent = `${state.wrong} erros`;

  window.setTimeout(() => {
    state.index += 1;
    renderQuestion();
  }, 750);
}

function finishGame() {
  window.clearInterval(state.timerId);
  questionMeta.textContent = 'Jogo concluído';
  questionPrompt.textContent = `Você terminou com ${state.score} pontos!`;
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

startTimer();
renderQuestion();
