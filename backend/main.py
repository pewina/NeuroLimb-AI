"""
Adaptive Assistive AI: Self-Healing Smart Prosthetic Simulator
=============================================================
Backend: FastAPI — Neural Network Simulation Engine

Architecture:
  - STDP (Spike-Timing-Dependent Plasticity) inspired weight updates
  - Homeostatic regulation: keeps average neuron activations near target
  - Structural plasticity: prunes weak connections, sprouts new ones during recovery
  - Neuromodulation: reward signal amplifies/dampens learning rate
  - User personalization: stores per-user gesture patterns
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
import time
from typing import Optional

app = FastAPI(title="Self-Healing Prosthetic AI", version="1.0")

# Allow frontend to connect (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# NEURAL NETWORK STATE
# ─────────────────────────────────────────────

LAYERS = [4, 6, 6, 4]   # Input → Hidden1 → Hidden2 → Output

class NeuralNetwork:
    """
    Simplified Spiking-inspired Neural Network with adaptive mechanisms.
    
    Weight updates follow STDP: pre-synaptic activity before post-synaptic 
    activity strengthens a connection (LTP), otherwise it weakens (LTD).
    """

    def __init__(self, layers=LAYERS):
        self.layers = layers
        self.reset()

    def reset(self):
        # Initialize weights using Xavier initialization
        self.weights = []
        for l in range(len(self.layers) - 1):
            fan_in = self.layers[l]
            fan_out = self.layers[l + 1]
            scale = np.sqrt(2.0 / (fan_in + fan_out))
            self.weights.append(
                np.random.randn(fan_in, fan_out) * scale
            )
        # Activations for each layer
        self.activations = [np.zeros(n) for n in self.layers]

        # Homeostasis: track running mean activation per layer
        self.running_means = [np.full(n, 0.5) for n in self.layers]

        # Structural plasticity mask (1=active synapse, 0=pruned)
        self.synaptic_masks = [np.ones_like(w) for w in self.weights]

        # History tracking
        self.weight_history = []
        self.tick = 0

    def sigmoid(self, x):
        return 1.0 / (1.0 + np.exp(-np.clip(x, -10, 10)))

    def forward(self, x):
        """Forward pass through the network."""
        self.activations[0] = np.clip(x, 0, 1)
        for l in range(len(self.weights)):
            # Apply synaptic mask (structural plasticity)
            effective_w = self.weights[l] * self.synaptic_masks[l]
            z = self.activations[l] @ effective_w
            self.activations[l + 1] = self.sigmoid(z)
        return self.activations[-1]

    def stdp_update(self, learning_rate: float, neuromod: float, noise_amp: float):
        """
        STDP-inspired weight update:
        Δw = η * λ * (pre * post - decay * w) + noise
        
        η = learning rate
        λ = neuromodulation factor (reward signal)
        """
        for l in range(len(self.weights)):
            pre  = self.activations[l]        # pre-synaptic
            post = self.activations[l + 1]    # post-synaptic

            # Hebbian / anti-Hebbian STDP
            dw = learning_rate * neuromod * (
                np.outer(pre, post) - 0.01 * self.weights[l]
            )

            # Biological noise
            noise = np.random.randn(*self.weights[l].shape) * noise_amp

            self.weights[l] += (dw + noise) * self.synaptic_masks[l]
            np.clip(self.weights[l], -1.0, 1.0, out=self.weights[l])

    def homeostasis(self):
        """
        Homeostatic regulation: scale weights so average neuron activity
        stays near the target rate (0.5). Prevents runaway excitation or
        complete silencing of neurons.
        """
        HOMEOSTASIS_TARGET = 0.5
        HOMEOSTASIS_RATE   = 0.05

        for l, act in enumerate(self.activations[:-1]):
            mean_act = float(np.mean(act))
            # Exponential moving average
            self.running_means[l] = 0.95 * self.running_means[l] + 0.05 * mean_act
            deviation = HOMEOSTASIS_TARGET - float(np.mean(self.running_means[l]))
            scale = 1.0 + HOMEOSTASIS_RATE * deviation
            self.weights[l] *= scale

    def structural_plasticity(self, phase: str):
        """
        Structural plasticity:
        - Prune: zero out synaptically inactive connections over time
        - Sprout: grow new connections during recovery phase
        """
        for l in range(len(self.weights)):
            abs_w = np.abs(self.weights[l])

            if phase == "recovery":
                # Sprout new synapses where weights are very small
                dormant = abs_w < 0.04
                sprout_mask = dormant & (np.random.rand(*abs_w.shape) < 0.05)
                self.synaptic_masks[l][sprout_mask] = 1
                self.weights[l][sprout_mask] += np.random.randn(*np.sum(sprout_mask).shape) * 0.05 if sprout_mask.any() else 0
            else:
                # Prune weak connections stochastically
                prune_mask = (abs_w < 0.02) & (np.random.rand(*abs_w.shape) < 0.01)
                self.synaptic_masks[l][prune_mask] = 0

    def weight_histogram(self, bins=20):
        """Return weight distribution as histogram."""
        all_w = np.concatenate([w.flatten() for w in self.weights])
        counts, edges = np.histogram(all_w, bins=bins, range=(-1.0, 1.0))
        return {
            "counts": counts.tolist(),
            "edges": [round(float(e), 2) for e in edges.tolist()],
        }

    def synapse_snapshot(self):
        """Return weights as nested list for visualization."""
        return [w.tolist() for w in self.weights]

    def activation_snapshot(self):
        return [a.tolist() for a in self.activations]


# ─────────────────────────────────────────────
# SIMULATION STATE
# ─────────────────────────────────────────────

# User gesture profiles (personalization mode)
USER_PROFILES = [
    {"id": 0, "name": "Alex R.",   "type": "Transradial Amputation",   "pattern": [0.8, 0.3, 0.7, 0.2]},
    {"id": 1, "name": "Maya S.",   "type": "Brachial Plexus Injury",   "pattern": [0.4, 0.9, 0.2, 0.6]},
    {"id": 2, "name": "Jordan K.", "type": "Congenital Limb Diff.",     "pattern": [0.6, 0.1, 0.5, 0.8]},
]

nn = NeuralNetwork()

sim = {
    "phase":          "idle",     # idle | learning | disruption | recovery | stable
    "tick":           0,
    "accuracy":       0.0,
    "error_rate":     1.0,
    "adapt_speed":    0.0,
    "stability":      0.0,
    "noise_level":    0.0,
    "current_user":   0,
    "neuromod":       1.0,        # neuromodulation factor
    "history": {
        "accuracy":   [],
        "error_rate": [],
        "adapt":      [],
        "ticks":      [],
    },
}


# ─────────────────────────────────────────────
# HELPER FUNCTIONS
# ─────────────────────────────────────────────

def get_user_pattern(user_id: int) -> np.ndarray:
    profile = USER_PROFILES[user_id % len(USER_PROFILES)]
    return np.array(profile["pattern"], dtype=float)


def compute_accuracy() -> float:
    """MSE-based accuracy against current user's target pattern."""
    target = get_user_pattern(sim["current_user"])
    output = nn.activations[-1]
    mse    = float(np.mean((target - output) ** 2))
    return float(np.clip(1.0 - mse * 2.5, 0.0, 1.0))


