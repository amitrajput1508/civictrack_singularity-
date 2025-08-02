 const form = document.getElementById('issueForm');
    const responseDiv = document.getElementById('response');
    const photosInput = document.getElementById('photos');
    const previewContainer = document.getElementById('previewContainer');
    const latInput = document.getElementById('latitude');
    const lngInput = document.getElementById('longitude');

    // Initialize Map
    let marker;
    const map = L.map('map').setView([28.6139, 77.2090], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Update marker position
    function updateMarker(lat, lng) {
      if (marker) map.removeLayer(marker);
      marker = L.marker([lat, lng], { 
        draggable: true,
        icon: L.divIcon({
          html: '<i class="fas fa-map-marker-alt" style="color: #4361ee; font-size: 32px;"></i>',
          className: 'map-marker-icon'
        })
      }).addTo(map);
      
      latInput.value = lat;
      lngInput.value = lng;

      marker.on('dragend', function (e) {
        const pos = e.target.getLatLng();
        latInput.value = pos.lat;
        lngInput.value = pos.lng;
      });
    }

    // Try to get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          map.setView([lat, lng], 15);
          updateMarker(lat, lng);
        },
        err => {
          console.warn("Location access denied. Using default location.");
          updateMarker(28.6139, 77.2090);
        }
      );
    } else {
      updateMarker(28.6139, 77.2090);
    }

    // Click on map to set location
    map.on('click', function (e) {
      updateMarker(e.latlng.lat, e.latlng.lng);
    });

    // Handle photo uploads and previews
    photosInput.addEventListener('change', () => {
      previewContainer.innerHTML = '';
      
      if (photosInput.files.length > 5) {
        showResponse('⚠️ You can only upload up to 5 photos.', 'error');
        photosInput.value = '';
        return;
      }
      
      Array.from(photosInput.files).forEach((file, index) => {
        if (!file.type.match('image.*')) {
          showResponse('⚠️ Only image files are allowed.', 'error');
          return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
          showResponse('⚠️ Each image should be less than 5MB.', 'error');
          return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
          const previewItem = document.createElement('div');
          previewItem.className = 'preview-item';
          previewItem.innerHTML = `
            <img src="${e.target.result}" alt="Preview">
            <button onclick="removeImage(${index})"><i class="fas fa-times"></i></button>
          `;
          previewContainer.appendChild(previewItem);
        };
        reader.readAsDataURL(file);
      });
    });

    // Remove image from preview
    window.removeImage = (index) => {
      const dt = new DataTransfer();
      const files = Array.from(photosInput.files);
      
      files.splice(index, 1);
      files.forEach(file => dt.items.add(file));
      
      photosInput.files = dt.files;
      photosInput.dispatchEvent(new Event('change'));
    };

    // Show response message
    function showResponse(message, type) {
      responseDiv.textContent = message;
      responseDiv.className = type;
      responseDiv.style.display = 'block';
      
      setTimeout(() => {
        responseDiv.style.display = 'none';
      }, 5000);
    }

    // Form submission
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn.innerHTML;
      
      // Show loading state
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
      submitBtn.disabled = true;
      
      try {
        const formData = new FormData(form);
        
        const res = await fetch('http://localhost:8000/api/issues', {
          method: 'POST',
          body: formData
        });

        const data = await res.json();
        if (res.ok) {
          showResponse(`✅ ${data.message}`, 'success');
          form.reset();
          previewContainer.innerHTML = '';
          updateMarker(28.6139, 77.2090); // Reset to default location
        } else {
          showResponse(`❌ Error: ${data.error || 'Submission failed'}`, 'error');
        }
      } catch (err) {
        showResponse(`❌ Network Error: Please try again later`, 'error');
        console.error('Submission error:', err);
      } finally {
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
      }
    });