/**
 * NeuralCanvas.jsx
 * ─────────────────
 * Renders the live neural network visualization using HTML5 Canvas.
 *
 * Visual encoding:
 *  - Node size    = activation strength
 *  - Node glow    = high activation (> 0.5)
 *  - Edge color   = phase (green=learning, red=disruption, cyan=recovery)
 *  - Edge width   = absolute weight magnitude
 *  - Edge opacity = weight strength (weak connections fade out)
 */

import { useRef, useEffect } from "react";

const LAYERS = [4, 6, 6, 4];
const LAYER_NAMES = ["Input\nGesture", "Hidden\nL1", "Hidden\nL2", "Output\nMotor"];

const PHASE_COLORS = {
  idle:       "#4a6080",
  learning:   "#00ff9d",
  disruption: "#ff4d6d",
  recovery:   "#00d4ff",
  stable:     "#00d4ff",
};

export default function NeuralCanvas({ weights, activations, phase }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const W = canvas.offsetWidth;
    const H = 300;
    canvas.width  = W;
    canvas.height = H;

    const ctx  = canvas.getContext("2d");
    const pc   = PHASE_COLORS[phase] ?? "#4a6080";

    ctx.clearRect(0, 0, W, H);

    // Build node positions
    const nodePos = LAYERS.map((n, l) => {
      const x = (l + 1) * (W / (LAYERS.length + 1));
      return Array.from({ length: n }, (_, i) => ({
        x,
        y: (i + 1) * (H / (n + 1)),
      }));
    });

    // ── Draw connections ──────────────────────────────────────────
    if (weights) {
      for (let l = 0; l < LAYERS.length - 1; l++) {
        for (let i = 0; i < LAYERS[l]; i++) {
          for (let j = 0; j < LAYERS[l + 1]; j++) {
            const w   = weights[l]?.[i]?.[j] ?? 0;
            const abs = Math.abs(w);
            if (abs < 0.04) continue;  // skip pruned connections

            const a1 = nodePos[l][i];
            const a2 = nodePos[l + 1][j];

            ctx.beginPath();
            ctx.moveTo(a1.x, a1.y);
            ctx.lineTo(a2.x, a2.y);

            // Color by phase and weight strength
            if (phase === "disruption") {
              ctx.strokeStyle = abs > 0.3
                ? `rgba(255,77,109,${Math.min(0.8, abs)})`
                : `rgba(255,184,0,${Math.min(0.5, abs * 1.5)})`;
            } else if (phase === "recovery") {
              ctx.strokeStyle = abs > 0.3
                ? `rgba(0,212,255,${Math.min(0.8, abs)})`
                : `rgba(0,255,157,${Math.min(0.4, abs * 1.5)})`;
            } else {
              const g = Math.floor(abs * 255);
              ctx.strokeStyle = abs > 0.3
                ? `rgba(0,${g},${Math.floor(g * 0.6)},${Math.min(0.8, abs)})`
                : `rgba(30,45,74,${Math.min(0.6, abs * 2)})`;
            }

            ctx.lineWidth = Math.min(2.5, abs * 3);
            ctx.stroke();
          }
        }
      }
    }

    // ── Draw nodes ────────────────────────────────────────────────
    nodePos.forEach((layer, l) => {
      layer.forEach((n, i) => {
        const act = activations?.[l]?.[i] ?? 0;
        const r   = 10 + act * 5;

        // Glow for active nodes
        if (act > 0.4) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, r + 4, 0, Math.PI * 2);
          ctx.fillStyle = `${pc}22`;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);

        const grad = ctx.createRadialGradient(n.x - 2, n.y - 2, 0, n.x, n.y, r);
        grad.addColorStop(0, act > 0.4 ? `${pc}cc` : act > 0.2 ? "#243558" : "#141c30");
        grad.addColorStop(1, act > 0.4 ? `${pc}44` : "#0f1525");

        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = act > 0.4 ? pc : act > 0.2 ? "#243558" : "#1e2d4a";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
    });

    // ── Layer labels ──────────────────────────────────────────────
    ctx.font      = "10px DM Sans, sans-serif";
    ctx.textAlign = "center";
    nodePos.forEach((layer, l) => {
      ctx.fillStyle = "#4a6080";
      LAYER_NAMES[l].split("\n").forEach((line, li, arr) => {
        ctx.fillText(line, nodePos[l][0].x, H - 14 + (li - arr.length) * 12);
      });
    });
  }, [weights, activations, phase]);

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: 300, borderRadius: 8 }} />
      <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
        {[
          { color: "#00ff9d", label: "Strong connection" },
          { color: "#ff4d6d", label: "Disrupted" },
          { color: "#00d4ff", label: "Recovering" },
          { color: "#1e2d4a", label: "Weak/pruned" },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "#4a6080" }}>
            <div style={{ width: 12, height: 3, borderRadius: 2, background: color }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
