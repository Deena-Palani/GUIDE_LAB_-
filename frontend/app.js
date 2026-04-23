const API_BASE = 'http://localhost:8080/api';
let token = localStorage.getItem('ar_token');

const UI = {
    authContainer: document.getElementById('auth-container'),
    appContainer: document.getElementById('app-container'),
    loginError: document.getElementById('login-error')
};

function init() {
    if (token) {
        UI.authContainer.style.display = 'none';
        UI.appContainer.style.display = 'block';
        fetchCallLogs();
        renderDirectory();
    } else {
        UI.authContainer.style.display = 'block';
        UI.appContainer.style.display = 'none';
    }
}

// Auth
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
    } catch(err) { UI.loginError.textContent = 'Connection error. Ensure backend is running.'; }
});

async function apiCall(endpoint, method = 'GET', body = null) {
    const headers = { 'Authorization': `Bearer ${token}` };
    if(body) headers['Content-Type'] = 'application/json';
    const res = await fetch(`${API_BASE}${endpoint}`, { method, headers, body: body ? JSON.stringify(body) : null });
    
    if (res.status === 401 || res.status === 403) { localStorage.removeItem('ar_token'); location.reload(); }
    if (!res.ok && res.status !== 204) throw new Error("API Error");
    if (res.status === 204) return null;
    return res.json();
}

// ------------------------------------------
// Navigation Logic
// ------------------------------------------
const tabs = ['tfl', 'dos', 'denial', 'callog', 'prod', 'time', 'julian'];

tabs.forEach(tab => {
    document.getElementById(`tab-${tab}`).addEventListener('click', (e) => {
        e.preventDefault();
        // Reset actives
        tabs.forEach(t => {
            document.getElementById(`tab-${t}`).classList.remove('active');
            document.getElementById(`view-${t}`).style.display = 'none';
        });
        // Set active
        document.getElementById(`tab-${tab}`).classList.add('active');
        document.getElementById(`view-${tab}`).style.display = 'block';
        
        if(tab === 'callog') fetchCallLogs();
    });
});

// ------------------------------------------
// 1. TFL Calculator
// ------------------------------------------
window.calculateTfl = function() {
    const dos = document.getElementById('tfl-dos').value;
    const limit = parseInt(document.getElementById('tfl-limit').value);
    const format = document.getElementById('tfl-format') ? document.getElementById('tfl-format').value : 'MM/DD/YYYY';
    const box = document.getElementById('tfl-result');
    if(!dos || isNaN(limit)) { box.innerHTML='--'; return; }
    
    const d = new Date(dos);
    if(isNaN(d.getTime())) { box.innerHTML='<span style="font-size: 1.25rem; color: var(--accent-danger);">Invalid Date</span>'; return; }
    
    d.setDate(d.getDate() + limit);
    
    let formattedDate = "";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    
    if (format === 'MM/DD/YYYY') {
        formattedDate = `${mm}/${dd}/${yyyy}`;
    } else if (format === 'DD/MM/YYYY') {
        formattedDate = `${dd}/${mm}/${yyyy}`;
    } else if (format === 'WORD') {
        const options = { year: 'numeric', month: 'long', day: '2-digit' };
        formattedDate = d.toLocaleDateString('en-US', options);
    } else if (format === 'DAY_WORD') {
        formattedDate = d.toDateString();
    }
    
    box.innerHTML = `<span style="user-select: all; cursor: pointer; background: rgba(255,255,255,0.05); padding: 0.2rem 0.4rem; border-radius: 4px;" title="Double-click to copy">${formattedDate}</span>`;
};

