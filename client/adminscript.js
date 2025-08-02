const tableBody = document.querySelector('#issueTable tbody');
    let map = null;
    let allMarkers = [];
    let chartInstance = null;
    let currentView = 'table'; // 'table' or 'map'

    // Initialize map when needed
    function initMap() {
      if (!map) {
        map = L.map('map').setView([28.6139, 77.2090], 12); // Default to Delhi
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);
      }
    }

    function getMarkerColor(status) {
      switch (status) {
        case 'Reported': return '#17a2b8';
        case 'In Progress': return '#fd7e14';
        case 'Resolved': return '#28a745';
        default: return '#4361ee';
      }
    }

    function clearMarkers() {
      allMarkers.forEach(marker => map.removeLayer(marker));
      allMarkers = [];
    }

    function addMarker(issue) {
      if (!issue.location || !issue.location.coordinates) return;
      const [lng, lat] = issue.location.coordinates;

      const marker = L.circleMarker([lat, lng], {
        radius: 8,
        color: '#fff',
        weight: 1.5,
        fillColor: getMarkerColor(issue.status),
        fillOpacity: 0.9
      });

      let popup = `
        <strong>${issue.title}</strong><br>
        <em>${issue.category}</em><br>
        ${issue.description}<br>
        <small>Status: ${issue.status}</small><br>
        <small>Flagged: ${issue.isFlagged ? 'Yes' : 'No'}</small>
      `;

      if (issue.photo?.length > 0) {
        popup += `<br><img src="http://localhost:8000/${issue.photo[0]}" style="max-width: 100px; margin-top: 5px; border-radius: 5px;">`;
      }

      marker.bindPopup(popup);
      marker.addTo(map);
      allMarkers.push(marker);
    }

    function renderMap(issues) {
      if (!map) initMap();
      clearMarkers();
      
      const mapStatus = document.getElementById('mapStatusFilter').value;
      const mapCategory = document.getElementById('mapCategoryFilter').value;

      issues.forEach(issue => {
        if (mapStatus && issue.status !== mapStatus) return;
        if (mapCategory && issue.category !== mapCategory) return;
        addMarker(issue);
      });

      // Fit map to markers if there are any
      if (allMarkers.length > 0) {
        const group = new L.featureGroup(allMarkers);
        map.fitBounds(group.getBounds());
      }
    }

    function toggleView(view) {
      currentView = view;
      if (view === 'table') {
        document.getElementById('mapSection').style.display = 'none';
        document.getElementById('issueTable').style.display = 'table';
        document.getElementById('tableViewBtn').classList.add('active');
        document.getElementById('mapViewBtn').classList.remove('active');
      } else {
        document.getElementById('mapSection').style.display = 'block';
        document.getElementById('issueTable').style.display = 'none';
        document.getElementById('tableViewBtn').classList.remove('active');
        document.getElementById('mapViewBtn').classList.add('active');
        initMap();
        loadIssues(); // This will now also render the map
      }
    }

    function loadIssues() {
      fetch('http://localhost:8000/api/issues')
        .then(res => res.json())
        .then(issues => {
          const category = document.getElementById('categoryFilter').value;
          const status = document.getElementById('statusFilter').value;

          const filtered = issues.filter(issue => {
            return (!category || issue.category === category) &&
                   (!status || issue.status === status);
          });

          tableBody.innerHTML = '';
          loadAnalytics(filtered);
          renderIssues(filtered);
          
          if (currentView === 'map') {
            renderMap(filtered);
          }
        });
    }

    function renderIssues(issues) {
      issues.forEach(issue => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${issue.title}</td>
          <td>${issue.category}</td>
          <td>
            <span class="badge badge-${issue.status.toLowerCase().replace(' ', '-')}">${issue.status}</span>
            ${issue.isFlagged ? '<span class="badge badge-flagged">Flagged</span>' : ''}
          </td>
          <td>
            <select class="form-control" data-id="${issue._id}" onchange="updateStatus(this)">
              <option value="">-- Select --</option>
              <option value="Reported" ${issue.status === 'Reported' ? 'selected' : ''}>Reported</option>
              <option value="In Progress" ${issue.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
              <option value="Resolved" ${issue.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
            </select>
          </td>
          <td>
            <button class="btn btn-sm ${issue.isFlagged ? 'btn-warning' : 'btn-primary'}" onclick="toggleFlag('${issue._id}')">
              ${issue.isFlagged ? 'Unflag' : 'Flag'}
            </button>
          </td>
          <td>
            <button class="btn btn-sm btn-danger" onclick="deleteIssue('${issue._id}')">
              <i class="fas fa-trash"></i> Delete
            </button>
          </td>
        `;
        tableBody.appendChild(row);
      });
    }

    function updateStatus(selectEl) {
      const id = selectEl.getAttribute('data-id');
      const status = selectEl.value;
      if (!status) return;

      fetch(`http://localhost:8000/api/issues/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      .then(res => res.json())
      .then(data => {
        alert(data.message || "Status updated");
        loadIssues();
      })
      .catch(err => {
        console.error('Error updating status:', err);
        alert("Failed to update status.");
      });
    }

    function deleteIssue(id) {
      if (!confirm("Are you sure you want to delete this issue?")) return;

      fetch(`http://localhost:8000/api/issues/${id}`, {
        method: 'DELETE'
      })
      .then(res => res.json())
      .then(data => {
        alert(data.message || "Issue deleted");
        loadIssues();
      })
      .catch(err => {
        console.error('Error deleting issue:', err);
        alert("Failed to delete issue.");
      });
    }

    function toggleFlag(id) {
      fetch(`http://localhost:8000/api/issues/${id}/flag`, {
        method: 'PATCH'
      })
      .then(res => res.json())
      .then(data => {
        alert(data.message || "Flag updated");
        loadIssues();
      })
      .catch(err => {
        console.error('Error toggling flag:', err);
        alert("Failed to toggle flag.");
      });
    }

    function downloadCSV() {
      fetch('http://localhost:8000/api/issues')
        .then(res => res.json())
        .then(data => {
          const csvRows = [];
          const headers = ['Title', 'Category', 'Status', 'Description', 'Latitude', 'Longitude', 'Flagged', 'Created At'];
          csvRows.push(headers.join(','));

          data.forEach(issue => {
            const row = [
              `"${issue.title}"`,
              issue.category,
              issue.status,
              `"${issue.description || ''}"`,
              issue.location?.coordinates[1] || '',
              issue.location?.coordinates[0] || '',
              issue.isFlagged ? 'Yes' : 'No',
              new Date(issue.createdAt).toLocaleString()
            ];
            csvRows.push(row.join(','));
          });

          const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
          const url = window.URL.createObjectURL(blob);

          const a = document.createElement('a');
          a.setAttribute('href', url);
          a.setAttribute('download', 'civictrack_issues.csv');
          a.click();
        });
    }

    function loadAnalytics(issues) {
      const total = issues.length;
      const categories = {};
      const today = new Date().toISOString().split('T')[0];
      let todayCount = 0;
      
      issues.forEach(issue => {
        categories[issue.category] = (categories[issue.category] || 0) + 1;
        if (issue.createdAt.includes(today)) {
          todayCount++;
        }
      });

      const mostCommon = Object.entries(categories).sort((a, b) => b[1] - a[1])[0];

      document.getElementById('totalIssues').textContent = total;
      document.getElementById('commonCategory').textContent = mostCommon ? `${mostCommon[0]} (${mostCommon[1]})` : 'N/A';
      document.getElementById('reportedToday').textContent = todayCount;

      renderChart(categories);
    }

    function renderChart(data) {
      const ctx = document.getElementById('categoryChart').getContext('2d');
      const labels = Object.keys(data);
      const values = Object.values(data);

      if (chartInstance) {
        chartInstance.destroy();
      }

      chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Issues by Category',
            data: values,
            backgroundColor: 'rgba(67, 97, 238, 0.7)',
            borderRadius: 5,
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            title: { 
              display: true, 
              text: 'Issue Category Distribution',
              font: { size: 16 }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return `${context.dataset.label}: ${context.raw}`;
                }
              }
            }
          },
          scales: {
            y: { 
              beginAtZero: true,
              ticks: { precision: 0 }
            }
          }
        }
      });
    }

    function toggleChart() {
      const section = document.getElementById('chartSection');
      section.style.display = (section.style.display === 'none') ? 'block' : 'none';
    }

    function logout() {
      localStorage.removeItem("isAdmin");
      window.location.href = "login.html";
    }

    // Event listeners
    document.getElementById('categoryFilter').addEventListener('change', loadIssues);
    document.getElementById('statusFilter').addEventListener('change', loadIssues);
    document.getElementById('mapStatusFilter').addEventListener('change', () => {
      if (currentView === 'map') loadIssues();
    });
    document.getElementById('mapCategoryFilter').addEventListener('change', () => {
      if (currentView === 'map') loadIssues();
    });

    // Initialize
    loadIssues();