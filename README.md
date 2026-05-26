# NeuroLimb AI — Self-Healing Smart Prosthetic Simulator

<div align="center">

![Status](https://img.shields.io/badge/status-active-34d399?style=for-the-badge)
![React](https://img.shields.io/badge/React-18.2-61dafb?style=for-the-badge&logo=react)
![Python](https://img.shields.io/badge/Python-3.9+-3776ab?style=for-the-badge&logo=python)
![License](https://img.shields.io/badge/license-MIT-a855f7?style=for-the-badge)

**An interactive simulation of a self-healing neural network for smart prosthetic limb control.**  
Demonstrates STDP learning, homeostatic regulation, structural plasticity, and neuromodulation — all in real time, without retraining.

[Live Demo](#running-locally) · [How It Works](#how-it-works) · [Architecture](#architecture) · [Features](#features)

</div>

---

## The Problem

> **12 million people** worldwide use upper-limb prosthetics.  
> **50% abandon them** within the first year — not because of mechanical failure, but because the AI controlling the device cannot adapt to:
> - Electrode drift caused by limb sweat
> - Changes in muscle signal over time
> - New users with different activation patterns

Traditional prosthetic controllers use **fixed neural networks** that require manual recalibration by a clinician every time signal quality degrades. This is expensive, inconvenient, and leads to device abandonment.

---

## Our Solution

**NeuroLimb AI** is a self-healing neural network controller inspired by biological brain plasticity mechanisms. When signal quality degrades, the system detects instability and automatically heals itself — no clinician, no retraining, no interruption.

```
EMG Signal → Neural Decoder → Motor Commands → Self-Healing Loop
     ↑                                                  ↓
  Electrodes ←←←←←← Homeostatic Feedback ←←←←←←←←←←←←
```

---

## Features

### 🧠 Neural Mechanisms
| Mechanism | What it does | Biological inspiration |
|---|---|---|
| **STDP** | Strengthens pathways that fire together | Hebbian learning |
| **Homeostasis** | Keeps neuron activity near target rate | Brain's self-regulation |
| **Structural Plasticity** | Prunes weak synapses, grows new ones during recovery | Synaptic remodeling |
| **Neuromodulation** | Reward signal amplifies correct gesture learning | Dopaminergic pathways |

### 🖥️ Simulator Features
- **Live prosthetic hand** — fingers curl/open in real time based on AI confidence
- **EMG waveform** — animated 4-channel surface electrode signal
- **Neural network visualization** — live synaptic weight activity
- **Gesture event log** — timestamped log of every phase transition
- **Finger confidence bars** — per-finger motor command confidence
- **Signal latency monitor** — shows live ms latency, "SIGNAL LOST" during disruption
- **Recovery modal** — dramatic popup when self-healing completes
- **Before vs After comparison** — traditional prosthetic vs NeuroLimb AI side by side
- **Energy comparison** — ANN (92mW) vs Fixed SNN (54mW) vs Adaptive SNN (18mW)
- **Presentation mode** — fullscreen hand + accuracy for projecting to judges
- **Auto Demo mode** — 60-second automated sequence, no clicking required

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        NEUROLIMB AI                             │
│                                                                 │
│  ┌─────────────┐    ┌──────────────────────────────────────┐    │
│  │  EMG Input  │    │         Neural Network               │    │
│  │             │    │                                      │    │
│  │  CH1 ──────────► │  [4 inputs] → [6] → [6] → [4 out]    │    │
│  │  CH2 ──────────► │                                      │    │
│  │  CH3 ──────────► │  STDP weight updates every 120ms     │    │
│  │  CH4 ──────────► │  Homeostasis scales every layer      │    │
│  │  @ 2kHz     │    │  Structural plasticity prunes/grows  │    │
│  └─────────────┘    └──────────────┬───────────────────────┘    │
│                                    │                            │
│                     ┌──────────────▼───────────────────────┐    │
│                     │         Motor Output                 │    │
│                     │                                      │    │
│                     │ Thumb │ Index │ Middle │ Ring │ Pinky│    │
│                     │      PWM servo control @ 50 Hz       │    │
│                     └──────────────┬───────────────────────┘    │
│                                    │                            │
│                     ┌──────────────▼───────────────────────┐    │
│                     │       Self-Healing Loop              │    │
│                     │                                      │    │
│                     │    Detect instability (acc < 30%)    │    │
│                     │  → Homeostatic weight rescaling      │    │
│                     │  → Structural plasticity (regrow)    │    │
│                     │  → Neuromodulation boost             │    │
│                     │  → Accuracy restored (no retraining) │    │
│                     └──────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## How It Works

### Phase 1 — Learning
The user puts on the prosthetic. Surface EMG electrodes detect muscle activation patterns. The STDP algorithm strengthens neural pathways that correspond to correct gestures. Accuracy climbs from 0% to ~95% over several seconds.

```
Pre-synaptic fires → Post-synaptic fires → Synapse strengthens (LTP)
Pre-synaptic fires → No post-synaptic  → Synapse weakens  (LTD)
```

### Phase 2 — Disruption
Electrode impedance shifts (from sweat, movement, or socket fit changes) corrupt the EMG signal. Synaptic weights drift. Motor commands become unreliable. Accuracy drops sharply.

This is why **50% of users abandon** their prosthetics — traditional systems have no recovery mechanism.

### Phase 3 — Self-Healing (Recovery)
The system detects instability (accuracy < 30%) and autonomously triggers:

1. **Homeostatic regulation** — rescales weights so average neuron activity returns to target (0.5)
2. **Structural plasticity** — regrows pruned synapses, removes corrupted connections
3. **Neuromodulation boost** — amplifies learning rate (λ = 1.5×) to accelerate recovery

Accuracy restores to ~90%+ in under 5 seconds. **Zero manual intervention.**

### Phase 4 — Stable / Adaptation
Once recovered, the system continues learning at a reduced rate (lr = 0.008), maintaining performance indefinitely. When a new user puts on the device, the disruption → recovery cycle repeats, adapting to their unique muscle patterns.

---

## Demo Flow

| Step | Action | What you see |
|---|---|---|
| 1 | Click **Start Learning** | Fingers begin curling, accuracy climbs, green connections strengthen |
| 2 | Click **Introduce Noise** | Hand sparks red, accuracy crashes, log shows "Signal disrupted" |
| 3 | Wait ~4 seconds | System auto-detects failure, cyan rings pulse, recovery begins |
| 4 | Watch recovery | Accuracy climbs back, recovery modal pops up with stats |
| 5 | Click **Change Pattern** | New user profile, disruption → recovery cycle repeats |
| OR | Click **▷ Run Full Demo** | Automated 60-second sequence runs hands-free |

---

## Project Structure

```
neurolimb-ai/
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main simulator — all neural network logic
│   │   ├── App.css          # Dark theme, animations, responsive grid
│   │   └── main.jsx         # React entry point
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── backend/
│   ├── main.py              # FastAPI server — same algorithms in Python/NumPy
│   └── requirements.txt     # fastapi, uvicorn, numpy
│
└── README.md
```

---

## Running Locally

### Frontend only (recommended for demo)

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### With Python backend (optional)

```bash
# Terminal 1 — Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
```

**Requirements:** Node.js 18+, Python 3.9+ (backend only)

---

## Key Algorithms

### STDP Weight Update
```python
# For each synapse connecting neuron i to neuron j:
Δw = η × λ × (pre_activation × post_activation − 0.01 × w) + noise

# η = learning rate (phase-dependent: 0.001–0.055)
# λ = neuromodulation factor (0.3 during disruption, 1.5 during recovery)
# noise = biological stochasticity
```

### Homeostatic Regulation
```python
# Keep average neuron firing rate near target (0.5)
mean_activation = average(layer_activations)
scale_factor = 1 + 0.05 × (0.5 − mean_activation)
weights × = scale_factor
```

### Structural Plasticity
```python
# During recovery: regrow dormant synapses
if phase == "recovery" and abs(weight) < 0.05:
    weight += random_small_value  # sprout new synapse

# During normal operation: prune unused synapses
if abs(weight) < 0.02 and random() < 0.01:
    weight = 0  # prune connection
```

---

## Energy Efficiency

| System | Power | Notes |
|---|---|---|
| Traditional ANN | ~92 mW | Always-on, fixed weights |
| Fixed SNN | ~54 mW | Sparse firing, but no adaptation |
| **NeuroLimb AI (Adaptive SNN)** | **~18 mW** | Prunes inactive synapses, scales with accuracy |

The adaptive system uses **80% less power** than a traditional ANN — critical for battery-powered wearable devices.

---

## Real-World Applicability

| Challenge in real prosthetics | How NeuroLimb AI solves it |
|---|---|
| Electrode drift from sweat | Homeostatic weight rescaling |
| Limb volume changes during day | Continuous STDP re-learning |
| New user onboarding | Disruption → recovery cycle adapts to new patterns |
| Battery life constraints | Structural plasticity reduces active synapses by ~40% |
| Clinician recalibration visits | Eliminated — system is fully autonomous |

---

## Technologies Used

| Layer | Technology |
|---|---|
| UI Framework | React 18 with Hooks |
| Styling | CSS Grid, custom animations |
| Neural visualization | HTML5 Canvas API |
| Charts | Canvas 2D (custom, no library) |
| EMG waveform | Web Animation API (requestAnimationFrame) |
| Sound | Web Audio API |
| Backend (optional) | FastAPI + NumPy |

---

## Team

Sarnitha R, Jerusalem college of Engineering

---

## License

MIT — free to use, modify, and present.

---

<div align="center">
<sub>Built with STDP · Homeostasis · Structural Plasticity · Neuromodulation</sub>
</div>
