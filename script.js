/**
 * Mécanisme de protection des données locales (Crash Shield Concept)
 * Évite la corruption des données JSON.
 */
function safeGetItem(key, defaultValue = '[]') {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : JSON.parse(defaultValue);
    } catch (e) {
        console.error(`Erreur de lecture locale pour ${key}. Restauration par défaut.`);
        return JSON.parse(defaultValue);
    }
}

function safeSetItem(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error(`Erreur d'écriture locale pour ${key}.`, e);
    }
}

// === INITIALISATION ===
document.addEventListener('DOMContentLoaded', () => {
    // Affichage de la date en haut
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('current-date-display').innerText = new Date().toLocaleDateString('fr-FR', options);

    // Initialisation des dates par défaut dans les formulaires
    document.getElementById('c-date').valueAsDate = new Date();

    loadProfile();
    renderCalendar();
    renderCardio();
});

// === SECTION PROFIL & IMC ===
const profileForm = document.getElementById('profile-form');
profileForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const birthdate = document.getElementById('birthdate').value;
    const weight = parseFloat(document.getElementById('weight').value);
    const height = parseFloat(document.getElementById('height').value) / 100;
    const bmi = (weight / (height * height)).toFixed(1);
    
    let status = "";
    let colorClass = "";

    if (bmi < 18.5) { 
        status = "Insuffisance pondérale"; 
        colorClass = "bg-warning";
    } else if (bmi < 25) { 
        status = "Corpulence normale"; 
        colorClass = "bg-normal";
    } else if (bmi < 30) { 
        status = "Surpoids"; 
        colorClass = "bg-warning";
    } else { 
        status = "Obésité"; 
        colorClass = "bg-danger";
    }

    const profileData = { birthdate, weight, height: height*100, bmi, status, colorClass };
    safeSetItem('userProfile', profileData);
    
    updateBmiDisplay(profileData);
});

function loadProfile() {
    const savedProfile = safeGetItem('userProfile', 'null');
    if (savedProfile) {
        document.getElementById('birthdate').value = savedProfile.birthdate;
        document.getElementById('weight').value = savedProfile.weight;
        document.getElementById('height').value = savedProfile.height;
        updateBmiDisplay(savedProfile);
    }
}

function updateBmiDisplay(data) {
    const display = document.getElementById('bmi-display');
    const colorBox = document.getElementById('bmi-color-box');
    
    document.getElementById('bmi-num').innerText = data.bmi;
    document.getElementById('bmi-text').innerText = data.status;
    
    // Nettoyage des anciennes classes
    colorBox.classList.remove('bg-normal', 'bg-warning', 'bg-danger', 'bg-default');
    colorBox.classList.add(data.colorClass);
    
    display.classList.remove('hidden');
}


// === SECTION CALENDRIER & STATS ===
let currentCalDate = new Date();

function changeMonth(offset) {
    currentCalDate.setMonth(currentCalDate.getMonth() + offset);
    renderCalendar();
}

function renderCalendar() {
    const year = currentCalDate.getFullYear();
    const month = currentCalDate.getMonth();
    
    const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
    document.getElementById('month-year-display').innerText = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Ajustement pour que la semaine commence le lundi (0 = lundi, 6 = dimanche)
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;

    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = "";

    const monthlyData = safeGetItem('calendarData', '{}');
    const statsCounter = {};

    // Cases vides avant le 1er du mois
    for (let i = 0; i < startOffset; i++) {
        grid.innerHTML += `<div class="cal-day empty"></div>`;
    }

    // Jours du mois
    for (let day = 1; day <= daysInMonth; day++) {
        // Format YYYY-MM-DD
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const activity = monthlyData[dateKey] || "";

        // Calcul des stats
        if (activity) {
            const normalizedActivity = activity.trim().toUpperCase();
            statsCounter[normalizedActivity] = (statsCounter[normalizedActivity] || 0) + 1;
        }

        const dayDiv = document.createElement('div');
        dayDiv.className = 'cal-day';
        dayDiv.innerHTML = `
            <span class="cal-date">${day}</span>
            <span class="cal-content">${activity}</span>
        `;
        
        dayDiv.onclick = () => promptActivity(dateKey, activity, `${day} ${monthNames[month]}`);
        grid.appendChild(dayDiv);
    }
    
    renderStats(statsCounter);
}

