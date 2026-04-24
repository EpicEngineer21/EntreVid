/**
 * EntreVid — Home Page
 * Loads videos from /api/videos, renders featured + grid cards, search/filter.
 */

const esc = window.escapeHtml;

// ── Video card (grid) ────────────────────────────────────────
function videoCard(video, ownerMap) {
  const owner = video.ownerUserId ? ownerMap[video.ownerUserId] : null;
  const verifiedBadge = owner && owner.role === 'verified_entrepreneur'
    ? `<span class="inline-flex items-center px-1 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" title="Verified Entrepreneur">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-2.5 h-2.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
       </span>`
    : '';

  const tagsHtml = (video.tags || []).slice(0, 2).map(t =>
    `<span class="text-[10px] px-1.5 py-0.5 rounded bg-surface-700/50 text-gray-400 whitespace-nowrap">${esc(t)}</span>`
  ).join('') + ((video.tags || []).length > 2 ? '<span class="text-[10px] px-1.5 py-0.5 rounded bg-surface-700/50 text-gray-400">...</span>' : '');

  const ytId = window.extractYouTubeId(video.youtubeId) || window.extractYouTubeId(video.youtubeUrl) || '';
  const entrepreneurName = video.entrepreneur || video.submittedBy || 'Anonymous';
  return `
    <div class="video-card group bg-surface-800/50 rounded-2xl overflow-hidden border border-surface-700/50 hover:border-brand-500/30 hover:bg-surface-800 transition-all duration-300 hover:shadow-xl hover:shadow-brand-500/10 hover:-translate-y-1 flex flex-col">
      <a href="/video/${esc(video.id)}" class="relative block aspect-video w-full overflow-hidden bg-surface-900">
        <img src="https://img.youtube.com/vi/${esc(ytId)}/mqdefault.jpg" alt="Thumbnail" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100" loading="lazy" />
        <div class="absolute top-3 left-3 px-2 py-0.5 rounded bg-surface-950/80 backdrop-blur-md text-xs font-medium text-white border border-white/10 shadow-sm">
          ${esc(video.category)}
        </div>
        <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-surface-950/20">
          <div class="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center pl-1 scale-90 group-hover:scale-100 transition-transform duration-300 shadow-[0_0_20px_rgba(255,255,255,0.2)]">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>
      </a>
      <div class="p-5 flex flex-col flex-grow">
        <h3 class="font-display text-lg font-bold text-white mb-2 leading-snug line-clamp-2">
          <a href="/video/${esc(video.id)}" class="hover:text-brand-400 transition-colors focus:outline-none">${esc(video.title)}</a>
        </h3>
        <p class="text-sm text-gray-400 line-clamp-2 mb-4 flex-grow">${esc(video.description)}</p>
        <div class="flex items-center justify-between mt-auto pt-4 border-t border-surface-700/50">
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 rounded-full bg-surface-700 flex items-center justify-center text-white font-medium text-[10px] ring-1 ring-surface-600">
              ${esc(entrepreneurName.charAt(0).toUpperCase())}
            </div>
            <span class="text-xs font-medium text-gray-300 truncate max-w-[100px]">${esc(entrepreneurName)}</span>
            ${verifiedBadge}
          </div>
          <div class="flex gap-1.5 overflow-hidden">${tagsHtml}</div>
        </div>
      </div>
    </div>
  `;
}

