// === STOCKAGE ROBUSTE ===
function safeGetItem(key, defaultValue = '[]') {
    try { const item = localStorage.getItem(key); return item ? JSON.parse(item) : JSON.parse(defaultValue); } catch (e) { return JSON.parse(defaultValue); }
}
function safeSetItem(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) {}
}
function escapeHtml(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function formatDate(dateString) {
    const d = new Date(dateString); return isNaN(d) ? '' : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

// === HAPTIC FEEDBACK (Vibrations Mobile) ===
function triggerHaptic() {
    if (navigator.vibrate) { navigator.vibrate(40); }
}

// === ICONES SVG POUR JS ===
const iconTrash = `<svg class="icon-sm" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;

// === VARIABLES ET ETATS GLOBAUX ===
let activeConfirmCallback = null;
let currentSelectedDayKey = null;

// === INITIALISATION SUR CHARGEMENT ===
document.addEventListener('DOMContentLoaded', () => {
    initDateDisplay();
    initFabMenu();
    initProfileModal();
    initFormsSubmissions();
    
    // Premier Rendu Complet
    renderWeight();
    recalculatePhysiqueAndCalories();
    renderCalendar();
    renderRecords();
    updateSmartCoach();
});

// === COCHAGE DATE DU JOUR ===
function initDateDisplay() {
    const d = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('current-date-display').innerText = d.toLocaleDateString('fr-FR', options);
}

// === MENU FLOTTANT ACTIONS (FAB) ===
function initFabMenu() {
    const mainBtn = document.getElementById('fab-main-btn');
    const menu = document.getElementById('fab-menu');
    mainBtn.addEventListener('click', () => {
        triggerHaptic();
        mainBtn.classList.toggle('active');
        menu.classList.toggle('hidden');
    });
}
window.closeFabMenu = function() {
    document.getElementById('fab-main-btn').classList.remove('active');
    document.getElementById('fab-menu').classList.add('hidden');
}

// === CONFIRMATION MODAL UTILITY ===
window.askConfirmation = function(message, callback) {
    document.getElementById('confirm-message').innerText = message;
    document.getElementById('confirm-modal').classList.remove('hidden');
    activeConfirmCallback = callback;
}
document.getElementById('confirm-yes-btn').addEventListener('click', () => {
    triggerHaptic();
    document.getElementById('confirm-modal').classList.add('hidden');
    if(activeConfirmCallback) activeConfirmCallback();
    activeConfirmCallback = null;
});
document.getElementById('confirm-no-btn').addEventListener('click', () => {
    triggerHaptic();
    document.getElementById('confirm-modal').classList.add('hidden');
    activeConfirmCallback = null;
});

// === CONFIGURATION PROFILE & MACROS ===
function initProfileModal() {
    const openBtn = document.getElementById('open-profile-btn');
    const closeBtn = document.getElementById('close-profile-modal');
    const cancelBtn = document.getElementById('cancel-profile-btn');
    const modal = document.getElementById('profile-modal');
    const modeSelect = document.getElementById('prof-macro-mode');
    const manualFields = document.getElementById('manual-macros-inputs');

    openBtn.addEventListener('click', () => {
        triggerHaptic();
        // Load Profile Data
        const profile = safeGetItem('userProfileBaseV2', '{"name":"Athlète Elite","goalWeight":80}');
        document.getElementById('prof-name').value = profile.name || '';
        document.getElementById('prof-goal-weight').value = profile.goalWeight || '';
        
        const mode = localStorage.getItem('macroConfigMode') || 'auto';
        modeSelect.value = mode;
        if(mode === 'manual') {
            manualFields.classList.remove('hidden');
            const mv = safeGetItem('manualMacrosValues', '{"kcal":2500,"p":160,"g":250,"l":70}');
            document.getElementById('mac-kcal').value = mv.kcal;
            document.getElementById('mac-p').value = mv.p;
            document.getElementById('mac-g').value = mv.g;
            document.getElementById('mac-l').value = mv.l;
        } else {
            manualFields.classList.add('hidden');
        }
        modal.classList.remove('hidden');
    });

    const closeModalFunc = () => { triggerHaptic(); modal.classList.add('hidden'); };
    closeBtn.addEventListener('click', closeModalFunc);
    cancelBtn.addEventListener('click', closeModalFunc);

    modeSelect.addEventListener('change', () => {
        if(modeSelect.value === 'manual') {
            manualFields.classList.remove('hidden');
        } else {
            manualFields.classList.add('hidden');
        }
    });
}

// === FORMULAIRES SOUMISSIONS & SAUVEGARDES ===
function initFormsSubmissions() {
    // 1. Profil Sauvegarde
    document.getElementById('profile-config-form').addEventListener('submit', (e) => {
        e.preventDefault(); triggerHaptic();
        const profile = {
            name: document.getElementById('prof-name').value,
            goalWeight: parseFloat(document.getElementById('prof-goal-weight').value)
        };
        safeSetItem('userProfileBaseV2', profile);
        
        const mode = document.getElementById('prof-macro-mode').value;
        localStorage.setItem('macroConfigMode', mode);
        
        if(mode === 'manual') {
            const mv = {
                kcal: parseInt(document.getElementById('mac-kcal').value) || 2000,
                p: parseInt(document.getElementById('prof-name').value) || 150,
                g: parseInt(document.getElementById('mac-g').value) || 200,
                l: parseInt(document.getElementById('mac-l').value) || 60
            };
            safeSetItem('manualMacrosValues', mv);
        }
        
        document.getElementById('profile-modal').classList.add('hidden');
        recalculatePhysiqueAndCalories();
        updateSmartCoach();
    });

    // 2. Saisie Pesée Rapide
    document.getElementById('quick-weight-form').addEventListener('submit', (e) => {
        e.preventDefault(); triggerHaptic();
        let history = safeGetItem('weightHistory');
        const chosenDate = document.getElementById('quick-w-date').value;
        
        history.push({ id: Date.now(), date: chosenDate, weight: parseFloat(document.getElementById('quick-w-weight').value) });
        history.sort((a,b) => new Date(a.date) - new Date(b.date));
        safeSetItem('weightHistory', history); 
        renderWeight(); recalculatePhysiqueAndCalories(); updateSmartCoach();
        closeQuickWeight();
    });

    // 3. Record Rapide
    document.getElementById('quick-record-form').addEventListener('submit', (e) => {
        e.preventDefault(); triggerHaptic();
        let r = safeGetItem('elitePersonalRecords');
        r.push({ 
            id: Date.now(), 
            name: document.getElementById('quick-rec-name').value, 
            value: document.getElementById('quick-rec-value').value 
        });
        safeSetItem('elitePersonalRecords', r);
        renderRecords(); updateSmartCoach();
        closeQuickRecord();
    });

    // 4. Séance Rapide / Planification
    document.getElementById('quick-session-form').addEventListener('submit', (e) => {
        e.preventDefault(); triggerHaptic();
        let cal = safeGetItem('calendarData', '{}');
        const dKey = document.getElementById('quick-sess-date').value;
        if(!cal[dKey]) cal[dKey] = [];
        
        cal[dKey].push({
            id: Date.now(),
            title: document.getElementById('quick-sess-title').value,
            type: document.getElementById('quick-sess-type').value
        });
        
        safeSetItem('calendarData', cal);
        renderCalendar(); updateSmartCoach();
        closeQuickSession();
    });
}

// === ACTIONS D'OUVERTURE MODALS SANS FOCUS INDUIT ===
window.quickAddWeight = function() {
    triggerHaptic();
    document.getElementById('quick-weight-modal').classList.remove('hidden');
    const today = new Date();
    document.getElementById('quick-w-date').value = today.toISOString().split('T')[0];
    closeFabMenu();
}
window.closeQuickWeight = function() {
    triggerHaptic();
    document.getElementById('quick-weight-modal').classList.add('hidden');
    document.getElementById('quick-weight-form').reset();
}

window.quickAddRecord = function() {
    triggerHaptic();
    document.getElementById('quick-record-modal').classList.remove('hidden');
    closeFabMenu();
}
window.closeQuickRecord = function() {
    triggerHaptic();
    document.getElementById('quick-record-modal').classList.add('hidden');
    document.getElementById('quick-record-form').reset();
}

window.quickAddSession = function() {
    triggerHaptic();
    document.getElementById('quick-session-modal').classList.remove('hidden');
    const today = new Date();
    document.getElementById('quick-sess-date').value = today.toISOString().split('T')[0];
    closeFabMenu();
}
window.closeQuickSession = function() {
    triggerHaptic();
    document.getElementById('quick-session-modal').classList.add('hidden');
    document.getElementById('quick-session-form').reset();
}

// === NUTRITION ET CALCULS MACROS ===
function recalculatePhysiqueAndCalories() {
    const history = safeGetItem('weightHistory');
    const profile = safeGetItem('userProfileBaseV2', '{"name":"Athlète Elite","goalWeight":80}');
    const mode = localStorage.getItem('macroConfigMode') || 'auto';
    
    let currentWeight = profile.goalWeight;
    if(history.length > 0) currentWeight = history[history.length - 1].weight;
    
    let kcal, p, g, l;
    if(mode === 'manual') {
        const mv = safeGetItem('manualMacrosValues', '{"kcal":2500,"p":160,"g":250,"l":70}');
        kcal = mv.kcal; p = mv.p; g = mv.g; l = mv.l;
    } else {
        // Formule Auto simplifiée basée sur le poids actuel
        kcal = Math.round(currentWeight * 33);
        p = Math.round(currentWeight * 2);
        g = Math.round(currentWeight * 3.5);
        l = Math.round(currentWeight * 0.9);
    }
    
    document.getElementById('macro-kcal-val').innerText = kcal;
    
    const target = document.getElementById('macro-bars-target');
    target.innerHTML = `
        ${renderMacroRow('Protéines', p, 'g', '#93c5fd', 100)}
        ${renderMacroRow('Glucides', g, 'g', '#fde047', 100)}
        ${renderMacroRow('Lipides', l, 'g', '#fca5a5', 100)}
    `;
}
function renderMacroRow(name, val, unit, color, pct) {
    return `
        <div class="macro-bar-row">
            <div class="macro-label-wrap">
                <span class="m-name">${escapeHtml(name)}</span>
                <span class="m-val">${val} ${unit}</span>
            </div>
            <div class="macro-bar-bg">
                <div class="macro-bar-fill" style="width: ${pct}%; background-color: ${color};"></div>
            </div>
        </div>
    `;
}

// === RENDU DU COMPOSANT POIDS ===
function renderWeight() {
    const history = safeGetItem('weightHistory');
    const currentVal = document.getElementById('current-weight-val');
    const diffVal = document.getElementById('weight-diff-val');
    const list = document.getElementById('weight-history-list');
    
    if(history.length === 0) {
        currentVal.innerText = '--';
        diffVal.className = 'weight-diff hidden';
        list.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:0.85rem;">Aucun poids enregistré</div>`;
        return;
    }
    
    const latest = history[history.length - 1].weight;
    currentVal.innerText = latest.toFixed(1);
    
    if(history.length > 1) {
        const diff = latest - history[history.length - 2].weight;
        diffVal.className = 'weight-diff ' + (diff >= 0 ? 'plus' : 'minus');
        diffVal.innerText = (diff >= 0 ? '+' : '') + diff.toFixed(1) + ' kg';
    } else {
        diffVal.className = 'weight-diff hidden';
    }
    
    let html = '';
    // Affichage des 4 derniers enregistrements
    for(let i = history.length - 1; i >= 0; i--) {
        html += `
            <div class="history-item">
                <div class="history-item-left">
                    <span class="history-title">${history[i].weight.toFixed(1)} kg</span>
                    <span class="history-date">${formatDate(history[i].date)}</span>
                </div>
                <button class="delete-btn" onclick="deleteWeightItem(${history[i].id})">${iconTrash}</button>
            </div>
        `;
    }
    list.innerHTML = html;
}

