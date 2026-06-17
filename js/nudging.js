// nudging.js

// Global State for Nudging Werkstatt
let nudgingList = [];

const NUDGING_PRINCIPLES = [
    { id: 'p_bequem', title: 'Bequemlichkeit', icon: 'fa-couch', color: '#3b82f6', desc: 'Wie sorgen wir dafür, dass sicheres Verhalten bequemer wird?', 
      s_buero: ['Obstkorb sichtbar platzieren, Süßigkeiten in den Schrank', 'Höhenverstellbarer Tisch fährt morgens automatisch hoch', 'Treppenhaus heller/attraktiver gestalten als Aufzug'], 
      s_gewerbe: ['Gehörschutz-Spender direkt am Eingang zur Lärmzone', 'Werkzeug auf Griffhöhe lagern', 'Mülleimer direkt neben der Werkbank'] },
    { id: 'p_eindeutig', title: 'Eindeutigkeit', icon: 'fa-eye', color: '#8b5cf6', desc: 'Wie machen wir eindeutig erkennbar, was das sichere Verhalten ist?',
      s_buero: ['Fußspuren auf dem Boden führen zur Treppe', 'CO2-Ampel für Raumluftqualität', 'Grüne Punkte für korrekte Stuhleinstellung'], 
      s_gewerbe: ['3D-Illusion auf dem Boden für Stapler-Fahrwege', 'Spiegel an unübersichtlichen Ecken', 'Bunte Linien für sichere Gehwege'] },
    { id: 'p_belohnung', title: 'Belohnung', icon: 'fa-gift', color: '#f59e0b', desc: 'Welche Anreize schaffen wir für sicheres Verhalten?',
      s_buero: ['Kostenloser Kaffee im Steh-Meeting-Bereich', 'Lob im Team-Meeting'], 
      s_gewerbe: ['VIP-Parkplatz für Safety Champion', 'Prämie für gute Sicherheitsideen', 'Team-Grillen bei Unfallfreiheit'] },
    { id: 'p_abschreckung', title: 'Abschreckung', icon: 'fa-triangle-exclamation', color: '#ef4444', desc: 'Wie zeigen wir negative Folgen auf und kombinieren sie mit sicheren Alternativen?',
      s_buero: ['Schild: "Aufzug kostet X Kalorien, Treppe verbrennt Y"', 'Bild vom schmerzenden Rücken (T-Rex)'], 
      s_gewerbe: ['Schale mit Glassplittern neben Schutzbrillen', 'Defektes Werkzeug plakativ ausstellen'] },
    { id: 'p_spass', title: 'Spaß', icon: 'fa-face-laugh-beam', color: '#10b981', desc: 'Wie nutzen wir den Spieltrieb oder Humor für sicheres Verhalten?',
      s_buero: ['Mülleimer als Basketballkorb', 'Warnschild "Kabel-Monster"'], 
      s_gewerbe: ['Zielscheibe im Mülleimer', 'Lustige Safety-Comics in der Halle'] },
    { id: 'p_gruppe', title: 'Gruppennorm', icon: 'fa-users', color: '#0ea5e9', desc: 'Wie nutzen wir den Wunsch nach Zugehörigkeit für sicheres Verhalten?',
      s_buero: ['Schild: "85% nutzen die Treppe"', 'Führungskraft macht aktive Pause vor'], 
      s_gewerbe: ['Plakat: "Hier trägt jeder Gehörschutz"', 'Team-Pate macht Sicherheit vor'] },
    { id: 'p_feedback', title: 'Feedback', icon: 'fa-comment-dots', color: '#f43f5e', desc: 'Wie sieht eine zeitnahe Rückmeldung zum sicheren Verhalten aus?',
      s_buero: ['Smiley-Feedback am Stehpult nach 2 Stunden', 'Wöchentlicher Gesundheits-Pulscheck'], 
      s_gewerbe: ['Radar-Display für Stapler (Smiley bei Schrittgeschwindigkeit)', 'Lärm-Ampel leuchtet rot bei Lärm'] },
    { id: 'p_gamification', title: 'Gamification & Spiele-Matrix', icon: 'fa-gamepad', color: '#8b5cf6', desc: 'Punkte, Team-Challenges oder Lotterien: Wie machen wir aus Arbeitsschutz ein motivierendes Spiel?',
      s_buero: ['Schrittzähler-Challenge im Team', 'Safety-Bingo für den Kaffee-Gutschein'], 
      s_gewerbe: ['Mängel-Lotterie: Jede Meldung ein Los', 'Safety-Level-Up: Bronze/Silber/Gold'] }
];

