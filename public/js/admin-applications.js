/**
 * EntreVid – Admin Applications Page v2
 */
(async function initAdmin() {
  await window.initAppContext();
  if (!window.App.currentUser || window.App.currentUser.role !== 'admin') {
    window.location.href = '/';
    return;
  }
  window.renderNav(window.App.currentUser, 'admin-applications');
  window.renderFooter();

  const loadEl   = document.getElementById('loading-state');
  const emptyEl  = document.getElementById('empty-state');
  const listEl   = document.getElementById('apps-list');
  const emptyTitle = document.getElementById('empty-title');
  const kpiPending  = document.getElementById('kpi-pending');
  const kpiApproved = document.getElementById('kpi-approved');
  const kpiRejected = document.getElementById('kpi-rejected');
  const kpiTotal    = document.getElementById('kpi-total');

  let currentFilter = 'pending';
  let allApps = [];

  const data = await window.getJson('/api/admin/applications');
  if (loadEl) loadEl.style.display = 'none';

  if (!data || !data.ok) {
    emptyEl?.classList.remove('hidden');
    if (emptyTitle) emptyTitle.textContent = 'Failed to load applications';
    return;
  }

  allApps = data.data?.applications || [];
  renderList();

  document.querySelectorAll('.admin-tab').forEach(btn => {
    btn.addEventListener('click', () => { currentFilter = btn.dataset.filter; renderList(); });
  });

  function updateTabs() {
    const pCount = allApps.filter(a => a.status==='pending').length;
    const aCount = allApps.filter(a => a.status==='approved').length;
    const rCount = allApps.filter(a => a.status==='rejected').length;
    if (kpiPending)  kpiPending.textContent  = pCount;
    if (kpiApproved) kpiApproved.textContent = aCount;
    if (kpiRejected) kpiRejected.textContent = rCount;
    if (kpiTotal)    kpiTotal.textContent    = allApps.length;
    document.querySelectorAll('.admin-tab').forEach(btn => {
      const f = btn.dataset.filter;
      const isActive = f === currentFilter;
      const c = { pending:'245,158,11', approved:'16,185,129', rejected:'244,63,94', all:'99,102,241' }[f] || '99,102,241';
      btn.style.background  = isActive ? `rgba(${c},0.15)` : 'transparent';
      btn.style.borderColor = isActive ? `rgba(${c},0.5)`  : `rgba(${c},0.2)`;
      btn.style.color       = isActive ? `rgb(${c})`       : '#8a91a8';
      btn.style.fontWeight  = isActive ? '600' : '500';
    });
  }

  function renderList() {
    updateTabs();
    const list = currentFilter === 'all' ? allApps : allApps.filter(a => a.status === currentFilter);
    if (!list.length) {
      listEl?.classList.add('hidden'); emptyEl?.classList.remove('hidden');
      if (emptyTitle) emptyTitle.textContent = currentFilter==='pending' ? 'All caught up!' : 'Nothing here.';
      return;
    }
    emptyEl?.classList.add('hidden'); listEl?.classList.remove('hidden');

    const esc = window.escapeHtml;
    const COLORS = ['#6366f1','#a855f7','#10b981','#f59e0b','#f43f5e','#06b6d4'];

    listEl.innerHTML = list.map((app, i) => {
      const user = app.user || { fullName:'Unknown', email:'Unknown' };
      const date = new Date(app.appliedAt).toLocaleDateString(undefined,{day:'numeric',month:'long',year:'numeric'});
      const initials = (user.fullName||'U').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
      const color = COLORS[i % COLORS.length];

      const badge = {
        approved:`<span style="padding:4px 12px;border-radius:999px;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.25);color:#34d399;font-size:12px;font-weight:600;">✅ Approved</span>`,
        rejected:`<span style="padding:4px 12px;border-radius:999px;background:rgba(244,63,94,0.1);border:1px solid rgba(244,63,94,0.25);color:#f87171;font-size:12px;font-weight:600;">❌ Rejected</span>`,
        pending:`<span style="padding:4px 12px;border-radius:999px;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.25);color:#fbbf24;font-size:12px;font-weight:600;">⏳ Pending</span>`,
      }[app.status]||'';

      const actions = app.status==='pending' ? `
        <div style="display:flex;gap:10px;flex-wrap:wrap;padding-top:16px;border-top:1px solid #262b3d;margin-top:16px;">
          <button class="approve-btn" data-id="${esc(app.userId)}" style="padding:9px 20px;border-radius:10px;background:#10b981;border:none;color:#fff;font-size:14px;font-weight:600;cursor:pointer;">✓ Approve</button>
          <input class="reject-reason-input" data-input-id="${esc(app.userId)}" placeholder="Rejection reason (optional)" style="flex:1;min-width:180px;padding:9px 14px;background:#0b0d17;border:1px solid #262b3d;border-radius:10px;color:#e6e8ef;font-size:14px;outline:none;"/>
          <button class="reject-btn" data-id="${esc(app.userId)}" style="padding:9px 20px;border-radius:10px;background:rgba(244,63,94,0.1);border:1px solid rgba(244,63,94,0.25);color:#f87171;font-size:14px;font-weight:600;cursor:pointer;">✗ Reject</button>
        </div>`
      : `<p style="font-size:12px;color:#8a91a8;margin-top:12px;">Reviewed on ${new Date(app.updatedAt||app.appliedAt).toLocaleDateString()}</p>`;

      return `
        <div style="background:#141826;border:1px solid #262b3d;border-radius:16px;padding:28px;">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:20px;">
            <div style="display:flex;align-items:center;gap:14px;">
              <div style="width:48px;height:48px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;font-family:'Sora',sans-serif;font-size:16px;font-weight:700;color:#fff;flex-shrink:0;">${esc(initials)}</div>
              <div>
                <h3 style="font-family:'Sora',sans-serif;font-size:1rem;font-weight:700;color:#fff;margin-bottom:2px;">${esc(user.fullName)}</h3>
                <p style="font-size:13px;color:#8a91a8;">${esc(user.email)}</p>
              </div>
            </div>
            ${badge}
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:16px;">
            <div style="background:#1c2030;border-radius:10px;padding:14px;"><p style="font-size:11px;color:#8a91a8;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">Startup</p><p style="font-size:14px;font-weight:500;color:#e6e8ef;">${esc(app.startupName||'—')}</p></div>
            <div style="background:#1c2030;border-radius:10px;padding:14px;"><p style="font-size:11px;color:#8a91a8;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">Applied</p><p style="font-size:14px;font-weight:500;color:#e6e8ef;">${date}</p></div>
            ${app.linkedinUrl?`<div style="background:#1c2030;border-radius:10px;padding:14px;"><p style="font-size:11px;color:#8a91a8;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">LinkedIn</p><a href="${esc(app.linkedinUrl)}" target="_blank" style="font-size:13px;color:#818cf8;text-decoration:none;">View →</a></div>`:''}
          </div>
          <div style="background:#1c2030;border-radius:10px;padding:14px;margin-bottom:12px;"><p style="font-size:11px;color:#8a91a8;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">Bio</p><p style="font-size:14px;color:#c4c9d8;line-height:1.7;">${esc(app.bio||'No bio provided.')}</p></div>
          ${app.notes?`<div style="background:#1c2030;border-radius:10px;padding:14px;margin-bottom:12px;"><p style="font-size:11px;color:#8a91a8;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">Notes</p><p style="font-size:14px;color:#c4c9d8;">${esc(app.notes)}</p></div>`:''}
          ${app.rejectionReason&&app.status==='rejected'?`<div style="background:rgba(244,63,94,0.06);border:1px solid rgba(244,63,94,0.2);border-radius:10px;padding:14px;margin-bottom:12px;"><p style="font-size:11px;color:#f87171;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">Rejection Reason</p><p style="font-size:14px;color:#fca5a5;">${esc(app.rejectionReason)}</p></div>`:''}
          ${actions}
        </div>`;
    }).join('');

    bindActions();
  }

  function bindActions() {
    document.querySelectorAll('.approve-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Approve this application? This grants verified entrepreneur access.')) return;
        const orig = btn.innerHTML; window.setButtonLoading(btn, true);
        const {res,data} = await window.postJson(`/api/admin/applications/${btn.dataset.id}/approve`);
        if (res.ok && data.ok) { const app=allApps.find(a=>a.userId===btn.dataset.id); if(app) app.status='approved'; window.showFlash('success','Application approved!'); renderList(); }
        else { window.setButtonLoading(btn,false,orig); window.showFlash('error',(data.errors||['Failed'])[0]); }
      });
    });
    document.querySelectorAll('.reject-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Reject this application?')) return;
        const reason = document.querySelector(`.reject-reason-input[data-input-id="${btn.dataset.id}"]`)?.value.trim()||'';
        const orig = btn.innerHTML; window.setButtonLoading(btn, true);
        const {res,data} = await window.postJson(`/api/admin/applications/${btn.dataset.id}/reject`,{rejectionReason:reason});
        if (res.ok && data.ok) { const app=allApps.find(a=>a.userId===btn.dataset.id); if(app){app.status='rejected';app.rejectionReason=reason;} window.showFlash('success','Application rejected.'); renderList(); }
        else { window.setButtonLoading(btn,false,orig); window.showFlash('error',(data.errors||['Failed'])[0]); }
      });
    });
  }
})();