def run_simulation_step():
    """
    One simulation tick — called by every /train or /adapt request.
    Orchestrates forward pass → STDP → homeostasis → structural plasticity.
    """
    phase = sim["phase"]
    if phase == "idle":
        return

    user_pat = get_user_pattern(sim["current_user"])
    noise_in = (np.random.rand(len(user_pat)) - 0.5) * 0.05

    # Phase-specific parameters
    if phase == "learning":
        lr          = 0.04
        noise_amp   = 0.003
        sim["neuromod"]  = 1.2       # reward signal
        sim["stability"] = min(1.0, sim["stability"] + 0.015)

    elif phase == "disruption":
        lr          = 0.002
        noise_amp   = 0.20           # heavy corruption
        noise_in   += (np.random.rand(len(user_pat)) - 0.5) * sim["noise_level"] * 0.6
        sim["neuromod"]  = 0.3       # suppressed reward
        sim["stability"] = max(0.0, sim["stability"] - 0.04)
        sim["adapt_speed"] = min(999.0, sim["adapt_speed"] + 18.0)

    elif phase == "recovery":
        lr          = 0.055
        noise_amp   = 0.006
        sim["neuromod"]  = 1.5       # amplified to speed healing
        sim["stability"] = min(1.0, sim["stability"] + 0.025)
        sim["adapt_speed"] = max(0.0, sim["adapt_speed"] - 15.0)

    elif phase == "stable":
        lr          = 0.008
        noise_amp   = 0.002
        sim["neuromod"]  = 1.0
        sim["stability"] = min(1.0, sim["stability"] + 0.005)

    else:
        return

    # Forward pass with noisy input
    nn.forward(np.clip(user_pat + noise_in, 0.0, 1.0))

    # Weight update (STDP + neuromodulation)
    nn.stdp_update(lr, sim["neuromod"], noise_amp)

    # Homeostatic regulation
    nn.homeostasis()

    # Structural plasticity
    nn.structural_plasticity(phase)

    # Compute accuracy (smooth with momentum)
    raw_acc         = compute_accuracy()
    sim["accuracy"] = sim["accuracy"] * 0.7 + raw_acc * 0.3
    sim["error_rate"] = 1.0 - sim["accuracy"]
    sim["tick"]    += 1

    # Auto-transitions
    if phase == "disruption" and sim["accuracy"] < 0.30 and sim["tick"] > 15:
        sim["phase"] = "recovery"

    if phase == "recovery" and sim["accuracy"] > 0.88:
        sim["phase"] = "stable"

    # Record history (keep last 80 points)
    for key, val in [("accuracy", sim["accuracy"]*100),
                     ("error_rate", sim["error_rate"]*100),
                     ("adapt", min(100, sim["adapt_speed"] / 3))]:
        sim["history"][key].append(round(val, 1))
        if len(sim["history"][key]) > 80:
            sim["history"][key].pop(0)

    sim["history"]["ticks"].append(sim["tick"])
    if len(sim["history"]["ticks"]) > 80:
        sim["history"]["ticks"].pop(0)