function appendNudgingIdea(id, text) {
    const ta = document.getElementById('nud_idea_' + id);
    if (ta.value) ta.value += '\n- ' + text;
    else ta.value = '- ' + text;
}

function initNudging() {
    const container = document.getElementById('nudging-ideen-container');
    if (!container) return;

    // Get current industry
    const artEl = document.getElementById('v1_art');
    const isGewerbe = artEl && artEl.value === 'gewerbe';

    let html = '';
    NUDGING_PRINCIPLES.forEach(p => {
        const suggestions = isGewerbe ? p.s_gewerbe : p.s_buero;
        let chipsHtml = '';
        suggestions.forEach(s => {
            chipsHtml += `<span onclick="appendNudgingIdea('${p.id}', '${s.replace(/'/g, "\\'")}')" style="display:inline-block; margin:2px; padding:4px 8px; background:#e2e8f0; color:#475569; font-size:11px; border-radius:12px; cursor:pointer; border:1px solid #cbd5e1;"><i class="fa-solid fa-plus"></i> ${s}</span>`;
        });

        let extraHtml = '';
        if (p.id === 'p_gamification') {
            extraHtml = `
            <div style="margin-bottom:15px; padding:10px; background:#fff1f2; border-left:3px solid #f43f5e; border-radius:4px; box-shadow:0 1px 2px rgba(0,0,0,0.05);">
                <strong style="color:#be123c; font-size:12px; display:block; margin-bottom:5px;"><i class="fa-solid fa-scale-balanced"></i> Gamification oder Kindergarten? (Der 3-Fragen-Check)</strong>
                <ul style="font-size:11px; color:#881337; margin:0; padding-left:15px; line-height:1.4;">
                    <li style="margin-bottom:4px;"><b>Meeting-Test:</b> Kann ich das ohne Scham der Geschäftsführung oder Externen erklären? (Wenn nein = zu infantil)</li>
                    <li style="margin-bottom:4px;"><b>Fokus-Test:</b> Hilft es, den Alltag sicherer zu machen, oder lenkt es nur ab? (Der Mehrwert muss begründbar sein)</li>
                    <li><b>Kompetenz-Test:</b> Fühlen sich die Mitarbeiter danach kompetenter? (Spiel ohne Lerneffekt = Zeitvertreib)</li>
                </ul>
            </div>
            `;
        }

        html += `
        <details class="group-acc" style="margin-bottom:8px; border-left-color:${p.color};">
            <summary style="display:flex; align-items:center; gap:8px;">
                <i class="fa-solid ${p.icon}" style="color:${p.color}; width:20px; text-align:center;"></i> 
                <strong>${p.title}</strong>
            </summary>
            <div style="padding:10px; background:#f8fafc; border:1px solid var(--border-color); border-top:none; border-bottom-left-radius:6px; border-bottom-right-radius:6px;">
                <p style="font-size:12px; color:var(--text-muted); margin-bottom:10px;">${p.desc}</p>
                ${extraHtml}
                <div style="margin-bottom:10px;">
                    <strong style="font-size:11px; color:var(--primary);">💡 Quick-Ideen (Klicken zum Einfügen):</strong><br>
                    ${chipsHtml}
                </div>
                <div style="display:flex; gap:10px;">
                    <textarea id="nud_idea_${p.id}" placeholder="Ihre Maßnahme/Idee..." style="flex:1; min-height:60px;"></textarea>
                    <button class="btn-tool" onclick="startDictation('nud_idea_${p.id}', this)" style="height:40px;"><i class="fa-solid fa-microphone"></i></button>
                </div>
            </div>
        </details>
        `;
    });
    container.innerHTML = html;
}

