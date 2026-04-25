/**
 * founders.js — Founders directory page
 */
(async function() {
  await window.initAppContext();
  window.renderNav(window.App.currentUser, 'founders');
  window.renderFooter();
  window.initScrollReveal();

  const loadEl = document.getElementById('loading-state');
  const gridEl = document.getElementById('founders-grid');
  const emptyEl = document.getElementById('empty-state');
  const searchEl = document.getElementById('founder-search');

  let founders = [];

  try {
    const data = await window.getJson('/api/videos');
    const videos = data.videos || [];

    // Aggregate founders from video data
    const founderMap = {};
    videos.forEach(v => {
      const name = (v.entrepreneur || '').trim();
      if (!name) return;
      if (!founderMap[name]) {
        founderMap[name] = { name, videos: [], categories: new Set() };
      }
      founderMap[name].videos.push(v);
      if (v.category) founderMap[name].categories.add(v.category);
    });
    founders = Object.values(founderMap).sort((a,b) => b.videos.length - a.videos.length);

    if (loadEl) loadEl.style.display = 'none';
    renderGrid(founders);
  } catch(e) {
    if (loadEl) loadEl.style.display = 'none';
    window.showFlash('error', 'Failed to load founders.');
  }

  function getInitials(name) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2);
  }

  const COLORS = ['#6366f1','#a855f7','#10b981','#f59e0b','#f43f5e','#06b6d4','#8b5cf6'];

  function founderCard(f, i) {
    const color = COLORS[i % COLORS.length];
    const cats = [...f.categories].slice(0,3);
    const slug = encodeURIComponent(f.name);
    return `
      <a href="/founder-profile.html?name=${slug}" style="display:block;text-decoration:none;background:#141826;border:1px solid #262b3d;border-radius:16px;padding:28px;text-align:center;transition:transform 0.25s,box-shadow 0.25s,border-color 0.25s;"
        onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 16px 40px rgba(0,0,0,0.4)';this.style.borderColor='${color}50'"
        onmouseout="this.style.transform='';this.style.boxShadow='';this.style.borderColor='#262b3d'">
        <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,${color},${color}aa);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-family:'Sora',sans-serif;font-size:20px;font-weight:700;color:#fff;">
          ${window.escapeHtml(getInitials(f.name))}
        </div>
        <h3 style="font-family:'Sora',sans-serif;font-size:15px;font-weight:700;color:#e6e8ef;margin-bottom:6px;">${window.escapeHtml(f.name)}</h3>
        <p style="font-size:13px;color:#8a91a8;margin-bottom:14px;">${f.videos.length} video${f.videos.length!==1?'s':''}</p>
        <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;">
          ${cats.map(c=>`<span style="padding:3px 10px;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.2);border-radius:999px;font-size:11px;font-weight:500;color:#818cf8;">${window.escapeHtml(c)}</span>`).join('')}
        </div>
      </a>`;
  }

  function renderGrid(list) {
    if (!gridEl) return;
    if (!list.length) {
      gridEl.innerHTML = '';
      emptyEl?.classList.remove('hidden');
    } else {
      emptyEl?.classList.add('hidden');
      gridEl.innerHTML = list.map((f,i) => founderCard(f,i)).join('');
    }
  }

  let debounce;
  searchEl?.addEventListener('input', e => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      const q = e.target.value.trim().toLowerCase();
      renderGrid(q ? founders.filter(f => f.name.toLowerCase().includes(q)) : founders);
    }, 250);
  });
})();
