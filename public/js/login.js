/**
 * EntreVid — Login Page
 */
(async function initLogin() {
  await window.initAppContext();
  if (window.App.currentUser) { window.location.href = '/'; return; }
  window.renderNav(window.App.currentUser, 'login');

  document.getElementById('google-btn')?.addEventListener('click', () => {
    window.showFlash('error', 'Google Sign-In coming soon. Please use email login for now.');
  });

  const form = document.getElementById('login-form');
  const submitBtn = document.getElementById('login-btn');
  const errText = document.getElementById('error-text');
  const errBox = document.getElementById('error-container');

  const togglePasswordBtn = document.getElementById('toggle-password');
  const passwordInput = document.getElementById('password');
  const eyeIconShow = document.getElementById('eye-icon-show');
  const eyeIconHide = document.getElementById('eye-icon-hide');

  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener('click', () => {
      const isPassword = passwordInput.getAttribute('type') === 'password';
      passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
      if (eyeIconShow && eyeIconHide) {
        eyeIconShow.style.display = isPassword ? 'none' : 'block';
        eyeIconHide.style.display = isPassword ? 'block' : 'none';
      }
    });
  }

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (errBox) errBox.style.display = 'none';
    const orig = submitBtn.innerHTML;
    window.setButtonLoading(submitBtn, true);
    const { res, data } = await window.postJson('/api/auth/login', {
      email: document.getElementById('email').value,
      password: passwordInput.value,
    });
    if (!res.ok || !data.ok) {
      window.setButtonLoading(submitBtn, false, orig);
      if (errText) errText.textContent = (data.errors && data.errors[0]) || 'Login failed.';
      if (errBox) errBox.style.display = 'flex';
      return;
    }
    window.location.href = data.next || '/';
  });
})();
