(() => {
  const GAME_LABELS = {
    adicao: 'Adição',
    subtracao: 'Subtração',
    multiplicacao: 'Multiplicação',
    divisao: 'Divisão',
    formas: 'Formas geométricas',
  };

  async function loadTeacherReports(event) {
    const panel = document.getElementById('teacherReportPanel');
    const feedback = document.getElementById('teacherReportFeedback');
    const rows = document.getElementById('teacherReportRows');
    const reportsList = document.getElementById('teacherQuestionReports');
    if (!panel || !window.supabaseClient) return;
    panel.hidden = false;

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
        feedback.textContent = 'Nenhuma turma está vinculada a esta conta docente.';
        return;
      }

      const classNames = [...new Set(classes.map((item) => item.turma))];
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
        const { data, error } = await window.supabaseClient
          .from('game_sessions')
          .select('profile_id, game_key, score, correct_answers, wrong_answers, elapsed_seconds, created_at')
          .in('profile_id', studentIds)
          .order('created_at', { ascending: false })
          .limit(1000);
        if (error) throw new Error('Não foi possível carregar as partidas das turmas.');
        sessions = data || [];

        const { data: stateData, error: stateError } = await window.supabaseClient
          .from('profile_state')
          .select('profile_id, payload')
          .in('profile_id', studentIds);
        if (stateError) throw new Error('Não foi possível carregar os relatos de questões.');
        profileStates = stateData || [];
      }

      const aggregates = new Map(students.map((student) => [student.id, {
        ...student, games: new Set(), points: 0, correct: 0, wrong: 0, seconds: 0, sessions: 0,
      }]));
      sessions.forEach((session) => {
        const student = aggregates.get(session.profile_id);
        if (!student) return;
        student.games.add(session.game_key);
        student.points = Math.max(student.points, Number(session.score) || 0);
        student.correct += Number(session.correct_answers) || 0;
        student.wrong += Number(session.wrong_answers) || 0;
        student.seconds += Number(session.elapsed_seconds) || 0;
        student.sessions += 1;
      });

      const dataRows = [...aggregates.values()].sort((left, right) => right.points - left.points || left.nome.localeCompare(right.nome, 'pt-BR'));
      const totals = sessions.reduce((sum, session) => ({
        correct: sum.correct + (Number(session.correct_answers) || 0),
        wrong: sum.wrong + (Number(session.wrong_answers) || 0),
      }), { correct: 0, wrong: 0 });
      const answers = totals.correct + totals.wrong;
      document.getElementById('reportStudentCount').textContent = String(students.length);
      document.getElementById('reportSessionCount').textContent = String(sessions.length);
      document.getElementById('reportAccuracy').textContent = `${answers ? Math.round((totals.correct / answers) * 100) : 0}%`;
      rows.replaceChildren();

      if (dataRows.length === 0) {
        feedback.textContent = 'Nenhum aluno está cadastrado nas turmas vinculadas.';
        return;
      }

      dataRows.forEach((student) => {
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
        rows.appendChild(row);
      });

      reportsList.replaceChildren();
      const reports = profileStates.flatMap((profileState) => {
        const student = students.find((item) => item.id === profileState.profile_id);
        return (profileState.payload?.state?.['genios-question-reports'] || []).map((report) => ({
          studentName: student?.nome || 'Aluno',
          report,
        }));
      }).slice(0, 100);
      if (reports.length === 0) {
        const emptyReport = document.createElement('li');
        emptyReport.className = 'hint';
        emptyReport.textContent = 'Nenhum relato recebido das turmas.';
        reportsList.appendChild(emptyReport);
      } else {
        reports.forEach(({ studentName, report }) => {
          const item = document.createElement('li');
          const title = document.createElement('strong');
          title.textContent = `${studentName} · ${GAME_LABELS[report.gameKey] || 'Minijogo'}`;
          const question = document.createElement('span');
          question.textContent = report.prompt;
          const reason = document.createElement('span');
          reason.textContent = report.reason;
          item.append(title, question, reason);
          reportsList.appendChild(item);
        });
      }
      feedback.textContent = 'Dados atualizados a partir das partidas concluídas.';
    } catch (error) {
      feedback.textContent = error.message || 'Não foi possível carregar os relatórios.';
    }
  }

  document.addEventListener('professor:login', loadTeacherReports);
  document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('genios-professor-auth') === 'true') loadTeacherReports();
  });
})();
