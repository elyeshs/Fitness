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

// === INTERACTION FENÊTRE POPUP MODAL ===
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

// === DEMARRAGE GLOBAL DE L'APPLICATION ===
document.addEventListener('DOMContentLoaded', () => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('current-date-display').innerText = new Date().toLocaleDateString('fr-FR', options);

    document.getElementById('c-date').valueAsDate = new Date();
    document.getElementById('w-date').valueAsDate = new Date();

    loadProfileData();
    renderWeight();
    renderCalendar();
    renderCardio();
    renderHydration();
});

// === SAUVEGARDE FORMULAIRE PROFIL MORPHOLOGIQUE ===
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

// === ENGINE DE RECALCUL : IMC, CALORIES & NOUVEAUX MACRONUTRIMENTS ===
function recalculatePhysiqueAndCalories() {
    const profile = safeGetItem('userProfileBaseV2', 'null');
    const weights = safeGetItem('weightHistory');
    
    // Selecteurs DOM
    const bmiNum = document.getElementById('bmi-num');
    const bmiText = document.getElementById('bmi-text');
    const bmiAdvice = document.getElementById('bmi-advice');
    const colorBox = document.getElementById('bmi-color-box');

    const calBaseDisplay = document.getElementById('cal-base');
    const calMaintenanceDisplay = document.getElementById('cal-maintenance');
    const calDeficitDisplay = document.getElementById('cal-deficit');
    const calSurplusDisplay = document.getElementById('cal-surplus');

    const protDisplay = document.getElementById('macro-protein');
    const fatDisplay = document.getElementById('macro-fat');
    const carbDisplay = document.getElementById('macro-carb');

    if (!profile || !profile.height || !profile.age) {
        bmiNum.innerText = "--"; bmiText.innerText = "Profil incomplet";
        colorBox.className = "bmi-value bg-default";
        calBaseDisplay.innerText = "--"; calMaintenanceDisplay.innerText = "--";
        calDeficitDisplay.innerText = "--"; calSurplusDisplay.innerText = "--";
        protDisplay.innerText = "-- g"; fatDisplay.innerText = "-- g"; carbDisplay.innerText = "-- g";
        return;
    }

    let activeWeight = 0;
    if (weights.length > 0) {
        activeWeight = weights[weights.length - 1].weight;
    } else {
        bmiNum.innerText = "--"; bmiText.innerText = "En attente de poids";
        bmiAdvice.innerText = "Veuillez entrer une pesée ci-dessous pour lancer les calculs physiologiques.";
        colorBox.className = "bmi-value bg-default";
        calBaseDisplay.innerText = "--"; calMaintenanceDisplay.innerText = "--";
        calDeficitDisplay.innerText = "--"; calSurplusDisplay.innerText = "--";
        protDisplay.innerText = "-- g"; fatDisplay.innerText = "-- g"; carbDisplay.innerText = "-- g";
        return;
    }

    // 1. IMC Rendu
    const hMeter = profile.height / 100;
    const bmi = (activeWeight / (hMeter * hMeter)).toFixed(1);
    bmiNum.innerText = bmi;
    colorBox.classList.remove('bg-normal', 'bg-warning', 'bg-danger', 'bg-default');

    if (bmi < 18.5) {
        bmiText.innerText = `Insuffisance pondérale (${activeWeight} kg)`;
        bmiAdvice.innerText = "Votre poids de base est inférieur à l'indice de santé classique.";
        colorBox.classList.add('bg-warning');
    } else if (bmi < 25) {
        bmiText.innerText = `Corpulence normale (${activeWeight} kg)`;
        bmiAdvice.innerText = "Parfait ! Votre ratio poids/taille actuel est idéal.";
        colorBox.classList.add('bg-normal');
    } else if (bmi < 30) {
        bmiText.innerText = `Surpoids (${activeWeight} kg)`;
        bmiAdvice.innerText = "Zone de vigilance. Surveillez vos apports et maintenez l'effort physique.";
        colorBox.classList.add('bg-warning');
    } else {
        bmiText.innerText = `Obésité (${activeWeight} kg)`;
        bmiAdvice.innerText = "Poids à risque métabolique élevé. Structurez un déficit calorique calibré.";
        colorBox.classList.add('bg-danger');
    }

    // 2. Calories (Mifflin-St Jeor)
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

    // 3. Calcul automatique des Macronutriments (Basé sur la maintenance athlétique)
    const pGrams = activeWeight * 2; // 2g par kg de poids de corps
    const fGrams = activeWeight * 1; // 1g par kg de poids de corps
    const remainingKcal = maintenance - ((pGrams * 4) + (fGrams * 9));
    const cGrams = Math.max(0, remainingKcal / 4);

    protDisplay.innerText = `${Math.round(pGrams)} g`;
    fatDisplay.innerText = `${Math.round(fGrams)} g`;
    carbDisplay.innerText = `${Math.round(cGrams)} g`;
}


