// SYSTÈME DE STOCKAGE LOCAL ROBUSTE
function safeGetItem(key, defaultValue = '[]') {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : JSON.parse(defaultValue);
    } catch (e) {
        return JSON.parse(defaultValue);
    }
}

function safeSetItem(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) {}
}

// MANAGEMENT NAVIGATION / POPUPS GLOBALES
const profileModal = document.getElementById('profile-modal');
const openProfileBtn = document.getElementById('open-profile-btn');
const closeProfileBtn = document.getElementById('close-profile-btn');
const cancelProfileBtn = document.getElementById('cancel-profile-btn');
const profileForm = document.getElementById('profile-form');
const tooltipElement = document.getElementById('chart-tooltip');
const calendarDayModal = document.getElementById('calendar-day-modal');

openProfileBtn.addEventListener('click', () => profileModal.classList.remove('hidden'));
closeProfileBtn.addEventListener('click', () => profileModal.classList.add('hidden'));
cancelProfileBtn.addEventListener('click', () => profileModal.classList.add('hidden'));

window.addEventListener('click', (e) => { 
    if (e.target === profileModal) profileModal.classList.add('hidden'); 
    if (e.target === calendarDayModal) calendarDayModal.classList.add('hidden');
});

// CYCLE DE VIE INITIALISATION DASHBOARD
document.addEventListener('DOMContentLoaded', () => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('current-date-display').innerText = new Date().toLocaleDateString('fr-FR', options);

    document.getElementById('c-date').valueAsDate = new Date();
    document.getElementById('w-date').valueAsDate = new Date();

    loadProfileData();
    initMacroControls();
    renderWeight();
    renderRecords();
    renderCalendar();
    renderCardio();
    updateSmartCoach();
    updateGamification();
});

profileForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const profileData = {
        gender: document.getElementById('gender').value,
        age: parseInt(document.getElementById('age').value),
        height: parseFloat(document.getElementById('height').value),
        activityLevel: parseFloat(document.getElementById('activity-level').value)
    };
    safeSetItem('userProfileBaseV2', profileData);
    profileModal.classList.add('hidden');
    recalculatePhysiqueAndCalories();
});

function loadProfileData() {
    const saved = safeGetItem('userProfileBaseV2', 'null');
    if (saved) {
        document.getElementById('gender').value = saved.gender;
        document.getElementById('age').value = saved.age;
        document.getElementById('height').value = saved.height;
        document.getElementById('activity-level').value = saved.activityLevel;
    }
}


// === GESTION INTERACTIVE HYBRIDE DES MACRONUTRIMENTS ===
const radioAuto = document.getElementById('macro-mode-auto');
const radioManual = document.getElementById('macro-mode-manual');
const inputProt = document.getElementById('input-macro-prot');
const inputFat = document.getElementById('input-macro-fat');
const inputCarb = document.getElementById('input-macro-carb');

function initMacroControls() {
    const mode = safeGetItem('macroConfigMode', '"auto"');
    if (mode === "manual") {
        radioManual.checked = true;
        setMacroInputsDisabled(false);
        const savedManual = safeGetItem('manualMacrosValues', '{"prot":0,"fat":0,"carb":0}');
        inputProt.value = savedManual.prot;
        inputFat.value = savedManual.fat;
        inputCarb.value = savedManual.carb;
    } else {
        radioAuto.checked = true;
        setMacroInputsDisabled(true);
    }

    radioAuto.addEventListener('change', () => handleMacroModeChange("auto"));
    radioManual.addEventListener('change', () => handleMacroModeChange("manual"));
    [inputProt, inputFat, inputCarb].forEach(i => i.addEventListener('input', saveManualMacrosFromFields));
}

function setMacroInputsDisabled(disabled) {
    inputProt.disabled = disabled; inputFat.disabled = disabled; inputCarb.disabled = disabled;
}

function handleMacroModeChange(mode) {
    safeSetItem('macroConfigMode', mode);
    if (mode === "auto") { setMacroInputsDisabled(true); recalculatePhysiqueAndCalories(); } 
    else { setMacroInputsDisabled(false); saveManualMacrosFromFields(); }
}

function saveManualMacrosFromFields() {
    safeSetItem('manualMacrosValues', {
        prot: parseInt(inputProt.value) || 0, fat: parseInt(inputFat.value) || 0, carb: parseInt(inputCarb.value) || 0
    });
}

