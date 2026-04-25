(async function initProfile() {
  await window.initAppContext();
  if (!window.App.currentUser) { window.location.href = '/login'; return; }

  window.renderNav(window.App.currentUser, 'profile');
  window.renderFooter();

  const fullNameInput = document.getElementById('fullName');
  const emailInput    = document.getElementById('email');
  const roleInput     = document.getElementById('role');
  const imageInput    = document.getElementById('profileImageUrl');
  const saveBtn       = document.getElementById('save-profile-btn');
  const errEl         = document.getElementById('profile-errors');
  const sucEl         = document.getElementById('profile-success');
  const avatarCircle  = document.getElementById('avatar-circle');
  const avatarName    = document.getElementById('avatar-name');
  const avatarRole    = document.getElementById('avatar-role');

  const ROLE_LABELS = { admin: '🛡️ Admin', verified_entrepreneur: '✅ Verified Entrepreneur', user: '👤 User' };

  function updateAvatarPreview(name, imgUrl, role) {
    if (avatarName) avatarName.textContent = name || '';
    if (avatarRole) avatarRole.textContent = ROLE_LABELS[role] || role || '';
    if (avatarCircle) {
      if (imgUrl) {
        avatarCircle.innerHTML = `<img src="${window.escapeHtml(imgUrl)}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none';this.parentElement.textContent='${(name||'?')[0].toUpperCase()}'"/>`;
      } else {
        avatarCircle.textContent = (name||'?').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
      }
    }
  }

  const data = await window.getJson('/api/profile');
  if (data.__httpError || !data.ok) {
    if (errEl) { errEl.textContent = (data.errors||['Failed to load profile.'])[0]; errEl.classList.remove('hidden'); }
    return;
  }

  const p = data.data;
  if (fullNameInput) fullNameInput.value = p.fullName || '';
  if (emailInput)    emailInput.value    = p.email    || '';
  if (roleInput)     roleInput.value     = ROLE_LABELS[p.role] || (p.role||'user');
  if (imageInput)    imageInput.value    = p.profileImageUrl || '';
  updateAvatarPreview(p.fullName, p.profileImageUrl, p.role);

  // Live avatar preview on URL change
  imageInput?.addEventListener('input', () => {
    updateAvatarPreview(fullNameInput?.value.trim(), imageInput.value.trim(), p.role);
  });
  fullNameInput?.addEventListener('input', () => {
    updateAvatarPreview(fullNameInput.value.trim(), imageInput?.value.trim(), p.role);
  });

  document.getElementById('profile-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    errEl?.classList.add('hidden'); sucEl?.classList.add('hidden');
    const orig = saveBtn.innerHTML;
    window.setButtonLoading(saveBtn, true);
    const { res, data: upd } = await window.putJson('/api/profile', {
      fullName: fullNameInput?.value.trim(),
      profileImageUrl: imageInput?.value.trim(),
    });
    window.setButtonLoading(saveBtn, false, orig);
    if (!res.ok || !upd.ok) {
      if (errEl) { errEl.textContent = (upd.errors||['Update failed.'])[0]; errEl.classList.remove('hidden'); }
    } else {
      if (sucEl) { sucEl.textContent = upd.message || 'Profile updated!'; sucEl.classList.remove('hidden'); }
      await window.initAppContext();
      window.renderNav(window.App.currentUser, 'profile');
    }
  });

  document.getElementById('logout-all-btn')?.addEventListener('click', async () => {
    if (!confirm('Log out of all sessions?')) return;
    await window.postJson('/api/auth/logout', {});
    window.location.href = '/login';
  });
})();
