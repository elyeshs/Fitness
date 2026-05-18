// GESTION DU STOCKAGE LOCAL SÉCURISÉ
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

// === CONFIGURATION GENERALE & POPUPS ===
const profileModal = document.getElementById('profile-modal');
const openProfileBtn = document.getElementById('open-profile-btn');
const closeProfileBtn = document.getElementById('close-profile-btn');
const cancelProfileBtn = document.getElementById('cancel-profile-btn');
const profileForm = document.getElementById('profile-form');
const tooltipElement = document.getElementById('chart-tooltip');

openProfileBtn.addEventListener('click', () => profileModal.classList.remove('hidden'));
closeProfileBtn.addEventListener('click', () => profileModal.classList.add('hidden'));
cancelProfileBtn.addEventListener('click', () => profileModal.classList.add('hidden'));

window.addEventListener('click', (e) => {
    if (e.target === profileModal) { profileModal.classList.add('hidden'); }
});

// === INITIATION GLOBAL AU CHARGEMENT ===
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

// === ENREGISTREMENT ET CHARGEMENT DU PROFIL MORPHOLOGIQUE ===
profileForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const gender = document.getElementById('gender').value;
    const age = parseInt(document.getElementById('age').value);
    const height = parseFloat(document.getElementById('height').value);
    const activityLevel = parseFloat(document.getElementById('activity-level').value);
    
    const profileData = { gender, age, height, activityLevel };
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


// === GESTION DES MACRONUTRIMENTS HYBRIDES (AUTO VS SAISIE MANUELLE) ===
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

    [inputProt, inputFat, inputCarb].forEach(input => {
        input.addEventListener('input', saveManualMacrosFromFields);
    });
}

function setMacroInputsDisabled(disabled) {
    inputProt.disabled = disabled;
    inputFat.disabled = disabled;
    inputCarb.disabled = disabled;
}

function handleMacroModeChange(mode) {
    safeSetItem('macroConfigMode', mode);
    if (mode === "auto") {
        setMacroInputsDisabled(true);
        recalculatePhysiqueAndCalories();
    } else {
        setMacroInputsDisabled(false);
        saveManualMacrosFromFields();
    }
}

function saveManualMacrosFromFields() {
    const values = {
        prot: parseInt(inputProt.value) || 0,
        fat: parseInt(inputFat.value) || 0,
        carb: parseInt(inputCarb.value) || 0
    };
    safeSetItem('manualMacrosValues', values);
}


// === CORE ENGINE : CALCULS METABOLIQUES & TENDANCE DELTA 7J ===
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

    // Calcul de la tendance Delta Hebdomadaire
    if (weights.length >= 2) {
        const lastWeight = weights[weights.length - 1].weight;
        const prevWeight = weights[weights.length - 2].weight;
        const diff = (lastWeight - prevWeight).toFixed(1);
        if (diff > 0) {
            deltaDisplay.innerText = `+${diff} kg (Dernier)`;
            deltaDisplay.style.color = "var(--navy)";
        } else if (diff < 0) {
            deltaDisplay.innerText = `${diff} kg (Dernier)`;
            deltaDisplay.style.color = "var(--gold-hover)";
        } else {
            deltaDisplay.innerText = "Stable (0.0 kg)";
            deltaDisplay.style.color = "var(--text-muted)";
        }
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

    // 1. Calcul Indice IMC
    const hMeter = profile.height / 100;
    const bmi = (activeWeight / (hMeter * hMeter)).toFixed(1);
    bmiNum.innerText = bmi;
    colorBox.className = "bmi-value";

    if (bmi < 18.5) {
        bmiText.innerText = `Insuffisance pondérale (${activeWeight} kg)`;
        bmiAdvice.innerText = "Indice inférieur aux recommandations de santé standard.";
        colorBox.classList.add('bg-warning');
    } else if (bmi < 25) {
        bmiText.innerText = `Corpulence normale (${activeWeight} kg)`;
        bmiAdvice.innerText = "Votre ratio poids/taille est idéal pour la performance.";
        colorBox.classList.add('bg-normal');
    } else if (bmi < 30) {
        bmiText.innerText = `Surpoids (${activeWeight} kg)`;
        bmiAdvice.innerText = "Zone de vigilance athlétique. Surveillez la balance.";
        colorBox.classList.add('bg-warning');
    } else {
        bmiText.innerText = `Obésité (${activeWeight} kg)`;
        bmiAdvice.innerText = "Facteur limitant de performance. Structurez votre alimentation.";
        colorBox.classList.add('bg-danger');
    }

    // 2. Équations Métaboliques (Mifflin-St Jeor)
    let bmr = 0;
    if (profile.gender === "male") {
        bmr = 10 * activeWeight + 6.25 * profile.height - 5 * profile.age + 5;
    } else {
        bmr = 10 * activeWeight + 6.25 * profile.height - 5 * profile.age - 161;
    }

    const maintenance = bmr * profile.activityLevel;
    const deficit = maintenance - 500;
    const surplus = maintenance + 300;

    calBaseDisplay.innerText = `${Math.round(bmr)} kcal`;
    calMaintenanceDisplay.innerText = `${Math.round(maintenance)} kcal`;
    calDeficitDisplay.innerText = `${Math.round(Math.max(1200, deficit))} kcal`;
    calSurplusDisplay.innerText = `${Math.round(surplus)} kcal`;

    // 3. Rendu des Macronutriments si Mode Auto activé
    if (macroMode === "auto") {
        const pGrams = activeWeight * 2;
        const fGrams = activeWeight * 1;
        const remainingKcal = maintenance - ((pGrams * 4) + (fGrams * 9));
        const cGrams = Math.max(0, remainingKcal / 4);

        inputProt.value = Math.round(pGrams);
        inputFat.value = Math.round(fGrams);
        inputCarb.value = Math.round(cGrams);
    }
}


