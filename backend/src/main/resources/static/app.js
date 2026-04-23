const API_BASE = 'http://localhost:8080/api';
let token = localStorage.getItem('ar_token');
let userRole = '';
let currentUsername = '';
let currentNotes = [];
let noteUnderEdit = null;

// Extracted DOM hooks
const UI = {
    authContainer: document.getElementById('auth-container'),
    appContainer: document.getElementById('app-container'),
    loginError: document.getElementById('login-error'),
    roleBadge: document.getElementById('current-user-badge'),

    navDashboard: document.getElementById('nav-dashboard'),
    navAnalytics: document.getElementById('nav-analytics'),
    navUsers: document.getElementById('nav-users'),
    navLogout: document.getElementById('nav-logout'),

    viewDashboard: document.getElementById('view-dashboard'),
    viewAnalytics: document.getElementById('view-analytics'),
    viewUsers: document.getElementById('view-users'),

    // TL Specifics
    tlElements: document.querySelectorAll('.tl-only'),
    btnExportCsv: document.getElementById('btn-export-csv'),
    btnAddNote: document.getElementById('btn-add-note'),

    notesTbody: document.getElementById('notes-tbody'),
    filterEndAction: document.getElementById('filter-endaction'),

    // Modals
    noteModal: document.getElementById('note-modal'),
    modalTitle: document.getElementById('modal-title'),
    btnSaveClaim: document.getElementById('btn-save-claim'),
    historyFeed: document.getElementById('history-feed'),

    allocateModal: document.getElementById('allocate-modal'),
    assignSelect: document.getElementById('user-assign-select'),
    allocateClaimId: document.getElementById('allocate-claim-id')
};

// Initializer
function init() {
    if (token) {
        parseToken();
        showApp();
        fetchNotes();
        if(userRole === 'ROLE_TL') fetchUsersForAllocation();
    } else {
        showAuth();
    }
}

function parseToken() {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        userRole = payload.role || 'ROLE_USER';
        currentUsername = payload.sub || 'User';
        UI.roleBadge.textContent = currentUsername + ' (' + (userRole === 'ROLE_TL' ? 'Team Leader' : 'GMS - Guide House') + ')';
        
        UI.tlElements.forEach(el => {
            el.style.display = userRole === 'ROLE_TL' ? '' : 'none';
        });
    } catch(e) {
        token = null; showAuth();
    }
}

// Nav Setup
function showAuth() { UI.authContainer.style.display = 'block'; UI.appContainer.style.display = 'none'; }
function showApp() { UI.authContainer.style.display = 'none'; UI.appContainer.style.display = 'flex'; }
function switchView(tabId, viewId) {
    [UI.navDashboard, UI.navAnalytics, UI.navUsers].forEach(n => n.classList.remove('active'));
    [UI.viewDashboard, UI.viewAnalytics, UI.viewUsers].forEach(v => v.style.display = 'none');
    document.getElementById(tabId).classList.add('active');
    document.getElementById(viewId).style.display = 'block';
}

UI.navDashboard.addEventListener('click', () => { switchView('nav-dashboard', 'view-dashboard'); fetchNotes(); });
UI.navAnalytics.addEventListener('click', () => { switchView('nav-analytics', 'view-analytics'); fetchAnalytics(); });
UI.navUsers.addEventListener('click', () => switchView('nav-users', 'view-users'));
UI.navLogout.addEventListener('click', () => { localStorage.removeItem('ar_token'); token = null; showAuth(); });

// Auth & API Call wrapper
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    try {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({username, password})
        });
        if(res.ok) {
            const data = await res.json();
            token = data.token; localStorage.setItem('ar_token', token);
            UI.loginError.textContent = ''; init();
        } else UI.loginError.textContent = 'Invalid credentials';
    } catch(err) { UI.loginError.textContent = 'Connection error'; }
});

async function apiCall(endpoint, method = 'GET', body = null, isText = false) {
    const headers = { 'Authorization': `Bearer ${token}` };
    if(body) headers['Content-Type'] = 'application/json';
    const res = await fetch(`${API_BASE}${endpoint}`, { method, headers, body: body ? JSON.stringify(body) : null });
    
    if (res.status === 401 || res.status === 403) { localStorage.removeItem('ar_token'); location.reload(); }
    if (!res.ok && res.status !== 204) throw new Error("API Error");
    if (res.status === 204) return null;
    return isText ? res.text() : res.json();
}

