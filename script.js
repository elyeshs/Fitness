// === STOCKAGE ROBUSTE ===
function safeGetItem(key, defaultValue = '[]') {
    try { const item = localStorage.getItem(key); return item ? JSON.parse(item) : JSON.parse(defaultValue); } catch (e) { return JSON.parse(defaultValue); }
}
function safeSetItem(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) {}
}
function escapeHtml(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function formatDate(dateString) {
    const d = new Date(dateString); return isNaN(d) ? '' : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// === HAPTIC FEEDBACK ===
function triggerHaptic() {
    if (navigator.vibrate) { navigator.vibrate(40); }
}

// === ICONES SVG ===
const iconEdit = `<svg class="icon-sm" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
const iconTrash = `<svg class="icon-sm" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;

// === POP-UP DE CONFIRMATION ===
function showConfirm(message, callback) {
    triggerHaptic();
    const modal = document.getElementById('confirm-modal');
    document.getElementById('confirm-message').innerText = message;
    modal.classList.remove('hidden');

    const okBtn = document.getElementById('confirm-ok-btn');
    const cancelBtn = document.getElementById('confirm-cancel-btn');
    const newOkBtn = okBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOkBtn, okBtn);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    newOkBtn.addEventListener('click', () => { triggerHaptic(); modal.classList.add('hidden'); callback(); });
    newCancelBtn.addEventListener('click', () => { triggerHaptic(); modal.classList.add('hidden'); });
}

// === ANIMATIONS & SCROLL ===
function animateValue(obj, start, end, duration, isFloat = false) {
    if (!obj) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        let val = progress * (end - start) + start;
        obj.innerHTML = isFloat ? val.toFixed(1) : Math.floor(val);
        if (progress < 1) { window.requestAnimationFrame(step); }
    };
    window.requestAnimationFrame(step);
}

function initScrollObserver() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if(entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.classList.add('reveal-visible');
                    entry.target.classList.remove('reveal-hidden');
                }, index * 80);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.05 });

    document.querySelectorAll('.bento-item').forEach(el => {
        el.classList.add('reveal-hidden');
        observer.observe(el);
    });
}

// === INITIALISATION ===
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('current-date-display').innerText = new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    // Initialisation des dates par défaut
    const today = new Date();
    if(document.getElementById('c-date')) document.getElementById('c-date').valueAsDate = today;
    if(document.getElementById('rec-date')) document.getElementById('rec-date').valueAsDate = today;

    loadProfileData();
    initMacroControls();
    renderWeight();
    renderRecords();
    renderCardio();
    renderCalendarInit();
    updateSmartCoach();
    updateGamification();
    
    initScrollObserver();
});

// === MODALS & PROFIL ===
const profileModal = document.getElementById('profile-modal');
document.getElementById('open-profile-btn').addEventListener('click', () => { triggerHaptic(); profileModal.classList.remove('hidden'); });
document.getElementById('close-profile-btn').addEventListener('click', () => { triggerHaptic(); profileModal.classList.add('hidden'); });
document.getElementById('cancel-profile-btn').addEventListener('click', () => { triggerHaptic(); profileModal.classList.add('hidden'); });

document.getElementById('profile-form').addEventListener('submit', (e) => {
    e.preventDefault(); triggerHaptic();
    safeSetItem('userProfileBaseV2', {
        gender: document.getElementById('gender').value,
        age: parseInt(document.getElementById('age').value),
        height: parseFloat(document.getElementById('height').value),
        activityLevel: parseFloat(document.getElementById('activity-level').value)
    });
    profileModal.classList.add('hidden');
    recalculatePhysiqueAndCalories();
});

function loadProfileData() {
    const saved = safeGetItem('userProfileBaseV2', 'null');
    if (saved) {
        document.getElementById('gender').value = saved.gender || 'male';
        document.getElementById('age').value = saved.age || '';
        document.getElementById('height').value = saved.height || '';
        document.getElementById('activity-level').value = saved.activityLevel || '1.2';
    }
}