// === GESTION DU HALL OF FAME (RECORDS PERSONNELS) ===
const recordForm = document.getElementById('record-form');
recordForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('rec-name').value.trim();
    const value = document.getElementById('rec-value').value.trim();
    
    let records = safeGetItem('elitePersonalRecords', '[]');
    records.push({ id: Date.now(), name, value });
    safeSetItem('elitePersonalRecords', records);
    
    recordForm.reset();
    renderRecords();
});

function renderRecords() {
    const container = document.getElementById('records-container');
    const records = safeGetItem('elitePersonalRecords', '[]');
    
    if(records.length === 0) {
        container.innerHTML = `<div style="color:var(--text-muted); font-size:0.8rem; grid-column:1/-1; font-style:italic;">Aucun record enregistré pour le moment.</div>`;
        return;
    }
    
    container.innerHTML = records.map(rec => `
        <div class="record-elite-card">
            <button class="delete-record-btn" onclick="deleteRecord(${rec.id})">&times;</button>
            <div class="record-elite-title">${escapeHtml(rec.name)}</div>
            <div class="record-elite-value">${escapeHtml(rec.value)}</div>
        </div>
    `).join('');
}

function deleteRecord(id) {
    if(confirm("Supprimer ce record du Hall of Fame ?")) {
        let records = safeGetItem('elitePersonalRecords', '[]');
        records = records.filter(r => r.id !== id);
        safeSetItem('elitePersonalRecords', records);
        renderRecords();
    }
}

function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}


// === MODULE HISTORIQUE DE POIDS ===
const weightForm = document.getElementById('weight-form');
weightForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const date = document.getElementById('w-date').value;
    const weight = parseFloat(document.getElementById('w-weight').value);
    
    let history = safeGetItem('weightHistory');
    const editIndex = document.getElementById('w-edit-index').value;
    const dataObj = { date, weight };

    if (editIndex === "-1") { history.push(dataObj); } 
    else { history[parseInt(editIndex)] = dataObj; cancelWeightEdit(); }

    history.sort((a, b) => new Date(a.date) - new Date(b.date));
    safeSetItem('weightHistory', history);
    
    renderWeight();
    weightForm.reset();
    document.getElementById('w-date').valueAsDate = new Date();
});

