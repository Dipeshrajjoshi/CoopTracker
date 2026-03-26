// Constants
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxyraje51409-TWd7lWrKcfNTc8PsUP4uCuJY3IV6eroKYwA3H_h4zaP_4mSJW4bWRb/exec';
const STORAGE_KEY = 'coop_tracker_apps';
const USERS_KEY = 'coop_tracker_users';
const SESSION_KEY = 'coop_tracker_session';
const SEASON_END_DATE = new Date('2026-06-01');

// State Management
let applications = [];
let users = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
let currentUser = JSON.parse(localStorage.getItem(SESSION_KEY)) || null;
let hustleDays = 1;

// Motivational Quotes
const quotes = [
    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
    { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
    { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
    { text: "Your hard work will pay off. Keep applying!", author: "Career Coach" },
    { text: "Every rejection is a redirection to something better.", author: "Anonymous" },
    { text: "Consistency is the key to success. Keep the streak alive!", author: "Unknown" },
    { text: "Dream big. Work hard. Stay focused.", author: "Motivation Hub" }
];

// Auth Logic
const authOverlay = document.getElementById('auth-overlay');
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authToggle = document.getElementById('auth-toggle');
const authToggleText = document.getElementById('auth-toggle-text');
const logoutBtn = document.getElementById('logout-btn');

let isLoginView = true;

function updateAuthUI() {
    if (currentUser) {
        authOverlay.classList.remove('active');
        document.body.classList.remove('no-scroll');
        // Load user-specific data if needed, or just default to common storage for now
        loadFromLocal();
        renderTables();
        updateStats();
        updateMotivation();
    } else {
        authOverlay.classList.add('active');
        document.body.classList.add('no-scroll');
    }
}

authToggle.addEventListener('click', (e) => {
    e.preventDefault();
    isLoginView = !isLoginView;
    authTitle.textContent = isLoginView ? 'Welcome Back' : 'Create Account';
    authSubtitle.textContent = isLoginView ? 'Login to track your applications' : 'Start your co-op journey today';
    authSubmitBtn.textContent = isLoginView ? 'Login' : 'Sign Up';
    authToggleText.innerHTML = isLoginView ? 
        'Don\'t have an account? <a href="#" id="auth-toggle">Sign Up</a>' : 
        'Already have an account? <a href="#" id="auth-toggle">Login</a>';
    
    // Re-bind click event to the newly created toggle link
    document.getElementById('auth-toggle').addEventListener('click', (e) => {
        authToggle.click();
    });
});

authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('auth-username').value;
    const password = document.getElementById('auth-password').value;

    if (isLoginView) {
        const user = users.find(u => u.username === username && u.password === password);
        if (user) {
            currentUser = { username };
            localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
            showNotification(`Welcome back, ${username}!`);
            updateAuthUI();
        } else {
            showNotification('Invalid username or password', 'error');
        }
    } else {
        if (users.find(u => u.username === username)) {
            showNotification('Username already exists', 'error');
        } else {
            const newUser = { username, password };
            users.push(newUser);
            localStorage.setItem(USERS_KEY, JSON.stringify(users));
            currentUser = { username };
            localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
            showNotification('Account created successfully!');
            updateAuthUI();
        }
    }
});

logoutBtn.addEventListener('click', () => {
    currentUser = null;
    localStorage.removeItem(SESSION_KEY);
    showNotification('Logged out successfully', 'info');
    updateAuthUI();
});

// Local Storage Helpers
function saveToLocal() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
}

async function loadFromLocal() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        applications = JSON.parse(saved);
        renderTables();
        updateStats();
        updateMotivation();
    }
    
    // Try to load from server
    try {
        const response = await fetch('/api/data');
        if (response.ok) {
            const data = await response.json();
            if (data.applications && data.applications.length > 0) {
                applications = data.applications;
                saveToLocal();
                renderTables();
                updateStats();
                updateMotivation();
                console.log('Synced with backend file storage.');
            }
        }
    } catch (e) {
        console.warn('Backend server not detected, using local storage.');
    }
}

