(() => {
  const GAME_LABELS = {
    adicao: 'Adição',
    subtracao: 'Subtração',
    multiplicacao: 'Multiplicação',
    divisao: 'Divisão',
    formas: 'Formas geométricas',
    fracoes: 'Frações',
  };
  const reportClassFilter = document.getElementById('reportClassFilter');
  const reportGameFilter = document.getElementById('reportGameFilter');
  const refreshReportButton = document.getElementById('refreshTeacherReport');
  const exportReportButton = document.getElementById('exportTeacherReport');
  let reportSnapshot = null;

  function getFilteredReport() {
    if (!reportSnapshot) return { students: [], sessions: [], rows: [], reports: [] };
    const selectedClass = reportClassFilter?.value || '';
    const selectedGame = reportGameFilter?.value || '';
    const students = reportSnapshot.students.filter((student) => !selectedClass || student.turma === selectedClass);
    const studentsById = new Map(students.map((student) => [student.id, student]));
    const sessions = reportSnapshot.sessions.filter((session) => (
      studentsById.has(session.profile_id) && (!selectedGame || session.game_key === selectedGame)
    ));
    const aggregates = new Map(students.map((student) => [student.id, {
      ...student, games: new Set(), points: 0, correct: 0, wrong: 0, seconds: 0,
    }]));
    sessions.forEach((session) => {
      const student = aggregates.get(session.profile_id);
      student.games.add(session.game_key);
      student.points = Math.max(student.points, Number(session.score) || 0);
      student.correct += Number(session.correct_answers) || 0;
      student.wrong += Number(session.wrong_answers) || 0;
      student.seconds += Number(session.elapsed_seconds) || 0;
    });
    const rows = [...aggregates.values()].sort((left, right) => right.points - left.points || left.nome.localeCompare(right.nome, 'pt-BR'));
    const reports = reportSnapshot.profileStates.flatMap((profileState) => {
      const student = studentsById.get(profileState.profile_id);
      if (!student) return [];
      return (profileState.payload?.state?.['genios-question-reports'] || [])
        .filter((report) => !selectedGame || report.gameKey === selectedGame)
        .map((report) => ({ studentName: student.nome, report }));
    }).slice(0, 100);
    return { students, sessions, rows, reports };
  }

  function renderTeacherReport() {
    const rowsElement = document.getElementById('teacherReportRows');
    const reportsList = document.getElementById('teacherQuestionReports');
    const feedback = document.getElementById('teacherReportFeedback');
    if (!rowsElement || !reportsList || !reportSnapshot) return;
    const report = getFilteredReport();
    const totals = report.sessions.reduce((sum, session) => ({
      correct: sum.correct + (Number(session.correct_answers) || 0),
      wrong: sum.wrong + (Number(session.wrong_answers) || 0),
    }), { correct: 0, wrong: 0 });
    const answerCount = totals.correct + totals.wrong;
    document.getElementById('reportStudentCount').textContent = String(report.students.length);
    document.getElementById('reportSessionCount').textContent = String(report.sessions.length);
    document.getElementById('reportAccuracy').textContent = `${answerCount ? Math.round((totals.correct / answerCount) * 100) : 0}%`;
    rowsElement.replaceChildren();
    if (!report.rows.length) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 7;
      cell.className = 'hint';
      cell.textContent = report.students.length ? 'Nenhuma partida encontrada para esses filtros.' : 'Nenhum aluno cadastrado nas turmas autorizadas.';
      row.appendChild(cell);
      rowsElement.appendChild(row);
    } else {
      report.rows.forEach((student) => {
        const row = document.createElement('tr');
        const values = [
          student.nome,
          student.turma,
          [...student.games].map((game) => GAME_LABELS[game] || game).join(', ') || 'Sem partidas',
          String(student.points),
          String(student.correct),
          String(student.wrong),
          `${Math.round(student.seconds / 60)} min`,
        ];
        values.forEach((value) => {
          const cell = document.createElement('td');
          cell.textContent = value;
          row.appendChild(cell);
        });
        rowsElement.appendChild(row);
      });
    }

    reportsList.replaceChildren();
    if (!report.reports.length) {
      const emptyReport = document.createElement('li');
      emptyReport.className = 'hint';
      emptyReport.textContent = 'Nenhum relato para esses filtros.';
      reportsList.appendChild(emptyReport);
    } else {
      report.reports.forEach(({ studentName, report: item }) => {
        const entry = document.createElement('li');
        const title = document.createElement('strong');
        title.textContent = `${studentName} · ${GAME_LABELS[item.gameKey] || 'Minijogo'}`;
        const question = document.createElement('span');
        question.textContent = item.prompt;
        const reason = document.createElement('span');
        reason.textContent = item.reason;
        entry.append(title, question, reason);
        reportsList.appendChild(entry);
      });
    }
    if (feedback) feedback.textContent = `${report.students.length} aluno(s) · ${report.sessions.length} partida(s) nos filtros selecionados.`;
    if (exportReportButton) exportReportButton.disabled = report.rows.length === 0;
  }

  function exportTeacherReport() {
    const report = getFilteredReport();
    if (!report.rows.length) return;
    const escapeCsv = (value) => {
      const text = String(value);
      const safeText = /^[\t\r ]*[=+\-@]/.test(text) ? `'${text}` : text;
      return `"${safeText.replaceAll('"', '""')}"`;
    };
    const lines = [
      ['Aluno', 'Turma', 'Minijogos', 'Maior pontuação', 'Acertos', 'Erros', 'Tempo (min)'],
      ...report.rows.map((student) => [
        student.nome,
        student.turma,
        [...student.games].map((game) => GAME_LABELS[game] || game).join(', ') || 'Sem partidas',
        student.points,
        student.correct,
        student.wrong,
        Math.round(student.seconds / 60),
      ]),
    ];
    const csv = `\uFEFF${lines.map((line) => line.map(escapeCsv).join(';')).join('\r\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-turma-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function loadTeacherReports(event) {
    const panel = document.getElementById('teacherReportPanel');
    const feedback = document.getElementById('teacherReportFeedback');
    const rows = document.getElementById('teacherReportRows');
    const reportsList = document.getElementById('teacherQuestionReports');
    if (!panel || !window.supabaseClient) return;
    panel.hidden = false;
    if (refreshReportButton) refreshReportButton.disabled = true;
    feedback.textContent = 'Carregando dados autorizados...';

    try {
      let teacherId = event?.detail?.userId;
      if (!teacherId) {
        const { data } = await window.supabaseClient.auth.getUser();
        teacherId = data?.user?.id;
      }
      if (!teacherId) {
        feedback.textContent = 'Entre com a conta docente para carregar os relatórios.';
        return;
      }

      const { data: classes, error: classError } = await window.supabaseClient
        .from('teacher_classes')
        .select('turma')
        .eq('teacher_id', teacherId);
      if (classError || !classes?.length) {
        reportSnapshot = { students: [], sessions: [], profileStates: [] };
        renderTeacherReport();
        feedback.textContent = classError
          ? 'Não foi possível carregar suas turmas. Confira a conexão e o schema do Supabase.'
          : 'Nenhuma turma está vinculada a esta conta docente. Peça à direção para configurar seu acesso.';
        return;
      }

      const classNames = [...new Set(classes.map((item) => item.turma))];
      if (reportClassFilter) {
        const selectedClass = reportClassFilter.value;
        reportClassFilter.replaceChildren(new Option('Todas as turmas autorizadas', ''));
        classNames.forEach((className) => reportClassFilter.add(new Option(className, className)));
        if (classNames.includes(selectedClass)) reportClassFilter.value = selectedClass;
      }
      const { data: students, error: studentsError } = await window.supabaseClient
        .from('profiles')
        .select('id, nome, turma')
        .in('turma', classNames)
        .eq('account_type', 'school');
      if (studentsError || !students) throw new Error('Não foi possível carregar os alunos das turmas.');

      const studentIds = students.map((student) => student.id);
      let sessions = [];
      let profileStates = [];
      if (studentIds.length > 0) {
        const pageSize = 1000;
        for (let offset = 0; ; offset += pageSize) {
          const { data, error } = await window.supabaseClient
            .from('game_sessions')
            .select('profile_id, game_key, score, correct_answers, wrong_answers, elapsed_seconds, created_at')
            .in('profile_id', studentIds)
            .order('created_at', { ascending: false })
            .range(offset, offset + pageSize - 1);
          if (error) throw new Error('Não foi possível carregar as partidas das turmas.');
          sessions.push(...(data || []));
          if (!data || data.length < pageSize) break;
        }

        const { data: stateData, error: stateError } = await window.supabaseClient
          .from('profile_state')
          .select('profile_id, payload')
          .in('profile_id', studentIds);
        if (stateError) throw new Error('Não foi possível carregar os relatos de questões.');
        profileStates = stateData || [];
      }

      reportSnapshot = { students: students || [], sessions, profileStates };
      renderTeacherReport();
    } catch (error) {
      reportSnapshot = null;
      rows.replaceChildren();
      reportsList.replaceChildren();
      document.getElementById('reportStudentCount').textContent = '0';
      document.getElementById('reportSessionCount').textContent = '0';
      document.getElementById('reportAccuracy').textContent = '0%';
      if (exportReportButton) exportReportButton.disabled = true;
      feedback.textContent = error.message || 'Não foi possível carregar os relatórios.';
    } finally {
      if (refreshReportButton) refreshReportButton.disabled = false;
    }
  }

  async function loadChallengeClasses(event) {
    const select = document.getElementById('challengeClass');
    const submitButton = document.getElementById('challengeSubmit');
    const feedback = document.getElementById('challengeFeedback');
    if (!select) return;
    if (window.location.search === '?modo=local') {
      const classes = ['1º ano', '2º ano', '3º ano', '4º ano', '5º ano'];
      select.replaceChildren(new Option('Selecione uma turma', ''));
      classes.forEach((className) => select.add(new Option(className, className)));
      select.disabled = false;
      if (submitButton) submitButton.disabled = false;
      return;
    }
    const teacherId = event?.detail?.userId;
    if (!teacherId || !window.supabaseClient) return;

    const { data, error } = await window.supabaseClient
      .from('teacher_classes')
      .select('turma')
      .eq('teacher_id', teacherId)
      .order('turma');
    select.replaceChildren(new Option('Selecione uma turma autorizada', ''));
    select.disabled = Boolean(error) || !data?.length;
    (data || []).forEach(({ turma }) => select.add(new Option(turma, turma)));
    if (submitButton) submitButton.disabled = select.disabled;
    if (error && feedback) feedback.textContent = 'Não foi possível carregar suas turmas. Atualize a página ou confira a autorização no Supabase.';
    else if (!data?.length && feedback) feedback.textContent = 'Nenhuma turma autorizada está vinculada a esta conta.';
  }

  document.addEventListener('professor:login', loadTeacherReports);
  document.addEventListener('professor:login', loadChallengeClasses);
  reportClassFilter?.addEventListener('change', renderTeacherReport);
  reportGameFilter?.addEventListener('change', renderTeacherReport);
  refreshReportButton?.addEventListener('click', () => loadTeacherReports());
  exportReportButton?.addEventListener('click', exportTeacherReport);
  document.addEventListener('DOMContentLoaded', () => {
    if (window.location.search === '?modo=local') loadChallengeClasses();
    if (localStorage.getItem('genios-professor-auth') === 'true') loadTeacherReports();
  });
})();
