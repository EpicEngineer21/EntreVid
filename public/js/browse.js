/**
 * browse.js — Browse page logic
 */
function cardHtml(v) {
  const ytId = window.extractYouTubeId(v.youtubeUrl || v.youtubeId || v.id);
  const thumb = ytId ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg` : '';
  const cat = window.escapeHtml(v.category || 'Uncategorized');
  const title = window.escapeHtml(v.title || 'Untitled');
  const founder = window.escapeHtml(v.entrepreneur || v.founderName || '');
  const videoId = window.escapeHtml(v.id || v._id || '');
  return `
    <a href="/video-details.html?id=${videoId}" style="display:block;text-decoration:none;background:#141826;border:1px solid #262b3d;border-radius:16px;overflow:hidden;transition:transform 0.25s,box-shadow 0.25s,border-color 0.25s;"
      onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 16px 40px rgba(0,0,0,0.4)';this.style.borderColor='rgba(99,102,241,0.3)'"
      onmouseout="this.style.transform='';this.style.boxShadow='';this.style.borderColor='#262b3d'">
      <div style="position:relative;aspect-ratio:16/9;background:#0b0d17;overflow:hidden;">
        ${thumb ? `<img src="${thumb}" alt="${title}" style="width:100%;height:100%;object-fit:cover;" loading="lazy"/>` : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;"><svg xmlns='http://www.w3.org/2000/svg' width='36' height='36' fill='none' viewBox='0 0 24 24' stroke='#262b3d' stroke-width='1'><polygon points='5 3 19 12 5 21 5 3'/></svg></div>`}
        ${v.featured ? `<div style="position:absolute;top:8px;right:8px;padding:3px 8px;background:rgba(245,158,11,0.9);border-radius:6px;font-size:11px;font-weight:600;color:#fff;">⭐</div>` : ''}
      </div>
      <div style="padding:16px;">
        <span style="display:inline-block;padding:3px 10px;background:rgba(99,102,241,0.12);border:1px solid rgba(99,102,241,0.2);border-radius:6px;font-size:12px;font-weight:500;color:#818cf8;margin-bottom:10px;">${cat}</span>
        <h3 style="font-family:'Sora',sans-serif;font-size:14px;font-weight:600;color:#e6e8ef;margin-bottom:6px;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${title}</h3>
        ${founder ? `<p style="font-size:13px;color:#8a91a8;">by ${founder}</p>` : ''}
      </div>
    </a>`;
}

(async function() {
  await window.initAppContext();
  window.renderNav(window.App.currentUser, 'browse');
  window.renderFooter();
  window.initScrollReveal();

  // Read URL params
  const params = new URLSearchParams(location.search);
  let searchQ = params.get('search') || '';
  let categoryQ = params.get('category') || 'All';
  let sortQ = 'newest';
  let pageSize = 9;
  let currentPage = 1;
  let allVideos = [];

  const si = document.getElementById('search-input');
  const cf = document.getElementById('category-filter');
  if (si) si.value = searchQ;

  const loadingEl = document.getElementById('loading-state');
  const gridEl = document.getElementById('video-grid');
  const emptyEl = document.getElementById('empty-state');
  const countEl = document.getElementById('results-count');
  const pagination = document.getElementById('pagination-controls');
  const chipsEl = document.getElementById('filter-chips');

  try {
    const data = await window.getJson('/api/videos');
    allVideos = data.videos || [];
    const cats = data.categories || [];

    if (cf) cats.forEach(c => {
      const o = document.createElement('option');
      o.value = c; o.textContent = c;
      if (c === categoryQ) o.selected = true;
      cf.appendChild(o);
    });
    if (cf && categoryQ !== 'All') cf.value = categoryQ;
    renderGrid();
  } catch(e) {
    if (loadingEl) loadingEl.style.display = 'none';
    window.showFlash('error', 'Failed to load videos.');
  }

  function getFiltered() {
    let list = [...allVideos];
    if (categoryQ !== 'All') list = list.filter(v => v.category === categoryQ);
    if (searchQ) {
      const q = searchQ.toLowerCase();
      list = list.filter(v => (v.title||'').toLowerCase().includes(q)||(v.entrepreneur||'').toLowerCase().includes(q));
    }
    if (sortQ === 'oldest') list.sort((a,b) => new Date(a.createdAt)-new Date(b.createdAt));
    else if (sortQ === 'az') list.sort((a,b) => (a.title||'').localeCompare(b.title||''));
    else if (sortQ === 'featured') list.sort((a,b) => (b.featured?1:0)-(a.featured?1:0));
    else list.sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt));
    return list;
  }

  function updateChips() {
    if (!chipsEl) return;
    const chips = [];
    if (searchQ) chips.push(`<span style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;background:rgba(99,102,241,0.12);border:1px solid rgba(99,102,241,0.25);border-radius:999px;font-size:12px;font-weight:500;color:#818cf8;">Search: ${window.escapeHtml(searchQ)}<button onclick="document.getElementById('search-input').value='';searchQ='';currentPage=1;renderGrid();updateChips();" style="background:none;border:none;cursor:pointer;color:#818cf8;font-size:14px;line-height:1;padding:0;">×</button></span>`);
    if (categoryQ !== 'All') chips.push(`<span style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;background:rgba(99,102,241,0.12);border:1px solid rgba(99,102,241,0.25);border-radius:999px;font-size:12px;font-weight:500;color:#818cf8;">${window.escapeHtml(categoryQ)}<button onclick="document.getElementById('category-filter').value='All';categoryQ='All';currentPage=1;renderGrid();updateChips();" style="background:none;border:none;cursor:pointer;color:#818cf8;font-size:14px;line-height:1;padding:0;">×</button></span>`);
    chipsEl.innerHTML = chips.join('');
  }

  function renderGrid() {
    if (loadingEl) loadingEl.style.display = 'none';
    const filtered = getFiltered();
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    currentPage = Math.min(currentPage, totalPages);
    const slice = filtered.slice((currentPage-1)*pageSize, currentPage*pageSize);
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
    updateChips();
    const textEl = document.getElementById('active-filters-text');
    if (textEl) textEl.textContent = (searchQ||categoryQ!=='All') ? 'Filters active' : '';
  }

  let debounce;
  si?.addEventListener('input', e => { clearTimeout(debounce); debounce = setTimeout(() => { searchQ = e.target.value.trim(); currentPage=1; renderGrid(); }, 300); });
  cf?.addEventListener('change', e => { categoryQ = e.target.value; currentPage=1; renderGrid(); });
  document.getElementById('sort-filter')?.addEventListener('change', e => { sortQ=e.target.value; renderGrid(); });
  document.getElementById('page-size-filter')?.addEventListener('change', e => { pageSize=+e.target.value; currentPage=1; renderGrid(); });
  document.getElementById('reset-btn')?.addEventListener('click', () => { searchQ=''; categoryQ='All'; sortQ='newest'; currentPage=1; if(si) si.value=''; if(cf) cf.value='All'; renderGrid(); });
  document.getElementById('reset-filters-btn')?.addEventListener('click', () => { searchQ=''; categoryQ='All'; currentPage=1; if(si) si.value=''; if(cf) cf.value='All'; renderGrid(); });
  document.getElementById('page-prev-btn')?.addEventListener('click', () => { if(currentPage>1){currentPage--;renderGrid();scrollTo({top:0,behavior:'smooth'});} });
  document.getElementById('page-next-btn')?.addEventListener('click', () => { currentPage++;renderGrid();scrollTo({top:0,behavior:'smooth'}); });
})();