async function saveToBackend(application) {
    try {
        await fetch('/api/applications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ application })
        });
    } catch (e) {
        console.warn('Could not save to backend file.');
    }
}

async function deleteFromBackend(id) {
    try {
        await fetch(`/api/applications/${id}`, {
            method: 'DELETE'
        });
    } catch (e) {
        console.warn('Could not delete from backend file.');
    }
}

// UI Elements
const views = document.querySelectorAll('.view');
const navItems = document.querySelectorAll('.nav-item');
const appForm = document.getElementById('app-form');
const fullTableBody = document.querySelector('#full-table tbody');
const recentTableBody = document.querySelector('#recent-table tbody');
const searchInput = document.getElementById('search-input');
const statusFilter = document.getElementById('status-filter');
const notificationContainer = document.getElementById('notification-container');
const activityGrid = document.getElementById('activity-grid');

// View Switcher
function switchView(viewId) {
    views.forEach(view => view.classList.remove('active'));
    navItems.forEach(item => item.classList.remove('active'));
    
    const targetView = document.getElementById(`${viewId}-view`);
    const targetNav = document.querySelector(`[data-view="${viewId}"]`);
    
    if (targetView) targetView.classList.add('active');
    if (targetNav) targetNav.classList.add('active');
}

navItems.forEach(item => {
    item.addEventListener('click', () => {
        const view = item.getAttribute('data-view');
        if (view) switchView(view);
    });
});

// Stats Calculator
function updateStats() {
    const stats = {
        'Applied': 0,
        'Interviewing': 0,
        'Offer': 0,
        'Rejected': 0,
        'Online Assessment': 0,
        'Ghosted': 0
    };

    applications.forEach(app => {
        if (stats[app.status] !== undefined) {
            stats[app.status]++;
        }
    });

    document.getElementById('stats-applied').textContent = stats['Applied'] + stats['Online Assessment'];
    document.getElementById('stats-interview').textContent = stats['Interviewing'];
    document.getElementById('stats-decision').textContent = stats['Offer'];
    document.getElementById('stats-rejected').textContent = stats['Rejected'];
    
    // Update Countdown
    const today = new Date();
    const diffTime = SEASON_END_DATE - today;
    const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    document.getElementById('countdown-days').textContent = `${diffDays} Days Left`;
}

// Render Activity Grid (LeetCode style)
function renderActivityGrid() {
    if (!activityGrid) return;
    activityGrid.innerHTML = '';
    
    const today = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(today.getMonth() - 6);
    
    // Find the first Sunday before or on sixMonthsAgo
    const startDate = new Date(sixMonthsAgo);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    
    // Map of date string to count
    const activityMap = {};
    applications.forEach(app => {
        const d = new Date(app.date_applied);
        if (d instanceof Date && !isNaN(d)) {
            const dateStr = d.toDateString();
            activityMap[dateStr] = (activityMap[dateStr] || 0) + 1;
        }
    });

    // Create 26 weeks (182 days approx)
    for (let i = 0; i < 26 * 7; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        
        const cell = document.createElement('div');
        cell.className = 'cell';
        
        const count = activityMap[currentDate.toDateString()] || 0;
        let level = 0;
        if (count > 0) level = 1;
        if (count > 2) level = 2;
        if (count > 4) level = 3;
        if (count > 6) level = 4;
        
        cell.classList.add(`level-${level}`);
        cell.title = `${currentDate.toDateString()}: ${count} applications`;
        
        // Don't show future dates
        if (currentDate > today) {
            cell.style.opacity = '0.1';
        }
        
        activityGrid.appendChild(cell);
    }
}

