// Cliente Supabase — somente a chave publicável pode ficar no navegador.
(function () {
  const SUPABASE_URL = 'https://vvcdxxcdhmetfvdtwkpq.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_caBAb53v3jHWkyGuyQo_1Q_1xd8E5mf';

  if (!window.supabase) {
    console.error('supabase-js não carregado. Verifique se o script do CDN está antes deste arquivo.');
    return;
  }

  window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { detectSessionInUrl: false },
  });
  window.teacherSupabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { storageKey: 'genios-teacher-session' },
  });

  // Sessão só em memória: logar a diretoria não pode substituir a sessão anônima do aluno.
  window.createEphemeralSupabaseClient = () => window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'genios-director-session' },
  });
})();
