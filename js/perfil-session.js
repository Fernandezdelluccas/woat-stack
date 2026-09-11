// Perfis das crianças — guardados neste aparelho (sem senha, sem login real).
// Cada perfil é {nome, serie, avatar}. Vários perfis podem existir no mesmo
// aparelho (irmãos, colegas de turma usando o mesmo computador) e cada um
// escolhe o próprio card na tela "Quem vai jogar?" (index.html).
(function () {
  const KEY_PERFIS = 'genios-perfis';
  const KEY_ATIVO = 'genios-perfil-ativo';

  function chave(perfil) {
    return `${perfil.nome.trim().toLowerCase()}|${perfil.serie}`;
  }

  function listarPerfis() {
    try {
      const raw = localStorage.getItem(KEY_PERFIS);
      const perfis = raw ? JSON.parse(raw) : [];
      return Array.isArray(perfis) ? perfis : [];
    } catch (err) {
      return [];
    }
  }

  function salvarPerfis(perfis) {
    localStorage.setItem(KEY_PERFIS, JSON.stringify(perfis));
  }

  function criarPerfil({ nome, serie, avatar }) {
    const perfil = { nome: nome.trim(), serie, avatar: avatar || '🦊' };
    const perfis = listarPerfis();
    const existente = perfis.find((p) => chave(p) === chave(perfil));

    if (existente) {
      existente.avatar = perfil.avatar;
    } else {
      perfis.push(perfil);
    }

    salvarPerfis(perfis);
    selecionarPerfil(perfil.nome, perfil.serie);
    return perfil;
  }

  function selecionarPerfil(nome, serie) {
    localStorage.setItem(KEY_ATIVO, chave({ nome, serie }));
  }

  function getPerfilAtivo() {
    const ativoKey = localStorage.getItem(KEY_ATIVO);
    if (!ativoKey) return null;

    return listarPerfis().find((p) => chave(p) === ativoKey) || null;
  }

  function trocarPerfil() {
    localStorage.removeItem(KEY_ATIVO);
  }

  function removerPerfil(nome, serie) {
    const alvo = chave({ nome, serie });
    salvarPerfis(listarPerfis().filter((p) => chave(p) !== alvo));

    if (localStorage.getItem(KEY_ATIVO) === alvo) {
      trocarPerfil();
    }
  }

  window.PerfilSession = {
    listarPerfis,
    criarPerfil,
    selecionarPerfil,
    getPerfilAtivo,
    trocarPerfil,
    removerPerfil,
  };
})();
