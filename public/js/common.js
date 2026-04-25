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
  // Remove any existing flash
  const existing = document.getElementById('flash-container');
  if (existing) existing.remove();

  const isSuccess = type === 'success';
  const bgClass = isSuccess ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-red-500/10 border-red-500/20 text-red-300';
  const iconColor = isSuccess ? 'text-emerald-400' : 'text-red-400';
  const iconPath = isSuccess
    ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'
    : '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>';
  const dismissColor = isSuccess ? 'text-emerald-400/60 hover:text-emerald-300' : 'text-red-400/60 hover:text-red-300';

  const container = document.createElement('div');
  container.id = 'flash-container';
  container.className = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4';
  container.innerHTML = `
    <div class="flash-msg ${bgClass} border px-5 py-3.5 rounded-xl flex items-center justify-between backdrop-blur-sm">
      <div class="flex items-center gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 ${iconColor} flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">${iconPath}</svg>
        <span class="text-sm font-medium">${escapeHtml(message)}</span>
      </div>
      <button class="${dismissColor} transition-colors" onclick="this.closest('#flash-container').remove()">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  `;

  // Insert after nav
  const nav = document.getElementById('main-nav');
  if (nav) {
    nav.after(container);
  } else {
    document.body.prepend(container);
  }

  // Auto-dismiss after 5s
  setTimeout(() => {
    if (container.parentElement) {
      container.style.opacity = '0';
      container.style.transform = 'translateY(-10px)';
      container.style.transition = 'all 0.3s ease';
      setTimeout(() => container.remove(), 300);
    }
  }, 5000);
};

