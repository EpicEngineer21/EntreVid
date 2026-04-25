/**
 * EntreVid — Shared Frontend Utilities
 * Provides: CSRF, auth context, role-aware nav, footer, flash messages, fetch helpers.
 */

// ── Global app state ─────────────────────────────────────────
window.App = {
  csrfToken: null,
  currentUser: null,
};

// ── XSS-safe HTML escaping ───────────────────────────────────
window.escapeHtml = function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
};

// ── YouTube Extractor ─────────────────────────────────────────
window.extractYouTubeId = function extractYouTubeId(urlOrId) {
  if (!urlOrId) return null;
  if (/^[\w-]{11}$/.test(urlOrId)) return urlOrId;
  const patterns = [
    /youtube\.com\/watch\?v=([\w-]{11})/, 
    /youtu\.be\/([\w-]{11})/, 
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/
  ];
  for (const p of patterns) { 
    const m = urlOrId.match(p); 
    if (m) return m[1]; 
  }
  return null;
};

// ── Fetch helpers ────────────────────────────────────────────
window.getJson = async function getJson(url) {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { __httpError: true, status: res.status, ...(data || {}) };
  }
  return res.json();
};

window.postJson = async function postJson(url, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (window.App.csrfToken) headers['x-csrf-token'] = window.App.csrfToken;
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify(body || {}),
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
};

