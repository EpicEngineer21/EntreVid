/**
 * EntreVid — Login Page
 */
(async function initLogin() {
  await window.initAppContext();

  // If already logged in, redirect home
  if (window.App.currentUser) {
    window.location.href = '/';
    return;
  }

  window.renderNav(window.App.currentUser, 'login');
  window.renderFooter();

  const form = document.getElementById('login-form');
  const submitBtn = document.getElementById('submit-btn');
  const errorBox = document.getElementById('error-box');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.classList.add('hidden');

    const originalHtml = submitBtn.innerHTML;
    window.setButtonLoading(submitBtn, true);

    const payload = {
      email: document.getElementById('email').value,
      password: document.getElementById('password').value,
    };

    const { res, data } = await window.postJson('/api/auth/login', payload);

    if (!res.ok || !data.ok) {
      window.setButtonLoading(submitBtn, false, originalHtml);
      window.showErrors('error-box', data.errors || ['Login failed. Please try again.']);
      return;
    }

    window.location.href = data.next || '/';
  });
})();
