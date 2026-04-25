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
  const active = (page) => activePage === page ? 'text-white bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5';

  let desktopLinks = '';
  let mobileLinks = '';
  let authSection = '';
  let mobileAuthSection = '';

  if (user) {
    const role = user.role || 'user';

    if (role === 'verified_entrepreneur' || role === 'admin') {
      desktopLinks += `
        <a href="/submit" id="nav-submit" class="nav-link px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${active('submit')}">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 inline-block mr-1.5 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Upload Video
        </a>
        <a href="/dashboard" id="nav-dashboard" class="nav-link px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${active('dashboard')}">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 inline-block mr-1.5 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          Dashboard
        </a>`;
      mobileLinks += `
        <a href="/submit" class="block px-4 py-2.5 rounded-lg text-sm font-medium ${active('submit')} transition-colors">Upload Video</a>
        <a href="/dashboard" class="block px-4 py-2.5 rounded-lg text-sm font-medium ${active('dashboard')} transition-colors">Dashboard</a>`;
    } else {
      desktopLinks += `
        <a href="/apply" id="nav-apply" class="nav-link px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activePage === 'apply' ? 'text-white bg-white/10' : 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10'}">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 inline-block mr-1.5 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
          Apply to Upload
        </a>`;
      mobileLinks += `<a href="/apply" class="block px-4 py-2.5 rounded-lg text-sm font-medium text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors">Apply to Upload</a>`;
    }

    if (role === 'admin') {
      desktopLinks += `
        <a href="/admin/applications" id="nav-admin" class="nav-link px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activePage === 'admin-applications' ? 'text-white bg-white/10' : 'text-purple-400 hover:text-purple-300 hover:bg-purple-500/10'}">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 inline-block mr-1.5 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/></svg>
          Admin
        </a>`;
      mobileLinks += `<a href="/admin/applications" class="block px-4 py-2.5 rounded-lg text-sm font-medium text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 transition-colors">Admin Panel</a>`;
    }

    // Role badges
    let roleBadge = '';
    if (role === 'verified_entrepreneur') {
      roleBadge = `<span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-semibold border border-emerald-500/20" title="Verified Entrepreneur">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-2.5 h-2.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
        ✓
      </span>`;
    } else if (role === 'admin') {
      roleBadge = `<span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400 text-[10px] font-semibold border border-purple-500/20" title="Admin">👑</span>`;
    }

    const initial = esc(user.fullName.charAt(0).toUpperCase());
    const firstName = esc(user.fullName.split(' ')[0]);
    const avatar = user.profileImageUrl
      ? `<img src="${esc(user.profileImageUrl)}" alt="Profile" class="w-8 h-8 rounded-full object-cover ring-2 ring-surface-800" onerror="this.onerror=null;this.replaceWith(document.createElement('div'));" />`
      : `<div class="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold ring-2 ring-surface-800">${initial}</div>`;

    authSection = `
      <div class="w-px h-6 bg-white/10 mx-2"></div>
      <a href="/profile" class="flex items-center gap-2 pl-2 pr-2 py-1 rounded-lg transition-all duration-200 ${active('profile')}">
        ${avatar}
        <div class="flex items-center gap-1.5">
          <span class="text-sm font-medium text-gray-300 max-w-[100px] truncate">${firstName}</span>
          ${roleBadge}
        </div>
      </a>
      <button id="nav-logout-btn" class="nav-link ml-1 px-3 py-2 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 inline-block mr-1 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        Logout
      </button>`;

    let mobileRoleBadge = '';
    if (role === 'verified_entrepreneur') mobileRoleBadge = '<span class="text-emerald-400 text-xs">✓ Verified</span>';
    if (role === 'admin') mobileRoleBadge = '<span class="text-purple-400 text-xs">👑 Admin</span>';

    const mobileAvatar = user.profileImageUrl
      ? `<img src="${esc(user.profileImageUrl)}" alt="Profile" class="w-8 h-8 rounded-full object-cover" onerror="this.onerror=null;this.replaceWith(document.createElement('div'));" />`
      : `<div class="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">${initial}</div>`;

    mobileAuthSection = `
      <div class="border-t border-white/5 my-2"></div>
      <a href="/profile" class="px-4 py-2.5 flex items-center gap-3 rounded-lg transition-all duration-200 ${active('profile')}">
        ${mobileAvatar}
        <div>
          <div class="text-sm font-medium text-white flex items-center gap-1.5">${esc(user.fullName)} ${mobileRoleBadge}</div>
          <div class="text-xs text-gray-500">${esc(user.email)}</div>
        </div>
      </a>
      <button id="nav-logout-btn-mobile" class="w-full text-left block px-4 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors">Logout</button>`;
  } else {
    authSection = `
      <div class="w-px h-6 bg-white/10 mx-2"></div>
      <a href="/login" id="nav-login" class="nav-link px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${active('login')}">Log In</a>
      <a href="/signup" id="nav-signup" class="ml-1 px-4 py-2 rounded-xl text-sm font-semibold bg-brand-600 hover:bg-brand-500 text-white transition-all shadow-md shadow-brand-500/20 hover:shadow-brand-500/30 hover:-translate-y-0.5">Sign Up</a>`;

    mobileAuthSection = `
      <div class="border-t border-white/5 my-2"></div>
      <a href="/login" class="block px-4 py-2.5 rounded-lg text-sm font-medium ${active('login')} transition-colors">Log In</a>
      <a href="/signup" class="block px-4 py-2.5 rounded-lg text-sm font-medium text-brand-400 hover:text-brand-300 hover:bg-brand-500/10 transition-colors">Sign Up</a>`;
  }

  nav.innerHTML = `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <!-- Logo -->
        <a href="/" id="nav-logo" class="flex items-center gap-2.5 group">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:shadow-brand-500/40 transition-shadow">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>
          <span class="font-display font-bold text-lg tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">EntreVid</span>
        </a>

        <!-- Desktop Links -->
        <div class="hidden sm:flex items-center gap-1">
          <a href="/" id="nav-home" class="nav-link px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${active('home')}">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 inline-block mr-1.5 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            Home
          </a>
          ${desktopLinks}
          ${authSection}
        </div>

        <!-- Mobile menu button -->
        <button id="mobile-menu-btn" class="sm:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
      </div>

      <!-- Mobile menu -->
      <div id="mobile-menu" class="sm:hidden hidden pb-4 space-y-1">
        <a href="/" class="block px-4 py-2.5 rounded-lg text-sm font-medium ${active('home')} transition-colors">Home</a>
        ${mobileLinks}
        ${mobileAuthSection}
      </div>
    </div>
  `;

  // Mobile menu toggle
  const mobileBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  if (mobileBtn && mobileMenu) {
    mobileBtn.addEventListener('click', () => mobileMenu.classList.toggle('hidden'));
  }

  // Logout
  const bindLogout = (btnId) => {
    const btn = document.getElementById(btnId);
    if (btn) {
      btn.addEventListener('click', async () => {
        await window.postJson('/api/auth/logout', {});
        window.location.href = '/';
      });
    }
  };
  bindLogout('nav-logout-btn');
  bindLogout('nav-logout-btn-mobile');
};

