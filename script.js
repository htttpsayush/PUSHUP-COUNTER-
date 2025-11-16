// script.js

// --- VARIABLES & SETUP ---
let pushUpCount = 0;
let isDownPosition = false; // State variable for counting
let isCounting = false; // Control flag for start/stop

// Timer variables
let startTime = null;
let timerInterval = null;
let totalPauseDuration = 0;
let pauseStart = null;
let mpCamera = null;
let isCameraRunning = false;

// DOM Elements
const video = document.getElementById('camera-feed'); 
const canvas = document.getElementById('pose-canvas'); 
const ctx = canvas.getContext('2d');
const counterElement = document.getElementById('counter');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const resetBtn = document.getElementById('reset-btn');
const timerElement = document.getElementById('timer');
const ppmElement = document.getElementById('ppm');
const angleIndicator = document.getElementById('angle-indicator');
const angleValue = document.getElementById('angle-value');
const formFeedback = document.getElementById('form-feedback');
const formDot = document.getElementById('form-dot');
const formMessage = document.getElementById('form-message');
const countSound = document.getElementById('count-sound');

// --- Initialization (Vanta.js and Feather Icons) ---
VANTA.WAVES({
    el: "#vanta-bg",
    mouseControls: true,
    touchControls: true,
    gyroControls: false,
    minHeight: 200.00,
    minWidth: 200.00,
    scale: 1.00,
    scaleMobile: 1.00,
    color: 0x2b1b3a,
    shininess: 35.00,
    waveHeight: 15.00,
    waveSpeed: 0.75,
    zoom: 0.85
});
feather.replace();

// --- CORE LOGIC FUNCTIONS ---

/**
 * Helper function to calculate the angle between three points (a, b, c).
 */
function calculateAngle(a, b, c) {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) -
                    Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    
    if (angle > 180.0) {
        angle = 360 - angle;
    }
    return angle;
}

// Simple feedback function
function showFormFeedback(type, message) {
    formFeedback.classList.remove('hidden');
    formMessage.textContent = message;

    formDot.classList.remove('bg-green-500', 'bg-red-500', 'bg-yellow-500');

    if (type === 'good') {
        formDot.classList.add('bg-green-500');
        formDot.style.boxShadow = '0 0 20px #10b981'; 
    } else if (type === 'bad') {
        formDot.classList.add('bg-red-500');
        formDot.style.boxShadow = '0 0 20px #ef4444';
    } else { // neutral/error
        formDot.classList.add('bg-yellow-500');
        formDot.style.boxShadow = '0 0 20px #f59e0b';
    }
}