// === CENTRAL PROCESSING UNIT : CALCULS MÉTABOLIQUES & TENDANCES ===
function recalculatePhysiqueAndCalories() {
    const profile = safeGetItem('userProfileBaseV2', 'null');
    const weights = safeGetItem('weightHistory');
    const macroMode = safeGetItem('macroConfigMode', '"auto"');
    
    const bmiNum = document.getElementById('bmi-num');
    const bmiText = document.getElementById('bmi-text');
    const bmiAdvice = document.getElementById('bmi-advice');
    const colorBox = document.getElementById('bmi-color-box');
    const deltaDisplay = document.getElementById('weight-delta-display');

    const calBaseDisplay = document.getElementById('cal-base');
    const calMaintenanceDisplay = document.getElementById('cal-maintenance');
    const calDeficitDisplay = document.getElementById('cal-deficit');
    const calSurplusDisplay = document.getElementById('cal-surplus');

    if (weights.length >= 2) {
        const diff = (weights[weights.length - 1].weight - weights[weights.length - 2].weight).toFixed(1);
        deltaDisplay.innerText = diff > 0 ? `+${diff} kg` : `${diff} kg`;
    } else {
        deltaDisplay.innerText = "—";
    }

    if (!profile || !profile.height || !profile.age || weights.length === 0) {
        bmiNum.innerText = "--"; bmiText.innerText = "Profil incomplet";
        colorBox.className = "bmi-value bg-default";
        calBaseDisplay.innerText = "--"; calMaintenanceDisplay.innerText = "--";
        calDeficitDisplay.innerText = "--"; calSurplusDisplay.innerText = "--";
        if (macroMode === "auto") { inputProt.value = 0; inputFat.value = 0; inputCarb.value = 0; }
        return;
    }

    const activeWeight = weights[weights.length - 1].weight;
    const hMeter = profile.height / 100;
    const bmi = (activeWeight / (hMeter * hMeter)).toFixed(1);
    bmiNum.innerText = bmi;
    colorBox.className = "bmi-value";

    if (bmi < 18.5) { bmiText.innerText = "Insuffisance"; colorBox.classList.add('bg-warning'); } 
    else if (bmi < 25) { bmiText.innerText = "Normal"; colorBox.classList.add('bg-normal'); } 
    else if (bmi < 30) { bmiText.innerText = "Surpoids"; colorBox.classList.add('bg-warning'); } 
    else { bmiText.innerText = "Obésité"; colorBox.classList.add('bg-danger'); }
    bmiAdvice.innerText = `Basé sur votre pesée de ${activeWeight} kg.`;

    let bmr = profile.gender === "male" 
        ? (10 * activeWeight + 6.25 * profile.height - 5 * profile.age + 5)
        : (10 * activeWeight + 6.25 * profile.height - 5 * profile.age - 161);

    const maintenance = bmr * profile.activityLevel;
    calBaseDisplay.innerText = `${Math.round(bmr)} kcal`;
    calMaintenanceDisplay.innerText = `${Math.round(maintenance)} kcal`;
    calDeficitDisplay.innerText = `${Math.round(Math.max(1200, maintenance - 500))} kcal`;
    calSurplusDisplay.innerText = `${Math.round(maintenance + 300)} kcal`;

    if (macroMode === "auto") {
        inputProt.value = Math.round(activeWeight * 2);
        inputFat.value = Math.round(activeWeight * 1);
        inputCarb.value = Math.round(Math.max(0, (maintenance - ((activeWeight * 2 * 4) + (activeWeight * 1 * 9))) / 4));
    }
}

// === MODULE : RECORDS HISTORIQUES ===
const recordForm = document.getElementById('record-form');
recordForm.addEventListener('submit', (e) => {
    e.preventDefault();
    let records = safeGetItem('elitePersonalRecords', '[]');
    records.push({ id: Date.now(), name: document.getElementById('rec-name').value.trim(), value: document.getElementById('rec-value').value.trim() });
    safeSetItem('elitePersonalRecords', records);
    recordForm.reset();
    renderRecords();
    updateGamification();
    updateSmartCoach();
});

