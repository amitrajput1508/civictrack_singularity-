 let userLocation = null;
    let allIssues = [];
    let currentUser = null;

    // Fetch current user
    async function fetchCurrentUser() {
      try {
        const res = await fetch('http://localhost:8000/api/users/current', {
          credentials: 'include'
        });
        const data = await res.json();
        if (res.ok && data.username) {
          currentUser = data.username;
        }
      } catch (err) {
        console.warn("Could not fetch current user:", err);
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
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    }

    // Fetch issues from API
    async function fetchIssues() {
      try {
        const res = await fetch('http://localhost:8000/api/issues');
        const data = await res.json();
        if (Array.isArray(data)) {
          // Sort issues by updatedAt in descending order (newest first)
          allIssues = data.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
          filterAndRenderIssues();
          updateNotificationBadge();
        }
      } catch (error) {
        console.error("Error fetching issues:", error);
      }
    }

    // Filter and render issues based on selected filters
    function filterAndRenderIssues() {
      const grid = document.getElementById('issueGrid');
      const noResults = document.getElementById('noResults');
      grid.innerHTML = '';

      const category = document.getElementById('categoryFilter').value;
      const status = document.getElementById('statusFilter').value;
      const distance = parseFloat(document.getElementById('distanceFilter').value);
      const search = document.getElementById('searchInput').value.toLowerCase();

      let found = false;

      allIssues.forEach(issue => {
        if (category && issue.category !== category) return;
        if (status && issue.status !== status) return;
        if (search && !issue.title.toLowerCase().includes(search)) return;

        const [lng, lat] = issue.location?.coordinates || [];
        if (userLocation && lat && lng) {
          const d = calculateDistance(userLocation.lat, userLocation.lng, lat, lng);
          if (d > distance) return;
        }

        found = true;

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
          <img src="http://localhost:8000/${issue.photo?.[0] || 'placeholder.jpg'}" alt="issue image">
          <h4>${issue.title}</h4>
          <p><span class="status ${issue.status.replace(/\s/g, '')}">${issue.status}</span> • ${issue.category}</p>
          <p>${issue.description || 'No description provided'}</p>
          <div class="meta-info">
            <span><i class="far fa-user"></i> ${issue.username || 'Anonymous'}</span>
            <span><i class="far fa-calendar"></i> ${new Date(issue.updatedAt).toLocaleDateString()}</span>
          </div>
        `;
        grid.appendChild(card);
      });

      noResults.style.display = found ? 'none' : 'block';
    }

    // Update notification badge count based on recent updates
    function updateNotificationBadge() {
      // Count issues updated in the last 7 days
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const recentUpdates = allIssues.filter(issue => 
        new Date(issue.updatedAt) > oneWeekAgo
      ).length;

      const badge = document.getElementById('notificationBadge');
      
      if (recentUpdates > 0) {
        badge.style.display = 'flex';
        badge.textContent = recentUpdates;
      } else {
        badge.style.display = 'none';
      }
    }

    // Render notifications (status updates) in modal
    function renderNotifications() {
      const container = document.getElementById('notificationsList');
      container.innerHTML = '';
      
      // Sort issues by updatedAt in descending order (newest first)
      const sortedIssues = [...allIssues].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      
      sortedIssues.forEach(issue => {
        const item = document.createElement('div');
        item.className = 'notification-item';
        
        // Determine if this is a recent update (last 7 days)
        const isRecent = new Date(issue.updatedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        if (isRecent) {
          item.classList.add('unread');
        }
        
        item.innerHTML = `
          <div class="notification-title">${issue.title}</div>
          <span class="notification-status ${issue.status.replace(/\s/g, '')}">${issue.status}</span>
          <div class="notification-time">
            Updated: ${new Date(issue.updatedAt).toLocaleString()}
            ${isRecent ? '<span style="color: var(--danger); margin-left: 5px;">• New</span>' : ''}
          </div>
          <p style="margin-top: 5px; font-size: 0.9rem;">${issue.category}</p>
        `;
        
        container.appendChild(item);
      });
    }

    // Open notifications modal
    function openNotifications() {
      document.getElementById('notificationsModal').style.display = 'block';
      renderNotifications();
    }

    // Close notifications modal
    function closeNotifications() {
      document.getElementById('notificationsModal').style.display = 'none';
      // Reset badge count when notifications are viewed
      document.getElementById('notificationBadge').style.display = 'none';
    }

    // Chatbot functionality
    const chatbotButton = document.getElementById('chatbotButton');
    const chatbotWindow = document.getElementById('chatbotWindow');
    const chatbotClose = document.getElementById('chatbotClose');
    const chatbotMessages = document.getElementById('chatbotMessages');
    const chatbotInput = document.getElementById('chatbotInput');
    const chatbotSend = document.getElementById('chatbotSend');
    
    let chatState = 'initial'; // Tracks the current state of the conversation
    let currentReportSearch = ''; // Stores the current report search term
    
    // Toggle chatbot window
    chatbotButton.addEventListener('click', () => {
      chatbotWindow.classList.toggle('active');
      if (chatbotWindow.classList.contains('active')) {
        // Only show welcome message if this is the first interaction
        if (chatbotMessages.children.length === 0) {
          addBotMessage("Hello! I'm your CivicTrack assistant. How can I help you today?");
          showOptions();
        }
      }
    });
    
    chatbotClose.addEventListener('click', () => {
      chatbotWindow.classList.remove('active');
    });
    
    // Send message when button is clicked
    chatbotSend.addEventListener('click', sendMessage);
    
    // Send message when Enter key is pressed
    chatbotInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendMessage();
      }
    });
    
    function sendMessage() {
      const message = chatbotInput.value.trim();
      if (message) {
        addUserMessage(message);
        chatbotInput.value = '';
        processUserMessage(message);
      }
    }
    
    function addUserMessage(text) {
      const messageDiv = document.createElement('div');
      messageDiv.className = 'message user-message';
      messageDiv.textContent = text;
      chatbotMessages.appendChild(messageDiv);
      scrollToBottom();
    }
    
    function addBotMessage(text) {
      // Show typing indicator
      const typingDiv = document.createElement('div');
      typingDiv.className = 'typing-indicator';
      typingDiv.innerHTML = `
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      `;
      chatbotMessages.appendChild(typingDiv);
      scrollToBottom();
      
      // Remove typing indicator and add actual message after a delay
      setTimeout(() => {
        chatbotMessages.removeChild(typingDiv);
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot-message';
        messageDiv.innerHTML = text;
        chatbotMessages.appendChild(messageDiv);
        scrollToBottom();
      }, 1000 + Math.random() * 1000); // Random delay between 1-2 seconds
    }
    
    function showOptions() {
      const optionsDiv = document.createElement('div');
      optionsDiv.className = 'chatbot-options';
      optionsDiv.innerHTML = `
        <button class="option-btn" data-choice="status">Check Report Status</button>
        <button class="option-btn" data-choice="create">Create New Report</button>
      `;
      chatbotMessages.appendChild(optionsDiv);
      scrollToBottom();
      
      // Add event listeners to option buttons
      document.querySelectorAll('.option-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const choice = e.target.getAttribute('data-choice');
          handleOptionSelection(choice);
        });
      });
    }
    
    function handleOptionSelection(choice) {
      if (choice === 'status') {
        chatState = 'awaiting_report_search';
        addUserMessage("Check Report Status");
        addBotMessage("Sure! Please enter keywords to search for your report (e.g., 'pothole on Main St').");
      } else if (choice === 'create') {
        addUserMessage("Create New Report");
        addBotMessage("Taking you to the report creation page...");
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 1500);
      }
    }
    
    function processUserMessage(message) {
      if (chatState === 'initial') {
        // Handle initial free-form messages
        if (message.toLowerCase().includes('status') || message.toLowerCase().includes('check')) {
          handleOptionSelection('status');
        } else if (message.toLowerCase().includes('create') || message.toLowerCase().includes('new') || message.toLowerCase().includes('report')) {
          handleOptionSelection('create');
        } else {
          addBotMessage("I can help you check report status or create a new report. What would you like to do?");
          showOptions();
        }
      } else if (chatState === 'awaiting_report_search') {
        // Search for reports based on user input
        currentReportSearch = message;
        searchReports(message);
      } else if (chatState === 'awaiting_report_selection') {
        // User selected a report from the search results
        const reportId = parseInt(message);
        if (!isNaN(reportId)) {
          const selectedReport = allIssues.find(issue => issue.id === reportId);
          if (selectedReport) {
            showReportStatus(selectedReport);
          } else {
            addBotMessage("Sorry, I couldn't find that report. Please try again.");
            searchReports(currentReportSearch);
          }
        } else {
          addBotMessage("Please select a report by entering its number.");
          searchReports(currentReportSearch);
        }
      }
    }
    
    function searchReports(keywords) {
      const matchingReports = allIssues.filter(issue => 
        issue.title.toLowerCase().includes(keywords.toLowerCase()) || 
        (issue.description && issue.description.toLowerCase().includes(keywords.toLowerCase()))
      ).slice(0, 5); // Limit to 5 results
      
      if (matchingReports.length > 0) {
        let message = "I found these matching reports. Please select one by entering its number:<br><br>";
        matchingReports.forEach((report, index) => {
          message += `<strong>${index + 1}.</strong> ${report.title} (${report.status})<br>`;
        });
        addBotMessage(message);
        chatState = 'awaiting_report_selection';
      } else {
        addBotMessage("Sorry, I couldn't find any reports matching your search. Please try different keywords.");
        chatState = 'awaiting_report_search';
      }
    }
    
    function showReportStatus(report) {
      const statusEmoji = {
        'Reported': '📝',
        'In Progress': '🚧',
        'Resolved': '✅'
      };
      
      const statusMessage = {
        'Reported': 'has been received and is awaiting review by our team.',
        'In Progress': 'is currently being worked on by our maintenance crew.',
        'Resolved': 'has been successfully resolved! Thank you for your patience.'
      };
      
      const message = `
        <strong>Report Status:</strong> ${report.title}<br><br>
        ${statusEmoji[report.status]} <strong>Status:</strong> ${report.status}<br>
        ${statusMessage[report.status]}<br><br>
        <em>Last updated: ${new Date(report.updatedAt).toLocaleString()}</em>
      `;
      
      addBotMessage(message);
      
      // Show options to start over
      setTimeout(() => {
        addBotMessage("What would you like to do next?");
        chatState = 'initial';
        showOptions();
      }, 1000);
    }
    
    function scrollToBottom() {
      chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    }

    // Event listeners
    document.getElementById('profileBtn').addEventListener('click', () => {
      console.log("Profile clicked");
    });

    document.getElementById('notificationsBtn').addEventListener('click', openNotifications);

    document.getElementById('categoryFilter').addEventListener('change', filterAndRenderIssues);
    document.getElementById('statusFilter').addEventListener('change', filterAndRenderIssues);
    document.getElementById('distanceFilter').addEventListener('change', filterAndRenderIssues);
    document.getElementById('searchInput').addEventListener('input', filterAndRenderIssues);

    // Initialize
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        userLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        };
        fetchCurrentUser().then(fetchIssues);
      }, () => {
        fetchCurrentUser().then(fetchIssues);
      });
    } else {
      fetchCurrentUser().then(fetchIssues);
    }