window.putJson = async function putJson(url, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (window.App.csrfToken) headers['x-csrf-token'] = window.App.csrfToken;
  const res = await fetch(url, {
    method: 'PUT',
    credentials: 'include',
    headers,
    body: JSON.stringify(body || {}),
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
};

window.deleteJson = async function deleteJson(url) {
  const headers = {};
  if (window.App.csrfToken) headers['x-csrf-token'] = window.App.csrfToken;
  const res = await fetch(url, {
    method: 'DELETE',
    credentials: 'include',
    headers,
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
};

// ── Init app context (CSRF + current user) ───────────────────
window.initAppContext = async function initAppContext() {
  try {
    const csrf = await window.getJson('/api/csrf');
    window.App.csrfToken = csrf.csrfToken;
    const me = await window.getJson('/api/me');
    window.App.currentUser = me.user || null;
  } catch (e) {
    console.warn('Failed to init app context:', e.message);
  }
};

// ── Flash messages ───────────────────────────────────────────
window.showFlash = function showFlash(type, message) {
  const existing = document.getElementById('flash-container');
  if (existing) existing.remove();

  const isSuccess = type === 'success';
  const bg   = isSuccess ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.12)';
  const border = isSuccess ? 'rgba(16,185,129,0.3)'  : 'rgba(244,63,94,0.3)';
  const color  = isSuccess ? '#34d399' : '#fb7185';
  const iconPath = isSuccess
    ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'
    : '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>';

  const container = document.createElement('div');
  container.id = 'flash-container';
  container.style.cssText = `position:fixed;top:76px;left:50%;transform:translateX(-50%);z-index:9999;max-width:480px;width:calc(100% - 48px);animation:flashIn 0.3s ease;`;
  container.innerHTML = `
    <style>@keyframes flashIn{from{opacity:0;transform:translateX(-50%) translateY(-12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}</style>
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 18px;background:${bg};border:1px solid ${border};border-radius:12px;backdrop-filter:blur(12px);box-shadow:0 8px 32px rgba(0,0,0,0.3);">
      <div style="display:flex;align-items:center;gap:10px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="${color}" stroke-width="2" style="flex-shrink:0;">${iconPath}</svg>
        <span style="font-size:14px;font-weight:500;color:${color};font-family:'Inter',sans-serif;">${window.escapeHtml(message)}</span>
      </div>
      <button onclick="document.getElementById('flash-container').remove()" style="background:none;border:none;cursor:pointer;color:${color};opacity:0.7;padding:2px;flex-shrink:0;">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>`;

  document.body.appendChild(container);

  setTimeout(() => {
    if (container.parentElement) {
      container.style.opacity = '0';
      container.style.transition = 'opacity 0.3s ease';
      setTimeout(() => container.remove(), 300);
    }
  }, 4500);
};

// ── Show error list (inline, no Tailwind) ───────────────────────
window.showErrors = function showErrors(containerId, errors) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!errors || errors.length === 0) {
    container.style.display = 'none';
    container.innerHTML = '';
    return;
  }
  container.style.display = 'block';
  const list = Array.isArray(errors) ? errors : [errors];
  container.innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:10px;">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#fb7185" stroke-width="2" style="flex-shrink:0;margin-top:2px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <ul style="font-size:13px;color:#fb7185;list-style:none;padding:0;margin:0;">
        ${list.map(e => `<li>${window.escapeHtml(e)}</li>`).join('')}
      </ul>
  `;
};

window.renderStateMessage = function renderStateMessage(containerId, options) {
  const container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
  if (!container) return;
  const type = options?.type || 'info';
  const title = options?.title || '';
  const message = options?.message || '';
  const actionText = options?.actionText || '';
  const actionId = options?.actionId || '';
  const colorClass = type === 'error'
    ? 'text-red-400 border-red-500/20 bg-red-500/5'
    : 'text-gray-400 border-surface-700 bg-surface-900/30';
  container.classList.remove('hidden');
  container.innerHTML = `
    <div class="p-6 rounded-2xl border ${colorClass} text-center">
      <h3 class="font-display text-lg text-white mb-2">${escapeHtml(title)}</h3>
      <p class="text-sm mb-4">${escapeHtml(message)}</p>
      ${actionText ? `<button id="${escapeHtml(actionId)}" class="px-4 py-2 rounded-lg bg-surface-800 hover:bg-surface-700 text-white text-sm border border-surface-700 transition-colors">${escapeHtml(actionText)}</button>` : ''}
    </div>
  `;
};

window.setSectionLoading = function setSectionLoading(loadingId, contentId, isLoading) {
  const loadingEl = document.getElementById(loadingId);
  const contentEl = document.getElementById(contentId);
  if (loadingEl) loadingEl.classList.toggle('hidden', !isLoading);
  if (contentEl) contentEl.classList.toggle('hidden', isLoading);
};

window.confirmAction = async function confirmAction(options) {
  const title = options?.title || 'Are you sure?';
  const message = options?.message || 'Please confirm this action.';
  return window.confirm(`${title}\n\n${message}`);
};

// ── Role-aware Navigation ────────────────────────────────────
window.renderNav = function renderNav(user, activePage) {
  const nav = document.getElementById('main-nav');
  if (!nav) return;

  const esc = escapeHtml;
  const active = (page) => activePage === page
    ? 'text-white bg-white/10'
    : 'text-gray-400 hover:text-white hover:bg-white/5';

  // ── Core public links ──
  const coreLinks = [
    { href: '/',          id: 'nav-home',     page: 'home',     label: 'Home' },
    { href: '/browse',    id: 'nav-browse',   page: 'browse',   label: 'Browse' },
    { href: '/founders',  id: 'nav-founders', page: 'founders', label: 'Founders' },
    { href: '/about',     id: 'nav-about',    page: 'about',    label: 'About' },
    { href: '/contact',   id: 'nav-contact',  page: 'contact',  label: 'Contact' },
  ];

  const desktopCoreLinks = coreLinks.map(l =>
    `<a href="${l.href}" id="${l.id}" class="nav-link px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${active(l.page)}">${l.label}</a>`
  ).join('');

  const mobileCoreLinks = coreLinks.map(l =>
    `<a href="${l.href}" class="block px-4 py-2.5 rounded-lg text-sm font-medium ${active(l.page)} transition-colors">${l.label}</a>`
  ).join('');

  let extraDesktop = '';
  let extraMobile = '';
  let authSection = '';
  let mobileAuthSection = '';

  if (user) {
    const role = user.role || 'user';
    if (role === 'verified_entrepreneur' || role === 'admin') {
      extraDesktop += `<a href="/submit" id="nav-submit" class="nav-link px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${active('submit')}">Upload</a>
        <a href="/dashboard" id="nav-dashboard" class="nav-link px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${active('dashboard')}">Dashboard</a>`;
      extraMobile += `<a href="/submit" class="block px-4 py-2.5 rounded-lg text-sm font-medium ${active('submit')} transition-colors">Upload Video</a>
        <a href="/dashboard" class="block px-4 py-2.5 rounded-lg text-sm font-medium ${active('dashboard')} transition-colors">Dashboard</a>`;
    } else {
      extraDesktop += `<a href="/apply" id="nav-apply" class="nav-link px-3 py-2 rounded-lg text-sm font-medium text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-all duration-200">Apply</a>`;
      extraMobile += `<a href="/apply" class="block px-4 py-2.5 rounded-lg text-sm font-medium text-amber-400 hover:bg-amber-500/10 transition-colors">Apply to Upload</a>`;
    }
    if (role === 'admin') {
      extraDesktop += `<a href="/admin/applications" id="nav-admin" class="nav-link px-3 py-2 rounded-lg text-sm font-medium text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 transition-all duration-200">Admin</a>`;
      extraMobile += `<a href="/admin/applications" class="block px-4 py-2.5 rounded-lg text-sm font-medium text-purple-400 hover:bg-purple-500/10 transition-colors">Admin Panel</a>`;
    }

    let roleBadge = '';
    if (role === 'verified_entrepreneur') roleBadge = `<span class="inline-flex px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-semibold border border-emerald-500/20">✓</span>`;
    if (role === 'admin') roleBadge = `<span class="inline-flex px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400 text-[10px] font-semibold border border-purple-500/20">👑</span>`;

    const initial = esc(user.fullName.charAt(0).toUpperCase());
    const firstName = esc(user.fullName.split(' ')[0]);
    const avatar = user.profileImageUrl
      ? `<img src="${esc(user.profileImageUrl)}" alt="Profile" class="w-8 h-8 rounded-full object-cover ring-2 ring-surface-800" onerror="this.style.display='none'" />`
      : `<div class="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-accent-500 flex items-center justify-center text-white text-xs font-bold ring-2 ring-surface-800">${initial}</div>`;

    authSection = `
      <div class="w-px h-6 bg-white/10 mx-1"></div>
      <a href="/profile" class="flex items-center gap-2 px-2 py-1 rounded-lg transition-all duration-200 hover:bg-white/5">
        ${avatar}
        <div class="flex items-center gap-1.5">
          <span class="text-sm font-medium text-gray-300 max-w-[90px] truncate">${firstName}</span>
          ${roleBadge}
        </div>
      </a>
      <button id="nav-logout-btn" class="ml-1 px-3 py-2 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200">Logout</button>`;

    mobileAuthSection = `
      <div class="border-t border-white/5 my-2 pt-2">
        <a href="/profile" class="px-4 py-2.5 flex items-center gap-3 rounded-lg hover:bg-white/5 transition-colors">
          ${avatar}
          <div>
            <div class="text-sm font-medium text-white">${esc(user.fullName)} ${roleBadge}</div>
            <div class="text-xs text-gray-500">${esc(user.email)}</div>
          </div>
        </a>
        <button id="nav-logout-btn-mobile" class="w-full text-left block px-4 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors">Logout</button>
      </div>`;
  } else {
    authSection = `
      <div class="w-px h-6 bg-white/10 mx-1"></div>
      <a href="/login" id="nav-login" class="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${active('login')}">Log In</a>
      <a href="/signup" id="nav-signup" class="ml-1 px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-500 hover:to-accent-500 text-white transition-all shadow-md shadow-brand-500/20 hover:-translate-y-0.5 btn-glow">Sign Up</a>`;
    mobileAuthSection = `
      <div class="border-t border-white/5 my-2 pt-2">
        <a href="/login" class="block px-4 py-2.5 rounded-lg text-sm font-medium ${active('login')} transition-colors">Log In</a>
        <a href="/signup" class="block px-4 py-2.5 rounded-lg text-sm font-medium text-brand-400 hover:bg-brand-500/10 transition-colors">Sign Up</a>
      </div>`;
  }

  // Inject nav-specific responsive CSS once
  if (!document.getElementById('ev-nav-style')) {
    const s = document.createElement('style');
    s.id = 'ev-nav-style';
    s.textContent = `
      #nav-desktop-links,#nav-desktop-right{display:none;}
      #nav-mobile-btn{display:flex;}
      @media(min-width:1024px){
        #nav-desktop-links{display:flex;align-items:center;gap:2px;}
        #nav-desktop-right{display:flex;align-items:center;gap:4px;}
        #nav-mobile-btn{display:none;}
      }
      .ev-nav-link{display:flex;align-items:center;padding:8px 12px;border-radius:8px;font-size:14px;font-weight:500;text-decoration:none;transition:background 0.2s,color 0.2s;color:#9ca3af;}
      .ev-nav-link:hover{background:rgba(255,255,255,0.05);color:#fff;}
      .ev-nav-link.active{background:rgba(255,255,255,0.1);color:#fff;}
      .ev-mobile-link{display:block;padding:10px 16px;border-radius:8px;font-size:14px;font-weight:500;text-decoration:none;color:#9ca3af;transition:background 0.2s,color 0.2s;}
      .ev-mobile-link:hover{background:rgba(255,255,255,0.05);color:#fff;}
      .ev-mobile-link.active{background:rgba(255,255,255,0.1);color:#fff;}
    `;
    document.head.appendChild(s);
  }

  const mkActive = (page) => activePage === page ? ' active' : '';
  const dLinks = coreLinks.map(l => `<a href="${l.href}" id="${l.id}" class="ev-nav-link${mkActive(l.page)}">${l.label}</a>`).join('');
  const mLinks = coreLinks.map(l => `<a href="${l.href}" class="ev-mobile-link${mkActive(l.page)}">${l.label}</a>`).join('');

  nav.innerHTML = `
    <div style="max-width:1280px;margin:0 auto;padding:0 24px;">
      <div style="display:flex;align-items:center;justify-content:space-between;height:64px;">
        <!-- Logo -->
        <a href="/" id="nav-logo" style="display:flex;align-items:center;gap:10px;text-decoration:none;flex-shrink:0;">
          <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#6366f1,#a855f7);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(99,102,241,0.3);">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#fff" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>
          <span style="font-family:'Sora',sans-serif;font-weight:700;font-size:1.1rem;background:linear-gradient(135deg,#fff,#9ca3af);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">EntreVid</span>
        </a>

        <!-- Desktop centre links -->
        <div id="nav-desktop-links">${dLinks}</div>

        <!-- Desktop right -->
        <div id="nav-desktop-right">${extraDesktop}${authSection}</div>

        <!-- Hamburger -->
        <button id="nav-mobile-btn" aria-label="Open menu" style="padding:8px;border-radius:8px;background:none;border:none;cursor:pointer;color:#9ca3af;">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
      </div>
    </div>

    <!-- Overlay -->
    <div id="mobile-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);z-index:40;"></div>
    <!-- Sheet -->
    <div id="mobile-sheet" style="display:none;flex-direction:column;position:fixed;top:0;right:0;height:100%;width:288px;background:#141826;border-left:1px solid rgba(255,255,255,0.08);z-index:50;padding:24px;overflow-y:auto;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;">
        <a href="/" style="display:flex;align-items:center;gap:8px;text-decoration:none;">
          <div style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#6366f1,#a855f7);display:flex;align-items:center;justify-content:center;">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#fff" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>
          <span style="font-family:'Sora',sans-serif;font-weight:700;color:#fff;">EntreVid</span>
        </a>
        <button id="mobile-sheet-close" style="padding:8px;border-radius:8px;background:none;border:none;cursor:pointer;color:#9ca3af;">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;">
        ${mLinks}
        ${extraMobile}
      </div>
      ${mobileAuthSection}
    </div>
  `;

  // Sheet toggle
  const mobileBtn = document.getElementById('nav-mobile-btn');
  const sheet = document.getElementById('mobile-sheet');
  const overlay = document.getElementById('mobile-overlay');
  const closeBtn = document.getElementById('mobile-sheet-close');
  const openSheet = () => { sheet.style.display = 'flex'; overlay.style.display = 'block'; document.body.style.overflow = 'hidden'; };
  const closeSheet = () => { sheet.style.display = ''; overlay.style.display = ''; document.body.style.overflow = ''; };
  if (mobileBtn) mobileBtn.addEventListener('click', openSheet);
  if (closeBtn) closeBtn.addEventListener('click', closeSheet);
  if (overlay) overlay.addEventListener('click', closeSheet);

  // Logout
  ['nav-logout-btn', 'nav-logout-btn-mobile'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', async () => {
      await window.postJson('/api/auth/logout', {});
      window.location.href = '/';
    });
  });
};

// ── Footer (4-column, inline CSS) ──────────────────────────
window.renderFooter = function renderFooter() {
  const footer = document.getElementById('app-footer');
  if (!footer) return;
  const year = new Date().getFullYear();
  if (!document.getElementById('ev-footer-style')) {
    const s = document.createElement('style');
    s.id = 'ev-footer-style';
    s.textContent = `
      .ev-footer-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:40px;margin-bottom:48px;}
      @media(min-width:768px){.ev-footer-grid{grid-template-columns:2fr 1fr 1fr 1fr;}}
      .ev-footer-col-brand{grid-column:span 2;}
      @media(min-width:768px){.ev-footer-col-brand{grid-column:span 1;}}
      .ev-footer-link{display:block;font-size:13px;color:#6b7280;text-decoration:none;margin-bottom:10px;transition:color 0.2s;}
      .ev-footer-link:hover{color:#d1d5db;}
      .ev-footer-social{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:8px;background:#1c2030;border:1px solid rgba(255,255,255,0.06);color:#6b7280;text-decoration:none;transition:color 0.2s,border-color 0.2s;margin-right:8px;}
      .ev-footer-social:hover{color:#fff;border-color:rgba(99,102,241,0.4);}
    `;
    document.head.appendChild(s);
  }

  footer.innerHTML = `
    <div style="max-width:1200px;margin:0 auto;padding:56px 24px 32px;">
      <div class="ev-footer-grid">
        <!-- Brand -->
        <div class="ev-footer-col-brand">
          <a href="/" style="display:inline-flex;align-items:center;gap:10px;text-decoration:none;margin-bottom:16px;">
            <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#6366f1,#a855f7);display:flex;align-items:center;justify-content:center;">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#fff" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </div>
            <span style="font-family:'Sora',sans-serif;font-weight:700;font-size:1.1rem;color:#fff;">EntreVid</span>
          </a>
          <p style="font-size:13px;color:#6b7280;line-height:1.7;margin-bottom:20px;max-width:240px;">The premier video directory for entrepreneurial stories, strategies, and startup journeys.</p>
          <div style="display:flex;gap:0;">
            <a href="https://twitter.com" target="_blank" rel="noopener" class="ev-footer-social">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noopener" class="ev-footer-social">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            </a>
            <a href="https://youtube.com" target="_blank" rel="noopener" class="ev-footer-social">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
            </a>
          </div>
        </div>

        <!-- Product -->
        <div>
          <p style="font-size:11px;font-weight:700;color:#e6e8ef;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:16px;">Product</p>
          <a href="/browse" class="ev-footer-link">Browse Videos</a>
          <a href="/submit" class="ev-footer-link">Submit a Story</a>
          <a href="/founders" class="ev-footer-link">Founders</a>
          <a href="/apply" class="ev-footer-link">Apply as Founder</a>
        </div>

        <!-- Company -->
        <div>
          <p style="font-size:11px;font-weight:700;color:#e6e8ef;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:16px;">Company</p>
          <a href="/about" class="ev-footer-link">About</a>
          <a href="/contact" class="ev-footer-link">Contact</a>
          <a href="/dashboard" class="ev-footer-link">Dashboard</a>
        </div>

        <!-- Legal -->
        <div>
          <p style="font-size:11px;font-weight:700;color:#e6e8ef;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:16px;">Legal</p>
          <span class="ev-footer-link" style="cursor:default;">Terms of Service</span>
          <span class="ev-footer-link" style="cursor:default;">Privacy Policy</span>
          <span class="ev-footer-link" style="cursor:default;">Cookie Policy</span>
        </div>
      </div>

      <div style="border-top:1px solid rgba(255,255,255,0.06);padding-top:24px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;">
        <p style="font-size:12px;color:#4b5563;">© ${year} EntreVid. All rights reserved.</p>
        <p style="font-size:12px;color:#4b5563;">Built with <span style="color:#818cf8;">♥</span> using Node.js &amp; Express</p>
      </div>
    </div>
  `;
};

// ── Loading button state ─────────────────────────────────────
window.setButtonLoading = function setButtonLoading(btn, loading, originalHtml) {
  if (loading) {
    btn.disabled = true;
    btn.dataset.originalHtml = btn.innerHTML;
    btn.style.opacity = '0.7';
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:middle;margin-right:6px;animation:spin 0.8s linear infinite;"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>Processing…`;
  } else {
    btn.disabled = false;
    btn.style.opacity = '';
    btn.innerHTML = originalHtml || btn.dataset.originalHtml || 'Submit';
  }
};

// ── Scroll reveal init ────────────────────────────────────────
window.initScrollReveal = function initScrollReveal() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.fade-up').forEach(el => obs.observe(el));
};
