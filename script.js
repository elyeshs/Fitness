// === STOCKAGE ROBUSTE ===
function safeGetItem(key, defaultValue = '[]') {
    try { const item = localStorage.getItem(key); return item ? JSON.parse(item) : JSON.parse(defaultValue); } catch (e) { return JSON.parse(defaultValue); }
}
function safeSetItem(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) {}
}
function escapeHtml(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function formatDate(dateString) {
    const d = new Date(dateString);
    return isNaN(d) ? '' : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

// === INITIALISATION ===
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('current-date-display').innerText = new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    document.getElementById('c-date').valueAsDate = new Date();
    document.getElementById('w-date').valueAsDate = new Date();

    loadProfileData();
    initMacroControls();
    renderWeight();
    renderRecords();
    renderCardio();
    renderCalendarInit();
    updateSmartCoach();
    updateGamification();
});

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
        document.getElementById('gender').value = saved.gender;
        document.getElementById('age').value = saved.age;
        document.getElementById('height').value = saved.height;
        document.getElementById('activity-level').value = saved.activityLevel;
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

function recalculatePhysiqueAndCalories() {
    const profile = safeGetItem('userProfileBaseV2', 'null');
    const weights = safeGetItem('weightHistory', '[]');
    const mode = safeGetItem('macroConfigMode', '"auto"');
    const deltaDisplay = document.getElementById('weight-delta-display');
    const bmiNum = document.getElementById('bmi-num');

    if (weights.length >= 2) {
        const diff = (weights[weights.length-1].weight - weights[weights.length-2].weight).toFixed(1);
        deltaDisplay.innerText = diff > 0 ? `+${diff} kg` : `${diff} kg`;
    }

    if (!profile || !profile.height || weights.length === 0) {
        bmiNum.innerText = "--"; 
        return;
    }

    const w = weights[weights.length-1].weight;
    const h = profile.height / 100;
    const bmi = (w / (h*h)).toFixed(1);
    bmiNum.innerText = bmi;
    
    let bmr = profile.gender === "male" ? (10*w + 6.25*profile.height - 5*profile.age + 5) : (10*w + 6.25*profile.height - 5*profile.age - 161);
    const maint = bmr * profile.activityLevel;
    
    document.getElementById('cal-base').innerText = `${Math.round(bmr)} kcal`;
    document.getElementById('cal-maintenance').innerText = `${Math.round(maint)} kcal`;
    document.getElementById('cal-deficit').innerText = `${Math.round(maint - 500)} kcal`;
    document.getElementById('cal-surplus').innerText = `${Math.round(maint + 300)} kcal`;

    if (mode === "auto") {
        document.getElementById('input-macro-prot').value = Math.round(w * 2);
        document.getElementById('input-macro-fat').value = Math.round(w * 1);
        document.getElementById('input-macro-carb').value = Math.round(Math.max(0, (maint - (w*2*4 + w*1*9))/4));
    }
}

// === TOOLTIP DATA VIZ ===
function showTooltip(e, text) {
    const tt = document.getElementById('chart-tooltip');
    tt.innerHTML = text;
    tt.classList.remove('hidden');
    tt.style.left = e.pageX + 'px';
    tt.style.top = e.pageY + 'px';
}
function hideTooltip() { document.getElementById('chart-tooltip').classList.add('hidden'); }

