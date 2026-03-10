// =============================================================
//  script.js — PushUp Counter (Glassmorphism UI)
// =============================================================

// ── State ────────────────────────────────────────────────────
let pushUpCount      = 0;
let bestSet          = 0;       // Highest single session count
let isDownPosition   = false;
let isCounting       = false;
const GOAL           = 20;

let startTime          = null;
let timerInterval      = null;
let totalPauseDuration = 0;
let pauseStart         = null;
let mpCamera           = null;
let isCameraRunning    = false;

const MIN_DOWN_ANGLE = 90;
const MIN_UP_ANGLE   = 160;
const RING_CIRC      = 2 * Math.PI * 44; // r=44 → 276.5

// ── DOM ──────────────────────────────────────────────────────
const video         = document.getElementById('camera-feed');
const canvas        = document.getElementById('pose-canvas');
const ctx           = canvas.getContext('2d');
const counterEl     = document.getElementById('counter');
const timerEl       = document.getElementById('timer');
const ppmEl         = document.getElementById('ppm');
const streakEl      = document.getElementById('streak');
const angleNumEl    = document.getElementById('angle-num');
const angleCursorEl = document.getElementById('angle-cursor');
const phaseTagEl    = document.getElementById('phase-tag');
const crFillEl      = document.getElementById('cr-fill');
const ringPctEl     = document.getElementById('ring-pct');
const liveChipEl    = document.getElementById('live-chip');
const liveTextEl    = document.getElementById('live-text');
const feedbackEl    = document.getElementById('feedback-pill');
const idleScreen    = document.getElementById('idle-screen');
const cameraFrame   = document.querySelector('.camera-frame');
const startBtn      = document.getElementById('start-btn');
const stopBtn       = document.getElementById('stop-btn');
const resetBtn      = document.getElementById('reset-btn');
const countSound    = document.getElementById('count-sound');

// ── UI Helpers ───────────────────────────────────────────────

function setLiveChip(state, label) {
    // state: 'off' | 'live' | 'paused'
    liveChipEl.className = `live-chip chip-${state}`;
    liveTextEl.textContent = label;
}

function setFeedback(type, msg) {
    // type: '' | 'good' | 'warn' | 'info'
    if (!msg) { feedbackEl.classList.add('hidden'); return; }
    feedbackEl.classList.remove('hidden', 'good', 'warn', 'info');
    feedbackEl.textContent = msg;
    if (type) feedbackEl.classList.add(type);
}

function setPhase(cls, label) {
    phaseTagEl.className = `phase-tag ${cls}`;
    phaseTagEl.textContent = label;
}

function setAngleUI(angle) {
    if (angle === null) {
        angleNumEl.textContent = '—';
        angleCursorEl.style.left = '0%';
        return;
    }
    angleNumEl.textContent = Math.round(angle);
    // Map 0–180° to 0–100% cursor position
    const pct = Math.min(angle / 180 * 100, 100);
    angleCursorEl.style.left = `calc(${pct}% - 2px)`;
}

function updateRing() {
    const pct    = Math.min(pushUpCount / GOAL, 1);
    const offset = RING_CIRC * (1 - pct);
    crFillEl.style.strokeDashoffset = offset;
    ringPctEl.textContent = `${Math.round(pct * 100)}%`;
}

function popCounter() {
    counterEl.classList.remove('pop');
    void counterEl.offsetWidth;
    counterEl.classList.add('pop');
    setTimeout(() => counterEl.classList.remove('pop'), 200);
}

// ── Timer ────────────────────────────────────────────────────

function updateTimer() {
    const ms   = Date.now() - startTime - totalPauseDuration;
    const secs = Math.floor(ms / 1000);
    const m    = String(Math.floor(secs / 60)).padStart(2, '0');
    const s    = String(secs % 60).padStart(2, '0');
    timerEl.textContent = `${m}:${s}`;
    if (secs > 0) ppmEl.textContent = Math.round((pushUpCount / secs) * 60);
}

