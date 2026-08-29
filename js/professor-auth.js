(function () {
  const STORAGE_KEY = 'genios-professor-auth';
  const VALID_EMAIL = 'professor@escola.com';
  const VALID_PASSWORD = '123456';

  const loginSection = document.getElementById('loginSection');
  const dashboardSection = document.getElementById('dashboardSection');
  const form = document.getElementById('professorLoginForm');
  const emailInput = document.getElementById('professorEmail');
  const passwordInput = document.getElementById('professorPassword');
  const errorText = document.getElementById('loginError');
  const logoutButton = document.getElementById('logoutProfessor');

  if (!form || !loginSection || !dashboardSection) {
    return;
  }

  function setLoggedIn(value) {
    localStorage.setItem(STORAGE_KEY, value ? 'true' : 'false');
    loginSection.style.display = value ? 'none' : 'block';
    dashboardSection.style.display = value ? 'block' : 'none';
  }

  function isLoggedIn() {
    return localStorage.getItem(STORAGE_KEY) === 'true';
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
  });

  setLoggedIn(isLoggedIn());
})();