// ── Footer ───────────────────────────────────────────────────
window.renderFooter = function renderFooter() {
  const footer = document.getElementById('app-footer');
  if (!footer) return;

  const year = new Date().getFullYear();
  footer.innerHTML = `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="flex items-center gap-2.5">
          <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>
          <span class="font-display font-semibold text-sm text-gray-400">EntreVid</span>
        </div>
        <p class="text-xs text-gray-500">
          &copy; ${year} Entrepreneur Video Directory. Built with
          <span class="text-red-400">♥</span> using Node.js &amp; Express.
        </p>
        <div class="flex items-center gap-4">
          <a href="/" class="text-xs text-gray-500 hover:text-gray-300 transition-colors">Home</a>
          <a href="/submit" class="text-xs text-gray-500 hover:text-gray-300 transition-colors">Submit</a>
        </div>
      </div>
    </div>
  `;
};

// ── Loading button state ─────────────────────────────────────
window.setButtonLoading = function setButtonLoading(btn, loading, originalHtml) {
  if (loading) {
    btn.disabled = true;
    btn.dataset.originalHtml = btn.innerHTML;
    btn.innerHTML = `
      <svg class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
      </svg>
      Processing...
    `;
  } else {
    btn.disabled = false;
    btn.innerHTML = originalHtml || btn.dataset.originalHtml || 'Submit';
  }
};