window.deleteWeightItem = function(id) {
    askConfirmation("Supprimer cette pesée ?", () => {
        let history = safeGetItem('weightHistory');
        history = history.filter(x => x.id !== id);
        safeSetItem('weightHistory', history);
        renderWeight(); recalculatePhysiqueAndCalories(); updateSmartCoach();
    });
}

// === RENDU DU COMPOSANT CALENDRIER ===
function renderCalendar() {
    const target = document.getElementById('calendar-grid-target');
    const calData = safeGetItem('calendarData', '{}');
    
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // Mois en cours
    
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    target.innerHTML = '';
    
    // Cellules vides initiales
    for (let i = 0; i < firstDayIndex; i++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-day empty';
        target.appendChild(cell);
    }
    
    // Génération des jours du mois courant
    for (let day = 1; day <= totalDays; day++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-day';
        
        const mKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        if (day === today.getDate()) {
            cell.classList.add('today');
        }
        
        let innerHtml = `<div class="calendar-day-num">${day}</div>`;
        
        // Intégration horizontale des séances
        if (calData[mKey] && calData[mKey].length > 0) {
            innerHtml += `<div class="calendar-day-sessions">`;
            calData[mKey].forEach(s => {
                let typeClass = '';
                if(s.type === 'Cardio') typeClass = 'cardio';
                if(s.type === 'Récupération') typeClass = 'recovery';
                innerHtml += `<span class="calendar-session-dot ${typeClass}">${escapeHtml(s.title)}</span>`;
            });
            innerHtml += `</div>`;
        }
        
        cell.innerHTML = innerHtml;
        cell.addEventListener('click', () => openDaySessionsModal(mKey));
        target.appendChild(cell);
    }
}

