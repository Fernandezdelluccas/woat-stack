// Busca as pontuações no Supabase, filtradas pela turma do aluno logado,
// e renderiza a tabela de ranking ordenada da maior para a menor pontuação.
(function () {
  const MEDALHAS = ['🥇 1º', '🥈 2º', '🥉 3º'];

  async function carregarRanking() {
    const tbody = document.getElementById('rankingBody');
    if (!tbody || !window.supabaseClient) {
      return;
    }

    const aluno = window.AlunoSession ? window.AlunoSession.getAluno() : { turma: '' };

    let query = window.supabaseClient
      .from('pontuacoes')
      .select('nome_aluno, turma, pontos')
      .order('pontos', { ascending: false })
      .limit(50);

    if (aluno.turma) {
      query = query.eq('turma', aluno.turma);
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
      return;
    }

    data.forEach((item, index) => {
      const tr = document.createElement('tr');
      const posLabel = MEDALHAS[index] || `${index + 1}º`;
      const posClass =
        index === 0 ? 'rank-pos rank-pos--gold' :
        index === 1 ? 'rank-pos rank-pos--silver' :
        index === 2 ? 'rank-pos rank-pos--bronze' : 'rank-pos';

      tr.innerHTML = `
        <td class="${posClass}">${posLabel}</td>
        <td class="player-cell">${escapeHtml(item.nome_aluno)}</td>
        <td>${escapeHtml(item.turma)}</td>
        <td>${item.pontos}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value;
    return div.innerHTML;
  }

  document.addEventListener('DOMContentLoaded', carregarRanking);
})();
