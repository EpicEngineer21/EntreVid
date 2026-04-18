/**
 * EntreVid — Forgot Password Page
 */
(async function initForgot() {
  await window.initAppContext();
  if (window.App.currentUser) {
    window.location.href = '/';
    return;
  }

  window.renderNav(window.App.currentUser, 'forgot');
  window.renderFooter();

  const form = document.getElementById('forgot-form');
  const submitBtn = document.getElementById('submit-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    document.getElementById('error-box').classList.add('hidden');

    const originalHtml = submitBtn.innerHTML;
    window.setButtonLoading(submitBtn, true);

    const email = document.getElementById('email').value;
    const { res, data } = await window.postJson('/api/auth/forgot-password', { email });

    if (!res.ok || !data.ok) {
      window.setButtonLoading(submitBtn, false, originalHtml);
      window.showErrors('error-box', data.errors || ['Failed to initiate reset.']);
      return;
    }

    if (data.message) window.showFlash('success', data.message);
    setTimeout(() => { window.location.href = data.next || '/reset-password'; }, 1000);
  });
})();
