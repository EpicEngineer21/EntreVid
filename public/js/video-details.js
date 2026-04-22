/**
 * EntreVid — Video Details Page
 */
(async function initVideoDetails() {
  await window.initAppContext();
  window.renderNav(window.App.currentUser);
  window.renderFooter();

  const pathParts = window.location.pathname.split('/');
  const videoId = pathParts[pathParts.length - 1];

  const loadingState = document.getElementById('loading-state');
  const content = document.getElementById('video-content');

  const payload = await window.getJson(`/api/videos/${videoId}`);
  
  loadingState.classList.add('hidden');

  if (payload.__httpError || !payload.ok || !payload.data) {
    content.classList.remove('hidden');
    content.innerHTML = `
      <div class="text-center py-20">
        <h1 class="text-3xl font-display font-bold text-white mb-4">Video Not Found</h1>
        <p class="text-gray-400 mb-8">The video you're looking for doesn't exist or has been removed.</p>
        <a href="/" class="px-6 py-3 rounded-xl bg-surface-800 hover:bg-surface-700 text-white font-medium border border-surface-700 transition-colors">Return Home</a>
      </div>
    `;
    return;
  }

  const v = payload.data.video;
  const owner = payload.data.owner;
  const currUser = window.App.currentUser || {};
  const isOwner = v.ownerUserId === currUser.id;
  const isAdmin = currUser.role === 'admin';

  document.title = `${v.title} | EntreVid`;

  const cleanId = window.extractYouTubeId(v.youtubeId) || window.extractYouTubeId(v.youtubeUrl);
  const playerIframe = document.getElementById('video-player');
  const playerContainer = playerIframe.parentElement;
  
  if (cleanId) {
    // Use nocookie domain and origin param to avoid Error 153 on restricted videos
    playerIframe.src = `https://www.youtube-nocookie.com/embed/${window.escapeHtml(cleanId)}?rel=0&modestbranding=1&origin=${window.location.origin}`;
    
    // Detect if iframe fails to load (Error 153 = embedding blocked)
    playerIframe.addEventListener('error', function() {
      showVideoFallback();
    });
    
    // Also detect via message event (YouTube sends postMessage on errors)
    window.addEventListener('message', function onYtMsg(e) {
      if (e.origin.includes('youtube') && typeof e.data === 'string') {
        try {
          const msg = JSON.parse(e.data);
          if (msg.event === 'onError' || (msg.info && msg.info.errorCode)) {
            showVideoFallback();
            window.removeEventListener('message', onYtMsg);
          }
        } catch(_) {}
      }
    });
    
    function showVideoFallback() {
      playerIframe.classList.add('hidden');
      const fallback = document.createElement('a');
      fallback.href = v.youtubeUrl || `https://www.youtube.com/watch?v=${cleanId}`;
      fallback.target = '_blank';
      fallback.rel = 'noopener noreferrer';
      fallback.className = 'absolute inset-0 flex flex-col items-center justify-center bg-surface-900 text-white z-10 cursor-pointer group';
      fallback.innerHTML = `
        <img src="https://img.youtube.com/vi/${window.escapeHtml(cleanId)}/hqdefault.jpg" class="absolute inset-0 w-full h-full object-cover opacity-40" alt="Thumbnail" />
        <div class="relative z-10 flex flex-col items-center gap-3">
          <div class="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center pl-1 shadow-lg group-hover:scale-110 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </div>
          <span class="text-sm font-medium text-gray-300">Watch on YouTube</span>
        </div>
      `;
      playerContainer.appendChild(fallback);
    }
  } else {
    playerIframe.classList.add('hidden');
    const errDiv = document.createElement('div');
    errDiv.className = 'absolute inset-0 flex items-center justify-center bg-surface-900 border border-red-500/30 text-red-400 font-medium z-10';
    errDiv.textContent = 'Invalid video URL';
    playerContainer.appendChild(errDiv);
  }
  document.getElementById('v-category').textContent = v.category;
  document.getElementById('v-date').textContent = new Date(v.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
  if (v.featured) document.getElementById('v-featured').classList.remove('hidden');
  
  document.getElementById('v-title').textContent = v.title;
  const entrepreneurName = v.entrepreneur || (owner && owner.fullName) || v.submittedBy || 'Anonymous';
  document.getElementById('v-entrepreneur').textContent = entrepreneurName;
  document.getElementById('v-avatar').textContent = entrepreneurName.charAt(0).toUpperCase();
  if (owner && owner.role === 'verified_entrepreneur') document.getElementById('v-verified').classList.remove('hidden');

  document.getElementById('v-youtube-btn').href = v.youtubeUrl;
  document.getElementById('v-desc').textContent = v.description;

  const tagsContainer = document.getElementById('v-tags');
  if (v.tags && v.tags.length > 0) {
    tagsContainer.innerHTML = v.tags.map(t => `<span class="px-2.5 py-1 rounded bg-surface-800 text-gray-300 border border-surface-700">${window.escapeHtml(t)}</span>`).join('');
  } else {
    tagsContainer.innerHTML = `<span class="text-gray-500 italic">None</span>`;
  }

  document.getElementById('v-submitter').innerHTML = owner && owner.role === 'verified_entrepreneur'
    ? `${window.escapeHtml(v.submittedBy)} <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-emerald-400 inline" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>`
    : window.escapeHtml(v.submittedBy);

  // Options Menu if owner/admin
  if (isOwner || isAdmin) {
    const optsBox = document.getElementById('video-options');
    const optsBtn = document.getElementById('options-btn');
    const dropdown = document.getElementById('options-dropdown');
    
    optsBox.classList.remove('hidden');
    document.getElementById('edit-link').href = `/video/${v.id}/edit`;

    optsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!optsBox.contains(e.target)) dropdown.classList.add('hidden');
    });

    document.getElementById('delete-btn').addEventListener('click', async () => {
      if (!confirm('Are you sure you want to delete this video?')) return;
      const { res, data } = await window.postJson(`/api/videos/${v.id}/delete`);
      if (res.ok && data.ok) {
        window.showFlash('success', 'Video deleted.');
        setTimeout(() => { window.location.href = '/dashboard'; }, 1000);
      } else {
        window.showFlash('error', data.errors ? data.errors[0] : 'Delete failed.');
      }
    });
  }

  content.classList.remove('hidden');
})();