// Render Tables
function renderTables(data = applications) {
    // Sort by date (descending)
    const sortedData = [...data].sort((a, b) => new Date(b.date_applied) - new Date(a.date_applied));

    // Full Table
    fullTableBody.innerHTML = '';
    sortedData.forEach(app => {
        const row = document.createElement('tr');
        const statusClass = app.status?.toLowerCase().replace(/\s+/g, '-') || '';
        row.innerHTML = `
            <td>${app.company || ''}</td>
            <td>${app.role || ''}</td>
            <td>${app.date_applied || ''}</td>
            <td><span class="status-pill ${statusClass}">${app.status || ''}</span></td>
            <td><a href="${app.job_link || app.link || '#'}" target="_blank" class="action-btn"><i class="fas fa-external-link-alt"></i></a></td>
            <td>${app.resume_link || app.resume ? `<a href="${app.resume_link || app.resume}" target="_blank" class="action-btn"><i class="fas fa-file-pdf"></i></a>` : '-'}</td>
            <td class="notes-cell" title="${app.notes || ''}">${app.notes ? (app.notes.substring(0, 20) + '...') : ''}</td>
            <td>
                <button class="action-btn" onclick="deleteApp('${app.id}')"><i class="fas fa-trash"></i></button>
            </td>
        `;
        fullTableBody.appendChild(row);
    });

    // Recent Table (last 5)
    recentTableBody.innerHTML = '';
    const recent = sortedData.slice(0, 5);
    recent.forEach(app => {
        const row = document.createElement('tr');
        const statusClass = app.status?.toLowerCase().replace(/\s+/g, '-') || '';
        row.innerHTML = `
            <td>${app.company || ''}</td>
            <td>${app.role || ''}</td>
            <td>${app.date_applied || ''}</td>
            <td><span class="status-pill ${statusClass}">${app.status || ''}</span></td>
        `;
        recentTableBody.appendChild(row);
    });
    
    renderActivityGrid();
}

// Notification System
function showNotification(message, type = 'success') {
    const note = document.createElement('div');
    note.className = `notification ${type}`;
    note.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    notificationContainer.appendChild(note);
    setTimeout(() => {
        note.classList.add('out');
        setTimeout(() => note.remove(), 500);
    }, 3000);
}

// Form Submission
appForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const newApp = {
        id: Date.now().toString(),
        company: document.getElementById('company').value,
        role: document.getElementById('role').value,
        date_applied: document.getElementById('date').value,
        status: document.getElementById('status').value,
        job_link: document.getElementById('link').value,
        resume_link: document.getElementById('resume').value,
        notes: document.getElementById('notes').value
    };

    applications.push(newApp);
    saveToLocal();
    saveToBackend(newApp); // Save to file
    
    renderTables();
    updateStats();
    updateMotivation();
    appForm.reset();
    document.getElementById('date').valueAsDate = new Date();
    
    switchView('dashboard');
    showNotification('Application saved and synced!');

    // Optional: Try to sync to Google Sheets in background
    syncToCloud('add', newApp);
});

// Delete Application
window.deleteApp = (id) => {
    if (confirm('Are you sure you want to delete this application?')) {
        const deletedApp = applications.find(app => app.id === id);
        applications = applications.filter(app => app.id !== id);
        saveToLocal();
        deleteFromBackend(id); // Delete from file
        
        renderTables();
        updateStats();
        updateMotivation();
        showNotification('Application removed.', 'info');
        
        if (deletedApp) syncToCloud('delete', { id });
    }
};

// Motivation & Day Counter
function updateMotivation() {
    const today = new Date();
    document.getElementById('current-date').textContent = today.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });

    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    document.getElementById('quote-text').textContent = `"${randomQuote.text}" — ${randomQuote.author}`;
    
    // Day counter logic (Consecutive Days Active - LeetCode Style)
    if (applications.length > 0) {
        // Filter out invalid dates
        const validDates = applications
            .map(a => new Date(a.date_applied))
            .filter(d => d instanceof Date && !isNaN(d));

        if (validDates.length > 0) {
            const sortedDates = [...new Set(validDates.map(d => d.toDateString()))]
                .map(d => new Date(d))
                .sort((a, b) => b - a);
            
            let streak = 0;
            let checkDate = new Date(today.toDateString());
            
            const isToday = sortedDates[0]?.toDateString() === checkDate.toDateString();
            const yesterday = new Date(checkDate);
            yesterday.setDate(yesterday.getDate() - 1);
            const isYesterday = sortedDates[0]?.toDateString() === yesterday.toDateString();
            
            if (isToday || isYesterday) {
                const activeSet = new Set(sortedDates.map(d => d.toDateString()));
                let current = isToday ? checkDate : yesterday;
                
                while (activeSet.has(current.toDateString())) {
                    streak++;
                    current.setDate(current.getDate() - 1);
                }
            }
            hustleDays = streak;
        } else {
            hustleDays = 0;
        }
    } else {
        hustleDays = 0;
    }
    
    document.getElementById('hustle-days').textContent = `Streak: ${hustleDays}`;
    document.getElementById('streak-num').textContent = hustleDays;
}

