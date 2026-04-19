/**
 * EntreVid ΓÇö Admin Applications Page
 */
(async function initAdmin() {
  await window.initAppContext();
  if (!window.App.currentUser || window.App.currentUser.role !== 'admin') {
    window.location.href = '/';
    return;
  }
  
  window.renderNav(window.App.currentUser, 'admin-applications');
  window.renderFooter();

  const loadingState = document.getElementById('loading-state');
  const emptyState = document.getElementById('empty-state');
  const appsList = document.getElementById('apps-list');
  const emptyTitle = document.getElementById('empty-title');
  const pendingCount = document.getElementById('pending-count');

  let currentTab = 'pending';
  let allApps = [];

  const data = await window.getJson('/api/admin/applications');
  loadingState.classList.add('hidden');

  if (data && data.ok) {
    allApps = data.data.applications || [];
  } else {
    window.showFlash('error', 'Failed to load applications.');
  }

  function renderList() {
    const list = allApps.filter(a => currentTab === 'pending' ? a.status === 'pending' : a.status !== 'pending');
    
    // Update counts
    pendingCount.textContent = allApps.filter(a => a.status === 'pending').length;

    if (list.length === 0) {
      emptyState.classList.remove('hidden');
      appsList.classList.add('hidden');
      emptyTitle.textContent = currentTab === 'pending' ? 'All caught up!' : 'No history found';
      return;
    }

    emptyState.classList.add('hidden');
    appsList.classList.remove('hidden');

    const esc = window.escapeHtml;
    
    appsList.innerHTML = list.map(app => {
      const date = new Date(app.appliedAt).toLocaleDateString();
      const user = app.user || { fullName: 'Unknown', email: 'Unknown' };
      
      let badgeHtml = '';
      if (app.status === 'approved') badgeHtml = '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Approved</span>';
      else if (app.status === 'rejected') badgeHtml = '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">Rejected</span>';
      else badgeHtml = '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">Pending</span>';

      const actionsHtml = currentTab === 'pending' ? `
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
                  ${esc(app.startupName)}
                  ${badgeHtml}
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

    bindActions();
  }

  // Tabs
  const tabPending = document.getElementById('tab-pending');
  const tabReviewed = document.getElementById('tab-reviewed');

  tabPending.addEventListener('click', () => {
    currentTab = 'pending';
    tabPending.className = 'px-6 py-4 text-sm font-medium border-b-2 border-brand-500 text-white whitespace-nowrap transition-colors flex items-center gap-2';
    tabReviewed.className = 'px-6 py-4 text-sm font-medium border-b-2 border-transparent text-gray-400 hover:text-gray-200 transition-colors whitespace-nowrap';
    renderList();
  });

  tabReviewed.addEventListener('click', () => {
    currentTab = 'reviewed';
    tabReviewed.className = 'px-6 py-4 text-sm font-medium border-b-2 border-brand-500 text-white whitespace-nowrap transition-colors';
    tabPending.className = 'px-6 py-4 text-sm font-medium border-b-2 border-transparent text-gray-400 hover:text-gray-200 transition-colors whitespace-nowrap flex items-center gap-2';
    renderList();
  });

  // Action Bindings
  const rejectModal = document.getElementById('reject-modal');
  let currentRejectId = null;

  function bindActions() {
    document.querySelectorAll('.approve-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Approve this application? The user will become a Verified Entrepreneur.')) return;
        
        const original = btn.innerHTML;
        btn.innerHTML = '<div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>';
        btn.disabled = true;

        const id = btn.getAttribute('data-id');
        const { res, data } = await window.postJson(`/api/admin/applications/${id}/approve`);
        if (res.ok && data.ok) {
          window.showFlash('success', data.message);
          allApps.find(a => a.userId === id).status = 'approved';
          renderList();
        } else {
          window.showFlash('error', data.errors ? data.errors[0] : 'Approval failed.');
          btn.innerHTML = original;
          btn.disabled = false;
        }
      });
    });

    document.querySelectorAll('.reject-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentRejectId = btn.getAttribute('data-id');
        document.getElementById('reject-reason').value = '';
        rejectModal.classList.remove('hidden');
      });
    });
  }

  // Reject Modal
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

    const { res, data } = await window.postJson(`/api/admin/applications/${currentRejectId}/reject`, { rejectionReason: reason });
    
    btn.innerHTML = original;
    btn.disabled = false;
    rejectModal.classList.add('hidden');

    if (res.ok && data.ok) {
      window.showFlash('success', data.message);
      const app = allApps.find(a => a.userId === currentRejectId);
      app.status = 'rejected';
      app.rejectionReason = reason;
      renderList();
    } else {
      window.showFlash('error', data.errors ? data.errors[0] : 'Rejection failed.');
    }
  });

  renderList();
})();
