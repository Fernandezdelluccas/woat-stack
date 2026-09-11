// Busca as pontuações no Supabase (acumuladas por aluno), filtradas pela
// turma do perfil ativo, destaca a própria posição e atualiza em tempo real
// via Supabase Realtime enquanto outros alunos vão respondendo.
(function () {
  const MEDALHAS = ['🥇 1º', '🥈 2º', '🥉 3º'];

  async function carregarRanking() {
    const tbody = document.getElementById('rankingBody');
    const chip = document.getElementById('posicaoChip');
    if (!tbody || !window.supabaseClient) return;

    const perfil = window.PerfilSession ? window.PerfilSession.getPerfilAtivo() : null;

    let query = window.supabaseClient
      .from('pontuacoes')
      .select('nome_aluno, turma, pontos')
      .order('pontos', { ascending: false })
      .limit(50);

    if (perfil && perfil.serie) {
      query = query.eq('turma', perfil.serie);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao carregar ranking:', error.message);
      tbody.innerHTML = '<tr><td colspan="4" class="hint text-center">Não foi possível carregar o ranking.</td></tr>';
      return;
    }

    tbody.innerHTML = '';

    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="hint text-center">Ainda não há pontuações nessa turma. Jogue para aparecer aqui!</td></tr>';
      if (chip) chip.style.display = 'none';
      return;
    }

    let minhaPosicao = null;

    data.forEach((item, index) => {
      const tr = document.createElement('tr');
      const posicao = index + 1;
      const posLabel = MEDALHAS[index] || `${posicao}º`;
      const posClass =
        index === 0 ? 'rank-pos rank-pos--gold' :
        index === 1 ? 'rank-pos rank-pos--silver' :
        index === 2 ? 'rank-pos rank-pos--bronze' : 'rank-pos';

      const souEu = Boolean(perfil) && item.nome_aluno === perfil.nome && item.turma === perfil.serie;
      if (souEu) {
        tr.classList.add('is-me');
        minhaPosicao = posicao;
      }

      tr.innerHTML = `
        <td class="${posClass}">${posLabel}</td>
        <td class="player-cell">${escapeHtml(item.nome_aluno)}${souEu ? ' <span class="hint">(você)</span>' : ''}</td>
        <td>${escapeHtml(item.turma)}</td>
        <td>${item.pontos}</td>
      `;
      tbody.appendChild(tr);
    });

    await atualizarChipPosicao(chip, perfil, minhaPosicao);
  }

  async function atualizarChipPosicao(chip, perfil, minhaPosicao) {
    if (!chip || !perfil) {
      if (chip) chip.style.display = 'none';
      return;
    }

    if (minhaPosicao) {
      chip.textContent = `📍 Sua posição: #${minhaPosicao}`;
      chip.style.display = 'inline-flex';
      return;
    }

    const { data: minhaLinha } = await window.supabaseClient
      .from('pontuacoes')
      .select('pontos')
      .eq('nome_aluno', perfil.nome)
      .eq('turma', perfil.serie)
      .maybeSingle();

    if (!minhaLinha) {
      chip.style.display = 'none';
      return;
    }

    const { count } = await window.supabaseClient
      .from('pontuacoes')
      .select('*', { count: 'exact', head: true })
      .eq('turma', perfil.serie)
      .gt('pontos', minhaLinha.pontos);

    chip.textContent = `📍 Sua posição: #${(count || 0) + 1}`;
    chip.style.display = 'inline-flex';
  }

  function assinarTempoReal(perfil) {
    if (!window.supabaseClient) return;

    const config = { event: '*', schema: 'public', table: 'pontuacoes' };
    if (perfil && perfil.serie) {
      config.filter = `turma=eq.${perfil.serie}`;
    }

    window.supabaseClient
      .channel('ranking-tempo-real')
      .on('postgres_changes', config, () => carregarRanking())
      .subscribe();
  }

  function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value;
    return div.innerHTML;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const perfil = window.PerfilSession ? window.PerfilSession.getPerfilAtivo() : null;
    carregarRanking();
    assinarTempoReal(perfil);
  });
})();