# ─────────────────────────────────────────────
# API ENDPOINTS
# ─────────────────────────────────────────────

class TrainRequest(BaseModel):
    user_id: Optional[int] = None

class UserRequest(BaseModel):
    user_id: int


@app.get("/")
def root():
    return {"status": "ok", "message": "Adaptive Prosthetic AI backend running"}


@app.post("/train")
def train(req: TrainRequest = TrainRequest()):
    """
    Advance the learning phase by one simulation step.
    If idle, switches to learning automatically.
    """
    if req.user_id is not None:
        sim["current_user"] = req.user_id % len(USER_PROFILES)

    if sim["phase"] == "idle":
        sim["phase"] = "learning"

    run_simulation_step()

    return {
        "phase":        sim["phase"],
        "accuracy":     round(sim["accuracy"], 4),
        "error_rate":   round(sim["error_rate"], 4),
        "stability":    round(sim["stability"], 4),
        "adapt_speed":  round(sim["adapt_speed"], 1),
        "tick":         sim["tick"],
        "activations":  nn.activation_snapshot(),
        "weights_hist": nn.weight_histogram(),
    }


@app.post("/introduce_noise")
def introduce_noise():
    """
    Inject noise/drift into the system — simulates physical damage,
    electrode displacement, or limb volume changes in real prosthetics.
    """
    sim["phase"]       = "disruption"
    sim["noise_level"] = 0.85

    # Directly corrupt some weights (simulates hardware damage)
    for l in range(len(nn.weights)):
        noise_mask = np.random.rand(*nn.weights[l].shape) < 0.3
        nn.weights[l][noise_mask] += np.random.randn(*np.sum(noise_mask).shape) * 0.4

    run_simulation_step()

    return {
        "phase":      sim["phase"],
        "accuracy":   round(sim["accuracy"], 4),
        "noise_level": sim["noise_level"],
        "message":    "Noise injected. System detecting instability.",
    }


@app.post("/adapt")
def adapt():
    """
    Force recovery/adaptation mode. Also called automatically when
    the system detects low accuracy during disruption.
    """
    sim["phase"]       = "recovery"
    sim["noise_level"] = 0.0

    run_simulation_step()

    return {
        "phase":       sim["phase"],
        "accuracy":    round(sim["accuracy"], 4),
        "stability":   round(sim["stability"], 4),
        "adapt_speed": round(sim["adapt_speed"], 1),
        "message":     "Self-healing initiated. Structural plasticity active.",
    }


@app.post("/reset")
def reset():
    """Reset the entire system to initial state."""
    nn.reset()
    sim.update({
        "phase": "idle", "tick": 0,
        "accuracy": 0.0, "error_rate": 1.0,
        "adapt_speed": 0.0, "stability": 0.0,
        "noise_level": 0.0, "current_user": 0, "neuromod": 1.0,
        "history": {"accuracy":[], "error_rate":[], "adapt":[], "ticks":[]},
    })
    return {"status": "reset", "message": "System reset to initial state."}


@app.get("/metrics")
def metrics():
    """
    Return all current simulation metrics, history, and neural state.
    Used for polling by the frontend dashboard.
    """
    return {
        "phase":        sim["phase"],
        "tick":         sim["tick"],
        "accuracy":     round(sim["accuracy"] * 100, 1),
        "error_rate":   round(sim["error_rate"] * 100, 1),
        "adapt_speed":  round(sim["adapt_speed"], 1),
        "stability":    round(sim["stability"] * 100, 1),
        "noise_level":  sim["noise_level"],
        "neuromod":     round(sim["neuromod"], 2),
        "current_user": sim["current_user"],
        "user_profiles": USER_PROFILES,
        "history":      sim["history"],
        "weights_hist": nn.weight_histogram(),
        "activations":  nn.activation_snapshot(),
        "synapses":     nn.synapse_snapshot(),
        "energy": {
            "ann_mw":       92,
            "fixed_snn_mw": 54,
            "adaptive_snn_mw": round(18 + (12 if sim["phase"]=="disruption" else 0)
                                     - sim["accuracy"] * 5, 1),
        },
    }


@app.post("/set_user")
def set_user(req: UserRequest):
    """Switch active user profile (personalization mode)."""
    sim["current_user"] = req.user_id % len(USER_PROFILES)
    # Pattern change triggers disruption → recovery sequence
    if sim["phase"] not in ("idle", "disruption"):
        sim["phase"]       = "disruption"
        sim["noise_level"] = 0.5
    return {
        "status":       "user_switched",
        "current_user": sim["current_user"],
        "profile":      USER_PROFILES[sim["current_user"]],
    }
