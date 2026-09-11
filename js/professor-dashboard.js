// Carrega, na tabela "Desempenho por aluno", as pontuações reais do Supabase
// filtradas pelo professor logado, cruzando com o log de respostas para
// mostrar acertos/erros e permitir abrir o detalhamento fase a fase de cada
// aluno (visão individual do professor).
(function () {
  const STORAGE_PROFESSOR = 'genios-professor-nome';

  const FASE_LABELS = {
    adicao: 'Adição',
    subtracao: 'Subtração',
    multiplicacao: 'Multiplicação',
    divisao: 'Divisão',
    formas: 'Formas Geométricas',
    fracoes: 'Frações',
    sequencias: 'Números e Sequências',
    problemas: 'Situações-Problema',
  };

  async function carregarDesempenho() {
    const tbody = document.getElementById('alunosDesempenho');
    const professor = localStorage.getItem(STORAGE_PROFESSOR);

    if (!tbody || !window.supabaseClient || !professor) {
      return;
    }

    const { data: pontuacoes, error } = await window.supabaseClient
      .from('pontuacoes')
      .select('nome_aluno, turma, pontos')
      .eq('professor', professor)
      .order('pontos', { ascending: false });

    if (error) {
      console.error('Erro ao carregar desempenho dos alunos:', error.message);
      tbody.innerHTML = '<tr><td colspan="6" class="hint text-center">Não foi possível carregar os dados.</td></tr>';
      return;
    }

    if (!pontuacoes || pontuacoes.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="hint text-center">Nenhum aluno pontuou ainda.</td></tr>';
      return;
    }

    const turmas = Array.from(new Set(pontuacoes.map((p) => p.turma)));
    let respostas = [];

    if (turmas.length > 0) {
      const { data, error: erroRespostas } = await window.supabaseClient
        .from('respostas')
        .select('nome_aluno, turma, fase_key, correta')
        .in('turma', turmas);

      if (erroRespostas) {
        console.error('Erro ao carregar respostas dos alunos:', erroRespostas.message);
      } else if (data) {
        respostas = data;
      }
    }

    tbody.innerHTML = '';

    pontuacoes.forEach((aluno) => {
      const respostasAluno = respostas.filter(
        (r) => r.nome_aluno === aluno.nome_aluno && r.turma === aluno.turma
      );
      const acertos = respostasAluno.filter((r) => r.correta).length;
      const erros = respostasAluno.length - acertos;
      const pct = respostasAluno.length ? Math.round((acertos / respostasAluno.length) * 100) : 0;

      const linha = document.createElement('tr');
      linha.className = 'aluno-detalhe-row';
      linha.innerHTML = `
        <td class="player-cell">${escapeHtml(aluno.nome_aluno)}</td>
        <td>${escapeHtml(aluno.turma)}</td>
        <td><span class="tag tag--correct">${aluno.pontos}</span></td>
        <td><span class="tag tag--correct">${acertos}</span></td>
        <td><span class="tag tag--wrong">${erros}</span></td>
        <td>${respostasAluno.length ? `${pct}%` : '—'}</td>
      `;

      const detalhe = document.createElement('tr');
      detalhe.className = 'aluno-detalhe';
      detalhe.innerHTML = `<td colspan="6">${montarDetalhePorFase(respostasAluno)}</td>`;

      linha.addEventListener('click', () => detalhe.classList.toggle('is-aberto'));

      tbody.appendChild(linha);
      tbody.appendChild(detalhe);
    });
  }

  function montarDetalhePorFase(respostasAluno) {
    if (respostasAluno.length === 0) {
      return '<p class="hint" style="margin:10px 4px;">Esse aluno ainda não respondeu nenhuma pergunta.</p>';
    }

    const porFase = {};
    respostasAluno.forEach((r) => {
      if (!porFase[r.fase_key]) porFase[r.fase_key] = { acertos: 0, erros: 0 };
      if (r.correta) porFase[r.fase_key].acertos += 1;
      else porFase[r.fase_key].erros += 1;
    });

    const linhas = Object.entries(porFase)
      .map(([faseKey, dados]) => `
        <div class="legend" style="justify-content: space-between; padding: 8px 4px; border-bottom: 1px solid var(--color-border);">
          <strong>${FASE_LABELS[faseKey] || faseKey}</strong>
          <span>
            <span class="tag tag--correct">${dados.acertos} acertos</span>
            <span class="tag tag--wrong">${dados.erros} erros</span>
          </span>
        </div>
      `)
      .join('');

    return `<div style="padding: 6px 10px;">${linhas}</div>`;
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