function renderRecords() {
    const container = document.getElementById('records-container');
    const records = safeGetItem('elitePersonalRecords', '[]');
    if(records.length === 0) { container.innerHTML = `<div style="color:var(--text-muted); font-size:0.75rem; font-style:italic;">Aucune marque gravée.</div>`; return; }
    container.innerHTML = records.map(rec => `
        <div class="record-elite-card">
            <button class="delete-record-btn" onclick="deleteRecord(${rec.id})">&times;</button>
            <div class="record-elite-title">${escapeHtml(rec.name)}</div>
            <div class="record-elite-value">${escapeHtml(rec.value)}</div>
        </div>
    `).join('');
}
function deleteRecord(id) { if(confirm("Supprimer ce record ?")) { safeSetItem('elitePersonalRecords', safeGetItem('elitePersonalRecords', '[]').filter(r => r.id !== id)); renderRecords(); updateGamification(); } }

// === MODULE : POIDS HISTORIQUE ===
const weightForm = document.getElementById('weight-form');
weightForm.addEventListener('submit', (e) => {
    e.preventDefault();
    let history = safeGetItem('weightHistory');
    const editIndex = document.getElementById('w-edit-index').value;
    const dataObj = { date: document.getElementById('w-date').value, weight: parseFloat(document.getElementById('w-weight').value) };

    if (editIndex === "-1") history.push(dataObj); else { history[parseInt(editIndex)] = dataObj; cancelWeightEdit(); }
    history.sort((a, b) => new Date(a.date) - new Date(b.date));
    safeSetItem('weightHistory', history);
    renderWeight();
    weightForm.reset();
    document.getElementById('w-date').valueAsDate = new Date();
    updateSmartCoach();
});

function renderWeight() {
    const body = document.getElementById('weight-body');
    const history = safeGetItem('weightHistory');
    body.innerHTML = [...history].reverse().map((s, idx) => {
        const realIndex = history.findIndex(x => x.date === s.date && x.weight === s.weight);
        let diffStr = "—";
        if (realIndex > 0) {
            let diff = (s.weight - history[realIndex - 1].weight).toFixed(1);
            diffStr = diff > 0 ? `+${diff}` : `${diff}`;
        }
        return `<tr>
            <td>${formatDate(s.date)}</td>
            <td><strong>${s.weight} kg</strong></td>
            <td>${diffStr}</td>
            <td class="action-btns">
                <button onclick="editWeight(${realIndex})" class="btn-small btn-edit">Mod</button>
                <button onclick="deleteWeight(${realIndex})" class="btn-small btn-delete">Sup</button>
            </td>
        </tr>`;
    }).join('');
    generateBentoAreaChart('weight-chart', history.map(item => item.weight), history.map(item => formatDate(item.date)), "kg");
    recalculatePhysiqueAndCalories();
}
function editWeight(i) {
    const entry = safeGetItem('weightHistory')[i];
    document.getElementById('w-date').value = entry.date; document.getElementById('w-weight').value = entry.weight;
    document.getElementById('w-edit-index').value = i; document.getElementById('weight-submit-btn').innerText = "OK";
    document.getElementById('weight-cancel-btn').classList.remove('hidden');
}
function deleteWeight(i) { if(confirm("Supprimer la pesée ?")) { let h = safeGetItem('weightHistory'); h.splice(i, 1); safeSetItem('weightHistory', h); renderWeight(); updateSmartCoach(); } }
function cancelWeightEdit() {
    weightForm.reset(); document.getElementById('w-date').valueAsDate = new Date(); document.getElementById('w-edit-index').value = "-1";
    document.getElementById('weight-submit-btn').innerText = "Ajouter"; document.getElementById('weight-cancel-btn').classList.add('hidden');
}

// === MODULE CALENDRIER : MULTI-SEANCES ET VALIDATION ===
let currentCalDate = new Date();
function changeMonth(offset) { currentCalDate.setMonth(currentCalDate.getMonth() + offset); renderCalendar(); }

