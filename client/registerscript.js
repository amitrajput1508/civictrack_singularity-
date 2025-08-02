document.addEventListener('DOMContentLoaded', function() {
      const registerForm = document.getElementById('registerForm');
      const alertBox = document.getElementById('alertBox');
      
      if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
          e.preventDefault();
          
          const username = document.getElementById('username').value.trim();
          const email = document.getElementById('email').value.trim();
          const phone = document.getElementById('phone').value.trim();
          const password = document.getElementById('password').value;
          
          // Set loading state
          const submitBtn = registerForm.querySelector('button[type="submit"]');
          const originalBtnText = submitBtn.innerHTML;
          submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering...';
          submitBtn.disabled = true;
          
          try {
            const res = await fetch('http://localhost:8000/api/users/register', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ username, email, phone, password })
            });
            
            const data = await res.json();
            
            if (res.ok) {
              showAlert(data.message || 'Registration successful!', 'success');
              setTimeout(() => {
                window.location.href = 'userLogin.html';
              }, 1500);
            } else {
              const errorMessage = data.error || 
                                 data.message || 
                                 `Registration failed (Status: ${res.status})`;
              showAlert(errorMessage, 'danger');
            }
          } catch (error) {
            console.error('Registration error:', error);
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