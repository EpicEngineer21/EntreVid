/**
 * EntreVid — Submit Video Page
 */
(async function initSubmit() {
  await window.initAppContext();
  if (!window.App.currentUser) {
    window.location.href = '/login';
    return;
  }
  if (window.App.currentUser.role !== 'verified_entrepreneur' && window.App.currentUser.role !== 'admin') {
    sessionStorage.setItem('applyNotice', 'To submit a video, please apply for entrepreneur verification first.');
    window.location.href = '/apply';
    return;
  }

  window.renderNav(window.App.currentUser, 'submit');
  window.renderFooter();

  const form = document.getElementById('submit-form');
  const submitBtn = document.getElementById('submit-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    document.getElementById('error-box').classList.add('hidden');

    const originalHtml = submitBtn.innerHTML;
    window.setButtonLoading(submitBtn, true);

    const payload = {
      title: document.getElementById('title').value,
      entrepreneur: document.getElementById('entrepreneur').value,
      category: document.getElementById('category').value,
      description: document.getElementById('description').value,
      tags: document.getElementById('tags').value,
      youtubeUrl: document.getElementById('youtubeUrl').value
    };

    const { res, data } = await window.postJson('/api/videos', payload);

    if (!res.ok || !data.ok) {
      window.setButtonLoading(submitBtn, false, originalHtml);
      window.showErrors('error-box', data.errors || ['Failed to submit video.']);
      return;
    }

    if (data.message) window.showFlash('success', data.message);
    setTimeout(() => { window.location.href = data.next || '/dashboard'; }, 1000);
  });
})();
