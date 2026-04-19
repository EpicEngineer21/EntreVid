/**
 * EntreVid — Apply Page
 */
(async function initApply() {
  await window.initAppContext();
  if (!window.App.currentUser) {
    window.location.href = '/login';
    return;
  }
  
  window.renderNav(window.App.currentUser);
  window.renderFooter();

  const userRole = window.App.currentUser.role;
  const statusContainer = document.getElementById('status-container');
  const applyForm = document.getElementById('apply-form');

  if (userRole === 'verified_entrepreneur') {
    statusContainer.innerHTML = `
      <div class="bg-emerald-500/10 border border-emerald-500/20 p-8 rounded-3xl text-center backdrop-blur-xl">
        <div class="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
        </div>
        <h2 class="text-2xl font-bold text-white mb-2">You're already verified!</h2>
        <p class="text-emerald-200/70 mb-6">You have permission to submit and manage videos.</p>
        <a href="/dashboard" class="inline-block px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-all shadow-[0_0_15px_-3px_rgba(16,185,129,0.4)]">Go to Dashboard</a>
      </div>
    `;
    statusContainer.classList.remove('hidden');
    return;
  }

  // Fetch application status
  const { res, data } = await window.getJson('/api/applications/me');
  if (res.ok && data.ok) {
    const app = data.data.application;
    
    if (app && app.status === 'pending') {
      statusContainer.innerHTML = `
        <div class="bg-amber-500/10 border border-amber-500/20 p-8 rounded-3xl text-center backdrop-blur-xl">
          <div class="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4 border border-amber-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h2 class="text-2xl font-bold text-white mb-2">Application Under Review</h2>
          <p class="text-amber-200/70 pb-4 border-b border-amber-500/20 max-w-md mx-auto">Your application is currently being reviewed by our moderation team. You will be notified once a decision is made.</p>
          <div class="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-medium text-amber-400">
            <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            Pending Review
          </div>
        </div>
      `;
      statusContainer.classList.remove('hidden');
      return;
    }

    if (app && app.status === 'rejected') {
      const reasonHtml = app.rejectionReason 
        ? `<div class="mt-4 p-4 bg-red-500/10 rounded-xl border border-red-500/20"><p class="text-sm font-medium text-red-400 mb-1">Reason for rejection:</p><p class="text-sm text-red-200/80">"${window.escapeHtml(app.rejectionReason)}"</p></div>`
        : '';
        
      statusContainer.innerHTML = `
        <div class="bg-red-500/10 border border-red-500/20 p-8 rounded-3xl text-center backdrop-blur-xl mb-8">
          <div class="w-16 h-16 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-4 border border-red-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </div>
          <h2 class="text-2xl font-bold text-white mb-2">Application Rejected</h2>
          <p class="text-red-200/70">Unfortunately, your previous application was not approved.</p>
          ${reasonHtml}
          <p class="text-sm text-gray-400 mt-6">You may submit a new application below with updated information.</p>
        </div>
      `;
      statusContainer.classList.remove('hidden');
    }
  }

  // Show apply form if no pending/approved app
  applyForm.classList.remove('hidden');

  // Bio char count
  const bioInput = document.getElementById('bio');
  const bioCount = document.getElementById('bio-count');
  bioInput.addEventListener('input', () => {
    bioCount.textContent = bioInput.value.length;
  });

  // Submit
  const submitBtn = document.getElementById('submit-btn');
  applyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    document.getElementById('error-box').classList.add('hidden');
    
    const originalHtml = submitBtn.innerHTML;
    window.setButtonLoading(submitBtn, true);

    const payload = {
      startupName: document.getElementById('startupName').value,
      bio: document.getElementById('bio').value,
      linkedinUrl: document.getElementById('linkedinUrl').value,
      websiteUrl: document.getElementById('websiteUrl').value,
      notes: document.getElementById('notes').value
    };

    const { res, data } = await window.postJson('/api/applications', payload);

    if (!res.ok || !data.ok) {
      window.setButtonLoading(submitBtn, false, originalHtml);
      window.showErrors('error-box', data.errors || ['Application submission failed.']);
      return;
    }

    if (data.message) window.showFlash('success', data.message);
    setTimeout(() => { window.location.reload(); }, 1500);
  });
})();