function renderCalendar() {
    const year = currentCalDate.getFullYear(), month = currentCalDate.getMonth();
    const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
    document.getElementById('month-year-display').innerText = `${monthNames[month]} ${year}`;

    const startOffset = new Date(year, month, 1).getDay() === 0 ? 6 : new Date(year, month, 1).getDay() - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const grid = document.getElementById('calendar-grid'); grid.innerHTML = "";

    let monthlyData = safeGetItem('calendarData', '{}');
    const statsCounter = {}; 
    let totalCount = 0;

    for (let i = 0; i < startOffset; i++) grid.innerHTML += `<div class="cal-day empty"></div>`;

    for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        // Migration à la volée vers le tableau multi-séances si format obsolète
        if (typeof monthlyData[dateKey] === 'string') {
            const oldValidData = safeGetItem('calendarValidated', '{}');
            monthlyData[dateKey] = [{ id: Date.now() + day, name: monthlyData[dateKey], validated: oldValidData[dateKey] || false }];
            safeSetItem('calendarData', monthlyData);
        }

        let sessions = monthlyData[dateKey] || [];
        let badgesHtml = "";
        
        if (sessions.length > 0) {
            sessions.forEach(session => {
                const norm = session.name.trim().toUpperCase();
                statsCounter[norm] = (statsCounter[norm] || 0) + 1; totalCount++;
                let badgeClass = norm.includes("CARDIO") || norm.includes("RUN") ? "badge-cardio" : (norm.includes("MUSCU") || norm.includes("BODY") || norm.includes("PUSH") || norm.includes("PULL") || norm.includes("LEGS") ? "badge-muscu" : "badge-default");
                
                const isChecked = session.validated ? 'checked' : '';
                badgesHtml += `
                    <div class="cal-day-content">
                        <span class="cal-badge ${badgeClass}" title="${escapeHtml(session.name)}">${escapeHtml(session.name)}</span>
                        <input type="checkbox" class="cal-checkbox" ${isChecked} onclick="toggleSessionValidation(event, '${dateKey}', ${session.id})" title="Valider">
                    </div>
                `;
            });
        }

        const dayDiv = document.createElement('div'); dayDiv.className = 'cal-day';
        dayDiv.innerHTML = `
            <span class="cal-date">${day}</span>
            <div class="cal-sessions-wrapper">${badgesHtml}</div>
        `;
        dayDiv.onclick = () => openCalendarDayModal(dateKey, `${day} ${monthNames[month]}`);
        grid.appendChild(dayDiv);
    }
    renderStats(statsCounter, totalCount);
    updateConsistencyStreak();
}

window.toggleSessionValidation = function(e, dateKey, sessionId) {
    e.stopPropagation(); 
    let monthlyData = safeGetItem('calendarData', '{}');
    if(monthlyData[dateKey]) {
        let session = monthlyData[dateKey].find(s => s.id === sessionId);
        if(session) {
            session.validated = e.target.checked;
            safeSetItem('calendarData', monthlyData);
            updateConsistencyStreak();
            updateGamification();
        }
    }
};

function updateConsistencyStreak() {
    const monthlyData = safeGetItem('calendarData', '{}');
    const countDisplay = document.getElementById('streak-days-count');
    
    const currentYear = currentCalDate.getFullYear();
    const currentMonth = currentCalDate.getMonth() + 1;
    const prefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

    let totalSessionsThisMonth = 0;
    let validatedSessionsThisMonth = 0;

    for (let key in monthlyData) {
        if (key.startsWith(prefix)) {
            monthlyData[key].forEach(s => {
                totalSessionsThisMonth++;
                if(s.validated) validatedSessionsThisMonth++;
            });
        }
    }
    countDisplay.innerText = `${validatedSessionsThisMonth} / ${totalSessionsThisMonth}`;
}

// LOGIQUE MODAL MULTI-SEANCES
function openCalendarDayModal(dateKey, displayDate) {
    document.getElementById('current-selected-date').value = dateKey;
    document.getElementById('calendar-day-title').innerText = `Séances du ${displayDate}`;
    renderDaySessionsList(dateKey);
    calendarDayModal.classList.remove('hidden');
}

function closeCalendarDayModal() {
    calendarDayModal.classList.add('hidden');
    document.getElementById('new-session-input').value = "";
    renderCalendar();
}

function renderDaySessionsList(dateKey) {
    const listContainer = document.getElementById('calendar-day-sessions-list');
    let monthlyData = safeGetItem('calendarData', '{}');
    let sessions = monthlyData[dateKey] || [];
    
    if(sessions.length === 0) {
        listContainer.innerHTML = `<span style="font-size:0.8rem; color:var(--text-muted); font-style:italic;">Journée de repos. Aucune séance.</span>`;
        return;
    }

    listContainer.innerHTML = sessions.map(s => `
        <div class="session-list-item">
            <span style="flex:1;">${escapeHtml(s.name)} ${s.validated ? '✅' : ''}</span>
            <div class="action-btns">
                <button class="btn-small btn-edit" onclick="editSessionInDay('${dateKey}', ${s.id}, '${escapeHtml(s.name)}')">Mod</button>
                <button class="btn-small btn-delete" onclick="deleteSessionFromDay('${dateKey}', ${s.id})">Sup</button>
            </div>
        </div>
    `).join('');
}

