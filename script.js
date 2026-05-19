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

openProfileBtn.addEventListener('click', () => profileModal.classList.remove('hidden'));
closeProfileBtn.addEventListener('click', () => profileModal.classList.add('hidden'));
cancelProfileBtn.addEventListener('click', () => profileModal.classList.add('hidden'));
window.addEventListener('click', (e) => { if (e.target === profileModal) profileModal.classList.add('hidden'); });

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
function deleteRecord(id) { if(confirm("Supprimer ce record ?")) { safeSetItem('elitePersonalRecords', safeGetItem('elitePersonalRecords', '[]').filter(r => r.id !== id)); renderRecords(); } }

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
function deleteWeight(i) { if(confirm("Supprimer la pesée ?")) { let h = safeGetItem('weightHistory'); h.splice(i, 1); safeSetItem('weightHistory', h); renderWeight(); } }
function cancelWeightEdit() {
    weightForm.reset(); document.getElementById('w-date').valueAsDate = new Date(); document.getElementById('w-edit-index').value = "-1";
    document.getElementById('weight-submit-btn').innerText = "Ajouter"; document.getElementById('weight-cancel-btn').classList.add('hidden');
}

// === CALENDRIER MENSUEL & VALIDATION (CHECKBOX) ===
let currentCalDate = new Date();
function changeMonth(offset) { currentCalDate.setMonth(currentCalDate.getMonth() + offset); renderCalendar(); }

function renderCalendar() {
    const year = currentCalDate.getFullYear(), month = currentCalDate.getMonth();
    const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
    document.getElementById('month-year-display').innerText = `${monthNames[month]} ${year}`;

    const startOffset = new Date(year, month, 1).getDay() === 0 ? 6 : new Date(year, month, 1).getDay() - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const grid = document.getElementById('calendar-grid'); grid.innerHTML = "";

    const monthlyData = safeGetItem('calendarData', '{}');
    const validatedData = safeGetItem('calendarValidated', '{}');
    const statsCounter = {}; let totalCount = 0;

    for (let i = 0; i < startOffset; i++) grid.innerHTML += `<div class="cal-day empty"></div>`;

    for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const activity = monthlyData[dateKey] || "";
        let badgeHtml = "";
        
        if (activity) {
            const norm = activity.trim().toUpperCase();
            statsCounter[norm] = (statsCounter[norm] || 0) + 1; totalCount++;
            let badgeClass = norm.includes("CARDIO") || norm.includes("RUN") ? "badge-cardio" : (norm.includes("MUSCU") || norm.includes("BODY") ? "badge-muscu" : "badge-default");
            
            const isChecked = validatedData[dateKey] ? 'checked' : '';
            badgeHtml = `
                <div class="cal-day-content">
                    <span class="cal-badge ${badgeClass}">${activity}</span>
                    <input type="checkbox" class="cal-checkbox" ${isChecked} onclick="toggleSessionValidation(event, '${dateKey}')" title="Valider la séance">
                </div>
            `;
        }

        const dayDiv = document.createElement('div'); dayDiv.className = 'cal-day';
        dayDiv.innerHTML = `<span class="cal-date">${day}</span>${badgeHtml}`;
        dayDiv.onclick = () => {
            const act = prompt(`Activité du ${day} ${monthNames[month]} :`, activity);
            if (act !== null) {
                if (act.trim() === "") {
                    delete monthlyData[dateKey];
                    let valData = safeGetItem('calendarValidated', '{}');
                    delete valData[dateKey];
                    safeSetItem('calendarValidated', valData);
                } else {
                    monthlyData[dateKey] = act.trim();
                }
                safeSetItem('calendarData', monthlyData); renderCalendar();
            }
        };
        grid.appendChild(dayDiv);
    }
    renderStats(statsCounter, totalCount);
    updateConsistencyStreak();
}

window.toggleSessionValidation = function(e, dateKey) {
    e.stopPropagation(); // Évite d'ouvrir le prompt quand on clique sur la case
    let validatedData = safeGetItem('calendarValidated', '{}');
    if (e.target.checked) {
        validatedData[dateKey] = true;
    } else {
        delete validatedData[dateKey];
    }
    safeSetItem('calendarValidated', validatedData);
    updateConsistencyStreak();
};

function updateConsistencyStreak() {
    const monthlyData = safeGetItem('calendarData', '{}');
    const validatedData = safeGetItem('calendarValidated', '{}');
    const countDisplay = document.getElementById('streak-days-count');
    
    const currentYear = currentCalDate.getFullYear();
    const currentMonth = currentCalDate.getMonth() + 1;
    const prefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

    let totalSessionsThisMonth = 0;
    let validatedSessionsThisMonth = 0;

    for (let key in monthlyData) {
        if (key.startsWith(prefix)) {
            totalSessionsThisMonth++;
            if (validatedData[key]) {
                validatedSessionsThisMonth++;
            }
        }
    }
    
    countDisplay.innerText = `${validatedSessionsThisMonth} / ${totalSessionsThisMonth}`;
}

