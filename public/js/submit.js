/**
 * EntreVid — Submit Video Page v3
 * Handles: auth guard, live YT thumbnail preview, 3-step wizard UI
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

  // ── Step helpers ──────────────────────────────────────────────
  function showStep(name) {
    ['step-form','step-submitting','step-success'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('hidden', id !== name);
    });
    // Update step dots
    const states = { 'step-form':1, 'step-submitting':2, 'step-success':3 };
    const active = states[name] || 1;
    [1,2,3].forEach(i => {
      const dot = document.getElementById(`step${i}-dot`);
      if (!dot) return;
      dot.className = 'step-dot ' + (i < active ? 'done' : i === active ? 'active' : 'pending');
    });
    const l2 = document.getElementById('step2-label');
    const l3 = document.getElementById('step3-label');
    if (l2) l2.style.color = active >= 2 ? '#818cf8' : '#8a91a8';
    if (l3) l3.style.color = active >= 3 ? '#34d399' : '#8a91a8';
  }

  // ── Live YouTube thumbnail preview ────────────────────────────
  const urlInput    = document.getElementById('youtubeUrl');
  const previewBox  = document.getElementById('yt-preview');
  const thumbImg    = document.getElementById('yt-thumb');
  const invalidBox  = document.getElementById('yt-invalid');

  function extractYtId(url) {
    if (!url) return null;
    const patterns = [
      /(?:v=|\/embed\/|\/shorts\/|youtu\.be\/)([A-Za-z0-9_-]{11})/,
      /^([A-Za-z0-9_-]{11})$/
    ];
    for (const p of patterns) {
      const m = url.match(p);
      if (m) return m[1];
    }
    return null;
  }

  let previewDebounce;
  urlInput?.addEventListener('input', () => {
    clearTimeout(previewDebounce);
    previewDebounce = setTimeout(() => {
      const id = extractYtId(urlInput.value.trim());
      if (id) {
        thumbImg.src = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
        previewBox?.classList.remove('hidden');
        invalidBox?.classList.add('hidden');
      } else if (urlInput.value.trim().length > 10) {
        previewBox?.classList.add('hidden');
        invalidBox?.classList.remove('hidden');
      } else {
        previewBox?.classList.add('hidden');
        invalidBox?.classList.add('hidden');
      }
    }, 400);
  });

  // ── Form submit ───────────────────────────────────────────────
  const form = document.getElementById('submit-form');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errBox = document.getElementById('error-box');
    if (errBox) errBox.classList.add('hidden');

    showStep('step-submitting');

    const payload = {
      title:       document.getElementById('title')?.value.trim(),
      entrepreneur:document.getElementById('entrepreneur')?.value.trim(),
      category:    document.getElementById('category')?.value,
      description: document.getElementById('description')?.value.trim(),
      tags:        document.getElementById('tags')?.value.trim(),
      youtubeUrl:  urlInput?.value.trim(),
    };

    const { res, data } = await window.postJson('/api/videos', payload);

    if (!res.ok || !data.ok) {
      showStep('step-form');
      if (errBox) {
        errBox.textContent = (data.errors || ['Failed to submit video.'])[0];
        errBox.classList.remove('hidden');
      }
      return;
    }

    showStep('step-success');
  });

  // ── Submit another ────────────────────────────────────────────
  document.getElementById('submit-another-btn')?.addEventListener('click', () => {
    form?.reset();
    previewBox?.classList.add('hidden');
    invalidBox?.classList.add('hidden');
    showStep('step-form');
  });
})();
