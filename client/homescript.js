 let userLocation = null;
    let map = null;
    let markers = [];
    let currentPage = 1;
    const issuesPerPage = 6;
    let allIssues = [];

    // Initialize map
    function initMap() {
      map = L.map('map').setView([28.6139, 77.2090], 12);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);
    }

    // Clear all map markers
    function clearMarkers() {
      markers.forEach(marker => map.removeLayer(marker));
      markers = [];
    }

    // Add marker to map
    function addMarker(issue) {
      if (!issue.location?.coordinates) return;
      
      const [lng, lat] = issue.location.coordinates;
      const markerColor = getMarkerColor(issue.status);
      
      const marker = L.circleMarker([lat, lng], {
        radius: 6,
        fillColor: markerColor,
        color: '#fff',
        weight: 1.5,
        fillOpacity: 0.9
      });
      
      let popupContent = `
        <div style="max-width: 200px;">
          <h4 style="margin: 0 0 5px 0; color: #4361ee;">${issue.title}</h4>
          <p style="margin: 0 0 5px 0;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 20px; 
              background: ${markerColor}; color: white; font-size: 0.7rem;">
              ${issue.status}
            </span>
          </p>
          <p style="margin: 0 0 5px 0; font-size: 0.9rem;">${issue.category}</p>
          <p style="margin: 0 0 5px 0; font-size: 0.8rem;">${issue.description || 'No description'}</p>
      `;
      
      if (issue.photo?.length > 0) {
        popupContent += `<img src="http://localhost:8000/${issue.photo[0]}" style="width: 100%; margin-top: 5px; border-radius: 5px;">`;
      }
      
      popupContent += `</div>`;
      
      marker.bindPopup(popupContent);
      marker.addTo(map);
      markers.push(marker);
    }

    // Get color based on status
    function getMarkerColor(status) {
      switch (status) {
        case 'Reported': return '#17a2b8';
        case 'In Progress': return '#fd7e14';
        case 'Resolved': return '#28a745';
        default: return '#4361ee';
      }
    }

    // Calculate distance between coordinates
    function calculateDistance(lat1, lon1, lat2, lon2) {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    }

    // Fetch issues from API
    async function fetchIssues() {
      try {
        const res = await fetch('http://localhost:8000/api/issues');
        allIssues = await res.json();
        filterAndRenderIssues();
      } catch (error) {
        console.error('Error fetching issues:', error);
        document.getElementById('issueGrid').innerHTML = `
          <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
            <i class="fas fa-exclamation-triangle" style="color: #dc3545; font-size: 3rem;"></i>
            <h3>Failed to Load Issues</h3>
            <p>Please try again later or report the problem to our support team.</p>
          </div>
        `;
      }
    }

    // Filter and render issues based on current filters
    function filterAndRenderIssues() {
      const category = document.getElementById('categoryFilter').value;
      const status = document.getElementById('statusFilter').value;
      const distance = parseFloat(document.getElementById('distanceFilter').value);
      const search = document.getElementById('searchInput').value.toLowerCase();
      
      // Filter issues
      let filtered = allIssues.filter(issue => {
        // Category filter
        if (category && issue.category !== category) return false;
        
        // Status filter
        if (status && issue.status !== status) return false;
        
        // Search filter
        if (search && !issue.title.toLowerCase().includes(search) && 
            !(issue.description && issue.description.toLowerCase().includes(search))) {
          return false;
        }
        
        // Distance filter
        if (distance > 0 && userLocation && issue.location?.coordinates) {
          const [lng, lat] = issue.location.coordinates;
          const d = calculateDistance(userLocation.lat, userLocation.lng, lat, lng);
          if (d > distance) return false;
        }
        
        return true;
      });
      
      // Update map
      clearMarkers();
      filtered.forEach(issue => addMarker(issue));
      
      // Fit map to bounds if we have markers
      if (markers.length > 0) {
        const group = new L.featureGroup(markers);
        map.fitBounds(group.getBounds());
      }
      
      // Update pagination
      setupPagination(filtered);
      
      // Render current page
      renderIssues(filtered);
    }

    // Render issues for current page
    function renderIssues(issues) {
      const grid = document.getElementById('issueGrid');
      const noResults = document.getElementById('noResults');
      
      // Calculate pagination
      const startIndex = (currentPage - 1) * issuesPerPage;
      const endIndex = startIndex + issuesPerPage;
      const paginatedIssues = issues.slice(startIndex, endIndex);
      
      if (paginatedIssues.length === 0) {
        grid.innerHTML = '';
        noResults.style.display = 'block';
        return;
      }
      
      noResults.style.display = 'none';
      grid.innerHTML = paginatedIssues.map(issue => `
        <div class="card">
          ${issue.photo?.length > 0 ? 
            `<img src="http://localhost:8000/${issue.photo[0]}" style="width: 100%; height: 180px; object-fit: cover;" alt="${issue.title}">` : 
            `<div style="width: 100%; height: 180px; background: #e9ecef; display: flex; align-items: center; justify-content: center;">
              <i class="fas fa-image" style="font-size: 2rem; color: #adb5bd;"></i>
            </div>`
          }
          <div style="padding: 15px;">
            <h3 style="margin: 0 0 10px 0; font-size: 1.1rem; color: #4361ee;">${issue.title}</h3>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 0.85rem;">
              <span class="status" style="display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; color: white; background: ${getMarkerColor(issue.status)}">
                ${issue.status}
              </span>
              <span>${issue.category}</span>
            </div>
            <p style="color: #555; font-size: 0.9rem; margin-bottom: 15px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;">
              ${issue.description || 'No description provided'}
            </p>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; color: #666; border-top: 1px solid rgba(0,0,0,0.08); padding-top: 12px;">
              <span style="display: flex; align-items: center; gap: 5px; color: #4361ee; font-weight: 500;">
                <i class="fas fa-map-marker-alt"></i>
                ${issue.location ? 'View on Map' : 'No location'}
              </span>
              <span style="font-style: italic; color: #888;">
                <i class="far fa-calendar-alt"></i> ${new Date(issue.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      `).join('');
    }

    // Setup pagination controls
    function setupPagination(issues) {
      const pageCount = Math.ceil(issues.length / issuesPerPage);
      const paginationDiv = document.getElementById('pagination');
      
      if (pageCount <= 1) {
        paginationDiv.style.display = 'none';
        return;
      }
      
      paginationDiv.style.display = 'flex';
      paginationDiv.innerHTML = '';
      
      // Previous button
      if (currentPage > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.className = 'page-btn';
        prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i> Prev';
        prevBtn.addEventListener('click', () => {
          currentPage--;
          filterAndRenderIssues();
          window.scrollTo({top: document.getElementById('issues').offsetTop - 20, behavior: 'smooth'});
        });
        paginationDiv.appendChild(prevBtn);
      }
      
      // Page numbers
      const maxVisiblePages = 5;
      let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
      let endPage = Math.min(pageCount, startPage + maxVisiblePages - 1);
      
      if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }
      
      if (startPage > 1) {
        const firstBtn = document.createElement('button');
        firstBtn.className = 'page-btn';
        firstBtn.textContent = '1';
        firstBtn.addEventListener('click', () => {
          currentPage = 1;
          filterAndRenderIssues();
          window.scrollTo({top: document.getElementById('issues').offsetTop - 20, behavior: 'smooth'});
        });
        paginationDiv.appendChild(firstBtn);
        
        if (startPage > 2) {
          const ellipsis = document.createElement('span');
          ellipsis.textContent = '...';
          ellipsis.style.padding = '8px 15px';
          paginationDiv.appendChild(ellipsis);
        }
      }
      
      for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
        pageBtn.textContent = i;
        pageBtn.addEventListener('click', () => {
          currentPage = i;
          filterAndRenderIssues();
          window.scrollTo({top: document.getElementById('issues').offsetTop - 20, behavior: 'smooth'});
        });
        paginationDiv.appendChild(pageBtn);
      }
      
      if (endPage < pageCount) {
        if (endPage < pageCount - 1) {
          const ellipsis = document.createElement('span');
          ellipsis.textContent = '...';
          ellipsis.style.padding = '8px 15px';
          paginationDiv.appendChild(ellipsis);
        }
        
        const lastBtn = document.createElement('button');
        lastBtn.className = 'page-btn';
        lastBtn.textContent = pageCount;
        lastBtn.addEventListener('click', () => {
          currentPage = pageCount;
          filterAndRenderIssues();
          window.scrollTo({top: document.getElementById('issues').offsetTop - 20, behavior: 'smooth'});
        });
        paginationDiv.appendChild(lastBtn);
      }
      
      // Next button
      if (currentPage < pageCount) {
        const nextBtn = document.createElement('button');
        nextBtn.className = 'page-btn';
        nextBtn.innerHTML = 'Next <i class="fas fa-chevron-right"></i>';
        nextBtn.addEventListener('click', () => {
          currentPage++;
          filterAndRenderIssues();
          window.scrollTo({top: document.getElementById('issues').offsetTop - 20, behavior: 'smooth'});
        });
        paginationDiv.appendChild(nextBtn);
      }
    }

    // Reset all filters
    function resetFilters() {
      document.getElementById('categoryFilter').value = '';
      document.getElementById('statusFilter').value = '';
      document.getElementById('distanceFilter').value = '3';
      document.getElementById('searchInput').value = '';
      currentPage = 1;
      filterAndRenderIssues();
    }

    // Get user location
    function getUserLocation() {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          position => {
            userLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            
            // Add user location marker
            L.marker([userLocation.lat, userLocation.lng], {
              icon: L.divIcon({
                html: '<i class="fas fa-user" style="color: #4361ee; font-size: 20px;"></i>',
                className: 'user-location-icon'
              })
            }).addTo(map).bindPopup("Your Location").openPopup();
            
            // Center map on user location
            map.setView([userLocation.lat, userLocation.lng], 13);
            
            filterAndRenderIssues();
          },
          error => {
            console.log("Geolocation error:", error);
            filterAndRenderIssues();
          }
        );
      } else {
        filterAndRenderIssues();
      }
    }

    // Initialize the page
    function init() {
      initMap();
      getUserLocation();
      fetchIssues();
      
      // Add event listeners to filters
      document.getElementById('categoryFilter').addEventListener('change', () => {
        currentPage = 1;
        filterAndRenderIssues();
      });
      
      document.getElementById('statusFilter').addEventListener('change', () => {
        currentPage = 1;
        filterAndRenderIssues();
      });
      
      document.getElementById('distanceFilter').addEventListener('change', () => {
        currentPage = 1;
        filterAndRenderIssues();
      });
      
      document.getElementById('searchInput').addEventListener('input', () => {
        currentPage = 1;
        filterAndRenderIssues();
      });
    }

    // Start the application
    init();