import { buildQuestions, getFaseDefinition, formatAnswer } from './game.mjs';

const TOTAL_PERGUNTAS = 8;
const LIMIAR_APROVACAO = 0.5;

const perfil = window.PerfilSession ? window.PerfilSession.getPerfilAtivo() : null;

if (!perfil) {
  window.location.href = 'index.html';
  throw new Error('Sem perfil ativo — redirecionando.');
}

const params = new URLSearchParams(window.location.search);
const faseKey = getFaseDefinition(params.get('fase')).key;
const nivel = Math.min(Math.max(parseInt(params.get('nivel'), 10) || 1, 1), 20);
const faseInfo = getFaseDefinition(faseKey);

const questionMeta = document.getElementById('questionMeta');
const questionPrompt = document.getElementById('questionPrompt');
const optionsGrid = document.getElementById('optionsGrid');
const feedbackText = document.getElementById('feedbackText');
const progressBar = document.getElementById('progressBar');
const progressDots = document.getElementById('progressDots');
const scoreEl = document.getElementById('score');
const acertosEl = document.getElementById('acertos');
const errosEl = document.getElementById('erros');
const nivelAtualEl = document.getElementById('nivelAtual');
const starBurst = document.getElementById('starBurst');
const jogoArea = document.getElementById('jogoArea');
const resumeCard = document.getElementById('resumeCard');
const finalCard = document.getElementById('finalCard');
const finalConteudo = document.getElementById('finalConteudo');

nivelAtualEl.textContent = `Nível ${nivel} de 20`;

const chaveSessao = `genios-sessao-${perfil.nome}|${perfil.serie}|${faseKey}|${nivel}`;

let state = carregarSalvo();

if (state && state.index > 0 && state.index < state.perguntas.length) {
  jogoArea.style.display = 'none';
  resumeCard.style.display = 'block';
} else {
  state = novoEstado();
  iniciar();
}

document.getElementById('continuarBtn').addEventListener('click', () => {
  resumeCard.style.display = 'none';
  jogoArea.style.display = 'block';
  iniciar();
});

document.getElementById('recomecarBtn').addEventListener('click', () => {
  state = novoEstado();
  resumeCard.style.display = 'none';
  jogoArea.style.display = 'block';
  iniciar();
});

function novoEstado() {
  return {
    perguntas: buildQuestions(faseKey, nivel, TOTAL_PERGUNTAS),
    index: 0,
    score: 0,
    correct: 0,
    wrong: 0,
  };
}

