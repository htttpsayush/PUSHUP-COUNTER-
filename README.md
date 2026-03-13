<div align="center">

# 💪 PushUp Counter

### AI-Powered real-time push-up tracking using your webcam

<br/>

<img src="https://img.shields.io/badge/STATUS-LIVE-00d4ff?style=for-the-badge&labelColor=0a0a0a" />
<img src="https://img.shields.io/badge/VERSION-1.0.0-3b82f6?style=for-the-badge&labelColor=0a0a0a" />
<img src="https://img.shields.io/badge/AI-MediaPipe_Pose-6366f1?style=for-the-badge&labelColor=0a0a0a" />
<img src="https://img.shields.io/badge/PART_OF-Pulse_Ai-22d3a5?style=for-the-badge&labelColor=0a0a0a" />

<br/><br/>

**[🚀 Live Demo](https://pushup-counter-nine.vercel.app/)** &nbsp;·&nbsp; **[🗺️ Roadmap](#-roadmap--part-of-something-bigger)**

<br/>

</div>

---

## 📌 What is this?

**PushUp Counter** is a browser-based fitness tracker that uses your webcam and AI pose detection to automatically count push-up repetitions in real time — no hardware, no app install, just open and go.

> 🚧 **Note:** This is **Module 1** of a complete AI-powered fitness application I'm building. This is just the beginning — see the [Roadmap](#-roadmap--part-of-something-bigger) for what's coming next.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🎯 **AI Pose Detection** | Google MediaPipe Pose tracks 33 body landmarks in real time |
| 📐 **Elbow Angle Tracking** | Measures elbow joint angle frame-by-frame for accurate rep counting |
| 🔢 **Auto Rep Counter** | Counts reps on DOWN (< 90°) → UP (> 160°) transition |
| ⏱️ **Live Timer** | Tracks workout duration with pause/resume support |
| ⚡ **RPM Metric** | Reps-per-minute calculated live |
| 🎨 **Glassmorphism UI** | Modern frosted-glass design with Electric Blue accent |
| 📱 **Responsive** | Works on desktop and mobile browsers |
| 🔊 **Audio Feedback** | Beep sound on every counted rep |

---

## 🖥️ Demo

🔗 **Live:** [https://pushup-counter-nine.vercel.app/](https://pushup-counter-nine.vercel.app/)

> Works best in **Google Chrome** or **Edge** on desktop. Allow camera permission when prompted.

---

## 🧠 How It Works

```
Webcam Feed
    │
    ▼
MediaPipe Pose  ──►  33 Landmark Points (x, y, visibility)
    │
    ▼
Extract Right Arm:  Shoulder [12] → Elbow [14] → Wrist [16]
    │
    ▼
Calculate Elbow Angle  (using atan2 vector math)
    │
    ├──  angle < 90°   →  DOWN position detected  ✓
    │
    └──  angle > 160°  →  REP COUNTED  🔥  (only after DOWN)
```

The counter uses a **two-phase state machine** to avoid false positives:
- Phase 1 — Elbow must go **below 90°** (arm bent, body lowered)
- Phase 2 — Elbow must then go **above 160°** (arm extended, body raised)
- Only then is 1 rep counted ✅

---

## 🚀 Getting Started

### Option 1 — Use Live Demo
Just visit **[https://pushup-counter-nine.vercel.app/](https://pushup-counter-nine.vercel.app/)** — no setup needed.

### Option 2 — Run Locally

```bash
# 1. Clone the repo
git clone https://github.com/httpsayush/PUSHUP-COUNTER-.git

# 2. Navigate to project folder
cd PUSHUP-COUNTER-

# 3. Open with any local server (e.g. VS Code Live Server)
#    OR use Python's built-in server:
python -m http.server 8080

# 4. Open in browser
# http://localhost:8080
```

> ⚠️ Must be served over HTTP/HTTPS — camera access won't work with `file://` protocol.

---

## 📁 Project Structure

```
PUSHUP-COUNTER-/
│
├── index.html      # App layout & structure
├── styles.css      # Glassmorphism UI — CSS variables, animations
├── script.js       # Core logic — MediaPipe, angle math, rep counting
└── README.md       # You are here
```

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| **HTML5 / CSS3 / Vanilla JS** | Core structure, styling, logic |
| **[MediaPipe Pose](https://google.github.io/mediapipe/solutions/pose)** | AI body landmark detection |
| **[Syne](https://fonts.google.com/specimen/Syne) + [Inter](https://fonts.google.com/specimen/Inter)** | Typography |
| **CSS Glassmorphism** | `backdrop-filter`, blur, transparent layers |
| **Vercel** | Deployment & hosting |

---

## 📐 Pose Landmarks Used

```
MediaPipe Pose Landmark Indices (Right Arm):

  [12] Right Shoulder ──┐
                        │  ← angle calculated at [14]
  [14] Right Elbow   ───┤
                        │
  [16] Right Wrist   ───┘
```

---

## ⚙️ Configuration

You can tweak these constants inside `script.js`:

```javascript
const GOAL           = 20;   // Rep goal (progress ring target)
const MIN_DOWN_ANGLE = 90;   // Elbow angle threshold for "down" position
const MIN_UP_ANGLE   = 160;  // Elbow angle threshold for "up" / rep complete
```

---

## 🗺️ Roadmap — Part of Something Bigger

> 🚧 **This PushUp Counter is just the beginning.**

I'm building a **complete AI-powered Fitness Application** — and this is **Module 1** of that system. Here's what's coming:

```
FitAI — Complete Fitness Suite
│
├── ✅  Module 1 — Push-Up Counter      (this repo — DONE)
│
├── 🔜  Module 2 — Squat Counter        (knee angle tracking)
├── 🔜  Module 3 — Plank Timer          (hip angle posture detection)
├── 🔜  Module 4 — Bicep Curl Counter   (wrist + elbow tracking)
│
├── 🔮  Dashboard — Workout history, streaks, calories burned
├── 🔮  User Profiles — Login, personal goals, progress charts
├── 🔮  AI Form Coach — Real-time bad-form detection & correction tips
├── 🔮  Voice Feedback — Spoken rep counts & coaching cues
└── 🔮  Mobile App — React Native version
```

**The vision:** One app, all exercises, AI coaching — accessible entirely through your browser camera.

> ⭐ Star this repo to follow the journey!

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

```bash
# Fork the repo → make changes → open a Pull Request
```

Areas where help is needed:
- 🧪 Testing across different lighting conditions
- 📱 Mobile responsiveness improvements
- 🏋️ Adding support for more exercise types
- 🌐 Internationalization (i18n)

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

## 👨‍💻 Author

**Ayush**

[![GitHub](https://img.shields.io/badge/GitHub-httpsayush-181717?style=flat-square&logo=github)](https://github.com/httpsayush)

---

<div align="center">

**If this project helped you, drop a ⭐ — it means a lot!**

<br/>

*PushUp Counter — Module 1 of the upcoming FitAI Suite*

</div>
