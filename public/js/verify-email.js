/**
 * EntreVid — Verify Email Page
 */
(async function initVerify() {
  await window.initAppContext();
  if (window.App.currentUser && window.App.currentUser.verified) {
    window.location.href = '/';
    return;
  }

  window.renderNav(window.App.currentUser, 'verify');
  window.renderFooter();

  const inputs = Array.from(document.querySelectorAll('#otp-inputs input'));
  
  // Auto-focus and auto-advance
  inputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
      const val = e.data;
      if (val && /^[0-9]$/.test(val)) {
        input.value = val;
        if (index < inputs.length - 1) inputs[index + 1].focus();
      } else {
        input.value = '';
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && index > 0) {
        inputs[index - 1].focus();
      }
    });

    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasteData = (e.clipboardData || window.clipboardData).getData('text');
      const digits = pasteData.replace(/[^0-9]/g, '').split('');
      inputs.forEach((inp, i) => {
        if (digits[i]) {
          inp.value = digits[i];
          if (i < inputs.length - 1) inputs[i + 1].focus();
        }
      });
    });
  });

  const form = document.getElementById('verify-form');
  const submitBtn = document.getElementById('submit-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    document.getElementById('error-box').classList.add('hidden');
    const otp = inputs.map(i => i.value).join('');
    
    if (otp.length !== 6) {
      window.showErrors('error-box', ['Please enter the full 6-digit code.']);
      return;
    }

    const originalHtml = submitBtn.innerHTML;
    window.setButtonLoading(submitBtn, true);

    const { res, data } = await window.postJson('/api/auth/verify-email', { otp });

    if (!res.ok || !data.ok) {
      window.setButtonLoading(submitBtn, false, originalHtml);
      window.showErrors('error-box', data.errors || ['Verification failed.']);
      return;
    }

    if (data.message) window.showFlash('success', data.message);
    setTimeout(() => { window.location.href = data.next || '/'; }, 1000);
  });

  // Resend OTP
  const resendBtn = document.getElementById('resend-btn');
  const cooldownText = document.getElementById('cooldown-text');
  let cooldownTimer = null;

  async function handleResend() {
    resendBtn.disabled = true;
    resendBtn.classList.add('opacity-50', 'cursor-not-allowed');

    const { res, data } = await window.postJson('/api/auth/resend-otp', {});
    
    if (res.ok && data.ok) {
      window.showFlash('success', data.message);
      startCooldown(60);
    } else {
      window.showErrors('error-box', data.errors);
      resendBtn.disabled = false;
      resendBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
  }

  function startCooldown(seconds) {
    if (cooldownTimer) clearInterval(cooldownTimer);
    let remaining = seconds;
    cooldownText.classList.remove('hidden');
    
    cooldownTimer = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(cooldownTimer);
        cooldownText.classList.add('hidden');
        resendBtn.disabled = false;
        resendBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      } else {
        cooldownText.textContent = `Wait ${remaining}s to resend`;
      }
    }, 1000);
  }

  resendBtn.addEventListener('click', handleResend);
})();