// ------------------------------------------
// 2. DOS Range Calculator
// ------------------------------------------
window.calculateDosRange = function() {
    const start = document.getElementById('dos-start').value;
    const end = document.getElementById('dos-end').value;
    const box = document.getElementById('dos-result');
    if(!start || !end) { box.innerHTML='--'; return; }
    
    const d1 = new Date(start);
    const d2 = new Date(end);
    
    if(isNaN(d1.getTime()) || isNaN(d2.getTime())) { 
        box.innerHTML='<span style="font-size: 1.25rem; color: var(--accent-danger);">Invalid Date</span>'; 
        return; 
    }
    
    const diffTime = Math.abs(d2 - d1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    box.innerHTML = `<span style="user-select: all; cursor: pointer; background: rgba(255,255,255,0.05); padding: 0.2rem 0.4rem; border-radius: 4px;" title="Double-click to copy">${diffDays} Days</span>`;
};

// ------------------------------------------
// 3. Denial Reason Analyzer
// ------------------------------------------
const denialDB = {
    "CO-4": { desc: "The procedure code is inconsistent with the modifier used or a required modifier is missing.", action: "Review claim for missing/invalid modifiers (e.g., 25, 59). Bind correct modifier and rebill." },
    "CO-11": { desc: "The diagnosis is inconsistent with the procedure.", action: "Check medical records. Ensure ICD-10 supports CPT. Consult coding team if necessary." },
    "CO-16": { desc: "Claim/service lacks information or has submission/billing error(s).", action: "Review clearinghouse report or rejection details for missing info." },
    "CO-18": { desc: "Duplicate claim/service.", action: "Verify if previous claim paid. If not, check if same DOS/CPT. Submit appeal with notes if distinct service." },
    "CO-22": { desc: "This care may be covered by another payer per coordination of benefits.", action: "Check patient file for Primary/Secondary insurance details. Bill appropriate payer." },
    "CO-29": { desc: "The time limit for filing has expired.", action: "Gather proof of timely filing. Submit appeal." },
    "PR-1": { desc: "Deductible Amount.", action: "Bill patient for their deductible responsibility." },
    "PR-50": { desc: "These are non-covered services because this is not deemed a 'medical necessity'.", action: "Review medical records. If medically necessary, appeal with medical records and Letter of Medical Necessity." }
};

document.getElementById('denial-search').addEventListener('input', (e) => {
    const val = e.target.value.toUpperCase().trim();
    const resBox = document.getElementById('denial-result');
    if(val && denialDB[val]) {
        document.getElementById('denial-code').textContent = val;
        document.getElementById('denial-desc').textContent = denialDB[val].desc;
        document.getElementById('denial-action').textContent = denialDB[val].action;
        resBox.style.display = 'block';
    } else {
        resBox.style.display = 'none';
    }
});

// ------------------------------------------
// 4. Payer Call Log & Phone Directory
// ------------------------------------------
const payerDirectory = {
    "Medicare": { id: "MED01", tfl: "365", ccfl: "365", appealTfl: "120", mailAddress: "Medicare Part B\nPO Box 1234\nFargo, ND 58127", ccMail: "Medicare Claims\nPO Box 5678\nFargo, ND 58127", appealMail: "Medicare Appeals\nPO Box 9101\nFargo, ND 58127", fax: "1-800-444-0001", email: "N/A (Use Portal)", phone: "1-800-MEDICARE", quickReach: "1* 2* 1*" },
    "BCBS TX": { id: "BCBS-TX", tfl: "180", ccfl: "180", appealTfl: "180", mailAddress: "BCBS Claims\nPO Box 660058\nDallas, TX 75266", ccMail: "BCBS CC\nPO Box 660555\nDallas, TX 75266", appealMail: "BCBS Appeals\nPO Box 660999\nDallas, TX 75266", fax: "888-222-3333", email: "provider.bcbs.com", phone: "1-800-451-0287", quickReach: "1* 1* 2* 3*" },
    "UHC": { id: "87726", tfl: "90", ccfl: "90", appealTfl: "365", mailAddress: "UHC Claims\nPO Box 30555\nSalt Lake City, UT 84130", ccMail: "UHC Recons\nPO Box 30556\nSalt Lake City, UT 84130", appealMail: "UHC Appeals\nPO Box 30557\nSalt Lake City, UT 84130", fax: "888-333-4444", email: "uhcprovider.com", phone: "1-877-842-3210", quickReach: "2* 4* 1*" },
    "Aetna": { id: "60054", tfl: "90", ccfl: "90", appealTfl: "180", mailAddress: "Aetna Claims\nPO Box 14079\nLexington, KY 40512", ccMail: "Aetna Claims\nPO Box 14079\nLexington, KY 40512", appealMail: "Aetna Appeals\nPO Box 14079\nLexington, KY 40512", fax: "888-555-6666", email: "aetna.com/provider", phone: "1-888-632-3862", quickReach: "1* 2*" },
    "Cigna": { id: "62308", tfl: "180", ccfl: "180", appealTfl: "180", mailAddress: "Cigna Claims\nPO Box 182223\nChattanooga, TN 37422", ccMail: "Cigna Claims\nPO Box 182223\nChattanooga, TN 37422", appealMail: "Cigna Appeals\nPO Box 182223\nChattanooga, TN 37422", fax: "888-777-8888", email: "cignaforhcp.com", phone: "1-800-882-4462", quickReach: "1* 3* 1*" },
    "Humana": { id: "61101", tfl: "180", ccfl: "180", appealTfl: "180", mailAddress: "Humana Claims\nPO Box 14601\nLexington, KY 40512", ccMail: "Humana Recons\nPO Box 14601\nLexington, KY 40512", appealMail: "Humana Appeals\nPO Box 14601\nLexington, KY 40512", fax: "888-111-2222", email: "humana.com/provider", phone: "1-800-448-6262", quickReach: "2* 1* 4*" }
};

window.renderDirectory = function() {
    const q = document.getElementById('dir-search').value.toLowerCase();
    const list = document.getElementById('dir-list');
    list.innerHTML = Object.keys(payerDirectory)
        .filter(k => k.toLowerCase().includes(q))
        .map(k => `<button class="btn btn-secondary" style="text-align: left; padding: 0.75rem 1rem; margin: 0; background: rgba(255,255,255,0.05); border: 1px solid transparent;" onclick="selectPayer('${k}')">${k}</button>`)
        .join('');
};

window.selectPayer = function(key) {
    const p = payerDirectory[key];
    if(!p) return;
    
    document.getElementById('dir-placeholder').style.display = 'none';
    document.getElementById('dir-details').style.display = 'block';
    
    document.getElementById('dd-name').textContent = key;
    document.getElementById('dd-id').textContent = p.id;
    document.getElementById('dd-phone').textContent = p.phone;
    document.getElementById('dd-fax').textContent = p.fax;
    document.getElementById('dd-tfl').textContent = p.tfl + ' Days';
    document.getElementById('dd-ccfl').textContent = p.ccfl + ' Days';
    document.getElementById('dd-appeal-tfl').textContent = p.appealTfl + ' Days';
    document.getElementById('dd-mail').textContent = p.mailAddress;
    document.getElementById('dd-cc-mail').textContent = p.ccMail;
    document.getElementById('dd-appeal-mail').textContent = p.appealMail;
    document.getElementById('dd-email').textContent = p.email;
    
    document.getElementById('cl-payer').value = key;
    document.getElementById('cl-rep').value = p.phone;
    document.getElementById('cl-ref').value = p.quickReach;
};
async function fetchCallLogs() {
    try {
        const calls = await apiCall('/call-logs');
        const feed = document.getElementById('call-log-feed');
        feed.innerHTML = '';
        if(calls.length === 0) {
            feed.innerHTML = '<p>No recent calls.</p>'; return;
        }
        calls.forEach(c => {
            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `
                <div class="history-meta">${new Date(c.callDate).toLocaleString()}</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 0.5rem; background: rgba(0,0,0,0.1); padding: 0.75rem; border-radius: 6px;">
                    <div><span style="color: var(--text-secondary); font-size: 0.8rem; text-transform: uppercase;">INS Name</span><div style="font-weight: 500;">${c.payerName}</div></div>
                    <div><span style="color: var(--text-secondary); font-size: 0.8rem; text-transform: uppercase;">PH Number</span><div style="font-weight: 500;">${c.repName}</div></div>
                    <div style="grid-column: span 2;"><span style="color: var(--text-secondary); font-size: 0.8rem; text-transform: uppercase;">Quick Reach</span><div style="font-weight: 500;">${c.callReference}</div></div>
                </div>
                <div style="margin-top: 0.75rem; white-space:pre-wrap; padding-left: 0.25rem;">${c.notes}</div>
            `;
            feed.appendChild(div);
        });
    } catch(err) { }
}

document.getElementById('call-log-form').addEventListener('submit', async(e) => {
    e.preventDefault();
    const payload = {
        payerName: document.getElementById('cl-payer').value,
        repName: document.getElementById('cl-rep').value,
        callReference: document.getElementById('cl-ref').value,
        fin: "",
        notes: document.getElementById('cl-notes').value
    };
    try {
        await apiCall('/call-logs', 'POST', payload);
        document.getElementById('call-log-form').reset();
        fetchCallLogs();
    } catch(err) { alert("Failed to save call log"); }
});

// ------------------------------------------
// 5. Daily Production Counter
// ------------------------------------------
window.updateProdUI = function() {
    let target = parseInt(document.getElementById('prod-target').value) || 1;
    let achieved = parseInt(document.getElementById('prod-achieved').value) || 0;
    
    let perc = (achieved / target) * 100;
    if(perc > 100) perc = 100;
    
    document.getElementById('prod-text').textContent = `${achieved} / ${target} Claims (${Math.round(perc)}%)`;
    document.getElementById('prod-fill').style.width = `${perc}%`;
};
updateProdUI();

// ------------------------------------------
// 6. Login Time & Break Tracker
// ------------------------------------------
const TARGET_WORK_SEC = 8 * 3600 + 15 * 60; // 8.25 hours
const TARGET_BREAK_SEC = 1 * 3600 + 15 * 60; // 1.25 hours

let timerInterval = null;
let breakInterval = null;

let currentSeconds = 0; // work seconds
let currentBreakSec = 0; // total break seconds cumulative
let thisBreakSec = 0; // specific break session timer
let breaksList = [];

let timerState = 'OUT'; // OUT, WORK, BREAK

function formatTime(sec) {
    if (sec < 0) sec = 0;
    const h = Math.floor(sec/3600).toString().padStart(2, '0');
    const m = Math.floor((sec%3600)/60).toString().padStart(2, '0');
    const s = (sec%60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}

async function logTimeEvent(event, reason = '') {
    try {
        await apiCall(`/time-tracker?event=${event}&reason=${encodeURIComponent(reason)}`, 'POST');
    } catch(err) {}
}

function updateTimerDisplay() { 
    document.getElementById('timer-display').textContent = formatTime(currentSeconds); 
    document.getElementById('time-left').textContent = formatTime(TARGET_WORK_SEC - currentSeconds);
}

function tick() { 
    currentSeconds++; 
    updateTimerDisplay(); 
}

function tickBreak() {
    currentBreakSec++;
    thisBreakSec++;
    document.getElementById('break-left').textContent = formatTime(TARGET_BREAK_SEC - currentBreakSec);
    const ttStatus = document.getElementById('timer-status');
    ttStatus.textContent = `Status: On Break (${formatTime(thisBreakSec)})`;
}

function renderBreaks() {
    document.getElementById('break-count').textContent = breaksList.length;
    const listEl = document.getElementById('break-list');
    if(breaksList.length === 0) {
        listEl.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.9em;">No breaks taken yet.</p>';
        return;
    }
    listEl.innerHTML = breaksList.map((b, i) => `
        <div style="background: rgba(255,255,255,0.05); padding: 0.75rem; margin-bottom: 0.5rem; border-radius: 6px; font-size: 0.9em; border-left: 3px solid var(--accent-danger);">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                <strong style="color: var(--text-primary);">Break #${i+1}</strong>
                <span style="color: var(--accent-danger); font-weight: 500;">${b.duration}</span>
            </div>
            <div style="color: var(--text-secondary); white-space: pre-wrap; font-size: 0.85em;">${b.reason}</div>
        </div>
    `).join('');
}

const btnPunchIn = document.getElementById('btn-punch-in');
const btnBreak = document.getElementById('btn-break');
const btnPunchOut = document.getElementById('btn-punch-out');
const ttStatus = document.getElementById('timer-status');
const breakReasonContainer = document.getElementById('break-reason-container');
const breakReasonInput = document.getElementById('break-reason');
const btnSubmitBreak = document.getElementById('btn-submit-break');

btnPunchIn.addEventListener('click', () => {
    logTimeEvent('LOGIN');
    timerState = 'WORK';
    ttStatus.textContent = "Status: Working";
    btnPunchIn.disabled = true;
    btnBreak.disabled = false;
    btnPunchOut.disabled = false;
    if(!timerInterval) timerInterval = setInterval(tick, 1000);
});

btnBreak.addEventListener('click', () => {
    if(timerState === 'WORK') {
        logTimeEvent('BREAK_START');
        timerState = 'BREAK';
        clearInterval(timerInterval);
        timerInterval = null;
        
        thisBreakSec = 0;
        breakInterval = setInterval(tickBreak, 1000);
        
        ttStatus.textContent = "Status: On Break (00:00:00)";
        btnPunchOut.disabled = true;
        btnBreak.disabled = true;
        
        breakReasonContainer.style.display = 'block';
    }
});

btnSubmitBreak.addEventListener('click', () => {
    const reason = breakReasonInput.value.trim();
    if(!reason) { alert("Please provide a reason for reference."); return; }
    
    clearInterval(breakInterval);
    breakInterval = null;
    
    breaksList.push({ reason, duration: formatTime(thisBreakSec) });
    renderBreaks();
    
    logTimeEvent('BREAK_END', reason);
    timerState = 'WORK';
    ttStatus.textContent = "Status: Working";
    breakReasonContainer.style.display = 'none';
    breakReasonInput.value = '';
    
    btnPunchOut.disabled = false;
    btnBreak.disabled = false;
    timerInterval = setInterval(tick, 1000);
});

btnPunchOut.addEventListener('click', () => {
    logTimeEvent('LOGOUT');
    timerState = 'OUT';
    clearInterval(timerInterval);
    timerInterval = null;
    currentSeconds = 0;
    
    updateTimerDisplay();
    ttStatus.textContent = "Status: Clocked Out";
    
    btnPunchIn.disabled = false;
    btnBreak.disabled = true;
    btnPunchOut.disabled = true;
});

// ------------------------------------------
// 7. Julian Calendar Calculator
// ------------------------------------------
window.fromJulian = function() {
    const jul = document.getElementById('julian-day').value;
    const yearStr = document.getElementById('julian-year').value;
    const format = document.getElementById('julian-format') ? document.getElementById('julian-format').value : 'DAY_WORD';
    const resultBox = document.getElementById('julian-result1');
    
    if(!jul) return;
    
    const day = parseInt(jul);
    const year = parseInt(yearStr);
    
    // Day 1 = Jan 1
    const d = new Date(year, 0, day);
    
    let formattedDate = "";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    
    if (format === 'MM/DD/YYYY') {
        formattedDate = `${mm}/${dd}/${yyyy}`;
    } else if (format === 'DD/MM/YYYY') {
        formattedDate = `${dd}/${mm}/${yyyy}`;
    } else if (format === 'WORD') {
        const options = { year: 'numeric', month: 'long', day: '2-digit' };
        formattedDate = d.toLocaleDateString('en-US', options);
    } else if (format === 'DAY_WORD') {
        formattedDate = d.toDateString();
    }
    
    resultBox.style.display = 'block';
    resultBox.innerHTML = `Standard Date: <strong>${formattedDate}</strong>`;
};

window.toJulian = function() {
    const std = document.getElementById('julian-standard').value;
    const resultBox = document.getElementById('julian-result2');
    if(!std) return;
    
    const d = new Date(std);
    // Note: User selected JS date creates UTC or Local based on format. For reliability:
    // If standard input value used directly:
    const start = new Date(d.getFullYear(), 0, 0);
    const diff = (d - start) + ((start.getTimezoneOffset() - d.getTimezoneOffset()) * 60 * 1000);
    const oneDay = 1000 * 60 * 60 * 24;
    const day = Math.floor(diff / oneDay);
    
    const julianStr = `${day.toString().padStart(3, '0')} (Year: ${d.getFullYear()})`;
    
    resultBox.style.display = 'block';
    resultBox.innerHTML = `Julian Day Number: <strong>${julianStr}</strong>`;
};

init();
