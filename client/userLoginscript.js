document.addEventListener('DOMContentLoaded', function() {
      const loginForm = document.getElementById('loginForm');
      const alertBox = document.getElementById('alertBox');
      
      if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
          e.preventDefault();
          
          const username = document.getElementById('username').value.trim();
          const password = document.getElementById('password').value;
          
          // Set loading state
          const submitBtn = loginForm.querySelector('button[type="submit"]');
          const originalBtnText = submitBtn.innerHTML;
          submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
          submitBtn.disabled = true;
          
          try {
            const res = await fetch('http://localhost:8000/api/users/login', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ username, password })
            });
            
            const data = await res.json();
            
            if (res.ok) {
              showAlert(data.message || 'Login successful!', 'success');
              setTimeout(() => {
                window.location.href = 'UserDashboard.html';
              }, 1500);
            } else {
              const errorMessage = data.error || 
                                 data.message || 
                                 `Login failed (Status: ${res.status})`;
              showAlert(errorMessage, 'danger');
            }
          } catch (error) {
            console.error('Login error:', error);
            showAlert('Network error. Please try again later.', 'danger');
          } finally {
            // Reset button state
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
          }
        });
      }
      
      function showAlert(message, type) {
        if (!alertBox) return;
        
        alertBox.textContent = message;
        alertBox.className = `alert alert-${type}`;
        alertBox.style.display = 'block';
        
        setTimeout(() => {
          alertBox.style.display = 'none';
        }, 5000);
      }
    });