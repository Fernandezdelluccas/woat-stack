// Renderiza o grid de fases de Matemática (matematica.html), buscando o
// progresso do aluno em "progresso_fases" pra saber o que está destravado.
import { FASES } from './game.mjs';

async function init() {
  const perfil = window.PerfilSession && window.PerfilSession.getPerfilAtivo();
  const grid = document.getElementById('fasesGrid');
  if (!perfil || !grid) return;

  let progresso = [];
  if (window.supabaseClient) {
    const { data, error } = await window.supabaseClient
      .from('progresso_fases')
      .select('fase_key, nivel_atual, niveis_concluidos, concluida')
      .eq('nome_aluno', perfil.nome)
      .eq('turma', perfil.serie);

    if (error) {
      console.error('Erro ao carregar progresso das fases:', error.message);
    } else if (data) {
      progresso = data;
    }
  }

  const porFase = Object.fromEntries(progresso.map((p) => [p.fase_key, p]));

  grid.innerHTML = '';

  FASES.forEach((fase, index) => {
    const anteriorKey = index > 0 ? FASES[index - 1].key : null;
    const anteriorEstado = anteriorKey ? porFase[anteriorKey] : null;
    const desbloqueada = index === 0 || Boolean(anteriorEstado && anteriorEstado.concluida);

    const estado = porFase[fase.key];
    const nivelAtual = Math.min(estado ? estado.nivel_atual : 1, 20);
    const niveisConcluidos = estado ? estado.niveis_concluidos : 0;
    const concluida = Boolean(estado && estado.concluida);
    const progressoPct = Math.round((niveisConcluidos / 20) * 100);

    const el = document.createElement(desbloqueada ? 'a' : 'div');
    el.className = `tile fase-tile${desbloqueada ? '' : ' tile--disabled'}`;

    if (desbloqueada) {
      el.href = `jogo.html?fase=${fase.key}&nivel=${nivelAtual}`;
    }

    const badge = concluida
      ? '<span class="badge badge--live">Concluída ⭐</span>'
      : desbloqueada
        ? ''
        : '<span class="badge">🔒 Bloqueada</span>';

    const rodape = desbloqueada
      ? `<div class="fase-progress">
           <div class="progress-bar"><div class="progress-bar__fill" style="width:${progressoPct}%;"></div></div>
           <span class="hint">Nível ${nivelAtual} de 20</span>
         </div>`
      : '<p class="hint" style="margin:0;">Termine a fase anterior para desbloquear.</p>';

    el.innerHTML = `
      ${badge}
      <div class="tile__icon">${fase.icon}</div>
      <h3 class="tile__title">${fase.label}</h3>
      <p class="tile__desc">${fase.description}</p>
      ${rodape}
    `;

    grid.appendChild(el);
  });
}

document.addEventListener('DOMContentLoaded', init);