function promptActivity(dateKey, currentActivity, displayDate) {
    const newActivity = prompt(`Séance pour le ${displayDate} :\n(Laissez vide pour supprimer)`, currentActivity);
    
    if (newActivity !== null) { // null si l'utilisateur annule le prompt
        const monthlyData = safeGetItem('calendarData', '{}');
        
        if (newActivity.trim() === "") {
            delete monthlyData[dateKey]; // Suppression
        } else {
            monthlyData[dateKey] = newActivity.trim(); // Ajout / Modification
        }
        
        safeSetItem('calendarData', monthlyData);
        renderCalendar(); // Rafraîchir
    }
}

function renderStats(stats) {
    const list = document.getElementById('monthly-stats');
    list.innerHTML = "";
    
    const keys = Object.keys(stats);
    if (keys.length === 0) {
        list.innerHTML = `<li>Aucune activité enregistrée ce mois-ci.</li>`;
        return;
    }

    keys.forEach(activity => {
        list.innerHTML += `<li>${activity} <span>${stats[activity]} fois</span></li>`;
    });
}


// === SECTION CARDIO (CRUD Complet) ===
const cardioForm = document.getElementById('cardio-form');

cardioForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const session = {
        date: document.getElementById('c-date').value,
        speed: document.getElementById('c-speed').value,
        time: document.getElementById('c-time').value,
        incline: document.getElementById('c-incline').value,
        dist: document.getElementById('c-dist').value
    };

    let history = safeGetItem('cardioHistory');
    const editIndex = document.getElementById('c-edit-index').value;

    if (editIndex === "-1") {
        // Mode Création
        history.unshift(session);
    } else {
        // Mode Modification
        history[parseInt(editIndex)] = session;
        cancelCardioEdit(); // Réinitialise l'état du formulaire
    }

    // Tri par date décroissante
    history.sort((a, b) => new Date(b.date) - new Date(a.date));

    safeSetItem('cardioHistory', history);
    renderCardio();
    cardioForm.reset();
    document.getElementById('c-date').valueAsDate = new Date();
});

function renderCardio() {
    const body = document.getElementById('cardio-body');
    const history = safeGetItem('cardioHistory');
    
    body.innerHTML = history.map((s, index) => `
        <tr>
            <td>${formatDate(s.date)}</td>
            <td>${s.speed} km/h</td>
            <td>${s.time} min</td>
            <td>${s.incline}%</td>
            <td>${s.dist} km</td>
            <td class="action-btns">
                <button onclick="editCardio(${index})" class="btn-small btn-edit">Modifier</button>
                <button onclick="deleteCardio(${index})" class="btn-small btn-delete">Supprimer</button>
            </td>
        </tr>
    `).join('');
}

function editCardio(index) {
    const history = safeGetItem('cardioHistory');
    const session = history[index];
    
    document.getElementById('c-date').value = session.date;
    document.getElementById('c-speed').value = session.speed;
    document.getElementById('c-time').value = session.time;
    document.getElementById('c-incline').value = session.incline;
    document.getElementById('c-dist').value = session.dist;
    
    document.getElementById('c-edit-index').value = index;
    
    // Changement UI
    document.getElementById('cardio-submit-btn').innerText = "Mettre à jour la séance";
    document.getElementById('cardio-cancel-btn').classList.remove('hidden');
    
    // Scroll vers le formulaire
    document.getElementById('section-cardio').scrollIntoView({ behavior: 'smooth' });
}

function deleteCardio(index) {
    if (confirm("Voulez-vous vraiment supprimer cette séance ?")) {
        let history = safeGetItem('cardioHistory');
        history.splice(index, 1);
        safeSetItem('cardioHistory', history);
        renderCardio();
        
        // Si on supprime la session en cours d'édition
        if(document.getElementById('c-edit-index').value == index) {
            cancelCardioEdit();
        }
    }
}

function cancelCardioEdit() {
    cardioForm.reset();
    document.getElementById('c-date').valueAsDate = new Date();
    document.getElementById('c-edit-index').value = "-1";
    document.getElementById('cardio-submit-btn').innerText = "Ajouter la séance";
    document.getElementById('cardio-cancel-btn').classList.add('hidden');
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