// === IMPORT / EXPORT ===
window.exportData = function() {
    triggerHaptic();
    const data = {
        userProfileBaseV2: localStorage.getItem('userProfileBaseV2'),
        weightHistory: localStorage.getItem('weightHistory'),
        calendarData: localStorage.getItem('calendarData'),
        cardioHistory: localStorage.getItem('cardioHistory'),
        elitePersonalRecords: localStorage.getItem('elitePersonalRecords'),
        macroConfigMode: localStorage.getItem('macroConfigMode'),
        manualMacrosValues: localStorage.getItem('manualMacrosValues')
    };
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `wally_sport_elite_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
}
window.importData = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
        try {
            const json = JSON.parse(ev.target.result);
            Object.keys(json).forEach(k => { if(json[k]) localStorage.setItem(k, json[k]); });
            alert("Restauration Bento achevée."); window.location.reload();
        } catch (err) { alert("Format de fichier invalide."); }
    };
    reader.readAsText(file);
}

// === MACRONUTRIMENTS ===
function initMacroControls() {
    const mode = safeGetItem('macroConfigMode', '"auto"');
    if (mode === "manual") {
        document.getElementById('macro-mode-manual').checked = true;
        setMacroInputsDisabled(false);
        const manual = safeGetItem('manualMacrosValues', '{"prot":0,"fat":0,"carb":0}');
        document.getElementById('input-macro-prot').value = manual.prot;
        document.getElementById('input-macro-fat').value = manual.fat;
        document.getElementById('input-macro-carb').value = manual.carb;
    } else {
        document.getElementById('macro-mode-auto').checked = true;
        setMacroInputsDisabled(true);
    }
    document.getElementById('macro-mode-auto').addEventListener('change', () => handleMacroMode("auto"));
    document.getElementById('macro-mode-manual').addEventListener('change', () => handleMacroMode("manual"));
    ['prot', 'fat', 'carb'].forEach(m => document.getElementById(`input-macro-${m}`).addEventListener('input', saveManualMacros));
}
function setMacroInputsDisabled(d) { ['prot', 'fat', 'carb'].forEach(m => document.getElementById(`input-macro-${m}`).disabled = d); }
function handleMacroMode(mode) { 
    safeSetItem('macroConfigMode', mode); 
    if(mode === "auto") { setMacroInputsDisabled(true); recalculatePhysiqueAndCalories(); } 
    else { setMacroInputsDisabled(false); saveManualMacros(); } 
}
function saveManualMacros() { safeSetItem('manualMacrosValues', { prot: parseInt(document.getElementById('input-macro-prot').value)||0, fat: parseInt(document.getElementById('input-macro-fat').value)||0, carb: parseInt(document.getElementById('input-macro-carb').value)||0 }); }

function recalculatePhysiqueAndCalories() {
    const profile = safeGetItem('userProfileBaseV2', 'null');
    const weights = safeGetItem('weightHistory', '[]');
    const mode = safeGetItem('macroConfigMode', '"auto"');
    
    if (weights.length >= 2) {
        const diff = (weights[weights.length-1].weight - weights[weights.length-2].weight).toFixed(1);
        document.getElementById('weight-delta-display').innerText = diff > 0 ? `+${diff} kg` : `${diff} kg`;
    } else {
        document.getElementById('weight-delta-display').innerText = "—";
    }

    const bmiBox = document.getElementById('bmi-color-box');
    const bmiText = document.getElementById('bmi-text');
    const bmiAdvice = document.getElementById('bmi-advice');
    bmiBox.className = 'bmi-value';

    if (!profile || !profile.height || weights.length === 0) {
        bmiText.innerText = (profile && profile.height && weights.length === 0) ? "En attente de pesée" : "Profil incomplet";
        bmiAdvice.innerText = weights.length === 0 ? "Veuillez ajouter une pesée." : "Configurez vos constantes.";
        bmiBox.classList.add('bg-default');
        return;
    }

    const w = weights[weights.length-1].weight;
    const h = profile.height / 100;
    const bmi = parseFloat((w / (h*h)).toFixed(1));
    
    const bmiEl = document.getElementById('bmi-num');
    animateValue(bmiEl, parseFloat(bmiEl.dataset.val) || 0, bmi, 1000, true);
    bmiEl.dataset.val = bmi;
    
    if (bmi < 18.5) { bmiBox.classList.add('bmi-under'); bmiText.innerText = "Insuffisance pondérale"; bmiAdvice.innerText = "Surplus calorique recommandé."; } 
    else if (bmi < 25) { bmiBox.classList.add('bmi-normal'); bmiText.innerText = "Poids Normal (Idéal)"; bmiAdvice.innerText = "Excellent ! Maintenez cet équilibre."; } 
    else if (bmi < 30) { bmiBox.classList.add('bmi-over'); bmiText.innerText = "Léger Surpoids"; bmiAdvice.innerText = "Léger déficit calorique conseillé."; } 
    else { bmiBox.classList.add('bmi-obese'); bmiText.innerText = "Obésité"; bmiAdvice.innerText = "Visez un déficit maîtrisé."; }
    
    let bmr = profile.gender === "male" ? (10*w + 6.25*profile.height - 5*profile.age + 5) : (10*w + 6.25*profile.height - 5*profile.age - 161);
    const maint = bmr * profile.activityLevel;
    
    const calElts = [ {id:'cal-base', v:bmr}, {id:'cal-maintenance', v:maint}, {id:'cal-deficit', v:maint-500}, {id:'cal-surplus', v:maint+300} ];
    calElts.forEach(c => {
        const el = document.getElementById(c.id);
        animateValue(el, parseInt(el.dataset.val)||0, c.v, 1000);
        el.dataset.val = c.v;
    });

    if (mode === "auto") {
        document.getElementById('input-macro-prot').value = Math.round(w * 2);
        document.getElementById('input-macro-fat').value = Math.round(w * 1);
        document.getElementById('input-macro-carb').value = Math.max(0, Math.round((maint - (w*2*4 + w*1*9))/4));
    }
}

// === COURBE DE POIDS (CORRECTION LIAISON DE COURBE: PATH EXPLICITE) ===
function renderWeight() {
    const history = safeGetItem('weightHistory');
    const container = document.getElementById('weight-chart-container');
    if (!container) return;
    
    if (history.length === 0) {
        container.innerHTML = '<p class="bento-item-desc" style="text-align:center; padding: 2rem;">Aucune pesée enregistrée.</p>';
        return;
    }
    
    history.sort((a,b) => new Date(a.date) - new Date(b.date));
    
    const w = container.clientWidth || 800;
    const h = 250;
    const paddingX = 40;
    const paddingY = 20;
    
    const weights = history.map(x => x.weight);
    const minW = Math.min(...weights) - 2;
    const maxW = Math.max(...weights) + 2;
    const range = maxW - minW || 1;
    
    let svg = `<svg viewBox="0 0 ${w} ${h}" style="width:100%; height:100%; overflow:visible;">`;
    
    // Lignes de repère (Grille Y)
    for(let i=0; i<=4; i++) {
        let y = paddingY + (i * ((h - 2*paddingY)/4));
        let val = (maxW - (i * (range/4))).toFixed(1);
        svg += `<line x1="${paddingX}" y1="${y}" x2="${w}" y2="${y}" stroke="var(--border)" stroke-dasharray="4" stroke-width="1" />`;
        svg += `<text x="${paddingX - 10}" y="${y+4}" fill="var(--text-muted)" font-size="10" text-anchor="end">${val}</text>`;
    }
    
    // Calcul des coordonnées
    const points = history.map((entry, i) => {
        const stepX = (w - paddingX) / Math.max(1, history.length - 1);
        const x = paddingX + (i * stepX);
        const y = paddingY + (h - 2*paddingY) - ((entry.weight - minW) / range * (h - 2*paddingY));
        return { x, y, val: entry.weight, date: entry.date };
    });
    
    // TRACÉ CONTINU DE LA COURBE AVEC <path> (Commandes M et L)
    if (points.length > 1) {
        let pathD = `M ${points[0].x} ${points[0].y}`;
        for (let i = 1; i < points.length; i++) {
            pathD += ` L ${points[i].x} ${points[i].y}`;
        }
        svg += `<path d="${pathD}" fill="none" stroke="var(--gold)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />`;
    }
    
    // TRACÉ DES POINTS
    points.forEach(p => {
        svg += `<circle cx="${p.x}" cy="${p.y}" r="5" fill="var(--navy)" stroke="var(--gold)" stroke-width="2" />`;
    });
    
    svg += `</svg>`;
    container.innerHTML = svg;
}

