/**
 * EntreVid — Signup Page
 */
(async function initSignup() {
  await window.initAppContext();

  if (window.App.currentUser) {
    window.location.href = '/';
    return;
  }

  window.renderNav(window.App.currentUser, 'signup');
  window.renderFooter();

  const form = document.getElementById('signup-form');
  const submitBtn = document.getElementById('submit-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    document.getElementById('error-box').classList.add('hidden');

    const originalHtml = submitBtn.innerHTML;
    window.setButtonLoading(submitBtn, true);

    const payload = {
      fullName: document.getElementById('fullName').value,
      email: document.getElementById('email').value,
      password: document.getElementById('password').value,
      confirmPassword: document.getElementById('confirmPassword').value,
    };

    const { res, data } = await window.postJson('/api/auth/signup', payload);

    if (!res.ok || !data.ok) {
      window.setButtonLoading(submitBtn, false, originalHtml);
      window.showErrors('error-box', data.errors || ['Signup failed. Please try again.']);
      return;
    }

    window.location.href = data.next || '/verify-email';
  });
})();
