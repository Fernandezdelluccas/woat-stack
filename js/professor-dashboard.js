// Carrega, na tabela "Desempenho por aluno", as pontuações reais do Supabase
// filtradas pelo professor logado (o professor já vem pronto em cada linha,
// preenchido automaticamente pelo trigger do banco a partir da turma do aluno).
(function () {
  const STORAGE_PROFESSOR = 'genios-professor-nome';

  async function carregarDesempenho() {
    const tbody = document.getElementById('alunosDesempenho');
    const professor = localStorage.getItem(STORAGE_PROFESSOR);

    if (!tbody || !window.supabaseClient || !professor) {
      return;
    }

    const { data, error } = await window.supabaseClient
      .from('pontuacoes')
      .select('nome_aluno, turma, pontos')
      .eq('professor', professor)
      .order('pontos', { ascending: false });

    if (error) {
      console.error('Erro ao carregar desempenho dos alunos:', error.message);
      tbody.innerHTML = '<tr><td colspan="3" class="hint text-center">Não foi possível carregar os dados.</td></tr>';
      return;
    }

    tbody.innerHTML = '';

    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" class="hint text-center">Nenhum aluno pontuou ainda.</td></tr>';
      return;
    }

    data.forEach((item) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="player-cell">${escapeHtml(item.nome_aluno)}</td>
        <td>${escapeHtml(item.turma)}</td>
        <td><span class="tag tag--correct">${item.pontos}</span></td>
      `;
      tbody.appendChild(tr);
    });
  }

  function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value;
    return div.innerHTML;
  }

  // Dispara assim que o login é feito com sucesso...
  document.addEventListener('professor:login', carregarDesempenho);

  // ...e também se a página carregar com uma sessão já salva.
  document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('genios-professor-auth') === 'true') {
      carregarDesempenho();
    }
  });
})();