window.addSessionToDay = function() {
    const dateKey = document.getElementById('current-selected-date').value;
    const input = document.getElementById('new-session-input');
    const name = input.value.trim();
    if(!name) return;

    let monthlyData = safeGetItem('calendarData', '{}');
    if(!monthlyData[dateKey]) monthlyData[dateKey] = [];
    
    monthlyData[dateKey].push({ id: Date.now(), name: name, validated: false });
    safeSetItem('calendarData', monthlyData);
    
    input.value = "";
    renderDaySessionsList(dateKey);
    updateSmartCoach();
}

window.deleteSessionFromDay = function(dateKey, sessionId) {
    if(!confirm("Supprimer cette séance ?")) return;
    let monthlyData = safeGetItem('calendarData', '{}');
    if(monthlyData[dateKey]) {
        monthlyData[dateKey] = monthlyData[dateKey].filter(s => s.id !== sessionId);
        if(monthlyData[dateKey].length === 0) delete monthlyData[dateKey];
        safeSetItem('calendarData', monthlyData);
        renderDaySessionsList(dateKey);
    }
}

window.editSessionInDay = function(dateKey, sessionId, currentName) {
    const newName = prompt("Nouveau nom :", currentName);
    if(newName && newName.trim() !== "") {
        let monthlyData = safeGetItem('calendarData', '{}');
        let session = monthlyData[dateKey].find(s => s.id === sessionId);
        if(session) {
            session.name = newName.trim();
            safeSetItem('calendarData', monthlyData);
            renderDaySessionsList(dateKey);
        }
    }
}

function renderStats(stats, total) {
    const list = document.getElementById('monthly-stats'); list.innerHTML = "";
    const keys = Object.keys(stats);
    if (keys.length === 0) { list.innerHTML = `<li style="font-style:italic; color:var(--text-muted);">Aucune planification.</li>`; return; }
    keys.forEach(k => { list.innerHTML += `<li>${k} <span>${((stats[k]/total)*100).toFixed(0)}%</span></li>`; });
}

// === MODULE : SUIVI CARDIO ===
const cardioForm = document.getElementById('cardio-form');
cardioForm.addEventListener('submit', (e) => {
    e.preventDefault();
    let history = safeGetItem('cardioHistory');
    const editIndex = document.getElementById('c-edit-index').value;
    const session = {
        date: document.getElementById('c-date').value, 
        speed: parseFloat(document.getElementById('c-speed').value),
        time: parseFloat(document.getElementById('c-time').value), 
        incline: parseFloat(document.getElementById('c-incline').value || 0),
        dist: parseFloat(document.getElementById('c-dist').value)
    };
    if (editIndex === "-1") history.push(session); else { history[parseInt(editIndex)] = session; cancelCardioEdit(); }
    history.sort((a, b) => new Date(a.date) - new Date(b.date));
    safeSetItem('cardioHistory', history);
    renderCardio();
    cardioForm.reset();
    document.getElementById('c-date').valueAsDate = new Date();
    updateSmartCoach();
    updateGamification();
});

