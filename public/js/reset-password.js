/**
 * EntreVid — Reset Password Page
 */
(async function initReset() {
  await window.initAppContext();
  if (window.App.currentUser) {
    window.location.href = '/';
    return;
  }

  window.renderNav(window.App.currentUser, 'reset');
  window.renderFooter();

  // OTP Inputs logic (sharing same logic as verify-email)
  const inputs = Array.from(document.querySelectorAll('#otp-inputs input'));
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
      if (e.key === 'Backspace' && !input.value && index > 0) inputs[index - 1].focus();
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

  // Password visibility
  const togglePw = document.getElementById('toggle-pw');
  const pwInput = document.getElementById('newPassword');
  const eyeIcon = document.getElementById('eye-icon');
  
  togglePw.addEventListener('click', () => {
    const isText = pwInput.type === 'text';
    pwInput.type = isText ? 'password' : 'text';
    eyeIcon.innerHTML = isText 
      ? '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'
      : '<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"/>';
  });

  // Password strength
  const s1 = document.getElementById('strength-1');
  const s2 = document.getElementById('strength-2');
  const s3 = document.getElementById('strength-3');
  const s4 = document.getElementById('strength-4');
  const sText = document.getElementById('strength-text');

  pwInput.addEventListener('input', () => {
    const val = pwInput.value;
    let score = 0;
    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val) && /[a-z]/.test(val)) score++;
    if (/\d/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;

    [s1, s2, s3, s4].forEach(el => el.className = 'h-full w-1/4 bg-surface-700 transition-colors duration-300');
    
    if (val.length === 0) { sText.textContent = ''; return; }
    
    if (score <= 1) {
      s1.classList.replace('bg-surface-700', 'bg-red-500');
      sText.textContent = 'Weak: Add numbers & uppercase';
      sText.className = 'text-xs mt-1.5 h-4 text-red-400';
    } else if (score === 2) {
      s1.classList.replace('bg-surface-700', 'bg-amber-400');
      s2.classList.replace('bg-surface-700', 'bg-amber-400');
      sText.textContent = 'Fair: Add special characters';
      sText.className = 'text-xs mt-1.5 h-4 text-amber-400';
    } else if (score === 3) {
      s1.classList.replace('bg-surface-700', 'bg-emerald-400');
      s2.classList.replace('bg-surface-700', 'bg-emerald-400');
      s3.classList.replace('bg-surface-700', 'bg-emerald-400');
      sText.textContent = 'Good';
      sText.className = 'text-xs mt-1.5 h-4 text-emerald-400';
    } else {
      s1.classList.replace('bg-surface-700', 'bg-emerald-500');
      s2.classList.replace('bg-surface-700', 'bg-emerald-500');
      s3.classList.replace('bg-surface-700', 'bg-emerald-500');
      s4.classList.replace('bg-surface-700', 'bg-emerald-500');
      sText.textContent = 'Strong';
      sText.className = 'text-xs mt-1.5 h-4 text-emerald-500';
    }
  });

  // Submit
  const form = document.getElementById('reset-form');
  const submitBtn = document.getElementById('submit-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    document.getElementById('error-box').classList.add('hidden');
    
    const otp = inputs.map(i => i.value).join('');
    if (otp.length !== 6) {
      window.showErrors('error-box', ['Please enter the full 6-digit code.']);
      return;
    }

    const payload = {
      otp: otp,
      newPassword: pwInput.value,
      confirmPassword: document.getElementById('confirmPassword').value
    };

    const originalHtml = submitBtn.innerHTML;
    window.setButtonLoading(submitBtn, true);

    const { res, data } = await window.postJson('/api/auth/reset-password', payload);

    if (!res.ok || !data.ok) {
      window.setButtonLoading(submitBtn, false, originalHtml);
      window.showErrors('error-box', data.errors || ['Password reset failed.']);
      if (data.next) {
        setTimeout(() => window.location.href = data.next, 2000);
      }
      return;
    }

    window.showFlash('success', data.message);
    setTimeout(() => { window.location.href = data.next || '/login'; }, 1000);
  });
})();
