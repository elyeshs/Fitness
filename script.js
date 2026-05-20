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

// === ICONES SVG POUR JS ===
const iconTrash = `<svg class="icon-sm" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
const iconTrophy = `<svg class="icon-sm" viewBox="0 0 24 24"><path d="M8 21h8M12 17v4M7 4h10M5 4h14v4a7 7 0 0 1-14 0V4z"></path></svg>`;

// === POP-UP DE CONFIRMATION ===
function showConfirm(message, callback) {
    const modal = document.getElementById('confirm-modal');
    document.getElementById('confirm-message').innerText = message;
    modal.classList.remove('hidden');

    const okBtn = document.getElementById('confirm-ok-btn');
    const cancelBtn = document.getElementById('confirm-cancel-btn');

    const newOkBtn = okBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOkBtn, okBtn);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    newOkBtn.addEventListener('click', () => { modal.classList.add('hidden'); callback(); });
    newCancelBtn.addEventListener('click', () => { modal.classList.add('hidden'); });
}

// === MOTEUR D'ANIMATION INCREMENTALE ===
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

// === INITIALISATION ===
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('current-date-display').innerText = new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    // Initialisation des dates sur aujourd'hui par défaut pour la rapidité
    document.getElementById('c-date').valueAsDate = new Date();
    document.getElementById('w-date').valueAsDate = new Date();
    document.getElementById('rec-date').valueAsDate = new Date();

    loadProfileData();
    initMacroControls();
    renderWeight();
    renderRecords();
    renderCardio();
    updateSmartCoach();
    updateGamification();
});

// === MENU FLOTTANT D'ACTION (FAB) ===
document.getElementById('fab-main-btn').addEventListener('click', function() {
    this.classList.toggle('active');
    document.getElementById('fab-menu').classList.toggle('open');
});

// Logique pour scroller rapidement et focus
function openFabAction(action) {
    // Ferme le menu flottant
    document.getElementById('fab-main-btn').classList.remove('active');
    document.getElementById('fab-menu').classList.remove('open');
    
    let targetSectionId, inputToFocusId;
    
    if(action === 'weight') {
        targetSectionId = 'section-weight';
        inputToFocusId = 'w-val';
    } else if(action === 'session') {
        targetSectionId = 'section-cardio';
        inputToFocusId = 'c-dist'; 
    } else if(action === 'record') {
        targetSectionId = 'section-records';
        inputToFocusId = 'rec-name';
    }

    if(targetSectionId) {
        document.getElementById(targetSectionId).scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
            document.getElementById(inputToFocusId).focus();
            // Highlight rapide pour guider l'oeil
            document.getElementById(targetSectionId).style.transition = 'box-shadow 0.3s';
            document.getElementById(targetSectionId).style.boxShadow = '0 0 0 2px var(--gold)';
            setTimeout(() => document.getElementById(targetSectionId).style.boxShadow = 'var(--bento-shadow)', 1000);
        }, 500);
    }
}

// === MODALS & PROFIL ===
const profileModal = document.getElementById('profile-modal');
document.getElementById('open-profile-btn').addEventListener('click', () => profileModal.classList.remove('hidden'));
document.getElementById('close-profile-btn').addEventListener('click', () => profileModal.classList.add('hidden'));
document.getElementById('cancel-profile-btn').addEventListener('click', () => profileModal.classList.add('hidden'));

document.getElementById('profile-form').addEventListener('submit', (e) => {
    e.preventDefault();
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
function handleMacroMode(mode) { safeSetItem('macroConfigMode', mode); if(mode==="auto"){ setMacroInputsDisabled(true); recalculatePhysiqueAndCalories(); } else { setMacroInputsDisabled(false); saveManualMacros(); } }
function saveManualMacros() { safeSetItem('manualMacrosValues', { prot: parseInt(document.getElementById('input-macro-prot').value)||0, fat: parseInt(document.getElementById('input-macro-fat').value)||0, carb: parseInt(document.getElementById('input-macro-carb').value)||0 }); }

// === IMC INTELLIGENT ET MACROS ===
function recalculatePhysiqueAndCalories() {
    const profile = safeGetItem('userProfileBaseV2', 'null');
    const weights = safeGetItem('weightHistory', '[]');
    const mode = safeGetItem('macroConfigMode', '"auto"');
    
    if (weights.length >= 2) {
        const diff = (weights[weights.length-1].weight - weights[weights.length-2].weight).toFixed(1);
        document.getElementById('weight-delta-display').innerText = diff > 0 ? `+${diff} kg` : `${diff} kg`;
    }

    const bmiBox = document.getElementById('bmi-color-box');
    const bmiText = document.getElementById('bmi-text');
    const bmiAdvice = document.getElementById('bmi-advice');
    
    bmiBox.className = 'bmi-value';

    if (!profile || !profile.height || weights.length === 0) {
        bmiText.innerText = "Profil incomplet";
        bmiBox.classList.add('bg-default');
        return;
    }

    const w = weights[weights.length-1].weight;
    const h = profile.height / 100;
    const bmi = parseFloat((w / (h*h)).toFixed(1));
    
    const bmiEl = document.getElementById('bmi-num');
    animateValue(bmiEl, parseFloat(bmiEl.dataset.val) || 0, bmi, 1000, true);
    bmiEl.dataset.val = bmi;
    
    if (bmi < 18.5) { bmiBox.classList.add('bmi-under'); bmiText.innerText = "Insuffisance pondérale"; }
    else if (bmi < 25) { bmiBox.classList.add('bmi-normal'); bmiText.innerText = "Poids Normal"; }
    else if (bmi < 30) { bmiBox.classList.add('bmi-over'); bmiText.innerText = "Léger Surpoids"; }
    else { bmiBox.classList.add('bmi-obese'); bmiText.innerText = "Obésité"; }
    
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
        document.getElementById('input-macro-carb').value = Math.round(Math.max(0, (maint - (w*2*4 + w*1*9))/4));
    }
}

// === GESTION POIDS ===
document.getElementById('weight-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const d = document.getElementById('w-date').value;
    const v = parseFloat(document.getElementById('w-val').value);
    if (!d || isNaN(v)) return;
    const weights = safeGetItem('weightHistory', '[]');
    weights.push({ date: d, weight: v, id: Date.now() });
    weights.sort((a,b) => new Date(a.date) - new Date(b.date));
    safeSetItem('weightHistory', weights);
    document.getElementById('w-val').value = '';
    renderWeight();
    recalculatePhysiqueAndCalories();
});

function renderWeight() {
    const weights = safeGetItem('weightHistory', '[]');
    const c = document.getElementById('weight-list');
    c.innerHTML = '';
    [...weights].reverse().forEach(w => {
        const d = document.createElement('div');
        d.className = 'record-item';
        d.innerHTML = `
            <div class="record-info">
                <span class="record-title">Pesée</span>
                <span class="record-date">${formatDate(w.date)}</span>
            </div>
            <div class="record-value-container">
                <span class="record-value">${w.weight} kg</span>
                <button class="delete-btn" onclick="deleteItem('weightHistory', ${w.id}, renderWeight)">${iconTrash}</button>
            </div>
        `;
        c.appendChild(d);
    });
    recalculatePhysiqueAndCalories();
}

// === GESTION RECORDS (AVEC DATE INCLUSE) ===
document.getElementById('record-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const d = document.getElementById('rec-date').value;
    const n = document.getElementById('rec-name').value;
    const v = document.getElementById('rec-value').value;
    if(!n || !v || !d) return;
    
    const recs = safeGetItem('elitePersonalRecords', '[]');
    recs.push({ id: Date.now(), name: escapeHtml(n), value: escapeHtml(v), date: d });
    safeSetItem('elitePersonalRecords', recs);
    
    document.getElementById('rec-name').value = '';
    document.getElementById('rec-value').value = '';
    renderRecords();
    updateGamification();
});

function renderRecords() {
    const recs = safeGetItem('elitePersonalRecords', '[]');
    const container = document.getElementById('records-list');
    container.innerHTML = '';
    recs.forEach(r => {
        const div = document.createElement('div');
        div.className = 'record-item';
        div.innerHTML = `
            <div class="record-info">
                <span class="record-title">${r.name}</span>
                <span class="record-date">${formatDate(r.date)}</span>
            </div>
            <div class="record-value-container">
                <span class="record-value">${r.value}</span>
                <button class="delete-btn" onclick="deleteItem('elitePersonalRecords', ${r.id}, renderRecords)">${iconTrash}</button>
            </div>
        `;
        container.appendChild(div);
    });
}

// === GESTION CARDIO / SEANCES ===
document.getElementById('cardio-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const d = document.getElementById('c-date').value;
    const t = document.getElementById('c-type').value;
    const dist = parseFloat(document.getElementById('c-dist').value);
    const time = parseInt(document.getElementById('c-time').value);
    
    const cardio = safeGetItem('cardioHistory', '[]');
    cardio.push({ id: Date.now(), date: d, type: t, distance: dist, duration: time });
    cardio.sort((a,b) => new Date(a.date) - new Date(b.date));
    safeSetItem('cardioHistory', cardio);
    
    document.getElementById('c-dist').value = '';
    document.getElementById('c-time').value = '';
    renderCardio();
});

function renderCardio() {
    const cardio = safeGetItem('cardioHistory', '[]');
    const c = document.getElementById('cardio-list');
    c.innerHTML = '';
    [...cardio].reverse().forEach(s => {
        const typeMap = { 'run': 'Course', 'bike': 'Vélo', 'swim': 'Natation' };
        const div = document.createElement('div');
        div.className = 'record-item';
        div.innerHTML = `
            <div class="record-info">
                <span class="record-title">${typeMap[s.type] || 'Séance'}</span>
                <span class="record-date">${formatDate(s.date)} - ${s.duration} min</span>
            </div>
            <div class="record-value-container">
                <span class="record-value">${s.distance} km</span>
                <button class="delete-btn" onclick="deleteItem('cardioHistory', ${s.id}, renderCardio)">${iconTrash}</button>
            </div>
        `;
        c.appendChild(div);
    });
}

// === SUPPRESSION GENERIQUE ===
function deleteItem(key, id, renderCb) {
    showConfirm("Supprimer cet élément ?", () => {
        let items = safeGetItem(key);
        items = items.filter(i => i.id !== id);
        safeSetItem(key, items);
        renderCb();
        if(key === 'weightHistory') recalculatePhysiqueAndCalories();
    });
}

// === COACH & GAMIFICATION ===
function updateSmartCoach() {
    const weights = safeGetItem('weightHistory', '[]');
    const cardio = safeGetItem('cardioHistory', '[]');
    const coachEl = document.getElementById('smart-coach-text');
    
    if(weights.length > 0 && cardio.length > 0) {
        coachEl.innerText = "Excellente dynamique ! Vos efforts croisés musculation / cardio vont optimiser votre composition corporelle.";
    } else {
        coachEl.innerText = "Enregistrez vos premières séances et pesées pour que je puisse générer une analyse.";
    }
}

function updateGamification() {
    const recs = safeGetItem('elitePersonalRecords', '[]');
    const c = document.getElementById('gamification-container');
    c.innerHTML = '';
    if(recs.length > 0) {
        c.innerHTML += `<div class="badge badge-gold">${iconTrophy} Premier Record</div>`;
    }
    if(recs.length >= 3) {
        c.innerHTML += `<div class="badge badge-gold">${iconTrophy} Athlète Prometteur (3 Records)</div>`;
    }
    if(c.innerHTML === '') {
        c.innerHTML = `<span style="font-size:0.8rem; color:var(--text-muted);">Aucun succès débloqué.</span>`;
    }
}

// === EXPORT / IMPORT ===
window.exportDataData = function() {
    const obj = { 
        userProfileBaseV2: safeGetItem('userProfileBaseV2', 'null'), 
        weightHistory: safeGetItem('weightHistory'), 
        cardioHistory: safeGetItem('cardioHistory'), 
        elitePersonalRecords: safeGetItem('elitePersonalRecords'), 
        macroConfigMode: localStorage.getItem('macroConfigMode'), 
        manualMacrosValues: localStorage.getItem('manualMacrosValues') 
    };
    const a = document.createElement('a'); a.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(obj));
    a.download = `wallysport_bento_backup.json`; document.body.appendChild(a); a.click(); a.remove();
}
window.triggerImportField = function() { document.getElementById('import-file-field').click(); }
window.importDataData = function(e) {
    const file = e.target.files[0]; if(!file) return; const reader = new FileReader();
    reader.onload = function(ev) {
        try { const json = JSON.parse(ev.target.result);
            ['userProfileBaseV2','weightHistory','cardioHistory','elitePersonalRecords','macroConfigMode','manualMacrosValues'].forEach(k => { if(json[k]) localStorage.setItem(k, typeof json[k] === 'object' ? JSON.stringify(json[k]) : json[k]); });
            alert("Restauration achevée."); window.location.reload();
        } catch (err) { alert("Format de fichier invalide."); }
    }; reader.readAsText(file);
}

// === PDF GENERATOR ===
window.generatePDFReport = function() {
    try {
        const { jsPDF } = window.jspdf; const doc = new jsPDF();
        doc.setFontSize(22); doc.text("WALLY SPORT ELITE - BILAN DE PERFORMANCE", 20, 20);
        doc.setFontSize(10); doc.text(`Edité le : ${new Date().toLocaleDateString('fr-FR')}`, 20, 30);
        
        const weights = safeGetItem('weightHistory');
        if(weights.length > 0) {
            doc.text(`Dernier poids enregistré : ${weights[weights.length-1].weight} kg`, 20, 45);
        }
        doc.save('Bilan_Wally_Sport.pdf');
    } catch(e) {
        alert("Erreur lors de la génération du PDF. Vérifiez votre connexion pour jsPDF.");
    }
}