// ── Featured card ────────────────────────────────────────────
function featuredCard(video) {
  const dateStr = new Date(video.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const fYtId = window.extractYouTubeId(video.youtubeId) || window.extractYouTubeId(video.youtubeUrl) || '';
  const fEntrepreneur = video.entrepreneur || video.submittedBy || 'Anonymous';
  return `
    <a href="/video/${esc(video.id)}" class="group relative bg-surface-800 rounded-2xl overflow-hidden border border-surface-700 hover:border-brand-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-brand-500/20 hover:-translate-y-1 block h-full flex flex-col md:flex-row">
      <div class="relative w-full md:w-2/5 aspect-video md:aspect-auto">
        <img src="https://img.youtube.com/vi/${esc(fYtId)}/mqdefault.jpg" alt="${esc(video.title)}" class="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div class="absolute inset-0 bg-gradient-to-t from-surface-900/80 to-transparent md:bg-gradient-to-r"></div>
        <div class="absolute bottom-3 left-3 md:bottom-auto md:top-3 px-2.5 py-1 rounded bg-surface-900/80 backdrop-blur text-xs font-semibold text-white border border-white/10 shadow-sm">Featured</div>
        <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div class="w-12 h-12 rounded-full bg-brand-500/90 text-white flex items-center justify-center pl-1 backdrop-blur-sm shadow-lg scale-90 group-hover:scale-100 transition-transform duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>
      </div>
      <div class="p-6 w-full md:w-3/5 flex flex-col justify-center relative z-10 bg-surface-800/90 md:bg-transparent backdrop-blur-sm md:backdrop-blur-none -mt-6 md:mt-0 rounded-t-2xl md:rounded-t-none">
        <div class="flex items-center gap-2 mb-3">
          <span class="text-xs font-medium px-2 py-0.5 rounded bg-surface-700 text-brand-300 border border-surface-600">${esc(video.category)}</span>
          <span class="text-xs text-gray-400 flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            ${esc(dateStr)}
          </span>
        </div>
        <h3 class="font-display text-xl sm:text-2xl font-bold text-white mb-2 line-clamp-2 leading-tight group-hover:text-brand-400 transition-colors">${esc(video.title)}</h3>
        <p class="text-gray-400 text-sm mb-4 line-clamp-2 leading-relaxed">${esc(video.description)}</p>
        <div class="flex items-center gap-2.5 mt-auto">
          <div class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs ring-2 ring-surface-800 shrink-0">
            ${esc(fEntrepreneur.charAt(0).toUpperCase())}
          </div>
          <span class="text-sm font-medium text-gray-300 line-clamp-1">${esc(fEntrepreneur)}</span>
        </div>
      </div>
    </a>
  `;
}

// ── Load and render videos ───────────────────────────────────
let allVideosCache = [];
let ownerMapCache = {};
let currentPage = 1;

function sortVideos(videos, sortBy) {
  const list = [...videos];
  if (sortBy === 'oldest') {
    list.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  } else if (sortBy === 'az') {
    list.sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')));
  } else {
    list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }
  return list;
}

function renderVideoGrid(videos) {
  const videoGrid = document.getElementById('video-grid');
  const emptyState = document.getElementById('empty-state');
  const resultsCount = document.getElementById('results-count');
  const sortFilter = document.getElementById('sort-filter');
  const pageSizeFilter = document.getElementById('page-size-filter');
  const pageSize = Number(pageSizeFilter.value || 9);
  const paginationControls = document.getElementById('pagination-controls');
  const pageIndicator = document.getElementById('page-indicator');
  const prevBtn = document.getElementById('page-prev-btn');
  const nextBtn = document.getElementById('page-next-btn');

  const sorted = sortVideos(videos, sortFilter.value);
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  if (currentPage > totalPages) currentPage = totalPages;

  const startIdx = (currentPage - 1) * pageSize;
  const currentPageRows = sorted.slice(startIdx, startIdx + pageSize);

  resultsCount.textContent = videos.length;
  if (videos.length === 0) {
    videoGrid.innerHTML = '';
    emptyState.classList.remove('hidden');
    paginationControls.classList.add('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  videoGrid.innerHTML = currentPageRows.map(v => videoCard(v, ownerMapCache)).join('');

  paginationControls.classList.toggle('hidden', totalPages <= 1);
  pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages;
  prevBtn.classList.toggle('opacity-50', prevBtn.disabled);
  nextBtn.classList.toggle('opacity-50', nextBtn.disabled);
}

async function loadVideos() {
  const searchInput = document.getElementById('search-input');
  const categoryFilter = document.getElementById('category-filter');
  const search = searchInput.value.trim();
  const category = categoryFilter.value;

  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (category && category !== 'All') params.set('category', category);

  const data = await window.getJson(`/api/videos?${params.toString()}`);
  if (data.__httpError) {
    document.getElementById('loading-state').classList.add('hidden');
    window.renderStateMessage('empty-state', {
      type: 'error',
      title: 'Unable to load videos',
      message: 'Please refresh the page and try again.',
      actionText: 'Retry',
      actionId: 'retry-load-videos',
    });
    const retryBtn = document.getElementById('retry-load-videos');
    if (retryBtn) retryBtn.addEventListener('click', () => loadVideos());
    return;
  }

  allVideosCache = data.videos;
  ownerMapCache = data.ownerMap || {};

  // Populate category dropdown (once)
  const existing = Array.from(categoryFilter.options).map(o => o.value);
  (data.categories || []).forEach(cat => {
    if (!existing.includes(cat)) {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      categoryFilter.appendChild(opt);
    }
  });

  // Hide loading state
  document.getElementById('loading-state').classList.add('hidden');

  // Featured section
  const featuredSection = document.getElementById('featured-section');
  const featuredGrid = document.getElementById('featured-grid');
  const featured = data.featuredVideos || [];
  if (featured.length > 0) {
    featuredSection.classList.remove('hidden');
    featuredGrid.innerHTML = featured.slice(0, 2).map(v => featuredCard(v)).join('');
  } else {
    featuredSection.classList.add('hidden');
  }

  renderVideoGrid(data.videos || []);
}

// ── Init ─────────────────────────────────────────────────────
(async function initHome() {
  await window.initAppContext();
  window.renderNav(window.App.currentUser, 'home');
  window.renderFooter();

  await loadVideos();

  // Search + filter events
  let searchTimeout = null;
  document.getElementById('search-input').addEventListener('input', () => {
    clearTimeout(searchTimeout);
    currentPage = 1;
    searchTimeout = setTimeout(loadVideos, 200);
  });
  document.getElementById('category-filter').addEventListener('change', () => {
    currentPage = 1;
    loadVideos();
  });
  document.getElementById('sort-filter').addEventListener('change', () => {
    currentPage = 1;
    renderVideoGrid(allVideosCache);
  });
  document.getElementById('page-size-filter').addEventListener('change', () => {
    currentPage = 1;
    renderVideoGrid(allVideosCache);
  });
  document.getElementById('page-prev-btn').addEventListener('click', () => {
    if (currentPage > 1) currentPage -= 1;
    renderVideoGrid(allVideosCache);
  });
  document.getElementById('page-next-btn').addEventListener('click', () => {
    const pageSize = Number(document.getElementById('page-size-filter').value || 9);
    const totalPages = Math.max(1, Math.ceil(allVideosCache.length / pageSize));
    if (currentPage < totalPages) currentPage += 1;
    renderVideoGrid(allVideosCache);
  });

  // Reset filters button
  document.getElementById('reset-filters-btn').addEventListener('click', () => {
    document.getElementById('search-input').value = '';
    document.getElementById('category-filter').value = 'All';
    document.getElementById('sort-filter').value = 'newest';
    currentPage = 1;
    loadVideos();
  });
})();