// === CARDIO ===
document.getElementById('cardio-form').addEventListener('submit', (e) => {
    e.preventDefault(); triggerHaptic();
    let history = safeGetItem('cardioHistory');
    let editId = document.getElementById('c-edit-id').value;
    let obj = {
        id: editId === "-1" ? Date.now() : parseInt(editId),
        date: document.getElementById('c-date').value,
        dist: parseFloat(document.getElementById('c-dist').value),
        time: parseInt(document.getElementById('c-time').value),
        speed: parseFloat(document.getElementById('c-speed').value) || 0
    };
    
    if (editId === "-1") { history.push(obj); } 
    else {
        let index = history.findIndex(x => x.id === parseInt(editId));
        if (index !== -1) history[index] = obj;
        cancelCardioEdit();
    }
    
    history.sort((a,b) => new Date(b.date) - new Date(a.date));
    safeSetItem('cardioHistory', history);
    document.getElementById('cardio-form').reset();
    document.getElementById('c-date').valueAsDate = new Date();
    renderCardio();
});

window.cancelCardioEdit = function() {
    triggerHaptic();
    document.getElementById('cardio-form').reset();
    document.getElementById('c-date').valueAsDate = new Date();
    document.getElementById('c-edit-id').value = "-1";
    document.getElementById('cardio-submit-btn').innerText = "Ajouter";
    document.getElementById('cardio-cancel-btn').classList.add('hidden');
}