// === GESTIONNAIRE DES SEANCES PAR JOURS ===
window.openDaySessionsModal = function(dayKey) {
    triggerHaptic();
    currentSelectedDayKey = dayKey;
    const d = new Date(dayKey);
    document.getElementById('modal-day-title').innerText = d.toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' });
    renderDaySessionsList();
    document.getElementById('day-sessions-modal').classList.remove('hidden');
}
window.closeDaySessionsModal = function() {
    triggerHaptic();
    document.getElementById('day-sessions-modal').classList.add('hidden');
}

function renderDaySessionsList() {
    const list = document.getElementById('modal-day-sessions');
    const calData = safeGetItem('calendarData', '{}');
    const sessions = calData[currentSelectedDayKey] || [];
    
    if(sessions.length === 0) {
        list.innerHTML = `<div style="text-align:center; padding:15px; color:var(--text-muted); font-size:0.85rem;">Aucune séance planifiée pour cette date</div>`;
        return;
    }
    
    let html = '';
    sessions.forEach((s, idx) => {
        html += `
            <div class="modal-session-item">
                <div>
                    <strong style="color:var(--navy); font-size:0.9rem;">${escapeHtml(s.title)}</strong>
                    <div style="font-size:0.75rem; color:var(--text-muted);">${escapeHtml(s.type)}</div>
                </div>
                <button class="delete-btn" onclick="deleteSessionItem(${s.id})">${iconTrash}</button>
            </div>
        `;
    });
    list.innerHTML = html;
}