function carregarSalvo() {
  try {
    const raw = localStorage.getItem(chaveSessao);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

function salvarEstado() {
  localStorage.setItem(chaveSessao, JSON.stringify(state));
}

function limparSalvo() {
  localStorage.removeItem(chaveSessao);
}

function iniciar() {
  atualizarHud();
  renderQuestion();
}

function atualizarHud() {
  scoreEl.textContent = `${state.score} pts`;
  acertosEl.textContent = `${state.correct} acertos`;
  errosEl.textContent = `${state.wrong} erros`;
}

function renderProgressDots() {
  progressDots.innerHTML = '';
  state.perguntas.forEach((_, i) => {
    const dot = document.createElement('span');
    if (i < state.index) dot.classList.add('done');
    if (i === state.index) dot.classList.add('current');
    progressDots.appendChild(dot);
  });
}

function renderQuestion() {
  const current = state.perguntas[state.index];

  if (!current) {
    finishLevel();
    return;
  }

  feedbackText.style.display = 'none';
  questionMeta.textContent = `Pergunta ${state.index + 1} de ${state.perguntas.length} · ${faseInfo.label} · Nível ${nivel}`;
  questionPrompt.textContent = current.prompt;
  optionsGrid.innerHTML = '';

  current.options.forEach((option) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'option-btn';
    button.textContent = formatAnswer(option);
    button.addEventListener('click', () => answerQuestion(button, option, current));
    optionsGrid.appendChild(button);
  });

  renderProgressDots();
  progressBar.style.width = `${(state.index / state.perguntas.length) * 100}%`;
}

function answerQuestion(button, selectedValue, current) {
  const isCorrect = String(selectedValue) === String(current.correctAnswer);

  document.querySelectorAll('.option-btn').forEach((btn) => {
    btn.disabled = true;
    const value = btn.textContent;
    if (value === String(current.correctAnswer)) {
      btn.classList.add('is-correct');
    }
    if (!isCorrect && value === String(selectedValue)) {
      btn.classList.add('is-wrong');
    }
  });

  if (isCorrect) {
    state.correct += 1;
    state.score += 10;
    dispararEstrelas();
    feedbackText.textContent = `🎉 Muito bem! ${current.explicacao}`;
    feedbackText.className = 'feedback-text feedback-text--correta';
  } else {
    state.wrong += 1;
    state.score = Math.max(0, state.score - 5);
    feedbackText.textContent = `❌ Não foi dessa vez. ${current.explicacao}`;
    feedbackText.className = 'feedback-text feedback-text--errada';
  }

  feedbackText.style.display = 'block';
  atualizarHud();

  registrarResposta(current, selectedValue, isCorrect);
  if (isCorrect) {
    somarPontos(10);
  }

  state.index += 1;
  salvarEstado();

  window.setTimeout(() => {
    renderQuestion();
  }, isCorrect ? 1000 : 1700);
}

function dispararEstrelas() {
  starBurst.innerHTML = '';

  for (let i = 0; i < 10; i += 1) {
    const estrela = document.createElement('img');
    estrela.className = 'star-burst__star';
    estrela.src = 'img/logo-cruzeiro-do-sul.png';
    estrela.alt = '';
    estrela.setAttribute('aria-hidden', 'true');
    estrela.style.setProperty('--angulo', `${(360 / 10) * i}deg`);
    estrela.style.setProperty('--atraso', `${Math.random() * 0.15}s`);
    starBurst.appendChild(estrela);
  }

  const selo = document.createElement('img');
  selo.className = 'star-burst__selo';
  selo.src = 'img/logo-cruzeiro-do-sul.png';
  selo.alt = 'Cruzeiro do Sul';
  starBurst.appendChild(selo);

  starBurst.classList.remove('is-active');
  void starBurst.offsetWidth;
  starBurst.classList.add('is-active');

  window.setTimeout(() => {
    starBurst.classList.remove('is-active');
    starBurst.innerHTML = '';
  }, 1000);
}

async function registrarResposta(current, respostaDada, correta) {
  if (!window.supabaseClient) return;

  const { error } = await window.supabaseClient.from('respostas').insert([{
    nome_aluno: perfil.nome,
    turma: perfil.serie,
    fase_key: faseKey,
    nivel,
    correta,
    pergunta: current.prompt,
    resposta_dada: formatAnswer(respostaDada),
    resposta_correta: formatAnswer(current.correctAnswer),
  }]);

  if (error) {
    console.error('Erro ao registrar resposta:', error.message);
  }
}

async function somarPontos(delta) {
  if (!window.supabaseClient) return;

  const { error } = await window.supabaseClient.rpc('somar_pontos', {
    p_nome: perfil.nome,
    p_turma: perfil.serie,
    p_delta: delta,
  });

  if (error) {
    console.error('Erro ao somar pontos:', error.message);
  }
}

async function atualizarProgresso() {
  if (!window.supabaseClient) {
    return { concluida: nivel >= 20, proximoNivel: Math.min(nivel + 1, 20) };
  }

  const { data: existente } = await window.supabaseClient
    .from('progresso_fases')
    .select('nivel_atual, niveis_concluidos')
    .eq('nome_aluno', perfil.nome)
    .eq('turma', perfil.serie)
    .eq('fase_key', faseKey)
    .maybeSingle();

  const niveisConcluidosAtual = existente ? existente.niveis_concluidos : 0;
  const novoNiveisConcluidos = Math.max(niveisConcluidosAtual, nivel);
  const concluida = nivel >= 20;
  const nivelAtualExistente = existente ? existente.nivel_atual : 1;
  const novoNivelAtual = concluida ? 20 : Math.max(nivelAtualExistente, nivel + 1);

  const { error } = await window.supabaseClient.from('progresso_fases').upsert([{
    nome_aluno: perfil.nome,
    turma: perfil.serie,
    fase_key: faseKey,
    nivel_atual: novoNivelAtual,
    niveis_concluidos: novoNiveisConcluidos,
    concluida,
    atualizado_em: new Date().toISOString(),
  }], { onConflict: 'nome_aluno,turma,fase_key' });

  if (error) {
    console.error('Erro ao salvar progresso da fase:', error.message);
  }

  return { concluida, proximoNivel: novoNivelAtual };
}

async function finishLevel() {
  limparSalvo();
  jogoArea.style.display = 'none';
  finalCard.style.display = 'block';

  const aproveitamento = state.correct / state.perguntas.length;
  const passou = aproveitamento >= LIMIAR_APROVACAO;

  if (!passou) {
    finalConteudo.innerHTML = `
      <h2>Quase lá! 💪</h2>
      <p>Você acertou ${state.correct} de ${state.perguntas.length} perguntas. Que tal tentar de novo pra destravar o próximo nível?</p>
      <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap; margin-top:18px;">
        <button type="button" class="btn btn--primary" onclick="window.location.reload()">Tentar de novo</button>
        <a href="matematica.html" class="btn btn--ghost">Voltar às fases</a>
      </div>
    `;
    return;
  }

  const { concluida, proximoNivel } = await atualizarProgresso();

  if (concluida) {
    finalConteudo.innerHTML = `
      <h2>🏆 Fase concluída!</h2>
      <p>Você terminou os 20 níveis de ${faseInfo.label}! A próxima fase já está destravada.</p>
      <div style="margin-top:18px;">
        <a href="matematica.html" class="btn btn--primary">Ver as fases</a>
      </div>
    `;
    return;
  }

  finalConteudo.innerHTML = `
    <h2>✅ Nível concluído!</h2>
    <p>Você acertou ${state.correct} de ${state.perguntas.length} perguntas. Nível ${proximoNivel} destravado!</p>
    <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap; margin-top:18px;">
      <a href="jogo.html?fase=${faseKey}&nivel=${proximoNivel}" class="btn btn--primary">Próximo nível</a>
      <a href="matematica.html" class="btn btn--ghost">Voltar às fases</a>
    </div>
  `;
}