function renderWeight() {
    const body = document.getElementById('weight-body');
    const history = safeGetItem('weightHistory');
    const displayHistory = [...history].reverse();

    body.innerHTML = displayHistory.map((s, idx) => {
        const realIndex = history.findIndex(x => x.date === s.date && x.weight === s.weight);
        let targetStr = "—";
        let pClass = "prog-equal";

        if (realIndex > 0) {
            const diff = (s.weight - history[realIndex - 1].weight).toFixed(1);
            if (diff > 0) { targetStr = `+${diff} kg`; pClass = "prog-positive"; }
            else if (diff < 0) { targetStr = `${diff} kg`; pClass = "prog-negative"; }
            else { targetStr = "0.0 kg"; }
        }

        return `
            <tr>
                <td>${formatDate(s.date)}</td>
                <td><strong>${s.weight} kg</strong></td>
                <td class="progression ${pClass}">${targetStr}</td>
                <td class="action-btns">
                    <button onclick="editWeight(${realIndex})" class="btn-small btn-edit">Modifier</button>
                    <button onclick="deleteWeight(${realIndex})" class="btn-small btn-delete">Supprimer</button>
                </td>
            </tr>
        `;
    }).join('');

    generatePremiumChart('weight-chart', history.map(item => item.weight), history.map(item => formatDate(item.date)), "kg");
    recalculatePhysiqueAndCalories();
}

function editWeight(index) {
    const history = safeGetItem('weightHistory');
    const entry = history[index];
    document.getElementById('w-date').value = entry.date;
    document.getElementById('w-weight').value = entry.weight;
    document.getElementById('w-edit-index').value = index;
    document.getElementById('weight-submit-btn').innerText = "Mettre à jour";
    document.getElementById('weight-cancel-btn').classList.remove('hidden');
}

function deleteWeight(index) {
    if (confirm("Supprimer cette ligne de pesée ?")) {
        let history = safeGetItem('weightHistory');
        history.splice(index, 1);
        safeSetItem('weightHistory', history);
        renderWeight();
    }
}

function cancelWeightEdit() {
    weightForm.reset();
    document.getElementById('w-date').valueAsDate = new Date();
    document.getElementById('w-edit-index').value = "-1";
    document.getElementById('weight-submit-btn').innerText = "Ajouter la pesée";
    document.getElementById('weight-cancel-btn').classList.add('hidden');
}


// === CALENDRIER ET PLANIFICATION ELITE ===
let currentCalDate = new Date();
function changeMonth(offset) { currentCalDate.setMonth(currentCalDate.getMonth() + offset); renderCalendar(); }

function renderCalendar() {
    const year = currentCalDate.getFullYear();
    const month = currentCalDate.getMonth();
    const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
    document.getElementById('month-year-display').innerText = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;

    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = "";

    const monthlyData = safeGetItem('calendarData', '{}');
    const statsCounter = {};
    let totalCount = 0;

    for (let i = 0; i < startOffset; i++) { grid.innerHTML += `<div class="cal-day empty"></div>`; }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const activity = monthlyData[dateKey] || "";

        let badgeHtml = "";
        if (activity) {
            const norm = activity.trim().toUpperCase();
            statsCounter[norm] = (statsCounter[norm] || 0) + 1;
            totalCount++;

            let badgeClass = "badge-default";
            if (norm.includes("CARDIO") || norm.includes("RUN") || norm.includes("VELO") || norm.includes("COURSE")) {
                badgeClass = "badge-cardio";
            } else if (norm.includes("PUSH") || norm.includes("PULL") || norm.includes("LEGS") || norm.includes("MUSCU")) {
                badgeClass = "badge-muscu";
            }
            badgeHtml = `<span class="cal-badge ${badgeClass}">${activity}</span>`;
        }

        const dayDiv = document.createElement('div');
        dayDiv.className = 'cal-day';
        dayDiv.innerHTML = `<span class="cal-date">${day}</span>${badgeHtml}`;
        dayDiv.onclick = () => promptActivity(dateKey, activity, `${day} ${monthNames[month]}`);
        grid.appendChild(dayDiv);
    }
    
    renderStats(statsCounter, totalCount);
}

function promptActivity(dateKey, currentActivity, displayDate) {
    const newActivity = prompt(`Planification du ${displayDate} (Ex: Cardio, Push, Haut du corps) :\nLaisser vide pour effacer l'activité.`, currentActivity);
    if (newActivity !== null) {
        const monthlyData = safeGetItem('calendarData', '{}');
        if (newActivity.trim() === "") { delete monthlyData[dateKey]; } 
        else { monthlyData[dateKey] = newActivity.trim(); }
        safeSetItem('calendarData', monthlyData);
        renderCalendar();
    }
}