// User Management (TL Only)
document.getElementById('create-user-form').addEventListener('submit', async(e) => {
    e.preventDefault();
    try {
        await apiCall('/users', 'POST', {
            username: document.getElementById('new-username').value,
            password: document.getElementById('new-password').value,
            role: document.getElementById('new-role').value
        });
        document.getElementById('user-msg').textContent = "User created successfully!";
        fetchUsersForAllocation();
    } catch(e) {}
});

async function fetchUsersForAllocation() {
    try {
        const users = await apiCall('/users');
        UI.assignSelect.innerHTML = '';
        users.forEach(u => {
            if(u.role === 'ROLE_USER') {
                const opt = document.createElement('option');
                opt.value = u.id; opt.textContent = u.username;
                UI.assignSelect.appendChild(opt);
            }
        });
    } catch(e) {}
}

const formatCurrency = (amt) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amt);

// Note Dashboard
async function fetchNotes() {
    try {
        currentNotes = await apiCall('/notes');
        renderNotes();
    } catch (err) { }
}

UI.filterEndAction.addEventListener('change', renderNotes);

function renderNotes() {
    UI.notesTbody.innerHTML = '';
    const filterText = UI.filterEndAction.value.toLowerCase();
    
    currentNotes.filter(n => filterText === '' || (n.endAction && n.endAction.toLowerCase() === filterText))
    .forEach(note => {
        const tr = document.createElement('tr');
        const assignedName = note.allocatedTo ? note.allocatedTo.username : 'Unassigned';
        
        tr.innerHTML = `
            <td>${note.id}</td>
            <td>${note.callerId}</td>
            <td>${note.dos}</td>
            <td>${note.fin}</td>
            <td>${note.insurance || 'N/A'}</td>
            <td>${formatCurrency(note.billedAmount)}</td>
            <td><strong style="color: ${note.balance > 0 ? 'var(--status-pending)' : 'var(--status-completed)'}">${formatCurrency(note.balance)}</strong></td>
            <td>${note.endAction || ''}</td>
            <td><span class="badge ${note.status.toLowerCase()}">${note.status}</span></td>
            ${userRole === 'ROLE_TL' ? `<td>${assignedName}</td>` : ''}
            <td>
                <button class="btn btn-sm btn-secondary" onclick="openClaim(${note.id})">Review/Work</button>
                ${userRole === 'ROLE_TL' ? `<button class="btn btn-sm btn-primary" onclick="openAllocate(${note.id})">Assign</button>` : ''}
            </td>
        `;
        UI.notesTbody.appendChild(tr);
    });
}

// Modal Form & Note Data
UI.btnAddNote.addEventListener('click', () => {
    noteUnderEdit = null;
    document.getElementById('note-form').reset();
    document.getElementById('note-id').value = '';
    UI.historyFeed.innerHTML = '<p style="color:var(--text-secondary)">Save claim to start adding history.</p>';
    UI.noteModal.style.display = 'flex';
});

document.getElementById('btn-close-modal').addEventListener('click', () => UI.noteModal.style.display = 'none');

document.getElementById('note-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        callerId: document.getElementById('callerId').value,
        insurance: document.getElementById('insurance').value,
        dos: document.getElementById('dos').value,
        fin: document.getElementById('fin').value,
        billedAmount: parseFloat(document.getElementById('billedAmount').value),
        balance: parseFloat(document.getElementById('balance').value),
        status: document.getElementById('status').value,
        endAction: document.getElementById('endAction').value
    };
    
    const id = document.getElementById('note-id').value;
    try {
        if(id) await apiCall(`/notes/${id}`, 'PUT', payload);
        else {
            await apiCall('/notes', 'POST', payload);
            UI.noteModal.style.display = 'none';
        }
        fetchNotes();
        alert("Claim Saved!");
    } catch(err) { alert("Failed to save claim"); }
});