window.editCardio = function(id) {
    triggerHaptic();
    let history = safeGetItem('cardioHistory');
    let session = history.find(x => x.id === id);
    if(session) {
        document.getElementById('c-date').value = session.date;
        document.getElementById('c-dist').value = session.dist;
        document.getElementById('c-time').value = session.time;
        document.getElementById('c-speed').value = session.speed;
        document.getElementById('c-edit-id').value = session.id;
        document.getElementById('cardio-submit-btn').innerText = "Modifier";
        document.getElementById('cardio-cancel-btn').classList.remove('hidden');
    }
}

window.deleteCardio = function(id) {
    showConfirm("Supprimer cette session cardio ?", () => {
        safeSetItem('cardioHistory', safeGetItem('cardioHistory').filter(x => x.id !== id));
        renderCardio();
        updateGamification();
    });
}

function renderCardio() {
    const history = safeGetItem('cardioHistory');
    const list = document.getElementById('cardio-list');
    if (history.length === 0) { list.innerHTML = '<p class="bento-item-desc">Aucune session enregistrée.</p>'; return; }
    
    list.innerHTML = history.slice(0, 5).map(x => `
        <div class="cardio-item">
            <div class="cardio-item-info">
                <strong>${formatDate(x.date)}</strong>
                <span>${x.dist} km | ${x.time} min | ${x.speed > 0 ? x.speed + ' km/h' : '-'}</span>
            </div>
            <div>
                <button class="haptic-btn" style="background:none;border:none;color:var(--text-muted);cursor:pointer;" onclick="editCardio(${x.id})">${iconEdit}</button>
                <button class="haptic-btn" style="background:none;border:none;color:#ef4444;cursor:pointer;" onclick="deleteCardio(${x.id})">${iconTrash}</button>
            </div>
        </div>
    `).join('');
}

// === RECORDS ===
document.getElementById('record-form').addEventListener('submit', (e) => {
    e.preventDefault(); triggerHaptic();
    let r = safeGetItem('elitePersonalRecords');
    r.push({ 
        id: Date.now(), 
        date: document.getElementById('rec-date').value,
        name: document.getElementById('rec-name').value, 
        value: document.getElementById('rec-value').value 
    });
    safeSetItem('elitePersonalRecords', r);
    document.getElementById('record-form').reset();
    document.getElementById('rec-date').valueAsDate = new Date();
    renderRecords(); 
    updateGamification();
});

