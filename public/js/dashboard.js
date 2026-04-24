/**
 * EntreVid ΓÇö Dashboard Page
 */
(async function initDashboard() {
  await window.initAppContext();
  if (!window.App.currentUser || (window.App.currentUser.role !== 'verified_entrepreneur' && window.App.currentUser.role !== 'admin')) {
    window.location.href = '/login';
    return;
  }
  
  window.renderNav(window.App.currentUser, 'dashboard');
  window.renderFooter();

  const loadingState = document.getElementById('loading-state');
  const emptyState = document.getElementById('empty-state');
  const videosList = document.getElementById('videos-list');
  const statTotal = document.getElementById('stat-total-videos');

  window.setSectionLoading('loading-state', 'videos-list', true);

  const payload = await window.getJson('/api/my/videos');

  window.setSectionLoading('loading-state', 'videos-list', false);

  if (payload.__httpError || !payload.ok || !payload.data) {
    window.renderStateMessage('empty-state', {
      type: 'error',
      title: 'Failed to load dashboard',
      message: 'Please refresh and try again.',
    });
    return;
  }

  const videos = payload.data.videos || [];
  statTotal.textContent = videos.length;

  if (videos.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }

  videosList.classList.remove('hidden');
  const esc = window.escapeHtml;

  videosList.innerHTML = videos.map(video => {
    const dateStr = new Date(video.createdAt).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric'
    });
    
    const dYtId = window.extractYouTubeId(video.youtubeId) || window.extractYouTubeId(video.youtubeUrl) || '';
    return `
      <div class="px-6 sm:px-8 py-6 flex flex-col sm:flex-row gap-6 hover:bg-surface-800/30 transition-colors group">
        <!-- Thumbnail -->
        <a href="/video/${esc(video.id)}" class="shrink-0 relative w-full sm:w-48 aspect-video rounded-xl overflow-hidden bg-surface-900 border border-surface-700 block">
          <img src="https://img.youtube.com/vi/${esc(dYtId)}/mqdefault.jpg" alt="Thumbnail" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
          <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-surface-950/20">
            <div class="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md text-white flex items-center justify-center pl-0.5 border border-white/20">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            </div>
          </div>
        </a>
        
        <!-- Info -->
        <div class="flex-grow flex flex-col min-w-0">
          <div class="flex items-start justify-between gap-4 mb-2">
            <a href="/video/${esc(video.id)}" class="font-display text-lg font-bold text-white hover:text-brand-400 transition-colors line-clamp-1">${esc(video.title)}</a>
            <span class="shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-800 text-brand-300 border border-surface-700">${esc(video.category)}</span>
          </div>
          
          <p class="text-sm text-gray-400 line-clamp-2 mb-4 leading-relaxed">${esc(video.description)}</p>
          
          <div class="flex flex-wrap items-center mt-auto gap-y-3 gap-x-6 text-xs text-gray-500">
            <div class="flex items-center gap-1.5"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg> ${dateStr}</div>
            <div class="flex items-center gap-1.5"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg> -- Views</div>
            <div class="flex items-center gap-1.5 ml-auto sm:ml-0"><svg class="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Published</div>
          </div>
        </div>
        
        <!-- Actions -->
        <div class="shrink-0 flex sm:flex-col items-center justify-end sm:justify-center gap-2 pt-4 sm:pt-0 border-t sm:border-t-0 sm:border-l border-surface-700 sm:pl-6">
          <a href="/video/${esc(video.id)}/edit" class="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 hover:bg-surface-700 text-white text-sm font-medium border border-surface-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            Edit
          </a>
          <button type="button"  class="delete-btn w-full sm:w-auto inline-flex justify-center items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 text-sm font-medium border border-red-500/20 transition-colors" data-id="${esc(video.id)}">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            Delete
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Delete Handlers
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const confirmed = await window.confirmAction({
        title: 'Delete this video?',
        message: 'This action cannot be undone.',
      });
      if (!confirmed) return;
      
      const prevHtml = btn.innerHTML;
      btn.innerHTML = '<div class="w-4 h-4 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin"></div>';
      btn.disabled = true;

      const vidId = btn.getAttribute('data-id');
      const { res, data } = await window.postJson(`/api/videos/${vidId}/delete`);
      
      if (res.ok && data.ok) {
        window.showFlash('success', data.message || 'Video deleted.');
        setTimeout(() => window.location.reload(), 500);
      } else {
        window.showFlash('error', data.errors ? data.errors[0] : 'Delete failed.');
        btn.innerHTML = prevHtml;
        btn.disabled = false;
      }
    });
  });
})();