function openClaim(id) {
    noteUnderEdit = currentNotes.find(n => n.id === id);
    if(!noteUnderEdit) return;
    
    document.getElementById('note-id').value = noteUnderEdit.id;
    document.getElementById('callerId').value = noteUnderEdit.callerId;
    document.getElementById('insurance').value = noteUnderEdit.insurance || '';
    document.getElementById('dos').value = noteUnderEdit.dos;
    document.getElementById('fin').value = noteUnderEdit.fin;
    document.getElementById('billedAmount').value = noteUnderEdit.billedAmount;
    document.getElementById('balance').value = noteUnderEdit.balance;
    document.getElementById('status').value = noteUnderEdit.status;
    document.getElementById('endAction').value = noteUnderEdit.endAction || 'none';
    
    renderHistory(noteUnderEdit.history || []);
    UI.noteModal.style.display = 'flex';
}

function renderHistory(histArray) {
    UI.historyFeed.innerHTML = '';
    if(histArray.length === 0) {
        UI.historyFeed.innerHTML = '<p>No history yet.</p>'; return;
    }
    // sorting by created at ascending 
    histArray.sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt)).forEach(h => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `
            <div class="history-meta">
                <strong>${h.username}</strong>
                <span>${new Date(h.createdAt).toLocaleString()}</span>
            </div>
            <div class="history-text">${h.noteText}</div>
            <div class="history-action">Action Set: ${h.actionTaken || 'None'}</div>
        `;
        UI.historyFeed.appendChild(div);
    });
    UI.historyFeed.scrollTop = UI.historyFeed.scrollHeight;
}

document.getElementById('add-history-form').addEventListener('submit', async(e) => {
    e.preventDefault();
    if(!noteUnderEdit) return;
    const text = document.getElementById('history-note').value;
    const action = document.getElementById('endAction').value;
    
    try {
        await apiCall(`/notes/${noteUnderEdit.id}/history`, 'POST', { noteText: text, actionTaken: action });
        document.getElementById('history-note').value = '';
        fetchNotes(); // reload main table to fetch updated history
        setTimeout(() => openClaim(noteUnderEdit.id), 200); // re-open current with new data
    } catch(err) { alert("Failed to append history"); }
});

// TL Allocation View
function openAllocate(id) {
    UI.allocateClaimId.value = id;
    UI.allocateModal.style.display = 'flex';
}

async function submitAllocation() {
    const noteId = UI.allocateClaimId.value;
    const userId = UI.assignSelect.value;
    if(!userId) return alert("No user selected");
    
    try {
        await apiCall(`/notes/${noteId}/allocate/${userId}`, 'PUT');
        UI.allocateModal.style.display = 'none';
        fetchNotes();
    } catch(e) { alert("Failed to allocate"); }
}

// TL CSV Export
UI.btnExportCsv.addEventListener('click', async () => {
    try {
        const csvText = await apiCall('/notes/export', 'GET', null, true);
        const blob = new Blob([csvText], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('href', url);
        a.setAttribute('download', 'gms.csv');
        a.click();
    } catch(e) { alert("Export failed"); }
});

// Analytics (Placeholder using similar previous logic)
let chart1, chart2;
async function fetchAnalytics() {
    try {
        const data = await apiCall('/notes/analytics');
        const rData = data.topPendingReasons;
        if(chart1) chart1.destroy();
        chart1 = new Chart(document.getElementById('reasonsChart').getContext('2d'), {
            type: 'doughnut', data: { labels: rData.map(r=>r.REASON), datasets: [{ data: rData.map(r=>r.COUNT), backgroundColor: ['#3b82f6', '#8b5cf6', '#ef4444'] }] },
            options: { plugins: { legend: { labels: { color: '#f8fafc' }}} }
        });
        
        const tData = data.balanceTrends;
        if(chart2) chart2.destroy();
        chart2 = new Chart(document.getElementById('trendsChart').getContext('2d'), {
            type: 'line', data: { labels: tData.map(t=>t.PERIOD), datasets: [{ label: 'Total Balance', data: tData.map(t=>t.TOTAL_BALANCE), borderColor: '#3b82f6' }] },
            options: { scales: { x: { ticks: {color: '#fff'} }, y: { ticks: {color: '#fff'} } } }
        });
    } catch (err) {}
}

init();
