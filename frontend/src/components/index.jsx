/**
 * AccuracyChart.jsx
 * Uses Chart.js to plot accuracy, error rate, and adaptation speed over time.
 */
import { useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";
Chart.register(...registerables);

export function AccuracyChart({ history }) {
  const accRef = useRef(null);
  const errRef = useRef(null);
  const accChart = useRef(null);
  const errChart = useRef(null);

  useEffect(() => {
    const base = {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 0 },
      plugins: { legend: { display: false } },
      scales: {
        x: { display: false },
        y: { ticks: { color: "#4a6080", font: { size: 9 } }, grid: { color: "#1e2d4a", lineWidth: 0.5 } },
      },
    };

    accChart.current = new Chart(accRef.current, {
      type: "line",
      data: {
        labels: [],
        datasets: [{
          label: "Accuracy", data: [],
          borderColor: "#00ff9d", backgroundColor: "rgba(0,255,157,0.05)",
          borderWidth: 2, pointRadius: 0, fill: true, tension: 0.4,
        }],
      },
      options: { ...base, scales: { ...base.scales, y: { ...base.scales.y, min: 0, max: 100 } } },
    });

    errChart.current = new Chart(errRef.current, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          { label: "Error", data: [], borderColor: "#ff4d6d", borderWidth: 2, pointRadius: 0, tension: 0.4, borderDash: [4, 2] },
          { label: "Adapt", data: [], borderColor: "#ffb800", borderWidth: 1.5, pointRadius: 0, tension: 0.4 },
        ],
      },
      options: { ...base, scales: { ...base.scales, y: { ...base.scales.y, min: 0 } } },
    });

    return () => { accChart.current?.destroy(); errChart.current?.destroy(); };
  }, []);

  useEffect(() => {
    if (!history || !accChart.current) return;
    const labels = history.ticks ?? [];
    accChart.current.data.labels = labels;
    accChart.current.data.datasets[0].data = history.accuracy ?? [];
    accChart.current.update("none");

    errChart.current.data.labels = labels;
    errChart.current.data.datasets[0].data = history.error_rate ?? [];
    errChart.current.data.datasets[1].data = history.adapt ?? [];
    errChart.current.update("none");
  }, [history]);

  return (
    <>
      <div className="card">
        <div className="card-title">Accuracy Over Time</div>
        <div style={{ position: "relative", height: 150 }}>
          <canvas ref={accRef} role="img" aria-label="Accuracy over time chart" />
        </div>
      </div>
      <div className="card">
        <div className="card-title">Error Rate &amp; Adaptation Speed</div>
        <div style={{ position: "relative", height: 150 }}>
          <canvas ref={errRef} role="img" aria-label="Error rate and adaptation speed chart" />
        </div>
      </div>
    </>
  );
}

/**
 * EnergyPanel.jsx
 * Shows comparative power consumption: ANN vs Fixed SNN vs Adaptive SNN
 */
export function EnergyPanel({ energy }) {
  const ann  = energy?.ann_mw ?? 92;
  const snn  = energy?.fixed_snn_mw ?? 54;
  const asnn = energy?.adaptive_snn_mw ?? 18;
  const max  = Math.max(ann, snn, asnn, 1);

  const rows = [
    { label: "ANN",         val: ann,  color: "#ff4d6d" },
    { label: "Fixed SNN",   val: snn,  color: "#ffb800" },
    { label: "Adaptive SNN",val: asnn, color: "#00ff9d" },
  ];

  return (
    <div className="card">
      <div className="card-title">Energy Efficiency</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map(({ label, val, color }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11 }}>
            <div style={{ width: 80, color: "#8ba0c4", flexShrink: 0 }}>{label}</div>
            <div style={{ flex: 1, height: 8, background: "#141c30", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ width: `${(val / max) * 100}%`, height: "100%", background: color, borderRadius: 4, transition: "width 1s ease" }} />
            </div>
            <div style={{ width: 36, textAlign: "right", fontFamily: "monospace", fontSize: 10, color: "#8ba0c4" }}>{val} mW</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 10, color: "#4a6080", marginTop: 10 }}>
        Our system uses <span style={{ color: "#00ff9d", fontWeight: 600 }}>80% less power</span> than traditional ANNs
      </div>
    </div>
  );
}

/**
 * ControlPanel.jsx
 * Buttons for controlling the simulation flow.
 */
