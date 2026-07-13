// ─────────────────────────────────────────────────────────────
//  J.A.R.V.I.S. — Full Voice Assistant Engine
// ─────────────────────────────────────────────────────────────

const permissionGate  = document.getElementById('permission-gate');
const mainUI          = document.getElementById('main-ui');
const grantMicBtn     = document.getElementById('grant-mic-btn');
const gateMsg         = document.getElementById('gate-msg');
const gateIcon        = document.getElementById('gate-icon');
const gateError       = document.getElementById('gate-error');

const statusText      = document.getElementById('status-text');
const statusIndicator = document.getElementById('status-indicator');
const jarvisUi        = document.getElementById('jarvis-ui');
const transcriptContent = document.getElementById('transcript-content');
const responseContent   = document.getElementById('response-content');

const STATE_WAITING   = 'WAITING';
const STATE_LISTENING = 'LISTENING';
const STATE_EXECUTING = 'EXECUTING';
const STATE_SPEAKING  = 'SPEAKING';

let synthesis = window.speechSynthesis;
let recognition = null;
let isRecognitionRunning = false;
let isListeningForCommand = false;
let currentState = 'WAITING';      // track global state
let commandCooldown = false;       // prevent double-firing
let audioContext = null;
let analyser = null;
let micStream = null;
let vizActive = false;
let listeningTimeout = null;       // auto-reset if user doesn't say command after wake word

// ── Check if SpeechRecognition is available ───────────────────
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SpeechRecognition) {
    gateError.style.display = 'block';
    gateError.innerText = '\u274c Speech Recognition is NOT supported in this browser.\nPlease use Google Chrome or Microsoft Edge.';
    grantMicBtn.disabled = true;
}

// ── Auto-launch if mic already permanently granted ────────────
(async function autoLaunch() {
    try {
        // Check current browser permission state (no popup, just query)
        const perm = await navigator.permissions.query({ name: 'microphone' });
        if (perm.state === 'granted') {
            // Mic already allowed — skip gate entirely
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            permissionGate.style.display = 'none';
            mainUI.style.display = 'flex';
            startJarvis(stream);
        }
    } catch (e) {
        // permissions.query not supported or mic not yet granted — show gate as normal
        console.log('[JARVIS] Auto-launch skipped:', e.message);
    }
})();

// ── STEP 1: Grant Mic button — triggers browser permission popup ──
grantMicBtn.addEventListener('click', async () => {
    grantMicBtn.disabled = true;
    grantMicBtn.innerText = 'REQUESTING…';
    gateError.style.display = 'none';

    try {
        // This explicitly pops up the browser permission dialog
        micStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 }
        });

        gateIcon.innerText  = '✅';
        gateMsg.innerText   = 'Microphone access granted!';
        grantMicBtn.innerText = 'LAUNCHING…';

        // Small delay so user sees the success state
        setTimeout(() => {
            permissionGate.style.display = 'none';
            mainUI.style.display = 'flex';
            startJarvis(micStream);
        }, 600);

    } catch (err) {
        console.error('[JARVIS] getUserMedia failed:', err);
        grantMicBtn.disabled  = false;
        grantMicBtn.innerText = 'RETRY';
        gateIcon.innerText    = '❌';
        gateError.style.display = 'block';

        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            gateError.innerHTML =
                '<strong>Permission Denied!</strong><br><br>' +
                '1. Click the <b>🔒 lock icon</b> in your browser address bar<br>' +
                '2. Set <b>Microphone → Allow</b><br>' +
                '3. Click <b>Reload</b> and try again<br><br>' +
                '<em>Also make sure you are on <b>localhost:8000</b> (not 127.0.0.1:8000)</em>';
        } else if (err.name === 'NotFoundError') {
            gateError.innerHTML = '❌ No microphone detected.<br>Please plug in a microphone and retry.';
        } else {
            gateError.innerHTML = `Error: <b>${err.name}</b><br>${err.message}`;
        }
    }
});

