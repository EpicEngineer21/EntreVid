/**
 * EntreVid — Home Page JS
 * Powers: hero scroll-reveal, stats counters, featured grid,
 *         category chips, video grid, spotlight, newsletter.
 */

// ── Helpers ───────────────────────────────────────────────────
function cardHtml(v) {
  const ytId = window.extractYouTubeId(v.youtubeUrl || v.youtubeId || v.id);
  const thumb = ytId ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg` : '';
  const cat = window.escapeHtml(v.category || 'Uncategorized');
  const title = window.escapeHtml(v.title || 'Untitled');
  const founder = window.escapeHtml(v.entrepreneur || v.founderName || '');
  const videoId = window.escapeHtml(v._id || v.id || '');

  return `
    <a href="/video-details.html?id=${videoId}" class="video-card" style="display:block;text-decoration:none;background:#141826;border:1px solid #262b3d;border-radius:16px;overflow:hidden;transition:transform 0.25s ease,box-shadow 0.25s ease,border-color 0.25s ease;"
      onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 16px 48px rgba(0,0,0,0.4)';this.style.borderColor='rgba(99,102,241,0.3)'"
      onmouseout="this.style.transform='';this.style.boxShadow='';this.style.borderColor='#262b3d'">
      <div style="position:relative;aspect-ratio:16/9;overflow:hidden;background:#0b0d17;">
        ${thumb ? `<img src="${thumb}" alt="${title}" style="width:100%;height:100%;object-fit:cover;transition:transform 0.4s ease;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform=''" loading="lazy"/>` : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;"><svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' fill='none' viewBox='0 0 24 24' stroke='#262b3d' stroke-width='1'><polygon points='5 3 19 12 5 21 5 3'/></svg></div>`}
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.25s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0'">
          <div style="width:48px;height:48px;background:rgba(99,102,241,0.9);border-radius:50%;display:flex;align-items:center;justify-content:center;transform:scale(0.8);transition:transform 0.2s;" onmouseover="this.style.transform='scale(1)'" onmouseout="this.style.transform='scale(0.8)'">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#fff" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>
        </div>
        ${v.featured ? `<div style="position:absolute;top:10px;right:10px;padding:3px 8px;background:rgba(245,158,11,0.9);border-radius:6px;font-size:11px;font-weight:600;color:#fff;">⭐ Featured</div>` : ''}
      </div>
      <div style="padding:18px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
          <span style="padding:3px 10px;background:rgba(99,102,241,0.12);border:1px solid rgba(99,102,241,0.2);border-radius:6px;font-size:12px;font-weight:500;color:#818cf8;">${cat}</span>
        </div>
        <h3 style="font-family:'Sora',sans-serif;font-size:15px;font-weight:600;color:#e6e8ef;margin-bottom:8px;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${title}</h3>
        ${founder ? `<p style="font-size:13px;color:#8a91a8;font-weight:500;">by ${founder}</p>` : ''}
      </div>
    </a>`;
}

// ── Counter animation ──────────────────────────────────────────
function animateCount(el, target, suffix = '') {
  let start = 0;
  const duration = 1200;
  const step = (timestamp) => {
    if (!start) start = timestamp;
    const progress = Math.min((timestamp - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(eased * target) + suffix;
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ── Category icon map ─────────────────────────────────────────
const CAT_ICONS = {
  'Tech': '💻', 'Finance': '💰', 'Health': '🏥', 'Food': '🍕',
  'E-commerce': '🛒', 'Interviews': '🎙️', 'Other': '📦'
};
const CAT_COLORS = {
  'Tech': '#6366f1', 'Finance': '#10b981', 'Health': '#f43f5e',
  'Food': '#f59e0b', 'E-commerce': '#8b5cf6', 'Interviews': '#06b6d4', 'Other': '#6b7280'
};

// ── Main ──────────────────────────────────────────────────────
(async function init() {
  await window.initAppContext();
  window.renderNav(window.App.currentUser, 'home');
  window.renderFooter();
  window.initScrollReveal();

  // Newsletter button
  const nlBtn = document.getElementById('newsletter-btn');
  if (nlBtn) {
    nlBtn.addEventListener('click', () => {
      const email = document.getElementById('newsletter-email')?.value?.trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        window.showFlash('error', 'Please enter a valid email address.');
        return;
      }
      window.showFlash('success', 'You\'re subscribed! Welcome to the community 🎉');
      document.getElementById('newsletter-email').value = '';
    });
  }

  // Load videos
  const loadingEl = document.getElementById('loading-state');
  const gridEl = document.getElementById('video-grid');
  const emptyEl = document.getElementById('empty-state');
  const countEl = document.getElementById('results-count');
  const pagination = document.getElementById('pagination-controls');

  let allVideos = [], categories = [], featuredVideos = [];
  let currentPage = 1;
  let pageSize = 9;
  let searchQ = '', categoryQ = 'All', sortQ = 'newest';

  try {
    const data = await window.getJson('/api/videos');
    allVideos = data.videos || [];
    categories = data.categories || [];
    featuredVideos = data.featuredVideos || [];

    // Stats
    const uniqueFounders = new Set(allVideos.map(v => v.entrepreneur).filter(Boolean)).size;
    const statVid = document.getElementById('stat-videos');
    const statFou = document.getElementById('stat-founders');
    const statCat = document.getElementById('stat-categories');
    if (statVid) animateCount(statVid, allVideos.length, '+');
    if (statFou) animateCount(statFou, uniqueFounders, '+');
    if (statCat) animateCount(statCat, categories.length, '+');

    // Category filter dropdown
    const sel = document.getElementById('category-filter');
    if (sel && categories.length) {
      categories.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c; opt.textContent = c;
        sel.appendChild(opt);
      });
    }

    // Category chips
    const chipsEl = document.getElementById('category-chips');
    const catSection = document.getElementById('categories-section');
    if (chipsEl && categories.length) {
      catSection?.classList.remove('hidden');
      chipsEl.innerHTML = categories.map(c => {
        const icon = CAT_ICONS[c] || '📁';
        const color = CAT_COLORS[c] || '#6366f1';
        const count = allVideos.filter(v => v.category === c).length;
        return `<a href="/browse?category=${encodeURIComponent(c)}" style="display:inline-flex;align-items:center;gap:8px;padding:10px 18px;background:#141826;border:1px solid #262b3d;border-radius:999px;text-decoration:none;font-size:14px;font-weight:500;color:#e6e8ef;transition:all 0.25s;cursor:pointer;" onmouseover="this.style.borderColor='${color}';this.style.color='${color}';this.style.background='rgba(99,102,241,0.08)'" onmouseout="this.style.borderColor='#262b3d';this.style.color='#e6e8ef';this.style.background='#141826'">
          <span>${icon}</span><span>${c}</span><span style="font-size:12px;color:#8a91a8;background:rgba(255,255,255,0.06);padding:2px 8px;border-radius:999px;">${count}</span>
        </a>`;
      }).join('');
    }

    // Featured grid
    const featSection = document.getElementById('featured-section');
    const featGrid = document.getElementById('featured-grid');
    if (featuredVideos.length && featGrid) {
      featSection?.classList.remove('hidden');
      featGrid.innerHTML = featuredVideos.slice(0, 2).map(cardHtml).join('');
    }

    // Spotlight
    if (featuredVideos.length) {
      const spot = featuredVideos[0];
      const ytId = window.extractYouTubeId(spot.youtubeUrl || spot.youtubeId || spot.id);
      const spotEl = document.getElementById('spotlight-card');
      const spotSection = document.getElementById('spotlight-section');
      if (spotEl && ytId) {
        spotSection?.classList.remove('hidden');
        spotEl.innerHTML = `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;align-items:center;" class="spotlight-inner">
            <div style="border-radius:16px;overflow:hidden;aspect-ratio:16/9;">
              <img src="https://img.youtube.com/vi/${ytId}/maxresdefault.jpg" alt="${window.escapeHtml(spot.title)}" style="width:100%;height:100%;object-fit:cover;" loading="lazy"/>
            </div>
            <div>
              <div style="display:inline-flex;align-items:center;gap:6px;padding:4px 12px;background:rgba(168,85,247,0.12);border:1px solid rgba(168,85,247,0.25);border-radius:999px;font-size:12px;font-weight:600;color:#c084fc;margin-bottom:16px;">
                ⚡ Pitch of the Week
              </div>
              <h3 style="font-family:'Sora',sans-serif;font-size:1.5rem;font-weight:700;color:#fff;margin-bottom:12px;line-height:1.3;">${window.escapeHtml(spot.title)}</h3>
              <p style="color:#8a91a8;font-size:15px;margin-bottom:8px;">by <strong style="color:#e6e8ef;">${window.escapeHtml(spot.entrepreneur || '')}</strong></p>
              <p style="color:#8a91a8;font-size:14px;margin-bottom:24px;line-height:1.6;">${window.escapeHtml((spot.description || '').slice(0, 140))}…</p>
              <a href="/video-details.html?id=${window.escapeHtml(spot._id || spot.id || '')}" style="display:inline-flex;align-items:center;gap:8px;padding:12px 24px;background:linear-gradient(135deg,#6366f1,#a855f7);border-radius:10px;color:#fff;font-weight:600;font-size:14px;text-decoration:none;">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                Watch Now
              </a>
            </div>
          </div>`;
      }
    }

    // Render grid
    renderGrid();
  } catch (err) {
    console.error('Home load error:', err);
    if (loadingEl) loadingEl.style.display = 'none';
    window.showFlash('error', 'Failed to load videos. Please refresh.');
  }

  // ── Grid render ───────────────────────────────────────────
  function getFiltered() {
    let list = [...allVideos];
    if (categoryQ !== 'All') list = list.filter(v => v.category === categoryQ);
    if (searchQ) {
      const q = searchQ.toLowerCase();
      list = list.filter(v => (v.title || '').toLowerCase().includes(q) || (v.entrepreneur || '').toLowerCase().includes(q));
    }
    if (sortQ === 'oldest') list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    else if (sortQ === 'az') list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    else list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return list;
  }

  function renderGrid() {
    if (loadingEl) loadingEl.style.display = 'none';
    const filtered = getFiltered();
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    currentPage = Math.min(currentPage, totalPages);
    const slice = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    if (countEl) countEl.textContent = filtered.length;
    if (gridEl) gridEl.innerHTML = slice.length ? slice.map(cardHtml).join('') : '';
    if (emptyEl) emptyEl.classList.toggle('hidden', slice.length > 0);
    if (pagination) {
      pagination.classList.toggle('hidden', totalPages <= 1);
      const ind = document.getElementById('page-indicator');
      if (ind) ind.textContent = `Page ${currentPage} of ${totalPages}`;
      const prev = document.getElementById('page-prev-btn');
      const next = document.getElementById('page-next-btn');
      if (prev) prev.disabled = currentPage === 1;
      if (next) next.disabled = currentPage === totalPages;
    }
    window.initScrollReveal();
  }

  // ── Filters ────────────────────────────────────────────────
  let debounceTimer;
  document.getElementById('search-input')?.addEventListener('input', e => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => { searchQ = e.target.value.trim(); currentPage = 1; renderGrid(); }, 300);
  });
  document.getElementById('category-filter')?.addEventListener('change', e => { categoryQ = e.target.value; currentPage = 1; renderGrid(); });
  document.getElementById('sort-filter')?.addEventListener('change', e => { sortQ = e.target.value; renderGrid(); });
  document.getElementById('page-size-filter')?.addEventListener('change', e => { pageSize = +e.target.value; currentPage = 1; renderGrid(); });
  document.getElementById('reset-filters-btn')?.addEventListener('click', () => {
    searchQ = ''; categoryQ = 'All'; sortQ = 'newest'; currentPage = 1;
    const si = document.getElementById('search-input'); if (si) si.value = '';
    const cf = document.getElementById('category-filter'); if (cf) cf.value = 'All';
    renderGrid();
  });
  document.getElementById('page-prev-btn')?.addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderGrid(); window.scrollTo({ top: document.getElementById('directory')?.offsetTop - 80, behavior: 'smooth' }); } });
  document.getElementById('page-next-btn')?.addEventListener('click', () => { currentPage++; renderGrid(); window.scrollTo({ top: document.getElementById('directory')?.offsetTop - 80, behavior: 'smooth' }); });
})();