function renderStats(stats, total) {
    const list = document.getElementById('monthly-stats');
    list.innerHTML = "";
    const keys = Object.keys(stats);
    
    if (keys.length === 0) { list.innerHTML = `<li>Aucun entraînement planifié ce mois-ci.</li>`; return; }

    keys.forEach(activity => {
        const percentage = ((stats[activity] / total) * 100).toFixed(0);
        list.innerHTML += `<li>${activity} <span>${percentage}%</span></li>`;
    });
}


// === TRACKING PERFORMANCE CARDIO ===
const cardioForm = document.getElementById('cardio-form');
cardioForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const session = {
        date: document.getElementById('c-date').value,
        speed: document.getElementById('c-speed').value,
        time: document.getElementById('c-time').value,
        incline: parseFloat(document.getElementById('c-incline').value).toFixed(1),
        dist: parseFloat(document.getElementById('c-dist').value)
    };

    let history = safeGetItem('cardioHistory');
    const editIndex = document.getElementById('c-edit-index').value;

    if (editIndex === "-1") { history.push(session); } 
    else { history[parseInt(editIndex)] = session; cancelCardioEdit(); }

    history.sort((a, b) => new Date(a.date) - new Date(b.date));
    safeSetItem('cardioHistory', history);
    
    renderCardio();
    cardioForm.reset();
    document.getElementById('c-date').valueAsDate = new Date();
});

function renderCardio() {
    const body = document.getElementById('cardio-body');
    const history = safeGetItem('cardioHistory');
    const displayHistory = [...history].reverse();

    body.innerHTML = displayHistory.map((s, idx) => {
        const realIndex = history.findIndex(x => x.date === s.date && x.dist === s.dist && x.time === s.time);
        return `
            <tr>
                <td>${formatDate(s.date)}</td>
                <td>${s.speed} km/h</td>
                <td>${s.time} min</td>
                <td>${s.incline}%</td>
                <td><strong>${s.dist} km</strong></td>
                <td class="action-btns">
                    <button onclick="editCardio(${realIndex})" class="btn-small btn-edit">Modifier</button>
                    <button onclick="deleteCardio(${realIndex})" class="btn-small btn-delete">Supprimer</button>
                </td>
            </tr>
        `;
    }).join('');

    generatePremiumChart('cardio-chart', history.map(item => item.dist), history.map(item => formatDate(item.date)), "km", true);
}

function editCardio(index) {
    const history = safeGetItem('cardioHistory');
    const s = history[index];
    document.getElementById('c-date').value = s.date;
    document.getElementById('c-speed').value = s.speed;
    document.getElementById('c-time').value = s.time;
    document.getElementById('c-incline').value = s.incline;
    document.getElementById('c-dist').value = s.dist;
    document.getElementById('c-edit-index').value = index;
    
    document.getElementById('cardio-submit-btn').innerText = "Mettre à jour";
    document.getElementById('cardio-cancel-btn').classList.remove('hidden');
}

function deleteCardio(index) {
    if (confirm("Supprimer cette séance cardio ?")) {
        let history = safeGetItem('cardioHistory');
        history.splice(index, 1);
        safeSetItem('cardioHistory', history);
        renderCardio();
    }
}

function cancelCardioEdit() {
    cardioForm.reset();
    document.getElementById('c-date').valueAsDate = new Date();
    document.getElementById('c-edit-index').value = "-1";
    document.getElementById('cardio-submit-btn').innerText = "Ajouter la séance";
    document.getElementById('cardio-cancel-btn').classList.add('hidden');
}


