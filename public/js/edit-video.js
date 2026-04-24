/**
 * EntreVid — Edit Video Page
 */
(async function initEdit() {
  await window.initAppContext();
  if (!window.App.currentUser || (window.App.currentUser.role !== 'verified_entrepreneur' && window.App.currentUser.role !== 'admin')) {
    window.location.href = '/login';
    return;
  }

  window.renderNav(window.App.currentUser);
  window.renderFooter();

  // Extract ID from path: /video/:id/edit
  const pathParts = window.location.pathname.split('/');
  const videoId = pathParts[pathParts.length - 2]; 

  const loadingState = document.getElementById('loading-state');
  const form = document.getElementById('edit-form');
  const errorBox = document.getElementById('error-box');

  const payload = await window.getJson(`/api/videos/${videoId}`);
  
  loadingState.classList.add('hidden');

  if (payload.__httpError || !payload.ok || !payload.data) {
    loadingState.classList.remove('hidden');
    loadingState.innerHTML = '<p class="text-red-400">Failed to load video or you do not have permission.</p>';
    setTimeout(() => { window.location.href = '/dashboard'; }, 2000);
    return;
  }

  const v = payload.data.video;
  if (v.ownerUserId !== window.App.currentUser.id && window.App.currentUser.role !== 'admin') {
    window.location.href = '/dashboard';
    return;
  }

  // Populate form
  document.getElementById('title').value = v.title || '';
  document.getElementById('entrepreneur').value = v.entrepreneur || '';
  document.getElementById('category').value = v.category || 'Other';
  document.getElementById('description').value = v.description || '';
  document.getElementById('tags').value = (v.tags || []).join(', ');
  document.getElementById('youtubeUrl').value = v.youtubeUrl || '';

  form.classList.remove('hidden');

  const saveBtn = document.getElementById('save-btn');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.classList.add('hidden');

    const originalHtml = saveBtn.innerHTML;
    window.setButtonLoading(saveBtn, true);

    const payload = {
      title: document.getElementById('title').value,
      entrepreneur: document.getElementById('entrepreneur').value,
      category: document.getElementById('category').value,
      description: document.getElementById('description').value,
      tags: document.getElementById('tags').value,
      youtubeUrl: document.getElementById('youtubeUrl').value
    };

    const { res: resultRes, data: resultData } = await window.postJson(`/api/videos/${videoId}/edit`, payload);

    if (!resultRes.ok || !resultData.ok) {
      window.setButtonLoading(saveBtn, false, originalHtml);
      window.showErrors('error-box', resultData.errors || ['Failed to update video.']);
      return;
    }

    if (resultData.message) window.showFlash('success', resultData.message);
    setTimeout(() => { window.location.href = resultData.next || '/dashboard'; }, 1000);
  });
})();