// ── Show error list (inside a container element) ─────────────
window.showErrors = function showErrors(containerId, errors) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!errors || errors.length === 0) {
    container.classList.add('hidden');
    container.innerHTML = '';
    return;
  }
  container.classList.remove('hidden');
  container.innerHTML = `
    <div class="flex items-start gap-3">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <ul class="text-sm text-red-400/90 space-y-1">
        ${(Array.isArray(errors) ? errors : [errors]).map(e => `<li>${escapeHtml(e)}</li>`).join('')}
      </ul>
    </div>
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

  nav.innerHTML = `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <!-- Logo -->
        <a href="/" id="nav-logo" class="flex items-center gap-2.5 group flex-shrink-0">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-accent-600 flex items-center justify-center shadow-lg shadow-brand-500/25 group-hover:shadow-brand-500/50 transition-all duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>
          <span class="font-display font-bold text-lg tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">EntreVid</span>
        </a>

        <!-- Desktop Nav -->
        <div class="hidden lg:flex items-center gap-0.5">
          ${desktopCoreLinks}
        </div>

        <!-- Desktop Right -->
        <div class="hidden lg:flex items-center gap-1">
          ${extraDesktop}
          ${authSection}
        </div>

        <!-- Mobile menu button -->
        <button id="mobile-menu-btn" class="lg:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors" aria-label="Open menu">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" id="menu-icon-open" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
      </div>
    </div>

    <!-- Mobile Sheet Overlay -->
    <div id="mobile-overlay" class="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 hidden" style="animation: overlayIn 0.25s ease"></div>
    <!-- Mobile Sheet -->
    <div id="mobile-sheet" class="lg:hidden fixed top-0 right-0 h-full w-72 bg-surface-900 border-l border-white/8 z-50 hidden flex-col p-6 overflow-y-auto" style="animation: slideInSheet 0.3s cubic-bezier(0.16,1,0.3,1)">
      <div class="flex items-center justify-between mb-6">
        <a href="/" class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-600 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>
          <span class="font-display font-bold text-white">EntreVid</span>
        </a>
        <button id="mobile-sheet-close" class="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="space-y-1">
        ${mobileCoreLinks}
        ${extraMobile}
      </div>
      ${mobileAuthSection}
    </div>
  `;

  // Sheet toggle
  const mobileBtn = document.getElementById('mobile-menu-btn');
  const sheet = document.getElementById('mobile-sheet');
  const overlay = document.getElementById('mobile-overlay');
  const closeBtn = document.getElementById('mobile-sheet-close');
  const openSheet = () => { sheet.classList.remove('hidden'); sheet.style.display = 'flex'; overlay.classList.remove('hidden'); document.body.style.overflow = 'hidden'; };
  const closeSheet = () => { sheet.classList.add('hidden'); sheet.style.display = ''; overlay.classList.add('hidden'); document.body.style.overflow = ''; };
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

// ── Footer (4-column) ────────────────────────────────────────
window.renderFooter = function renderFooter() {
  const footer = document.getElementById('app-footer');
  if (!footer) return;
  const year = new Date().getFullYear();
  footer.innerHTML = `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
        <!-- Brand -->
        <div class="col-span-2 lg:col-span-1">
          <div class="flex items-center gap-2.5 mb-4">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-accent-600 flex items-center justify-center shadow-lg shadow-brand-500/25">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </div>
            <span class="font-display font-bold text-lg text-white">EntreVid</span>
          </div>
          <p class="text-sm text-gray-500 leading-relaxed mb-5">The premier video directory for entrepreneurial stories, strategies, and startup journeys.</p>
          <div class="flex items-center gap-3">
            <a href="https://twitter.com" target="_blank" rel="noopener" class="w-9 h-9 rounded-lg bg-surface-800 border border-white/8 flex items-center justify-center text-gray-500 hover:text-white hover:border-brand-500/50 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noopener" class="w-9 h-9 rounded-lg bg-surface-800 border border-white/8 flex items-center justify-center text-gray-500 hover:text-white hover:border-brand-500/50 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            </a>
            <a href="https://youtube.com" target="_blank" rel="noopener" class="w-9 h-9 rounded-lg bg-surface-800 border border-white/8 flex items-center justify-center text-gray-500 hover:text-white hover:border-brand-500/50 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
            </a>
          </div>
        </div>

        <!-- Product -->
        <div>
          <h3 class="text-sm font-semibold text-white mb-4 tracking-wide uppercase">Product</h3>
          <ul class="space-y-3">
            <li><a href="/browse" class="text-sm text-gray-500 hover:text-gray-300 transition-colors">Browse Videos</a></li>
            <li><a href="/submit" class="text-sm text-gray-500 hover:text-gray-300 transition-colors">Submit a Story</a></li>
            <li><a href="/founders" class="text-sm text-gray-500 hover:text-gray-300 transition-colors">Founders</a></li>
            <li><a href="/apply" class="text-sm text-gray-500 hover:text-gray-300 transition-colors">Apply as Founder</a></li>
          </ul>
        </div>

        <!-- Company -->
        <div>
          <h3 class="text-sm font-semibold text-white mb-4 tracking-wide uppercase">Company</h3>
          <ul class="space-y-3">
            <li><a href="/about" class="text-sm text-gray-500 hover:text-gray-300 transition-colors">About</a></li>
            <li><a href="/contact" class="text-sm text-gray-500 hover:text-gray-300 transition-colors">Contact</a></li>
            <li><a href="/dashboard" class="text-sm text-gray-500 hover:text-gray-300 transition-colors">Dashboard</a></li>
          </ul>
        </div>

        <!-- Legal -->
        <div>
          <h3 class="text-sm font-semibold text-white mb-4 tracking-wide uppercase">Legal</h3>
          <ul class="space-y-3">
            <li><span class="text-sm text-gray-600">Terms of Service</span></li>
            <li><span class="text-sm text-gray-600">Privacy Policy</span></li>
            <li><span class="text-sm text-gray-600">Cookie Policy</span></li>
          </ul>
        </div>
      </div>

      <div class="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p class="text-xs text-gray-600">&copy; ${year} EntreVid. All rights reserved.</p>
        <p class="text-xs text-gray-600">Built with <span class="text-brand-400">♥</span> using Node.js &amp; Express</p>
      </div>
    </div>
  `;
};

// ── Loading button state ─────────────────────────────────────
window.setButtonLoading = function setButtonLoading(btn, loading, originalHtml) {
  if (loading) {
    btn.disabled = true;
    btn.dataset.originalHtml = btn.innerHTML;
    btn.innerHTML = `<svg class="animate-spin w-4 h-4 inline mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>Processing...`;
  } else {
    btn.disabled = false;
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