function renderRecords() {
    const records = safeGetItem('elitePersonalRecords');
    const container = document.getElementById('records-container');
    if (records.length === 0) { container.innerHTML = '<p class="bento-item-desc">Aucun record enregistré.</p>'; return; }
    
    container.innerHTML = records.map(x => `
        <div class="record-elite-card">
            <button class="delete-record-btn haptic-btn" onclick="deleteRecord(${x.id})" title="Supprimer">${iconTrash}</button>
            <div class="record-elite-title">${escapeHtml(x.name)}</div>
            <div class="record-elite-value">${escapeHtml(x.value)}</div>
            <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 6px;">${x.date ? formatDate(x.date) : ''}</div>
        </div>
    `).join('');
}

window.deleteRecord = function(id) {
    showConfirm("Voulez-vous supprimer ce record ?", () => {
        safeSetItem('elitePersonalRecords', safeGetItem('elitePersonalRecords').filter(x => x.id !== id));
        renderRecords(); updateGamification();
    });
}

// === CALENDRIER & OBJECTIF DYNAMIQUE ===
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

function renderCalendarInit() {
    renderCalendar(currentMonth, currentYear);
    calculateWeeklyGoal();
}

window.changeMonth = function(dir) {
    triggerHaptic();
    currentMonth += dir;
    if(currentMonth>11){currentMonth=0; currentYear++;}
    else if(currentMonth<0){currentMonth=11; currentYear--;}
    renderCalendar(currentMonth, currentYear);
}