// Cloud Sync (Optional/Background)
async function syncToCloud(action, data) {
    console.log(`Attempting cloud sync: ${action}`);
    try {
        await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, ...data })
        });
    } catch (e) {
        console.warn('Cloud sync failed, data is safe in localStorage.');
    }
}

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();
    document.getElementById('date').valueAsDate = new Date();
});

// Search & Filter
searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = applications.filter(app => 
        (app.company?.toLowerCase() || "").includes(term) || 
        (app.role?.toLowerCase() || "").includes(term)
    );
    renderTables(filtered);
});

statusFilter.addEventListener('change', (e) => {
    const filter = e.target.value;
    if (filter === 'All') {
        renderTables();
    } else {
        const filtered = applications.filter(app => app.status === filter);
        renderTables(filtered);
    }
});

// CSV Export (Robust Blob-based)
document.getElementById('export-btn').addEventListener('click', () => {
    if (applications.length === 0) {
        showNotification('No data to export!', 'error');
        return;
    }
    
    const headers = ['ID', 'Company', 'Role', 'Date Applied', 'Status', 'Job Link', 'Resume Link', 'Notes'];
    const csvRows = [headers.join(',')];
    
    applications.forEach(app => {
        const row = [
            app.id,
            `"${(app.company || "").replace(/"/g, '""')}"`,
            `"${(app.role || "").replace(/"/g, '""')}"`,
            app.date_applied || "",
            app.status || "",
            `"${(app.job_link || app.link || "").replace(/"/g, '""')}"`,
            `"${(app.resume_link || app.resume || "").replace(/"/g, '""')}"`,
            `"${(app.notes || "").replace(/\n/g, ' ').replace(/"/g, '""')}"`
        ];
        csvRows.push(row.join(','));
    });
    
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `coop_tracker_backup_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showNotification('Exported successfully!');
});

// Import Logic
document.getElementById('import-btn').addEventListener('click', () => {
    document.getElementById('import-file').click();
});

document.getElementById('import-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const csv = event.target.result;
            const lines = csv.split('\n');
            const newApps = [];
            
            // Simple CSV parser that handles quoted values with commas
            const parseCSVLine = (text) => {
                const results = [];
                let current = '';
                let inQuotes = false;
                for (let i = 0; i < text.length; i++) {
                    const char = text[i];
                    if (char === '"') {
                        if (inQuotes && text[i+1] === '"') {
                            current += '"';
                            i++;
                        } else {
                            inQuotes = !inQuotes;
                        }
                    } else if (char === ',' && !inQuotes) {
                        results.push(current);
                        current = '';
                    } else {
                        current += char;
                    }
                }
                results.push(current);
                return results;
            };

            // Skip header
            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                const cols = parseCSVLine(lines[i]);
                if (cols.length >= 5) {
                    newApps.push({
                        id: cols[0] || Date.now().toString() + i,
                        company: cols[1] || 'Imported',
                        role: cols[2] || '',
                        date_applied: cols[3] || '',
                        status: cols[4] || 'Applied',
                        job_link: cols[5] || '',
                        resume_link: cols[6] || '',
                        notes: cols[7] || ''
                    });
                }
            }
            
            if (newApps.length > 0) {
                if (confirm(`Import ${newApps.length} applications? This will merge with your current data.`)) {
                    applications = [...applications, ...newApps];
                    saveToLocal();
                    renderTables();
                    updateStats();
                    updateMotivation();
                    showNotification(`Imported ${newApps.length} applications!`);
                }
            }
        } catch (err) {
            console.error(err);
            showNotification('Error importing CSV', 'error');
        }
    };
    reader.readAsText(file);
});
