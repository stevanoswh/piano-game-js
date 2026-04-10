// ── Audio Engine (Web Audio API) ──────────────────────────────────────
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playNote(freq, duration = 0.4) {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();

    // Main tone
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain).connect(audioCtx.destination);

    // Subtle harmonic for richness
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, now);
    gain2.gain.setValueAtTime(0.08, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.6);
    osc2.connect(gain2).connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + duration);
    osc2.start(now);
    osc2.stop(now + duration * 0.6);
}

// ── Note / Key Definitions ───────────────────────────────────────────
const NOTES = [
    { note: 'C4',  freq: 261.63, type: 'white', key: 'a' },
    { note: 'C#4', freq: 277.18, type: 'black', key: 'w' },
    { note: 'D4',  freq: 293.66, type: 'white', key: 's' },
    { note: 'D#4', freq: 311.13, type: 'black', key: 'e' },
    { note: 'E4',  freq: 329.63, type: 'white', key: 'd' },
    { note: 'F4',  freq: 349.23, type: 'white', key: 'f' },
    { note: 'F#4', freq: 369.99, type: 'black', key: 't' },
    { note: 'G4',  freq: 392.00, type: 'white', key: 'g' },
    { note: 'G#4', freq: 415.30, type: 'black', key: 'y' },
    { note: 'A4',  freq: 440.00, type: 'white', key: 'h' },
    { note: 'A#4', freq: 466.16, type: 'black', key: 'u' },
    { note: 'B4',  freq: 493.88, type: 'white', key: 'j' },
    { note: 'C5',  freq: 523.25, type: 'white', key: 'k' },
];

// ── Build Piano UI ───────────────────────────────────────────────────
const pianoEl = document.getElementById('piano');
const keyElements = {};

NOTES.forEach(n => {
    const el = document.createElement('div');
    el.className = `key ${n.type}`;
    el.dataset.note = n.note;

    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = n.key.toUpperCase();
    el.appendChild(label);

    el.addEventListener('mousedown', () => triggerKey(n.note));
    el.addEventListener('mouseup', () => releaseKey(n.note));
    el.addEventListener('mouseleave', () => releaseKey(n.note));

    pianoEl.appendChild(el);
    keyElements[n.note] = el;
});

// ── Keyboard Input ───────────────────────────────────────────────────
const keyToNote = {};
NOTES.forEach(n => { keyToNote[n.key] = n.note; });

const activeKeys = new Set();

document.addEventListener('keydown', e => {
    if (e.repeat) return;
    const note = keyToNote[e.key.toLowerCase()];
    if (note && !activeKeys.has(note)) {
        activeKeys.add(note);
        triggerKey(note);
    }
});

document.addEventListener('keyup', e => {
    const note = keyToNote[e.key.toLowerCase()];
    if (note) {
        activeKeys.delete(note);
        releaseKey(note);
    }
});

function triggerKey(note) {
    const n = NOTES.find(x => x.note === note);
    if (!n) return;
    audioCtx.resume();
    playNote(n.freq);
    keyElements[note].classList.add('active');
    if (gameMode !== 'freeplay') checkHit(note);
}

function releaseKey(note) {
    if (keyElements[note]) keyElements[note].classList.remove('active');
}

// ── Songs ────────────────────────────────────────────────────────────
const SONGS = {
    twinkle: {
        name: 'Twinkle Twinkle Little Star',
        notes: ['C4','C4','G4','G4','A4','A4','G4','F4','F4','E4','E4','D4','D4','C4',
                'G4','G4','F4','F4','E4','E4','D4','G4','G4','F4','F4','E4','E4','D4',
                'C4','C4','G4','G4','A4','A4','G4','F4','F4','E4','E4','D4','D4','C4'],
    },
    mary: {
        name: 'Mary Had a Little Lamb',
        notes: ['E4','D4','C4','D4','E4','E4','E4','D4','D4','D4','E4','G4','G4',
                'E4','D4','C4','D4','E4','E4','E4','E4','D4','D4','E4','D4','C4'],
    },
    ode: {
        name: 'Ode to Joy',
        notes: ['E4','E4','F4','G4','G4','F4','E4','D4','C4','C4','D4','E4','E4','D4','D4',
                'E4','E4','F4','G4','G4','F4','E4','D4','C4','C4','D4','E4','D4','C4','C4'],
    },
    happy: {
        name: 'Happy Birthday',
        notes: ['C4','C4','D4','C4','F4','E4','C4','C4','D4','C4','G4','F4',
                'C4','C4','C5','A4','F4','E4','D4','A#4','A#4','A4','F4','G4','F4'],
    },
};

