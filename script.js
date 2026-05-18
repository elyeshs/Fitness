// Navigation entre les sections
function showSection(sectionId) {
    document.querySelectorAll('section').forEach(sec => sec.classList.remove('active-section'));
    document.querySelectorAll('.nav-links li').forEach(li => li.classList.remove('active'));
    
    document.getElementById(sectionId).classList.add('active-section');
    event.currentTarget.classList.add('active');
}

// --- LOGIQUE IMC ---
document.getElementById('bmi-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const weight = parseFloat(document.getElementById('weight').value);
    const height = parseFloat(document.getElementById('height').value) / 100;
    
    const bmi = (weight / (height * height)).toFixed(1);
    let status = "";
    let className = "";

    if (bmi < 18.5) { status = "Insuffisance pondérale"; className = "status-warning"; }
    else if (bmi < 25) { status = "Poids normal"; className = "status-normal"; }
    else if (bmi < 30) { status = "Surpoids"; className = "status-warning"; }
    else { status = "Obésité"; className = "status-danger"; }

    const resultDiv = document.getElementById('bmi-result');
    resultDiv.innerHTML = `Votre IMC est de <strong>${bmi}</strong> : ${status}`;
    resultDiv.className = "result-area " + className;
});

// --- LOGIQUE PLANNING ---
const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const planningContainer = document.querySelector('.grid-days');

days.forEach(day => {
    const dayCard = document.createElement('div');
    dayCard.className = 'day-card';
    dayCard.innerHTML = `
        <h4>${day}</h4>
        <input type="text" placeholder="Type de séance (ex: Push Day)" id="plan-${day}">
    `;
    planningContainer.appendChild(dayCard);
    
    // Charger les données sauvegardées
    const saved = localStorage.getItem(`plan-${day}`);
    if (saved) dayCard.querySelector('input').value = saved;

    // Sauvegarde automatique au changement
    dayCard.querySelector('input').addEventListener('change', (e) => {
        localStorage.setItem(`plan-${day}`, e.target.value);
    });
});

// --- LOGIQUE CARDIO ---
document.getElementById('cardio-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const session = {
        date: new Date().toLocaleDateString('fr-FR'),
        speed: document.getElementById('speed').value,
        duration: document.getElementById('duration').value,
        distance: document.getElementById('distance').value
    };

    saveCardio(session);
    renderCardio();
    this.reset();
});

function saveCardio(session) {
    let history = JSON.parse(localStorage.getItem('cardioHistory') || '[]');
    history.unshift(session);
    localStorage.setItem('cardioHistory', JSON.stringify(history.slice(0, 5))); // Garder les 5 derniers
}

function renderCardio() {
    const list = document.getElementById('cardio-list');
    const history = JSON.parse(localStorage.getItem('cardioHistory') || '[]');
    list.innerHTML = history.map(s => `
        <li>
            <strong>${s.date}</strong> : ${s.distance}km à ${s.speed}km/h pendant ${s.duration}min
        </li>
    `).join('');
}

// Initialisation
renderCardio();