window.renderCardio = function() {
    const history = safeGetItem('cardioHistory');
    const metricSelect = document.getElementById('cardio-metric-select');
    const metric = metricSelect ? metricSelect.value : 'dist';

    document.getElementById('cardio-body').innerHTML = [...history].reverse().map((s) => {
        const realIndex = history.findIndex(x => x.date === s.date && x.dist === s.dist && x.time === s.time);
        return `<tr>
            <td>${formatDate(s.date)}</td>
            <td>${s.speed}</td>
            <td>${s.time}</td>
            <td>${s.incline}%</td>
            <td><strong>${s.dist}</strong></td>
            <td class="action-btns">
                <button onclick="editCardio(${realIndex})" class="btn-small btn-edit">Mod</button>
                <button onclick="deleteCardio(${realIndex})" class="btn-small btn-delete">Sup</button>
            </td>
        </tr>`;
    }).join('');

    let unitStr = "km";
    if(metric === "speed") unitStr = "km/h";
    if(metric === "time") unitStr = "min";
    if(metric === "incline") unitStr = "%";

    generateBentoAreaChart('cardio-chart', history.map(item => parseFloat(item[metric])), history.map(item => formatDate(item.date)), unitStr, metric !== "time" && metric !== "incline");
}
function editCardio(i) {
    const s = safeGetItem('cardioHistory')[i];
    document.getElementById('c-date').value = s.date; document.getElementById('c-speed').value = s.speed;
    document.getElementById('c-time').value = s.time; document.getElementById('c-incline').value = s.incline;
    document.getElementById('c-dist').value = s.dist; document.getElementById('c-edit-index').value = i;
    document.getElementById('cardio-submit-btn').innerText = "OK"; document.getElementById('cardio-cancel-btn').classList.remove('hidden');
}
function deleteCardio(i) { if(confirm("Supprimer la séance ?")) { let h = safeGetItem('cardioHistory'); h.splice(i, 1); safeSetItem('cardioHistory', h); renderCardio(); updateGamification(); } }
function cancelCardioEdit() {
    cardioForm.reset(); document.getElementById('c-date').valueAsDate = new Date(); document.getElementById('c-edit-index').value = "-1";
    document.getElementById('cardio-submit-btn').innerText = "OK"; document.getElementById('cardio-cancel-btn').classList.add('hidden');
}