// ── Game State ───────────────────────────────────────────────────────
let gameMode = 'freeplay'; // 'freeplay' | 'challenge' | 'learn'
let score = 0;
let streak = 0;
let currentSong = [];
let noteIndex = 0;
let fallingNotes = [];
let gameLoop = null;

const scoreEl = document.getElementById('score');
const streakEl = document.getElementById('streak');
const modeEl = document.getElementById('mode');
const highwayEl = document.getElementById('note-highway');

// Add hit line to highway
const hitLine = document.createElement('div');
hitLine.className = 'hit-line';
highwayEl.appendChild(hitLine);

// ── Controls ─────────────────────────────────────────────────────────
const btnFreeplay = document.getElementById('btn-freeplay');
const btnChallenge = document.getElementById('btn-challenge');
const btnLearn = document.getElementById('btn-learn');
const songSelect = document.getElementById('song-select');

btnFreeplay.addEventListener('click', () => setMode('freeplay'));
btnChallenge.addEventListener('click', () => setMode('challenge'));
btnLearn.addEventListener('click', () => setMode('learn'));

function setMode(mode) {
    gameMode = mode;
    stopGame();
    [btnFreeplay, btnChallenge, btnLearn].forEach(b => b.classList.remove('active'));

    if (mode === 'freeplay') {
        btnFreeplay.classList.add('active');
        modeEl.textContent = 'Free Play';
        clearHighlights();
    } else if (mode === 'challenge') {
        btnChallenge.classList.add('active');
        modeEl.textContent = 'Challenge';
        startChallenge();
    } else if (mode === 'learn') {
        btnLearn.classList.add('active');
        modeEl.textContent = 'Learn Song';
        startLearn();
    }
}

// ── Challenge Mode (Falling Notes) ──────────────────────────────────
function startChallenge() {
    score = 0;
    streak = 0;
    updateHUD();
    noteIndex = 0;
    fallingNotes = [];
    clearHighway();
    clearHighlights();

    const songKey = songSelect.value;
    currentSong = [...SONGS[songKey].notes];

    let delay = 0;
    currentSong.forEach((note, i) => {
        setTimeout(() => {
            if (gameMode !== 'challenge') return;
            spawnFallingNote(note, i);
        }, delay);
        delay += 600;
    });
}

function spawnFallingNote(note, idx) {
    const n = NOTES.find(x => x.note === note);
    if (!n) return;

    const el = document.createElement('div');
    el.className = 'falling-note';
    el.textContent = note;
    el.dataset.note = note;
    el.dataset.idx = idx;

    const keyEl = keyElements[note];
    const pianoRect = pianoEl.getBoundingClientRect();
    const keyRect = keyEl.getBoundingClientRect();
    const left = keyRect.left - pianoRect.left + pianoEl.offsetLeft;
    const width = keyRect.width;

    const hwRect = highwayEl.getBoundingClientRect();
    const relLeft = (keyRect.left - hwRect.left);

    el.style.left = relLeft + 'px';
    el.style.width = width + 'px';
    el.style.height = '45px';
    el.style.background = n.type === 'white'
        ? 'linear-gradient(135deg, #e94560, #c23152)'
        : 'linear-gradient(135deg, #0f3460, #16213e)';
    el.style.border = '2px solid rgba(255,255,255,0.3)';
    el.style.animationDuration = '2s';

    highwayEl.appendChild(el);
    fallingNotes.push({ el, note, idx, hit: false, time: Date.now() + 2000 });

    // Auto-remove after animation
    setTimeout(() => {
        if (!el.dataset.hit) {
            el.remove();
            if (gameMode === 'challenge') {
                streak = 0;
                updateHUD();
                showFeedback('Miss!', 'miss');
            }
        }
        fallingNotes = fallingNotes.filter(fn => fn.el !== el);
    }, 2100);
}

function checkHit(note) {
    if (gameMode === 'challenge') {
        const now = Date.now();
        const target = fallingNotes.find(fn =>
            fn.note === note && !fn.hit && Math.abs(fn.time - now) < 500
        );

        if (target) {
            target.hit = true;
            target.el.dataset.hit = 'true';
            target.el.remove();

            const diff = Math.abs(target.time - now);
            if (diff < 150) {
                score += 100;
                streak++;
                showFeedback('Perfect!', 'perfect');
                spawnParticles(keyElements[note]);
            } else {
                score += 50;
                streak++;
                showFeedback('Good!', 'good');
            }
            // Streak bonus
            if (streak > 0 && streak % 10 === 0) {
                score += streak * 5;
                showFeedback(`${streak}x Streak!`, 'perfect');
            }
            updateHUD();
        }
    } else if (gameMode === 'learn') {
        checkLearnNote(note);
    }
}

