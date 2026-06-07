// --- GLOBAL VARIABLES ---
    let tempMediaData = {}; 
    let alleinGbuData = { schwere: '1', warsch: '1', rettung: '0', risk: 0, massnahmen: [], frei: '', wer: '', wann: '' };
    let brandGbuList = [];
    
    // --- DICTATION FUNCTION (General) ---
    function startDictation(targetId, btn) {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) {
            alert("Diktierfunktion wird vom Browser nicht unterstützt.");
            return;
        }
        const rec = new SpeechRec(); 
        rec.lang = 'de-DE';
        
        if (btn.classList.contains('recording')) { 
            rec.stop(); 
            return; 
        }
        
        btn.classList.add('recording'); 
        rec.start();
        
        rec.onresult = function(e) { 
            const tx = document.getElementById(targetId); 
            tx.value = (tx.value + " " + e.results[0][0].transcript).trim(); 
        };
        
        rec.onend = function() { btn.classList.remove('recording'); };
        rec.onerror = function() { btn.classList.remove('recording'); };
    }

    // --- DICTATION FUNCTION FÜR DIE SUCHE ---
    function startSearchDictation(targetId, btn) {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) {
            alert("Diktierfunktion wird vom Browser nicht unterstützt.");
            return;
        }
        const rec = new SpeechRec(); 
        rec.lang = 'de-DE';
        
        if (btn.classList.contains('recording')) { 
            rec.stop(); 
            return; 
        }
        
        btn.classList.add('recording'); 
        rec.start();
        
        rec.onresult = function(e) { 
            const tx = document.getElementById(targetId); 
            tx.value = e.results[0][0].transcript.trim(); 
            filterEquipment(); 
        };
        
        rec.onend = function() { btn.classList.remove('recording'); };
        rec.onerror = function() { btn.classList.remove('recording'); };
    }

    // --- MEDIA UPLOAD FUNCTION ---
    function handleMediaUpload(e, previewContainerId) {
        const file = e.target.files[0]; 
        if (!file) return;
        
        const isVid = file.type.startsWith('video/');
        const container = document.getElementById(previewContainerId);
        container.innerHTML = ''; 
        container.style.display = 'block';
        
        const reader = new FileReader();
        reader.onload = function(ev) {
            if (isVid) {
                tempMediaData[previewContainerId] = { type: 'video', data: ev.target.result };
                container.innerHTML = '<video src="' + ev.target.result + '" controls></video>';
            } else {
                const img = new Image();
                img.onload = function() {
                    const canvas = document.createElement('canvas'); 
                    const scale = 600 / img.width;
                    canvas.width = 600; 
                    canvas.height = img.height * scale;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    const comp = canvas.toDataURL('image/jpeg', 0.6);
                    tempMediaData[previewContainerId] = { type: 'image', data: comp };
                    container.innerHTML = '<img src="' + comp + '">';
                }; 
                img.src = ev.target.result;
            }
        }; 
        reader.readAsDataURL(file);
    }

    // --- NAVIGATION & MODUS WAHl ---
    let viewOrder = [];
    let currentViewId = 'view-0';
    
    const allModules = [
        { id: 'view-1', title: '1. Betriebsdaten', icon: 'fa-building', mode: 'both' },
        { id: 'view-sbg', title: '2. SBG-Checkliste', icon: 'fa-fire-shield', mode: 'brand' },
        { id: 'view-2', title: '3. GDA-Check', icon: 'fa-clipboard-check', mode: 'sifa' },
        { id: 'view-3', title: '4. Begehung & Mängel', icon: 'fa-camera', mode: 'both' },
        { id: 'view-gef-brand', title: '5. Gefahrstoffe (Brandschutz)', icon: 'fa-fire-flame-curved', mode: 'brand' },
        { id: 'view-4', title: '6. Gefahrstoffe (EMKG)', icon: 'fa-skull-crossbones', mode: 'sifa' },
        { id: 'view-5', title: '7. Prüffristen-Kataster', icon: 'fa-calendar-check', mode: 'sifa' },
        { id: 'view-6', title: '8. IT-Infrastruktur', icon: 'fa-server', mode: 'sifa' },
        { id: 'view-12', title: '9. Zwiebelschale', icon: 'fa-layer-group', mode: 'sifa' },
        { id: 'view-equipment', title: '10. Geräte/Maschinen', icon: 'fa-plug', mode: 'sifa' },
        { id: 'view-bgm', title: '11. BGM & Ergonomie', icon: 'fa-heart-pulse', mode: 'sifa' },
        { id: 'view-report', title: '12. Protokoll generieren', icon: 'fa-file-pdf', mode: 'both' }
    ];

    function startAudit() {
        const isSifa = document.getElementById('mode-sifa').checked;
        const isBrand = document.getElementById('mode-brand').checked;
        
        if(!isSifa && !isBrand) {
            alert("Bitte wähle mindestens einen Modus aus.");
            return;
        }
        
        viewOrder = [];
        let menuHtml = '';
        let selectHtml = '<option value="">Schnellzugriff...</option>';
        
        allModules.forEach(mod => {
            let include = false;
            if (mod.mode === 'both') include = true;
            if (mod.mode === 'sifa' && isSifa) include = true;
            if (mod.mode === 'brand' && isBrand) include = true;
            
            if (include) {
                viewOrder.push(mod.id);
                
                if(mod.id === 'view-report') {
                    menuHtml += `<button class="btn btn-primary" onclick="generateReport()" style="margin-top:20px; grid-column:1/-1;"><i class="fa-solid ${mod.icon}"></i> ${mod.title}</button>`;
                } else {
                    menuHtml += `<button class="btn btn-dark" onclick="switchView('${mod.id}')"><i class="fa-solid ${mod.icon}" style="width:25px;"></i> ${mod.title}</button>`;
                }
                
                selectHtml += `<option value="${mod.id}">${mod.title}</option>`;
            }
        });
        
        document.getElementById('main-menu-grid').innerHTML = menuHtml;
        document.getElementById('quick-nav-select').innerHTML = selectHtml;
        
        // Mängel-Kategorien (Brandschutz) anzeigen falls aktiv
        document.getElementById('mangel-kat-container').style.display = isBrand ? 'block' : 'none';
        
        switchView('view-1');
    }

    function switchView(id) { 
        currentViewId = id;
        const views = document.querySelectorAll('.view');
        for (let i = 0; i < views.length; i++) {
            views[i].classList.remove('active');
        }
        document.getElementById(id).classList.add('active'); 
        window.scrollTo(0,0); 
        
        // Navigation Bar updaten
        const navBar = document.getElementById('global-nav');
        if (!navBar) return;
        
        const btnBack = document.getElementById('nav-btn-back');
        const btnNext = document.getElementById('nav-btn-next');
        const quickNav = document.getElementById('quick-nav-select');
        
        if (id === 'view-menu') {
            navBar.style.display = 'none';
        } else {
            navBar.style.display = 'flex';
            quickNav.value = id;
            
            const idx = viewOrder.indexOf(id);
            if (idx <= 0) {
                btnBack.onclick = () => switchView('view-menu');
            } else {
                btnBack.onclick = () => switchView(viewOrder[idx - 1]);
            }
            
            if (idx === viewOrder.length - 1 || idx === -1) {
                btnNext.style.display = 'none';
            } else {
                btnNext.style.display = 'inline-block';
                if (viewOrder[idx + 1] === 'view-report') {
                    btnNext.innerHTML = '<i class="fa-solid fa-file-pdf"></i> Bericht';
                    btnNext.onclick = () => generateReport();
                } else {
                    btnNext.innerHTML = 'Weiter <i class="fa-solid fa-arrow-right"></i>';
                    btnNext.onclick = () => switchView(viewOrder[idx + 1]);
                }
            }
        }
    }
    
    function goBack() {
        document.getElementById('nav-btn-back').click();
    }
    
    function goNext() {
        document.getElementById('nav-btn-next').click();
    }

    // --- BRANDSCHUTZ APP DATEN ---
    const chkQuestions = [
        "Sind die Flucht- und Rettungspläne aktuell und gut sichtbar?",
        "Sind die Fluchtwege frei von Brandlasten und Hindernissen?",
        "Funktionieren die Brandschutztüren ordnungsgemäß (schließen selbstständig)?",
        "Wurden Keile oder ähnliches an Brandschutztüren entfernt?",
        "Sind die Feuerlöscher geprüft (Plakette) und frei zugänglich?",
        "Ist die Sicherheitsbeleuchtung funktionstüchtig?",
        "Wurde die letzte Räumungsübung innerhalb der Frist durchgeführt?",
        "Sind die Brandmelder / BMA-Anlage frei von Hindernissen?",
        "Ist die Feuerwehrzufahrt / Bewegungsfläche frei zugänglich?"
    ];

    function renderSBGCheckliste() {
        let html = '';
        chkQuestions.forEach((q, i) => {
            html += `
            <div class="card" style="margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
                <div style="flex:1; padding-right:15px; font-size:14px;">${q}</div>
                <div style="display:flex; gap:10px;">
                    <button id="sbg_y_${i}" class="btn btn-dark" style="margin:0; padding:8px 15px;" onclick="setSBG(${i}, true)">Ja</button>
                    <button id="sbg_n_${i}" class="btn btn-dark" style="margin:0; padding:8px 15px;" onclick="setSBG(${i}, false)">Nein</button>
                </div>
            </div>`;
        });
        const container = document.getElementById('chk-container');
        if(container) container.innerHTML = html;
    }
    // Direkt nach Definition aufrufen!
    document.addEventListener("DOMContentLoaded", renderSBGCheckliste);
    
    let sbgAnswers = {};
    function setSBG(i, val) {
        sbgAnswers[i] = val;
        document.getElementById('sbg_y_' + i).style.background = val ? 'var(--primary)' : 'var(--bg-dark)';
        document.getElementById('sbg_n_' + i).style.background = !val ? 'var(--color-red)' : 'var(--bg-dark)';
    }

    let gefahrstoffeBrand = [];
    function addGefahrstoffBrand() {
        const n = document.getElementById('g_name').value;
        const m = document.getElementById('g_menge').value;
        const o = document.getElementById('g_ort').value;
        const k = document.getElementById('g_klasse').value;
        const trgs = document.getElementById('g_trgs').value;
        const txt = document.getElementById('g_text').value;

        if (!n) return alert("Produktname fehlt!");

        gefahrstoffeBrand.push({name: n, menge: m, ort: o, klasse: k, trgs: trgs, text: txt});
        
        document.getElementById('g_name').value = '';
        document.getElementById('g_menge').value = '';
        document.getElementById('g_ort').value = '';
        document.getElementById('g_text').value = '';
        
        renderGefBrandList();
    }

    function renderGefBrandList() {
        let html = '';
        gefahrstoffeBrand.forEach((g, idx) => {
            let trgsColor = g.trgs === 'ja' ? 'var(--color-green)' : (g.trgs === 'nein' ? 'var(--color-red)' : '#f59e0b');
            html += `
            <div class="card" style="border-left-color:#ef4444; position:relative;">
                <button onclick="gefahrstoffeBrand.splice(${idx}, 1); renderGefBrandList();" style="position:absolute; right:10px; top:10px; background:none; border:none; color:var(--color-red); cursor:pointer;"><i class="fa-solid fa-trash"></i></button>
                <strong style="color:#ef4444; font-size:15px;">${g.name}</strong> <span style="font-size:12px; color:var(--text-muted);">(${g.menge})</span><br>
                <div style="font-size:13px; margin-top:5px;"><strong>Ort:</strong> ${g.ort}</div>
                <div style="font-size:13px; margin-top:2px;"><strong>Brandverhalten:</strong> ${g.klasse}</div>
                <div style="font-size:13px; margin-top:2px;"><strong>TRGS 510:</strong> <span style="color:${trgsColor}; font-weight:bold;">${g.trgs.toUpperCase()}</span></div>
                ${g.text ? `<div style="font-size:13px; margin-top:5px; color:#991b1b; background:#fee2e2; padding:5px; border-radius:4px;">${g.text}</div>` : ''}
            </div>`;
        });
        document.getElementById('gef-brand-liste').innerHTML = html;
    }

    // --- VIEW 1: QUOTEN ---
    function calcQuoten() {
        const emp = parseInt(document.getElementById('v1_emp').value) || 0;
        const art = document.getElementById('v1_art').value;
        const ist_e = parseInt(document.getElementById('v1_erst_ist').value) || 0;
        const ist_b = parseInt(document.getElementById('v1_brand_ist').value) || 0;
        
        let soll_e = 0;
        if (emp >= 2 && emp <= 20) {
            soll_e = 1;
        } else if (emp > 20) {
            if (art === 'buero') {
                soll_e = Math.ceil(emp * 0.05);
            } else {
                soll_e = Math.ceil(emp * 0.10);
            }
        }

        let soll_b = 0;
        if (emp >= 1) {
            soll_b = Math.ceil(emp * 0.05);
        }
        
        const el_e = document.getElementById('ampel_erst');
        if (emp === 0) { 
            el_e.className = "eval-item status-fail"; 
            el_e.innerText = "Ersthelfende: Daten fehlen"; 
        } else { 
            if (ist_e >= soll_e) {
                el_e.className = "eval-item status-pass";
                el_e.innerHTML = "Ersthelfende: " + ist_e + "/" + soll_e + " ✓";
            } else {
                el_e.className = "eval-item status-fail";
                el_e.innerHTML = "Ersthelfende: " + ist_e + "/" + soll_e + " ⚠️";
            }
        }
        
        const el_b = document.getElementById('ampel_brand');
        if (emp === 0) { 
            el_b.className = "eval-item status-fail"; 
            el_b.innerText = "Brandschutzhelfende: Daten fehlen"; 
        } else { 
            if (ist_b >= soll_b) {
                el_b.className = "eval-item status-pass";
                el_b.innerHTML = "Brandschutzhelfende: " + ist_b + "/" + soll_b + " ✓";
            } else {
                el_b.className = "eval-item status-fail";
                el_b.innerHTML = "Brandschutzhelfende: " + ist_b + "/" + soll_b + " ⚠️";
            }
        }
        
        // Warn-Boxen
        document.getElementById('warn-erst').style.display = (emp > 0 && ist_e < soll_e) ? 'block' : 'none';
        document.getElementById('warn-brand').style.display = (emp > 0 && ist_b < soll_b) ? 'block' : 'none';
        
        // GBU Einblendungen
        const e_aus = document.getElementById('v1_erst_ausnahme').value;
        const b_aus = document.getElementById('v1_brand_ausnahme').value;
        
        const isAllein = (e_aus === 'allein' && document.getElementById('warn-erst').style.display === 'block');
        document.getElementById('alleinarbeit-gbu').style.display = isAllein ? 'block' : 'none';
        if(isAllein) calcAlleinRisk();
        
        const isBrandGBU = (b_aus === 'gbu' && document.getElementById('warn-brand').style.display === 'block');
        document.getElementById('brandschutz-gbu').style.display = isBrandGBU ? 'block' : 'none';
        if(isBrandGBU) renderBrandGBU();
    }

    function calcAlleinRisk() {
        const schwere = parseInt(document.querySelector('input[name="al_schwere"]:checked')?.value || "1");
        const warsch = parseInt(document.querySelector('input[name="al_warsch"]:checked')?.value || "1");
        const rettung = parseInt(document.getElementById('al_rettung').value || "0");
        
        const risiko = (schwere + rettung) * warsch;
        
        const resEl = document.getElementById('allein-result');
        resEl.style.display = 'block';
        if (risiko < 30) {
            resEl.style.background = '#dcfce7'; resEl.style.color = '#166534';
            resEl.innerHTML = `Risiko-Index: ${risiko} &lt; 30<br>Geringe Gefährdung: Keine besonderen Maßnahmen erforderlich. Empfehlung: NORA App des Bundes nutzen.`;
            document.getElementById('allein-measures').style.display = 'none';
        } else {
            resEl.style.background = '#fee2e2'; resEl.style.color = '#991b1b';
            resEl.innerHTML = `Risiko-Index: ${risiko} &ge; 30<br>Erhöhte/Kritische Gefährdung! Maßnahmen erforderlich:`;
            document.getElementById('allein-measures').style.display = 'block';
        }
        
        updateAlleinMeasures(risiko);
    }

    function updateAlleinMeasures(risikoOverride = null) {
        const schwere = document.querySelector('input[name="al_schwere"]:checked')?.value || "1";
        const warsch = document.querySelector('input[name="al_warsch"]:checked')?.value || "1";
        const rettung = document.getElementById('al_rettung').value || "0";
        
        let risiko = risikoOverride !== null ? risikoOverride : (parseInt(schwere)+parseInt(rettung))*parseInt(warsch);
        
        const massnahmen = Array.from(document.querySelectorAll('.al-meas-cb:checked')).map(cb => cb.value);
        const frei = document.getElementById('al_frei').value;
        const wer = document.getElementById('al_wer').value;
        const wann = document.getElementById('al_wann').value;

        alleinGbuData = { schwere, warsch, rettung, risk: risiko, massnahmen, frei, wer, wann };
    }

    function addBrandGBU() {
        brandGbuList.push({
            id: 'bgbu_' + Date.now(),
            abt: '',
            besch: '',
            flaeche: '',
            nutzung: 'buero',
            quellen: false,
            last: false,
            bsh: 0,
            massnahmen: [],
            eqRisk: {}
        });
        renderBrandGBU();
    }

    function removeBrandGBU(id) {
        brandGbuList = brandGbuList.filter(b => b.id !== id);
        renderBrandGBU();
    }

    function updateBrandGBUObj(id, field, value) {
        const obj = brandGbuList.find(b => b.id === id);
        if (obj) {
            if (field === 'massnahmen') {
                const cb = document.querySelector(`input[data-bgbu="${id}"][value="${value}"]`);
                if (cb.checked) {
                    if (!obj.massnahmen.includes(value)) obj.massnahmen.push(value);
                } else {
                    obj.massnahmen = obj.massnahmen.filter(m => m !== value);
                }
            } else if (field.startsWith('eqRisk_')) {
                const eqName = field.substring(7);
                if (!obj.eqRisk) obj.eqRisk = {};
                obj.eqRisk[eqName] = value;
            } else {
                obj[field] = value;
            }
        }
    }

    function getBrandTexte(nutzung) {
        switch (nutzung) {
            case 'buero': return { q: '(z.B. Kaffeemaschine, Drucker, Ladegeräte)', l: '(z.B. Papier, Akten, Verpackungen)' };
            case 'lager': return { q: '(z.B. Ladestationen, Stapler, Heizstrahler)', l: '(z.B. Holzpaletten, Pappe, Folien, Kunststoffe)' };
            case 'produktion': return { q: '(z.B. Schweißgeräte, Winkelschleifer, Heiße Oberflächen)', l: '(z.B. Späne, Öle, Lösungsmittel, Staub)' };
            case 'serverraum': return { q: '(z.B. Server, USV-Anlagen, Netzteile)', l: '(z.B. Kabelisolierungen, Kunststoffgehäuse)' };
            case 'teekueche': return { q: '(z.B. Herd, Mikrowelle, Toaster, Wasserkocher)', l: '(z.B. Küchenrolle, Möbel, Textilien)' };
            case 'besprechung': return { q: '(z.B. Beamer, Displays, Mehrfachsteckdosen)', l: '(z.B. Möbel, Papier)' };
            default: return { q: '(z.B. Kaffeemaschine, Server)', l: '(z.B. viel Papier, Verpackungen)' };
        }
    }

    function setAllEqRisk(areaId, riskValue) {
        if (!riskValue) return;
        const obj = brandGbuList.find(b => b.id === areaId);
        if (!obj) return;
        if (!obj.eqRisk) obj.eqRisk = {};
        
        if (typeof activeEquipmentData !== 'undefined' && activeEquipmentData.length > 0) {
            activeEquipmentData.forEach(c => c.items.forEach(i => { 
                if(i.checked) obj.eqRisk[i.name] = riskValue; 
            }));
        }
        renderBrandGBU();
    }

    function renderBrandGBU() {
        let eqList = [];
        if (typeof activeEquipmentData !== 'undefined' && activeEquipmentData.length > 0) {
            activeEquipmentData.forEach(c => c.items.forEach(i => { if(i.checked) eqList.push(i.name); }));
        }

        let html = '';
        brandGbuList.forEach((b, index) => {
            let texte = getBrandTexte(b.nutzung);
            
            let eqHtml = '';
            if (eqList.length > 0) {
                eqHtml += `<div style="margin-top:8px; padding-top:8px; border-top:1px dashed #cbd5e1;">`;
                eqHtml += `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                    <label style="font-size:11px; font-weight:bold; color:#e74c3c; margin:0;">Arbeitsmittel / Maschinen (Brandgefahr):</label>
                    <select style="width:130px; padding:2px; font-size:10px; border:1px solid #e74c3c; border-radius:3px; background:#fee2e2; color:#991b1b; margin:0;" onchange="setAllEqRisk('${b.id}', this.value)">
                        <option value="">-- Alle setzen auf --</option>
                        <option value="keine">Nicht im Bereich / Keine</option>
                        <option value="gering">Geringe Gefahr</option>
                        <option value="mittel">Mittlere Gefahr</option>
                        <option value="hoch">Hohe Gefahr</option>
                    </select>
                </div>
                `;
                eqList.forEach(eq => {
                    let currentRisk = b.eqRisk && b.eqRisk[eq] ? b.eqRisk[eq] : 'keine';
                    eqHtml += `
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:5px; font-size:11px;">
                        <span style="color:#333;">${eq}</span>
                        <select style="width:130px; padding:2px; font-size:11px; border:1px solid #ccc; border-radius:3px;" onchange="updateBrandGBUObj('${b.id}', 'eqRisk_${eq}', this.value); renderBrandGBU();">
                            <option value="keine" ${currentRisk === 'keine' ? 'selected' : ''}>Nicht im Bereich / Keine</option>
                            <option value="gering" ${currentRisk === 'gering' ? 'selected' : ''}>Geringe Gefahr</option>
                            <option value="mittel" ${currentRisk === 'mittel' ? 'selected' : ''}>Mittlere Gefahr</option>
                            <option value="hoch" ${currentRisk === 'hoch' ? 'selected' : ''}>Hohe Gefahr</option>
                        </select>
                    </div>`;
                });
                eqHtml += `</div>`;
            }

            html += `
            <div style="background:#fff; border:1px solid #cbd5e1; padding:10px; border-radius:6px; margin-bottom:10px; position:relative;">
                <button onclick="removeBrandGBU('${b.id}')" style="position:absolute; top:5px; right:5px; background:none; border:none; color:#e74c3c; cursor:pointer; font-size:16px;"><i class="fa-solid fa-trash"></i></button>
                <div class="input-grid" style="margin-bottom:10px;">
                    <div>
                        <label>Abteilung / Bereich:</label>
                        <input type="text" value="${b.abt}" onchange="updateBrandGBUObj('${b.id}', 'abt', this.value)" placeholder="z.B. 1. OG, EG">
                    </div>
                    <div>
                        <label>Beschäftigte:</label>
                        <input type="text" value="${b.besch}" onchange="updateBrandGBUObj('${b.id}', 'besch', this.value)" placeholder="z.B. 20, keine dauerhaft">
                    </div>
                    <div>
                        <label>Fläche (m²):</label>
                        <input type="number" value="${b.flaeche}" onchange="updateBrandGBUObj('${b.id}', 'flaeche', this.value)">
                    </div>
                </div>
                
                <div style="margin-bottom:10px;">
                    <label>Typische Nutzung:</label>
                    <select onchange="updateBrandGBUObj('${b.id}', 'nutzung', this.value); renderBrandGBU();">
                        <option value="buero" ${b.nutzung==='buero'?'selected':''}>Büro / Verwaltung</option>
                        <option value="lager" ${b.nutzung==='lager'?'selected':''}>Lager</option>
                        <option value="produktion" ${b.nutzung==='produktion'?'selected':''}>Produktion / Werkstatt</option>
                        <option value="serverraum" ${b.nutzung==='serverraum'?'selected':''}>Serverraum</option>
                        <option value="teekueche" ${b.nutzung==='teekueche'?'selected':''}>Sozialraum / Teeküche</option>
                        <option value="besprechung" ${b.nutzung==='besprechung'?'selected':''}>Besprechungsraum</option>
                    </select>
                </div>
                
                <div style="margin-bottom:10px; background:#f8fafc; padding:8px; border-radius:4px; border:1px solid #e2e8f0;">
                    <label style="display:flex; align-items:center; gap:5px; margin-bottom:5px; font-size:13px;"><input type="checkbox" ${b.quellen?'checked':''} onchange="updateBrandGBUObj('${b.id}', 'quellen', this.checked)" style="width:16px;height:16px;margin:0;"> Typische Brandquellen vorhanden? ${texte.q}</label>
                    <label style="display:flex; align-items:center; gap:5px; font-size:13px;"><input type="checkbox" ${b.last?'checked':''} onchange="updateBrandGBUObj('${b.id}', 'last', this.checked)" style="width:16px;height:16px;margin:0;"> Erhöhte Brandlast vorhanden? ${texte.l}</label>
                    ${eqHtml}
                </div>
                
                <div style="margin-bottom:10px;">
                    <label>Zusätzliche Maßnahmen:</label>
                    <div style="font-size:12px; background:#f8fafc; padding:8px; border-radius:4px; border:1px solid #e2e8f0;">
                        <label style="display:flex; align-items:center; gap:5px; margin-bottom:4px;"><input type="checkbox" data-bgbu="${b.id}" value="Feuerlöscher vorhanden" onchange="updateBrandGBUObj('${b.id}', 'massnahmen', this.value)" ${b.massnahmen.includes('Feuerlöscher vorhanden')?'checked':''} style="width:14px;height:14px;margin:0;"> Feuerlöscher vorhanden</label>
                        <label style="display:flex; align-items:center; gap:5px; margin-bottom:4px;"><input type="checkbox" data-bgbu="${b.id}" value="Unterweisung zum Brandschutz" onchange="updateBrandGBUObj('${b.id}', 'massnahmen', this.value)" ${b.massnahmen.includes('Unterweisung zum Brandschutz')?'checked':''} style="width:14px;height:14px;margin:0;"> Unterweisung zum Brandschutz</label>
                        <label style="display:flex; align-items:center; gap:5px; margin-bottom:4px;"><input type="checkbox" data-bgbu="${b.id}" value="Brandmeldeanlage (BMA)" onchange="updateBrandGBUObj('${b.id}', 'massnahmen', this.value)" ${b.massnahmen.includes('Brandmeldeanlage (BMA)')?'checked':''} style="width:14px;height:14px;margin:0;"> Brandmeldeanlage (BMA)</label>
                        <label style="display:flex; align-items:center; gap:5px;"><input type="checkbox" data-bgbu="${b.id}" value="Sauerstoffreduzierungsanlage" onchange="updateBrandGBUObj('${b.id}', 'massnahmen', this.value)" ${b.massnahmen.includes('Sauerstoffreduzierungsanlage')?'checked':''} style="width:14px;height:14px;margin:0;"> Sauerstoffreduzierungsanlage</label>
                    </div>
                </div>
                
                <div>
                    <label>Empfohlene BSH (Anzahl) in diesem Bereich:</label>
                    <input type="number" style="width:100px;" value="${b.bsh}" onchange="updateBrandGBUObj('${b.id}', 'bsh', this.value)">
                </div>
            </div>
            `;
        });
        
        if (brandGbuList.length === 0) {
            html = '<div style="font-size:12px; color:#666; margin-bottom:10px;">Bitte Bereich hinzufügen.</div>';
        }
        
        document.getElementById('brand-gbu-list').innerHTML = html;
    }

    // --- VIEW 2: GDA CHECK ---
    const gdaQuestions = [
        "Arbeitsschutzpflichten delegiert?", 
        "Wirksamkeitskontrollen GBU durchgeführt?", 
        "Unterweisungen spezifisch/nachweislich?", 
        "Arbeitsmed. Vorsorge organisiert?"
    ];
    let gdaAnswers = {};
    
    function initGDA() {
        let html = "";
        for (let i = 0; i < gdaQuestions.length; i++) {
            gdaAnswers[i] = "nein";
            html += '<div class="gda-row">';
            html += '<div>' + gdaQuestions[i] + '</div>';
            html += '<div class="gda-options">';
            html += '<div class="gda-btn" id="gda_' + i + '_ja" onclick="setGDA(' + i + ', \'ja\')">Ja</div>';
            html += '<div class="gda-btn" id="gda_' + i + '_teil" onclick="setGDA(' + i + ', \'teil\')">Teil</div>';
            html += '<div class="gda-btn active-nein" id="gda_' + i + '_nein" onclick="setGDA(' + i + ', \'nein\')">Nein</div>';
            html += '</div></div>';
        }
        document.getElementById('gda-container').innerHTML = html;
    }
    
    function setGDA(i, v) { 
        gdaAnswers[i] = v; 
        document.getElementById('gda_' + i + '_ja').className = "gda-btn";
        document.getElementById('gda_' + i + '_teil').className = "gda-btn";
        document.getElementById('gda_' + i + '_nein').className = "gda-btn";
        document.getElementById('gda_' + i + '_' + v).classList.add('active-' + v); 
    }

    // --- VIEW 3: MÄNGEL ---
    let mangelList = [];
    
    function addMangel() {
        const t = document.getElementById('v3_text').value;
        const w = document.getElementById('v3_wer').value || 'n.v.';
        const b = document.getElementById('v3_bis').value || 'sofort';
        
        if (!t) return alert("Text fehlt!");

        let katBoxes = document.querySelectorAll('.v3-kat-cb:checked');
        let katList = [];
        katBoxes.forEach(cb => katList.push(cb.value));

        let mData = tempMediaData['preview_v3'];
        mangelList.push({ t: t, w: w, b: b, m: mData, kats: katList });

        document.getElementById('v3_text').value = '';
        document.getElementById('v3_wer').value = '';
        document.getElementById('v3_bis').value = '';
        tempMediaData['preview_v3'] = null;
        document.getElementById('preview_v3').innerHTML = '';
        
        // Checkboxes resetten
        document.querySelectorAll('.v3-kat-cb').forEach(cb => cb.checked = false);

        renderMangelList();
    }
    
    function renderMangelList() {
        let html = '';
        mangelList.forEach((m, idx) => {
            let katHtml = m.kats && m.kats.length > 0 ? `<div style="font-size:11px; color:#ef4444; font-weight:bold; margin-bottom:5px;">[${m.kats.join(', ')}]</div>` : '';
            html += `
            <div class="card" style="position:relative;">
                <button onclick="mangelList.splice(${idx}, 1); renderMangelList();" style="position:absolute; right:10px; top:10px; background:none; border:none; color:var(--color-red); cursor:pointer;"><i class="fa-solid fa-trash"></i></button>
                ${katHtml}
                <div style="font-weight:600; font-size:14px; margin-bottom:8px; padding-right:20px;">${m.t}</div>
                <div style="font-size:12px; color:var(--text-muted);"><b>Wer:</b> ${m.w} | <b>Bis:</b> ${m.b}</div>
                ${m.m && m.m.type === 'image' ? `<img src="${m.m.data}" style="max-height:60px; margin-top:8px; border-radius:4px;">` : ''}
            </div>`;
        });
        document.getElementById('mangel-liste').innerHTML = html;
    }

    // --- VIEW 4: EMKG ENGINE ---
    const EMKG_Engine = {
        hSatzMapEinatmen: { 
            "A": ["H303","H313","H333"], 
            "B": ["H302","H312","H332","H371"], 
            "C": ["H314","H318","H372","H373"], 
            "D": ["H300","H310","H330","H360","H361","H370"], 
            "E": ["H340","H350","H350i"] 
        },
        hSatzMapHaut: { 
            "HA": ["H315","H319","EUH066"], 
            "HB": ["H312","H317","H314"], 
            "HC": ["H310","H311"] 
        },
        hSatzMapBrand: { 
            "BA": ["H226", "H228"], 
            "BB": ["H225", "H250", "H260"], 
            "BC": ["H220", "H224", "H240"] 
        },
        
        determineGroup: function(hsArray, map, fallback) {
            let highest = fallback; 
            const order = ["A","B","C","D","E","HA","HB","HC","BA","BB","BC"]; 
            let maxIndex = -1;
            
            for (let group in map) {
                if (map.hasOwnProperty(group)) {
                    for (let j = 0; j < map[group].length; j++) {
                        const h = map[group][j];
                        if (hsArray.indexOf(h) !== -1 && order.indexOf(group) > maxIndex) {
                            highest = group;
                            maxIndex = order.indexOf(group);
                        }
                    }
                }
            }
            return highest; 
        },
        determineGroupByAGW: function(agw) {
            if (!agw || agw <= 0) return null;
            if (agw > 50) return "A"; 
            if (agw > 5) return "B"; 
            if (agw > 0.5) return "C"; 
            return "D";
        }
    };

    let inventoryList = [];
    
    function calculateAndAddSubstance() {
        const name = document.getElementById('emkg_name').value;
        const bereich = document.getElementById('emkg_bereich').value;
        
        if (!name) {
            alert("Bitte Produktnamen eingeben!");
            return;
        }
        
        const hs_boxes = document.querySelectorAll('.hs-cb:checked');
        let hs_array = [];
        for (let i = 0; i < hs_boxes.length; i++) {
            hs_array.push(hs_boxes[i].value);
        }
        
        const agw = parseFloat(document.getElementById('emkg_agw').value);
        
        let gruppe_ein = EMKG_Engine.determineGroup(hs_array, EMKG_Engine.hSatzMapEinatmen, "A");
        if (agw && gruppe_ein !== "E") {
            gruppe_ein = EMKG_Engine.determineGroupByAGW(agw);
        }
        
        let gruppe_haut_raw = EMKG_Engine.determineGroup(hs_array, EMKG_Engine.hSatzMapHaut, "A");
        let gruppe_haut = gruppe_haut_raw.replace("H", "");
        let gruppe_brand = EMKG_Engine.determineGroup(hs_array, EMKG_Engine.hSatzMapBrand, "None");

        const menge = document.getElementById('emkg_menge').value; 
        const frei = document.getElementById('emkg_frei').value;
        const luft = document.getElementById('emkg_luft').checked; 
        const haut_aus = document.getElementById('emkg_haut_aus').value;
        const feucht = document.getElementById('emkg_feucht').checked; 
        const flaeche = document.getElementById('emkg_flaeche').value;
        const dauer = document.getElementById('emkg_dauer').value;
        const brand_menge = document.getElementById('emkg_brand_menge').value;
        const temp = document.getElementById('emkg_temp').value;

        // 1. EINATMEN
        let st_ein = 1;
        if (gruppe_ein === "E") {
            st_ein = 3;
        } else if (gruppe_ein === "D") {
            if (menge === "gross" || frei === "hoch") { st_ein = 3; } else { st_ein = 2; }
        } else if (gruppe_ein === "C") {
            if (menge === "gross" && frei === "hoch") { st_ein = 3; } 
            else if (menge === "klein" && frei === "niedrig") { st_ein = 1; }
            else { st_ein = 2; }
        } else if (gruppe_ein === "B") {
            if (menge === "gross" && frei === "hoch") { st_ein = 2; } else { st_ein = 1; }
        }
        if (luft && st_ein < 3) {
            st_ein += 1; 
        }

        // 2. HAUT
        let st_haut = 1;
        if (haut_aus === "ja") {
            st_haut = 0;
        } else {
            if (gruppe_haut === "C" || gruppe_haut === "D" || gruppe_haut === "E") {
                if (dauer === "lang" || flaeche === "gross") { st_haut = 3; } else { st_haut = 2; }
            } else if (gruppe_haut === "B") {
                if (dauer === "lang" && flaeche === "gross") { st_haut = 2; } else { st_haut = 1; }
            }
            if (feucht && st_haut < 3) {
                st_haut += 1; 
            }
        }

        // 3. BRAND
        let st_brand = 0;
        if (gruppe_brand !== "None") {
            if (gruppe_brand === "BC") {
                st_brand = 3; 
            } else if (gruppe_brand === "BB") {
                if (brand_menge === "gross" || temp === "heiss") { st_brand = 3; } else { st_brand = 2; }
            } else {
                if (brand_menge === "gross") { st_brand = 2; } else { st_brand = 1; }
            }
        }

        let t_ein = "";
        if (st_ein === 1) t_ein = "Reihe 100";
        else if (st_ein === 2) t_ein = "Reihe 200";
        else t_ein = "Reihe 300";

        let t_haut = "";
        if (st_haut === 0) t_haut = "Kein Kontakt";
        else if (st_haut === 1) t_haut = "Reihe 100";
        else if (st_haut === 2) t_haut = "Reihe 200";
        else t_haut = "Reihe 300";

        let t_brand = "";
        if (st_brand === 0) t_brand = "N/A";
        else if (st_brand === 1) t_brand = "Reihe 100 (Lager)";
        else if (st_brand === 2) t_brand = "Reihe 200";
        else t_brand = "Reihe 300 (Ex-Schutz)";

        inventoryList.push({ 
            name: name, 
            bereich: bereich, 
            hs: hs_array.join(', '), 
            agw: agw, 
            st_ein: st_ein, 
            st_haut: st_haut, 
            st_brand: st_brand, 
            t_ein: t_ein, 
            t_haut: t_haut, 
            t_brand: t_brand, 
            media: tempMediaData['preview_emkg'] 
        });
        
        document.getElementById('emkg_name').value = ""; 
        document.getElementById('emkg_agw').value = ""; 
        document.getElementById('emkg_luft').checked = false; 
        document.getElementById('emkg_feucht').checked = false;
        
        const all_cbs = document.querySelectorAll('.hs-cb');
        for (let i = 0; i < all_cbs.length; i++) {
            all_cbs[i].checked = false;
        }
        
        const all_details = document.querySelectorAll('details.group-acc');
        for (let i = 0; i < all_details.length; i++) {
            all_details[i].removeAttribute('open');
        }
        
        document.getElementById('emkg_media').value = ""; 
        document.getElementById('preview_emkg').style.display = "none"; 
        tempMediaData['preview_emkg'] = null;
        
        renderInventory();
    }
    
    function renderInventory() {
        let h = "";
        for (let i = 0; i < inventoryList.length; i++) {
            const x = inventoryList[i];
            
            let c_e = 'var(--color-green)';
            if (x.st_ein === 3) c_e = 'var(--color-red)';
            else if (x.st_ein === 2) c_e = 'var(--color-yellow)';
            
            let c_h = 'var(--color-green)';
            if (x.st_haut === 3) c_h = 'var(--color-red)';
            else if (x.st_haut === 2) c_h = 'var(--color-yellow)';
            
            let c_b = 'var(--text-muted)';
            if (x.st_brand === 3) c_b = 'var(--color-red)';
            else if (x.st_brand === 2) c_b = 'var(--color-yellow)';
            else if (x.st_brand === 1) c_b = 'var(--color-green)';
            
            h += '<div class="emkg-list-item">';
            h += '<strong style="font-size:14px; display:block;">' + x.name + ' <span style="font-weight:normal; font-size:12px; color:var(--text-muted);">(' + (x.bereich || '-') + ')</span></strong>';
            h += '<div style="font-size:11px; color:var(--text-muted); margin-bottom:8px;">H-Sätze: ' + (x.hs || '-') + '</div>';
            h += '<div style="display:flex; justify-content:space-between; margin-bottom:2px;"><span>Einatmen:</span> <strong style="color:' + c_e + '">Stufe ' + x.st_ein + ' - ' + x.t_ein + '</strong></div>';
            h += '<div style="display:flex; justify-content:space-between; margin-bottom:2px;"><span>Haut:</span> <strong style="color:' + c_h + '">Stufe ' + x.st_haut + ' - ' + x.t_haut + '</strong></div>';
            
            let brand_text = "-";
            if (x.st_brand > 0) {
                brand_text = "Stufe " + x.st_brand;
            }
            h += '<div style="display:flex; justify-content:space-between;"><span>Brand:</span> <strong style="color:' + c_b + '">' + brand_text + ' ' + x.t_brand + '</strong></div>';
            
            if (x.media) {
                h += '<img src="' + x.media.data + '" style="width:100%; border-radius:4px; margin-top:8px;">';
            }
            h += '</div>';
        }
        document.getElementById('inventory-list').innerHTML = h;
    }

    // --- VIEW 5: PRÜFKATASTER (OPT-IN LOGIK) ---
    const pruefKategorien = {
        "elektro": { title: "🔌 Elektro, Gebäude & Haustechnik", items: [
            { id: "p_el_ortsver", name: "Ortsveränderliche E-Geräte (DGUV V3)" }, { id: "p_el_ortsfest", name: "Ortsfeste E-Anlagen (DGUV V3)" }, { id: "p_el_schweiss", name: "Schweißgeräte" }, { id: "p_el_aufzug", name: "Aufzugsanlagen (ZÜS-Prüfung)" }, { id: "p_el_blitz", name: "Blitzschutzanlagen" }, { id: "p_el_rlt", name: "Lüftungs- & Absauganlagen (RLT)" }
        ] },
        "mechanik": { title: "⚙️ Arbeitsmittel & Logistik", items: [
            { id: "p_mech_leiter", name: "Leitern & Tritte" }, { id: "p_mech_stapler", name: "Flurförderzeuge (Stapler, Ameisen)" }, { id: "p_mech_kran", name: "Krane & Hebezeuge" }, { id: "p_mech_anschlag", name: "Anschlagmittel (Ketten, Gurte)" }, { id: "p_mech_tor", name: "Kraftbetätigte Türen & Rolltore" }, { id: "p_mech_regal", name: "Regalanlagen" }
        ] },
        "brandschutz": { title: "🔥 Brandschutz & Notfall", items: [
            { id: "p_brand_loescher", name: "Feuerlöscher" }, { id: "p_brand_bma", name: "Brandmeldeanlagen (BMA)" }, { id: "p_brand_rwa", name: "RWA-Fenster / Anlagen" }, { id: "p_brand_tuer", name: "Brandschutztüren / Feststellanlagen" }, { id: "p_brand_notlicht", name: "Not- und Sicherheitsbeleuchtung" }, { id: "p_brand_gefschrank", name: "Gefahrstoffschränke" }
        ] },
        "sonstiges": { title: "🚙 Fuhrpark, Druck & Spezial", items: [
            { id: "p_sonst_kfz", name: "Dienstfahrzeuge (UVV)" }, { id: "p_sonst_druck", name: "Druckluft- & Druckbehälter" }, { id: "p_sonst_psaga", name: "PSAgA (Absturzsicherung)" }, { id: "p_sonst_wasser", name: "Trinkwasserspender (Hygiene)" }
        ] }
    };
    
    let pruefState = {}; 

    function initPruefKataster() {
        let html = "";
        for (const cat in pruefKategorien) {
            if (pruefKategorien.hasOwnProperty(cat)) {
                html += '<details class="group-acc"><summary>' + pruefKategorien[cat].title + '</summary><div class="pruef-list">';
                
                for (let i = 0; i < pruefKategorien[cat].items.length; i++) {
                    const item = pruefKategorien[cat].items[i];
                    pruefState[item.id] = { exists: false, status: 'intern', date: '', erledigt: false, name: item.name };
                    
                    html += '<div class="pruef-item" id="pitem_' + item.id + '">';
                    html += '<div class="p-header">';
                    html += '<label class="p-title" style="margin:0; text-transform:none;"><input type="checkbox" id="p_exists_' + item.id + '" onchange="togglePruefVorhanden(\'' + item.id + '\')"> ' + item.name + '</label>';
                    html += '<span class="p-light" id="plight_' + item.id + '"></span>';
                    html += '</div>';
                    html += '<div class="p-controls" id="p_ctrl_' + item.id + '" style="display:none;">';
                    html += '<select id="psel_' + item.id + '" onchange="updatePruefStatus(\'' + item.id + '\')" style="margin-top:0; padding:6px; font-size:12px;">';
                    html += '<option value="intern">Geprüft (Intern)</option>';
                    html += '<option value="extern">Geprüft (Extern)</option>';
                    html += '<option value="mangel">Prüfung fehlt / abgelaufen</option>';
                    html += '</select>';
                    html += '<div class="p-date-box" id="pdatebox_' + item.id + '">';
                    html += '<label style="margin-top:0;">Frist bis zur Prüfung:</label>';
                    html += '<input type="date" id="pdate_' + item.id + '" onchange="updatePruefDate(\'' + item.id + '\')" style="margin-top:4px; padding:6px; font-size:12px;">';
                    html += '</div>';
                    html += '<label style="display:flex; align-items:center; gap:6px; margin-top:6px; text-transform:none; font-weight:500;"><input type="checkbox" id="pcheck_' + item.id + '" onchange="togglePruefErledigt(\'' + item.id + '\')"> Mangel abgestellt (Erledigt)</label>';
                    html += '</div>';
                    html += '</div>';
                }
                html += '</div></details>';
            }
        }
        document.getElementById('pruef-container').innerHTML = html;
    }

    function togglePruefVorhanden(id) {
        const isExists = document.getElementById('p_exists_' + id).checked;
        const ctrl = document.getElementById('p_ctrl_' + id);
        const item = document.getElementById('pitem_' + id);
        
        pruefState[id].exists = isExists;
        
        if (isExists) {
            ctrl.style.display = "grid"; 
            item.classList.add('active-item');
            updatePruefStatus(id);
        } else {
            ctrl.style.display = "none"; 
            item.classList.remove('active-item');
            document.getElementById('plight_' + id).className = "p-light";
        }
    }

    function updatePruefStatus(id) {
        if (!pruefState[id].exists) return;
        
        const val = document.getElementById('psel_' + id).value;
        const light = document.getElementById('plight_' + id);
        const dateBox = document.getElementById('pdatebox_' + id);
        
        pruefState[id].status = val;
        dateBox.classList.remove('active'); 
        light.className = "p-light";
        
        if (val === 'intern' || val === 'extern') {
            light.classList.add('green');
        } else if (val === 'mangel') { 
            light.classList.add('red'); 
            dateBox.classList.add('active'); 
        }
    }
    
    function updatePruefDate(id) { 
        pruefState[id].date = document.getElementById('pdate_' + id).value; 
    }
    
    function togglePruefErledigt(id) {
        const isChecked = document.getElementById('pcheck_' + id).checked;
        pruefState[id].erledigt = isChecked;
        
        const container = document.getElementById('pitem_' + id);
        if (isChecked) {
            container.classList.add('erledigt'); 
        } else {
            container.classList.remove('erledigt');
        }
    }

    // --- VIEW 6: IT BERATUNG ---
    function calcIT() {
        const h = document.getElementById('it_haftung').value; 
        const n = document.getElementById('it_netz').value; 
        const f = document.getElementById('it_flex').value;
        const d_modell = document.getElementById('it_dienstleister').value;
        const bg = document.getElementById('v1_bg').value;
        
        const emp = parseInt(document.getElementById('v1_emp').value) || 0;
        
        let r = "";
        let d = "";
        
        if (d_modell === "extern") {
            r = "Portal des Arbeitsschutzdienstleisters (z. B. Streit, BAD, TÜV)";
            d = "Sorglos-Paket durch den externen Dienstleister. <br><strong>Vorteil:</strong> Alles aus einer Hand, Betreuung und Software greifen ineinander. <br><strong>Nachteil:</strong> Ein weiteres Inselsystem und starke Bindung (Lock-in-Effekt).";
            
            if (emp > 250) {
                d += "<br><br><span style='color:var(--color-yellow); font-weight:bold;'><i class='fa-solid fa-triangle-exclamation'></i> Consulting-Tipp:</span> Bei <b>" + emp + " Mitarbeitern</b> raten wir dringend, parallel eine Inhouse-Kompetenz aufzubauen, da die völlige Abhängigkeit von einem Dienstleisterportal sonst ein hohes wirtschaftliches Risiko bergt.";
            }
        }
        else if (h === "extern" && n === "stand") { 
            r = "BG-Portal / Branchenlösung"; 
            d = "Sorglos-Paket ohne interne IT-Anbindung. Haftung ausgelagert und kostenfrei über den Träger abgedeckt. <br><br>";
            
            if (bg === 'vbg') d += "Empfehlung für Ihren Betrieb: <strong>GEDOKU</strong> oder das <strong>KPZ-Portal</strong> der VBG.";
            else if (bg === 'bgbau') d += "Empfehlung für Ihren Betrieb: <strong>DigitGB</strong> der BG BAU.";
            else if (bg === 'bgetem') d += "Empfehlung für Ihren Betrieb: <strong>Praxisgerechte Lösungen 5.0</strong> der BG ETEM.";
            else if (bg === 'bghm') d += "Empfehlung für Ihren Betrieb: <strong>Arbeitsschutz Kompakt</strong> der BGHM.";
            else if (bg === 'bgrci') d += "Empfehlung für Ihren Betrieb: Branchenportale / <strong>GISCHEM</strong> der BG RCI.";
            else if (bg === 'bghw') d += "Empfehlung für Ihren Betrieb: <strong>KomNetz / Arbeitsschutz-Portal</strong> der BGHW.";
            else d += "Prüfen Sie die spezifischen Web-Angebote Ihrer zuständigen Berufsgenossenschaft.";
            
            if (emp > 100) {
                d += "<br><br><span style='color:var(--color-yellow); font-weight:bold;'><i class='fa-solid fa-triangle-exclamation'></i> Consulting-Tipp:</span> Bei <b>" + emp + " Mitarbeitern</b> stoßen diese kostenlosen Portale oft an ihre Grenzen (z.B. bei komplexen Organigrammen und fehlenden HR-Schnittstellen). Eine SaaS-Lösung könnte bald nötig werden.";
            }
        }
        else if (n === "erp") { 
            r = "Große EHS-Suiten & ERP-Integration"; 
            d = "Tiefe Vernetzung und Prozessintegration. Perfekt für Unternehmen, die keine Insellösungen mehr wollen. "; 
            
            if (emp < 500) {
                d += "<br><br><span style='color:var(--color-red); font-weight:bold;'><i class='fa-solid fa-ban'></i> Achtung:</span> Für <b>" + emp + " Mitarbeiter</b> sind Systeme wie <strong>SAP EHS</strong> in der Regel massiv überdimensioniert (Implementierungskosten fressen den Nutzen). ";
                d += "Wenn Qualitätsmanagement im Fokus steht, prüfen Sie maximal <strong>ConSense</strong> (Fokus: ISO/Dokumentenlenkung).";
            } else {
                d += "<br><br><strong>Empfehlung für " + emp + " Mitarbeiter:</strong><br>";
                d += "• <strong>SAP EHS:</strong> Der 'schwere Panzer'. Ideal bei bestehendem SAP S/4HANA (nahtlose HR/Produktions-Anbindung).<br>";
                d += "• <strong>iManSys:</strong> Der 'Compliance-Wächter'. Extrem stark, wenn EHS tief mit Personalwesen, Vorsorge-Matrix und Kompetenzen verknüpft werden soll.<br>";
                d += "• <strong>ConSense:</strong> Der 'Struktur-Profi'. Nehmen Sie dies, wenn EHS primär als Teil eines bestehenden ISO 9001 Qualitätsmanagements geführt werden soll.";
            }
        }
        else if (h === "extern" && n === "cloud") {
            r = "Spezialisierte EHS-Software (SaaS)";
            d = "Professionelle Cloud-Lösungen. Bieten deutlich mehr Module als BG-Portale, aber ohne die enorme Schwere eines ERP-Systems.<br><br>";
            
            if (emp < 50) {
                d += "<span style='color:var(--color-red); font-weight:bold;'><i class='fa-solid fa-ban'></i> Achtung:</span> Für <b>" + emp + " Mitarbeiter</b> sind diese Profilösungen oft zu kostspielig im Vergleich zum Nutzen. Ein kostenloses BG-Portal ist hier meist wirtschaftlicher.";
            } else if (emp >= 50 && emp <= 1000) {
                d += "<strong>Die besten Optionen für Ihren Mittelstand (" + emp + " MA):</strong><br>";
                d += "• <strong>Secova (sam*):</strong> Der 'User's Darling'. Wählen Sie dies, wenn Akzeptanz das größte Problem ist. Die Bedienung im Kiosk-Modus ist unschlagbar einfach ('Mitmach-Arbeitsschutz').<br>";
                d += "• <strong>Quentic:</strong> Der 'Allrounder'. Wählen Sie dies, wenn Sie eine mächtige, rechtssichere Lösung suchen, die auch Umweltmanagement und ESG perfekt abdeckt.";
            } else {
                d += "<strong>Die besten Optionen für " + emp + " Mitarbeiter:</strong><br>";
                d += "• <strong>Quentic (Enterprise):</strong> Sehr performant bei vielen weltweiten Standorten und hohem Reporting-Bedarf.<br>";
                d += "• <strong>iManSys:</strong> Bietet bei dieser Größe exzellente Tiefe in der arbeitsmedizinischen Vorsorge und Rechteverwaltung.";
            }
        }
        else if (h === "eigen" || f === "flex") { 
            r = "Microsoft 365 / Google Workspace"; 
            d = "Höchste Flexibilität. Eigene Spalten = 0€. IT-Audit-Logs sichern Revisionssicherheit. <br><br><span style='color:var(--primary); font-weight:bold;'><i class='fa-solid fa-lightbulb'></i> Consulting-Tipp:</span> Gerade für Firmen mit starker IT-Affinität lassen sich hier mit <strong>PowerApps</strong> oder <strong>AppSheet</strong> extrem schlanke, exakt auf den Betrieb (" + emp + " MA) zugeschnittene Tools bauen."; 
        }
        else { 
            r = "Hybride Cloud-Lösung"; 
            d = "Vorhandene Bordmittel nutzen, punktuell eine kleine spezialisierte EHS-App anflanschen."; 
        }
        
        const box = document.getElementById('it_result_box'); 
        box.style.display = "block";
        box.innerHTML = '<div class="consulting-winner"><h3 style="margin-top:0; color:#065f46;">🏆 Empfehlung: ' + r + '</h3><p style="font-size:13px; line-height:1.5; margin:5px 0 0 0;">' + d + '</p></div>';
    }

    // --- VIEW 12: ZWIEBELSCHALEN-AUDIT (DYNAMISCH) ---
    const auditCatalogs = {
        "behoerde": [
            { cat: "Bauliche Maßnahmen (Behörde)", icon: "🧱", items: [
                { id: "beh_b1", t: "Zugangskontrolle / Anmeldung im Eingangsbereich vorhanden", c: false, d: "" },
                { id: "beh_b2", t: "Fluchtwege im Büro freigehalten (keine blockierten Türen)", c: false, d: "" },
                { id: "beh_b3", t: "Schreibtische so platziert, dass Fluchtweg zum Ausgang gesichert ist", c: false, d: "" },
                { id: "beh_b4", t: "Büroausstattung enthält keine griffbereiten, potenziellen Waffen (z.B. schwere Locher, Scheren)", c: false, d: "" },
                { id: "beh_b5", t: "Alarmierungssystem (z.B. versteckter Panik-Taster) am Arbeitsplatz installiert", c: false, d: "" }
            ]},
            { cat: "Organisatorische Maßnahmen", icon: "📋", items: [
                { id: "beh_o1", t: "Hausordnung sichtbar ausgehängt und wird durchgesetzt", c: false, d: "" },
                { id: "beh_o2", t: "Besucher mit Eskalationspotenzial werden nur nach Termin und zu zweit (Vier-Augen-Prinzip) empfangen", c: false, d: "" },
                { id: "beh_o3", t: "Notfallkette (Wer ruft Polizei/Sicherheitsdienst?) ist allen Mitarbeitern bekannt", c: false, d: "" },
                { id: "beh_o4", t: "Regelmäßige Dokumentation von Vorfällen und Beinahe-Eskalationen", c: false, d: "" }
            ]},
            { cat: "Personelle Maßnahmen", icon: "👤", items: [
                { id: "beh_p1", t: "Mitarbeiter sind in Deeskalation und Gesprächsführung geschult", c: false, d: "" },
                { id: "beh_p2", t: "Verhaltensregeln bei Waffenandrohung sind bekannt (Ruhe bewahren, Distanz, Alarmierung)", c: false, d: "" },
                { id: "beh_p3", t: "Kollegiales Notfallwort/-zeichen (z.B. 'Bitte Bring die Akte Meyer') ist vereinbart", c: false, d: "" }
            ]}
        ],
        "hotel": [
            { cat: "Bauliche Maßnahmen (Hotel)", icon: "🏨", items: [
                { id: "hot_b1", t: "Rezeptionstheke bietet physischen Schutz (Breite/Höhe) vor Übergriffen", c: false, d: "" },
                { id: "hot_b2", t: "Nachtschalter (mit Panzerglas/Durchreiche) für Spätschichten vorhanden", c: false, d: "" },
                { id: "hot_b3", t: "Ausreichende Beleuchtung in Fluren, Tiefgaragen und Außenzugängen", c: false, d: "" },
                { id: "hot_b4", t: "Zutrittskontrollsysteme (Schlüsselkarten) funktionieren reibungslos für Etagen/Zimmer", c: false, d: "" },
                { id: "hot_b5", t: "Sicherheitskameras in öffentlichen Bereichen (Lobby, Eingänge) sichtbar installiert", c: false, d: "" }
            ]},
            { cat: "Organisatorische Maßnahmen", icon: "📋", items: [
                { id: "hot_o1", t: "Eindeutige Richtlinien für den Umgang mit angetrunkenen oder aggressiven Gästen", c: false, d: "" },
                { id: "hot_o2", t: "Bargeldbestände an der Rezeption werden regelmäßig abgeschöpft (Tresor/Einwurf)", c: false, d: "" },
                { id: "hot_o3", t: "Notfallnummern (Polizei, örtlicher Sicherheitsdienst) hängen griffbereit aus", c: false, d: "" },
                { id: "hot_o4", t: "Hausverbot-Verfahren ist definiert und kann vom Nachtportier durchgesetzt werden", c: false, d: "" }
            ]},
            { cat: "Personelle Maßnahmen", icon: "👤", items: [
                { id: "hot_p1", t: "Personal (insb. Nachtschicht) ist auf das Verhalten bei Überfällen geschult (keine Gegenwehr!)", c: false, d: "" },
                { id: "hot_p2", t: "Zimmermädchen/Reinigungspersonal führen mobile Alarm-Sender bei sich", c: false, d: "" },
                { id: "hot_p3", t: "Schulung in interkultureller Kompetenz zur Vermeidung von Missverständnissen", c: false, d: "" }
            ]}
        ],
        "handel": [
            { cat: "Bauliche Maßnahmen (Einzelhandel)", icon: "🏬", items: [
                { id: "han_b1", t: "Kassenbereich bietet Fluchtmöglichkeit für das Personal (nicht eingekesselt)", c: false, d: "" },
                { id: "han_b2", t: "Sichtachsen im Laden sind frei (keine toten Winkel durch zu hohe Regale)", c: false, d: "" },
                { id: "han_b3", t: "Gut sichtbare Videoüberwachung (inklusive Hinweisschilder)", c: false, d: "" },
                { id: "han_b4", t: "Ausreichende Beleuchtung, besonders im Eingangsbereich und am Hintereingang", c: false, d: "" },
                { id: "han_b5", t: "Sichere Aufbewahrung für Wertgegenstände des Personals (Spinde)", c: false, d: "" }
            ]},
            { cat: "Organisatorische Maßnahmen", icon: "📋", items: [
                { id: "han_o1", t: "Klare SOP für den Umgang mit Ladendieben (Wann ansprechen? Wann Polizei?)", c: false, d: "" },
                { id: "han_o2", t: "Bargeld-Management (Abschöpfung, Tresor) minimiert den Anreiz für Überfälle", c: false, d: "" },
                { id: "han_o3", t: "Regelungen für sicheres Schließen bei Feierabend (Müllentsorgung, Personal-Ausgang)", c: false, d: "" },
                { id: "han_o4", t: "Zusammenarbeit mit Security (Ladendetektiv) in Risikolagen geregelt", c: false, d: "" }
            ]},
            { cat: "Personelle Maßnahmen", icon: "👤", items: [
                { id: "han_p1", t: "Verhalten bei Raubüberfall trainiert ('Geld rausgeben, Tätermerkmale merken')", c: false, d: "" },
                { id: "han_p2", t: "Deeskalationsschulung für den Umgang mit wütenden Kunden (Reklamationen)", c: false, d: "" },
                { id: "han_p3", t: "Mitarbeiter kennen das interne Alarmierungssystem (z.B. versteckte Kassen-Codes)", c: false, d: "" }
            ]}
        ],
        "baeder": [
            { cat: "Bauliche Maßnahmen (Bäderbetriebe)", icon: "🏊", items: [
                { id: "bad_b1", t: "Kassen-Bereich durch physische Barrieren geschützt", c: false, d: "" },
                { id: "bad_b2", t: "Sichtachsen in der Schwimmhalle / Sauna für Aufsichtspersonal frei", c: false, d: "" },
                { id: "bad_b3", t: "Sanitäter-Raum / Rückzugsort für Personal abschließbar", c: false, d: "" },
                { id: "bad_b4", t: "Zugangskontrolle (Drehkreuze) reguliert den Einlass sicher", c: false, d: "" },
                { id: "bad_b5", t: "Videoüberwachung in zulässigen Bereichen (Eingang, Gänge) aktiv", c: false, d: "" }
            ]},
            { cat: "Organisatorische Maßnahmen", icon: "📋", items: [
                { id: "bad_o1", t: "Haus- und Badeordnung hängt sichtbar für alle Gäste aus", c: false, d: "" },
                { id: "bad_o2", t: "Konsequentes Vorgehen bei Regelverstößen (Hausverbot-Dokumentation)", c: false, d: "" },
                { id: "bad_o3", t: "Funkgeräte-Einsatz für schnelle Kommunikation zwischen den Bademeistern geregelt", c: false, d: "" },
                { id: "bad_o4", t: "Security-Konzept für Stoßzeiten (Wochenende/Sommer) oder bei bekannten Problemen", c: false, d: "" }
            ]},
            { cat: "Personelle Maßnahmen", icon: "👤", items: [
                { id: "bad_p1", t: "Deeskalationstraining für Bademeister und Kassenpersonal absolviert", c: false, d: "" },
                { id: "bad_p2", t: "Umgang mit Konflikten durch Jugendgruppen / Cliquen geschult", c: false, d: "" },
                { id: "bad_p3", t: "Meldekultur für sexuelle Belästigung oder gewalttätige Übergriffe etabliert", c: false, d: "" }
            ]}
        ],
        "bahn": [
            { cat: "Bauliche Maßnahmen (Bahn/ÖPNV)", icon: "🚆", items: [
                { id: "bahn_b1", t: "Videoüberwachung in den Zugabteilen/Waggons ist vorhanden und gekennzeichnet", c: false, d: "" },
                { id: "bahn_b2", t: "Notrufsprechstellen / Gegensprechanlagen zum Triebfahrzeugführer funktionieren", c: false, d: "" },
                { id: "bahn_b3", t: "Rückzugsmöglichkeiten für das Zugpersonal (abschließbare Dienstabteile) existieren", c: false, d: "" }
            ]},
            { cat: "Organisatorische Maßnahmen", icon: "📋", items: [
                { id: "bahn_o1", t: "Doppelstreifen-Prinzip bei bekannten Problemstrecken oder Spätschichten", c: false, d: "" },
                { id: "bahn_o2", t: "Klare Meldekette bei Eskalationen (Vorab-Info an Sicherheitsdienst am nächsten Bahnhof)", c: false, d: "" },
                { id: "bahn_o3", t: "Verfahren zur Unfallmeldung bei der BG (auch bei psychischen Traumata) ist bekannt", c: false, d: "" }
            ]},
            { cat: "Personelle Maßnahmen", icon: "👤", items: [
                { id: "bahn_p1", t: "Personal ist in Eigenschutz und Deeskalation geschult ('Schutzhaltung', 'Abstand')", c: false, d: "" },
                { id: "bahn_p2", t: "Taktisches Vorgehen im Team ('L-Taktik', 'Mühle-Prinzip', Separierung) wird beherrscht", c: false, d: "" },
                { id: "bahn_p3", t: "Personal ist geschult, bei Bedarf gezielt Fahrgäste als 'Verbündete' anzusprechen", c: false, d: "" },
                { id: "bahn_p4", t: "Mentale Impulskontrolle (Atemkontrolle) bei bewussten Provokationen ('Sonst was?') trainiert", c: false, d: "" }
            ]}
        ],
        "dienstleistung": [
            { cat: "Bauliche Maßnahmen (Körpernah)", icon: "💇", items: [
                { id: "d_b1", t: "Behandlungsräume/Kabinen haben Fluchtmöglichkeit für das Personal", c: false, d: "" },
                { id: "d_b2", t: "Scharfe Werkzeuge (Scheren, Skalpelle) werden sicher abgelegt/verstaut", c: false, d: "" },
                { id: "d_b3", t: "Eingangstür ist bei Solo-Arbeit (z.B. am Abend) verschließbar / per Kamera einsehbar", c: false, d: "" },
                { id: "d_b4", t: "Büro/Kassenbereich von Behandlungsplätzen abgegrenzt", c: false, d: "" }
            ]},
            { cat: "Organisatorische Maßnahmen", icon: "📋", items: [
                { id: "d_o1", t: "Termin-Vergabe als Filter (Kein 'Laufkundschaft'-Risiko bei sensiblen Behandlungen)", c: false, d: "" },
                { id: "d_o2", t: "Alleinarbeitsplatz-Konzept etabliert (z.B. Totmannschalter, Kontrollanrufe)", c: false, d: "" },
                { id: "d_o3", t: "Klare Definition von 'No-Gos' (z.B. sexuelle Anzüglichkeiten) und Abbruch der Behandlung", c: false, d: "" }
            ]},
            { cat: "Personelle Maßnahmen", icon: "👤", items: [
                { id: "d_p1", t: "Personal ist im Setzen professioneller Distanz (trotz körperlicher Nähe) geschult", c: false, d: "" },
                { id: "d_p2", t: "Verhaltenstraining zur Deeskalation unzufriedener Kunden (z.B. Friseur-Ergebnis)", c: false, d: "" },
                { id: "d_p3", t: "Mitarbeiter kennen das Recht, Behandlungen bei Belästigung sofort abzubrechen", c: false, d: "" }
            ]}
        ],
        "rettung": [
            { cat: "Bauliche & Technische Maßnahmen (BOS)", icon: "🚒", items: [
                { id: "ret_b1", t: "Sicherheitsabstände bei Airbags (30/60/90 cm) sind durch technische Hilfsmittel einhaltbar", c: false, d: "" },
                { id: "ret_b2", t: "Fahrzeuge führen Absperrmaterial für GAMS-Regel mit (min. 50m / 300m bei Gefahrgut)", c: false, d: "" },
                { id: "ret_b3", t: "Medizinisches Equipment nach cABCDE-Schema (inkl. Tourniquets für Critical Bleeding) vorhanden", c: false, d: "" },
                { id: "ret_b4", t: "Atemschutzüberwachung (ASÜ) und Warngeräte sind geprüft und einsatzbereit", c: false, d: "" }
            ]},
            { cat: "Organisatorische Maßnahmen", icon: "📋", items: [
                { id: "ret_o1", t: "Deeskalations-Standard nach dem DGUV Aachener Modell (Stufen 0-3) ist definiert", c: false, d: "" },
                { id: "ret_o2", t: "AUTO-Regel bei Verkehrsunfällen (Auslaufende Stoffe, Unterbauen, Trommel/Türen, Objektmanagement) ist SOP", c: false, d: "" },
                { id: "ret_o3", t: "Fristen (G26.3 Atemschutztauglichkeit, Belastungsübungen, EH) werden überwacht", c: false, d: "" },
                { id: "ret_o4", t: "Klare Rückzugsregelung unter Atemschutz (Druckabfrage alle 10 Min, Rückzug bei 2/3) etabliert", c: false, d: "" }
            ]},
            { cat: "Personelle Maßnahmen", icon: "👤", items: [
                { id: "ret_p1", t: "Grundsatz 'Eigenschutz vor Fremdschutz' wird konsequent gelebt (Keine Diskussion bei Waffen!)", c: false, d: "" },
                { id: "ret_p2", t: "Taktik bei Gaffer-Szenarien trainiert (Aktive Störung unterbinden, Sichtfeld blockieren)", c: false, d: "" },
                { id: "ret_p3", t: "Sicherung im Team: Überzahl-Prinzip ('3er-Regel') bei Eskalationen auf Festen / Einsätzen verinnerlicht", c: false, d: "" }
            ]}
        ],
        "allgemein": [
            { cat: "Bauliche Maßnahmen (Allgemein)", icon: "🏢", items: [
                { id: "alg_b1", t: "Außenbeleuchtung und Zugangswege ausreichend gesichert", c: false, d: "" },
                { id: "alg_b2", t: "Besucherlenkung (Empfang/Anmeldung) verhindert unkontrolliertes Umherlaufen", c: false, d: "" },
                { id: "alg_b3", t: "Flucht- und Rettungswege aus Büros sind frei", c: false, d: "" }
            ]},
            { cat: "Organisatorische Maßnahmen", icon: "📋", items: [
                { id: "alg_o1", t: "Zutrittsregelungen für Externe klar definiert", c: false, d: "" },
                { id: "alg_o2", t: "Umgang mit aggressiven Anrufen / E-Mails geregelt", c: false, d: "" },
                { id: "alg_o3", t: "Notfallkette bei Bedrohungen bekannt", c: false, d: "" }
            ]},
            { cat: "Personelle Maßnahmen", icon: "👤", items: [
                { id: "alg_p1", t: "Mitarbeiter sind auf Konfliktsituationen sensibilisiert", c: false, d: "" },
                { id: "alg_p2", t: "Kollegiale Hilfe (Notfall-Wörter) vereinbart", c: false, d: "" }
            ]}
        ]
    };

    let activeAuditData = [];

    function initAudit() {
        const branch = document.getElementById('auditBranchSelect').value;
        const storageKey = 'prapp_sifa_audit_' + branch;
        
        let loadedData = getStore(storageKey, null);
        
        if (!loadedData) {
            loadedData = JSON.parse(JSON.stringify(auditCatalogs[branch]));
            setStore(storageKey, loadedData);
        }
        
        activeAuditData = loadedData;
        renderAudit();
        
        const alertTitle = document.getElementById('auditAlertTitle');
        const alertText = document.getElementById('auditAlertText');
        
        if(branch === 'behoerde') {
            alertTitle.innerText = "Behörden-Konzept:";
            alertText.innerText = "Fokus auf Zugangskontrollen, sichere Bestuhlung und Schutz vor übergriffigen Klienten.";
        } else if (branch === 'hotel') {
            alertTitle.innerText = "Hotel-Konzept:";
            alertText.innerText = "Fokus auf Rezeptionssicherheit, Nachtschichten und den Umgang mit aggressiven/alkoholisierten Gästen.";
        } else if (branch === 'handel') {
            alertTitle.innerText = "Handels-Konzept:";
            alertText.innerText = "Fokus auf Raubüberfall-Prävention, Kassen-Sicherheit und den Umgang mit Ladendieben.";
        } else if (branch === 'baeder') {
            alertTitle.innerText = "Bäder-Konzept:";
            alertText.innerText = "Fokus auf Hausrecht, Kameraüberwachung und Deeskalation bei Regelverstößen in Schwimmbad und Sauna.";
        } else if (branch === 'bahn') {
            alertTitle.innerText = "Bahn- & Verkehrsbetriebe:";
            alertText.innerText = "Fokus auf Deeskalation im Zugabteil, Eigensicherung, L-Taktik und Einbindung von Fahrgästen.";
        } else if (branch === 'dienstleistung') {
            alertTitle.innerText = "Körpernahe DL:";
            alertText.innerText = "Fokus auf professionelle Distanz bei intimen Behandlungen, Alleinarbeitsplätze und Fluchtwege aus Kabinen.";
        } else if (branch === 'rettung') {
            alertTitle.innerText = "Rettungskräfte (BOS):";
            alertText.innerText = "Fokus auf Einsatztaktik (GAMS, AUTO), Atemschutzüberwachung und Deeskalation nach dem DGUV Aachener Modell.";
        } else {
            alertTitle.innerText = "Basis-Schutzkonzept:";
            alertText.innerText = "Prüfen Sie das allgemeine Zwiebelschalenprinzip der Betriebsstätte.";
        }
    }

    function toggleAuditItem(catIdx, itemIdx) {
        const branch = document.getElementById('auditBranchSelect').value;
        const storageKey = 'prapp_sifa_audit_' + branch;
        
        let item = activeAuditData[catIdx].items[itemIdx];
        item.c = !item.c;
        item.d = item.c ? 'Geprüft: ' + new Date().toLocaleDateString('de-DE') : '';
        
        setStore(storageKey, activeAuditData);
        renderAudit();
    }

    function renderAudit() {
        let html = "";
        for (let cIdx = 0; cIdx < activeAuditData.length; cIdx++) {
            const category = activeAuditData[cIdx];
            html += '<details class="tactical-details" style="border-left-color:#8e44ad; background:#f8fafc;" open><summary style="color:#8e44ad;">' + category.icon + ' ' + category.cat + '</summary>';
            
            for (let iIdx = 0; iIdx < category.items.length; iIdx++) {
                const item = category.items[iIdx];
                const checkedClass = item.c ? 'checked' : '';
                const checkedIcon = item.c ? '☑️' : '⬜';
                
                html += '<div class="gear-row ' + checkedClass + '" onclick="toggleAuditItem(' + cIdx + ',' + iIdx + ')">';
                html += '<span class="item-lbl">' + checkedIcon + ' ' + item.t + '</span>';
                html += '<span class="date-badge">' + item.d + '</span>';
                html += '</div>';
            }
            html += '</details>';
        }
        document.getElementById('auditContainer').innerHTML = html;
    }

    function getStore(key, def) {
        try {
            const val = localStorage.getItem(key);
            return val ? JSON.parse(val) : def;
        } catch(e) {
            return def;
        }
    }

    function setStore(key, val) {
        try {
            localStorage.setItem(key, JSON.stringify(val));
        } catch(e) {
            console.error("Speicherfehler:", e);
        }
    }

  // --- NEU: VIEW 8: GERÄTE-AUFNAHME (LOGIK & SUCHE) ---
    const equipmentCatalog = [
        {
            category: "2. Werkstatt",
            icon: "🛠️",
            items: [
                { id: "w_1", name: "Maschinenschrauber / Akkuschrauber", checked: false, hazards: ["Mechanische Verletzung durch abrutschendes Werkzeug", "Verletzung durch wegfliegende Späne"], measures: ["Schutzbrille tragen", "Sicheres Einspannen der Werkstücke"] },
                { id: "w_2", name: "Handbohrmaschine / Schlagbohrmaschine", checked: false, hazards: ["Verletzung durch wegfliegende Späne", "Stolpergefahr am Kabel", "Elektrischer Schlag"], measures: ["Schutzbrille", "Keine Handschuhe", "Regelmäßige DGUV V3 Prüfung"] },
                { id: "w_3", name: "Manuell zu bedienendes Handwerkzeug (Säge, Hammer, Schraubenzieher, Stechbeitel etc.)", checked: false, hazards: ["Schnitt- und Stichverletzungen", "Quetschungen"], measures: ["Werkzeug auf Mängel prüfen", "Werkstück fixieren", "Geeignete Schutzhandschuhe"] },
                { id: "w_4", name: "Kabeltrommel, Verlängerungskabel", checked: false, hazards: ["Stolpergefahr", "Brandgefahr durch Überhitzung (nicht abgerollt)", "Elektrischer Schlag"], measures: ["Kabeltrommel vor Gebrauch komplett abrollen", "DGUV V3 Prüfung", "Stolperfreie Verlegung"] },
                { id: "w_5", name: "Winkelschleifer, Betonschleifmaschine ('Flex')", checked: false, hazards: ["Berstende Trennscheibe", "Funkenflug / Brandgefahr", "Lärm & Hand-Arm-Vibrationen"], measures: ["Schutzbrille und Gehörschutz zwingend", "Heißerlaubnisschein bei brandgefährdeter Umgebung", "Beidhändiges Führen"] },
                { id: "w_6", name: "Ständerbohrmaschine", checked: false, hazards: ["Erfassen von Haaren/Kleidung", "Wegfliegende Späne", "Getroffen werden von Bohrfutterschlüssel"], measures: ["Haarnetz bei langen Haaren", "Absolutes Handschuhverbot", "Schutzbrille", "Werkstück fest einspannen"] },
                { id: "w_7", name: "Kompressor", checked: false, hazards: ["Wegfliegende Teile durch Druckluft", "Lärmbelastung", "Stolpergefahr durch Schläuche"], measures: ["Personen nicht abblasen", "Schutzbrille tragen", "Gehörschutz", "Schläuche stolperfrei verlegen"] },
                { id: "w_8", name: "Hochdruckreiniger, Trockeneisreiniger (einschl. Dampfstrahlern)", checked: false, hazards: ["Verbrühen (Dampf)", "Elektrischer Schlag", "Wegfliegende Partikel"], measures: ["Schutzbrille", "Flüssigkeitsdichte Schutzkleidung", "Betrieb über FI-Schutzschalter (PRCD)"] },
                { id: "w_9", name: "Handhubwagen", checked: false, hazards: ["Überrollen der Füße / Quetschgefahr", "Ergonomische Belastung (Ziehen/Schieben)"], measures: ["Sicherheitsschuhe S1", "Auf Sichtkontakt achten", "Hubwagenskaten verboten"] },
                { id: "w_10", name: "Mitgänger-Flurförderzeug", checked: false, hazards: ["Anfahren von Personen", "Quetschgefahr an Regalen"], measures: ["Unterweisung", "Sicherheitsschuhe", "Zündschlüssel bei Nichtnutzung abziehen"] },
                { id: "w_11", name: "Gabelstapler (Gas)", checked: false, hazards: ["Quetschgefahr durch Umkippen", "Anfahren von Personen", "Explosionsgefahr Gas", "Abgase"], measures: ["Gurtpflicht", "Regelmäßige UVV-Prüfung", "Warnwestenpflicht", "Vorsorge ehem. G25"] },
                { id: "w_12", name: "Gabelstapler (Diesel)", checked: false, hazards: ["Quetschgefahr durch Umkippen", "Anfahren von Personen", "Dieselabgase"], measures: ["Gurtpflicht", "UVV-Prüfung", "Warnwestenpflicht", "Betrieb nur im Freien oder mit Partikelfilter"] },
                { id: "w_13", name: "Gabelstapler (Elektrisch)", checked: false, hazards: ["Quetschgefahr durch Umkippen", "Anfahren von Personen", "Brandgefahr beim Laden"], measures: ["Gurtpflicht", "UVV-Prüfung", "Warnwestenpflicht", "Ladebereich absichern"] },
                { id: "w_14", name: "Batterieladestation", checked: false, hazards: ["Brand- und Explosionsgefahr (Wasserstoff)", "Elektrischer Schlag"], measures: ["Belüftung sicherstellen", "Rauchverbot", "Abstand zu brennbaren Materialien"] },
                { id: "w_15", name: "Bandsäge", checked: false, hazards: ["Schnittverletzungen am Sägeband", "Lärm", "Holzstaub"], measures: ["Schiebestock verwenden", "Bandführung richtig einstellen", "Absaugung", "Keine Handschuhe"] },
                { id: "w_16", name: "Heißklebepistole", checked: false, hazards: ["Verbrennungen", "Brandgefahr"], measures: ["Hitzebeständige Unterlage", "Pistole nach Gebrauch ausstecken"] },
                { id: "w_17", name: "Elektroschweißgerät", checked: false, hazards: ["UV/IR-Strahlung (Verblitzung)", "Schweißrauche", "Brandgefahr durch Funkenflug"], measures: ["Schweißhelm mit passendem Filter", "Feuerfeste Schutzkleidung", "Absaugung nutzen", "Feuerlöscher bereitstellen"] },
                { id: "w_18", name: "Gasschweißen, Gaslöten, Trennschneiden", checked: false, hazards: ["Explosion von Gasflaschen", "Brandgefahr", "Stolpergefahr durch Schläuche"], measures: ["Gasflaschen anketten", "Armaturen fettfrei halten", "Rückschlagsicherungen prüfen"] },
                { id: "w_19", name: "MIG- und WIG-Schweißen", checked: false, hazards: ["UV/IR-Strahlung", "Schweißrauche", "Lärm"], measures: ["Schweißhelm", "Absaugung", "Lichtundurchlässige Trennwände"] },
                { id: "w_20", name: "Kleinteilelager Werkstatt (Regale, Kanister)", checked: false, hazards: ["Herabfallende Teile", "Gefahrstoffaustritt"], measures: ["Regale gegen Umkippen sichern", "Schwere Teile unten lagern", "Auffangwannen für Kanister"] },
                { id: "w_21", name: "Leitern und Aufstiegshilfen", checked: false, hazards: ["Absturz", "Abrutschen"], measures: ["Sichtprüfung vor Nutzung", "Spreizsicherung voll spannen", "Oberste Sprossen nicht betreten"] },
                { id: "w_22", name: "Industriestaubsauger einschl. Absaugvorrichtungen", checked: false, hazards: ["Stolpergefahr durch Kabel/Schläuche", "Einatmen toxischer Materialien"], measures: ["Korrekte Staubklasse verwenden", "Kabel aufrollen"] },
                { id: "w_23", name: "Doppelschleifbock", checked: false, hazards: ["Berstende Schleifscheiben", "Funkenflug", "Lärm"], measures: ["Schutzbrillen", "Spaltmaß gering halten", "Keine Handschuhe"] },
                { id: "w_24", name: "Kettensägenschärfgerät / Bohrerschärfgerät", checked: false, hazards: ["Funkenflug", "Schnittverletzungen"], measures: ["Schutzbrille", "Aufmerksamkeitsfokus"] },
                { id: "w_25", name: "Staplerkorb", checked: false, hazards: ["Absturz", "Quetschgefahr (Scherstellen)"], measures: ["PSA gegen Absturz", "Einweisung", "Nicht aus dem Korb steigen"] },
                { id: "w_26", name: "Hubarbeitsbühne", checked: false, hazards: ["Absturz", "Quetschgefahr", "Umkippen"], measures: ["PSA gegen Absturz", "Windlimits beachten", "UVV Prüfung"] },
                { id: "w_27", name: "Expander (Heizungsbau)", checked: false, hazards: ["Quetschungen", "Muskel-Skelett-Belastung"], measures: ["Handschuhe", "Ergonomische Haltung"] },
                { id: "w_28", name: "Handpresse (Heizungsbau)", checked: false, hazards: ["Quetschungen"], measures: ["Auf Fingerposition achten"] },
                { id: "w_29", name: "Einfriergerät (Heizungsbau)", checked: false, hazards: ["Kälteverbrennungen / Erfrierungen"], measures: ["Kälteschutzhandschuhe", "PSA"] },
                { id: "w_30", name: "Müllpresse", checked: false, hazards: ["Quetschgefahr beim Pressvorgang", "Eingezogen werden"], measures: ["Eingriffe nur im ausgeschalteten Zustand", "Einsteigen streng verboten"] },
                { id: "w_31", name: "Lackieren (Spritzwände, Spritzstände, Spritzkabinen, Absaugungen etc.)", checked: false, hazards: ["Einatmen von Lackdämpfen (toxisch)", "Brand- und Explosionsgefahr"], measures: ["Atemschutz (Lackiermaske)", "Betriebsanweisung Lacke", "Absaugung/Spritzwand nutzen", "Ex-Schutz beachten"] }
            ]
        },
        {
            category: "3. Schreinerei",
            icon: "🪵",
            items: [
                { id: "s_1", name: "Abrichthobelmaschine", checked: false, hazards: ["Schnittgefahr an der Messerwelle", "Rückschlag", "Holzstaub"], measures: ["Brückenschutz/Gliederschutz verwenden", "Schiebeholz verwenden", "Absaugung einschalten"] },
                { id: "s_2", name: "Handgeführte Hobelmaschine", checked: false, hazards: ["Schnittverletzungen", "Holzstaub", "Lärm"], measures: ["Beidhändiges Führen", "Gehörschutz", "Werkstück fixieren"] },
                { id: "s_3", name: "Dickenhobelmaschine", checked: false, hazards: ["Einzugsgefahr", "Lärm", "Staub"], measures: ["Keine Handschuhe", "Absaugung", "Gehörschutz"] },
                { id: "s_4", name: "Tischfräse", checked: false, hazards: ["Schneiden am Fräswerkzeug", "Wegfliegende Splitter", "Rückschlag"], measures: ["Vorschubapparat nutzen", "BG-Test Werkzeuge", "Gehörschutz"] },
                { id: "s_5", name: "Handoberfräse, Flachdübelfräse", checked: false, hazards: ["Schnittverletzungen", "Lärm", "Holzstaub"], measures: ["Sicheres Führen", "Werkstück fixieren", "Gehörschutz"] },
                { id: "s_6", name: "Tisch- / Formatkreissäge", checked: false, hazards: ["Schnittverletzungen am Sägeblatt", "Rückschlag von Werkstücken", "Lärm"], measures: ["Schiebestock verwenden", "Spaltkeil korrekt einstellen", "Gehörschutz", "Keine Handschuhe"] },
                { id: "s_7", name: "Plattensäge horizontal", checked: false, hazards: ["Schnittverletzungen", "Ergonomische Belastung durch große Platten", "Lärm"], measures: ["Hebehilfen nutzen", "Sicherheitsschuhe S3", "Gehörschutz"] },
                { id: "s_8", name: "Plattensäge vertikal", checked: false, hazards: ["Herabstürzen von Werkstücken", "Schnittverletzungen", "Lärm"], measures: ["Hebehilfen", "Sicherheitsschuhe S3", "Gehörschutz"] },
                { id: "s_9", name: "Tellerschleifmaschine / Kantenlangbandschleifmaschine", checked: false, hazards: ["Abschürfungen an den Händen", "Holzstaub"], measures: ["Werkstück sicher aufliegen lassen", "Absaugung", "Keine weiten Ärmel"] },
                { id: "s_10", name: "Handgeführter Bandschleifer / Schwingschleifer", checked: false, hazards: ["Hand-Arm-Vibrationen", "Staub"], measures: ["Staubabsaugung/Auffangsack", "Pausen einlegen"] },
                { id: "s_11", name: "Handkreissäge", checked: false, hazards: ["Schnittverletzungen", "Rückschlag", "Staub"], measures: ["Pendelhaube prüfen", "Sichere Auflage", "Schutzbrille"] },
                { id: "s_12", name: "Stichsäge, Säbelsäge", checked: false, hazards: ["Schnittverletzungen", "Vibration"], measures: ["Werkstück fixieren", "Schutzbrille"] },
                { id: "s_13", name: "Gehrungskappsäge", checked: false, hazards: ["Schnittverletzungen", "Wegfliegende Abschnitte"], measures: ["Werkstück festspannen", "Schutzhaube intakt halten", "Schutzbrille"] },
                { id: "s_14", name: "Kettensäge (elektrisch)", checked: false, hazards: ["Schnittverletzungen", "Rückschlag (Kick-back)"], measures: ["Schnittschutzhose", "Helm mit Visier", "Zweihandbedienung"] },
                { id: "s_15", name: "Kettensäge (benzinbetrieben)", checked: false, hazards: ["Schwere Schnittverletzungen", "Rückschlag", "Abgase", "Vibration"], measures: ["Kettensägenschein", "Schnittschutz PSA", "Gehörschutz"] },
                { id: "s_16", name: "Kurzhalsschleifer sowie Langhalsschleifer (Schleifgiraffe)", checked: false, hazards: ["Staubentwicklung (lungengängig)", "Ergonomische Belastung (Überkopfarbeit)"], measures: ["Absaugung (Klasse M)", "Arbeitsgerüst statt Leiter nutzen"] },
                { id: "s_17", name: "Langlochbohrmaschine", checked: false, hazards: ["Erfassen von Kleidung", "Schnittgefahr"], measures: ["Keine weite Kleidung", "Werkstück spannen"] },
                { id: "s_18", name: "Kantenanleimmaschine", checked: false, hazards: ["Verbrennung an Heißleim", "Quetschgefahr Transportband", "Lärm"], measures: ["Gehörschutz", "Sicherheitsabstand zu heißen Teilen"] },
                { id: "s_19", name: "Furnierpresse", checked: false, hazards: ["Quetschgefahr", "Verbrennungsgefahr (Heizplatten)"], measures: ["Gefahrenbereich nicht betreten", "Hitzeschutz"] },
                { id: "s_20", name: "Rahmen- und Korpuspresse", checked: false, hazards: ["Quetschgefahr"], measures: ["Beidhändige Bedienung (falls vorh.)", "Druck langsam aufbauen"] },
                { id: "s_21", name: "Eintreibegerät (Nagelpistolen/Klammergeräte)", checked: false, hazards: ["Schussverletzungen", "Querschläger", "Lärm"], measures: ["Schutzbrille", "Gerät niemals auf Personen richten", "Kontakt-Auslösesicherung"] },
                { id: "s_22", name: "Pistolen- / Teilereinigung (Teilereinigungsgerät)", checked: false, hazards: ["Hautkontakt mit Lösungsmitteln", "Dämpfe"], measures: ["Chemikalienschutzhandschuhe", "Gute Belüftung"] },
                { id: "s_23", name: "Lagern von Platten und Schnittholz", checked: false, hazards: ["Umkippende Platten", "Quetschungen"], measures: ["Platten sichern", "Sicherheitsschuhe S3", "Plattengreifer nutzen"] },
                { id: "s_24", name: "Spänesilo (Absauganlage)", checked: false, hazards: ["Staubexplosion", "Ersticken beim Einfahren"], measures: ["Zündquellen fernhalten", "Einfahren nur mit Erlaubnisschein und Sicherungsposten", "Siloeinfahrhose"] },
                { id: "s_25", name: "Dekupiersäge", checked: false, hazards: ["Schnittverletzungen", "Holzstaub"], measures: ["Schutzbrille", "Finger aus der Schnittlinie halten"] },
                { id: "s_26", name: "Prebomat", checked: false, hazards: ["Quetschungen"], measures: ["Sicherheitseinrichtungen prüfen", "Unterweisung"] }
            ]
        },
        {
            category: "4. Metallbearbeitung",
            icon: "⚙️",
            items: [
                { id: "m_1", name: "Drehmaschine, Fräsmaschine, Honmaschine", checked: false, hazards: ["Erfassen von Kleidung", "Wegfliegende Späne", "Kühlschmierstoff-Kontakt"], measures: ["Eng anliegende Kleidung", "Keine Handschuhe", "Schutzbrille", "Spänehaken verwenden"] },
                { id: "m_2", name: "Hydraulische Presse", checked: false, hazards: ["Quetschgefahr", "Wegfliegende Splitter"], measures: ["Zweihandschaltung / Lichtschranke", "Schutzbrille", "Sicherheitsschuhe"] },
                { id: "m_3", name: "Abkantbank", checked: false, hazards: ["Quetschgefahr", "Schnittgefahr an Blechen", "Herausschlagen des Werkstücks"], measures: ["Schnittfeste Handschuhe", "Material festspannen"] },
                { id: "m_4", name: "Rundstahlbiegemaschine", checked: false, hazards: ["Quetschgefahr", "Zurückschnellender Stahl"], measures: ["Abstand halten", "Unterweisung"] },
                { id: "m_5", name: "Sandstrahlanlage (Sandstrahl-Box)", checked: false, hazards: ["Einatmen von Feinstaub", "Augenverletzungen"], measures: ["Anlage nur geschlossen betreiben", "Handschuhe der Anlage nutzen"] },
                { id: "m_6", name: "Geschlossene Drehmaschinen, CNC-Fräsen", checked: false, hazards: ["Quetschgefahr bei Rüstvorgängen", "Kühlschmierstoffe (Aerosole)"], measures: ["Türverriegelung niemals überbrücken", "Absaugung nutzen", "Hautschutzplan"] },
                { id: "m_7", name: "Rissprüfgerät", checked: false, hazards: ["Chemikalienkontakt (Prüfmittel)", "Brandgefahr (je nach Mittel)"], measures: ["Schutzbrille", "Handschuhe", "Lüftung"] },
                { id: "m_8", name: "Härteprüfgerät", checked: false, hazards: ["Quetschungen bei Bedienung"], measures: ["Aufmerksamkeitsfokus", "Finger fernhalten"] },
                { id: "m_9", name: "Entmagnetisiergerät", checked: false, hazards: ["Elektromagnetische Felder (Gefahr für Schrittmacher)"], measures: ["Warnschilder aufstellen", "Zutrittsverbot für Personen mit Herzschrittmacher"] },
                { id: "m_10", name: "Draht- und Senkerodiermaschine", checked: false, hazards: ["Elektrische Spannung", "Dämpfe (Dielektrikum)"], measures: ["Sicherheitsabdeckungen geschlossen halten", "Absaugung nutzen"] },
                { id: "m_11", name: "Einpressmaschine", checked: false, hazards: ["Quetschgefahr"], measures: ["Lichtschranke oder Zweihandbedienung"] },
                { id: "m_12", name: "Blechbiegemaschine", checked: false, hazards: ["Quetschen", "Schneiden"], measures: ["Schnittfeste Handschuhe", "Räumliche Absicherung des Bereichs"] },
                { id: "m_13", name: "Automatisches Blechlager", checked: false, hazards: ["Gequetscht werden", "Getroffen werden von Blechen"], measures: ["Zutrittsverbot während des Betriebs", "Sicherheitsschuhe S3", "Helm beim Kranbetrieb"] },
                { id: "m_14", name: "Laserschneideanlage", checked: false, hazards: ["Augenverletzungen durch Laserstrahlung", "Brandgefahr", "Schneidstäube/Dämpfe"], measures: ["Einhausung intakt halten", "Absaugung", "Laserschutzbrille bei Wartung (Laserschutzbeauftragter)"] },
                { id: "m_15", name: "Elektrolyt-Beizarbeitsplatz", checked: false, hazards: ["Verätzung durch Säuren", "Toxische Dämpfe"], measures: ["Säurefeste PSA (Schürze, Stiefel, Visier, Handschuhe)", "Zwingende Absaugung", "Augenspülflasche bereithalten"] },
                { id: "m_16", name: "Ultraschallreinigungsgeräte", checked: false, hazards: ["Lärm (Hochfrequenz)", "Kontakt mit Reinigungsflüssigkeit"], measures: ["Deckel während Betrieb schließen", "Handschuhe beim Entnehmen"] },
                { id: "m_17", name: "Werkzeugvoreinstellgeräte", checked: false, hazards: ["Schnittgefahr an scharfen Werkzeugen"], measures: ["Schnittschutzhandschuhe", "Vorsichtiger Umgang"] }
            ]
        },
        {
            category: "5. Kunststofffertigung",
            icon: "🧪",
            items: [
                { id: "k_1", name: "Spritzgußmaschine", checked: false, hazards: ["Verbrennung durch heiße Kunststoffmasse", "Quetschgefahr an der Form", "Freisetzung giftiger Gase bei Überhitzung"], measures: ["Schutzgitter niemals manipulieren", "Hitzeschutzhandschuhe bei Störungsbeseitigung", "Absaugung über der Maschine"] },
                { id: "k_2", name: "3D-Drucker", checked: false, hazards: ["Emission von ultrafeinen Partikeln (UFP)", "Verbrennung am Druckkopf / Druckbett"], measures: ["Betrieb nur im geschlossenen Gehäuse mit Filter", "Abkühlen lassen vor Entnahme"] },
                { id: "k_3", name: "Heißluftfön", checked: false, hazards: ["Verbrennungsgefahr", "Brandgefahr", "Ausgasung von Kunststoffen"], measures: ["Feuerfeste Unterlage", "Ausreichende Belüftung", "Heißluft nie auf Personen richten"] }
            ]
        },
        {
            category: "6. Gärtnerei & Außenanlagen",
            icon: "🌿",
            items: [
                { id: "g_1", name: "Rasenmäher (elektrisch / Akku)", checked: false, hazards: ["Wegfliegende Steine", "Schnittverletzungen am Messer", "Kabel überfahren"], measures: ["Schutzbrille", "Festes Schuhwerk", "Kabel hinter sich führen"] },
                { id: "g_2", name: "Rasenmäher (benzinbetrieben)", checked: false, hazards: ["Lärm", "Abgase", "Brandgefahr beim Betanken"], measures: ["Gehörschutz", "Schutzbrille", "Betanken nur im abgekühlten Zustand"] },
                { id: "g_3", name: "Freischneider (benzinbetrieben)", checked: false, hazards: ["Lärm", "Wegfliegende Steine (Gefahr auch für Dritte)", "Vibration"], measures: ["Sicherheitsabstand zu anderen Personen (15m)", "Gesichtsschutz (Gitter + Brille)", "Gehörschutz", "Sicherheitsschuhe S3"] },
                { id: "g_4", name: "Heckenschere (benzinbetrieben)", checked: false, hazards: ["Schnittverletzungen", "Lärm", "Abgase"], measures: ["Zweihandbedienung", "Gehörschutz", "Schnittfeste Handschuhe"] },
                { id: "g_5", name: "Laubbläser (elektrisch/Akku)", checked: false, hazards: ["Aufgewirbelter Staub/Schmutz", "Lärm"], measures: ["Schutzbrille", "Gehörschutz"] },
                { id: "g_6", name: "Laubbläser (benzinbetrieben)", checked: false, hazards: ["Aufgewirbelter Staub/Schmutz", "Abgase", "Hoher Lärm"], measures: ["Schutzbrille", "Gehörschutz", "Rücksichtnahme auf Dritte"] },
                { id: "g_7", name: "LKW mit Kranaufbau und Anhängemaul", checked: false, hazards: ["Quetschgefahr beim Ankuppeln", "Herabfallende Lasten (Kran)", "Toter Winkel beim Rangieren"], measures: ["Warnkleidung", "Niemals unter schwebende Lasten treten", "Einweiser beim Rangieren"] }
            ]
        },
        {
            category: "7. Baustelle",
            icon: "🚧",
            items: [
                { id: "b_1", name: "Industriestaubsauger Staubklasse H (Asbestsauger)", checked: false, hazards: ["Einatmen von Asbestfasern (krebserregend)"], measures: ["TRGS 519 beachten", "Filterwechsel nur mit PSA (FFP3, Anzug)", "Spezielle Entsorgung des Saugguts"] },
                { id: "b_2", name: "Bohrmaschinen (Baustelle)", checked: false, hazards: ["Lärm", "Quetschen der Hand beim Blockieren des Bohrers", "Staub"], measures: ["Gehörschutz", "Zusatzhandgriff nutzen", "Staubabsaugung"] },
                { id: "b_3", name: "Rüttelplatte", checked: false, hazards: ["Hand-Arm-Vibrationen", "Lärm", "Quetschen der Füße"], measures: ["Vibrationsschutz", "Gehörschutz", "Sicherheitsschuhe S3 mit Mittelfußschutz"] },
                { id: "b_4", name: "Betonmischer", checked: false, hazards: ["Einzugsgefahr am Zahnkranz", "Elektrischer Schlag"], measures: ["Schutzgitter intakt halten", "Nicht in laufende Trommel greifen", "Betrieb über PRCD-Schalter"] },
                { id: "b_5", name: "Asphaltschneidegerät", checked: false, hazards: ["Schwere Schnittverletzungen", "Staubentwicklung (Silikate)", "Lärm"], measures: ["Sicherheitsschuhe S3", "Nassschneideverfahren", "Gehörschutzpflicht"] }
            ]
        },
        {
            category: "8. Anbaugeräte für Bagger, Unimog, Traktoren",
            icon: "🚜",
            items: [
                { id: "a_1", name: "Kreiselmähwerk", checked: false, hazards: ["Weggeschleuderte Steine/Fremdkörper", "Lärm", "Schnittverletzungen bei Reinigung"], measures: ["Schutzabdeckungen am Mähwerk", "Sicherheitsabstand zu Fußgängern", "Wartung nur bei Stillstand"] },
                { id: "a_2", name: "Salz- und Kastenstreuer", checked: false, hazards: ["Erfassen durch Rührwelle", "Ausgleiten auf rutschigem Boden (Winter)"], measures: ["Schutzgitter über Trichter", "Keine Reinigung bei laufendem Motor"] },
                { id: "a_3", name: "Frontkehrmaschine", checked: false, hazards: ["Staubaufwirbelung", "Quetschgefahr beim Anbau"], measures: ["Wassersprüheinrichtung zur Staubbindung", "Aufenthalt im Arbeitsbereich verboten"] },
                { id: "a_4", name: "Schneeräumschilder", checked: false, hazards: ["Quetschgefahr beim Anbau", "Anfahren von Personen/Objekten"], measures: ["Einweiser bei schlechter Sicht", "Kollisionsschutz (Ausklinkmechanismus) intakt"] },
                { id: "a_5", name: "Schneefräse", checked: false, hazards: ["Einziehen in Fräswalze", "Weggeschleudertes Eis/Steine"], measures: ["Verstopfungen nur mit Werkzeug (Stab) bei abgestelltem Motor lösen", "Niemals mit den Händen in den Auswurf greifen"] },
                { id: "a_6", name: "Wildkrautbürste", checked: false, hazards: ["Weggeschleuderte Steine", "Staub", "Vibration"], measures: ["Schutzbrille", "Visier", "Warnkleidung", "Sicherheitsabstand"] },
                { id: "a_7", name: "Holzspalter", checked: false, hazards: ["Schwere Quetsch- / Amputationsverletzungen", "Wegfliegende Holzsplitter"], measures: ["Zweihandschaltung zwingend", "Schutzbrille", "Sicherheitsschuhe S3", "Sicherer Stand"] },
                { id: "a_8", name: "Krananbau hinten", checked: false, hazards: ["Umkippen des Fahrzeugs", "Herabfallende Lasten"], measures: ["Stützfüße voll ausfahren", "Niemals unter der schwebenden Last aufhalten", "Kranschein erforderlich"] },
                { id: "a_9", name: "Baggeranbau hinten", checked: false, hazards: ["Quetschgefahr im Schwenkbereich", "Herabfallendes Material"], measures: ["Gefahrenbereich absperren", "Aufenthalt von Personen verbieten"] },
                { id: "a_10", name: "Frontlader mit Anbauten", checked: false, hazards: ["Herabfallende Last", "Sichtfeldeinschränkung", "Fahrzeugüberschlag"], measures: ["Last tief führen", "Passendes Anbaugerät nutzen (Sicherung)", "Gegengewicht verwenden"] },
                { id: "a_11", name: "Kanalreinigung (Spülwagen, Kamerawagen)", checked: false, hazards: ["Biologische Gefährdung (Kanalwasser, Bakterien)", "Hoher Wasserdruck", "Absturz in Schacht"], measures: ["Hautschutz", "PSA gegen Infektionen (Handschuhe, Brille, ggf. Maske)", "Schachtabsturzsicherung"] },
                { id: "a_12", name: "Grabenfräse", checked: false, hazards: ["Einziehen", "Weggeschleudertes Material", "Kabelschäden im Boden"], measures: ["Leitungspläne vorher prüfen", "Sicherheitsabstand", "Not-Aus griffbereit"] },
                { id: "a_13", name: "Förderband", checked: false, hazards: ["Einzug an Rollen/Umlenkpunkten", "Herabfallendes Material"], measures: ["Verkleidung der Einzugsstellen", "Keine lose Kleidung", "Not-Aus-Reißleine intakt"] }
            ]
        },
        {
            category: "9. KFZ-Werkstatt",
            icon: "🚗",
            items: [
                { id: "kfz_1", name: "Hebebühne", checked: false, hazards: ["Herabfallende KFZ", "Quetschgefahr", "Absturz (bei Scherenbühnen)"], measures: ["Regelmäßige UVV", "Traglast nicht überschreiten", "Unterstellböcke bei Bedarf", "Sicherheitsschuhe"] },
                { id: "kfz_2", name: "Unterflurgrube", checked: false, hazards: ["Absturz", "Erstickung/Explosion durch Dämpfe (Bremsenreiniger)"], measures: ["Grube bei Nichtnutzung abdecken/absperren", "Gute Belüftung", "Kopfschutz bei Arbeiten unterm Fzg."] },
                { id: "kfz_3", name: "Reifenwechselstation / Wuchtmaschine", checked: false, hazards: ["Plötzliche Freisetzung von Druckluft", "Quetschgefahr durch Montagearme"], measures: ["Schutzhaube beim Wuchten schließen", "Drucklos machen", "Gehörschutz"] },
                { id: "kfz_4", name: "Diagnosegeräte (OBD, Multimeter)", checked: false, hazards: ["Elektrischer Schlag an Hochvolt-Fahrzeugen (E-Autos)"], measures: ["Spannungsfreiheit feststellen (Fachkundiger HV)", "Entsprechende PSA bei HV-Arbeiten"] },
                { id: "kfz_5", name: "Ölabsauggeräte / Ölabscheider", checked: false, hazards: ["Hautkontakt mit Altöl", "Brandgefahr"], measures: ["Chemikalienschutzhandschuhe", "Altöl vorschriftsmäßig lagern (TRGS 510)"] },
                { id: "kfz_6", name: "Rollenprüfstand / Bremsenprüfstand", checked: false, hazards: ["Einzugsgefahr", "Abgase", "Wegrollen des Fzg."], measures: ["Fahrzeug sichern", "Abgasabsaugung aufstecken", "Gefahrenbereich nicht betreten"] }
            ]
        },
        {
            category: "10. Wäscherei",
            icon: "👕",
            items: [
                { id: "w_1", name: "Wäschereitrockner", checked: false, hazards: ["Brandgefahr (Selbstentzündung durch Flusen/Ölreste)", "Verbrennungsgefahr"], measures: ["Flusensieb täglich reinigen", "Trockner nicht vor Beendigung der Abkühlphase abschalten", "Heißes Gut nicht gestapelt liegen lassen"] },
                { id: "w_2", name: "Zentrifugen", checked: false, hazards: ["Verletzung durch rotierende Teile", "Lärm"], measures: ["Deckelverriegelung muss intakt sein (Öffnen erst bei Stillstand)", "Gleichmäßiges Beladen gegen Unwucht"] },
                { id: "w_3", name: "Waschmaschine", checked: false, hazards: ["Kontakt mit Waschmitteln/Chemie", "Rutschgefahr durch austretendes Wasser", "Thermische Gefährdung"], measures: ["Schutzhandschuhe/Schutzbrille beim Dosieren von Konzentraten", "Rutschfeste Schuhe"] },
                { id: "w_4", name: "Mangeln", checked: false, hazards: ["Einzugsgefahr von Fingern/Händen", "Verbrennungsgefahr an heißen Walzen"], measures: ["Eingreifschutz (Fingerschutzleiste) zwingend auf Funktion prüfen", "Keine losen Ärmel oder Schmuck", "Not-Aus Schalter leicht erreichbar"] }
            ]
        },
        {
            category: "11. Professionelle Küche / Großküche",
            icon: "🍳",
            items: [
                { id: "k_1", name: "Professionelle Geschirrspülmaschine", checked: false, hazards: ["Verbrühung durch heißen Dampf", "Verätzung durch Spülchemie", "Rutschgefahr"], measures: ["Gesicht beim Öffnen abwenden", "PSA (Brille, lange Handschuhe) beim Reinigerwechsel", "Boden trocken halten"] },
                { id: "k_2", name: "Fritteuse", checked: false, hazards: ["Schwere Verbrennungen durch heißes Fett", "Fettbrand"], measures: ["Fettbrand-Feuerlöscher (Klasse F) bereitstellen", "Niemals mit Wasser löschen", "Fritteuse nicht überfüllen", "Abtropfen lassen vor dem Einlegen (Kein Wasser/Eis ins Fett)"] },
                { id: "k_3", name: "Mikrowellengeräte", checked: false, hazards: ["Verbrennungen an heißen Behältern", "Siedeverzug von Flüssigkeiten"], measures: ["Geeignetes Geschirr verwenden", "Vorsicht beim Herausnehmen (Topflappen)"] },
                { id: "k_4", name: "Cooking Center (Thermomix, Vario etc.)", checked: false, hazards: ["Verbrühung durch Dampf", "Schnittverletzungen bei Messer-Reinigung", "Gewicht"], measures: ["Deckel vorsichtig öffnen", "Messer mit Bürste reinigen", "Rutschfester Stand"] },
                { id: "k_5", name: "Nudelkochstation / Nudelkessel", checked: false, hazards: ["Verbrühung durch kochendes Wasser", "Rutschgefahr"], measures: ["Spritzschutz nutzen", "Körbe langsam anheben", "Wasserablauf sauber halten"] },
                { id: "k_6", name: "Teigknetmaschine", checked: false, hazards: ["Eingezogen werden", "Ergonomische Belastung (Teigkessel)"], measures: ["Schutzgitterverriegelung prüfen", "Teigkesselwagen/Hubhilfen verwenden", "Keine weite Kleidung"] }
            ]
        },
        {
            category: "12. Töpferei",
            icon: "🏺",
            items: [
                { id: "t_1", name: "Töpferscheibe", checked: false, hazards: ["Hautbelastung (austrocknend)", "Ergonomische Zwangshaltung", "Einzugsgefahr (Haare/Kleidung)"], measures: ["Hautcreme nach der Arbeit", "Ergonomischer Sitz", "Haare zusammenbinden"] }
            ]
        },
        {
            category: "13. Druckerei / Papierverarbeitung",
            icon: "🖨️",
            items: [
                { id: "p_1", name: "Schneidemaschine (Plattengerät mit Lichtschranke)", checked: false, hazards: ["Amputation von Fingern/Händen", "Quetschungen am Pressbalken"], measures: ["Zweihandschaltung und Lichtgitter arbeitstäglich prüfen", "Messerwechsel nur mit Spezialwerkzeug", "Kein Eingriff in den Schnittbereich"] },
                { id: "p_2", name: "Vertikale Schneidemaschine (Kunststoffplatten)", checked: false, hazards: ["Schnittverletzungen", "Abstürzende Platten", "Staub"], measures: ["Sicherheitsschuhe S3", "Werkstück klemmen", "Schlitten sicher führen"] },
                { id: "p_3", name: "Schneidemaschine Plotter", checked: false, hazards: ["Schnittverletzungen am Schneidkopf", "Einzugsgefahr von Papier"], measures: ["Während des Betriebs Abdeckungen geschlossen halten", "Keine weite Kleidung"] },
                { id: "p_4", name: "Falzmaschine", checked: false, hazards: ["Einzugs- und Quetschgefahr an den Walzen", "Lärm"], measures: ["Schutzhauben müssen geschlossen sein", "Gehörschutz", "Lange Haare zusammenbinden"] },
                { id: "p_5", name: "Plattendrucker", checked: false, hazards: ["Quetschgefahr durch fahrenden Druckschlitten", "UV-Strahlung (Härtung)", "Lösungsmitteldämpfe"], measures: ["Abstand halten", "Lichtschranken nicht blockieren", "Ausreichende Belüftung"] },
                { id: "p_6", name: "Kunststoffspiral-Bindemaschine", checked: false, hazards: ["Quetschungen an Fingern", "Ergonomische Belastung (repetitiv)"], measures: ["Gerät sicher aufstellen", "Hände nicht im Stanzbereich positionieren"] },
                { id: "p_7", name: "Klebebinder", checked: false, hazards: ["Verbrennung an Heißleim", "Einzugsgefahr am Fräsaggregat", "Dämpfe"], measures: ["Hitzehandschuhe bei Reinigung", "Absaugung für Leimdämpfe und Papierstaub", "Schutzhauben geschlossen halten"] },
                { id: "p_8", name: "Heftmaschine", checked: false, hazards: ["Stichverletzungen durch Drahtklammern", "Quetschungen"], measures: ["Eingreifschutz (Plexiglas) am Heftkopf", "Fußpedal nur bei sicherer Handposition auslösen"] },
                { id: "p_9", name: "Laminiermaschine", checked: false, hazards: ["Quetschgefahr an den Einzugsrollen", "Verbrennungsgefahr durch heiße Oberflächen", "Elektrischer Schlag"], measures: ["Einzugsrollen verkleidet (Eingriffschutz)", "Ausreichend Abstand halten", "DGUV V3 Prüfung"] }
            ]
        }
    ];

    let activeEquipmentData = [];

    function initEquipment() {
        const storageKey = 'prapp_sifa_equipment_v4'; // Erneut auf V3 erhöht, um alten Cache zu ignorieren
        let loadedData = getStore(storageKey, null);
        
        if (!loadedData) {
            loadedData = JSON.parse(JSON.stringify(equipmentCatalog));
            setStore(storageKey, loadedData);
        }
        
        activeEquipmentData = loadedData;
        renderEquipment();
    }

    function toggleEquipmentItem(catIdx, itemIdx) {
        const storageKey = 'prapp_sifa_equipment_v4';
        let item = activeEquipmentData[catIdx].items[itemIdx];
        item.checked = !item.checked;
        setStore(storageKey, activeEquipmentData);
        renderBrandGBU(); // Refresh GBU to show newly checked items
    }

    function renderEquipment() {
        let html = "";
        for (let cIdx = 0; cIdx < activeEquipmentData.length; cIdx++) {
            const category = activeEquipmentData[cIdx];
            html += '<details class="group-acc" style="border-left-color:#16a085;"><summary style="color:#16a085;">' + category.icon + ' ' + category.category + '</summary>';
            html += '<div class="pruef-list" style="padding: 10px;">';
            
            for (let iIdx = 0; iIdx < category.items.length; iIdx++) {
                const item = category.items[iIdx];
                const isChecked = item.checked ? 'checked' : '';
                
                html += '<label class="eq-item-lbl" style="display:flex; align-items:center; gap:8px; margin-bottom:10px; font-size:13px; font-weight:500; text-transform:none; color:var(--text-main); cursor:pointer;">';
                html += '<input type="checkbox" style="width:18px; height:18px; margin:0; accent-color:#16a085;" ' + isChecked + ' onchange="toggleEquipmentItem(' + cIdx + ',' + iIdx + ')"> ';
                html += '<span class="eq-item-text">' + item.name + '</span>';
                html += '</label>';
            }
            html += '</div></details>';
        }
        document.getElementById('equipmentContainer').innerHTML = html;
        filterEquipment(); 
    }

    function filterEquipment() {
        const term = document.getElementById('eqSearchInput').value.toLowerCase();
        const detailsElements = document.querySelectorAll('#equipmentContainer details.group-acc');

        for (let i = 0; i < detailsElements.length; i++) {
            let detail = detailsElements[i];
            let hasVisibleItem = false;
            let labels = detail.querySelectorAll('.eq-item-lbl');

            for (let j = 0; j < labels.length; j++) {
                let lbl = labels[j];
                let itemText = lbl.querySelector('.eq-item-text').innerText.toLowerCase();
                
                if (itemText.indexOf(term) !== -1) {
                    lbl.style.display = 'flex';
                    hasVisibleItem = true;
                } else {
                    lbl.style.display = 'none';
                }
            }

            if (hasVisibleItem) {
                detail.style.display = 'block';
                if (term !== "") {
                    detail.setAttribute('open', '');
                }
            } else {
                detail.style.display = 'none';
            }
        }
    }

    // --- VIEW BGM: T-REX CHEAT CODES ---
    const BGM_DATA = {
        questions: [
            { id: 'q_buero', text: 'Gibt es Bildschirmarbeitsplätze mit überwiegend statischer Sitzhaltung (Rücken/Nacken)?', context: 'buero', icon: '💻' },
            { id: 'q_halle', text: 'Werden regelmäßig schwere Lasten manuell gehoben oder Maschinen bedient?', context: 'halle', icon: '🏭' },
            { id: 'q_auto', text: 'Sind Mitarbeiter regelmäßig im Außendienst oder lange im Auto unterwegs?', context: 'auto', icon: '🚗' },
            { id: 'q_ernaehrung', text: 'Kommt es nach Pausen oft zum "Schnitzel-Koma" (Leistungstief) oder wird Schicht gearbeitet?', context: 'ernaehrung', icon: '🍔' },
            { id: 'q_stress', text: 'Herrscht oft hoher Termindruck, Dauerstress oder mentale Anspannung?', context: 'stress', icon: '🌪️' }
        ],
        contexts: [
            { id: 'buero', label: 'Büro & Schreibtisch', icon: '💻' },
            { id: 'halle', label: 'Halle & Maschine', icon: '🏭' },
            { id: 'auto', label: 'Auto & Pendeln', icon: '🚗' },
            { id: 'ernaehrung', label: 'Ernährung & Kantine', icon: '🍔' },
            { id: 'stress', label: 'Stress & Pause', icon: '🌪️' }
        ],
        cheats: [
            { id: 'tuerrahmen_ninja', context: 'buero', title: 'Der Türrahmen-Ninja', subtitle: 'Gegen das T-Rex Syndrom', description: 'Öffnet die verkürzte Brustmuskulatur und entlastet den Nacken.', icon: '🧍',
              reportTitle: 'Dehnung der ventralen Muskelkette', reportDescription: 'Regelmäßige Aufdehnung der durch statische PC-Arbeit verkürzten vorderen Muskelkette zur Prävention von Haltungsschäden und Nackenbeschwerden.' },
            { id: 'marionetten_faden', context: 'buero', title: 'Der Marionetten-Faden', subtitle: 'Gegen die 7-Kilo-Bowlingkugel', description: 'Zieht den Kopf zurück über die Wirbelsäule.', icon: '🧵',
              reportTitle: 'Korrektur der Halswirbelsäulen-Statik', reportDescription: 'Bewusste Rückführung des Kopfes in die physiologische Mittelstellung zur Entlastung der isometrisch arbeitenden Nackenmuskulatur.' },
            { id: 'hydraulik_shot_buero', context: 'buero', title: 'Der Hydraulik-Shot (Büro)', subtitle: 'Kühlwasser für die Bandscheibe', description: 'Langes Sitzen drückt die Bandscheiben zusammen. Bewusste Trinkpausen füllen die Stoßdämpfer wieder auf.', icon: '🚰',
              reportTitle: 'Präventive Bandscheiben-Hydration', reportDescription: 'Regelmäßige Flüssigkeitsaufnahme zur Erhaltung der osmotischen Druckpuffer-Funktion (Trophik) der Bandscheiben bei langanhaltender Sitzhaltung.' },
            { id: 'silberruecken_scharnier', context: 'halle', title: 'Das Silberrücken-Scharnier', subtitle: 'Bandscheiben-Hamburger verhindern', description: 'Nutzt die Oberschenkel-Maschine statt der LWS beim Heben.', icon: '🦍',
              reportTitle: 'Biomechanisch optimierte Hebetechnik', reportDescription: 'Schulung und Anwendung rücken- und bandscheibenschonender Hebetechniken aus der Hocke (Hip Hinge) zur Verlagerung der Last auf die Beinmuskulatur.' },
            { id: 'husten_trick', context: 'halle', title: 'Der Husten-Trick', subtitle: 'Der unsichtbare Airbag', description: 'Baut den intraabdominalen Druck zur LWS-Stabilisierung auf.', icon: '🛡️',
              reportTitle: 'Intraabdominale Rumpfstabilisierung', reportDescription: 'Bewusster Aufbau von intraabdominalem Druck vor dem Hebevorgang zur muskulären Stabilisierung der Lendenwirbelsäule (Core-Stabilität).' },
            { id: 'schmierstoff_pumpe', context: 'halle', title: 'Die Schmierstoff-Pumpe', subtitle: 'Gelenk-Öl vor dem Kaltstart', description: 'Drückt den Knorpel-Schwamm aus, Synovia schießt in die Gelenke.', icon: '🛢️',
              reportTitle: 'Mobilisation der Gelenke vor Belastung', reportDescription: 'Kurze Aufwärm- und Mobilisationsübungen vor Arbeitsbeginn zur Anregung der Synovialflüssigkeit und Prävention von Knorpelverschleiß.' },
            { id: 'hydraulik_shot_halle', context: 'halle', title: 'Der Hydraulik-Shot (Halle)', subtitle: 'Flüssigkeit für Knorpel & Gelenke', description: 'Bei Anstrengung verliert der Körper Flüssigkeit. Trinken hält die Gelenkschmiere (Synovia) geschmeidig.', icon: '💧',
              reportTitle: 'Belastungsorientierte Flüssigkeitszufuhr', reportDescription: 'Ausreichende Flüssigkeitsaufnahme bei schwerer körperlicher Belastung zur Aufrechterhaltung der Gelenkfunktion und Leistungsfähigkeit.' },
            { id: 'ampel_reset', context: 'auto', title: 'Der Ampel-Reset', subtitle: 'Gegen das verkürzte Bungee-Seil', description: 'Löst den Zug auf den unteren Rücken durch Reziproke Hemmung.', icon: '🚦',
              reportTitle: 'Lockerung der Hüftbeuger-Muskulatur', reportDescription: 'Gezielte Entspannung der beim Sitzen verkürzten Hüftbeugemuskulatur (M. iliopsoas) durch reziproke Hemmung mittels Gluteus-Aktivierung.' },
            { id: 'rueckspiegel_hack', context: 'auto', title: 'Der Rückspiegel-Hack', subtitle: 'Der passive Aufpasser', description: 'Verhindert die Periskop-Haltung (Schildkröten-Hals).', icon: '🪞',
              reportTitle: 'Ergonomische PKW-Sitzhaltung', reportDescription: 'Optimierung der Sitzhaltung und Spiegelanordnung im KFZ zur Vermeidung einer Überstreckung der Halswirbelsäule bei langen Fahrten.' },
            { id: 'ballaststoff_schild', context: 'ernaehrung', title: 'Der Ballaststoff-Schutzschild', subtitle: 'Gegen das Schnitzel-Koma um 14 Uhr', description: 'Beilagensalat vor der Hauptmahlzeit essen, um die Blutzucker-Achterbahn abzuflachen.', icon: '🥗',
              reportTitle: 'Ernährungsspezifische Blutzucker-Regulation', reportDescription: 'Förderung einer ballaststoffreichen Ernährung vor den Hauptmahlzeiten zur Vermeidung postprandialer Leistungstiefs (Ermüdung) und Reduzierung des Unfallrisikos.' },
            { id: 'schicht_hack', context: 'ernaehrung', title: 'Der Schichtarbeiter-Hack', subtitle: 'Protein statt Zucker in der Nacht', description: 'Nachts (Biorhythmus-Tief) schwere Kohlenhydrate meiden, um extreme Müdigkeit zu verhindern.', icon: '🍳',
              reportTitle: 'Biorhythmus-angepasste Schicht-Ernährung', reportDescription: 'Verzicht auf schwer verdauliche und stark kohlenhydrathaltige Mahlzeiten während der Nachtschicht zur Entlastung des Magen-Darm-Trakts und Erhalt der Wachsamkeit.' },
            { id: 'treppenhaus_ventil', context: 'stress', title: 'Das Treppenhaus-Ventil', subtitle: 'Den Säbelzahntiger abhängen', description: 'Verbrennt Cortisol aus Blut. Der Puls sinkt, der Kopf wird klar.', icon: '🧗',
              reportTitle: 'Stressabbau durch physische Aktivierung', reportDescription: 'Kurze, intensive Bewegungsphasen (z. B. Treppensteigen) zum aktiven Abbau von stressbedingten Hormonen (Cortisol/Adrenalin) bei hoher psychischer Belastung.' },
            { id: 'scharfschuetzen_atem', context: 'stress', title: 'Scharfschützen-Atemzug', subtitle: 'Der Vagale Reset', description: 'Aktiviert den Parasympathikus (die Bremse).', icon: '🎯',
              reportTitle: 'Vagale Regulationstechniken', reportDescription: 'Anwendung gezielter Atemtechniken zur Aktivierung des Parasympathikus und unmittelbaren Senkung des Stresslevels bei akuten Belastungsspitzen.' }
        ]
    };

    // --- VIEW BGM: BAuA EINSTIEGSSCREENING ---
    const bauaCats = [
        { id: 'hht', title: '1. Heben, Halten, Tragen (> 3kg)', bgmTrigger: 'halle' },
        { id: 'ma', title: '2. Manuelle Arbeitsprozesse', bgmTrigger: 'buero' },
        { id: 'zs', title: '3. Ziehen und Schieben', bgmTrigger: 'halle' },
        { id: 'gk', title: '4. Ganzkörperkräfte', bgmTrigger: 'halle' },
        { id: 'kb', title: '5. Körperfortbewegung', bgmTrigger: 'stress' },
        { id: 'kh', title: '6. Körperzwangshaltungen', bgmTrigger: 'auto' }
    ];

    let bauaScores = {};

    function initBAuA() {
        const container = document.getElementById('baua-container');
        if(!container) return;
        
        let html = '';
        bauaCats.forEach(c => {
            bauaScores[c.id] = 0;
            html += `
            <details class="group-acc" id="baua_det_${c.id}" style="margin-bottom:8px;">
                <summary style="display:flex; justify-content:space-between; align-items:center;">
                    <span>${c.title}</span>
                    <span id="baua_score_${c.id}" style="background:#e2e8f0; padding:2px 8px; border-radius:10px; font-size:12px; font-weight:bold; color:#475569; min-width:40px; text-align:center;">0 Pkt</span>
                </summary>
                <div style="padding:10px; background:#f8fafc; border:1px solid var(--border-color); border-top:none; border-bottom-left-radius:6px; border-bottom-right-radius:6px;">
                    <label style="display:block; margin-bottom:10px; font-weight:bold; font-size:13px; color:var(--primary); cursor:pointer;">
                        <input type="checkbox" id="baua_active_${c.id}" onchange="calcBAuA()" style="accent-color:var(--primary); width:16px; height:16px;"> Tritt diese Belastungsart auf?
                    </label>
                    <div id="baua_crit_${c.id}" style="display:none; margin-top:10px; padding-top:10px; border-top:1px solid #cbd5e1;">
                        <p style="font-size:12px; margin-bottom:5px; color:#475569;">Treffen eine oder mehrere der folgenden Bedingungen zu? (Führt zu 2 Punkten)</p>
                        <label style="display:block; font-size:12px; margin-bottom:5px; cursor:pointer;"><input type="checkbox" class="baua-cb-${c.id}" onchange="calcBAuA()"> Häufigkeit und Gewicht überschreiten Richtwerte (z.B. >10kg bei >100x/Tag)</label>
                        <label style="display:block; font-size:12px; margin-bottom:5px; cursor:pointer;"><input type="checkbox" class="baua-cb-${c.id}" onchange="calcBAuA()"> Extrem hohe Lasten / Kräfte (z.B. >15kg Frauen / >25kg Männer)</label>
                        <label style="display:block; font-size:12px; margin-bottom:5px; cursor:pointer;"><input type="checkbox" class="baua-cb-${c.id}" onchange="calcBAuA()"> Ungünstige Körperhaltungen (Verdrehung, starke Rumpfvorneigung)</label>
                        <label style="display:block; font-size:12px; margin-bottom:5px; cursor:pointer;"><input type="checkbox" class="baua-cb-${c.id}" onchange="calcBAuA()"> Ungünstige Ausführungsbedingungen (Enge, Hitze, Nässe, Einhandbedienung)</label>
                    </div>
                </div>
            </details>
            `;
        });
        container.innerHTML = html;
    }

    function calcBAuA() {
        bauaCats.forEach(c => {
            const activeCb = document.getElementById(`baua_active_${c.id}`);
            if(!activeCb) return;
            const isActive = activeCb.checked;
            const critBox = document.getElementById(`baua_crit_${c.id}`);
            const scoreLabel = document.getElementById(`baua_score_${c.id}`);
            const summaryEl = document.querySelector(`#baua_det_${c.id} summary`);
            
            critBox.style.display = isActive ? 'block' : 'none';
            
            let pts = 0;
            if (isActive) {
                pts = 1;
                const cbs = document.querySelectorAll(`.baua-cb-${c.id}:checked`);
                if (cbs.length > 0) pts = 2;
            } else {
                document.querySelectorAll(`.baua-cb-${c.id}`).forEach(cb => cb.checked = false);
            }
            
            bauaScores[c.id] = pts;
            
            scoreLabel.innerText = pts + ' Pkt';
            if (pts === 0) {
                scoreLabel.style.background = '#e2e8f0'; scoreLabel.style.color = '#475569';
                summaryEl.style.borderLeftColor = 'transparent';
            } else if (pts === 1) {
                scoreLabel.style.background = '#fef08a'; scoreLabel.style.color = '#b45309';
                summaryEl.style.borderLeftColor = '#f59e0b';
            } else if (pts === 2) {
                scoreLabel.style.background = '#fecaca'; scoreLabel.style.color = '#991b1b';
                summaryEl.style.borderLeftColor = '#ef4444';
                
                // Auto-Trigger BGM Cheat Code
                if (c.bgmTrigger) {
                    const bgmCb = document.getElementById('q_' + c.bgmTrigger);
                    if (bgmCb && !bgmCb.checked) {
                        bgmCb.checked = true;
                        if(typeof toggleBGMContext === 'function') toggleBGMContext(c.bgmTrigger);
                        
                        // Flash effect to show automation
                        const lbl = bgmCb.parentElement;
                        if(lbl) {
                            lbl.style.transition = 'background 0.5s';
                            lbl.style.background = '#fee2e2';
                            setTimeout(() => lbl.style.background = 'transparent', 1500);
                        }
                    }
                }
            }
        });
    }

    function initBGM() {
        const container = document.getElementById('bgm-container');
        if(!container) return;
        
        let html = '<div class="card" style="border-left-color: #3b82f6; margin-bottom: 20px;">';
        html += '<h3 style="color:#3b82f6; margin-top:0;">1. Grundlegende Bedarfsanalyse</h3>';
        html += '<p style="font-size:12px; color:var(--text-muted); margin-bottom:15px;">Bitte zutreffende Belastungsschwerpunkte im Unternehmen ankreuzen:</p>';
        
        BGM_DATA.questions.forEach(q => {
            html += `
                <label style="display:flex; align-items:center; gap:10px; margin-bottom:10px; font-size:13px; font-weight:500; cursor:pointer; text-transform:none;">
                    <input type="checkbox" id="${q.id}" onchange="toggleBGMContext('${q.context}')" style="width:18px; height:18px; margin:0; accent-color:#3b82f6;">
                    <span>${q.icon} ${q.text}</span>
                </label>
            `;
        });
        html += '</div>';
        
        html += `
            <div style="margin-bottom: 20px; padding: 12px; background: #f1f5f9; border-radius: 6px; border: 1px solid #cbd5e1;">
                <label style="display:flex; align-items:center; gap:8px; font-size:13px; font-weight:600; cursor:pointer;">
                    <input type="checkbox" id="bgm-serious-mode" checked style="width:16px; height:16px; accent-color:#0284c7;">
                    Für den Audit-Bericht (PDF) seriös formulieren (T-Rex Metaphern ausblenden)
                </label>
            </div>
            
            <div class="card" style="margin-bottom: 20px; border-left-color: #10b981;">
                <h3 style="color:#10b981; margin-top:0;"><i class="fa-solid fa-book-open"></i> 2. BGM-Lehrheft (Mitarbeiter-Handout)</h3>
                <p style="font-size:12px; color:var(--text-muted); margin-bottom:15px;">Die App kann automatisch ein ansprechendes Handout aus dem "T-Rex"-Buch generieren, das nur die ausgewählten Themen enthält.</p>
                <label style="display:flex; align-items:center; gap:8px; font-size:13px; font-weight:600; cursor:pointer; margin-bottom: 8px;">
                    <input type="checkbox" id="bgm-attach-booklet" onchange="document.getElementById('bgm-toc-box').style.display = this.checked ? 'block' : 'none';" style="width:16px; height:16px; accent-color:#10b981;">
                    Als Anlage zum Bericht hinzufügen: Personalisiertes "T-Rex" Mitarbeiter-Handout erzeugen
                </label>
                <div id="bgm-toc-box" style="display:none; margin-left: 24px;">
                    <label style="display:flex; align-items:center; gap:8px; font-size:12px; font-weight:500; cursor:pointer; color: #475569;">
                        <input type="checkbox" id="bgm-attach-toc" checked style="width:14px; height:14px; accent-color:#10b981;">
                        Klickbares Inhaltsverzeichnis (TOC) generieren
                    </label>
                </div>
            </div>
        `;
        
        html += '<div id="bgm-measures-container">';
        BGM_DATA.contexts.forEach(ctx => {
            html += `
                <div id="bgm-ctx-${ctx.id}" class="card" style="display:none; margin-bottom:15px; border-left-color: #e67e22; animation: fadeIn 0.3s;">
                    <h3 style="color:#e67e22; margin-top:0;">${ctx.icon} Empfohlene Maßnahmen: ${ctx.label}</h3>
                    <p style="font-size:12px; color:var(--text-muted); margin-bottom:10px;">Bitte die passenden T-Rex Cheat-Codes für das PDF auswählen:</p>
                    <div style="display:flex; flex-direction:column; gap:10px;">
            `;
            const ctxCheats = BGM_DATA.cheats.filter(c => c.context === ctx.id);
            ctxCheats.forEach(c => {
                html += `
                        <label style="display:flex; gap:10px; align-items:flex-start; padding:10px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; cursor:pointer; transition:all 0.2s;">
                            <input type="checkbox" class="bgm-cb" data-id="${c.id}" style="margin-top:4px; width:18px; height:18px; accent-color:#e67e22;">
                            <div>
                                <strong style="display:block; color:#0f172a; font-size:14px;">${c.icon} ${c.title}</strong>
                                <span style="display:block; color:#64748b; font-size:12px; margin-bottom:4px;">${c.subtitle}</span>
                                <span style="font-size:12px; color:#475569;">${c.description}</span>
                            </div>
                        </label>
                `;
            });
            html += `</div></div>`;
        });
        html += '</div>';
        
        container.innerHTML = html;
    }

    function toggleBGMContext(contextId) {
        const checkbox = document.getElementById('q_' + contextId);
        const ctxBox = document.getElementById('bgm-ctx-' + contextId);
        if(checkbox && ctxBox) {
            ctxBox.style.display = checkbox.checked ? 'block' : 'none';
            const innerCbs = ctxBox.querySelectorAll('.bgm-cb');
            innerCbs.forEach(cb => cb.checked = checkbox.checked);
        }
    }

    // --- BGM BOOKLET TEXTS (DER T-REX IM BÜRO) ---
    const BGM_BOOKLET_DATA = {
        buero: {
            title: "Das T-Rex-Syndrom",
            subtitle: "Warum die Evolution den Schreibtischstuhl nicht eingeplant hat",
            image: "img/bgm_book/image1.png",
            content: `
                <p>Stell dir einen Tyrannosaurus Rex vor. Gewaltige Beine, ein riesiger Kopf, aber vorne hängen zwei lächerlich kurze, verkümmerte Ärmchen herunter. Kommt dir das bekannt vor? Wahrscheinlich von deinem Kollegen aus der Buchhaltung, wenn er um 14:30 Uhr hochkonzentriert tippt.</p>
                <p>Um zu verstehen, warum dir abends der Nacken brennt, müssen wir kurz in die Maschinenhalle deines Körpers schauen. Unser aktiver Bewegungsapparat funktioniert wie das Takelage-System bei einem Segelschiff. Wenn du nun acht Stunden am Tag wie ein T-Rex am PC sitzt, passiert Folgendes:</p>
                <ul>
                    <li><strong>Die vordere Takelage schrumpft:</strong> "Hey, der Typ streckt die Arme sowieso nie nach hinten. Wozu die langen Kabel behalten?"</li>
                    <li><strong>Die hintere Takelage leiert aus:</strong> Vorne zu kurz, hinten zu schwach. Dein Nacken muss die Überstunden machen und schreit um Hilfe.</li>
                </ul>
                <img src="img/bgm_book/image3.jpeg" style="width:100%; max-width:400px; display:block; margin: 20px auto; border-radius:8px;">
            `
        },
        halle: {
            title: "Die Bandscheiben-Lotterie",
            subtitle: "Warum dein unterer Rücken kein Gabelstapler ist",
            image: "img/bgm_book/image5.jpeg",
            content: `
                <p>Der untere Rücken ist ein feiner Architekt, aber ein furchtbarer Bauarbeiter. Lass die schweren Lasten von den Maschinen (Oberschenkel) heben und benutz den Rücken nur als stabilen Kran-Turm!</p>
                <p><strong>Das Zwiebelschalen-Prinzip:</strong> Zwischen jedem deiner Wirbel liegt eine Bandscheibe. Sie besteht aus einem festen Faserring und einem gelartigen Kern – stell dir einen Hamburger vor. Wenn du dich mit rundem Rücken nach vorne beugst, presst du die Vorderseite des Hamburgers extrem zusammen. Der Kern wird mit brachialer Gewalt nach hinten gedrückt.</p>
                <p>Wenn du jetzt in dieser runden Haltung auch noch 15 Kilo ziehst, platzt die Hülle deines "Hamburgers". Willkommen beim Bandscheibenvorfall. Die Lösung: Core-Stabilität. Du spannst den Bauch an (den unsichtbaren Airbag), bevor du die Kiste anhebst.</p>
                <img src="img/bgm_book/image4.jpeg" style="width:100%; max-width:400px; display:block; margin: 20px auto; border-radius:8px;">
            `
        },
        auto: {
            title: "Die rollende Schraubzwinge",
            subtitle: "Das Periskop und das Bungee-Seil",
            image: "img/bgm_book/image2.jpeg",
            content: `
                <p>Wenn du im Auto sitzt, machst du unweigerlich den "Schildkröten-Hals". Du fährst im Grunde wie ein U-Boot-Kommandant, der starr durch ein Periskop starrt. Die kleinen Muskeln an deiner Schädelbasis stehen massiv unter Strom.</p>
                <p>Noch schlimmer ist der Hüftbeuger: Wenn du sitzt, hängt dieses Muskel-Kabel komplett schlaff durch. Der Körper denkt sich: "Wir sparen Energie und machen das Seil einfach kürzer!" Der Hüftbeuger verkürzt sich. Wenn du aussteigst, zieht dieser extrem verkürzte Muskel brutal an deiner Lendenwirbelsäule und reißt dich ins Hohlkreuz.</p>
            `
        },
        ernaehrung: {
            title: "Das Schnitzel-Koma",
            subtitle: "Warum dich die Kantine um 14 Uhr in den Standby-Modus zwingt",
            image: "img/bgm_book/image6.jpeg",
            content: `
                <p>Es ist 13:00 Uhr. Schnitzel mit Pommes und Schokopudding. 14:00 Uhr: Eine zentnerschwere Bleidecke legt sich über dich. In der Arbeitssicherheit ist das der Moment, in dem die Fehlerquote explodiert und die Gabelstapler-Unfälle passieren.</p>
                <p><strong>Was ist passiert?</strong> Du bist auf der Zucker-Achterbahn ganz nach oben gefahren und jetzt im freien Fall. Dein Gehirn hat den Stecker gezogen, weil der Magen die ganze Energie für sich beansprucht. Die Lösung ist der Ballaststoff-Schutzschild: Ein Beilagensalat vor dem Hauptgang bremst die Zuckeraufnahme drastisch aus.</p>
            `
        },
        stress: {
            title: "Der Säbelzahntiger im Postfach",
            subtitle: "Warum 'Chillen' allein nicht vor Burnout schützt",
            image: null,
            content: `
                <p><em>"DRINGEND: Massive Probleme bei Projekt X!!!"</em></p>
                <p>In Millisekunden passiert etwas Faszinierendes: Dein Herzschlag beschleunigt sich. Nebennieren pumpen eine gewaltige Dosis Adrenalin und Cortisol in dein Blut. Wenn der Höhlenmensch den Tiger sah, rannte er weg. Die Stresshormone wurden als Treibstoff verbrannt.</p>
                <p>Und heute? Du bleibst auf dem Bürostuhl sitzen. Der Motor läuft auf Vollgas, aber du bewegst dich nicht. Das toxische Cortisol bleibt im Blut. Es stört den Schlaf und führt in den Burnout. Um das System neu zu starten, müssen wir den Stresshormonen das geben, was sie wollen: Körperliche Action. Chillen auf der Couch baut kein Cortisol ab – Treppenlaufen schon!</p>
            `
        }
    };

    // --- VIEW 10: REPORT (VERKNÜPFUNG MIT GEFÄHRDUNGSBEURTEILUNG) ---
    function generateReport() {
        switchView('view-report');
        
        let html = '<h3 style="color:var(--primary); border-bottom:2px solid var(--primary); padding-bottom:5px;">SiFa Audit Report</h3>';
        
        const bgSelect = document.getElementById('v1_bg');
        const bgText = bgSelect.options[bgSelect.selectedIndex].text;
        
        html += '<p><b>Kunde:</b> ' + document.getElementById('v1_name').value + ' | <b>MA:</b> ' + document.getElementById('v1_emp').value + ' | <b>BG:</b> ' + bgText + '</p>';
        
        html += '<h4>1. Quoten</h4>';
        if (document.getElementById('ampel_erst').innerHTML.indexOf('✓') !== -1) {
            html += '<p>🟢 Ersthelfende: OK</p>';
        } else {
            html += '<p>🔴 Ersthelfende: Defizit</p>';
        }
        
        if (document.getElementById('ampel_brand').innerHTML.indexOf('✓') !== -1) {
            html += '<p>🟢 Brandschutzhelfende: OK</p>';
        } else {
            let addTxt = '';
            if (document.getElementById('v1_brand_ausnahme').value === 'auffuellen') addTxt = ' (Soll wird aufgefüllt)';
            if (document.getElementById('v1_brand_ausnahme').value === 'gbu') addTxt = ' (Abweichung GBU)';
            html += '<p>🔴 Brandschutzhelfende: Defizit' + addTxt + '</p>';
        }

        const e_aus = document.getElementById('v1_erst_ausnahme').value;
        const b_aus = document.getElementById('v1_brand_ausnahme').value;

        if (e_aus === 'allein' && document.getElementById('warn-erst').style.display === 'block') {
            html += `<div style="border:1px solid #8e44ad; padding:10px; margin-top:10px; margin-bottom:20px; border-radius:4px; background:#fdfbfd;">
                <h4 style="margin:0 0 10px 0; color:#8e44ad;">Sonder-Gefährdungsbeurteilung: Alleinarbeitsplätze (DGUV Regel 112-139)</h4>
                <p style="font-size:12px; margin:0 0 5px 0;"><strong>Gefährdungsziffer (Schadenschwere):</strong> ${alleinGbuData.schwere}</p>
                <p style="font-size:12px; margin:0 0 5px 0;"><strong>Eintrittswahrscheinlichkeit:</strong> ${alleinGbuData.warsch}</p>
                <p style="font-size:12px; margin:0 0 10px 0;"><strong>Erstversorgung (Rettungszeit):</strong> ${alleinGbuData.rettung == '0' ? 'Sofort / Kurz (<5 Min)' : (alleinGbuData.rettung == '1' ? 'Mittel (5-15 Min)' : 'Lang (>15 Min)')}</p>
                `;
                
            if (alleinGbuData.risk < 30) {
                html += `<div style="background:#dcfce7; color:#166534; padding:8px; border-radius:4px; font-size:12px;"><strong>Risiko-Index: ${alleinGbuData.risk} (< 30)</strong><br>Geringe Gefährdung: Keine besonderen Maßnahmen erforderlich. Empfehlung: NORA App des Bundes nutzen.</div>`;
            } else {
                html += `<div style="background:#fee2e2; color:#991b1b; padding:8px; border-radius:4px; font-size:12px;"><strong>Risiko-Index: ${alleinGbuData.risk} (≥ 30)</strong><br>Erhöhte/Kritische Gefährdung! Folgende Maßnahmen wurden festgelegt:
                <ul style="margin:5px 0 10px 0; padding-left:15px;">`;
                
                if (alleinGbuData.massnahmen && alleinGbuData.massnahmen.length > 0) {
                    alleinGbuData.massnahmen.forEach(m => html += `<li>${m}</li>`);
                }
                if (alleinGbuData.frei) {
                    html += `<li>${alleinGbuData.frei}</li>`;
                }
                if ((!alleinGbuData.massnahmen || alleinGbuData.massnahmen.length === 0) && !alleinGbuData.frei) {
                    html += `<li><em>Noch keine Maßnahmen definiert!</em></li>`;
                }
                
                html += `</ul>`;
                
                if (alleinGbuData.wer || alleinGbuData.wann) {
                    html += `<div style="border-top:1px solid #fca5a5; padding-top:5px; margin-top:5px;">`;
                    if (alleinGbuData.wer) html += `<strong>Verantwortlich:</strong> ${alleinGbuData.wer}<br>`;
                    if (alleinGbuData.wann) html += `<strong>Frist:</strong> ${new Date(alleinGbuData.wann).toLocaleDateString('de-DE')}`;
                    html += `</div>`;
                }
                html += `</div>`;
            }
            html += `</div>`;
        }

        if (b_aus === 'gbu' && document.getElementById('warn-brand').style.display === 'block' && brandGbuList && brandGbuList.length > 0) {
            html += `<div style="border:1px solid #c0392b; padding:10px; margin-top:10px; margin-bottom:20px; border-radius:4px; background:#fff5f5;">
                <h4 style="margin:0 0 10px 0; color:#c0392b;">Abweichende Brandschutzhelfer-Quote: Gefährdungsbeurteilung (ASR A2.2)</h4>
                <table style="width:100%; border-collapse: collapse; font-size:11px;">
                    <thead>
                        <tr style="background:#fecaca; text-align:left;">
                            <th style="padding:4px; border:1px solid #f87171;">Abteilung</th>
                            <th style="padding:4px; border:1px solid #f87171;">Beschäftigte</th>
                            <th style="padding:4px; border:1px solid #f87171;">Größe</th>
                            <th style="padding:4px; border:1px solid #f87171;">Gefährdung / Nutzung</th>
                            <th style="padding:4px; border:1px solid #f87171;">Maßnahmen</th>
                            <th style="padding:4px; border:1px solid #f87171;">Empfohlene BSH</th>
                        </tr>
                    </thead>
                    <tbody>`;
            
            brandGbuList.forEach(b => {
                let nutzungName = b.nutzung === 'buero' ? 'Büro / Verwaltung' : (b.nutzung === 'lager' ? 'Lager' : (b.nutzung === 'produktion' ? 'Produktion / Werkstatt' : (b.nutzung === 'serverraum' ? 'Serverraum' : (b.nutzung === 'besprechung' ? 'Besprechungsraum' : 'Sozialraum / Teeküche'))));
                
                let gefHtml = `<strong>${nutzungName}</strong><br>`;
                if (b.quellen) gefHtml += `<span style="color:#c0392b;">⚠ Brandquellen vorh.</span><br>`;
                if (b.last) gefHtml += `<span style="color:#c0392b;">⚠ Erhöhte Brandlast</span><br>`;
                
                if (b.eqRisk) {
                    for (const [eqName, eqRisk] of Object.entries(b.eqRisk)) {
                        if (eqRisk === 'gering') gefHtml += `<span style="color:#f39c12; font-size:10px;">Maschine: ${eqName} (Gering)</span><br>`;
                        if (eqRisk === 'mittel') gefHtml += `<span style="color:#d35400; font-size:10px;">⚠ Maschine: ${eqName} (Mittel)</span><br>`;
                        if (eqRisk === 'hoch') gefHtml += `<span style="color:#c0392b; font-size:10px; font-weight:bold;">⚠ Maschine: ${eqName} (Hoch)</span><br>`;
                    }
                }
                
                let measHtml = b.massnahmen && b.massnahmen.length > 0 ? b.massnahmen.join(', ') : '-';
                
                html += `<tr>
                    <td style="padding:4px; border:1px solid #f87171; vertical-align:top;">${b.abt}</td>
                    <td style="padding:4px; border:1px solid #f87171; vertical-align:top;">${b.besch}</td>
                    <td style="padding:4px; border:1px solid #f87171; vertical-align:top;">${b.flaeche} m²</td>
                    <td style="padding:4px; border:1px solid #f87171; vertical-align:top;">${gefHtml}</td>
                    <td style="padding:4px; border:1px solid #f87171; vertical-align:top;">${measHtml}</td>
                    <td style="padding:4px; border:1px solid #f87171; vertical-align:top; font-weight:bold;">${b.bsh}</td>
                </tr>`;
            });
            
            html += `</tbody></table></div>`;
        }
        
        html += '<h4>2. GDA Orga-Status</h4><ul style="padding-left:15px; font-size:12px;">';
        for (let i = 0; i < gdaQuestions.length; i++) {
            let symbol = '🔴';
            if (gdaAnswers[i] === 'ja') symbol = '🟢';
            else if (gdaAnswers[i] === 'teil') symbol = '🟡';
            
            html += '<li>' + symbol + ' ' + gdaQuestions[i] + '</li>';
        }
        
        const notes = document.getElementById('gda_notes').value;
        if (notes) {
            html += '<li><b>Bemerkung:</b> ' + notes + '</li>';
        }
        html += '</ul>';

        html += '<h4>3. Mängel</h4>';
        renderMangelList(); // Ensure list is up to date
        if (mangelList.length === 0) {
            html += '<p>Keine Mängel erfasst.</p>';
        } else { 
            html += '<ul style="padding-left:15px; font-size:12px;">'; 
            for (let i = 0; i < mangelList.length; i++) {
                let katText = mangelList[i].kats && mangelList[i].kats.length > 0 ? ` <span style="color:#ef4444;">[${mangelList[i].kats.join(', ')}]</span>` : '';
                html += '<li><b>' + mangelList[i].t + '</b>' + katText + ' (' + mangelList[i].w + ', ' + mangelList[i].b + ')</li>';
            }
            html += '</ul>'; 
        }

        html += '<h4>4. Gefahrstoffe (EMKG)</h4>';
        if (inventoryList.length === 0) {
            html += '<p>Keine Stoffe erfasst.</p>';
        } else { 
            html += '<ul style="padding-left:15px; font-size:12px;">'; 
            for (let i = 0; i < inventoryList.length; i++) {
                const x = inventoryList[i];
                html += '<li><b>' + x.name + '</b> (H: ' + x.hs + ') -> Einatmen: Stufe ' + x.st_ein + ', Haut: Stufe ' + x.st_haut + ', Brand: Stufe ' + x.st_brand + '</li>';
            }
            html += '</ul>'; 
        }

        // --- NEW: BAuA Einstiegsscreening Report ---
        html += '<h4>5. Physische Belastung (BAuA-Einstiegsscreening)</h4>';
        let bauaChecked = false;
        let bauaHtml = '<table class="report-table"><tr><th>Belastungsart</th><th>Ergebnis (Punkte)</th><th>Handlungsbedarf</th></tr>';
        
        if (typeof bauaCats !== 'undefined' && typeof bauaScores !== 'undefined') {
            bauaCats.forEach(c => {
                let p = bauaScores[c.id];
                if (p > 0) bauaChecked = true;
                
                let resText = p + ' Punkt(e)';
                let actText = '';
                let color = '';
                
                if (p === 0) { color = 'var(--text-muted)'; resText = 'Nicht relevant'; actText = '-'; }
                else if (p === 1) { color = '#b45309'; actText = 'Gering belastet. LMM optional.'; }
                else if (p === 2) { color = '#991b1b'; actText = '<b>Kritisch! Vertiefende LMM erforderlich.</b>'; }
                
                bauaHtml += `<tr><td>${c.title}</td><td style="color:${color}; font-weight:bold;">${resText}</td><td>${actText}</td></tr>`;
            });
            bauaHtml += '</table>';
        }
        
        if (!bauaChecked) {
            html += '<p style="font-size:12px; color:var(--text-muted);">Keine physischen Leitmerkmal-Belastungen erfasst.</p>';
        } else {
            html += bauaHtml;
            html += '<p style="font-size:11px; color:var(--text-muted); margin-top:5px;"><i>Hinweis: Bei 2 Punkten ist gemäß ArbSchG/LasthandhabV zwingend eine detaillierte Gefährdungsbeurteilung nach der jeweiligen Leitmerkmalmethode (LMM) durchzuführen. Entsprechende präventive BGM-Maßnahmen wurden im BGM-Modul berücksichtigt.</i></p>';
        }

        html += '<h4>6. Prüffristen (Überfällig)</h4>';
        
        let mangelPruef = [];
        for (const key in pruefState) {
            if (pruefState.hasOwnProperty(key)) {
                const p = pruefState[key];
                if (p.exists && p.status === 'mangel' && !p.erledigt) {
                    mangelPruef.push(p);
                }
            }
        }
        
        if (mangelPruef.length === 0) {
            html += '<p>Alle erfassten Prüfungen sind im Soll.</p>';
        } else { 
            html += '<ul style="padding-left:15px; font-size:12px;">'; 
            for (let i = 0; i < mangelPruef.length; i++) {
                const p = mangelPruef[i];
                html += '<li><b style="color:var(--color-red)">Fehlt:</b> ' + p.name + ' (Frist: ' + (p.date || 'sofort') + ')</li>';
            }
            html += '</ul>'; 
        }

        html += '<h4>6. IT-Strategie</h4>';
        const itBox = document.getElementById('it_result_box').innerText;
        html += '<div style="background:#f1f5f9; padding:10px; border-radius:6px;">' + (itBox ? itBox : "Nicht analysiert.") + '</div>';

        html += '<h4>7. Zwiebelschalen-Audit (Gewaltprävention)</h4>';
        const branchSelect = document.getElementById('auditBranchSelect');
        html += '<p style="font-size:12px; margin-bottom:5px;"><b>Auditierter Bereich:</b> ' + branchSelect.options[branchSelect.selectedIndex].text + '</p>';
        
        let auditDeficits = 0;
        let auditHtml = '<ul style="padding-left:15px; font-size:12px;">';
        
        for (let i = 0; i < activeAuditData.length; i++) {
            const cat = activeAuditData[i];
            for (let j = 0; j < cat.items.length; j++) {
                const item = cat.items[j];
                if (item.c) {
                    auditHtml += '<li><span style="color:var(--color-green);">[OK]</span> ' + item.t + '</li>';
                } else {
                    auditDeficits++;
                    auditHtml += '<li><b style="color:var(--color-red);">[OFFEN]</b> ' + item.t + '</li>';
                }
            }
        }
        auditHtml += '</ul>';
        
        if (auditDeficits === 0 && activeAuditData[0].items[0].c) {
             html += '<div style="background:var(--bg-green); color:#065f46; padding:10px; border-radius:6px; font-size:12px; border:1px solid #a7f3d0;">Alle Kriterien des Zwiebelschalen-Prinzips sind erfüllt.</div>';
        } else {
             html += '<div style="background:var(--bg-red); color:#991b1b; padding:10px; border-radius:6px; font-size:12px; margin-bottom:10px; border:1px solid #fca5a5;">Achtung: Es wurden <b>' + auditDeficits + ' offene Punkte</b> im Zwiebelschalen-Konzept identifiziert.</div>';
             html += auditHtml;
        }

        // --- NEU: REPORT FÜR GERÄTE INKLUSIVE GEFÄHRDUNGSBEURTEILUNG ---
        html += '<h4>8. Gefährdungsbeurteilung der Arbeitsmittel</h4>';
        let foundEquipment = false;
        
        if (activeEquipmentData.length > 0) {
            for (let i = 0; i < activeEquipmentData.length; i++) {
                const cat = activeEquipmentData[i];
                for (let j = 0; j < cat.items.length; j++) {
                    const item = cat.items[j];
                    if (item.checked) {
                        foundEquipment = true;
                        
                        html += '<div style="margin-bottom: 15px; border-left: 3px solid var(--primary); padding-left: 10px; background: #f8fafc; padding: 10px; border-radius: 4px;">';
                        html += '<strong style="color:var(--primary); font-size:14px;">' + item.name + '</strong><br><br>';
                        
                        html += '<span style="font-size:11px; font-weight:bold; color:var(--color-red); text-transform:uppercase;">Gefährdungen:</span>';
                        html += '<ul style="margin: 4px 0 10px 0; padding-left:20px; font-size:12px;">';
                        for (let k = 0; k < item.hazards.length; k++) {
                            html += '<li>' + item.hazards[k] + '</li>';
                        }
                        html += '</ul>';
                        
                        html += '<span style="font-size:11px; font-weight:bold; color:var(--color-green); text-transform:uppercase;">Maßnahmen:</span>';
                        html += '<ul style="margin: 4px 0 0 0; padding-left:20px; font-size:12px;">';
                        for (let k = 0; k < item.measures.length; k++) {
                            html += '<li>' + item.measures[k] + '</li>';
                        }
                        html += '</ul>';
                        
                        html += '</div>';
                    }
                }
            }
        }

        if (!foundEquipment) {
            html += '<p style="font-size:12px; color:var(--text-muted);">Keine Geräte bei der Begehung erfasst.</p>';
        }

        // --- NEU: REPORT FÜR BGM T-REX ---
        html += '<h4>9. BGM & Ergonomie (Handlungsempfehlungen)</h4>';
        const bgmCheckboxes = document.querySelectorAll('.bgm-cb:checked');
        
        let isSeriousMode = document.getElementById('bgm-serious-mode') ? document.getElementById('bgm-serious-mode').checked : false;
        
        if (bgmCheckboxes.length > 0) {
            html += '<p style="font-size:12px; margin-bottom:10px;">Folgende präventive Maßnahmen wurden empfohlen, um arbeitsbedingte Belastungen proaktiv zu senken:</p>';
            html += '<div style="display:flex; flex-direction:column; gap:10px;">';
            
            bgmCheckboxes.forEach(cb => {
                const cheatId = cb.getAttribute('data-id');
                const cheat = BGM_DATA.cheats.find(c => c.id === cheatId);
                if(cheat) {
                    let printTitle = isSeriousMode && cheat.reportTitle ? cheat.reportTitle : `${cheat.icon} ${cheat.title}`;
                    let printDesc = isSeriousMode && cheat.reportDescription ? cheat.reportDescription : `<strong>${cheat.subtitle}:</strong> ${cheat.description}`;
                    
                    html += `
                    <div style="border:1px solid #fed7aa; background:#fff7ed; padding:10px; border-radius:6px;">
                        <strong style="color:#c2410c; display:block; margin-bottom:4px; font-size:13px;">${printTitle}</strong>
                        <div style="font-size:12px; color:#431407;">${printDesc}</div>
                    </div>`;
                }
            });
            html += '</div>';
        } else {
            html += '<p style="font-size:12px; color:var(--text-muted);">Keine spezifischen BGM-Maßnahmen für diesen Bereich verordnet.</p>';
        }
        
        // --- ADD BGM BOOKLET (EMPLOYEE HANDOUT) IF SELECTED ---
        let attachBooklet = document.getElementById('bgm-attach-booklet') ? document.getElementById('bgm-attach-booklet').checked : false;
        if(attachBooklet && bgmCheckboxes.length > 0) {
            let attachToc = document.getElementById('bgm-attach-toc') ? document.getElementById('bgm-attach-toc').checked : false;
            
            // Get unique contexts from checked cheats
            let selectedContexts = new Set();
            bgmCheckboxes.forEach(cb => {
                let cheat = BGM_DATA.cheats.find(c => c.id === cb.getAttribute('data-id'));
                if(cheat) selectedContexts.add(cheat.context);
            });
            
            html += '<div style="page-break-before: always;"></div>';
            
            // Cover Page
            html += '<div style="text-align:center; padding: 40px 20px; font-family: \\\'Inter\\\', sans-serif;">';
            html += '<h1 style="font-size:36px; color:#1e293b; text-transform:uppercase; margin-bottom:10px; margin-top:80px;">DER T-REX IM BÜRO</h1>';
            html += '<h2 style="font-size:20px; color:#0284c7; margin-top:0;">Praxis-Leitfaden: Ganzheitliches Gesundheitsmanagement</h2>';
            html += '<p style="font-size:16px; color:#64748b; margin-top:30px;">Persönliches Mitarbeiter-Handout (Ergonomie & Prävention)</p>';
            html += '<img src="img/bgm_book/image1.png" style="width:100%; max-width:500px; margin:60px auto; display:block; border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,0.1);">';
            html += '</div>';
            
            // Table of Contents
            if(attachToc) {
                html += '<div style="page-break-before: always;"></div>';
                html += '<div style="font-family: \\\'Inter\\\', sans-serif; padding: 20px;">';
                html += '<h2 style="color:#0f172a; border-bottom:2px solid #0284c7; padding-bottom:10px;">Inhaltsverzeichnis</h2>';
                html += '<ul style="list-style:none; padding:0; font-size:16px; line-height:2;">';
                let chapNum = 1;
                selectedContexts.forEach(ctxId => {
                    let bookChap = BGM_BOOKLET_DATA[ctxId];
                    if(bookChap) {
                        html += `<li><strong>Kapitel ${chapNum}:</strong> <a href="#bgm-chap-${ctxId}" style="color:#0284c7; text-decoration:none;">${bookChap.title}</a></li>`;
                        chapNum++;
                    }
                });
                html += '</ul></div>';
            }
            
            // Chapters
            let chapNum = 1;
            selectedContexts.forEach(ctxId => {
                let bookChap = BGM_BOOKLET_DATA[ctxId];
                if(bookChap) {
                    html += '<div style="page-break-before: always;" id="bgm-chap-' + ctxId + '"></div>';
                    html += '<div style="font-family: \\\'Inter\\\', sans-serif; padding: 20px;">';
                    html += `<p style="color:#64748b; font-weight:bold; margin-bottom:5px;">KAPITEL ${chapNum}</p>`;
                    html += `<h2 style="color:#0f172a; margin-top:0; font-size:24px;">${bookChap.title}</h2>`;
                    html += `<h3 style="color:#0284c7; margin-top:0; margin-bottom:20px; font-size:16px;">${bookChap.subtitle}</h3>`;
                    
                    if(bookChap.image && bookChap.title !== "Das T-Rex-Syndrom") { 
                         html += `<img src="${bookChap.image}" style="width:100%; max-width:300px; float:right; margin: 0 0 20px 20px; border-radius:8px; box-shadow:0 4px 15px rgba(0,0,0,0.1);">`;
                    }
                    
                    html += `<div style="font-size:14px; line-height:1.6; color:#334155;">${bookChap.content}</div>`;
                    html += '<div style="clear:both;"></div>';
                    html += '</div>';
                    chapNum++;
                }
            });
        }
        
        // --- ADD BRANDSCHUTZ MODULES IF ACTIVE ---
        let isBrandMode = document.getElementById('mode-brand') ? document.getElementById('mode-brand').checked : false;
        if(isBrandMode) {
            html += '<div style="page-break-before: always;"></div>';
            html += '<h3 style="color:#ef4444; border-bottom:2px solid #ef4444; padding-bottom:5px;">Brandschutz-Spezifische Audits</h3>';
            
            // SBG Checkliste
            html += '<h4>A. Allgemeine Sonderbau- & Brandschutzvorschriften (SBG)</h4>';
            let sbgHtml = '<table class="report-table"><tr><th>Prüfpunkt</th><th>Status</th></tr>';
            let sbgErrors = 0;
            chkQuestions.forEach((q, i) => {
                if(sbgAnswers[i] !== undefined) {
                    let statusTxt = sbgAnswers[i] ? '<span style="color:var(--color-green); font-weight:bold;">[OK] Ja</span>' : '<span style="color:var(--color-red); font-weight:bold;">[FEHLER] Nein</span>';
                    sbgHtml += `<tr><td>${q}</td><td>${statusTxt}</td></tr>`;
                    if(!sbgAnswers[i]) sbgErrors++;
                }
            });
            sbgHtml += '</table>';
            
            if(Object.keys(sbgAnswers).length > 0) {
                if(sbgErrors > 0) {
                    html += `<div style="background:#fee2e2; color:#991b1b; padding:10px; border-radius:6px; font-size:12px; margin-bottom:10px; border:1px solid #fca5a5;">Es wurden <b>${sbgErrors} sicherheitsrelevante Mängel</b> im SBG-Bereich festgestellt!</div>`;
                } else {
                    html += `<div style="background:#dcfce7; color:#166534; padding:10px; border-radius:6px; font-size:12px; margin-bottom:10px; border:1px solid #a7f3d0;">Alle geprüften SBG-Kriterien sind erfüllt. Keine Beanstandungen.</div>`;
                }
                html += sbgHtml;
            } else {
                html += '<p style="font-size:12px; color:var(--text-muted);">Checkliste wurde nicht bearbeitet.</p>';
            }
            
            // TRGS 510 Gefahrstoffe
            html += '<h4>B. Gefahrstoffe (Brandschutz & TRGS 510)</h4>';
            if (gefahrstoffeBrand.length === 0) {
                html += '<p style="font-size:12px; color:var(--text-muted);">Keine spezifischen Brandlasten oder Gefahrstoffe erfasst.</p>';
            } else { 
                html += '<div style="display:flex; flex-direction:column; gap:10px;">'; 
                gefahrstoffeBrand.forEach(g => {
                    let trgsColor = g.trgs === 'ja' ? 'var(--color-green)' : (g.trgs === 'nein' ? 'var(--color-red)' : '#f59e0b');
                    html += `
                    <div style="border:1px solid #ef4444; background:#fef2f2; padding:10px; border-radius:6px;">
                        <strong style="color:#b91c1c; display:block; margin-bottom:4px; font-size:13px;">${g.name} (${g.menge})</strong>
                        <div style="font-size:12px; color:#7f1d1d; margin-bottom:2px;"><b>Ort:</b> ${g.ort} | <b>Einstufung:</b> ${g.klasse}</div>
                        <div style="font-size:12px; color:#7f1d1d; margin-bottom:4px;"><b>TRGS 510 (Zusammenlagerung):</b> <span style="color:${trgsColor}; font-weight:bold;">${g.trgs.toUpperCase()}</span></div>
                        ${g.text ? `<div style="font-size:12px; color:#991b1b; background:#fff; padding:5px; border-radius:4px; border:1px solid #fca5a5;"><b>Hinweis/Mangel:</b> ${g.text}</div>` : ''}
                    </div>`;
                });
                html += '</div>'; 
            }
        }

        document.getElementById('reportOutput').innerHTML = html;
    }

    // --- NEU: KUNDENVERWALTUNG (MULTIPLE PROFILES) ---
    let currentCustomerId = null;

    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }

    function saveCurrentCustomer() {
        const name = document.getElementById('v1_name').value.trim();
        if (!name) {
            alert("Bitte zuerst einen Firmennamen unter '1. Betriebsdaten' eintragen!");
            switchView('view-1');
            return;
        }

        if (!currentCustomerId) {
            currentCustomerId = generateId();
        }

        // Collect all UI checkbox states for BGM and BAuA
        const bgmChecks = Array.from(document.querySelectorAll('#bgm-container input[type="checkbox"]')).map(cb => ({ id: cb.id, checked: cb.checked }));
        const bauaChecks = Array.from(document.querySelectorAll('#baua-container input[type="checkbox"]')).map(cb => ({ id: cb.id, checked: cb.checked }));

        const customerData = {
            id: currentCustomerId,
            name: name,
            date: new Date().toLocaleDateString('de-DE'),
            modes: {
                sifa: document.getElementById('mode-sifa').checked,
                brand: document.getElementById('mode-brand').checked
            },
            inputs: {
                v1_name: document.getElementById('v1_name').value,
                v1_emp: document.getElementById('v1_emp').value,
                v1_art: document.getElementById('v1_art').value,
                v1_bg: document.getElementById('v1_bg').value,
                v1_erst_ist: document.getElementById('v1_erst_ist').value,
                v1_erst_ausnahme: document.getElementById('v1_erst_ausnahme').value,
                v1_brand_ist: document.getElementById('v1_brand_ist').value,
                v1_brand_ausnahme: document.getElementById('v1_brand_ausnahme').value
            },
            complex: {
                mangelList: mangelList,
                inventoryList: inventoryList,
                gefahrstoffeBrand: gefahrstoffeBrand,
                bauaScores: bauaScores,
                sbgAnswers: sbgAnswers,
                pruefState: pruefState,
                auditData: auditData, // mutated locally
                equipmentCatalog: equipmentCatalog, // mutated locally
                bgmChecks: bgmChecks,
                bauaChecks: bauaChecks
            }
        };

        let customers = getStore('sifa_customers', []);
        const idx = customers.findIndex(c => c.id === currentCustomerId);
        if (idx > -1) {
            customers[idx] = customerData;
        } else {
            customers.push(customerData);
        }

        setStore('sifa_customers', customers);
        
        // Visual feedback
        alert("Datensatz gespeichert: " + name);
        renderCustomerList();
    }

    function loadCustomer(id) {
        const customers = getStore('sifa_customers', []);
        const c = customers.find(x => x.id === id);
        if (!c) return;

        currentCustomerId = c.id;

        // Restore modes
        document.getElementById('mode-sifa').checked = c.modes.sifa;
        document.getElementById('mode-brand').checked = c.modes.brand;

        // Restore inputs
        for (const [key, val] of Object.entries(c.inputs)) {
            const el = document.getElementById(key);
            if (el) el.value = val;
        }

        // Restore complex data
        mangelList = c.complex.mangelList || [];
        inventoryList = c.complex.inventoryList || [];
        gefahrstoffeBrand = c.complex.gefahrstoffeBrand || [];
        bauaScores = c.complex.bauaScores || {};
        sbgAnswers = c.complex.sbgAnswers || {};
        pruefState = c.complex.pruefState || {};
        if (c.complex.auditData) auditData = c.complex.auditData;
        if (c.complex.equipmentCatalog) equipmentCatalog = c.complex.equipmentCatalog;

        // Start Audit to render the UI based on modes
        startAudit();

        // Restore checkboxes
        setTimeout(() => {
            if (c.complex.bgmChecks) {
                c.complex.bgmChecks.forEach(cb => {
                    const el = document.getElementById(cb.id);
                    if (el) el.checked = cb.checked;
                });
            }
            if (c.complex.bauaChecks) {
                c.complex.bauaChecks.forEach(cb => {
                    const el = document.getElementById(cb.id);
                    if (el) el.checked = cb.checked;
                });
                calcBAuA(); // Recalculate visual UI
            }
            // Re-render lists
            renderMangelList();
            renderInventory();
            renderGefahrstoffBrandList();
            renderPruefkatalog();
            renderAudit();
            renderEquipment();
            
            // Re-apply SBG answers
            for (const [i, val] of Object.entries(sbgAnswers)) {
                const btnY = document.getElementById('sbg_y_' + i);
                const btnN = document.getElementById('sbg_n_' + i);
                if (btnY && btnN) {
                    btnY.style.background = val ? 'var(--primary)' : 'var(--bg-dark)';
                    btnN.style.background = !val ? 'var(--color-red)' : 'var(--bg-dark)';
                }
            }
            
            alert("Datensatz geladen: " + c.name);
        }, 100);
    }

    function deleteCustomer(id) {
        if (!confirm("Datensatz wirklich löschen?")) return;
        let customers = getStore('sifa_customers', []);
        customers = customers.filter(c => c.id !== id);
        setStore('sifa_customers', customers);
        if (currentCustomerId === id) currentCustomerId = null;
        renderCustomerList();
    }

    function renderCustomerList() {
        const container = document.getElementById('customer-list');
        if (!container) return;
        const customers = getStore('sifa_customers', []);
        
        if (customers.length === 0) {
            container.innerHTML = '<div style="font-size:12px; color:var(--text-muted); font-style:italic;">Noch keine Kunden gespeichert.</div>';
            return;
        }

        let html = '';
        customers.forEach(c => {
            let activeStyle = (c.id === currentCustomerId) ? 'border-color:var(--primary); background:#eff6ff;' : 'border-color:var(--border-color); background:#fff;';
            html += `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-radius:6px; border:1px solid; ${activeStyle}">
                <div style="flex:1; cursor:pointer;" onclick="loadCustomer('${c.id}')">
                    <strong style="font-size:14px; color:var(--text-color);">${c.name}</strong>
                    <div style="font-size:11px; color:var(--text-muted);">Zuletzt bearbeitet: ${c.date}</div>
                </div>
                <button class="btn-tool" style="color:var(--color-red); margin:0; padding:5px 10px;" onclick="deleteCustomer('${c.id}')"><i class="fa-solid fa-trash"></i></button>
            </div>
            `;
        });
        container.innerHTML = html;
    }

    function exportCustomers() {
        const customers = getStore('sifa_customers', []);
        if (customers.length === 0) return alert("Keine Daten zum Exportieren vorhanden.");
        
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(customers));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "sifa_kunden_backup.json");
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }

    function importCustomers(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const imported = JSON.parse(e.target.result);
                if (Array.isArray(imported)) {
                    setStore('sifa_customers', imported);
                    renderCustomerList();
                    alert("Backup erfolgreich importiert!");
                } else {
                    alert("Fehlerhaftes Dateiformat!");
                }
            } catch (err) {
                alert("Fehler beim Lesen der Datei!");
            }
        };
        reader.readAsText(file);
    }

    // INIT ALL
    document.addEventListener("DOMContentLoaded", function() {
        initGDA();
        initPruefKataster();
        initAudit(); 
        initEquipment();
        initBAuA();
        initBGM();
        renderCustomerList(); // Load saved customers on dashboard
    });
// --- PWA SETUP ---
let deferredPrompt;

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then(reg => {
            console.log('ServiceWorker registriert', reg);
        }).catch(err => {
            console.log('ServiceWorker Fehler', err);
        });
    });
}

document.addEventListener("DOMContentLoaded", () => {
    const installBtn = document.getElementById('installAppBtn');
    if (installBtn) {
        installBtn.addEventListener('click', () => {
            if (typeof deferredPrompt !== 'undefined' && deferredPrompt) {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then((choiceResult) => {
                    deferredPrompt = null;
                });
            } else {
                alert("Der automatische Download-Dialog wird von Ihrem aktuellen Browser nicht unterstützt oder blockiert.\n\nSo klappt es trotzdem:\n1. Öffnen Sie das Menü Ihres Browsers (meistens 3 Punkte oben rechts).\n2. Klicken Sie dort auf 'App installieren' oder 'Zum Startbildschirm hinzufügen'.\n\nTipp: Öffnen Sie den Link am besten direkt in Google Chrome oder Safari, nicht aus einer anderen App heraus.");
            }
        });
    }
});

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
});
