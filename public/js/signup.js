/**
 * EntreVid — Signup Page
 */
(async function initSignup() {
  await window.initAppContext();
  if (window.App.currentUser) { window.location.href = '/'; return; }
  window.renderNav(window.App.currentUser, 'signup');

  document.getElementById('google-btn')?.addEventListener('click', () => {
    window.showFlash('error', 'Google Sign-In coming soon. Please use email signup for now.');
  });

  const form = document.getElementById('signup-form');
  const submitBtn = document.getElementById('signup-btn');
  const errBox = document.getElementById('error-container');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    errBox?.classList.add('hidden');
    const orig = submitBtn.innerHTML;
    window.setButtonLoading(submitBtn, true);
    const { res, data } = await window.postJson('/api/auth/signup', {
      fullName: document.getElementById('fullName').value,
      email: document.getElementById('email').value,
      password: document.getElementById('password').value,
      confirmPassword: document.getElementById('confirmPassword').value,
    });
    if (!res.ok || !data.ok) {
      window.setButtonLoading(submitBtn, false, orig);
      if (errBox) { errBox.textContent = (data.errors || []).join(' '); errBox.classList.remove('hidden'); }
      return;
    }
    window.location.href = data.next || '/verify-email';
  });
})();
