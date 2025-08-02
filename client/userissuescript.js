 let allIssues = [];
    let userLocation = null;
    let map = null;
    let markers = [];
    let currentDistance = 1;
    let currentPage = 1;
    const issuesPerPage = 4;

    document.addEventListener('DOMContentLoaded', function() {
      initMap();
      loadIssues();
      getUserLocation();
    });

    function initMap() {
      map = L.map('map').setView([28.6139, 77.2090], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);
    }

    function getUserLocation() {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          position => {
            userLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            map.setView([userLocation.lat, userLocation.lng], 13);
            L.marker([userLocation.lat, userLocation.lng], {
              icon: L.divIcon({
                html: '<i class="fas fa-user" style="color: #4361ee; font-size: 20px;"></i>',
                className: 'user-location-icon'
              })
            }).addTo(map).bindPopup("Your Location").openPopup();
            filterByDistance(currentDistance);
          },
          error => {
            console.error("Geolocation error:", error);
            document.querySelector('.distance-controls').style.display = 'none';
          }
        );
      } else {
        document.querySelector('.distance-controls').style.display = 'none';
      }
    }

    function loadIssues() {
      fetch('http://localhost:8000/api/issues')
        .then(response => response.json())
        .then(issues => {
          allIssues = issues;
          renderIssues(issues);
          updateMapMarkers(issues);
          setupPagination(issues);
        })
        .catch(error => {
          console.error('Error loading issues:', error);
          document.getElementById('issuesContainer').innerHTML = `
            <div class="no-issues">
              <i class="fas fa-exclamation-circle" style="color: #dc3545; font-size: 1.5rem;"></i>
              <p>Failed to load issues. Please try again later.</p>
            </div>
          `;
        });
    }

    function renderIssues(issues) {
      const container = document.getElementById('issuesContainer');
      
      if (issues.length === 0) {
        container.innerHTML = `
          <div class="no-issues">
            <i class="fas fa-check-circle" style="color: #28a745; font-size: 1.5rem;"></i>
            <p>You haven't reported any issues yet.</p>
            <button onclick="location.href='report.html'" style="margin-top: 12px; padding: 8px 16px; background: var(--primary); color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 0.9rem;">
              <i class="fas fa-plus"></i> Report an Issue
            </button>
          </div>
        `;
        return;
      }
      
      // Calculate pagination
      const startIndex = (currentPage - 1) * issuesPerPage;
      const endIndex = startIndex + issuesPerPage;
      const paginatedIssues = issues.slice(startIndex, endIndex);
      
      container.innerHTML = paginatedIssues.map(issue => `
        <div class="issue-card ${issue.status.toLowerCase().replace(' ', '-')}">
          ${issue.photo?.length > 0 ? 
            `<img src="http://localhost:8000/${issue.photo[0]}" class="card-image">` : 
            `<div class="card-image" style="background: linear-gradient(135deg, #f1f3f5, #e9ecef); display: flex; align-items: center; justify-content: center;">
              <i class="fas fa-image" style="font-size: 2rem; color: #adb5bd;"></i>
            </div>`
          }
          <div class="card-content">
            <h3 class="card-title">
              ${issue.title}
              ${issue.isFlagged ? '<span class="flagged-badge"><i class="fas fa-flag"></i> Flagged</span>' : ''}
            </h3>
            <div class="card-meta">
              <span class="status-badge status-${issue.status.toLowerCase().replace(' ', '-')}">
                <i class="fas ${issue.status === 'Reported' ? 'fa-exclamation-circle' : 
                               issue.status === 'In Progress' ? 'fa-tools' : 'fa-check-circle'}"></i>
                ${issue.status}
              </span>
              <span class="category"><i class="fas fa-tag"></i> ${issue.category}</span>
            </div>
            <p class="card-description">${issue.description || 'No description provided'}</p>
            <div class="card-footer">
              <span class="location">
                <i class="fas fa-map-marker-alt"></i>
                ${issue.location ? 'Location' : 'No location'}
              </span>
              <span class="date">
                <i class="far fa-calendar-alt"></i> ${new Date(issue.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      `).join('');
    }

    function setupPagination(issues) {
      const pageCount = Math.ceil(issues.length / issuesPerPage);
      const paginationDiv = document.getElementById('pagination');
      
      if (pageCount <= 1) {
        paginationDiv.style.display = 'none';
        return;
      }
      
      paginationDiv.innerHTML = '';
      
      // Previous button
      if (currentPage > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i> Prev';
        prevBtn.className = 'page-btn';
        prevBtn.addEventListener('click', () => {
          currentPage--;
          renderIssues(allIssues);
          setupPagination(allIssues);
          window.scrollTo({top: 0, behavior: 'smooth'});
        });
        paginationDiv.appendChild(prevBtn);
      }
      
      // Page numbers
      for (let i = 1; i <= pageCount; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        pageBtn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
        pageBtn.addEventListener('click', () => {
          currentPage = i;
          renderIssues(allIssues);
          setupPagination(allIssues);
          window.scrollTo({top: 0, behavior: 'smooth'});
        });
        paginationDiv.appendChild(pageBtn);
      }
      
      // Next button
      if (currentPage < pageCount) {
        const nextBtn = document.createElement('button');
        nextBtn.innerHTML = 'Next <i class="fas fa-chevron-right"></i>';
        nextBtn.className = 'page-btn';
        nextBtn.addEventListener('click', () => {
          currentPage++;
          renderIssues(allIssues);
          setupPagination(allIssues);
          window.scrollTo({top: 0, behavior: 'smooth'});
        });
        paginationDiv.appendChild(nextBtn);
      }
    }

    function updateMapMarkers(issues) {
      // Clear existing markers
      markers.forEach(marker => map.removeLayer(marker));
      markers = [];
      
      issues.forEach(issue => {
        if (!issue.location?.coordinates) return;
        
        const [lng, lat] = issue.location.coordinates;
        const markerColor = getMarkerColor(issue.status);
        
        const marker = L.circleMarker([lat, lng], {
          radius: 6,
          fillColor: markerColor,
          color: '#fff',
          weight: 1.5,
          opacity: 1,
          fillOpacity: 0.9
        }).addTo(map);
        
        let popupContent = `
          <div class="map-popup">
            <h3>${issue.title}</h3>
            <span class="status" style="background: ${markerColor}; color: white;">
              ${issue.status}
            </span>
            ${issue.photo?.length > 0 ? `<img src="http://localhost:8000/${issue.photo[0]}">` : ''}
            <p><strong>Category:</strong> ${issue.category}</p>
            <p>${issue.description || 'No description'}</p>
            <p><small>Reported on ${new Date(issue.createdAt).toLocaleDateString()}</small></p>
          </div>
        `;
        
        marker.bindPopup(popupContent);
        markers.push(marker);
      });
      
      if (markers.length > 0) {
        const group = new L.featureGroup(markers);
        map.fitBounds(group.getBounds());
      }
    }

    function getMarkerColor(status) {
      switch (status) {
        case 'Reported': return '#6c757d';
        case 'In Progress': return '#fd7e14';
        case 'Resolved': return '#28a745';
        default: return '#4361ee';
      }
    }

    function filterByDistance(km) {
      currentDistance = km;
      
      // Update active button
      document.querySelectorAll('.distance-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      event.target.classList.add('active');
      
      if (!userLocation) return;
      
      const filteredIssues = allIssues.filter(issue => {
        if (!issue.location?.coordinates) return false;
        
        const [lng, lat] = issue.location.coordinates;
        const distance = calculateDistance(
          userLocation.lat, 
          userLocation.lng, 
          lat, 
          lng
        );
        
        return distance <= km;
      });
      
      updateMapMarkers(filteredIssues);
    }

    function calculateDistance(lat1, lon1, lat2, lon2) {
      const R = 6371; // Radius of the earth in km
      const dLat = deg2rad(lat2-lat1);
      const dLon = deg2rad(lon2-lon1); 
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2); 
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
      return R * c; // Distance in km
    }

    function deg2rad(deg) {
      return deg * (Math.PI/180);
    }