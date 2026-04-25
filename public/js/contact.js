/**
 * contact.js — Contact form with validation
 */
(async function() {
  await window.initAppContext();
  window.renderNav(window.App.currentUser, 'contact');
  window.renderFooter();
  window.initScrollReveal();

  const form = document.getElementById('contact-form');
  const submitBtn = document.getElementById('contact-submit');
  const errEl = document.getElementById('contact-error');
  const successEl = document.getElementById('contact-success');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (errEl) errEl.classList.add('hidden');

    const name = document.getElementById('contact-name')?.value.trim();
    const email = document.getElementById('contact-email')?.value.trim();
    const topic = document.getElementById('contact-topic')?.value;
    const message = document.getElementById('contact-message')?.value.trim();

    const errors = [];
    if (!name) errors.push('Full name is required.');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('A valid email is required.');
    if (!topic) errors.push('Please select a topic.');
    if (!message || message.length < 10) errors.push('Message must be at least 10 characters.');

    if (errors.length) {
      if (errEl) { errEl.textContent = errors[0]; errEl.classList.remove('hidden'); }
      return;
    }

    window.setButtonLoading(submitBtn, true);
    try {
      const { res, data } = await window.postJson('/api/contact', { name, email, topic, message });
      if (res.ok && data.ok) {
        form.style.display = 'none';
        successEl?.classList.remove('hidden');
      } else {
        const msg = (data.errors && data.errors[0]) || 'Failed to send. Please try again.';
        if (errEl) { errEl.textContent = msg; errEl.classList.remove('hidden'); }
        window.setButtonLoading(submitBtn, false);
      }
    } catch {
      if (errEl) { errEl.textContent = 'An error occurred. Please try again.'; errEl.classList.remove('hidden'); }
      window.setButtonLoading(submitBtn, false);
    }
  });
})();
