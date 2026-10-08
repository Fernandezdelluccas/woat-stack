(function () {
  const VALID_EMAIL = 'professor@escola.com';
  const VALID_PASSWORD = '123456';

  const loginSection = document.getElementById('loginSection');
  const dashboardSection = document.getElementById('dashboardSection');
  const form = document.getElementById('professorLoginForm');
  const emailInput = document.getElementById('professorEmail');
  const passwordInput = document.getElementById('professorPassword');
  const errorText = document.getElementById('loginError');
  const logoutButton = document.getElementById('logoutProfessor');
  const cancelButton = document.getElementById('cancelProfessorLogin');
  const teacherNavigation = document.getElementById('teacherNavigation');
  const brandLink = document.querySelector('.topbar__inner .brand');

  if (!form || !loginSection || !dashboardSection) {
    return;
  }

  function setLoggedIn(value) {
    if (window.GeniosApp) {
      window.GeniosApp.setTeacherSession(value);
    } else {
      localStorage.setItem('genios-professor-auth', value ? 'true' : 'false');
    }
    loginSection.style.display = value ? 'none' : 'block';
    dashboardSection.style.display = value ? 'block' : 'none';
    if (teacherNavigation) {
      teacherNavigation.hidden = !value;
      teacherNavigation.style.display = value ? '' : 'none';
    }
    if (brandLink) brandLink.href = value ? 'materias.html' : 'index.html';
  }

  function returnToStudentLogin() {
    window.location.replace('index.html');
  }

  function isLoggedIn() {
    if (window.GeniosApp && typeof window.GeniosApp.isTeacherLoggedIn === 'function') {
      return window.GeniosApp.isTeacherLoggedIn();
    }
    return localStorage.getItem('genios-professor-auth') === 'true';
  }

  function showError() {
    errorText.style.display = 'block';
  }

  function hideError() {
    errorText.style.display = 'none';
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (email === VALID_EMAIL && password === VALID_PASSWORD) {
      setLoggedIn(true);
      hideError();
      form.reset();
      return;
    }

    showError();
  });

  logoutButton.addEventListener('click', () => {
    setLoggedIn(false);
    hideError();
    returnToStudentLogin();
  });

  cancelButton?.addEventListener('click', returnToStudentLogin);

  loginSection.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    returnToStudentLogin();
  });

  setLoggedIn(isLoggedIn());
})();