window.deleteSessionItem = function(id) {
    askConfirmation("Supprimer cette séance du planning ?", () => {
        let cal = safeGetItem('calendarData', '{}');
        if(cal[currentSelectedDayKey]) {
            cal[currentSelectedDayKey] = cal[currentSelectedDayKey].filter(x => x.id !== id);
            safeSetItem('calendarData', cal);
            renderDaySessionsList();
            renderCalendar();
            updateSmartCoach();
        }
    });
}

// === RENDU DU COMPOSANT RECORDS ===
function renderRecords() {
    const r = safeGetItem('elitePersonalRecords');
    const list = document.getElementById('records-history-list');
    
    if(r.length === 0) {
        list.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:0.85rem;">Aucun record enregistré</div>`;
        return;
    }
    
    let html = '';
    for(let i = r.length - 1; i >= 0; i--) {
        html += `
            <div class="history-item">
                <div class="history-item-left">
                    <span class="history-title">${escapeHtml(r[i].name)}</span>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <span class="history-value">${escapeHtml(r[i].value)}</span>
                    <button class="delete-btn" onclick="deleteRecordItem(${r[i].id})">${iconTrash}</button>
                </div>
            </div>
        `;
    }
    list.innerHTML = html;
}

window.deleteRecordItem = function(id) {
    askConfirmation("Supprimer ce record personnel ?", () => {
        let r = safeGetItem('elitePersonalRecords');
        r = r.filter(x => x.id !== id);
        safeSetItem('elitePersonalRecords', r);
        renderRecords(); updateSmartCoach();
    });
}

