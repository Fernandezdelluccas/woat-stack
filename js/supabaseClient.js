// Cliente Supabase — usado por game-runner.js, ranking.js e professor-dashboard.js
// Preencha com os dados do seu projeto (Project Settings > API no painel do Supabase).
(function () {
  const SUPABASE_URL = 'https://fttujuqziejkblnytwkk.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0dHVqdXF6aWVqa2Jsbnl0d2trIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2MTkxODMsImV4cCI6MjEwMzE5NTE4M30.gZpUaZIkWkD3zbpskWKHZqVfK-1YiuuQZQ3yVpSR6Vk';

  if (!window.supabase) {
    console.error('supabase-js não carregado. Verifique se o script do CDN está antes deste arquivo.');
    return;
  }

  window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
})();