// === COURBES INTERACTIVES AREA ===
function generateBentoAreaChart(containerId, dataPoints, labels, unitStr = "", isCardio = false) {
    const container = document.getElementById(containerId);
    if (dataPoints.length === 0) {
        container.innerHTML = `<div style="color:var(--text-muted); font-size:0.75rem; margin:auto; font-style:italic;">En attente de rapports analytiques...</div>`;
        return;
    }

    const maxVal = Math.max(...dataPoints) * 1.05 || 10;
    const minVal = isCardio ? 0 : Math.min(...dataPoints) * 0.95;
    const range = maxVal - minVal;

    const width = 400; const height = 180; const paddingX = 25; const paddingY = 15;
    const graphWidth = width - paddingX * 2;
    const graphHeight = height - paddingY * 2;
    
    let pointsCoords = "";
    const stepX = graphWidth / (dataPoints.length > 1 ? dataPoints.length - 1 : 1);

    dataPoints.forEach((val, i) => {
        const x = paddingX + i * stepX;
        const y = paddingY + graphHeight - ((val - minVal) / (range || 1)) * graphHeight;
        pointsCoords += `${x},${y} `;
    });

    let fillCoords = `${paddingX},${height - paddingY} ` + pointsCoords + `${paddingX + (dataPoints.length - 1) * stepX},${height - paddingY}`;

    let svg = `<svg viewBox="0 0 ${width} ${height}" style="width:100%; height:100%; overflow:visible;">
        <defs>
            <linearGradient id="gradient-${containerId}" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="var(--gold)" stop-opacity="0.25"/>
                <stop offset="100%" stop-color="var(--gold)" stop-opacity="0.00"/>
            </linearGradient>
        </defs>`;
        
    svg += `<line x1="${paddingX}" y1="${paddingY}" x2="${width-paddingX}" y2="${paddingY}" stroke="#f1f5f9" stroke-width="1"/>`;
    svg += `<line x1="${paddingX}" y1="${paddingY + graphHeight/2}" x2="${width-paddingX}" y2="${paddingY + graphHeight/2}" stroke="#f1f5f9" stroke-width="1"/>`;
    svg += `<line x1="${paddingX}" y1="${height-paddingY}" x2="${width-paddingX}" y2="${height-paddingY}" stroke="#cbd5e1" stroke-width="1"/>`;
    
    svg += `<polygon points="${fillCoords}" fill="url(#gradient-${containerId})"/>`;
    svg += `<polyline points="${pointsCoords}" fill="none" stroke="var(--navy)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
    
    dataPoints.forEach((val, i) => {
        const x = paddingX + i * stepX;
        const y = paddingY + graphHeight - ((val - minVal) / (range || 1)) * graphHeight;
        svg += `<circle cx="${x}" cy="${y}" r="3.5" fill="var(--white)" stroke="var(--gold)" stroke-width="2"
            style="cursor:pointer;"
            onmouseover="showCustomTooltip(event, '${labels[i]}', '${val} ${unitStr}')"
            onmousemove="moveCustomTooltip(event)"
            onmouseout="hideCustomTooltip()"></circle>`;
    });

    svg += `</svg>`;
    container.innerHTML = svg;
}

function showCustomTooltip(e, dLabel, vLabel) {
    tooltipElement.innerHTML = `<strong>Date :</strong> ${dLabel}<br/><strong>Performance :</strong> ${vLabel}`;
    tooltipElement.classList.remove('hidden'); moveCustomTooltip(e);
}
function moveCustomTooltip(e) { tooltipElement.style.left = (e.pageX + 10) + "px"; tooltipElement.style.top = (e.pageY - 15) + "px"; }
function hideCustomTooltip() { tooltipElement.classList.add('hidden'); }
function formatDate(s) { const d = new Date(s); return isNaN(d.getTime()) ? s : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`; }
function escapeHtml(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

// === MODULE NOUVEAU : COACH INTELLIGENT ===
function updateSmartCoach() {
    const adviceContainer = document.getElementById('smart-coach-text');
    if(!adviceContainer) return;
    const weights = safeGetItem('weightHistory', '[]');
    const records = safeGetItem('elitePersonalRecords', '[]');
    const cardio = safeGetItem('cardioHistory', '[]');
    
    let text = "Entraînez-vous régulièrement pour recevoir des analyses prédictives.";
    
    if (weights.length >= 2) {
        let diff = weights[weights.length-1].weight - weights[weights.length-2].weight;
        if (diff < 0) text = "Excellente dynamique ! Votre courbe de poids est en baisse. Maintenez votre déficit calorique pour consolider cette perte sans rogner sur l'intensité.";
        else if (diff > 0) text = "Prise de masse détectée. Assurez-vous que l'excédent calorique est accompagné d'une surcharge progressive lors de vos séances.";
        else text = "Poids stabilisé. C'est le moment idéal pour choquer le métabolisme en variant vos séances cardio ou l'intensité de vos charges.";
    }
    
    if (records.length > 0) {
        text += ` Félicitations pour vos ${records.length} record(s) gravé(s) au Hall of Fame ! La clé est la surcharge progressive.`;
    }

    if (cardio.length >= 3) {
        let lastCardio = cardio[cardio.length-1];
        if(lastCardio.dist > 5) text += " Volume d'endurance élevé détecté. Pensez à bien ajuster vos glucides en conséquence pour la récupération.";
    }

    adviceContainer.innerText = text;
}

// === MODULE NOUVEAU : GAMIFICATION (HAUTS FAITS) ===
function updateGamification() {
    const gamiContainer = document.getElementById('gamification-container');
    if(!gamiContainer) return;
    
    const records = safeGetItem('elitePersonalRecords', '[]');
    const cardio = safeGetItem('cardioHistory', '[]');
    const calendar = safeGetItem('calendarData', '{}');
    
    // Conditions des badges
    let hasHercule = records.length > 0;
    let maxDist = cardio.reduce((max, c) => Math.max(max, c.dist), 0);
    let hasMarathon = maxDist >= 10;
    
    let totalSessions = 0;
    for (let k in calendar) { totalSessions += calendar[k].length; }
    let hasDiscipline = totalSessions >= 10;
    
    let hasDouble = false;
    for (let k in calendar) { if (calendar[k].length >= 2) hasDouble = true; }

    let html = `
        <div class="gami-badge ${hasHercule ? 'active' : ''}" title="Enregistrer un record personnel">🏋️ Hercule</div>
        <div class="gami-badge ${hasMarathon ? 'active' : ''}" title="Courir 10km ou plus en une séance">🏃 Marathonien</div>
        <div class="gami-badge ${hasDiscipline ? 'active' : ''}" title="Planifier au moins 10 séances au total">🛡️ Discipline</div>
        <div class="gami-badge ${hasDouble ? 'active' : ''}" title="Réaliser 2 séances le même jour">⚔️ Double Impact</div>
    `;
    gamiContainer.innerHTML = html;
}

// === MODULE NOUVEAU : GENERATION PDF MENSUEL ===
window.generatePDFReport = function() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Titre
        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.setTextColor(15, 23, 42);
        doc.text("WALLY SPORT ELITE - BILAN DE PERFORMANCE", 20, 20);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        doc.text(`Édité le : ${new Date().toLocaleDateString('fr-FR', options)}`, 20, 28);
        
        // Ligne de séparation
        doc.setDrawColor(197, 160, 89);
        doc.setLineWidth(1);
        doc.line(20, 32, 190, 32);
        
        // 1. Synthèse Poids
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(15, 23, 42);
        doc.text("1. Évolution Morphologique", 20, 45);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        const weights = safeGetItem('weightHistory', '[]');
        if(weights.length >= 2) {
            const first = weights[0].weight;
            const last = weights[weights.length-1].weight;
            const diff = (last - first).toFixed(1);
            doc.text(`• Poids actuel : ${last} kg`, 25, 55);
            doc.text(`• Variation totale enregistrée : ${diff > 0 ? '+'+diff : diff} kg`, 25, 65);
        } else if (weights.length === 1) {
            doc.text(`• Poids actuel : ${weights[0].weight} kg (Pas assez de données pour tendance)`, 25, 55);
        } else {
            doc.text(`• Aucune donnée de poids enregistrée.`, 25, 55);
        }

        // 2. Synthèse Cardio
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text("2. Statistiques d'Endurance", 20, 85);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        const cardio = safeGetItem('cardioHistory', '[]');
        if(cardio.length > 0) {
            let totalDist = 0, maxSpeed = 0, totalTime = 0;
            cardio.forEach(c => { totalDist += c.dist; totalTime += c.time; maxSpeed = Math.max(maxSpeed, c.speed); });
            doc.text(`• Distance totale cumulée : ${totalDist.toFixed(1)} km`, 25, 95);
            doc.text(`• Vitesse maximale atteinte : ${maxSpeed.toFixed(1)} km/h`, 25, 105);
            doc.text(`• Temps total d'effort : ${totalTime} minutes`, 25, 115);
        } else {
            doc.text(`• Aucune donnée cardio enregistrée.`, 25, 95);
        }

        // 3. Hall of Fame
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text("3. Records Personnels (Hall of Fame)", 20, 135);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        const records = safeGetItem('elitePersonalRecords', '[]');
        if(records.length > 0) {
            let y = 145;
            records.forEach(r => {
                doc.text(`• ${r.name} : ${r.value}`, 25, y);
                y += 10;
            });
        } else {
            doc.text(`• Aucun record inscrit pour le moment.`, 25, 145);
        }

        doc.save(`Bilan_WallySport_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (e) {
        alert("La librairie PDF n'est pas encore chargée ou requiert une connexion internet active.");
    }
}

// === MODULE RECONSTITUTION BACKUPS SOUVERAINS ===
function exportDataData() {
    const obj = {
        userProfileBaseV2: localStorage.getItem('userProfileBaseV2'), weightHistory: localStorage.getItem('weightHistory'),
        calendarData: localStorage.getItem('calendarData'), cardioHistory: localStorage.getItem('cardioHistory'),
        elitePersonalRecords: localStorage.getItem('elitePersonalRecords'), macroConfigMode: localStorage.getItem('macroConfigMode'),
        manualMacrosValues: localStorage.getItem('manualMacrosValues')
    };
    const a = document.createElement('a');
    a.setAttribute("href", "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(obj)));
    a.setAttribute("download", `wallysport_bento_backup.json`);
    document.body.appendChild(a); a.click(); a.remove();
}
function triggerImportField() { document.getElementById('import-file-field').click(); }
function importDataData(event) {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const json = JSON.parse(e.target.result);
            if (json.userProfileBaseV2) localStorage.setItem('userProfileBaseV2', json.userProfileBaseV2);
            if (json.weightHistory) localStorage.setItem('weightHistory', json.weightHistory);
            if (json.calendarData) localStorage.setItem('calendarData', json.calendarData);
            if (json.cardioHistory) localStorage.setItem('cardioHistory', json.cardioHistory);
            if (json.elitePersonalRecords) localStorage.setItem('elitePersonalRecords', json.elitePersonalRecords);
            if (json.macroConfigMode) localStorage.setItem('macroConfigMode', json.macroConfigMode);
            if (json.manualMacrosValues) localStorage.setItem('manualMacrosValues', json.manualMacrosValues);
            alert("Restauration Bento achevée."); window.location.reload();
        } catch (err) { alert("Format invalide."); }
    };
    reader.readAsText(file);
}
