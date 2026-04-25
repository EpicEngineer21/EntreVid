/**
 * EntreVid — Dashboard Page v3
 * Drives sidebar nav, overview stats, watchlist, history, submissions, profile.
 */
(async function initDashboard() {
  await window.initAppContext();
  const user = window.App.currentUser;
  if (!user) { window.location.href = '/login'; return; }

  window.renderNav(user, 'dashboard');
  window.initScrollReveal();

  // ── Sidebar nav switching ─────────────────────────────────
  const navItems = document.querySelectorAll('.dash-nav-item, .dash-tab');
  const sections = document.querySelectorAll('.dash-section');

  function activateSection(name) {
    sections.forEach(s => s.classList.toggle('active', s.id === `section-${name}`));
    navItems.forEach(n => {
      const active = n.dataset.section === name;
      n.classList.toggle('active', active);
      if (n.classList.contains('dash-tab')) {
        n.style.background = active ? 'rgba(99,102,241,0.12)' : 'none';
        n.style.border = active ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent';
        n.style.color = active ? '#818cf8' : '#8a91a8';
      }
    });
    // Lazy-load section data
    if (name === 'submissions') loadSubmissions();
    if (name === 'watchlist') loadWatchlist();
    if (name === 'history') loadHistory();
  }

  navItems.forEach(n => n.addEventListener('click', () => activateSection(n.dataset.section)));

  // ── Welcome heading ───────────────────────────────────────
  const wh = document.getElementById('welcome-heading');
  if (wh) wh.textContent = `Welcome back, ${user.fullName.split(' ')[0]} 👋`;

  // ── Stats (from localStorage) ─────────────────────────────
  const watchlist = JSON.parse(localStorage.getItem('ev_watchlist') || '[]');
  const history   = JSON.parse(localStorage.getItem('ev_history')   || '[]');
  const statW = document.getElementById('stat-watchlist');
  const statH = document.getElementById('stat-history');
  if (statW) statW.textContent = watchlist.length;
  if (statH) statH.textContent = history.length;

  // Continue watching (last 4 history items)
  const cwEl = document.getElementById('continue-watching');
  const cwEmpty = document.getElementById('continue-empty');
  if (history.length && cwEl) {
    cwEmpty?.classList.add('hidden');
    try {
      const data = await window.getJson('/api/videos');
      const allVids = data.videos || [];
      const recent = history.slice(-4).reverse().map(id => allVids.find(v => (v._id||v.id) === id)).filter(Boolean);
      if (recent.length) {
        cwEl.innerHTML = recent.map(v => {
          const ytId = window.extractYouTubeId(v.youtubeUrl||v.youtubeId||v.id);
          return `<a href="/video-details.html?id=${window.escapeHtml(v._id||v.id||'')}" style="display:block;text-decoration:none;background:#141826;border:1px solid #262b3d;border-radius:12px;overflow:hidden;transition:transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform=''">
            <div style="aspect-ratio:16/9;background:#0b0d17;">${ytId?`<img src="https://img.youtube.com/vi/${ytId}/mqdefault.jpg" style="width:100%;height:100%;object-fit:cover;" loading="lazy"/>`:''}</div>
            <div style="padding:10px;"><p style="font-size:13px;font-weight:500;color:#e6e8ef;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${window.escapeHtml(v.title||'')}</p></div>
          </a>`;
        }).join('');
      } else { cwEmpty?.classList.remove('hidden'); }
    } catch { cwEmpty?.classList.remove('hidden'); }
  } else { cwEl?.style && (cwEl.style.display = 'none'); cwEmpty?.classList.remove('hidden'); }

  // ── Submissions ───────────────────────────────────────────
  let submissionsLoaded = false;
  async function loadSubmissions() {
    if (submissionsLoaded) return;
    submissionsLoaded = true;
    const loadEl = document.getElementById('submissions-loading');
    const tableEl = document.getElementById('submissions-table');
    const emptyEl = document.getElementById('submissions-empty');
    const statS = document.getElementById('stat-submissions');

    // Only entrepreneurs/admins have submissions
    if (user.role !== 'verified_entrepreneur' && user.role !== 'admin') {
      if (loadEl) loadEl.style.display = 'none';
      const applyMsg = document.createElement('div');
      applyMsg.style.cssText = 'padding:48px;background:#141826;border:1px solid #262b3d;border-radius:12px;text-align:center;';
      applyMsg.innerHTML = `<div style="font-size:40px;margin-bottom:12px;">🚀</div><p style="color:#8a91a8;font-size:14px;margin-bottom:16px;">You need to be a verified entrepreneur to submit videos.</p><a href="/apply" style="padding:10px 20px;background:linear-gradient(135deg,#6366f1,#a855f7);border-radius:10px;color:#fff;font-size:14px;font-weight:600;text-decoration:none;">Apply Now</a>`;
      document.getElementById('section-submissions')?.prepend(applyMsg);
      return;
    }

    try {
      const payload = await window.getJson('/api/my/videos');
      if (loadEl) loadEl.style.display = 'none';
      if (payload.__httpError || !payload.ok) { emptyEl?.classList.remove('hidden'); return; }
      const videos = payload.data?.videos || [];
      if (statS) statS.textContent = videos.length;
      if (!videos.length) { emptyEl?.classList.remove('hidden'); return; }
      tableEl?.classList.remove('hidden');
      tableEl.innerHTML = `<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead><tr style="border-bottom:1px solid #262b3d;">${['Title','Category','Date','Actions'].map(h=>`<th style="text-align:left;padding:10px 14px;font-size:12px;font-weight:600;color:#8a91a8;text-transform:uppercase;letter-spacing:0.06em;">${h}</th>`).join('')}</tr></thead>
        <tbody>${videos.map(v=>{
          const ytId = window.extractYouTubeId(v.youtubeId||v.youtubeUrl||'');
          const dateStr = new Date(v.createdAt).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
          return `<tr style="border-bottom:1px solid #1c2030;" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background=''">
            <td style="padding:14px;"><div style="display:flex;align-items:center;gap:10px;">${ytId?`<img src="https://img.youtube.com/vi/${ytId}/default.jpg" style="width:56px;height:40px;object-fit:cover;border-radius:6px;" loading="lazy"/>`:'<div style="width:56px;height:40px;background:#1c2030;border-radius:6px;"></div>'}<span style="font-weight:500;color:#e6e8ef;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden;max-width:200px;">${window.escapeHtml(v.title||'')}</span></div></td>
            <td style="padding:14px;"><span style="padding:3px 10px;background:rgba(99,102,241,0.1);border-radius:6px;font-size:12px;color:#818cf8;">${window.escapeHtml(v.category||'')}</span></td>
            <td style="padding:14px;color:#8a91a8;">${dateStr}</td>
            <td style="padding:14px;"><div style="display:flex;gap:8px;"><a href="/video-details.html?id=${window.escapeHtml(v._id||v.id||'')}" style="padding:6px 12px;background:#1c2030;border:1px solid #262b3d;border-radius:8px;color:#e6e8ef;font-size:12px;font-weight:500;text-decoration:none;">View</a><button class="delete-btn" data-id="${window.escapeHtml(v._id||v.id||'')}" style="padding:6px 12px;background:rgba(244,63,94,0.08);border:1px solid rgba(244,63,94,0.2);border-radius:8px;color:#f43f5e;font-size:12px;cursor:pointer;">Delete</button></div></td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>`;

      document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('Delete this video? This cannot be undone.')) return;
          btn.textContent = '…'; btn.disabled = true;
          const { res, data } = await window.postJson(`/api/videos/${btn.dataset.id}/delete`);
          if (res.ok && data.ok) { window.showFlash('success', 'Video deleted.'); setTimeout(()=>location.reload(),600); }
          else { window.showFlash('error', 'Delete failed.'); btn.textContent='Delete'; btn.disabled=false; }
        });
      });
    } catch { if (loadEl) loadEl.style.display='none'; emptyEl?.classList.remove('hidden'); }
  }

  // ── Watchlist ─────────────────────────────────────────────
  let watchlistLoaded = false;
  async function loadWatchlist() {
    if (watchlistLoaded) return;
    watchlistLoaded = true;
    const gridEl = document.getElementById('watchlist-grid');
    const emptyEl = document.getElementById('watchlist-empty');
    const ids = JSON.parse(localStorage.getItem('ev_watchlist')||'[]');
    if (!ids.length) { emptyEl?.classList.remove('hidden'); return; }
    try {
      const data = await window.getJson('/api/videos');
      const all = data.videos||[];
      const saved = ids.map(id=>all.find(v=>(v._id||v.id)===id)).filter(Boolean);
      if (!saved.length) { emptyEl?.classList.remove('hidden'); return; }
      emptyEl?.classList.add('hidden');
      gridEl.innerHTML = saved.map(v=>{
        const ytId=window.extractYouTubeId(v.youtubeUrl||v.youtubeId||v.id);
        return `<a href="/video-details.html?id=${window.escapeHtml(v._id||v.id||'')}" style="display:block;text-decoration:none;background:#141826;border:1px solid #262b3d;border-radius:12px;overflow:hidden;transition:transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform=''">
          <div style="aspect-ratio:16/9;background:#0b0d17;">${ytId?`<img src="https://img.youtube.com/vi/${ytId}/mqdefault.jpg" style="width:100%;height:100%;object-fit:cover;" loading="lazy"/>`:''}</div>
          <div style="padding:12px;"><span style="display:inline-block;padding:2px 8px;background:rgba(99,102,241,0.1);border-radius:6px;font-size:11px;color:#818cf8;margin-bottom:6px;">${window.escapeHtml(v.category||'')}</span><p style="font-size:13px;font-weight:500;color:#e6e8ef;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${window.escapeHtml(v.title||'')}</p></div>
        </a>`;
      }).join('');
    } catch { emptyEl?.classList.remove('hidden'); }
  }

  // ── History ───────────────────────────────────────────────
  let historyLoaded = false;
  async function loadHistory() {
    if (historyLoaded) return;
    historyLoaded = true;
    const listEl = document.getElementById('history-list');
    const emptyEl = document.getElementById('history-empty');
    const ids = JSON.parse(localStorage.getItem('ev_history')||'[]');
    if (!ids.length) { emptyEl?.classList.remove('hidden'); return; }
    try {
      const data = await window.getJson('/api/videos');
      const all = data.videos||[];
      const seen = ids.slice().reverse().map(id=>all.find(v=>(v._id||v.id)===id)).filter(Boolean);
      if (!seen.length) { emptyEl?.classList.remove('hidden'); return; }
      emptyEl?.classList.add('hidden');
      listEl.innerHTML = seen.map(v=>{
        const ytId=window.extractYouTubeId(v.youtubeUrl||v.youtubeId||v.id);
        return `<a href="/video-details.html?id=${window.escapeHtml(v._id||v.id||'')}" style="display:flex;align-items:center;gap:16px;text-decoration:none;background:#141826;border:1px solid #262b3d;border-radius:12px;padding:12px;transition:border-color 0.2s;" onmouseover="this.style.borderColor='rgba(99,102,241,0.3)'" onmouseout="this.style.borderColor='#262b3d'">
          <div style="width:80px;height:56px;border-radius:8px;overflow:hidden;background:#0b0d17;flex-shrink:0;">${ytId?`<img src="https://img.youtube.com/vi/${ytId}/default.jpg" style="width:100%;height:100%;object-fit:cover;" loading="lazy"/>`:'<div></div>'}</div>
          <div><p style="font-size:14px;font-weight:500;color:#e6e8ef;margin-bottom:4px;">${window.escapeHtml(v.title||'')}</p><p style="font-size:12px;color:#8a91a8;">${window.escapeHtml(v.entrepreneur||'')} · ${window.escapeHtml(v.category||'')}</p></div>
        </a>`;
      }).join('');
    } catch { emptyEl?.classList.remove('hidden'); }
  }

  // ── Profile section ───────────────────────────────────────
  const profileName = document.getElementById('profile-name');
  const profileEmail = document.getElementById('profile-email');
  const profileImageUrl = document.getElementById('profile-image-url');
  if (profileName) profileName.value = user.fullName || '';
  if (profileEmail) profileEmail.value = user.email || '';
  if (profileImageUrl) profileImageUrl.value = user.profileImageUrl || '';

  document.getElementById('profile-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('profile-error');
    const sucEl = document.getElementById('profile-success');
    errEl?.classList.add('hidden'); sucEl?.classList.add('hidden');
    const btn = document.getElementById('profile-save-btn');
    const orig = btn.innerHTML;
    window.setButtonLoading(btn, true);
    const { res, data } = await window.postJson('/api/profile/update', {
      fullName: profileName?.value.trim(),
      profileImageUrl: profileImageUrl?.value.trim(),
    });
    window.setButtonLoading(btn, false, orig);
    if (res.ok && data.ok) { if (sucEl) { sucEl.textContent = 'Profile updated!'; sucEl.classList.remove('hidden'); } }
    else { if (errEl) { errEl.textContent = (data.errors||['Update failed.'])[0]; errEl.classList.remove('hidden'); } }
  });

  document.getElementById('password-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('password-save-btn');
    const orig = btn.innerHTML;
    window.setButtonLoading(btn, true);
    const { res, data } = await window.postJson('/api/profile/change-password', {
      currentPassword: document.getElementById('current-password')?.value,
      newPassword: document.getElementById('new-password')?.value,
      confirmNewPassword: document.getElementById('confirm-new-password')?.value,
    });
    window.setButtonLoading(btn, false, orig);
    const errEl = document.getElementById('profile-error');
    const sucEl = document.getElementById('profile-success');
    errEl?.classList.add('hidden'); sucEl?.classList.add('hidden');
    if (res.ok && data.ok) { if (sucEl) { sucEl.textContent = 'Password updated!'; sucEl.classList.remove('hidden'); } document.getElementById('password-form').reset(); }
    else { if (errEl) { errEl.textContent = (data.errors||['Password update failed.'])[0]; errEl.classList.remove('hidden'); } }
  });
})();