// === SMART COACH LOGIC ===
function updateSmartCoach() {
    const txt = document.getElementById('coach-insights-text');
    const history = safeGetItem('weightHistory');
    const cal = safeGetItem('calendarData', '{}');
    
    let sessCount = 0;
    Object.keys(cal).forEach(k => { sessCount += cal[k].length; });
    
    if(history.length === 0 && sessCount === 0) {
        txt.innerText = "Bienvenue dans l'univers Elite. Renseignez votre première pesée et planifiez vos entraînements pour recevoir l'analyse Smart Coach.";
        return;
    }
    
    if(history.length > 1) {
        const latest = history[history.length - 1].weight;
        const prev = history[history.length - 2].weight;
        if(latest < prev) {
            txt.innerText = "Évolution positive. Votre tendance de poids baisse, restez rigoureux sur l'apport en protéines pour conserver votre masse musculaire.";
            return;
        }
    }
    txt.innerText = "Régularité optimale constatée sur le calendrier. Continuez à cibler vos charges d'entraînement progressives.";
}

// === ACCÈS ET RECONSTITUTION DES DONNÉES DE CONFIGURATION ===
window.triggerImportField = function() { document.getElementById('import-file-field').click(); }
window.exportDataData = function() {
    triggerHaptic();
    const obj = {
        userProfileBaseV2: localStorage.getItem('userProfileBaseV2'),
        weightHistory: localStorage.getItem('weightHistory'),
        calendarData: localStorage.getItem('calendarData'),
        elitePersonalRecords: localStorage.getItem('elitePersonalRecords'),
        macroConfigMode: localStorage.getItem('macroConfigMode'),
        manualMacrosValues: localStorage.getItem('manualMacrosValues')
    };
    const a = document.createElement('a');
    a.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(obj));
    a.download = `wallysport_bento_backup.json`;
    document.body.appendChild(a); a.click(); a.remove();
}
window.importDataData = function(e) {
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
        try {
            const json = JSON.parse(ev.target.result);
            ['userProfileBaseV2','weightHistory','calendarData','elitePersonalRecords','macroConfigMode','manualMacrosValues'].forEach(k => {
                if(json[k]) localStorage.setItem(k, json[k]);
            });
            alert("Restauration Bento achevée avec succès."); window.location.reload();
        } catch (err) { alert("Format de fichier invalide."); }
    };
    reader.readAsText(file);
}

// === PDF GENERATOR ===
window.generatePDFReport = function() {
    triggerHaptic();
    try {
        const { jsPDF } = window.jspdf; const doc = new jsPDF();
        doc.setFontSize(22); doc.text("WALLY SPORT ELITE - BILAN DE PERFORMANCE", 20, 20);
        doc.setFontSize(10); doc.text(`Édité le : ${new Date().toLocaleDateString('fr-FR')}`, 20, 28);
        doc.text("Ce document contient la synthèse complète de vos données de performance stockées localement.", 20, 34);
        doc.save('WallySport_Elite_Report.pdf');
    } catch(err) { alert("Erreur lors de la génération du PDF."); }
}