export function ControlPanel({ phase, onStart, onNoise, onChange, onReset, onToggleUser, userMode }) {
  const isIdle = phase === "idle";
  const canDisrupt = !isIdle;

  return (
    <div className="card">
      <div className="card-title">Control Panel</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button className="btn btn-start" onClick={onStart} disabled={!isIdle}>▶ Start Learning</button>
        <button className="btn btn-noise" onClick={onNoise} disabled={!canDisrupt}>⚡ Introduce Noise</button>
        <button className="btn btn-change" onClick={onChange} disabled={!canDisrupt}>⟳ Change Pattern</button>
        <button className="btn btn-reset" onClick={onReset}>↺ Reset System</button>
        <button className="btn btn-user" onClick={onToggleUser}>◈ {userMode ? "Disable" : "Enable"} User Mode</button>
      </div>
    </div>
  );
}

/**
 * MetricsRow.jsx
 * Four summary metric cards shown across the top.
 */
export function MetricsRow({ metrics }) {
  const cards = [
    { label: "Accuracy",   value: `${metrics?.accuracy ?? 0}%`,       color: "#00ff9d", pct: metrics?.accuracy ?? 0 },
    { label: "Error Rate", value: `${metrics?.error_rate ?? 100}%`,    color: "#ff4d6d", pct: metrics?.error_rate ?? 100 },
    { label: "Adaptation", value: `${metrics?.adapt_speed ?? 0}ms`,    color: "#ffb800", pct: Math.min(100, (metrics?.adapt_speed ?? 0) / 10) },
    { label: "Stability",  value: `${metrics?.stability ?? 0}%`,       color: "#00d4ff", pct: metrics?.stability ?? 0 },
  ];

  return (
    <div className="metrics-row">
      {cards.map(({ label, value, color, pct }) => (
        <div key={label} className="metric">
          <div className="metric-label">{label}</div>
          <div className="metric-value" style={{ color }}>{value}</div>
          <div className="metric-bar" style={{ background: color, width: `${pct}%` }} />
        </div>
      ))}
    </div>
  );
}

/**
 * PhaseExplainer.jsx
 * Bottom explanation strip — explains what's happening in each phase.
 */
export function PhaseExplainer({ phase }) {
  const phases = [
    { id: "idle",       icon: "◎", color: "#8ba0c4", title: "Idle",       text: "System initialized. Weights randomized. Awaiting gesture input." },
    { id: "learning",   icon: "▲", color: "#00ff9d", title: "Learning",   text: "STDP rules strengthen pathways. Neuromodulation rewards correct gestures. Accuracy climbs." },
    { id: "disruption", icon: "⚡", color: "#ff4d6d", title: "Disruption", text: "Noise/drift corrupts synaptic weights. Accuracy drops. System detects instability." },
    { id: "recovery",   icon: "↺", color: "#00d4ff", title: "Recovery",   text: "Homeostatic regulation fires. Structural plasticity grows new connections. Self-healing begins." },
  ];

  return (
    <div className="card explain-card">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
        {phases.map(p => (
          <div key={p.id} className={`explain-phase${(phase === p.id || (phase === "stable" && p.id === "recovery")) ? " active" : ""}`}
               style={{ borderColor: (phase === p.id) ? p.color : undefined }}>
            <div className="explain-icon" style={{ background: `${p.color}1a`, color: p.color }}>{p.icon}</div>
            <div>
              <div className="explain-title" style={{ color: p.color }}>{p.title}</div>
              <div className="explain-text">{p.text}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * UserProfiles.jsx
 * Personalization panel — switch between simulated user gesture profiles.
 */
export function UserProfiles({ profiles, current, onSelect }) {
  const avatarColors = ["#a855f7", "#3b82f6", "#00ff9d"];

  return (
    <div className="card">
      <div className="card-title">Personalization Mode</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {profiles.map((u, i) => (
          <div key={u.id} className={`profile${i === current ? " active" : ""}`} onClick={() => onSelect(i)}
               style={{ borderColor: i === current ? avatarColors[i] : undefined }}>
            <div className="profile-avatar" style={{ background: `${avatarColors[i]}22`, color: avatarColors[i] }}>
              {u.name[0]}
            </div>
            <div>
              <div className="profile-name">{u.name}</div>
              <div className="profile-type">{u.type}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