// === RENDU DU RECTANGLE INTERACTIF SVG (INFO-BULLES FLOATING COUTURE) ===
function generatePremiumChart(containerId, dataPoints, labels, unitStr = "", isCardio = false) {
    const container = document.getElementById(containerId);
    if (dataPoints.length === 0) {
        container.innerHTML = `<div style="color:var(--text-muted); font-size:0.8rem; margin:auto; font-style:italic;">En attente de rapports analytiques...</div>`;
        return;
    }

    const maxVal = Math.max(...dataPoints) * 1.03 || 10;
    const minVal = isCardio ? 0 : Math.min(...dataPoints) * 0.97;
    const range = maxVal - minVal;

    const width = 320; const height = 160; const padding = 20;
    let pointsCoords = "";
    const stepX = (width - padding * 2) / (dataPoints.length > 1 ? dataPoints.length - 1 : 1);

    dataPoints.forEach((val, i) => {
        const x = padding + i * stepX;
        const y = height - padding - ((val - minVal) / (range || 1)) * (height - padding * 2);
        pointsCoords += `${x},${y} `;
    });

    let svg = `<svg viewBox="0 0 ${width} ${height}" style="width:100%; height:100%; overflow:visible;">`;
    svg += `<line x1="${padding}" y1="${height-padding}" x2="${width-padding}" y2="${height-padding}" stroke="#cbd5e1" stroke-width="1"/>`;
    svg += `<polyline points="${pointsCoords}" fill="none" stroke="var(--navy)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
    
    dataPoints.forEach((val, i) => {
        const x = padding + i * stepX;
        const y = height - padding - ((val - minVal) / (range || 1)) * (height - padding * 2);
        
        svg += `
            <circle cx="${x}" cy="${y}" r="4" fill="var(--white)" stroke="var(--gold)" stroke-width="2"
                onmouseover="showCustomTooltip(event, '${labels[i]}', '${val} ${unitStr}')"
                onmousemove="moveCustomTooltip(event)"
                onmouseout="hideCustomTooltip()">
            </circle>
        `;
    });

    svg += `</svg>`;
    container.innerHTML = svg;
}

function showCustomTooltip(e, dateLabel, valueLabel) {
    tooltipElement.innerHTML = `<strong>Date :</strong> ${dateLabel}<br/><strong>Valeur :</strong> ${valueLabel}`;
    tooltipElement.classList.remove('hidden');
    tooltipElement.style.opacity = "1";
    moveCustomTooltip(e);
}

function moveCustomTooltip(e) {
    tooltipElement.style.left = (e.pageX + 12) + "px";
    tooltipElement.style.top = (e.pageY - 12) + "px";
}

function hideCustomTooltip() {
    tooltipElement.classList.add('hidden');
    tooltipElement.style.opacity = "0";
}

function formatDate(dateString) {
    const d = new Date(dateString);
    if(isNaN(d.getTime())) return dateString;
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}


// === SYNC COMPOSANTE BACKUP DE SECURITE (JSON SOUVERAIN) ===
function exportDataData() {
    const fullBackupObject = {
        userProfileBaseV2: localStorage.getItem('userProfileBaseV2'),
        weightHistory: localStorage.getItem('weightHistory'),
        calendarData: localStorage.getItem('calendarData'),
        cardioHistory: localStorage.getItem('cardioHistory'),
        elitePersonalRecords: localStorage.getItem('elitePersonalRecords'),
        macroConfigMode: localStorage.getItem('macroConfigMode'),
        manualMacrosValues: localStorage.getItem('manualMacrosValues')
    };

    const todayStr = new Date().toISOString().split('T')[0];
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fullBackupObject));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `wallysport_elite_${todayStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

function triggerImportField() {
    document.getElementById('import-file-field').click();
}

function importDataData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedJSON = JSON.parse(e.target.result);
            
            if (importedJSON.userProfileBaseV2) localStorage.setItem('userProfileBaseV2', importedJSON.userProfileBaseV2);
            if (importedJSON.weightHistory) localStorage.setItem('weightHistory', importedJSON.weightHistory);
            if (importedJSON.calendarData) localStorage.setItem('calendarData', importedJSON.calendarData);
            if (importedJSON.cardioHistory) localStorage.setItem('cardioHistory', importedJSON.cardioHistory);
            if (importedJSON.elitePersonalRecords) localStorage.setItem('elitePersonalRecords', importedJSON.elitePersonalRecords);
            if (importedJSON.macroConfigMode) localStorage.setItem('macroConfigMode', importedJSON.macroConfigMode);
            if (importedJSON.manualMacrosValues) localStorage.setItem('manualMacrosValues', importedJSON.manualMacrosValues);
            
            alert("Restauration Elite accomplie. Redémarrage de l'architecture.");
            window.location.reload();
        } catch (err) {
            alert("Restauration refusée : Structure du fichier JSON invalide ou corrompue.");
        }
    };
    reader.readAsText(file);
}
