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

// === NOUVEAU : HAPTIC FEEDBACK (Vibrations Mobile) ===
function triggerHaptic() {
    if (navigator.vibrate) {
        navigator.vibrate(40); // Vibration courte et premium
    }
}

// === ICONES SVG POUR JS ===
const iconEdit = `<svg class="icon-sm" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
const iconTrash = `<svg class="icon-sm" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
const iconCheck = `<svg class="icon-sm" viewBox="0 0 24 24" stroke="#10b981"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
const iconTrophy = `<svg class="icon-sm" viewBox="0 0 24 24"><path d="M8 21h8M12 17v4M7 4h10M5 4h14v4a7 7 0 0 1-14 0V4z"></path></svg>`;
const iconDrag = `<svg class="icon-sm" viewBox="0 0 24 24"><line x1="4" y1="8" x2="20" y2="8"></line><line x1="4" y1="16" x2="20" y2="16"></line></svg>`;

// === POP-UP DE CONFIRMATION HARMONISE ===
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

// === NOUVEAU : OBSERVATEUR DE SCROLL FLUIDE ===
function initScrollObserver() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if(entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.classList.add('reveal-visible');
                    entry.target.classList.remove('reveal-hidden');
                }, index * 80); // Effet cascade
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.05 });

    document.querySelectorAll('.bento-item').forEach(el => {
        el.classList.add('reveal-hidden');
        observer.observe(el);
    });
}

// === NOUVEAU : EFFET PARALLAXE CARD TILT ===
function initTiltEffect() {
    document.querySelectorAll('.bento-item').forEach(item => {
        item.addEventListener('mousemove', e => {
            const rect = item.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            // Calcul de l'inclinaison opposée
            const rotateX = ((y - centerY) / centerY) * -4; 
            const rotateY = ((x - centerX) / centerX) * 4;
            
            item.style.transition = 'none'; // Désactive la transition pendant le mvt pour la fluidité
            item.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
        });
        
        item.addEventListener('mouseleave', () => {
            item.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.5s ease';
            item.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
        });
    });
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
    
    // Lancement des interactions App-like
    initScrollObserver();
    initTiltEffect();
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
    renderCalendarInit(); 
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
        bmiText.innerText = (profile && profile.height && weights.length === 0) ? "En attente de pesée" : "Profil incomplet";
        bmiAdvice.innerText = weights.length === 0 ? "Veuillez ajouter une pesée dans l'encart Fluctuation Poids." : "Cliquez sur le rouage pour configurer vos constantes.";
        bmiBox.classList.add('bg-default');
        return;
    }

    const w = weights[weights.length-1].weight;
    const h = profile.height / 100;
    const bmi = parseFloat((w / (h*h)).toFixed(1));
    
    const bmiEl = document.getElementById('bmi-num');
    animateValue(bmiEl, parseFloat(bmiEl.dataset.val) || 0, bmi, 1000, true);
    bmiEl.dataset.val = bmi;
    
    if (bmi < 18.5) {
        bmiBox.classList.add('bmi-under');
        bmiText.innerText = "Insuffisance pondérale";
        bmiAdvice.innerText = "Un léger surplus calorique et musculaire est recommandé.";
    } else if (bmi < 25) {
        bmiBox.classList.add('bmi-normal');
        bmiText.innerText = "Poids Normal (Idéal)";
        bmiAdvice.innerText = "Excellent ! Maintenez cet équilibre et vos performances.";
    } else if (bmi < 30) {
        bmiBox.classList.add('bmi-over');
        bmiText.innerText = "Léger Surpoids";
        bmiAdvice.innerText = "Un léger déficit calorique est conseillé pour affiner.";
    } else {
        bmiBox.classList.add('bmi-obese');
        bmiText.innerText = "Obésité";
        bmiAdvice.innerText = "Visez un déficit maîtrisé et consultez un professionnel.";
    }
    
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

// === TOOLTIP & CROSSHAIR DYNAMIQUE ===
function showTooltipWithCrosshair(e, text, xPos, containerId) {
    const tt = document.getElementById('chart-tooltip');
    tt.innerHTML = text; tt.classList.remove('hidden');
    tt.style.left = e.pageX + 'px'; tt.style.top = e.pageY + 'px';
    const crosshair = document.getElementById(`crosshair-${containerId}`);
    if (crosshair) { crosshair.style.display = 'block'; crosshair.setAttribute('x1', xPos); crosshair.setAttribute('x2', xPos); }
}
function hideTooltipAndCrosshair(containerId) { 
    document.getElementById('chart-tooltip').classList.add('hidden'); 
    const crosshair = document.getElementById(`crosshair-${containerId}`); if(crosshair) crosshair.style.display = 'none';
}

function generateDataVizSVG(containerId, datasets, labels) {
    const container = document.getElementById(containerId);
    if (!datasets || datasets.length === 0 || datasets[0].data.length === 0) {
        container.innerHTML = `<div style="color:var(--text-muted); font-size:0.8rem; text-align:center; padding: 50px;">Sélectionnez au moins un paramètre.</div>`; return;
    }

    const width = container.clientWidth || 800; const height = 280;
    const paddingX = 40; const paddingY = 40;
    const graphW = width - paddingX * 2; const graphH = height - paddingY * 2;

    let svg = `<svg viewBox="0 0 ${width} ${height}" style="width:100%; height:100%; overflow:visible;">
               <style>.path-anim { stroke-dasharray: 2000; stroke-dashoffset: 2000; animation: drawLine 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }</style>`;

    const gridLines = 4;
    for(let i=0; i<=gridLines; i++) {
        let y = paddingY + (graphH / gridLines) * i;
        svg += `<line x1="${paddingX}" y1="${y}" x2="${width - paddingX}" y2="${y}" stroke="var(--border)" stroke-dasharray="4" stroke-width="1" />`;
    }

    svg += `<line id="crosshair-${containerId}" x1="0" y1="${paddingY}" x2="0" y2="${height - paddingY}" stroke="var(--navy)" stroke-width="1" stroke-dasharray="4" style="display:none; pointer-events:none;" />`;

    datasets.forEach((ds) => {
        if(!ds.data || ds.data.length === 0) return;
        const minV = Math.min(...ds.data) * 0.9; const maxV = Math.max(...ds.data) * 1.1 || 1;
        const range = (maxV - minV) || 1;
        
        const points = ds.data.map((val, i) => {
            const x = paddingX + (i * (graphW / Math.max(1, ds.data.length - 1)));
            const y = paddingY + graphH - ((val - minV) / range) * graphH;
            return {x, y, val};
        });

        const pathD = points.map((p, i) => `${i===0?'M':'L'} ${p.x} ${p.y}`).join(' ');
        svg += `<path class="path-anim" d="${pathD}" fill="none" stroke="${ds.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;

        points.forEach((p, i) => {
            svg += `<circle cx="${p.x}" cy="${p.y}" r="4" fill="${ds.color}" stroke="#fff" stroke-width="2" 
                    onmouseenter="showTooltipWithCrosshair(event, '${labels[i]}<br/>${ds.label} : ${p.val}', ${p.x}, '${containerId}')" 
                    onmouseleave="hideTooltipAndCrosshair('${containerId}')" style="cursor:crosshair; transition: r 0.2s;" />`;
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
    svg += `</svg>`; container.innerHTML = svg;
}

// === CARDIO CRUD & TIMELINE VISUELLE ===
document.getElementById('cardio-form').addEventListener('submit', (e) => {
    e.preventDefault(); triggerHaptic();
    let history = safeGetItem('cardioHistory');
    const editId = document.getElementById('c-edit-id').value;
    const obj = {
        id: editId === "-1" ? Date.now() : parseInt(editId), 
        date: document.getElementById('c-date').value,
        dist: parseFloat(document.getElementById('c-dist').value), time: parseFloat(document.getElementById('c-time').value),
        speed: parseFloat(document.getElementById('c-speed').value), incline: parseFloat(document.getElementById('c-incline').value) || 0
    };
    
    if (editId === "-1") { history.push(obj); } 
    else { 
        const index = history.findIndex(x => x.id === parseInt(editId));
        if (index !== -1) history[index] = obj;
        cancelCardioEdit(); 
    }
    
    safeSetItem('cardioHistory', history);
    document.getElementById('cardio-form').reset();
    document.getElementById('c-date').valueAsDate = new Date();
    renderCardio();
});

function cancelCardioEdit() {
    triggerHaptic();
    document.getElementById('cardio-form').reset();
    document.getElementById('c-date').valueAsDate = new Date();
    document.getElementById('c-edit-id').value = "-1";
    document.getElementById('cardio-submit-btn').innerHTML = `<svg class="icon-sm" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Ajouter`;
    document.getElementById('cardio-cancel-btn').classList.add('hidden');
}

window.editCardio = function(id) {
    triggerHaptic();
    let history = safeGetItem('cardioHistory'); 
    let session = history.find(x => x.id === id);
    if(session) {
        document.getElementById('c-date').value = session.date;
        document.getElementById('c-dist').value = session.dist; document.getElementById('c-time').value = session.time;
        document.getElementById('c-speed').value = session.speed; document.getElementById('c-incline').value = session.incline || 0;
        document.getElementById('c-edit-id').value = session.id;
        document.getElementById('cardio-submit-btn').innerHTML = `${iconEdit} MaJ`;
        document.getElementById('cardio-cancel-btn').classList.remove('hidden');
    }
}

window.deleteCardio = function(id) {
    showConfirm("Voulez-vous supprimer définitivement cette séance ?", () => {
        safeSetItem('cardioHistory', safeGetItem('cardioHistory').filter(x => x.id !== id)); 
        renderCardio();
    });
}

window.renderCardio = function() {
    let history = safeGetItem('cardioHistory').sort((a,b) => new Date(a.date) - new Date(b.date));
    const timelineContainer = document.getElementById('cardio-timeline');
    
    if (timelineContainer) {
        if (history.length === 0) {
            timelineContainer.innerHTML = `<div style="color:var(--text-muted); font-size:0.8rem; text-align:center; padding: 30px;">Aucune séance enregistrée pour le moment.</div>`;
        } else {
            timelineContainer.innerHTML = [...history].reverse().map(s => `
                <div class="timeline-item">
                    <div class="timeline-badge"></div>
                    <div class="timeline-header">
                        <span class="timeline-date">${formatDate(s.date)}</span>
                        <div class="action-btns">
                            <button class="btn-small btn-edit haptic-btn" onclick="editCardio(${s.id})" title="Éditer">${iconEdit}</button>
                            <button class="btn-small btn-delete haptic-btn" onclick="deleteCardio(${s.id})" title="Supprimer">${iconTrash}</button>
                        </div>
                    </div>
                    <div class="timeline-details">
                        <div>Distance : <strong>${s.dist} km</strong></div>
                        <div>Temps : <strong>${s.time} min</strong></div>
                        <div>Vitesse : <strong>${s.speed} km/h</strong></div>
                        <div>Pente : <strong>${s.incline || 0}%</strong></div>
                    </div>
                </div>
            `).join('');
        }
    }
    
    const labels = history.map(s => formatDate(s.date));
    const dsDist = { label: 'Distance', data: history.map(s => s.dist), color: 'var(--gold)' };
    const dsSpeed = { label: 'Vitesse', data: history.map(s => s.speed), color: 'var(--navy)' };
    const dsTime = { label: 'Temps', data: history.map(s => s.time), color: '#94a3b8' };
    const dsIncline = { label: 'Pente', data: history.map(s => s.incline || 0), color: '#10b981' }; 

    const checkedBoxes = Array.from(document.querySelectorAll('#cardio-metric-toggles input:checked')).map(cb => cb.value);

    let activeDatasets = [];
    if (checkedBoxes.includes('dist')) activeDatasets.push(dsDist);
    if (checkedBoxes.includes('speed')) activeDatasets.push(dsSpeed);
    if (checkedBoxes.includes('time')) activeDatasets.push(dsTime);
    if (checkedBoxes.includes('incline')) activeDatasets.push(dsIncline);
    
    generateDataVizSVG('cardio-chart', activeDatasets, labels);
}

// === POIDS & RECORDS ===
document.getElementById('weight-form').addEventListener('submit', (e) => {
    e.preventDefault(); triggerHaptic();
    let history = safeGetItem('weightHistory');
    history.push({ id: Date.now(), date: document.getElementById('w-date').value, weight: parseFloat(document.getElementById('w-weight').value) });
    history.sort((a,b) => new Date(a.date) - new Date(b.date));
    safeSetItem('weightHistory', history); renderWeight(); recalculatePhysiqueAndCalories(); updateSmartCoach();
});
function renderWeight() { 
    const history = safeGetItem('weightHistory').sort((a,b) => new Date(a.date) - new Date(b.date));
    document.getElementById('weight-body').innerHTML = [...history].reverse().map(s => `<tr><td>${formatDate(s.date)}</td><td><strong>${s.weight} kg</strong></td></tr>`).join(''); 
    
    const labels = history.map(s => formatDate(s.date));
    const dsWeight = { label: 'Poids (kg)', data: history.map(s => s.weight), color: 'var(--navy)' };
    generateDataVizSVG('weight-chart', [dsWeight], labels);
}

document.getElementById('record-form').addEventListener('submit', (e) => {
    e.preventDefault(); triggerHaptic(); let r = safeGetItem('elitePersonalRecords');
    r.push({ id: Date.now(), name: document.getElementById('rec-name').value, value: document.getElementById('rec-value').value });
    safeSetItem('elitePersonalRecords', r); document.getElementById('record-form').reset(); renderRecords(); updateGamification();
});
function renderRecords() { document.getElementById('records-container').innerHTML = safeGetItem('elitePersonalRecords').map(x => `
    <div class="record-elite-card"><button class="delete-record-btn" onclick="deleteRecord(${x.id})" title="Supprimer">${iconTrash}</button>
    <div class="record-elite-title">${escapeHtml(x.name)}</div><div class="record-elite-value">${escapeHtml(x.value)}</div></div>`).join(''); }

window.deleteRecord = function(id) { 
    showConfirm("Voulez-vous supprimer ce record ?", () => {
        safeSetItem('elitePersonalRecords', safeGetItem('elitePersonalRecords').filter(x => x.id !== id)); 
        renderRecords(); 
    });
}

// === CALENDRIER & OBJECTIF (COULEUR DYNAMIQUE) ===
let currentMonth = new Date().getMonth(); let currentYear = new Date().getFullYear();
function renderCalendarInit() { renderCalendar(currentMonth, currentYear); calculateWeeklyGoal(); }
window.changeMonth = function(dir) {
    triggerHaptic();
    currentMonth += dir; if(currentMonth>11){currentMonth=0; currentYear++;} else if(currentMonth<0){currentMonth=11; currentYear--;}
    renderCalendar(currentMonth, currentYear);
}

function calculateWeeklyGoal() {
    let monthlyData = safeGetItem('calendarData', '{}');
    const today = new Date();
    let dayOfWeek = today.getDay(); // Dimanche = 0, Lundi = 1
    if (dayOfWeek === 0) dayOfWeek = 7; // Ajustement Lundi -> Dimanche

    let weekStart = new Date(today); weekStart.setDate(today.getDate() - dayOfWeek + 1);
    
    let weeklyValidatedSessions = 0; let totalWeeklyTarget = 0;
    
    for(let i=0; i<7; i++) {
        let d = new Date(weekStart); d.setDate(weekStart.getDate() + i);
        let dKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        let sessions = monthlyData[dKey] || [];
        totalWeeklyTarget += sessions.length; 
        weeklyValidatedSessions += sessions.filter(s => s.validated).length;
    }
    
    document.getElementById('weekly-goal-text').innerText = `${weeklyValidatedSessions}/${totalWeeklyTarget} cette semaine`;
    const percent = totalWeeklyTarget > 0 ? Math.min((weeklyValidatedSessions / totalWeeklyTarget) * 100, 100) : 0;
    
    const fillEl = document.getElementById('weekly-goal-fill');
    fillEl.style.width = `${percent}%`;

    // NOUVEAU : Logique de couleur dynamique (Rouge si en retard, Gold si OK/Avance)
    let expectedMinimum = Math.floor((totalWeeklyTarget / 7) * dayOfWeek);
    if (weeklyValidatedSessions < expectedMinimum && totalWeeklyTarget > 0) {
        fillEl.style.backgroundColor = '#ef4444'; // Rouge vif (Retard)
        fillEl.style.boxShadow = '0 0 10px rgba(239,68,68,0.5)';
    } else {
        fillEl.style.backgroundColor = 'var(--gold)'; // Gold (Dans les temps ou Avance)
        if (weeklyValidatedSessions >= totalWeeklyTarget && totalWeeklyTarget > 0) {
            fillEl.style.boxShadow = '0 0 12px var(--gold-glow)'; // Récompense visuelle brillante
        } else {
            fillEl.style.boxShadow = 'none';
        }
    }
}

function updateConsistencyStreak(monthlyData, daysInMonth, year, month) {
    let muscuValidated = 0, cardioValidated = 0;
    for(let i = 1; i <= daysInMonth; i++) {
        let dKey = `${year}-${String(month+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
        let sessions = monthlyData[dKey] || [];
        sessions.forEach(s => {
            const isCardio = (s.name.toUpperCase().includes('CARDIO') || s.name.toUpperCase().includes('RUN') || s.name.toUpperCase().includes('VELO'));
            if (s.validated) { if(isCardio) cardioValidated++; else muscuValidated++; }
        });
    }
    animateValue(document.getElementById('streak-muscu-count'), 0, muscuValidated, 800);
    animateValue(document.getElementById('streak-cardio-count'), 0, cardioValidated, 800);
}

function renderCalendar(month, year) {
    document.getElementById('month-year-display').innerText = new Date(year, month).toLocaleString('fr-FR', {month:'long', year:'numeric'}).toUpperCase();
    const grid = document.getElementById('calendar-grid'); 
    
    const daysOfWeek = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    let gridHTML = daysOfWeek.map(d => `<div class="cal-day-header">${d}</div>`).join('');
    
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const emptyCells = (firstDayOfMonth + 6) % 7; 
    
    for(let i=0; i<emptyCells; i++) { gridHTML += `<div class="cal-day cal-day-empty"></div>`; }
    
    const daysInMonth = new Date(year, month+1, 0).getDate();
    let monthlyData = safeGetItem('calendarData', '{}');

    for(let i=1; i<=daysInMonth; i++) {
        let dKey = `${year}-${String(month+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
        let sessions = monthlyData[dKey] || [];
        
        let dayThemeClass = "";
        if (sessions.length > 0) {
            let lastSess = sessions[sessions.length-1].name.toUpperCase();
            if(lastSess.includes('CARDIO') || lastSess.includes('RUN')) dayThemeClass = "theme-glow-cardio";
            else dayThemeClass = "theme-glow-muscu";
        }
        
        let dHtml = `<div class="cal-day haptic-btn ${dayThemeClass}" onclick="openDayModal('${dKey}')"><span class="cal-day-num">${i}</span>`;
        sessions.forEach(s => {
            const nameUp = s.name.toUpperCase();
            let badgeC = (nameUp.includes('CARDIO') || nameUp.includes('RUN') || nameUp.includes('VELO')) ? 'badge-cardio' : 'badge-muscu';
            dHtml += `<div class="cal-day-content"><span class="cal-badge ${badgeC}">${escapeHtml(s.name)}</span>
            <input type="checkbox" ${s.validated?'checked':''} onclick="event.stopPropagation(); toggleSession('${dKey}',${s.id})"></div>`;
        });
        dHtml += `</div>`; gridHTML += dHtml;
    }
    
    grid.innerHTML = gridHTML;
    updateConsistencyStreak(monthlyData, daysInMonth, year, month);
}

// === GESTION MODAL CALENDRIER ET DRAG & DROP ===
window.openDayModal = function(dKey) {
    triggerHaptic();
    document.getElementById('modal-day-title').innerText = formatDate(dKey);
    document.getElementById('modal-day-date').value = dKey;
    document.getElementById('session-edit-id').value = "-1";
    document.getElementById('session-name').value = "";
    document.getElementById('modal-session-btn').innerHTML = `<svg class="icon-sm" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
    renderDaySessions(dKey);
    document.getElementById('calendar-day-modal').classList.remove('hidden');
}

window.closeDayModal = function() { triggerHaptic(); document.getElementById('calendar-day-modal').classList.add('hidden'); }

// NOUVEAU : Fonctions de Drag and Drop
let draggedSessionId = null;

window.handleDragStart = function(e) {
    draggedSessionId = parseInt(e.currentTarget.dataset.id);
    e.currentTarget.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    triggerHaptic(); // Petit feedback au moment de prendre la carte
}

window.handleDragOver = function(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
window.handleDragEnter = function(e) { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }
window.handleDragLeave = function(e) { e.currentTarget.classList.remove('drag-over'); }

window.handleDrop = function(e, dKey) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    const targetId = parseInt(e.currentTarget.dataset.id);
    
    if (draggedSessionId === targetId) return;

    let data = safeGetItem('calendarData', '{}');
    let sessions = data[dKey];
    
    const draggedIdx = sessions.findIndex(s => s.id === draggedSessionId);
    const targetIdx = sessions.findIndex(s => s.id === targetId);

    // Déplacement dans l'array
    const [draggedItem] = sessions.splice(draggedIdx, 1);
    sessions.splice(targetIdx, 0, draggedItem);

    safeSetItem('calendarData', data);
    triggerHaptic(); // Feedback au laché
    renderDaySessions(dKey);
    renderCalendarInit();
}

document.addEventListener('dragend', (e) => {
    if(e.target.classList.contains('modal-list-item')) e.target.classList.remove('dragging');
});

function renderDaySessions(dKey) {
    let data = safeGetItem('calendarData', '{}');
    let sessions = data[dKey] || [];
    let listContainer = document.getElementById('modal-day-sessions');
    
    if (sessions.length === 0) { listContainer.innerHTML = "<small style='color:var(--text-muted);'>Aucune séance ce jour.</small>"; return; }
    
    // Intégration du Drag and Drop HTML5 sur chaque élément de la liste
    listContainer.innerHTML = sessions.map((s, index) => `
        <div class="modal-list-item" draggable="true" data-id="${s.id}" data-index="${index}" 
             ondragstart="handleDragStart(event)" ondragover="handleDragOver(event)" 
             ondrop="handleDrop(event, '${dKey}')" ondragenter="handleDragEnter(event)" ondragleave="handleDragLeave(event)">
            <span style="display:flex; align-items:center; gap:8px;">
                <span class="drag-handle" title="Maintenir pour déplacer">${iconDrag}</span>
                ${s.validated ? iconCheck : ''} ${escapeHtml(s.name)}
            </span>
            <div class="action-btns">
                <button type="button" class="btn-small btn-edit haptic-btn" onclick="prepareEditSession('${dKey}', ${s.id})" title="Éditer">${iconEdit}</button>
                <button type="button" class="btn-small btn-delete haptic-btn" onclick="deleteSession('${dKey}', ${s.id})" title="Supprimer">${iconTrash}</button>
            </div>
        </div>
    `).join('');
}

window.saveSessionToDay = function(e) {
    e.preventDefault(); triggerHaptic();
    let dKey = document.getElementById('modal-day-date').value;
    let sName = document.getElementById('session-name').value;
    let editId = document.getElementById('session-edit-id').value;
    let data = safeGetItem('calendarData', '{}');
    if(!data[dKey]) data[dKey] = [];
    
    if (editId === "-1") {
        data[dKey].push({ id: Date.now(), name: sName, validated: false });
    } else {
        let session = data[dKey].find(x => x.id === parseInt(editId));
        if (session) session.name = sName;
    }
    
    safeSetItem('calendarData', data);
    document.getElementById('session-name').value = "";
    document.getElementById('session-edit-id').value = "-1";
    document.getElementById('modal-session-btn').innerHTML = `<svg class="icon-sm" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
    renderDaySessions(dKey);
    renderCalendarInit();
}

window.prepareEditSession = function(dKey, id) {
    triggerHaptic();
    let data = safeGetItem('calendarData', '{}');
    let session = data[dKey].find(x => x.id === id);
    if(session) {
        document.getElementById('session-name').value = session.name;
        document.getElementById('session-edit-id').value = session.id;
        document.getElementById('modal-session-btn').innerHTML = iconEdit;
    }
}

window.deleteSession = function(dKey, id) {
    showConfirm("Voulez-vous supprimer définitivement cette séance ?", () => {
        let data = safeGetItem('calendarData', '{}');
        data[dKey] = data[dKey].filter(x => x.id !== id);
        safeSetItem('calendarData', data);
        renderDaySessions(dKey);
        renderCalendarInit();
    });
}

window.toggleSession = function(dKey, id) {
    triggerHaptic();
    let data = safeGetItem('calendarData', '{}');
    let session = data[dKey].find(x => x.id === id);
    if(session) { session.validated = !session.validated; safeSetItem('calendarData', data); renderCalendarInit(); updateGamification(); }
}

// === COACH & GAMIFICATION ===
function updateSmartCoach() {
    let w = safeGetItem('weightHistory'); let text = "Maintenez votre régularité pour des analyses prédictives.";
    if (w.length >= 2) {
        let diff = w[w.length-1].weight - w[w.length-2].weight;
        if(diff < 0) text = "Dynamique de perte enclenchée. Maintenez le déficit calorique sans rogner sur l'intensité physique.";
        else if (diff > 0) text = "Prise de masse détectée. Assurez la surcharge progressive sur vos exercices polyarticulaires.";
        else text = "Poids stabilisé. Modifiez vos variables d'entraînement (Vitesse, Pente, Volume) pour relancer l'adaptation.";
    } document.getElementById('smart-coach-text').innerText = text;
}
function updateGamification() {
    let r = safeGetItem('elitePersonalRecords').length; let c = document.getElementById('gamification-container'); let html = "";
    if(r > 0) html += `<span class="badge badge-gold">${iconTrophy} Élite (${r} Records)</span>`;
    if(r >= 5) html += `<span class="badge" style="color:var(--navy);">${iconTrophy} Hall of Fame</span>`;
    if(html === "") html = "<small style='color:var(--text-muted);'>Aucun fait d'arme débloqué.</small>";
    c.innerHTML = html;
}

// === EXPORT / IMPORT ===
window.exportDataData = function() {
    const obj = { userProfileBaseV2: localStorage.getItem('userProfileBaseV2'), weightHistory: localStorage.getItem('weightHistory'), calendarData: localStorage.getItem('calendarData'), cardioHistory: localStorage.getItem('cardioHistory'), elitePersonalRecords: localStorage.getItem('elitePersonalRecords'), macroConfigMode: localStorage.getItem('macroConfigMode'), manualMacrosValues: localStorage.getItem('manualMacrosValues') };
    const a = document.createElement('a'); a.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(obj));
    a.download = `wallysport_bento_backup.json`; document.body.appendChild(a); a.click(); a.remove();
}
window.triggerImportField = function() { document.getElementById('import-file-field').click(); }
window.importDataData = function(e) {
    const file = e.target.files[0]; if(!file) return; const reader = new FileReader();
    reader.onload = function(ev) {
        try { const json = JSON.parse(ev.target.result);
            ['userProfileBaseV2','weightHistory','calendarData','cardioHistory','elitePersonalRecords','macroConfigMode','manualMacrosValues'].forEach(k => { if(json[k]) localStorage.setItem(k, json[k]); });
            alert("Restauration Bento achevée."); window.location.reload();
        } catch (err) { alert("Format de fichier invalide."); }
    }; reader.readAsText(file);
}

// === PDF GENERATOR ===
window.generatePDFReport = function() {
    triggerHaptic();
    try {
        const { jsPDF } = window.jspdf; const doc = new jsPDF();
        doc.setFontSize(22); doc.text("WALLY SPORT ELITE - BILAN DE PERFORMANCE", 20, 20);
        doc.setFontSize(10); doc.text(`Édité le : ${new Date().toLocaleDateString('fr-FR')}`, 20, 28);
        doc.save("Bilan_Mensuel_WallySport.pdf");
    } catch(e) { alert("Erreur PDF. Vérifiez votre connexion internet pour l'accès CDN."); }
}