// ── STEP 2: Start JARVIS after mic is granted ─────────────────
function startJarvis(stream) {
    // Set up audio visualizer with the real mic stream
    setupVisualizer(stream);

    // Build and start speech recognition
    recognition = buildRecognition();
    if (recognition) safeStart();

    speak('Systems online. Awaiting your command, sir.', () => {});

    // Active Watchdog to keep recognition and AudioContext alive indefinitely
    setInterval(() => {
        if (recognition && !isRecognitionRunning && currentState === STATE_WAITING && !synthesis.speaking) {
            console.log('[JARVIS Watchdog] Restarting idle speech recognition...');
            safeStart();
        }
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
    }, 1500);

    // Animated data streams
    setInterval(() => {
        const streamL = document.getElementById('stream-left');
        const streamR = document.getElementById('stream-right');
        const hex = () => Math.floor(Math.random() * 16777215).toString(16).padEnd(6,'0').toUpperCase();
        if (streamL) streamL.innerText = Array(30).fill(0).map(() => '0x' + hex()).join('\n');
        if (streamR) streamR.innerText = Array(30).fill(0).map(() => hex() + ' : SYS').join('\n');
    }, 150);
}

// ── Audio Visualizer ──────────────────────────────────────────
function setupVisualizer(stream) {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 64;
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        vizActive = true;
        animateViz();
    } catch (e) {
        console.warn('[JARVIS] Visualizer setup failed:', e);
    }
}

function animateViz() {
    if (!vizActive || !analyser) return;
    const bars = document.querySelectorAll('#audio-viz .bar');
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);

    bars.forEach((bar, i) => {
        const val = data[i * 2] || 0;
        const pct = Math.max(4, (val / 255) * 60);
        bar.style.height = pct + 'px';
    });

    requestAnimationFrame(animateViz);
}

// ── Speech Recognition ────────────────────────────────────────
function buildRecognition() {
    if (!SpeechRecognition) return null;
    const rec = new SpeechRecognition();
    rec.continuous      = true;
    rec.interimResults  = true;
    rec.lang            = 'en-US';
    rec.maxAlternatives = 1;

    rec.onstart = () => {
        isRecognitionRunning = true;
        transcriptContent.innerText = 'Say "Jarvis" to wake me…';
        setUIState(STATE_WAITING);
    };

    rec.onresult = handleResult;
    rec.onerror  = handleError;

    rec.onend = () => {
        isRecognitionRunning = false;
        // Auto-restart unless mic was revoked
        setTimeout(safeStart, 400);
    };

    return rec;
}

function safeStart() {
    if (!recognition || isRecognitionRunning) return;
    try { recognition.start(); }
    catch (e) { console.warn('[JARVIS] safeStart:', e.message); }
}

// ── Handle Voice Results ──────────────────────────────────────
function handleResult(event) {
    let interim = '', finalT = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalT += t;
        else                          interim += t;
    }

    const raw   = (finalT || interim).trim();
    const lower = raw.toLowerCase();

    // ── Always detect 'jarvis' wake word, even mid-execution or mid-speech ──
    if (lower.includes('jarvis') && !commandCooldown) {
        // Interrupt any ongoing TTS
        if (synthesis.speaking) synthesis.cancel();

        isListeningForCommand = true;
        commandCooldown = true;
        setTimeout(() => { commandCooldown = false; }, 1500); // debounce 1.5s

        setUIState(STATE_LISTENING);
        transcriptContent.innerText = '🎙 Speak your command…';

        const after = lower.split('jarvis').slice(1).join('').trim();
        if (after.length > 1 && finalT) {
            // Command was in the same utterance: "Jarvis, open Chrome"
            executeCommand(after);
        }
        // else: wait for next finalT below
        return;
    }

    // ── Waiting for command after wake word ──
    if (isListeningForCommand) {
        transcriptContent.innerText = raw;
        if (finalT) {
            let cmd = finalT.trim().replace(/^jarvis\s*/i, '').trim();
            if (cmd.length > 1) executeCommand(cmd);
        }
    } else {
        // Idle — just show ambient transcript
        if (raw) transcriptContent.innerText = `🔊 Say "Jarvis" to wake me…`;
    }
}