function renderCalendar(month, year) {
    const grid = document.getElementById('calendar-grid');
    const monthYear = document.getElementById('month-year-display');
    const monthlyData = safeGetItem('calendarData', '{}');
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
    monthYear.innerText = `${monthNames[month]} ${year}`;
    
    let gridHTML = "";
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    
    for(let i = 0; i < startOffset; i++) { gridHTML += `<div class="cal-day empty"></div>`; }
    
    for(let i = 1; i <= daysInMonth; i++) {
        const dKey = `${year}-${String(month+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
        const sessions = monthlyData[dKey] || [];
        
        let dayThemeClass = "";
        if (sessions.length > 0) {
            let lastSess = sessions[sessions.length-1].name.toUpperCase();
            dayThemeClass = (lastSess.includes('CARDIO') || lastSess.includes('RUN')) ? "theme-glow-cardio" : "theme-glow-muscu";
        }
        
        let dHtml = `<div class="cal-day haptic-btn ${dayThemeClass}" onclick="openDayModal('${dKey}')"><span class="cal-day-num">${i}</span>`;
        sessions.forEach(s => {
            const nameUp = s.name.toUpperCase();
            let badgeC = (nameUp.includes('CARDIO') || nameUp.includes('RUN') || nameUp.includes('VELO')) ? 'badge-cardio' : 'badge-muscu';
            dHtml += `<div class="cal-day-content"><span class="cal-badge ${badgeC}">${escapeHtml(s.name)}</span> <input type="checkbox" ${s.validated?'checked':''} onclick="event.stopPropagation(); toggleSession('${dKey}',${s.id})"></div>`;
        });
        dHtml += `</div>`;
        gridHTML += dHtml;
    }
    grid.innerHTML = gridHTML;
    updateConsistencyStreak();
}

function calculateWeeklyGoal() {
    let monthlyData = safeGetItem('calendarData', '{}');
    const today = new Date();
    let dayOfWeek = today.getDay(); if (dayOfWeek === 0) dayOfWeek = 7;
    let weekStart = new Date(today); weekStart.setDate(today.getDate() - dayOfWeek + 1);
    
    let weeklyValidatedSessions = 0;
    let totalWeeklyTarget = 0;
    
    for(let i=0; i<7; i++) {
        let d = new Date(weekStart); d.setDate(weekStart.getDate() + i);
        let dKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        if(monthlyData[dKey]) {
            totalWeeklyTarget += monthlyData[dKey].length;
            weeklyValidatedSessions += monthlyData[dKey].filter(s => s.validated).length;
        }
    }
    
    let pct = totalWeeklyTarget === 0 ? 0 : (weeklyValidatedSessions / totalWeeklyTarget) * 100;
    document.getElementById('weekly-goal-text').innerText = `${weeklyValidatedSessions}/${totalWeeklyTarget} cette semaine`;
    document.getElementById('weekly-goal-fill').style.width = `${pct}%`;
}

function updateConsistencyStreak() {
    let data = safeGetItem('calendarData', '{}');
    let muscu = 0; let cardio = 0;
    Object.values(data).forEach(dayArr => {
        dayArr.forEach(s => {
            if(s.validated) {
                const n = s.name.toUpperCase();
                if(n.includes('CARDIO') || n.includes('RUN') || n.includes('VELO')) cardio++;
                else muscu++;
            }
        });
    });
    document.getElementById('streak-muscu-count').innerText = muscu;
    document.getElementById('streak-cardio-count').innerText = cardio;
}

// === GESTION MODAL CALENDRIER ===
let currentOpenedDayKey = null;

window.openDayModal = function(dKey) {
    triggerHaptic();
    currentOpenedDayKey = dKey;
    document.getElementById('modal-day-title').innerText = formatDate(dKey);
    document.getElementById('day-modal').classList.remove('hidden');
    renderDaySessions(dKey);
}

window.closeDayModal = function() {
    triggerHaptic();
    document.getElementById('day-modal').classList.add('hidden');
    document.getElementById('day-session-form').reset();
    document.getElementById('session-edit-id').value = "-1";
}

document.getElementById('day-session-form').addEventListener('submit', (e) => {
    e.preventDefault(); triggerHaptic();
    if (!currentOpenedDayKey) return;
    
    let data = safeGetItem('calendarData', '{}');
    let sName = document.getElementById('session-name').value;
    let editId = document.getElementById('session-edit-id').value;
    
    if (!data[currentOpenedDayKey]) data[currentOpenedDayKey] = [];
    
    if (editId === "-1") {
        data[currentOpenedDayKey].push({ id: Date.now(), name: sName, validated: false });
    } else {
        let session = data[currentOpenedDayKey].find(x => x.id === parseInt(editId));
        if (session) session.name = sName;
    }
    
    safeSetItem('calendarData', data);
    document.getElementById('session-name').value = "";
    document.getElementById('session-edit-id').value = "-1";
    document.getElementById('modal-session-btn').innerText = "Ajouter";
    
    renderDaySessions(currentOpenedDayKey);
    renderCalendarInit();
});

window.prepareEditSession = function(dKey, id) {
    triggerHaptic();
    let data = safeGetItem('calendarData', '{}');
    let session = data[dKey].find(x => x.id === id);
    if(session) {
        document.getElementById('session-name').value = session.name;
        document.getElementById('session-edit-id').value = session.id;
        document.getElementById('modal-session-btn').innerText = "Modifier";
    }
}

window.deleteSession = function(dKey, id) {
    showConfirm("Voulez-vous supprimer définitivement cette séance ?", () => {
        let data = safeGetItem('calendarData', '{}');
        data[dKey] = data[dKey].filter(x => x.id !== id);
        if(data[dKey].length === 0) delete data[dKey];
        safeSetItem('calendarData', data);
        renderDaySessions(dKey);
        renderCalendarInit();
    });
}

window.toggleSession = function(dKey, id) {
    triggerHaptic();
    let data = safeGetItem('calendarData', '{}');
    let session = data[dKey].find(x => x.id === id);
    if (session) session.validated = !session.validated;
    safeSetItem('calendarData', data);
    
    if(currentOpenedDayKey === dKey && !document.getElementById('day-modal').classList.contains('hidden')){
        renderDaySessions(dKey);
    }
    renderCalendarInit();
    updateSmartCoach();
}

function renderDaySessions(dKey) {
    let data = safeGetItem('calendarData', '{}');
    let sessions = data[dKey] || [];
    let list = document.getElementById('day-sessions-list');
    
    if(sessions.length === 0) { list.innerHTML = "<p class='bento-item-desc'>Aucune séance prévue ce jour.</p>"; return; }
    
    list.innerHTML = sessions.map(s => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; background:#f8fafc; border:1px solid var(--border); border-radius:6px; margin-bottom:8px;">
            <div style="display:flex; align-items:center; gap:10px;">
                <input type="checkbox" ${s.validated?'checked':''} onclick="toggleSession('${dKey}',${s.id})">
                <span style="font-weight:600; font-size:0.9rem; color:var(--navy); text-decoration:${s.validated?'line-through':'none'}">${escapeHtml(s.name)}</span>
            </div>
            <div>
                <button class="haptic-btn" style="background:none;border:none;color:var(--text-muted);cursor:pointer;" onclick="prepareEditSession('${dKey}',${s.id})">${iconEdit}</button>
                <button class="haptic-btn" style="background:none;border:none;color:#ef4444;cursor:pointer;" onclick="deleteSession('${dKey}',${s.id})">${iconTrash}</button>
            </div>
        </div>
    `).join('');
}