// ── Learn Mode ───────────────────────────────────────────────────────
function startLearn() {
    noteIndex = 0;
    score = 0;
    streak = 0;
    updateHUD();
    clearHighway();

    const songKey = songSelect.value;
    currentSong = [...SONGS[songKey].notes];
    highlightNextNote();
}

function highlightNextNote() {
    clearHighlights();
    if (noteIndex >= currentSong.length) {
        showFeedback('Song Complete!', 'perfect');
        modeEl.textContent = 'Learn - Done!';
        return;
    }
    const note = currentSong[noteIndex];
    keyElements[note].classList.add('highlight');
}

function checkLearnNote(note) {
    if (noteIndex >= currentSong.length) return;

    if (note === currentSong[noteIndex]) {
        score += 10;
        streak++;
        noteIndex++;
        updateHUD();
        highlightNextNote();
    } else {
        streak = 0;
        updateHUD();
        showFeedback('Try again!', 'miss');
    }
}

function clearHighlights() {
    Object.values(keyElements).forEach(el => el.classList.remove('highlight'));
}

// ── UI Helpers ───────────────────────────────────────────────────────
function updateHUD() {
    scoreEl.textContent = score;
    streakEl.textContent = streak;
}

function clearHighway() {
    highwayEl.querySelectorAll('.falling-note').forEach(el => el.remove());
    fallingNotes = [];
}

function stopGame() {
    if (gameLoop) {
        clearInterval(gameLoop);
        gameLoop = null;
    }
    clearHighway();
    score = 0;
    streak = 0;
    noteIndex = 0;
    updateHUD();
}

function showFeedback(text, type) {
    const el = document.createElement('div');
    el.className = `feedback ${type}`;
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 700);
}

function spawnParticles(keyEl) {
    const rect = keyEl.getBoundingClientRect();
    const container = document.createElement('div');
    container.className = 'particles';
    container.style.left = rect.left + rect.width / 2 + 'px';
    container.style.top = rect.top + 'px';
    document.body.appendChild(container);

    const colors = ['#e94560', '#4ecca3', '#e9c46a', '#0f3460', '#fff'];
    for (let i = 0; i < 8; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.background = colors[Math.floor(Math.random() * colors.length)];
        p.style.setProperty('--dx', (Math.random() - 0.5) * 80 + 'px');
        p.style.setProperty('--dy', -(Math.random() * 60 + 20) + 'px');
        container.appendChild(p);
    }
    setTimeout(() => container.remove(), 600);
}

// ── Song select change restarts current mode ─────────────────────────
songSelect.addEventListener('change', () => {
    if (gameMode === 'challenge') startChallenge();
    else if (gameMode === 'learn') startLearn();
});

// ── DJ Beat Pads ─────────────────────────────────────────────────────
const djStatus = document.getElementById('dj-status');
const padEls = document.querySelectorAll('.pad');
const lenBtns = document.querySelectorAll('.len-btn');
const bpmInput = document.getElementById('bpm-input');

let beatLength = 2; // seconds
let pads = [null, null, null, null]; // each: { notes: [{note, time}], duration }
let padStates = ['empty', 'empty', 'empty', 'empty']; // empty | recording | ready | playing | looping
let recordingPad = -1;
let recordingStart = 0;
let recordedNotes = [];
let recTimerInterval = null;
let padTimeouts = {}; // padIndex -> [timeout ids]
let padIntervals = {}; // padIndex -> interval id
let padAnimFrames = {}; // padIndex -> animFrame id

// Beat length selector
lenBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        lenBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        beatLength = parseInt(btn.dataset.len);
    });
});

// Hook into triggerKey to capture notes during recording
const _origTriggerKey = triggerKey;
triggerKey = function(note) {
    _origTriggerKey(note);
    if (recordingPad >= 0) {
        recordedNotes.push({ note, time: Date.now() - recordingStart });
    }
};

// Pad click handlers
padEls.forEach(padEl => {
    const idx = parseInt(padEl.dataset.pad);

    padEl.addEventListener('click', (e) => {
        // Don't trigger pad if clicking delete button
        if (e.target.classList.contains('pad-delete')) return;
        handlePadClick(idx);
    });
});

// Keyboard shortcuts: 1-4 for pads
document.addEventListener('keydown', e => {
    if (e.repeat) return;
    const padIdx = parseInt(e.key) - 1;
    if (padIdx >= 0 && padIdx <= 3) {
        handlePadClick(padIdx);
    }
});

