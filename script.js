// SYSTÈME DE VÉRIFICATION DES ENTRÉES ET DU STOCKAGE LOCAL
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

// === BOUTONS ET EVENEMENTS DE LA FENETRE MODALE PROFIL ===
const profileModal = document.getElementById('profile-modal');
const openProfileBtn = document.getElementById('open-profile-btn');
const closeProfileBtn = document.getElementById('close-profile-btn');
const cancelProfileBtn = document.getElementById('cancel-profile-btn');
const profileForm = document.getElementById('profile-form');

openProfileBtn.addEventListener('click', () => profileModal.classList.remove('hidden'));
closeProfileBtn.addEventListener('click', () => profileModal.classList.add('hidden'));
cancelProfileBtn.addEventListener('click', () => profileModal.classList.add('hidden'));

// Fermeture si clic à l'extérieur de la boîte blanche
window.addEventListener('click', (e) => {
    if (e.target === profileModal) { profileModal.classList.add('hidden'); }
});

// === APPLICATION BOOTSTRAP INITIALISATION ===
document.addEventListener('DOMContentLoaded', () => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('current-date-display').innerText = new Date().toLocaleDateString('fr-FR', options);

    // Initialisation automatique des dates des formulaires
    document.getElementById('c-date').valueAsDate = new Date();
    document.getElementById('w-date').valueAsDate = new Date();

    loadProfileData();
    renderWeight();
    renderCalendar();
    renderCardio();
});

// === SAUVEGARDE DU PROFIL MORPHOLOGIQUE (POPUP MODAL) ===
profileForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const birthdate = document.getElementById('birthdate').value;
    const height = parseFloat(document.getElementById('height').value);
    
    const profileData = { birthdate, height };
    safeSetItem('userProfileBase', profileData);
    
    profileModal.classList.add('hidden'); // Fermeture automatique
    recalculateDynamicBMI(); // Actualiser directement sur l'écran d'accueil
});

function loadProfileData() {
    const saved = safeGetItem('userProfileBase', 'null');
    if (saved) {
        document.getElementById('birthdate').value = saved.birthdate;
        document.getElementById('height').value = saved.height;
    }
}

// === SYSTÈME DE RECALCUL AUTOMATIQUE DE L'IMC PAR RAPPORT AU DERNIER POIDS ===
function recalculateDynamicBMI() {
    const profile = safeGetItem('userProfileBase', 'null');
    const weights = safeGetItem('weightHistory'); // Déjà trié chronologiquement par fonction parent
    
    const bmiNum = document.getElementById('bmi-num');
    const bmiText = document.getElementById('bmi-text');
    const bmiAdvice = document.getElementById('bmi-advice');
    const colorBox = document.getElementById('bmi-color-box');

    if (!profile || !profile.height) {
        bmiNum.innerText = "--";
        bmiText.innerText = "Profil incomplet";
        colorBox.className = "bmi-value bg-default";
        return;
    }

    let activeWeight = 0;
    if (weights.length > 0) {
        // Prendre la pesée chronologiquement la plus récente (dernier élément du tableau trié)
        activeWeight = weights[weights.length - 1].weight;
    } else {
        bmiNum.innerText = "--";
        bmiText.innerText = "En attente de poids";
        bmiAdvice.innerText = "Veuillez entrer une pesée ci-dessous dans le tableau de suivi pour voir votre IMC évoluer.";
        colorBox.className = "bmi-value bg-default";
        return;
    }

    const hMeter = profile.height / 100;
    const bmi = (activeWeight / (hMeter * hMeter)).toFixed(1);
    
    bmiNum.innerText = bmi;
    colorBox.classList.remove('bg-normal', 'bg-warning', 'bg-danger', 'bg-default');

    if (bmi < 18.5) {
        bmiText.innerText = `Insuffisance pondérale (${activeWeight} kg)`;
        bmiAdvice.innerText = "Votre poids actuel est inférieur à la moyenne recommandée.";
        colorBox.classList.add('bg-warning');
    } else if (bmi < 25) {
        bmiText.innerText = `Corpulence normale (${activeWeight} kg)`;
        bmiAdvice.innerText = "Félicitations, vous êtes dans la zone de poids équilibrée.";
        colorBox.classList.add('bg-normal');
    } else if (bmi < 30) {
        bmiText.innerText = `Surpoids (${activeWeight} kg)`;
        bmiAdvice.innerText = "Attention à votre répartition calorique et maintenez l'effort cardio.";
        colorBox.classList.add('bg-warning');
    } else {
        bmiText.innerText = `Obésité (${activeWeight} kg)`;
        bmiAdvice.innerText = "Consultez un spécialiste pour structurer un déficit sécurisé.";
        colorBox.classList.add('bg-danger');
    }
}


// === SECTION SUIVI DE POIDS HISTORIQUE ===
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

    // Tri strict par date chronologique
    history.sort((a, b) => new Date(a.date) - new Date(b.date));
    safeSetItem('weightHistory', history);
    
    renderWeight();
    weightForm.reset();
    document.getElementById('w-date').valueAsDate = new Date();
});

