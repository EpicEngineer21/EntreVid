/**
 * EntreVid — Dashboard Page
 */
(async function initDashboard() {
  await window.initAppContext();
  if (!window.App.currentUser || (window.App.currentUser.role !== 'verified_entrepreneur' && window.App.currentUser.role !== 'admin')) {
    window.location.href = '/login';
    return;
  }
  
  window.renderNav(window.App.currentUser, 'dashboard');
  window.renderFooter();

// ============================================================
  // Dashboard Tabs Logic
  // ============================================================
  const tabMyVideos = document.getElementById('tab-my-videos');
  const tabAdminPanel = document.getElementById('tab-admin-panel');
  const sectionMyVideos = document.getElementById('section-my-videos');
  const sectionAdminPanel = document.getElementById('section-admin-panel');

  if (window.App.currentUser.role === 'admin') {
    tabAdminPanel.classList.remove('hidden');
  }

  function activateTab(tab) {
    if (tab === 'videos') {
      tabMyVideos.className = 'px-6 py-4 text-sm font-medium border-b-2 border-brand-500 text-white whitespace-nowrap transition-colors flex items-center gap-2';
      tabAdminPanel.className = tabAdminPanel.className.replace('border-brand-500 text-white', 'border-transparent text-gray-400 hover:text-gray-200');
      sectionMyVideos.classList.remove('hidden');
      sectionAdminPanel.classList.add('hidden');
    } else {
      tabAdminPanel.className = 'px-6 py-4 text-sm font-medium border-b-2 border-brand-500 text-white whitespace-nowrap transition-colors flex items-center gap-2';
      tabMyVideos.className = tabMyVideos.className.replace('border-brand-500 text-white', 'border-transparent text-gray-400 hover:text-gray-200');
      sectionAdminPanel.classList.remove('hidden');
      sectionMyVideos.classList.add('hidden');
    }
  }

  tabMyVideos.addEventListener('click', () => activateTab('videos'));
  tabAdminPanel.addEventListener('click', () => {
    activateTab('admin');
    if (!adminLoaded) loadAdminData();
  });

  // ============================================================
  // My Videos Logic
  // ============================================================
  const loadingState = document.getElementById('loading-state');
  const emptyState = document.getElementById('empty-state');
  const videosList = document.getElementById('videos-list');
  const statTotal = document.getElementById('stat-total-videos');

  loadingState.classList.remove('hidden');
  const { res, data } = await window.getJson('/api/my/videos');
  loadingState.classList.add('hidden');

  if (!res.ok || !data.data) {
    emptyState.classList.remove('hidden');
    emptyState.innerHTML = '<p class="text-red-400">Failed to load dashboard data. Please refresh.</p>';
  } else {
    const videos = data.data.videos || [];
    statTotal.textContent = videos.length;

    if (videos.length === 0) {
      emptyState.classList.remove('hidden');
    } else {
      videosList.classList.remove('hidden');
      const esc = window.escapeHtml;

      videosList.innerHTML = videos.map(video => {
        const dateStr = new Date(video.createdAt).toLocaleDateString(undefined, {
          month: 'short', day: 'numeric', year: 'numeric'
        });
        
        return `
          <div class="px-6 sm:px-8 py-6 flex flex-col sm:flex-row gap-6 hover:bg-surface-800/30 transition-colors group">
            <a href="/video/${esc(video.id)}" class="shrink-0 relative w-full sm:w-48 aspect-video rounded-xl overflow-hidden bg-surface-900 border border-surface-700 block">
              <img src="https://img.youtube.com/vi/${esc(video.youtubeId)}/mqdefault.jpg" alt="Thumbnail" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
              <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-surface-950/20">
                <div class="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md text-white flex items-center justify-center pl-0.5 border border-white/20">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                </div>
              </div>
            </a>
            
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
            
            <div class="shrink-0 flex sm:flex-col items-center justify-end sm:justify-center gap-2 pt-4 sm:pt-0 border-t sm:border-t-0 sm:border-l border-surface-700 sm:pl-6">
              <a href="/video/${esc(video.id)}/edit" class="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 hover:bg-surface-700 text-white text-sm font-medium border border-surface-600 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                Edit
              </a>
              <button type="button" class="delete-btn w-full sm:w-auto inline-flex justify-center items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 text-sm font-medium border border-red-500/20 transition-colors" data-id="${esc(video.id)}">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                Delete
              </button>
            </div>
          </div>
        `;
      }).join('');

      document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('Are you sure you want to delete this video? This cannot be undone.')) return;
          const prevHtml = btn.innerHTML;
          btn.innerHTML = '<div class="w-4 h-4 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin"></div>';
          btn.disabled = true;

          const vidId = btn.getAttribute('data-id');
          const delRes = await window.postJson(`/api/videos/${vidId}/delete`);
          
          if (delRes.res.ok && delRes.data.ok) {
            window.showFlash('success', delRes.data.message || 'Video deleted.');
            setTimeout(() => window.location.reload(), 500);
          } else {
            window.showFlash('error', delRes.data.errors ? delRes.data.errors[0] : 'Delete failed.');
            btn.innerHTML = prevHtml;
            btn.disabled = false;
          }
        });
      });
    }
  }

  // ============================================================
  // Admin logic
  // ============================================================
  let adminLoaded = false;
  let adminCurrentTab = 'pending';
  let allApps = [];

  const adminLoading = document.getElementById('admin-loading-state');
  const adminEmpty = document.getElementById('admin-empty-state');
  const appsList = document.getElementById('apps-list');
  const adminEmptyTitle = document.getElementById('admin-empty-title');
  const pendingCount = document.getElementById('pending-count');

  async function loadAdminData() {
    if (adminLoaded) return;
    adminLoading.classList.remove('hidden');

    const result = await window.getJson('/api/admin/applications');
    adminLoading.classList.add('hidden');
    adminLoaded = true;

    if (result.res.ok && result.data.data) {
      allApps = result.data.data.applications || [];
      renderAdminList();
    } else {
      window.showFlash('error', 'Failed to load applications.');
    }
  }

  function renderAdminList() {
    const list = allApps.filter(a => adminCurrentTab === 'pending' ? a.status === 'pending' : a.status !== 'pending');
    pendingCount.textContent = allApps.filter(a => a.status === 'pending').length;

    if (list.length === 0) {
      adminEmpty.classList.remove('hidden');
      appsList.classList.add('hidden');
      adminEmptyTitle.textContent = adminCurrentTab === 'pending' ? 'All caught up!' : 'No history found';
      return;
    }

    adminEmpty.classList.add('hidden');
    appsList.classList.remove('hidden');

    const esc = window.escapeHtml;
    appsList.innerHTML = list.map(app => {
      const date = new Date(app.appliedAt).toLocaleDateString();
      const user = app.user || { fullName: 'Unknown', email: 'Unknown' };
      
      let badgeHtml = '';
      if (app.status === 'approved') badgeHtml = '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Approved</span>';
      else if (app.status === 'rejected') badgeHtml = '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">Rejected</span>';
      else badgeHtml = '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">Pending</span>';

      const actionsHtml = adminCurrentTab === 'pending' ? `
        <div class="flex items-center gap-2 mt-4 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-t-0 sm:border-l border-surface-700 sm:pl-6 shrink-0">
          <button class="approve-btn inline-flex items-center justify-center px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium transition shadow-lg shadow-emerald-500/20" data-id="${esc(app.userId)}">Approve</button>
          <button class="reject-btn inline-flex items-center justify-center px-4 py-2 rounded-lg bg-surface-800 hover:bg-surface-700 text-red-400 text-sm font-medium border border-surface-600 transition" data-id="${esc(app.userId)}">Reject</button>
        </div>
      ` : '';

      return `
        <div class="p-6 sm:p-8 flex flex-col sm:flex-row gap-6 hover:bg-surface-800/30 transition-colors">
          <div class="flex-grow min-w-0 space-y-4">
            <div class="flex items-start justify-between gap-4">
              <div>
                <h3 class="font-display text-lg font-bold text-white leading-tight mb-1 flex items-center gap-3">
                  ${esc(app.startupName)} ${badgeHtml}
                </h3>
                <p class="text-sm text-gray-400 flex items-center gap-2">
                  <span class="font-medium text-gray-300">Applicant:</span> ${esc(user.fullName)} (${esc(user.email)})
                </p>
              </div>
              <span class="text-xs text-gray-500 whitespace-nowrap">${date}</span>
            </div>
            <div>
              <p class="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Bio</p>
              <p class="text-sm text-gray-300 bg-surface-950/50 p-3 rounded-lg border border-surface-800">${esc(app.bio)}</p>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              ${app.linkedinUrl ? `<div><p class="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">LinkedIn</p><a href="${esc(app.linkedinUrl)}" target="_blank" class="text-brand-400 hover:text-brand-300 underline break-all">${esc(app.linkedinUrl)}</a></div>` : ''}
              ${app.websiteUrl ? `<div><p class="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Website</p><a href="${esc(app.websiteUrl)}" target="_blank" class="text-brand-400 hover:text-brand-300 underline break-all">${esc(app.websiteUrl)}</a></div>` : ''}
            </div>
            ${app.notes ? `<div class="pt-2"><p class="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Notes</p><p class="text-sm text-gray-400 italic">"${esc(app.notes)}"</p></div>` : ''}
            ${app.rejectionReason && app.status === 'rejected' ? `<div class="pt-2 mt-2 border-t border-surface-800"><p class="text-xs font-medium text-red-500 uppercase tracking-wider mb-1">Rejection Reason</p><p class="text-sm text-red-400">${esc(app.rejectionReason)}</p></div>` : ''}
          </div>
          ${actionsHtml}
        </div>
      `;
    }).join('');

    bindAdminActions();
  }

  // Admin Sub-tabs
  const tAdminPending = document.getElementById('admin-tab-pending');
  const tAdminReviewed = document.getElementById('admin-tab-reviewed');

  tAdminPending.addEventListener('click', () => {
    adminCurrentTab = 'pending';
    tAdminPending.className = 'px-6 py-3 text-sm font-medium border-b-2 border-purple-500 text-white whitespace-nowrap transition-colors flex items-center gap-2';
    tAdminReviewed.className = 'px-6 py-3 text-sm font-medium border-b-2 border-transparent text-gray-400 hover:text-gray-200 transition-colors whitespace-nowrap';
    renderAdminList();
  });

  tAdminReviewed.addEventListener('click', () => {
    adminCurrentTab = 'reviewed';
    tAdminReviewed.className = 'px-6 py-3 text-sm font-medium border-b-2 border-purple-500 text-white whitespace-nowrap transition-colors flex items-center gap-2';
    tAdminPending.className = 'px-6 py-3 text-sm font-medium border-b-2 border-transparent text-gray-400 hover:text-gray-200 transition-colors whitespace-nowrap flex items-center gap-2';
    renderAdminList();
  });

  // Admin Modals and Actions
  const rejectModal = document.getElementById('reject-modal');
  let currentRejectId = null;

  function bindAdminActions() {
    document.querySelectorAll('.approve-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Approve this application? The user will become a Verified Entrepreneur.')) return;
        
        const original = btn.innerHTML;
        btn.innerHTML = '<div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>';
        btn.disabled = true;

        const id = btn.getAttribute('data-id');
        const rRes = await window.postJson(`/api/admin/applications/${id}/approve`);
        if (rRes.res.ok && rRes.data.ok) {
          window.showFlash('success', rRes.data.message);
          allApps.find(a => a.userId === id).status = 'approved';
          renderAdminList();
        } else {
          window.showFlash('error', rRes.data.errors ? rRes.data.errors[0] : 'Approval failed.');
          btn.innerHTML = original;
          btn.disabled = false;
        }
      });
    });

    document.querySelectorAll('.reject-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentRejectId = btn.getAttribute('data-id');
        document.getElementById('reject-reason').value = '';
        if(rejectModal) rejectModal.classList.remove('hidden');
      });
    });
  }

  if (rejectModal) {
    document.getElementById('cancel-reject').addEventListener('click', () => {
      rejectModal.classList.add('hidden');
      currentRejectId = null;
    });

    document.querySelectorAll('.modal-bg').forEach(el => {
      el.addEventListener('click', () => rejectModal.classList.add('hidden'));
    });

    document.getElementById('confirm-reject').addEventListener('click', async () => {
      const btn = document.getElementById('confirm-reject');
      const reason = document.getElementById('reject-reason').value;
      
      const original = btn.innerHTML;
      btn.innerHTML = '<div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>';
      btn.disabled = true;

      const rRes = await window.postJson(`/api/admin/applications/${currentRejectId}/reject`, { rejectionReason: reason });
      
      btn.innerHTML = original;
      btn.disabled = false;
      rejectModal.classList.add('hidden');

      if (rRes.res.ok && rRes.data.ok) {
        window.showFlash('success', rRes.data.message);
        const app = allApps.find(a => a.userId === currentRejectId);
        app.status = 'rejected';
        app.rejectionReason = reason;
        renderAdminList();
      } else {
        window.showFlash('error', rRes.data.errors ? rRes.data.errors[0] : 'Rejection failed.');
      }
    });
  }
})();