function addNudgingIdea() {
    const verhalten = document.getElementById('nud_verhalten_un').value;
    const risiko = document.getElementById('nud_risiko').value;
    const ziel = document.getElementById('nud_verhalten_ziel').value;
    
    if (!verhalten || !ziel) {
        alert("Bitte füllen Sie mindestens das unsichere Verhalten und das Zielverhalten aus.");
        return;
    }

    const cond = document.getElementById('nud_cond').value;
    const motive = document.getElementById('nud_motive').value;
    const kons = document.getElementById('nud_kons').value;

    let ideas = [];
    NUDGING_PRINCIPLES.forEach(p => {
        const val = document.getElementById('nud_idea_' + p.id).value.trim();
        if (val) {
            ideas.push({ prinzip: p.title, text: val, color: p.color });
            document.getElementById('nud_idea_' + p.id).value = ''; // Reset
        }
    });

    nudgingList.push({
        id: Date.now().toString(),
        verhalten, risiko, ziel, cond, motive, kons, ideas
    });

    // Reset Form
    document.getElementById('nud_verhalten_un').value = '';
    document.getElementById('nud_risiko').value = '';
    document.getElementById('nud_verhalten_ziel').value = '';
    document.getElementById('nud_cond').value = '';
    document.getElementById('nud_motive').value = '';
    document.getElementById('nud_kons').value = '';

    renderNudgingList();
}

function renderNudgingList() {
    const container = document.getElementById('nudging-list-container');
    if (!container) return;

    if (nudgingList.length === 0) {
        container.innerHTML = '<p style="font-size:12px; color:var(--text-muted);">Noch keine Werkstatt-Ergebnisse gespeichert.</p>';
        return;
    }

    let html = '';
    nudgingList.forEach((n, idx) => {
        let ideasHtml = '';
        n.ideas.forEach(i => {
            ideasHtml += `<div style="margin-top:5px; padding:5px; background:#fff; border-left:3px solid ${i.color}; border-radius:4px; font-size:12px;">
                <strong>${i.prinzip}:</strong> ${i.text}
            </div>`;
        });

        html += `
        <div class="card" style="position:relative; border-left-color:#0ea5e9;">
            <button onclick="nudgingList.splice(${idx}, 1); renderNudgingList();" style="position:absolute; right:10px; top:10px; background:none; border:none; color:var(--color-red); cursor:pointer;"><i class="fa-solid fa-trash"></i></button>
            <div style="font-size:14px; font-weight:600; margin-bottom:5px; padding-right:20px;">Situation: ${n.verhalten}</div>
            <div style="font-size:12px; color:#991b1b; margin-bottom:5px;">Risiko: ${n.risiko || '-'}</div>
            <div style="font-size:12px; color:#166534; font-weight:bold; margin-bottom:10px;">Ziel: ${n.ziel}</div>
            
            <details style="margin-bottom:10px; font-size:12px;">
                <summary style="cursor:pointer; color:var(--primary); font-weight:500;">Analyse (Film) einblenden</summary>
                <div style="padding-top:5px; margin-top:5px; border-top:1px solid #e2e8f0; color:var(--text-muted);">
                    <strong>Zurückspulen:</strong> ${n.cond || '-'}<br>
                    <strong>Pause:</strong> ${n.motive || '-'}<br>
                    <strong>Vorspulen:</strong> ${n.kons || '-'}
                </div>
            </details>
            
            <div style="font-size:12px; font-weight:600; margin-bottom:5px;">Nudging Maßnahmen:</div>
            ${ideasHtml ? ideasHtml : '<em style="font-size:12px; color:#94a3b8;">Keine Maßnahmen entwickelt.</em>'}
        </div>
        `;
    });
    container.innerHTML = html;
}

document.addEventListener("DOMContentLoaded", function() {
    initNudging();
});