// Timer functions
function updateTimer() {
    const elapsedTime = Date.now() - startTime - totalPauseDuration;
    const totalSeconds = Math.floor(elapsedTime / 1000);
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    timerElement.textContent = `${hours}:${minutes}:${seconds}`;

    if (totalSeconds > 0) {
        const ppm = Math.round((pushUpCount / totalSeconds) * 60);
        ppmElement.textContent = ppm;
    }
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

// --- MEDIAPIPE SETUP & PUSH-UP COUNTING ---

// 1. Initialize MediaPipe Pose
const mpPose = new Pose({locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}`});
mpPose.setOptions({
    modelComplexity: 1, 
    smoothLandmarks: true, 
    minDetectionConfidence: 0.5, 
    minTrackingConfidence: 0.5
});

// 2. The main processing loop function
function onResults(results) {
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Flip canvas to mirror video
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    if (results.poseLandmarks) {
        // Draw landmarks
        drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, {color: '#8b5cf6', lineWidth: 2});
        drawLandmarks(ctx, results.poseLandmarks, {color: '#ff007f', lineWidth: 2, radius: 5});

        if (isCounting) {
            // Get landmarks for Right Arm: Shoulder (12), Elbow (14), and Wrist (16)
            const s = results.poseLandmarks[12];
            const e = results.poseLandmarks[14];
            const w = results.poseLandmarks[16];
            
            // Visibility Check
            if (s.visibility < 0.5 || e.visibility < 0.5 || w.visibility < 0.5) {
                showFormFeedback('error', 'Cannot clearly see arm joints. Adjust camera/lighting.');
                angleIndicator.classList.add('hidden');
                return;
            }
            
            const elbowAngle = calculateAngle(s, e, w);
            
            angleIndicator.classList.remove('hidden');
            angleValue.textContent = Math.round(elbowAngle);
            showFormFeedback('neutral', 'Tracking Elbow...');

            // *** PUSH-UP COUNTING LOGIC ***
            const MIN_DOWN_ANGLE = 90; // Depth hit threshold
            const MIN_UP_ANGLE = 160; // Rep completion threshold
            
            if (elbowAngle < MIN_DOWN_ANGLE) { 
                isDownPosition = true;
                showFormFeedback('good', 'DOWN: Go up now!');
            } 
            
            if (isDownPosition && elbowAngle > MIN_UP_ANGLE) {
                pushUpCount++;
                counterElement.textContent = pushUpCount;
                isDownPosition = false; // Reset state
                countSound.play();
                showFormFeedback('good', 'Counted! Rep completed.');
            }
        }
    }
}
mpPose.onResults(onResults);


// 3. Camera Setup
async function initCamera() {
    if (isCameraRunning) {
        mpCamera.start();
        return true;
    }
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        
        await new Promise((resolve) => {
            video.onloadedmetadata = () => {
                canvas.width = video.videoWidth; 
                canvas.height = video.videoHeight;
                resolve();
            };
        });
        
        mpCamera = new Camera(video, {
            onFrame: async () => {
                await mpPose.send({image: video});
            },
            width: video.videoWidth,
            height: video.videoHeight
        });
        
        mpCamera.start();
        isCameraRunning = true;
        video.classList.add('video-hidden');
        return true;

    } catch (err) {
        console.error("Error accessing camera:", err);
        alert("Could not access camera. Please make sure you've granted camera permissions.");
        return false;
    }
}


// --- EVENT LISTENERS (Start, Stop, Reset) ---

startBtn.addEventListener('click', async () => {
    if (isCounting) return;

    isCounting = true;
    
    // UI: Initializing
    startBtn.disabled = true;
    stopBtn.disabled = true;
    startBtn.classList.remove('bg-green-600', 'hover:bg-green-500');
    startBtn.classList.add('bg-gray-600', 'hover:bg-gray-600');
    startBtn.innerHTML = '<i data-feather="loader" class="mr-2 animate-spin"></i> Initializing...';
    feather.replace();

    const cameraSuccess = await initCamera(); 

    if (!cameraSuccess) {
        isCounting = false;
        // UI reset after failure
        startBtn.disabled = false;
        startBtn.classList.remove('bg-gray-600', 'hover:bg-gray-600');
        startBtn.classList.add('bg-green-600', 'hover:bg-green-500');
        startBtn.innerHTML = '<i data-feather="play" class="mr-2"></i> Start';
        feather.replace();
        return;
    }

    startTimer();
    
    // UI: Running
    stopBtn.disabled = false;
    stopBtn.classList.remove('opacity-50');

    startBtn.classList.remove('bg-gray-600', 'hover:bg-gray-600');
    startBtn.classList.add('bg-yellow-600', 'hover:bg-yellow-500');
    startBtn.innerHTML = '<i data-feather="activity" class="mr-2"></i> Running';
    feather.replace();
});

stopBtn.addEventListener('click', () => {
    if (!isCounting) return;

    isCounting = false;
    stopTimer();
    if (mpCamera) {
        mpCamera.stop();
    }
    
    // UI: Paused
    startBtn.disabled = false;
    stopBtn.disabled = true;
    stopBtn.classList.add('opacity-50');
    
    startBtn.classList.add('bg-green-600', 'hover:bg-green-500');
    startBtn.classList.remove('bg-yellow-600', 'hover:bg-yellow-500');
    startBtn.innerHTML = '<i data-feather="play" class="mr-2"></i> Resume';
    feather.replace();
});

resetBtn.addEventListener('click', () => {
    isCounting = false;
    stopTimer();
    
    pushUpCount = 0;
    startTime = null;
    totalPauseDuration = 0;
    pauseStart = null;
    isDownPosition = false;

    counterElement.textContent = '0';
    timerElement.textContent = '00:00:00';
    ppmElement.textContent = '0';
    
    // UI: Reset
    startBtn.disabled = false;
    stopBtn.disabled = true;
    stopBtn.classList.add('opacity-50');

    startBtn.classList.add('bg-green-600', 'hover:bg-green-500');
    startBtn.classList.remove('bg-yellow-600', 'hover:bg-yellow-500');
    startBtn.innerHTML = '<i data-feather="play" class="mr-2"></i> Start';
    feather.replace();

    // Stop and clean camera stream
    if (mpCamera && video.srcObject) {
        mpCamera.stop();
        video.srcObject.getTracks().forEach(track => track.stop());
        video.srcObject = null;
        isCameraRunning = false;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    video.classList.remove('video-hidden'); 
    formFeedback.classList.add('hidden');
    angleIndicator.classList.add('hidden');
});

// Dummy listeners for theme/help buttons
document.getElementById('theme-toggle').addEventListener('click', () => { console.log("Theme toggle clicked"); });
document.getElementById('help-btn').addEventListener('click', () => {
    alert("AYUSH PUSHUP COUNTER Help: Ensure full body is visible. The counter tracks the elbow angle (160° UP, 90° DOWN) for a rep.");
});