function startTimer() {
    if (!startTime) {
        startTime = Date.now();
    } else if (pauseStart) {
        totalPauseDuration += Date.now() - pauseStart;
        pauseStart = null;
    }
    timerInterval = setInterval(updateTimer, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
    pauseStart = Date.now();
}

// ── MediaPipe ────────────────────────────────────────────────

function calcAngle(a, b, c) {
    const r = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(r * 180 / Math.PI);
    if (angle > 180) angle = 360 - angle;
    return angle;
}

const mpPose = new Pose({
    locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}`
});
mpPose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

mpPose.onResults(results => {
    // Draw mirrored frame
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    if (!results.poseLandmarks) return;

    // Draw skeleton — blue tones to match UI
    drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, {
        color: 'rgba(96,165,250,0.45)', lineWidth: 2
    });
    drawLandmarks(ctx, results.poseLandmarks, {
        color: '#3B82F6', lineWidth: 1, radius: 4
    });

    if (!isCounting) return;

    const shoulder = results.poseLandmarks[12]; // Right shoulder
    const elbow    = results.poseLandmarks[14]; // Right elbow
    const wrist    = results.poseLandmarks[16]; // Right wrist

    if ([shoulder, elbow, wrist].some(j => j.visibility < 0.5)) {
        setFeedback('warn', '⚠ Arm not visible');
        setPhase('warn', 'BLOCKED');
        setAngleUI(null);
        return;
    }

    const angle = calcAngle(shoulder, elbow, wrist);
    setAngleUI(angle);

    // Two-phase rep counting: DOWN → UP = 1 rep
    if (angle < MIN_DOWN_ANGLE) {
        isDownPosition = true;
        setPhase('down', 'DOWN ↓');
        setFeedback('info', 'Good — now push up!');
    } else if (isDownPosition && angle > MIN_UP_ANGLE) {
        pushUpCount++;
        isDownPosition = false;

        counterEl.textContent = pushUpCount;
        if (pushUpCount > bestSet) {
            bestSet = pushUpCount;
            streakEl.textContent = bestSet;
        }
        popCounter();
        updateRing();

        countSound.currentTime = 0;
        countSound.play();

        setPhase('counted', `REP ${pushUpCount} ✓`);
        setFeedback('good', `Rep ${pushUpCount} counted 🔥`);
    } else {
        if (!isDownPosition) {
            setPhase('up', 'UP ↑');
            setFeedback('', '');
        }
    }
});

// ── Camera ───────────────────────────────────────────────────

async function initCamera() {
    if (isCameraRunning) { mpCamera.start(); return true; }
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        await new Promise(res => { video.onloadedmetadata = () => { canvas.width = video.videoWidth; canvas.height = video.videoHeight; res(); }; });
        mpCamera = new Camera(video, {
            onFrame: async () => { await mpPose.send({ image: video }); },
            width: video.videoWidth, height: video.videoHeight
        });
        mpCamera.start();
        isCameraRunning = true;
        video.classList.add('video-hidden');
        idleScreen.style.display = 'none';
        cameraFrame.classList.add('is-live');
        return true;
    } catch (e) {
        console.error(e);
        alert('Camera access denied. Please allow camera permissions.');
        return false;
    }
}

// ── Buttons ──────────────────────────────────────────────────

startBtn.addEventListener('click', async () => {
    if (isCounting) return;
    isCounting = true;

    startBtn.disabled = true;
    stopBtn.disabled  = true;
    startBtn.innerHTML = `<svg class="spin-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Loading…`;
    setLiveChip('off', 'STARTING…');

    const ok = await initCamera();
    if (!ok) {
        isCounting = false;
        startBtn.disabled = false;
        startBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Start Session`;
        setLiveChip('off', 'OFFLINE');
        return;
    }

    startTimer();
    setLiveChip('live', 'LIVE');
    stopBtn.disabled = false;
    startBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> Tracking`;
    setPhase('up', 'READY');
    setFeedback('info', 'Stand sideways to camera');
});

stopBtn.addEventListener('click', () => {
    if (!isCounting) return;
    isCounting = false;
    stopTimer();
    if (mpCamera) mpCamera.stop();

    startBtn.disabled = false;
    stopBtn.disabled  = true;
    startBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Resume`;
    setLiveChip('paused', 'PAUSED');
    setPhase('', 'PAUSED');
    setFeedback('warn', 'Session paused');
});

resetBtn.addEventListener('click', () => {
    isCounting = false;
    stopTimer();

    pushUpCount = 0; startTime = null;
    totalPauseDuration = 0; pauseStart = null;
    isDownPosition = false;

    counterEl.textContent = '0';
    timerEl.textContent   = '00:00';
    ppmEl.textContent     = '0';

    setAngleUI(null);
    setPhase('', 'IDLE');
    setLiveChip('off', 'OFFLINE');
    setFeedback('', '');
    updateRing();

    startBtn.disabled = false;
    stopBtn.disabled  = true;
    startBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Start Session`;

    if (mpCamera && video.srcObject) {
        mpCamera.stop();
        video.srcObject.getTracks().forEach(t => t.stop());
        video.srcObject = null;
        isCameraRunning = false;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    video.classList.remove('video-hidden');
    idleScreen.style.display = 'flex';
    cameraFrame.classList.remove('is-live');
});

document.getElementById('help-btn').addEventListener('click', () => {
    alert(
        '📌 PushUp Counter — How to Use\n\n' +
        '1. Stand sideways so your full arm is visible to the camera.\n' +
        '2. Press Start Session — pose detection will load.\n' +
        '3. Do push-ups — AI tracks your elbow angle live.\n\n' +
        '📐 A rep is counted when:\n' +
        '   • Elbow angle drops below 90°  → DOWN\n' +
        '   • Then rises above 160°         → REP COUNTED\n\n' +
        '💡 Tips: Good lighting + plain background = best accuracy.'
    );
});

// Spin animation for loading state
const s = document.createElement('style');
s.textContent = `@keyframes spin{to{transform:rotate(360deg)}} .spin-icon{animation:spin .8s linear infinite}`;
document.head.appendChild(s);