function handlePadClick(idx) {
    const state = padStates[idx];

    if (state === 'empty') {
        // Start recording into this pad
        if (recordingPad >= 0) return; // already recording elsewhere
        startPadRecording(idx);
    } else if (state === 'recording') {
        // Stop recording early
        stopPadRecording(idx);
    } else if (state === 'ready') {
        // Start looping
        startPadLoop(idx);
    } else if (state === 'playing' || state === 'looping') {
        // Stop
        stopPad(idx);
    }
}

function startPadRecording(idx) {
    audioCtx.resume();
    recordingPad = idx;
    recordedNotes = [];
    recordingStart = Date.now();
    padStates[idx] = 'recording';

    const padEl = padEls[idx];
    padEl.classList.add('recording');
    padEl.querySelector('.pad-label').textContent = 'Recording...';

    djStatus.textContent = `Recording Pad ${idx + 1}... play notes! (${beatLength}s)`;
    djStatus.classList.add('recording');

    // Timer bar
    const timerEl = padEl.querySelector('.pad-timer');
    timerEl.style.width = '0%';
    const startMs = Date.now();
    recTimerInterval = setInterval(() => {
        const elapsed = Date.now() - startMs;
        const pct = Math.min(100, (elapsed / (beatLength * 1000)) * 100);
        timerEl.style.width = pct + '%';
    }, 30);

    // Auto-stop after beatLength
    setTimeout(() => {
        if (recordingPad === idx) {
            stopPadRecording(idx);
        }
    }, beatLength * 1000);
}

function stopPadRecording(idx) {
    clearInterval(recTimerInterval);
    recordingPad = -1;

    const padEl = padEls[idx];
    padEl.classList.remove('recording');
    padEl.querySelector('.pad-timer').style.width = '0%';
    djStatus.classList.remove('recording');

    if (recordedNotes.length === 0) {
        padStates[idx] = 'empty';
        padEl.querySelector('.pad-label').textContent = 'Empty';
        djStatus.textContent = 'No notes recorded. Try again!';
        return;
    }

    pads[idx] = {
        notes: [...recordedNotes],
        duration: beatLength * 1000,
    };
    padStates[idx] = 'ready';
    padEl.classList.add('has-beat');
    padEl.querySelector('.pad-label').textContent = `${recordedNotes.length} notes - ${beatLength}s`;
    djStatus.textContent = `Pad ${idx + 1} ready! Click to loop it.`;

    // Add delete button
    addDeleteButton(padEl, idx);
}

function addDeleteButton(padEl, idx) {
    // Remove existing if any
    const existing = padEl.querySelector('.pad-delete');
    if (existing) existing.remove();

    const btn = document.createElement('button');
    btn.className = 'pad-delete';
    btn.textContent = 'X';
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        clearPad(idx);
    });
    padEl.appendChild(btn);
}

function playPadNotes(idx) {
    const pad = pads[idx];
    if (!pad) return;
    const timeouts = [];

    pad.notes.forEach(({ note, time }) => {
        const tid = setTimeout(() => {
            const n = NOTES.find(x => x.note === note);
            if (n) {
                playNote(n.freq);
                keyElements[note].classList.add('active');
                setTimeout(() => keyElements[note].classList.remove('active'), 150);
            }
        }, time);
        timeouts.push(tid);
    });

    padTimeouts[idx] = timeouts;
}

function startPadLoop(idx) {
    const pad = pads[idx];
    if (!pad) return;

    padStates[idx] = 'looping';
    const padEl = padEls[idx];
    padEl.classList.add('looping');
    padEl.querySelector('.pad-label').textContent = `Looping...`;
    djStatus.textContent = `Pad ${idx + 1} looping! Click to stop.`;

    // Play immediately
    playPadNotes(idx);

    // Progress bar
    let loopStart = Date.now();
    const progressEl = document.createElement('div');
    progressEl.className = 'pad-progress';
    padEl.appendChild(progressEl);

    function animateProgress() {
        const elapsed = (Date.now() - loopStart) % pad.duration;
        progressEl.style.width = (elapsed / pad.duration * 100) + '%';
        padAnimFrames[idx] = requestAnimationFrame(animateProgress);
    }
    animateProgress();

    // Loop
    padIntervals[idx] = setInterval(() => {
        playPadNotes(idx);
        loopStart = Date.now();
    }, pad.duration);
}

