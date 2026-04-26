/**
 * EntreVid — Video Details Page v5
 * Matches reference UI: 2-col layout, founder card, related videos rail,
 * like/save/share actions, history + watchlist tracking
 */
(async function initVideoDetails() {
  await window.initAppContext();
  window.renderNav(window.App.currentUser);
  window.renderFooter();

  // ── Resolve video ID ──────────────────────────────────────────
  const params  = new URLSearchParams(window.location.search);
  const videoId = params.get('id') || window.location.pathname.split('/').filter(Boolean).pop();

  const loadingEl = document.getElementById('loading-state');
  const contentEl = document.getElementById('video-content');

  // ── Fetch video ───────────────────────────────────────────────
  const payload = await window.getJson(`/api/videos/${videoId}`);
  if (loadingEl) loadingEl.style.display = 'none';

  if (payload.__httpError || !payload.ok || !payload.data) {
    if (contentEl) {
      contentEl.classList.remove('hidden');
      contentEl.innerHTML = `
        <div style="text-align:center;padding:100px 24px;">
          <div style="font-size:56px;margin-bottom:20px;">🎬</div>
          <h1 style="font-family:'Sora',sans-serif;font-size:1.5rem;font-weight:700;color:#fff;margin-bottom:10px;">Video Not Found</h1>
          <p style="color:#8a91a8;margin-bottom:28px;">This video may have been removed or the link is incorrect.</p>
          <a href="/browse" style="padding:12px 24px;background:linear-gradient(135deg,#6366f1,#a855f7);border-radius:10px;color:#fff;font-weight:600;text-decoration:none;">Browse Videos</a>
        </div>`;
    }
    return;
  }

  const v       = payload.data.video;
  const owner   = payload.data.owner;
  const currUser = window.App.currentUser || {};
  const isOwner = v.ownerUserId === currUser.id;
  const isAdmin = currUser.role === 'admin';
  const esc     = window.escapeHtml;

  // ── Update page title ─────────────────────────────────────────
  document.title = `${v.title} | EntreVid`;

  // ── YouTube ID ────────────────────────────────────────────────
  function extractYtId(raw) {
    if (!raw) return null;
    // Already a clean 11-char ID (only base64url chars)
    if (/^[A-Za-z0-9_-]{11}$/.test(raw.trim())) return raw.trim();
    // Parse from URL
    const m = raw.match(/(?:v=|\/embed\/|\/shorts\/|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  // Prefer the stored youtubeId field, fall back to parsing youtubeUrl
  const ytId = extractYtId(v.youtubeId) || extractYtId(v.youtubeUrl || '');

  // ── Player ────────────────────────────────────────────────────
  const playerIframe = document.getElementById('video-player');
  const playerContainer = document.getElementById('player-container');

  if (ytId && playerIframe) {
    // Use www.youtube.com/embed/ — matches CSP frameSrc whitelist
    playerIframe.src = `https://www.youtube.com/embed/${esc(ytId)}?rel=0&modestbranding=1&enablejsapi=0`;
    playerIframe.setAttribute('frameborder', '0');
    playerIframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
    playerIframe.setAttribute('allowfullscreen', '');
    playerIframe.setAttribute('loading', 'lazy');
    // Handle embed errors (private/deleted videos)
    playerIframe.addEventListener('error', () => showVideoUnavailable(playerContainer));
  } else if (playerContainer) {
    showVideoUnavailable(playerContainer);
  }

  function showVideoUnavailable(container) {
    const iframe = container.querySelector('iframe');
    if (iframe) iframe.style.display = 'none';
    if (!container.querySelector('.vd-unavailable')) {
      const msg = document.createElement('div');
      msg.className = 'vd-unavailable';
      msg.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#0b0d17;gap:12px;';
      msg.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="#4b5563" stroke-width="1.5"><path d="M15 10l4.553-2.07A1 1 0 0121 8.845v6.308a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/><line x1="2" y1="2" x2="22" y2="22" stroke="#f43f5e"/></svg>
        <p style="font-size:14px;color:#6b7280;font-family:'Inter',sans-serif;">Video unavailable</p>
        ${v.youtubeUrl ? `<a href="${esc(v.youtubeUrl)}" target="_blank" rel="noopener noreferrer" style="font-size:13px;color:#818cf8;text-decoration:none;">Watch on YouTube ↗</a>` : ''}
      `;
      container.appendChild(msg);
    }
  }

  // ── Category, title, date ─────────────────────────────────────
  const catEl = document.getElementById('v-category');
  if (catEl) catEl.textContent = v.category || '';

  const titleEl = document.getElementById('v-title');
  if (titleEl) titleEl.textContent = v.title;

  const dateEl = document.getElementById('v-date');
  if (dateEl) dateEl.textContent = new Date(v.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  // ── Simulated view/like counts (seeded from video id) ─────────
  function seededRand(seed, min, max) {
    let s = 0;
    for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
    return min + (s % (max - min));
  }
  const seed = (v._id || v.id || videoId);
  const viewCount = seededRand(seed + 'v', 800, 48000);
  const likeCount = Math.floor(viewCount * (0.04 + seededRand(seed + 'l', 0, 8) / 100));

  const viewsEl = document.getElementById('v-views');
  if (viewsEl) viewsEl.textContent = viewCount.toLocaleString();

  // ── Description + tags ───────────────────────────────────────
  const descEl = document.getElementById('v-desc');
  if (descEl) descEl.textContent = v.description || '';

  const tagsEl = document.getElementById('v-tags');
  // Tags may be an array OR a space-separated string depending on API endpoint
  const tagList = Array.isArray(v.tags)
    ? v.tags
    : (v.tags || '').split(/[,\s]+/).filter(Boolean);
  if (tagsEl && tagList.length > 0) {
    tagsEl.innerHTML = tagList.map(t => `<span class="vd-hashtag">#${esc(t.replace(/^#/,'').trim())}</span>`).join('');
  }

  // ── Like / Save / Share buttons ───────────────────────────────
  const vid       = v._id || v.id || videoId;
  const WL_KEY    = 'ev_watchlist';
  const HIST_KEY  = 'ev_history';
  const LIKES_KEY = 'ev_likes';

  function getList(k) { return JSON.parse(localStorage.getItem(k) || '[]'); }
  function setList(k, a) { localStorage.setItem(k, JSON.stringify(a)); }

  // Track history
  const hist = getList(HIST_KEY).filter(id => id !== vid);
  hist.unshift(vid);
  setList(HIST_KEY, hist.slice(0, 50));

  // Like button
  const likeBtn   = document.getElementById('like-btn');
  const likeCountEl = document.getElementById('like-count');
  let localLikes = likeCount;

  function renderLikeBtn() {
    const liked = getList(LIKES_KEY).includes(vid);
    if (likeBtn) {
      likeBtn.className = 'vd-action-btn' + (liked ? ' liked' : '');
      likeBtn.querySelector('svg').setAttribute('fill', liked ? 'currentColor' : 'none');
    }
    if (likeCountEl) likeCountEl.textContent = localLikes.toLocaleString();
  }
  renderLikeBtn();

  likeBtn?.addEventListener('click', () => {
    if (!currUser.id) { window.location.href = '/login'; return; }
    const list = getList(LIKES_KEY);
    if (list.includes(vid)) {
      setList(LIKES_KEY, list.filter(id => id !== vid));
      localLikes--;
    } else {
      list.unshift(vid);
      setList(LIKES_KEY, list);
      localLikes++;
    }
    renderLikeBtn();
  });

  // Save/Watchlist button
  const saveBtn = document.getElementById('save-btn');
  function renderSaveBtn() {
    const saved = getList(WL_KEY).includes(vid);
    if (saveBtn) {
      saveBtn.className = 'vd-action-btn' + (saved ? ' saved' : '');
      saveBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="${saved ? 'currentColor' : 'none'}" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
        ${saved ? 'Saved' : 'Save'}`;
    }
  }
  renderSaveBtn();

  saveBtn?.addEventListener('click', () => {
    if (!currUser.id) { window.location.href = '/login'; return; }
    const list = getList(WL_KEY);
    if (list.includes(vid)) {
      setList(WL_KEY, list.filter(id => id !== vid));
      window.showFlash('success', 'Removed from watchlist.');
    } else {
      list.unshift(vid);
      setList(WL_KEY, list.slice(0, 100));
      window.showFlash('success', 'Saved to watchlist!');
    }
    renderSaveBtn();
  });

  // Share button
  document.getElementById('share-btn')?.addEventListener('click', () => {
    navigator.clipboard?.writeText(window.location.href)
      .then(() => window.showFlash('success', 'Link copied to clipboard!'))
      .catch(() => {});
  });

  // Comment CTA — hide if logged in
  if (currUser.id) {
    const ctaEl = document.getElementById('comment-cta');
    if (ctaEl) ctaEl.innerHTML = `<p style="color:#8a91a8;font-size:13px;">Comments coming soon — likes and saves sync to your dashboard now.</p>`;
  }

  // ── Owner/Admin controls ──────────────────────────────────────
  if (isOwner || isAdmin) {
    const ownerBar = document.getElementById('owner-actions');
    if (ownerBar) ownerBar.classList.remove('hidden');
    const editLink = document.getElementById('edit-link');
    if (editLink) editLink.href = `/video/${vid}/edit`;
    document.getElementById('delete-btn')?.addEventListener('click', async () => {
      if (!confirm('Delete this video permanently?')) return;
      const { res, data } = await window.postJson(`/api/videos/${vid}/delete`);
      if (res.ok && data.ok) {
        window.showFlash('success', 'Video deleted.');
        setTimeout(() => window.location.href = '/dashboard', 1000);
      } else {
        window.showFlash('error', (data.errors || ['Delete failed.'])[0]);
      }
    });
  }

  // ── Founder Card ──────────────────────────────────────────────
  const founderName = v.entrepreneur || (owner && owner.fullName) || v.submittedBy || 'Unknown';
  const founderCompany = v.category || '';
  const initials = founderName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const COLORS = ['#6366f1','#a855f7','#10b981','#f59e0b','#f43f5e','#06b6d4'];
  const avatarColor = COLORS[founderName.charCodeAt(0) % COLORS.length];

  const avatarEl = document.getElementById('founder-avatar');
  if (avatarEl) {
    avatarEl.style.background = `linear-gradient(135deg,${avatarColor},${avatarColor}aa)`;
    if (owner && owner.profileImageUrl) {
      avatarEl.innerHTML = `<img src="${esc(owner.profileImageUrl)}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none';this.parentElement.textContent='${esc(initials)}'"/>`;
    } else {
      avatarEl.textContent = initials;
    }
  }

  const fnEl = document.getElementById('founder-name');
  if (fnEl) fnEl.textContent = founderName;

  const fcEl = document.getElementById('founder-company');
  if (fcEl) fcEl.textContent = founderCompany;

  // Bio — use owner bio if available, else fallback
  const bioEl = document.getElementById('founder-bio');
  if (bioEl) {
    bioEl.textContent = (owner && owner.bio) || `Entrepreneur and founder featured on EntreVid. Watch their video to learn more.`;
  }

  // Tags — stage + category
  const founderTagsEl = document.getElementById('founder-tags');
  if (founderTagsEl) {
    const tags = [];
    if (owner && owner.role === 'verified_entrepreneur') tags.push('✅ Verified');
    if (v.category) tags.push(v.category);
    if (v.featured) tags.push('⭐ Featured');
    founderTagsEl.innerHTML = tags.map(t => `<span class="vd-founder-tag">${esc(t)}</span>`).join('');
  }

  // Profile link
  const profileLink = document.getElementById('founder-profile-link');
  if (profileLink) profileLink.href = `/founder-profile.html?name=${encodeURIComponent(founderName)}`;

  // ── Reveal content ────────────────────────────────────────────
  contentEl?.classList.remove('hidden');

  // ── Related Videos ────────────────────────────────────────────
  const relLoadEl  = document.getElementById('related-loading');
  const relListEl  = document.getElementById('related-list');
  const relEmptyEl = document.getElementById('related-empty');

  try {
    const allData = await window.getJson('/api/videos');
    // API returns videos at top level; handle both shapes defensively
    const allVideos = allData.videos || (allData.data && allData.data.videos) || [];

    // Same category first, then any — exclude current
    const related = allVideos
      .filter(vr => (vr._id || vr.id) !== vid)
      .sort((a, b) => {
        const aMatch = a.category === v.category ? -1 : 0;
        const bMatch = b.category === v.category ? -1 : 0;
        return aMatch - bMatch;
      })
      .slice(0, 5);

    if (relLoadEl) relLoadEl.style.display = 'none';

    if (!related.length) {
      relEmptyEl?.classList.remove('hidden');
    } else {
      relListEl.innerHTML = related.map(rv => {
        const rvId = rv._id || rv.id;
        // youtubeId in the list is already a clean ID, youtubeUrl is the full URL
        const rvYtId = extractYtId(rv.youtubeId) || extractYtId(rv.youtubeUrl || '');
        const thumb = rvYtId ? `https://img.youtube.com/vi/${esc(rvYtId)}/mqdefault.jpg` : '';
        const rvViews = seededRand((rvId||'x') + 'v', 800, 48000);
        const rvLikes = Math.floor(rvViews * (0.04 + seededRand((rvId||'x') + 'l', 0, 8) / 100));
        const dur = `${Math.floor(seededRand((rvId||'x') + 'd', 3, 22))}:${String(seededRand((rvId||'x') + 's', 0, 59)).padStart(2,'0')}`;
        return `
          <a class="vd-related-card" href="/video-details.html?id=${esc(rvId)}">
            <div class="vd-related-thumb">
              ${thumb ? `<img src="${thumb}" alt="${esc(rv.title)}" loading="lazy" onerror="this.src='';this.parentElement.style.background='#1c2030'"/>` : '<div style="width:100%;height:100%;background:#1c2030;display:flex;align-items:center;justify-content:center;font-size:24px;">🎬</div>'}
              <span class="vd-related-duration">${dur}</span>
            </div>
            <div class="vd-related-info">
              <p class="vd-related-cat">${esc(rv.category || '')}</p>
              <p class="vd-related-title">${esc(rv.title)}</p>
              <p class="vd-related-author">${esc(rv.entrepreneur || rv.submittedBy || 'Anonymous')}</p>
              <div class="vd-related-stats">
                <span>👁 ${rvViews >= 1000 ? (rvViews/1000).toFixed(1)+'K' : rvViews}</span>
                <span>♥ ${rvLikes >= 1000 ? (rvLikes/1000).toFixed(1)+'K' : rvLikes}</span>
              </div>
            </div>
          </a>`;
      }).join('');
    }
  } catch(e) {
    if (relLoadEl) relLoadEl.style.display = 'none';
    relEmptyEl?.classList.remove('hidden');
  }
})();