// === INTERACTIVE HYDRATION WATER TRACKER ===
function getTodayKey() {
    return new Date().toISOString().split('T')[0];
}

function renderHydration() {
    const today = getTodayKey();
    const data = safeGetItem('hydrationHistory', '{}');
    const currentGlasses = data[today] || 0;
    
    document.getElementById('water-liters').innerText = (currentGlasses * 0.25).toFixed(1);
    
    const fillPercent = Math.min(100, (currentGlasses / 8) * 100);
    document.getElementById('water-progress-fill').style.width = `${fillPercent}%`;

    const cupsGrid = document.getElementById('cups-grid');
    cupsGrid.innerHTML = "";
    
    for (let i = 1; i <= 8; i++) {
        const isFilled = i <= currentGlasses;
        cupsGrid.innerHTML += `
            <div class="cup-item ${isFilled ? 'filled' : ''}" onclick="toggleCupDirect(${i}, ${currentGlasses})">
                ${isFilled ? '🥛' : '💧'}
            </div>
        `;
    }
}

function addWaterGlass() {
    const today = getTodayKey();
    let data = safeGetItem('hydrationHistory', '{}');
    data[today] = (data[today] || 0) + 1;
    safeSetItem('hydrationHistory', data);
    renderHydration();
}

function toggleCupDirect(index, current) {
    const today = getTodayKey();
    let data = safeGetItem('hydrationHistory', '{}');
    data[today] = index === current ? index - 1 : index;
    safeSetItem('hydrationHistory', data);
    renderHydration();
}

function resetWaterDay() {
    if(confirm("Vider le compteur d'eau pour aujourd'hui ?")) {
        const today = getTodayKey();
        let data = safeGetItem('hydrationHistory', '{}');
        delete data[today];
        safeSetItem('hydrationHistory', data);
        renderHydration();
    }
}


// === HISTORIQUE DE POIDS ===
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
    if (confirm("Supprimer cette pesée ?")) {
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


// === CALENDRIER ET COMPOSANT DE BADGES AUTOMATIQUES ===
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

            // Moteur d'assignation automatique des badges
            let badgeClass = "badge-default";
            let iconPrefix = "🏋️‍♂️ ";
            if (norm.includes("CARDIO") || norm.includes("RUN") || norm.includes("VELO") || norm.includes("COURSE")) {
                badgeClass = "badge-cardio";
                iconPrefix = "🏃‍♂️ ";
            } else if (norm.includes("PUSH") || norm.includes("PULL") || norm.includes("LEGS") || norm.includes("MUSCU")) {
                badgeClass = "badge-muscu";
            }
            badgeHtml = `<span class="cal-badge ${badgeClass}">${iconPrefix}${activity}</span>`;
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
    const newActivity = prompt(`Activité du ${displayDate} (Ex: Cardio, Push, Pull, Jambes) :\nLaissez vide pour supprimer.`, currentActivity);
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
    
    if (keys.length === 0) { list.innerHTML = `<li>Aucune activité enregistrée ce mois-ci.</li>`; return; }

    keys.forEach(activity => {
        const percentage = ((stats[activity] / total) * 100).toFixed(0);
        list.innerHTML += `<li>${activity} <span>${percentage}%</span></li>`;
    });
}