// === MOTEUR DATA-VIZ MULTI-AXES ===
function generateDataVizSVG(containerId, datasets, labels) {
    const container = document.getElementById(containerId);
    if (!datasets || datasets.length === 0 || datasets[0].data.length === 0) {
        container.innerHTML = `<div style="color:var(--text-muted); font-size:0.8rem; text-align:center; padding: 50px;">Aucune donnée métrique enregistrée.</div>`;
        return;
    }

    const width = container.clientWidth || 800;
    const height = 280;
    const paddingX = 40;
    const paddingY = 40;
    const graphW = width - paddingX * 2;
    const graphH = height - paddingY * 2;

    let svg = `<svg viewBox="0 0 ${width} ${height}" style="width:100%; height:100%; overflow:visible;">`;

    const gridLines = 4;
    for(let i=0; i<=gridLines; i++) {
        let y = paddingY + (graphH / gridLines) * i;
        svg += `<line x1="${paddingX}" y1="${y}" x2="${width - paddingX}" y2="${y}" stroke="var(--border)" stroke-dasharray="4" stroke-width="1" />`;
    }

    datasets.forEach((ds) => {
        if(!ds.data || ds.data.length === 0) return;
        const minV = Math.min(...ds.data) * 0.9;
        const maxV = Math.max(...ds.data) * 1.1 || 1;
        const range = maxV - minV;
        
        const points = ds.data.map((val, i) => {
            const x = paddingX + (i * (graphW / Math.max(1, ds.data.length - 1)));
            const y = paddingY + graphH - ((val - minV) / range) * graphH;
            return {x, y, val};
        });

        const pathD = points.map((p, i) => `${i===0?'M':'L'} ${p.x} ${p.y}`).join(' ');
        svg += `<path d="${pathD}" fill="none" stroke="${ds.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;

        points.forEach((p, i) => {
            svg += `<circle cx="${p.x}" cy="${p.y}" r="4" fill="${ds.color}" stroke="#fff" stroke-width="2" 
                    onmouseenter="showTooltip(event, '${labels[i]}<br/>${ds.label} : ${p.val}')" 
                    onmouseleave="hideTooltip()" style="cursor:crosshair; transition: r 0.2s;" />`;
        });
    });

    const step = Math.max(1, Math.floor(labels.length / 6)); 
    labels.forEach((label, i) => {
        if(i % step === 0 || i === labels.length - 1) {
            const x = paddingX + (i * (graphW / Math.max(1, labels.length - 1)));
            svg += `<text x="${x}" y="${height - 10}" fill="var(--text-muted)" font-size="10" font-weight="600" text-anchor="middle">${label}</text>`;
        }
    });

    if (datasets.length > 0) {
        let lx = paddingX;
        datasets.forEach((ds) => {
            svg += `<rect x="${lx}" y="5" width="12" height="12" fill="${ds.color}" rx="3"/>`;
            svg += `<text x="${lx + 18}" y="15" fill="var(--navy)" font-size="11" font-weight="700">${ds.label}</text>`;
            lx += 110;
        });
    }

    svg += `</svg>`;
    container.innerHTML = svg;
}

// === MODULE CARDIO & DATA-VIZ ===
document.getElementById('cardio-form').addEventListener('submit', (e) => {
    e.preventDefault();
    let history = safeGetItem('cardioHistory');
    const idx = document.getElementById('c-edit-index').value;
    const obj = {
        id: Date.now(),
        date: document.getElementById('c-date').value,
        dist: parseFloat(document.getElementById('c-dist').value),
        time: parseFloat(document.getElementById('c-time').value),
        speed: parseFloat(document.getElementById('c-speed').value),
        incline: parseFloat(document.getElementById('c-incline').value) || 0
    };
    if (idx === "-1") history.push(obj); 
    else { history[parseInt(idx)] = obj; cancelCardioEdit(); }
    safeSetItem('cardioHistory', history);
    document.getElementById('cardio-form').reset();
    document.getElementById('c-date').valueAsDate = new Date();
    renderCardio();
});

function cancelCardioEdit() {
    document.getElementById('cardio-form').reset();
    document.getElementById('c-date').valueAsDate = new Date();
    document.getElementById('c-edit-index').value = "-1";
    document.getElementById('cardio-submit-btn').innerText = "OK";
    document.getElementById('cardio-cancel-btn').classList.add('hidden');
}

window.editCardio = function(id) {
    let history = safeGetItem('cardioHistory');
    let idx = history.findIndex(x => x.id === id);
    if(idx !== -1) {
        let s = history[idx];
        document.getElementById('c-date').value = s.date;
        document.getElementById('c-dist').value = s.dist;
        document.getElementById('c-time').value = s.time;
        document.getElementById('c-speed').value = s.speed;
        document.getElementById('c-incline').value = s.incline;
        document.getElementById('c-edit-index').value = idx;
        document.getElementById('cardio-submit-btn').innerText = "MaJ";
        document.getElementById('cardio-cancel-btn').classList.remove('hidden');
    }
}
window.deleteCardio = function(id) {
    if(confirm("Supprimer cette séance ?")) {
        safeSetItem('cardioHistory', safeGetItem('cardioHistory').filter(x => x.id !== id));
        renderCardio();
    }
}

function renderCardio() {
    let history = safeGetItem('cardioHistory').sort((a,b) => new Date(a.date) - new Date(b.date));
    
    document.getElementById('cardio-body').innerHTML = [...history].reverse().map(s => `
        <tr>
            <td>${formatDate(s.date)}</td>
            <td><strong>${s.dist}</strong> km</td>
            <td>${s.time} min</td>
            <td>${s.speed} km/h</td>
            <td>${s.incline}%</td>
            <td>
                <div class="action-btns">
                    <button class="btn-small btn-edit" onclick="editCardio(${s.id})">Éditer</button>
                    <button class="btn-small btn-delete" onclick="deleteCardio(${s.id})">X</button>
                </div>
            </td>
        </tr>
    `).join('');

    const metric = document.getElementById('cardio-metric-select').value;
    const labels = history.map(s => formatDate(s.date));
    
    const dsDist = { label: 'Distance', data: history.map(s => s.dist), color: 'var(--gold)' };
    const dsSpeed = { label: 'Vitesse', data: history.map(s => s.speed), color: 'var(--navy)' };
    const dsTime = { label: 'Temps', data: history.map(s => s.time), color: '#94a3b8' };

    let activeDatasets = [];
    if(metric === 'all') activeDatasets = [dsDist, dsSpeed, dsTime];
    else if (metric === 'dist') activeDatasets = [dsDist];
    else if (metric === 'speed') activeDatasets = [dsSpeed];
    else if (metric === 'time') activeDatasets = [dsTime];

    generateDataVizSVG('cardio-chart', activeDatasets, labels);
}

// === POIDS, RECORDS & CALENDRIER ===
document.getElementById('weight-form').addEventListener('submit', (e) => {
    e.preventDefault();
    let history = safeGetItem('weightHistory');
    history.push({ date: document.getElementById('w-date').value, weight: parseFloat(document.getElementById('w-weight').value) });
    history.sort((a,b) => new Date(a.date) - new Date(b.date));
    safeSetItem('weightHistory', history);
    renderWeight(); recalculatePhysiqueAndCalories(); updateSmartCoach();
});
function renderWeight() {
    let h = safeGetItem('weightHistory');
    document.getElementById('weight-body').innerHTML = [...h].reverse().map(s => `<tr><td>${formatDate(s.date)}</td><td><strong>${s.weight} kg</strong></td></tr>`).join('');
}

document.getElementById('record-form').addEventListener('submit', (e) => {
    e.preventDefault();
    let r = safeGetItem('elitePersonalRecords');
    r.push({ id: Date.now(), name: document.getElementById('rec-name').value, value: document.getElementById('rec-value').value });
    safeSetItem('elitePersonalRecords', r);
    document.getElementById('record-form').reset();
    renderRecords(); updateGamification();
});
function renderRecords() {
    let r = safeGetItem('elitePersonalRecords');
    document.getElementById('records-container').innerHTML = r.map(x => `
        <div class="record-elite-card">
            <button class="delete-record-btn" onclick="deleteRecord(${x.id})">&times;</button>
            <div class="record-elite-title">${escapeHtml(x.name)}</div>
            <div class="record-elite-value">${escapeHtml(x.value)}</div>
        </div>
    `).join('');
}
window.deleteRecord = function(id) { safeSetItem('elitePersonalRecords', safeGetItem('elitePersonalRecords').filter(x => x.id !== id)); renderRecords(); }


// === CALENDRIER & ASSIDUITÉ (SPLIT MUSCU/CARDIO) ===
let currentMonth = new Date().getMonth(); let currentYear = new Date().getFullYear();
function renderCalendarInit() { renderCalendar(currentMonth, currentYear); }
window.changeMonth = function(dir) {
    currentMonth += dir; if(currentMonth>11){currentMonth=0; currentYear++;} else if(currentMonth<0){currentMonth=11; currentYear--;}
    renderCalendar(currentMonth, currentYear);
}

function updateConsistencyStreak(monthlyData, daysInMonth, year, month) {
    let muscuValidated = 0, muscuTotal = 0;
    let cardioValidated = 0, cardioTotal = 0;

    for(let i = 1; i <= daysInMonth; i++) {
        let dKey = `${year}-${String(month+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
        let sessions = monthlyData[dKey] || [];
        
        sessions.forEach(s => {
            const nameUpper = s.name.toUpperCase();
            // Identification des mots clés
            const isCardio = nameUpper.includes('CARDIO') || nameUpper.includes('RUN') || nameUpper.includes('VELO');
            
            if (isCardio) {
                cardioTotal++;
                if (s.validated) cardioValidated++;
            } else {
                muscuTotal++;
                if (s.validated) muscuValidated++;
            }
        });
    }
    
    // Mise à jour dynamique des deux indicateurs
    const mCount = document.getElementById('streak-muscu-count');
    const cCount = document.getElementById('streak-cardio-count');
    if(mCount) mCount.innerText = `${muscuValidated} / ${muscuTotal}`;
    if(cCount) cCount.innerText = `${cardioValidated} / ${cardioTotal}`;
}

function renderCalendar(month, year) {
    document.getElementById('month-year-display').innerText = new Date(year, month).toLocaleString('fr-FR', {month:'long', year:'numeric'}).toUpperCase();
    const grid = document.getElementById('calendar-grid'); grid.innerHTML = '';
    const daysInMonth = new Date(year, month+1, 0).getDate();
    let monthlyData = safeGetItem('calendarData', '{}');

    for(let i=1; i<=daysInMonth; i++) {
        let dKey = `${year}-${String(month+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
        let sessions = monthlyData[dKey] || [];
        
        let dHtml = `<div class="cal-day" onclick="openDayModal('${dKey}')"><span class="cal-day-num">${i}</span>`;
        sessions.forEach(s => {
            // Attribution automatique des badges selon le nom
            const nameUp = s.name.toUpperCase();
            let badgeC = (nameUp.includes('CARDIO') || nameUp.includes('RUN') || nameUp.includes('VELO')) ? 'badge-cardio' : 'badge-muscu';
            
            dHtml += `<div class="cal-day-content"><span class="cal-badge ${badgeC}">${escapeHtml(s.name)}</span>
            <input type="checkbox" ${s.validated?'checked':''} onclick="event.stopPropagation(); toggleSession('${dKey}',${s.id})"></div>`;
        });
        dHtml += `</div>`; grid.innerHTML += dHtml;
    }

    // Lancement de l'algorithme de calcul séparé
    updateConsistencyStreak(monthlyData, daysInMonth, year, month);
}

window.openDayModal = function(dKey) {
    document.getElementById('modal-day-title').innerText = formatDate(dKey);
    document.getElementById('modal-day-date').value = dKey;
    document.getElementById('calendar-day-modal').classList.remove('hidden');
}
window.addSessionToDay = function(e) {
    e.preventDefault();
    let dKey = document.getElementById('modal-day-date').value;
    let data = safeGetItem('calendarData', '{}');
    if(!data[dKey]) data[dKey] = [];
    data[dKey].push({ id: Date.now(), name: document.getElementById('session-name').value, validated: false });
    safeSetItem('calendarData', data);
    document.getElementById('session-name').value = "";
    document.getElementById('calendar-day-modal').classList.add('hidden');
    renderCalendarInit();
}
window.toggleSession = function(dKey, id) {
    let data = safeGetItem('calendarData', '{}');
    let session = data[dKey].find(x => x.id === id);
    if(session) { session.validated = !session.validated; safeSetItem('calendarData', data); renderCalendarInit(); updateGamification(); }
}

// === COACH & GAMIFICATION ===
function updateSmartCoach() {
    let w = safeGetItem('weightHistory');
    let text = "Maintenez votre régularité pour des analyses prédictives.";
    if (w.length >= 2) {
        let diff = w[w.length-1].weight - w[w.length-2].weight;
        if(diff < 0) text = "Dynamique de perte enclenchée. Maintenez le déficit calorique sans rogner sur l'intensité physique.";
        else if (diff > 0) text = "Prise de masse détectée. Assurez la surcharge progressive sur vos exercices polyarticulaires.";
        else text = "Poids stabilisé. Modifiez vos variables d'entraînement (Vitesse, Pente, Volume) pour relancer l'adaptation.";
    }
    document.getElementById('smart-coach-text').innerText = text;
}
function updateGamification() {
    let r = safeGetItem('elitePersonalRecords').length;
    let c = document.getElementById('gamification-container');
    let html = "";
    if(r > 0) html += `<span class="badge badge-gold">🏆 Élite (${r} Records)</span>`;
    if(r >= 5) html += `<span class="badge">🔥 Hall of Fame</span>`;
    if(html === "") html = "<small style='color:var(--text-muted);'>Aucun fait d'arme débloqué.</small>";
    c.innerHTML = html;
}

// === EXPORT / IMPORT (Backup JSON) ===
window.exportDataData = function() {
    const obj = {
        userProfileBaseV2: localStorage.getItem('userProfileBaseV2'),
        weightHistory: localStorage.getItem('weightHistory'),
        calendarData: localStorage.getItem('calendarData'),
        cardioHistory: localStorage.getItem('cardioHistory'),
        elitePersonalRecords: localStorage.getItem('elitePersonalRecords'),
        macroConfigMode: localStorage.getItem('macroConfigMode'),
        manualMacrosValues: localStorage.getItem('manualMacrosValues')
    };
    const a = document.createElement('a');
    a.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(obj));
    a.download = `wallysport_bento_backup.json`;
    document.body.appendChild(a); a.click(); a.remove();
}
window.triggerImportField = function() { document.getElementById('import-file-field').click(); }
window.importDataData = function(e) {
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
        try {
            const json = JSON.parse(ev.target.result);
            ['userProfileBaseV2','weightHistory','calendarData','cardioHistory','elitePersonalRecords','macroConfigMode','manualMacrosValues'].forEach(k => { if(json[k]) localStorage.setItem(k, json[k]); });
            alert("Restauration Bento achevée."); window.location.reload();
        } catch (err) { alert("Format de fichier invalide."); }
    };
    reader.readAsText(file);
}

// === PDF GENERATOR BASCULÉ ===
window.generatePDFReport = function() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.setFontSize(22);
        doc.text("WALLY SPORT ELITE - BILAN DE PERFORMANCE", 20, 20);
        doc.setFontSize(10);
        doc.text(`Édité le : ${new Date().toLocaleDateString('fr-FR')}`, 20, 28);
        doc.save("Bilan_Mensuel_WallySport.pdf");
    } catch(e) { alert("Erreur d'édition PDF. Vérifiez votre connexion internet pour l'accès CDN."); }
}