function stopPad(idx) {
    // Clear timeouts
    if (padTimeouts[idx]) {
        padTimeouts[idx].forEach(id => clearTimeout(id));
        delete padTimeouts[idx];
    }
    if (padIntervals[idx]) {
        clearInterval(padIntervals[idx]);
        delete padIntervals[idx];
    }
    if (padAnimFrames[idx]) {
        cancelAnimationFrame(padAnimFrames[idx]);
        delete padAnimFrames[idx];
    }

    const padEl = padEls[idx];
    padEl.classList.remove('playing', 'looping');
    const progress = padEl.querySelector('.pad-progress');
    if (progress) progress.remove();

    if (pads[idx]) {
        padStates[idx] = 'ready';
        padEl.querySelector('.pad-label').textContent = `${pads[idx].notes.length} notes - ${pads[idx].duration / 1000}s`;
    }
    djStatus.textContent = `Pad ${idx + 1} stopped.`;
}

function clearPad(idx) {
    stopPad(idx);
    pads[idx] = null;
    padStates[idx] = 'empty';
    const padEl = padEls[idx];
    padEl.classList.remove('has-beat', 'playing', 'looping', 'recording');
    padEl.querySelector('.pad-label').textContent = 'Empty';
    padEl.querySelector('.pad-timer').style.width = '0%';
    const del = padEl.querySelector('.pad-delete');
    if (del) del.remove();
    const prog = padEl.querySelector('.pad-progress');
    if (prog) prog.remove();
    djStatus.textContent = `Pad ${idx + 1} cleared.`;
}

// ── DJ Global Controls ───────────────────────────────────────────────
document.getElementById('btn-play-all').addEventListener('click', () => {
    for (let i = 0; i < 4; i++) {
        if (padStates[i] === 'ready') startPadLoop(i);
    }
});

document.getElementById('btn-stop-all').addEventListener('click', () => {
    for (let i = 0; i < 4; i++) {
        if (padStates[i] === 'playing' || padStates[i] === 'looping') stopPad(i);
    }
});

document.getElementById('btn-clear-all').addEventListener('click', () => {
    for (let i = 0; i < 4; i++) clearPad(i);
    djStatus.textContent = 'All pads cleared.';
});

document.getElementById('btn-export-mix').addEventListener('click', exportMix);

// ── WAV Export ───────────────────────────────────────────────────────
function exportMix() {
    const activePads = pads.filter(p => p !== null);
    if (activePads.length === 0) {
        djStatus.textContent = 'No beats to export!';
        return;
    }

    djStatus.textContent = 'Rendering WAV...';

    // Export the longest pad duration (or loop all to match longest)
    const maxDuration = Math.max(...activePads.map(p => p.duration)) / 1000 + 0.5;
    const sampleRate = 44100;
    const offline = new OfflineAudioContext(1, sampleRate * maxDuration, sampleRate);

    activePads.forEach(pad => {
        pad.notes.forEach(({ note, time }) => {
            const n = NOTES.find(x => x.note === note);
            if (!n) return;
            const startTime = time / 1000;
            const dur = 0.4;

            const osc = offline.createOscillator();
            const gain = offline.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(n.freq, startTime);
            gain.gain.setValueAtTime(0.35, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);
            osc.connect(gain).connect(offline.destination);
            osc.start(startTime);
            osc.stop(startTime + dur);

            const osc2 = offline.createOscillator();
            const gain2 = offline.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(n.freq * 2, startTime);
            gain2.gain.setValueAtTime(0.08, startTime);
            gain2.gain.exponentialRampToValueAtTime(0.001, startTime + dur * 0.6);
            osc2.connect(gain2).connect(offline.destination);
            osc2.start(startTime);
            osc2.stop(startTime + dur * 0.6);
        });
    });

    offline.startRendering().then(buffer => {
        const wav = audioBufferToWav(buffer);
        const blob = new Blob([wav], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'piano-beat.wav';
        a.click();
        URL.revokeObjectURL(url);
        djStatus.textContent = 'WAV exported!';
    });
}

function audioBufferToWav(buffer) {
    const numChannels = 1;
    const sampleRate = buffer.sampleRate;
    const format = 1;
    const bitDepth = 16;
    const samples = buffer.getChannelData(0);
    const dataLength = samples.length * (bitDepth / 8);
    const arrayBuffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(arrayBuffer);

    function w(offset, str) {
        for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    }

    w(0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    w(8, 'WAVE');
    w(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
    view.setUint16(32, numChannels * (bitDepth / 8), true);
    view.setUint16(34, bitDepth, true);
    w(36, 'data');
    view.setUint32(40, dataLength, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        offset += 2;
    }
    return arrayBuffer;
}