// === HISTORIQUE CARDIO ===
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
    if (confirm("Supprimer cette ligne cardio ?")) {
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


// === RENDU DU RECTANGLE INTERACTIF SVG (INFO-BULLES HTML FLOTTANTES PREMIUM) ===
function generatePremiumChart(containerId, dataPoints, labels, unitStr = "", isCardio = false) {
    const container = document.getElementById(containerId);
    if (dataPoints.length === 0) {
        container.innerHTML = `<div style="color:var(--text-muted); font-size:0.85rem; margin:auto;">En attente de relevés...</div>`;
        return;
    }

    const maxVal = Math.max(...dataPoints) * 1.05 || 10;
    const minVal = isCardio ? 0 : Math.min(...dataPoints) * 0.95;
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
    svg += `<line x1="${padding}" y1="${height-padding}" x2="${width-padding}" y2="${height-padding}" stroke="#cbd5e1" stroke-width="1.5"/>`;
    svg += `<polyline points="${pointsCoords}" fill="none" stroke="var(--primary)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
    
    dataPoints.forEach((val, i) => {
        const x = padding + i * stepX;
        const y = height - padding - ((val - minVal) / (range || 1)) * (height - padding * 2);
        
        // Attachement des fonctions de déplacement custom tooltip sur l'élément circle
        svg += `
            <circle cx="${x}" cy="${y}" r="4.5" fill="var(--white)" stroke="var(--primary)" stroke-width="2.5"
                onmouseover="showCustomTooltip(event, '${labels[i]}', '${val} ${unitStr}')"
                onmousemove="moveCustomTooltip(event)"
                onmouseout="hideCustomTooltip()">
            </circle>
        `;
    });

    svg += `</svg>`;
    container.innerHTML = svg;
}

// LOGIQUE DES ÉVÉNEMENTS DU HOVER FLOATING TOOLTIP
function showCustomTooltip(e, dateLabel, valueLabel) {
    tooltipElement.innerHTML = `<strong>Date :</strong> ${dateLabel}<br/><strong>Valeur :</strong> ${valueLabel}`;
    tooltipElement.classList.remove('hidden');
    tooltipElement.style.opacity = "1";
    moveCustomTooltip(e);
}

function moveCustomTooltip(e) {
    tooltipElement.style.left = (e.pageX + 15) + "px";
    tooltipElement.style.top = (e.pageY - 15) + "px";
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


// === ENGINE DE BACKUP DE SÉCURITÉ (EXPORT / IMPORT AUTOMATIQUE) ===
function exportDataData() {
    const fullBackupObject = {
        userProfileBaseV2: localStorage.getItem('userProfileBaseV2'),
        weightHistory: localStorage.getItem('weightHistory'),
        calendarData: localStorage.getItem('calendarData'),
        cardioHistory: localStorage.getItem('cardioHistory'),
        hydrationHistory: localStorage.getItem('hydrationHistory')
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fullBackupObject));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `wallysport_backup_${getTodayKey()}.json`);
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
            
            // Validation et restauration sélective des clés détectées
            if (importedJSON.userProfileBaseV2) localStorage.setItem('userProfileBaseV2', importedJSON.userProfileBaseV2);
            if (importedJSON.weightHistory) localStorage.setItem('weightHistory', importedJSON.weightHistory);
            if (importedJSON.calendarData) localStorage.setItem('calendarData', importedJSON.calendarData);
            if (importedJSON.cardioHistory) localStorage.setItem('cardioHistory', importedJSON.cardioHistory);
            if (importedJSON.hydrationHistory) localStorage.setItem('hydrationHistory', importedJSON.hydrationHistory);
            
            alert("Restauration complète effectuée avec succès ! Le tableau de bord va s'actualiser.");
            window.location.reload();
        } catch (err) {
            alert("Erreur de lecture : Le fichier fourni n'est pas un fichier de sauvegarde Wally Sport valide.");
        }
    };
    reader.readAsText(file);
}