function handleError(event) {
    console.error('[JARVIS] Recognition error:', event.error);
    isRecognitionRunning = false;

    if (event.error === 'not-allowed') {
        transcriptContent.innerText = '🔒 Mic was blocked. Please refresh and allow microphone.';
        setUIState(STATE_WAITING);
    } else if (event.error === 'network') {
        transcriptContent.innerText = '🌐 Network error. Chrome needs internet for speech recognition.';
    } else if (event.error === 'no-speech') {
        // Silent — just restart
    } else {
        transcriptContent.innerText = `Mic issue: ${event.error}`;
    }
    // All errors auto-recover via onend → safeStart
}

// ── Execute Command ───────────────────────────────────────────
async function executeCommand(command) {
    if (command.toLowerCase().includes('stop listening')) {
        if (recognition) {
            try { recognition.stop(); } catch (e) {}
        }
        vizActive = false;
        setUIState(STATE_WAITING);
        speak('Listening paused, sir.', () => {});
        return;
    }

    // Stop speech recognition while processing/speaking so JARVIS doesn't listen to himself
    if (recognition) {
        try { recognition.stop(); } catch (e) {}
    }

    isListeningForCommand = false;
    setUIState(STATE_EXECUTING);
    responseContent.innerText = 'Processing…';

    try {
        const res   = await fetch('/api/command', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ text: command }),
        });
        const data  = await res.json();
        const reply = data.response || 'Done, sir.';
        responseContent.innerText = reply;
        setUIState(STATE_SPEAKING);
        speak(reply, () => resetToWaiting());
    } catch (e) {
        console.error(e);
        const reply = 'Unable to reach the main frame, sir.';
        responseContent.innerText = reply;
        setUIState(STATE_SPEAKING);
        speak(reply, () => resetToWaiting());
    }
}

// ── Reset fully to idle waiting state ────────────────────────
function resetToWaiting() {
    isListeningForCommand = false;
    commandCooldown = false;
    setUIState(STATE_WAITING);
    transcriptContent.innerText = '🔊 Say "Jarvis" to wake me…';
    safeStart(); // Force restart speech recognition after speaking completes
}

// ── UI State ──────────────────────────────────────────────────
function setUIState(state) {
    currentState = state;
    statusText.innerText = state;
    statusIndicator.className = 'status-indicator status-' + state.toLowerCase();
    jarvisUi.className = 'iron-man-mask';
    if (state === STATE_LISTENING) jarvisUi.classList.add('listening');
    if (state === STATE_EXECUTING)  jarvisUi.classList.add('executing');
    if (state === STATE_SPEAKING)   jarvisUi.classList.add('speaking');

    // Sync viz bar color to state
    const bars = document.querySelectorAll('#audio-viz .bar');
    bars.forEach(b => {
        b.style.background = state === STATE_SPEAKING
            ? 'var(--jarvis-success)'
            : state === STATE_EXECUTING
            ? '#ffaa00'
            : 'var(--jarvis-blue)';
    });
}

// ── TTS ───────────────────────────────────────────────────────
function speak(text, onEnd) {
    synthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.pitch = 0.85;
    utt.rate  = 1.0;

    const doSpeak = () => {
        const voices = synthesis.getVoices();
        const v = voices.find(v =>
            v.name.includes('Mark') || v.name.includes('David') ||
            v.name.includes('Guy')  || (v.lang === 'en-US' && v.gender === 'male')
        ) || voices.find(v => v.lang.startsWith('en'));
        if (v) utt.voice = v;
        utt.onend   = onEnd || (() => {});
        utt.onerror = onEnd || (() => {});
        synthesis.speak(utt);
    };

    if (synthesis.getVoices().length === 0) {
        synthesis.onvoiceschanged = doSpeak;
    } else {
        doSpeak();
    }
}
