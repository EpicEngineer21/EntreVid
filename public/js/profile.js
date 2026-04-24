(async function initProfile() {
  await window.initAppContext();
  if (!window.App.currentUser) {
    window.location.href = '/login';
    return;
  }

  window.renderNav(window.App.currentUser, 'profile');
  window.renderFooter();

  const form = document.getElementById('profile-form');
  const fullNameInput = document.getElementById('fullName');
  const emailInput = document.getElementById('email');
  const roleInput = document.getElementById('role');
  const imageInput = document.getElementById('profileImageUrl');
  const preview = document.getElementById('profile-preview');
  const saveBtn = document.getElementById('save-profile-btn');

  const data = await window.getJson('/api/profile');
  if (data.__httpError || !data.ok) {
    window.showErrors('profile-errors', data.errors || ['Failed to load profile.']);
    return;
  }

  fullNameInput.value = data.data.fullName || '';
  emailInput.value = data.data.email || '';
  roleInput.value = (data.data.role || 'user').replaceAll('_', ' ');
  imageInput.value = data.data.profileImageUrl || '';
  preview.textContent = imageInput.value ? 'Profile image URL is set.' : 'No profile image URL set.';

  imageInput.addEventListener('input', () => {
    preview.textContent = imageInput.value.trim() ? 'Profile image URL is set.' : 'No profile image URL set.';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    window.showErrors('profile-errors', []);
    const originalHtml = saveBtn.innerHTML;
    window.setButtonLoading(saveBtn, true, originalHtml);

    const body = {
      fullName: fullNameInput.value.trim(),
      profileImageUrl: imageInput.value.trim(),
    };
    const { res, data: updateData } = await window.putJson('/api/profile', body);
    window.setButtonLoading(saveBtn, false, originalHtml);

    if (!res.ok || !updateData.ok) {
      window.showErrors('profile-errors', updateData.errors || ['Profile update failed.']);
      return;
    }

    window.showFlash('success', updateData.message || 'Profile updated successfully.');
    await window.initAppContext();
    window.renderNav(window.App.currentUser, 'profile');
  });
})();