// === QUICK ADD (FAB) ===
const fabMain = document.getElementById('fab-main-btn');
const fabMenu = document.getElementById('fab-menu');

fabMain.addEventListener('click', () => {
    triggerHaptic();
    fabMain.classList.toggle('active');
    fabMenu.classList.toggle('hidden');
});

function closeFabMenu() {
    fabMain.classList.remove('active');
    fabMenu.classList.add('hidden');
}

// 1. Quick Add : Poids
window.quickAddWeight = function() {
    triggerHaptic();
    document.getElementById('quick-weight-modal').classList.remove('hidden');
    document.getElementById('quick-w-date').valueAsDate = new Date();
    setTimeout(() => document.getElementById('quick-w-weight').focus(), 100);
    closeFabMenu();
}
window.closeQuickWeight = function() {
    triggerHaptic();
    document.getElementById('quick-weight-modal').classList.add('hidden');
    document.getElementById('quick-weight-form').reset();
}
document.getElementById('quick-weight-form').addEventListener('submit', (e) => {
    e.preventDefault(); triggerHaptic();
    let history = safeGetItem('weightHistory');
    const dKey = document.getElementById('quick-w-date').value;
    
    history.push({ id: Date.now(), date: dKey, weight: parseFloat(document.getElementById('quick-w-weight').value) });
    history.sort((a,b) => new Date(a.date) - new Date(b.date));
    safeSetItem('weightHistory', history); 
    renderWeight(); recalculatePhysiqueAndCalories(); updateSmartCoach();
    closeQuickWeight();
});

// 2. Quick Add : Record
window.quickAddRecord = function() {
    triggerHaptic();
    document.getElementById('quick-record-modal').classList.remove('hidden');
    document.getElementById('quick-rec-date').valueAsDate = new Date();
    setTimeout(() => document.getElementById('quick-rec-name').focus(), 100);
    closeFabMenu();
}
window.closeQuickRecord = function() {
    triggerHaptic();
    document.getElementById('quick-record-modal').classList.add('hidden');
    document.getElementById('quick-record-form').reset();
}
document.getElementById('quick-record-form').addEventListener('submit', (e) => {
    e.preventDefault(); triggerHaptic();
    let r = safeGetItem('elitePersonalRecords');
    r.push({ 
        id: Date.now(), 
        date: document.getElementById('quick-rec-date').value,
        name: document.getElementById('quick-rec-name').value, 
        value: document.getElementById('quick-rec-value').value 
    });
    safeSetItem('elitePersonalRecords', r);
    renderRecords(); updateGamification();
    closeQuickRecord();
});

