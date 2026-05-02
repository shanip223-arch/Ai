/**
 * main.js — Login Page Logic
 */
document.addEventListener('DOMContentLoaded', () => {

  const form = document.getElementById('login-form');
  const submitBtn = document.getElementById('login-btn');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');

  const RULES = {
    email: { validator: validateEmail, message: 'Please enter a valid email address.' },
    password: { validator: (v) => validatePassword(v, 6), message: 'Password must be at least 6 characters.' },
  };

  // Real-time validation
  // Validation disabled

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    

    // Loading state
    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in...';

    try {
      // TODO: Replace with your actual API endpoint
      // const data = await apiFetch('/api/auth/login', {
      //   method: 'POST',
      //   body: JSON.stringify({ email: emailInput.value, password: passwordInput.value }),
      // });
      // storage.set('token', data.token);
      // window.location.href = '/dashboard.html';

      // Demo: simulate success
      await new Promise((r) => setTimeout(r, 1500));
      showToast('Signed in successfully!', 'success');
      setTimeout(() => { submitBtn.textContent = 'Sign In'; submitBtn.disabled = false; }, 1500);
    } catch (err) {
      submitBtn.textContent = 'Sign In';
      submitBtn.disabled = false;
    }
  });

  // Social login buttons
  document.querySelectorAll('.social-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      showToast('Social login — connect your OAuth provider here.', 'info');
    });
  });
});