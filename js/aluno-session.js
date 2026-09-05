// Guarda a identidade do aluno (nome + turma) no localStorage,
// para ser usada no jogo (salvar pontos) e no ranking (filtrar por turma).
(function () {
  const KEY_NOME = 'genios-aluno-nome';
  const KEY_TURMA = 'genios-aluno-turma';

  function salvarAluno(nome, turma) {
    localStorage.setItem(KEY_NOME, nome);
    localStorage.setItem(KEY_TURMA, turma);
  }

  function getAluno() {
    return {
      nome: localStorage.getItem(KEY_NOME) || '',
      turma: localStorage.getItem(KEY_TURMA) || '',
    };
  }

  window.AlunoSession = { salvarAluno, getAluno };
})();
