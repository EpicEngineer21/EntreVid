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

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    errBox?.classList.add('hidden');
    const orig = submitBtn.innerHTML;
    window.setButtonLoading(submitBtn, true);
    const { res, data } = await window.postJson('/api/auth/login', {
      email: document.getElementById('email').value,
      password: document.getElementById('password').value,
    });
    if (!res.ok || !data.ok) {
      window.setButtonLoading(submitBtn, false, orig);
      if (errText) errText.textContent = (data.errors && data.errors[0]) || 'Login failed.';
      errBox?.classList.remove('hidden');
      return;
    }
    window.location.href = data.next || '/';
  });
})();
