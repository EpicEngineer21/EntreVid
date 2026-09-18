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
      if (errBox) {
        if (data.unverified) {
          errBox.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="flex-shrink:0; margin-top:2px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <div style="display:flex; flex-direction:column; gap:6px;">
              <span id="error-text">Please verify your email before logging in.</span>
              <a href="/verify-email" style="font-size:13px; color:#818cf8; text-decoration:underline; font-weight:500;">Verify Email</a>
            </div>
          `;
          errBox.style.alignItems = 'flex-start';
        } else {
          errBox.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span id="error-text">${(data.errors && data.errors[0]) || 'Login failed.'}</span>
          `;
          errBox.style.alignItems = 'center';
        }
        errBox.style.display = 'flex';
      }
      return;
    }
    window.location.href = data.next || '/';
  });
})();