function renderStats(stats, total) {
    const list = document.getElementById('monthly-stats'); list.innerHTML = "";
    const keys = Object.keys(stats);
    if (keys.length === 0) { list.innerHTML = `<li style="font-style:italic; color:var(--text-muted);">Aucune planification.</li>`; return; }
    keys.forEach(k => { list.innerHTML += `<li>${k} <span>${((stats[k]/total)*100).toFixed(0)}%</span></li>`; });
}

// === MODULE : SUIVI CARDIO (AVEC SELECTEUR COURBE) ===
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
});

function renderCardio() {
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

    // Trace la courbe selon l'option choisie
    generateBentoAreaChart('cardio-chart', history.map(item => parseFloat(item[metric])), history.map(item => formatDate(item.date)), unitStr, metric !== "time" && metric !== "incline");
}
function editCardio(i) {
    const s = safeGetItem('cardioHistory')[i];
    document.getElementById('c-date').value = s.date; document.getElementById('c-speed').value = s.speed;
    document.getElementById('c-time').value = s.time; document.getElementById('c-incline').value = s.incline;
    document.getElementById('c-dist').value = s.dist; document.getElementById('c-edit-index').value = i;
    document.getElementById('cardio-submit-btn').innerText = "OK"; document.getElementById('cardio-cancel-btn').classList.remove('hidden');
}
function deleteCardio(i) { if(confirm("Supprimer la séance ?")) { let h = safeGetItem('cardioHistory'); h.splice(i, 1); safeSetItem('cardioHistory', h); renderCardio(); } }
function cancelCardioEdit() {
    cardioForm.reset(); document.getElementById('c-date').valueAsDate = new Date(); document.getElementById('c-edit-index').value = "-1";
    document.getElementById('cardio-submit-btn').innerText = "OK"; document.getElementById('cardio-cancel-btn').classList.add('hidden');
}

// === COURBES INTERACTIVES AREA (STYLE BENTO PREMIUM) ===
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
        
    // Lignes de repère (Gridlines horizontales)
    svg += `<line x1="${paddingX}" y1="${paddingY}" x2="${width-paddingX}" y2="${paddingY}" stroke="#f1f5f9" stroke-width="1"/>`;
    svg += `<line x1="${paddingX}" y1="${paddingY + graphHeight/2}" x2="${width-paddingX}" y2="${paddingY + graphHeight/2}" stroke="#f1f5f9" stroke-width="1"/>`;
    svg += `<line x1="${paddingX}" y1="${height-paddingY}" x2="${width-paddingX}" y2="${height-paddingY}" stroke="#cbd5e1" stroke-width="1"/>`;
    
    // Remplissage sous la courbe
    svg += `<polygon points="${fillCoords}" fill="url(#gradient-${containerId})"/>`;
    // Ligne principale de courbe
    svg += `<polyline points="${pointsCoords}" fill="none" stroke="var(--navy)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
    
    // Points interactifs
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

// === MODULE RECONSTITUTION BACKUPS SOUVERAINS ===
function exportDataData() {
    const obj = {
        userProfileBaseV2: localStorage.getItem('userProfileBaseV2'), weightHistory: localStorage.getItem('weightHistory'),
        calendarData: localStorage.getItem('calendarData'), cardioHistory: localStorage.getItem('cardioHistory'),
        elitePersonalRecords: localStorage.getItem('elitePersonalRecords'), macroConfigMode: localStorage.getItem('macroConfigMode'),
        manualMacrosValues: localStorage.getItem('manualMacrosValues'), calendarValidated: localStorage.getItem('calendarValidated')
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
            if (json.calendarValidated) localStorage.setItem('calendarValidated', json.calendarValidated);
            if (json.cardioHistory) localStorage.setItem('cardioHistory', json.cardioHistory);
            if (json.elitePersonalRecords) localStorage.setItem('elitePersonalRecords', json.elitePersonalRecords);
            if (json.macroConfigMode) localStorage.setItem('macroConfigMode', json.macroConfigMode);
            if (json.manualMacrosValues) localStorage.setItem('manualMacrosValues', json.manualMacrosValues);
            alert("Restauration Bento achevée."); window.location.reload();
        } catch (err) { alert("Format invalide."); }
    };
    reader.readAsText(file);
}
