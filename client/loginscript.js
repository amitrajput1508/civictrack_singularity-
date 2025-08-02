 document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const alertBox = document.getElementById('alertBox');

    // Hardcoded credentials
    const ADMIN_EMAIL = "admin@civictrack.com";
    const ADMIN_PASSWORD = "admin123";

    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();

      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value.trim();

      const submitBtn = loginForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
      submitBtn.disabled = true;

      setTimeout(() => {
        if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
          // Save admin login state
          localStorage.setItem("isAdmin", "true");
          window.location.href = "admin.html";
        } else {
          showAlert('❌ Invalid email or password', 'danger');
        }
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
      }, 1000); // simulate loading
    });

    function showAlert(message, type) {
      alertBox.textContent = message;
      alertBox.className = `alert alert-${type}`;
      alertBox.style.display = 'block';
      setTimeout(() => {
        alertBox.style.display = 'none';
      }, 4000);
    }
  });