function renderWeight() {
    const body = document.getElementById('weight-body');
    const history = safeGetItem('weightHistory');
    const displayHistory = [...history].reverse(); // Récents en haut de liste

    body.innerHTML = displayHistory.map((s, idx) => {
        const realIndex = history.findIndex(x => x.date === s.date && x.weight === s.weight);
        let targetProgressionStr = "—";
        let progClass = "prog-equal";

        if (realIndex > 0) {
            const diff = (s.weight - history[realIndex - 1].weight).toFixed(1);
            if (diff > 0) { targetProgressionStr = `+${diff} kg`; progClass = "prog-positive"; }
            else if (diff < 0) { targetProgressionStr = `${diff} kg`; progClass = "prog-negative"; }
            else { targetProgressionStr = "0.0 kg"; }
        }

        return `
            <tr>
                <td>${formatDate(s.date)}</td>
                <td><strong>${s.weight} kg</strong></td>
                <td class="progression ${progClass}">${targetProgressionStr}</td>
                <td class="action-btns">
                    <button onclick="editWeight(${realIndex})" class="btn-small btn-edit">Modifier</button>
                    <button onclick="deleteWeight(${realIndex})" class="btn-small btn-delete">Supprimer</button>
                </td>
            </tr>
        `;
    }).join('');

    generateInteractiveChart('weight-chart', history.map(item => item.weight), history.map(item => formatDate(item.date)), "kg");
    recalculateDynamicBMI(); // Calcul instantané de l'IMC
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
    if (confirm("Supprimer cette ligne de poids ?")) {
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


// === SECTION CALENDRIER ET STATISTIQUES EN % ===
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
    let totalActivitiesCount = 0;

    for (let i = 0; i < startOffset; i++) { grid.innerHTML += `<div class="cal-day empty"></div>`; }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const activity = monthlyData[dateKey] || "";

        if (activity) {
            const normalized = activity.trim().toUpperCase();
            statsCounter[normalized] = (statsCounter[normalized] || 0) + 1;
            totalActivitiesCount++;
        }

        const dayDiv = document.createElement('div');
        dayDiv.className = 'cal-day';
        dayDiv.innerHTML = `<span class="cal-date">${day}</span><span class="cal-content">${activity}</span>`;
        dayDiv.onclick = () => promptActivity(dateKey, activity, `${day} ${monthNames[month]}`);
        grid.appendChild(dayDiv);
    }
    
    renderStats(statsCounter, totalActivitiesCount);
}

function promptActivity(dateKey, currentActivity, displayDate) {
    const newActivity = prompt(`Séance du ${displayDate} (Ex: Push, Pull, Cardio) :\nLaissez vide pour supprimer.`, currentActivity);
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
    
    if (keys.length === 0) { list.innerHTML = `<li>Aucune séance planifiée ce mois-ci.</li>`; return; }

    keys.forEach(activity => {
        const percentage = ((stats[activity] / total) * 100).toFixed(0);
        list.innerHTML += `<li>${activity} <span>${percentage}%</span></li>`;
    });
}


// === SECTION CARDIO (SUPPORT DECIMAL POUR LA PENTE) ===
const cardioForm = document.getElementById('cardio-form');
cardioForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const session = {
        date: document.getElementById('c-date').value,
        speed: document.getElementById('c-speed').value,
        time: document.getElementById('c-time').value,
        incline: parseFloat(document.getElementById('c-incline').value).toFixed(1), // Autorise & fixe la valeur décimale
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

    generateInteractiveChart('cardio-chart', history.map(item => item.dist), history.map(item => formatDate(item.date)), "km", true);
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
    if (confirm("Supprimer cette entrée cardio ?")) {
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


// === ENGIN DE RENDU DE GRAPHIQUES SVG INTERACTIFS AVEC VALEUR AU SURVOL ===
function generateInteractiveChart(containerId, dataPoints, labels, unitStr = "", isCardio = false) {
    const container = document.getElementById(containerId);
    if (dataPoints.length === 0) {
        container.innerHTML = `<div style="color:var(--text-muted); font-size:0.85rem; margin:auto;">En attente de relevés...</div>`;
        return;
    }

    const maxVal = Math.max(...dataPoints) * 1.05 || 10;
    const minVal = isCardio ? 0 : Math.min(...dataPoints) * 0.95;
    const range = maxVal - minVal;

    const width = 320;
    const height = 160;
    const padding = 20;

    let pointsCoords = "";
    const stepX = (width - padding * 2) / (dataPoints.length > 1 ? dataPoints.length - 1 : 1);

    dataPoints.forEach((val, i) => {
        const x = padding + i * stepX;
        const y = height - padding - ((val - minVal) / (range || 1)) * (height - padding * 2);
        pointsCoords += `${x},${y} `;
    });

    let svgContent = `<svg viewBox="0 0 ${width} ${height}" style="width:100%; height:100%; overflow:visible;">`;
    
    // Grille horizontale basse
    svgContent += `<line x1="${padding}" y1="${height-padding}" x2="${width-padding}" y2="${height-padding}" stroke="#cbd5e1" stroke-width="1.5"/>`;
    
    // Ligne brisée (Polyline)
    svgContent += `<polyline points="${pointsCoords}" fill="none" stroke="var(--primary)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
    
    // Génération des nœuds de données interactifs avec élément <title> pour affichage au survol
    dataPoints.forEach((val, i) => {
        const x = padding + i * stepX;
        const y = height - padding - ((val - minVal) / (range || 1)) * (height - padding * 2);
        
        svgContent += `
            <circle cx="${x}" cy="${y}" r="4.5" fill="var(--white)" stroke="var(--primary)" stroke-width="2.5">
                <title>Date: ${labels[i]}\nValeur: ${val} ${unitStr}</title>
            </circle>
        `;
    });

    svgContent += `</svg>`;
    container.innerHTML = svgContent;
}

function formatDate(dateString) {
    const d = new Date(dateString);
    if(isNaN(d.getTime())) return dateString;
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}
