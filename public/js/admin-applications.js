/**
 * EntreVid - Admin Applications Page
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
  const tabPending = document.getElementById('tab-pending');
  const tabReviewed = document.getElementById('tab-reviewed');

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
    
    // Update counts and tabs
    const pendingCount = allApps.filter(a => a.status === 'pending').length;
    const reviewedCount = allApps.filter(a => a.status !== 'pending').length;
    
    tabPending.innerHTML = `${pendingCount} pending`;
    tabReviewed.innerHTML = `${reviewedCount} approved`;

    if (currentTab === 'pending') {
      tabPending.className = 'px-4 py-1.5 rounded-full border border-amber-500 text-amber-500 bg-amber-500/10 text-sm font-medium transition-colors cursor-pointer';
      tabReviewed.className = 'px-4 py-1.5 rounded-full border border-emerald-500/30 text-emerald-500/50 hover:text-emerald-400 hover:border-emerald-500/50 hover:bg-emerald-500/10 text-sm font-medium transition-colors cursor-pointer';
    } else {
      tabPending.className = 'px-4 py-1.5 rounded-full border border-amber-500/30 text-amber-500/50 hover:text-amber-400 hover:border-amber-500/50 hover:bg-amber-500/10 text-sm font-medium transition-colors cursor-pointer';
      tabReviewed.className = 'px-4 py-1.5 rounded-full border border-emerald-500 text-emerald-500 bg-emerald-500/10 text-sm font-medium transition-colors cursor-pointer';
    }

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
      const dbDate = new Date(app.appliedAt);
      const date = `${dbDate.getDate()} ${dbDate.toLocaleString('default', { month: 'long' })} ${dbDate.getFullYear()}`;
      const user = app.user || { fullName: 'Unknown', email: 'Unknown' };
      const initial = esc((user.fullName || 'U').charAt(0).toUpperCase());
      const avatarColors = ['bg-indigo-500', 'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-rose-500', 'bg-teal-500'];
      const avatarColor = avatarColors[(app.userId || 'a').charCodeAt(0) % avatarColors.length];
      
      let badgeHtml = '';
      if (app.status === 'approved') badgeHtml = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"><svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg> Approved</span>`;
      else if (app.status === 'rejected') badgeHtml = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-500 border border-red-500/20"><svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg> Rejected</span>`;
      else badgeHtml = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20"><span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Pending Review</span>`;

      const actionsHtml = currentTab === 'pending' ? `
        <div class="flex flex-col sm:flex-row items-center gap-4 pt-2">
          <button class="approve-btn inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#00e676] hover:bg-[#00c853] text-surface-950 font-bold transition shadow-lg shadow-[#00e676]/20 w-full sm:w-auto justify-center" data-id="${esc(app.userId)}">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg> Approve
          </button>
          <input type="text" placeholder="Rejection reason (optional, admin-only)" class="reject-reason-input flex-grow w-full bg-surface-950/50 border border-surface-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-surface-600 transition" data-input-id="${esc(app.userId)}">
          <button class="reject-btn inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 font-medium border border-red-500/20 transition w-full sm:w-auto justify-center" data-id="${esc(app.userId)}">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg> Reject
          </button>
        </div>
      ` : `
        <div class="pt-2">
          <p class="text-xs text-gray-500 tracking-wider">Reviewed on ${new Date(app.updatedAt || app.appliedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
      `;

      return `
        <div class="bg-surface-900/80 backdrop-blur-xl border border-surface-700/80 rounded-2xl p-6 sm:p-8 hover:bg-surface-800/40 transition-colors">
          <div class="flex justify-between items-start mb-6">
            <div class="flex gap-4 items-center">
              <div class="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0 ${avatarColor}">
                ${initial}
              </div>
              <div>
                <h3 class="text-white font-bold text-2xl leading-tight mb-0.5">${esc(user.fullName)}</h3>
                <p class="text-gray-400 text-sm">${esc(user.email)}</p>
              </div>
            </div>
            <div class="shrink-0 ml-4 hidden sm:block">
              ${badgeHtml}
            </div>
          </div>
          
          <div class="sm:hidden mb-6 -mt-2">
            ${badgeHtml}
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div class="p-4 rounded-xl border border-surface-800 bg-surface-950/30">
              <p class="text-[11px] font-medium text-gray-500 tracking-wider mb-1.5 uppercase">Startup / Business</p>
              <p class="text-white font-medium">${esc(app.startupName)}</p>
            </div>
            <div class="p-4 rounded-xl border border-surface-800 bg-surface-950/30">
              <p class="text-[11px] font-medium text-gray-500 tracking-wider mb-1.5 uppercase">Applied</p>
              <p class="text-white font-medium">${date}</p>
            </div>
          </div>

          <div class="p-4 rounded-xl border border-surface-800 bg-surface-950/30 mb-4">
            <p class="text-[11px] font-medium text-gray-500 tracking-wider mb-2 uppercase">Bio</p>
            <p class="text-gray-300 text-sm leading-relaxed">${esc(app.bio)}</p>
          </div>

          <div class="flex flex-wrap gap-3 mb-4">
            ${app.linkedinUrl ? `<a href="${esc(app.linkedinUrl)}" target="_blank" class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500/10 text-indigo-400 text-sm font-medium border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg> LinkedIn</a>` : ''}
            ${app.websiteUrl ? `<a href="${esc(app.websiteUrl)}" target="_blank" class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 text-gray-300 text-sm font-medium border border-surface-700 hover:bg-surface-700 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/></svg> Website</a>` : ''}
          </div>

          ${app.notes ? `
            <div class="p-4 rounded-xl border border-surface-800 bg-surface-950/30 mb-6">
              <p class="text-[11px] font-medium text-gray-500 tracking-wider mb-2 uppercase">Notes from Applicant</p>
              <p class="text-gray-300 text-sm leading-relaxed">${esc(app.notes)}</p>
            </div>
          ` : ''}
          
          ${app.rejectionReason && app.status === 'rejected' ? `
            <div class="p-4 rounded-xl border border-red-500/20 bg-red-500/5 mb-6">
              <p class="text-[11px] font-medium text-red-500 tracking-wider mb-2 uppercase">Rejection Reason</p>
              <p class="text-red-300 text-sm leading-relaxed">${esc(app.rejectionReason)}</p>
            </div>
          ` : ''}

          ${actionsHtml}
        </div>
      `;
    }).join('');

    bindActions();
  }

  tabPending.addEventListener('click', () => {
    currentTab = 'pending';
    renderList();
  });

  tabReviewed.addEventListener('click', () => {
    currentTab = 'reviewed';
    renderList();
  });

  function bindActions() {
    document.querySelectorAll('.approve-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const userId = btn.getAttribute('data-id');
        const originalHtml = btn.innerHTML;
        window.setButtonLoading(btn, true);
        
        const { res, data } = await window.postJson(`/api/admin/applications/${userId}/approve`);
        if (res.ok && data.ok) {
          const app = allApps.find(a => a.userId === userId);
          if (app) app.status = 'approved';
          window.showFlash('success', 'Application approved successfully.');
          renderList();
        } else {
          window.setButtonLoading(btn, false, originalHtml);
          window.showFlash('error', data.errors ? data.errors[0] : 'Failed to approve application.');
        }
      });
    });

    document.querySelectorAll('.reject-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const userId = btn.getAttribute('data-id');
        const input = document.querySelector(`.reject-reason-input[data-input-id="${userId}"]`);
        const reason = input ? input.value.trim() : '';

        const originalHtml = btn.innerHTML;
        window.setButtonLoading(btn, true);

        const { res, data } = await window.postJson(`/api/admin/applications/${userId}/reject`, { rejectionReason: reason });
        if (res.ok && data.ok) {
          const app = allApps.find(a => a.userId === userId);
          if (app) {
            app.status = 'rejected';
            app.rejectionReason = reason;
          }
          window.showFlash('success', 'Application rejected.');
          renderList();
        } else {
          window.setButtonLoading(btn, false, originalHtml);
          window.showFlash('error', data.errors ? data.errors[0] : 'Failed to reject application.');
        }
      });
    });
  }

  // Initial render
  renderList();
})();