// 3. Quick Add : Séance
window.quickAddSession = function() {
    triggerHaptic();
    document.getElementById('quick-session-modal').classList.remove('hidden');
    document.getElementById('quick-s-date').valueAsDate = new Date();
    setTimeout(() => document.getElementById('quick-s-name').focus(), 100);
    closeFabMenu();
}
window.closeQuickSession = function() {
    triggerHaptic();
    document.getElementById('quick-session-modal').classList.add('hidden');
    document.getElementById('quick-session-form').reset();
}
document.getElementById('quick-session-form').addEventListener('submit', (e) => {
    e.preventDefault(); triggerHaptic();
    let data = safeGetItem('calendarData', '{}');
    const dKey = document.getElementById('quick-s-date').value;
    
    if (!data[dKey]) data[dKey] = [];
    data[dKey].push({ id: Date.now(), name: document.getElementById('quick-s-name').value, validated: false });
    
    safeSetItem('calendarData', data);
    renderCalendarInit();
    closeQuickSession();
});

// === COACH ET GAMIFICATION ===
function updateSmartCoach() {
    const weights = safeGetItem('weightHistory');
    const box = document.getElementById('smart-coach-text');
    if(weights.length < 2) { box.innerText = "Analysez votre dynamique en ajoutant plus de pesées et d'entraînements."; return; }
    
    const diff = weights[weights.length-1].weight - weights[0].weight;
    if(diff > 0) box.innerText = `Prise de masse observée (+${diff.toFixed(1)} kg depuis le début). Vos apports caloriques actuels soutiennent cet effort. Maintenez la surcharge progressive.`;
    else if(diff < 0) box.innerText = `Perte de poids confirmée (${diff.toFixed(1)} kg). Continuez à valider vos sessions cardio et surveillez vos macros pour éviter la perte musculaire.`;
    else box.innerText = "Stagnation pondérale. Envisagez de recalculer vos macronutriments (mode auto) si votre objectif était une recomposition corporelle.";
}

function updateGamification() {
    const weights = safeGetItem('weightHistory');
    const records = safeGetItem('elitePersonalRecords');
    const cardio = safeGetItem('cardioHistory');
    
    let badges = [];
    if (weights.length > 0) badges.push({ icon: '⚖️', name: 'Premier Pas', desc: 'Première pesée validée.' });
    if (records.length >= 1) badges.push({ icon: '🔥', name: 'Défi Accepté', desc: 'Premier record établi.' });
    if (records.length >= 5) badges.push({ icon: '🏆', name: 'Élite', desc: '5 records inscrits.' });
    if (cardio.length >= 10) badges.push({ icon: '🏃', name: 'Marathonien', desc: '10 sessions cardio.' });
    
    const container = document.getElementById('gamification-container');
    if (badges.length === 0) {
        container.innerHTML = '<p class="bento-item-desc">Commencez à enregistrer vos données pour débloquer des succès.</p>';
        return;
    }
    
    container.innerHTML = badges.map(b => `
        <div style="display:flex; align-items:center; gap:12px; background:#f8fafc; padding:10px 15px; border-radius:8px; border:1px solid var(--border); width: 100%;">
            <span style="font-size:1.6rem;">${b.icon}</span>
            <div>
                <div style="font-weight:700; font-size:0.9rem; color:var(--navy);">${b.name}</div>
                <div style="font-size:0.75rem; color:var(--text-muted);">${b.desc}</div>
            </div>
        </div>
    `).join('');
}

// === GENERATION PDF ===
window.generatePDFReport = function() {
    triggerHaptic();
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.setFontSize(22);
        doc.text("WALLY SPORT ELITE - BILAN", 20, 20);
        doc.setFontSize(12);
        doc.text(`Généré le : ${new Date().toLocaleDateString('fr-FR')}`, 20, 30);
        
        const wHistory = safeGetItem('weightHistory');
        if (wHistory.length > 0) {
            doc.text(`Dernier poids enregistré : ${wHistory[wHistory.length-1].weight} kg`, 20, 45);
        }
        
        doc.text("Retrouvez tous vos records et analyses en ligne sur votre tableau de bord interactif.", 20, 60);
        
        doc.save(`Wally_Sport_Elite_Bilan_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
        alert("La génération PDF a échoué. Assurez-vous d'être connecté à internet pour charger la librairie.");
    }
}
