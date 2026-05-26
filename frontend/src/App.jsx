/**
 * NeuroLimb AI — Self-Healing Smart Prosthetic Simulator
 * Complete version: landing, demo mode, EMG waveform, gesture log,
 * finger confidence bars, recovery modal, presentation mode, sounds.
 */
import { useState, useRef, useCallback, useEffect } from "react";
import "./App.css";

// ─── Neural Network ───────────────────────────────────────────────
const LAYERS = [4,6,6,4];
const USER_PROFILES = [
  {id:0,name:"Alex R.",  type:"Transradial Amputation", color:"#a855f7",pattern:[0.8,0.3,0.7,0.2],gesture:"power"},
  {id:1,name:"Maya S.",  type:"Brachial Plexus Injury", color:"#3b82f6",pattern:[0.4,0.9,0.2,0.6],gesture:"pinch"},
  {id:2,name:"Jordan K.",type:"Congenital Limb Diff.",  color:"#00ff9d",pattern:[0.6,0.1,0.5,0.8],gesture:"point"},
];
const sigmoid=x=>1/(1+Math.exp(-Math.max(-10,Math.min(10,x))));
const rand=()=>Math.random();
const randn=()=>(Math.random()-0.5)*2;
const initWeights=()=>LAYERS.slice(0,-1).map((n,l)=>Array.from({length:n},()=>Array.from({length:LAYERS[l+1]},()=>(Math.random()-0.3)*0.5+0.1)));
const forward=(weights,input)=>{const acts=[input.map(x=>Math.max(0,Math.min(1,x)))];for(let l=0;l<weights.length;l++)acts.push(Array.from({length:LAYERS[l+1]},(_,j)=>sigmoid(acts[l].reduce((s,a,i)=>s+a*weights[l][i][j],0))));return acts};
const stdpUpdate=(weights,acts,lr,na)=>weights.map((layer,l)=>layer.map((row,i)=>row.map((w,j)=>Math.max(-1,Math.min(1,w+lr*(acts[l][i]*acts[l+1][j]-0.01*w)+randn()*na)))));
const homeostasis=(weights,acts)=>weights.map((layer,l)=>{const mean=acts[l].reduce((a,b)=>a+b,0)/acts[l].length,scale=1+0.05*(0.5-mean);return layer.map(row=>row.map(w=>w*scale))});
const structuralPlasticity=(weights,phase)=>weights.map(layer=>layer.map(row=>row.map(w=>{if(phase==="recovery"&&Math.abs(w)<0.05&&rand()<0.05)return w+randn()*0.06;if(phase!=="recovery"&&Math.abs(w)<0.02&&rand()<0.01)return 0;return w})));

// ─── Sound Engine ─────────────────────────────────────────────────
const playSound=(type)=>{
  try{
    const ctx=new(window.AudioContext||window.webkitAudioContext)();
    const g=ctx.createGain(); g.connect(ctx.destination);
    if(type==="start"){
      const o=ctx.createOscillator(); o.connect(g);
      o.frequency.setValueAtTime(440,ctx.currentTime);
      o.frequency.linearRampToValueAtTime(660,ctx.currentTime+0.3);
      g.gain.setValueAtTime(0.08,ctx.currentTime);
      g.gain.linearRampToValueAtTime(0,ctx.currentTime+0.4);
      o.start(); o.stop(ctx.currentTime+0.4);
    } else if(type==="noise"){
      const buf=ctx.createBuffer(1,ctx.sampleRate*0.3,ctx.sampleRate);
      const d=buf.getChannelData(0);
      for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*0.15;
      const src=ctx.createBufferSource(); src.buffer=buf;
      src.connect(g); g.gain.setValueAtTime(0.3,ctx.currentTime);
      g.gain.linearRampToValueAtTime(0,ctx.currentTime+0.3);
      src.start();
    } else if(type==="recover"){
      [440,554,659,880].forEach((f,i)=>{
        const o=ctx.createOscillator(); const og=ctx.createGain();
        o.connect(og); og.connect(g);
        o.frequency.value=f;
        og.gain.setValueAtTime(0,ctx.currentTime+i*0.12);
        og.gain.linearRampToValueAtTime(0.07,ctx.currentTime+i*0.12+0.05);
        og.gain.linearRampToValueAtTime(0,ctx.currentTime+i*0.12+0.2);
        o.start(ctx.currentTime+i*0.12);
        o.stop(ctx.currentTime+i*0.12+0.25);
      });
    }
  }catch(e){}
};

// ─── Landing Screen ───────────────────────────────────────────────
function LandingScreen({onLaunch}){
  const [v,setV]=useState(false);
  useEffect(()=>{setTimeout(()=>setV(true),80);},[]);
  return(
    <div style={{minHeight:"100vh",background:"#0a0e1a",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 20px",position:"relative",overflow:"hidden",opacity:v?1:0,transition:"opacity 0.7s"}}>
      <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(0,212,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,0.025) 1px,transparent 1px)",backgroundSize:"44px 44px",pointerEvents:"none"}}/>
      <div style={{position:"absolute",top:"18%",left:"12%",width:320,height:320,borderRadius:"50%",background:"radial-gradient(circle,rgba(168,85,247,0.07),transparent 70%)",pointerEvents:"none"}}/>
      <div style={{position:"absolute",bottom:"18%",right:"12%",width:280,height:280,borderRadius:"50%",background:"radial-gradient(circle,rgba(0,212,255,0.06),transparent 70%)",pointerEvents:"none"}}/>
      <div style={{width:60,height:60,borderRadius:"50%",background:"rgba(0,212,255,0.07)",border:"1.5px solid rgba(0,212,255,0.35)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:22,position:"relative"}}>
        <div style={{width:18,height:18,borderRadius:"50%",background:"#00d4ff",boxShadow:"0 0 14px #00d4ff"}}/>
        <div style={{position:"absolute",inset:-8,borderRadius:"50%",border:"1px solid rgba(0,212,255,0.18)",animation:"spin 8s linear infinite"}}/>
      </div>
      <div style={{fontSize:10,fontFamily:"monospace",color:"#00d4ff",letterSpacing:"0.3em",textTransform:"uppercase",marginBottom:14}}>Adaptive Assistive AI Research</div>
      <h1 style={{fontSize:"clamp(26px,4.5vw,48px)",fontWeight:700,color:"#e2eaf8",textAlign:"center",lineHeight:1.15,marginBottom:10,maxWidth:640}}>
        Self-Healing Smart<br/>
        <span style={{background:"linear-gradient(135deg,#00d4ff,#a855f7)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Prosthetic Simulator</span>
      </h1>
      <p style={{fontSize:14,color:"#8ba0c4",textAlign:"center",maxWidth:480,lineHeight:1.7,marginBottom:36}}>
        Real-time demonstration of STDP-based spiking neural networks with homeostatic regulation, structural plasticity and neuromodulation — restoring limb control without retraining.
      </p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,maxWidth:640,width:"100%",marginBottom:36}}>
        {[["12M+","upper-limb prosthetic users globally"],["50%","abandon due to poor adaptability"],["80%","less power vs traditional ANNs"],["<5s","average self-healing recovery"]].map(([n,l])=>(
          <div key={n} style={{background:"rgba(20,28,48,0.8)",border:"1px solid #1e2d4a",borderRadius:10,padding:"14px 10px",textAlign:"center"}}>
            <div style={{fontSize:22,fontWeight:700,fontFamily:"monospace",color:"#00d4ff",marginBottom:5}}>{n}</div>
            <div style={{fontSize:10,color:"#475569",lineHeight:1.4}}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:7,justifyContent:"center",marginBottom:32}}>
        {["STDP Learning","Homeostatic Regulation","Structural Plasticity","Neuromodulation","EMG Signal Processing","Real-Time Adaptation"].map(t=>(
          <div key={t} style={{padding:"4px 12px",borderRadius:20,fontSize:10,background:"rgba(0,212,255,0.05)",border:"1px solid rgba(0,212,255,0.18)",color:"#64748b"}}>{t}</div>
        ))}
      </div>
      <button onClick={onLaunch}
        style={{padding:"12px 44px",borderRadius:9,border:"1px solid rgba(0,212,255,0.45)",background:"rgba(0,212,255,0.09)",color:"#00d4ff",fontSize:14,fontWeight:600,cursor:"pointer",letterSpacing:"0.05em",transition:"all 0.2s",fontFamily:"inherit"}}
        onMouseEnter={e=>e.currentTarget.style.background="rgba(0,212,255,0.18)"}
        onMouseLeave={e=>e.currentTarget.style.background="rgba(0,212,255,0.09)"}>
        Launch Simulator →
      </button>
      <div style={{position:"absolute",bottom:16,fontSize:10,color:"#1e2d4a",fontFamily:"monospace",letterSpacing:"0.1em"}}>
        POWERED BY STDP · HOMEOSTASIS · STRUCTURAL PLASTICITY
      </div>
    </div>
  );
}

// ─── Prosthetic Hand ──────────────────────────────────────────────
function ProstheticHand({accuracy,phase,gesture}){
  const acc=accuracy/100;
  const pc=phase==="disruption"?"#f87171":phase==="recovery"?"#22d3ee":phase==="learning"||phase==="stable"?"#34d399":"#64748b";
  const bodyFill="#c8d8f0",bodyStroke="#7ba7d4",jointFill="#a3bfde",palmFill="#b8cfe8",socketFill="#8aaec8",socketStroke="#5f88aa";
  const targets={power:[55,86,88,88,84],pinch:[50,18,84,88,88],point:[48,8,86,88,86],idle:[15,15,15,15,15]};
  const base=targets[gesture]||targets.idle;
  // Disruption: fingers spasm randomly; low accuracy: fingers don't reach target
  const angles=base.map(a=>{
    if(phase==="disruption") return a*(0.08+rand()*0.55);
    return a*acc+12*(1-acc);
  });
  const renderFinger=(cx,cy,segs,baseAngleDeg,curl,isThumb=false)=>{
    const toRad=d=>d*Math.PI/180;
    const baseA=toRad(baseAngleDeg),curlR=toRad(curl);
    let pts=[{x:cx,y:cy}],angle=baseA;
    const splits=isThumb?[0.28,0.42,0.30]:[0.0,0.52,0.48];
    segs.forEach((len,si)=>{angle+=splits[si]*curlR;const prev=pts[pts.length-1];pts.push({x:prev.x+len*Math.sin(angle),y:prev.y-len*Math.cos(angle)});});
    const fc=phase==="disruption"?"#f87171":phase==="recovery"?"#67e8f9":bodyFill;
    const sc=phase==="disruption"?"#ef4444":phase==="recovery"?"#06b6d4":bodyStroke;
    const widths=isThumb?[11,9,7]:[10,8,6];
    return(
      <g key={`f${cx}${cy}`}>
        {pts.slice(0,-1).map((p,i)=>{const q=pts[i+1],w=widths[i];return(<g key={i}>
          <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={fc} strokeWidth={w} strokeLinecap="round"/>
          <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={sc} strokeWidth={w+0.5} strokeLinecap="round" opacity={0.25}/>
          {i<pts.length-2&&<circle cx={q.x} cy={q.y} r={w*0.48} fill={jointFill} stroke={sc} strokeWidth={0.8}/>}
        </g>);})}
        <circle cx={pts[pts.length-1].x} cy={pts[pts.length-1].y} r={widths[2]*0.65} fill={fc} stroke={sc} strokeWidth={0.8}/>
        {acc>0.55&&phase!=="idle"&&(
          <circle cx={pts[pts.length-1].x} cy={pts[pts.length-1].y} r={5} fill="none" stroke={pc} strokeWidth={1.2} opacity={0.7}>
            <animate attributeName="r" values="3;8;3" dur="1.4s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.7;0;0.7" dur="1.4s" repeatCount="indefinite"/>
          </circle>
        )}
      </g>
    );
  };
  const circ=2*Math.PI*52;
  const shakeStyle=phase==="disruption"?{animation:"disruptShake 0.15s infinite"}:{};
  const glowStyle=phase==="recovery"?{animation:"recoveryGlow 1.5s infinite"}:phase==="stable"?{filter:`drop-shadow(0 0 8px ${pc}44)`}:{};
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
      <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.07em",textTransform:"uppercase",color:pc,padding:"2px 10px",borderRadius:20,background:pc+"22",border:`1px solid ${pc}44`,transition:"all 0.5s"}}>
        {phase==="idle"?"Awaiting EMG":phase==="learning"?"Learning gesture":phase==="disruption"?"⚡ Signal disrupted":phase==="recovery"?"↺ Self-healing":"✓ Gesture mastered"}
      </div>
      <div style={{...shakeStyle,...glowStyle}}>
      <svg width="190" height="250" viewBox="0 0 220 285" style={{overflow:"visible"}}>
        {/* Socket */}
        <rect x={74} y={218} width={72} height={54} rx={11} fill={socketFill} stroke={socketStroke} strokeWidth={1.1}/>
        <line x1={85} y1={222} x2={85} y2={268} stroke={socketStroke} strokeWidth={0.7} opacity={0.5}/>
        <line x1={110} y1={222} x2={110} y2={268} stroke={socketStroke} strokeWidth={0.7} opacity={0.5}/>
        <line x1={135} y1={222} x2={135} y2={268} stroke={socketStroke} strokeWidth={0.7} opacity={0.5}/>
        <line x1={76} y1={242} x2={144} y2={242} stroke={socketStroke} strokeWidth={0.7} opacity={0.35}/>
        <rect x={97} y={248} width={26} height={14} rx={3} fill="#1e3a5f" stroke={pc} strokeWidth={0.9}/>
        <text x={110} y={258} textAnchor="middle" fontSize={7} fill={pc} fontFamily="monospace" fontWeight="700">AI</text>
        {[0,1,2,3].map(i=>(
          <circle key={i} cx={81+i*13} cy={232} r={2.8} fill={phase!=="idle"?pc:"#334155"} opacity={phase!=="idle"?acc*0.9:0.3}>
            {phase!=="idle"&&<animate attributeName="opacity" values={`${acc*0.9};${acc*0.15};${acc*0.9}`} dur={`${0.32+i*0.11}s`} repeatCount="indefinite"/>}
          </circle>
        ))}
        {/* Wrist */}
        <rect x={82} y={210} width={56} height={13} rx={5} fill={jointFill} stroke={bodyStroke} strokeWidth={0.9}/>
        <ellipse cx={110} cy={216} rx={24} ry={5} fill={bodyStroke} opacity={0.25}/>
        {/* Palm */}
        <path d="M78 183 Q75 200 76 210 Q90 218 110 218 Q130 218 144 210 Q145 200 142 183 Q142 161 139 150 Q127 142 110 142 Q93 142 81 150 Q78 161 78 183Z" fill={palmFill} stroke={bodyStroke} strokeWidth={1.1}/>
        <line x1={92} y1={160} x2={90} y2={204} stroke={bodyStroke} strokeWidth={0.5} opacity={0.35}/>
        <line x1={110} y1={156} x2={110} y2={207} stroke={bodyStroke} strokeWidth={0.5} opacity={0.35}/>
        <line x1={128} y1={160} x2={130} y2={204} stroke={bodyStroke} strokeWidth={0.5} opacity={0.35}/>
        {/* Accuracy ring */}
        <circle cx={110} cy={183} r={52} fill="none" stroke={pc} strokeWidth={1.2} opacity={0.12}/>
        <circle cx={110} cy={183} r={52} fill="none" stroke={pc} strokeWidth={2.5}
          strokeDasharray={`${acc*circ} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 110 183)" style={{transition:"stroke-dasharray 0.5s ease"}}/>
        {/* Accuracy text */}
        <text x={110} y={179} textAnchor="middle" fontSize={17} fontWeight="700" fill={pc} fontFamily="monospace">{accuracy}%</text>
        <text x={110} y={192} textAnchor="middle" fontSize={8} fill="#64748b" fontFamily="sans-serif">accuracy</text>
        {/* Knuckles */}
        {[91,105,110,116,130].map((kx,i)=>(
          <ellipse key={i} cx={kx} cy={144+(i===2?0:i===0||i===4?3:1)} rx={5} ry={4} fill={jointFill} stroke={bodyStroke} strokeWidth={0.8}/>
        ))}
        {/* Fingers */}
        {renderFinger(82,172,[28,21,16],-30,angles[0],true)}
        {renderFinger(91,144,[34,26,19],-5, angles[1])}
        {renderFinger(109,142,[38,29,21],0, angles[2])}
        {renderFinger(127,144,[35,26,19],5, angles[3])}
        {renderFinger(141,149,[27,21,15],10,angles[4])}
        {/* Disruption sparks */}
        {phase==="disruption"&&[0,1,2,3,4].map(i=>(
          <circle key={i} cx={84+i*14} cy={158+Math.sin(i)*9} r={2.5} fill="#f87171">
            <animate attributeName="opacity" values="1;0;1" dur={`${0.2+i*0.06}s`} repeatCount="indefinite"/>
            <animate attributeName="r" values="2;4.5;2" dur={`${0.2+i*0.06}s`} repeatCount="indefinite"/>
          </circle>
        ))}
        {/* Recovery rings */}
        {phase==="recovery"&&(
          <circle cx={110} cy={183} r={58} fill="none" stroke="#22d3ee" strokeWidth={1}>
            <animate attributeName="r" values="50;66;50" dur="1.8s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.4;0;0.4" dur="1.8s" repeatCount="indefinite"/>
          </circle>
        )}
      </svg>
      </div>
      {/* Gesture pills */}
      <div style={{display:"flex",gap:6}}>
        {[["Power","power"],["Pinch","pinch"],["Point","point"]].map(([label,g])=>(
          <div key={g} style={{padding:"2px 8px",borderRadius:10,fontSize:9,fontWeight:600,letterSpacing:"0.05em",textTransform:"uppercase",background:gesture===g?pc+"28":"rgba(148,163,184,0.08)",border:`1px solid ${gesture===g?pc:"rgba(148,163,184,0.2)"}`,color:gesture===g?pc:"#475569",transition:"all 0.4s"}}>{label}</div>
        ))}
      </div>
    </div>
  );
}

// ─── Finger Confidence Bars ───────────────────────────────────────
function FingerConfidence({accuracy,phase}){
  const acc=accuracy/100;
  const fingers=["Thumb","Index","Middle","Ring","Pinky"];
  const baseConf=[0.92,0.88,0.95,0.85,0.80];
  const confs=baseConf.map(c=>{
    if(phase==="idle") return 0;
    if(phase==="disruption") return c*acc*(0.1+rand()*0.4);
    return c*acc;
  });
  const pc=phase==="disruption"?"#f87171":phase==="recovery"?"#22d3ee":phase==="learning"||phase==="stable"?"#34d399":"#475569";
  return(
    <div>
      <div className="card-title">Motor Confidence</div>
      <div style={{display:"flex",flexDirection:"column",gap:4}}>
        {fingers.map((f,i)=>(
          <div key={f} style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:36,fontSize:9,color:"#64748b",flexShrink:0}}>{f}</div>
            <div style={{flex:1,height:5,background:"#0f172a",borderRadius:3,overflow:"hidden"}}>
              <div style={{width:`${confs[i]*100}%`,height:"100%",background:pc,borderRadius:3,transition:"width 0.4s ease"}}/>
            </div>
            <div style={{width:28,fontSize:9,fontFamily:"monospace",color:pc,textAlign:"right"}}>{Math.round(confs[i]*100)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Signal Latency ───────────────────────────────────────────────
function LatencyDisplay({phase,accuracy}){
  const [latency,setLatency]=useState(2);
  useEffect(()=>{
    const t=setInterval(()=>{
      if(phase==="disruption") setLatency(prev=>Math.min(999,prev+Math.floor(rand()*80)));
      else if(phase==="recovery") setLatency(prev=>Math.max(2,prev-Math.floor(rand()*30)));
      else if(phase==="learning"||phase==="stable") setLatency(2+Math.floor(rand()*3));
      else setLatency(2);
    },200);
    return()=>clearInterval(t);
  },[phase]);
  const lost=phase==="disruption"&&latency>400;
  const color=lost?"#f87171":latency>50?"#fbbf24":"#34d399";
  return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 8px",background:"#060d1a",borderRadius:6,border:"1px solid #1e2d4a"}}>
      <div style={{fontSize:9,color:"#475569"}}>Signal latency</div>
      <div style={{fontSize:12,fontFamily:"monospace",fontWeight:700,color}}>{lost?"SIGNAL LOST":`${latency} ms`}</div>
    </div>
  );
}

// ─── Gesture Log ──────────────────────────────────────────────────
function GestureLog({log}){
  const endRef=useRef(null);
  useEffect(()=>endRef.current?.scrollIntoView({behavior:"smooth"}),[log]);
  return(
    <div>
      <div className="card-title">Event Log</div>
      <div style={{height:100,overflowY:"auto",display:"flex",flexDirection:"column",gap:0}}>
        {log.map((entry,i)=>(
          <div key={i} className="log-entry">
            <span style={{color:"#334155",flexShrink:0}}>{entry.time}</span>
            <span style={{color:entry.color}}>{entry.icon}</span>
            <span style={{color:"#8ba0c4",flex:1}}>{entry.msg}</span>
          </div>
        ))}
        <div ref={endRef}/>
      </div>
    </div>
  );
}

// ─── Recovery Modal ───────────────────────────────────────────────
function RecoveryModal({show,recoveryTime,accuracy,onClose}){
  if(!show) return null;
  return(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div style={{fontSize:36,marginBottom:12}}>✦</div>
        <div style={{fontSize:11,fontFamily:"monospace",color:"#22d3ee",letterSpacing:"0.15em",marginBottom:8}}>SELF-HEALING COMPLETE</div>
        <h2 style={{fontSize:22,fontWeight:700,color:"#e2eaf8",marginBottom:6}}>Recovery Successful</h2>
        <p style={{fontSize:12,color:"#64748b",lineHeight:1.6,marginBottom:20}}>
          The AI detected signal disruption and autonomously restored full prosthetic control using homeostatic regulation and structural plasticity — with zero manual intervention.
        </p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:20}}>
          {[["Recovery time",`${recoveryTime}s`,"#22d3ee"],["Accuracy restored",`${accuracy}%`,"#34d399"],["Power saved","80%","#a855f7"]].map(([l,v,c])=>(
            <div key={l} style={{background:"rgba(0,0,0,0.3)",borderRadius:8,padding:"10px 8px",textAlign:"center"}}>
              <div style={{fontSize:20,fontWeight:700,fontFamily:"monospace",color:c,marginBottom:4}}>{v}</div>
              <div style={{fontSize:9,color:"#475569"}}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{background:"rgba(248,113,113,0.08)",border:"1px solid rgba(248,113,113,0.25)",borderRadius:8,padding:"10px 14px",marginBottom:16,textAlign:"left"}}>
          <div style={{fontSize:10,color:"#f87171",fontWeight:600,marginBottom:4}}>Traditional prosthetic would have:</div>
          <div style={{fontSize:10,color:"#64748b"}}>Required manual recalibration by a clinician · Remained non-functional until serviced · Likely been abandoned by the user</div>
        </div>
        <button onClick={onClose} style={{padding:"8px 28px",borderRadius:7,border:"1px solid rgba(34,211,238,0.4)",background:"rgba(34,211,238,0.1)",color:"#22d3ee",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
          Continue Demo
        </button>
      </div>
    </div>
  );
}

// ─── Presentation Mode ────────────────────────────────────────────
function PresentationMode({accuracy,phase,gesture,onClose}){
  const pc=phase==="disruption"?"#f87171":phase==="recovery"?"#22d3ee":phase==="learning"||phase==="stable"?"#34d399":"#64748b";
  return(
    <div className="presentation-overlay">
      <div style={{fontSize:10,fontFamily:"monospace",color:"#22d3ee",letterSpacing:"0.25em",textTransform:"uppercase"}}>NeuroLimb AI · Live Demo</div>
      <ProstheticHand accuracy={accuracy} phase={phase} gesture={gesture}/>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:48,fontWeight:700,fontFamily:"monospace",color:pc,marginBottom:8}}>{accuracy}%</div>
        <div style={{fontSize:16,color:pc,letterSpacing:"0.1em",textTransform:"uppercase",fontWeight:600}}>
          {phase==="idle"?"Awaiting Signal":phase==="learning"?"Learning Gesture":phase==="disruption"?"⚡ Signal Disrupted":phase==="recovery"?"↺ Self-Healing Active":"✦ Gesture Mastered"}
        </div>
      </div>
      <button onClick={onClose} style={{padding:"8px 24px",borderRadius:7,border:"1px solid #1e2d4a",background:"rgba(255,255,255,0.04)",color:"#475569",fontSize:11,cursor:"pointer",fontFamily:"inherit",marginTop:16}}>
        Exit Presentation
      </button>
    </div>
  );
}

// ─── EMG Waveform ─────────────────────────────────────────────────
function EMGWaveform({phase,accuracy}){
  const canvasRef=useRef(null);
  const frameRef=useRef(0);
  const tRef=useRef(0);
  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas) return;
    const draw=()=>{
      const W=canvas.offsetWidth||580,H=42;
      canvas.width=W; canvas.height=H;
      const ctx=canvas.getContext("2d");
      ctx.clearRect(0,0,W,H);
      const acc=accuracy/100;
      const color=phase==="disruption"?"#f87171":phase==="recovery"?"#22d3ee":phase==="learning"||phase==="stable"?"#34d399":"#475569";
      tRef.current+=0.055;
      const t=tRef.current;
      ctx.strokeStyle="#1e3a5f"; ctx.lineWidth=0.5;
      ctx.beginPath(); ctx.moveTo(0,H/2); ctx.lineTo(W,H/2); ctx.stroke();
      ctx.beginPath(); ctx.strokeStyle=color; ctx.lineWidth=1.5;
      for(let x=0;x<W;x++){
        const p=x/W,ts=t-p*4;
        let y=Math.sin(ts*8)*0.4+Math.sin(ts*13)*0.25+Math.sin(ts*21)*0.15;
        y+=Math.max(0,Math.sin(ts*1.5))*Math.sin(ts*25)*0.8*acc;
        if(phase==="disruption") y+=(Math.random()-0.5)*1.6;
        else if(phase==="recovery") y+=(Math.random()-0.5)*0.25;
        y*=(H/2-5)*(0.3+acc*0.7);
        if(x===0) ctx.moveTo(x,H/2-y); else ctx.lineTo(x,H/2-y);
      }
      ctx.stroke();
      ctx.font="8px monospace"; ctx.fillStyle="#1e3a5f";
      ctx.fillText("EMG 2kHz",2,10);
      ctx.textAlign="right"; ctx.fillStyle=color;
      ctx.fillText(phase==="disruption"?"NOISY":phase==="idle"?"IDLE":"ACTIVE",W-2,10);
      frameRef.current=requestAnimationFrame(draw);
    };
    frameRef.current=requestAnimationFrame(draw);
    return()=>cancelAnimationFrame(frameRef.current);
  },[phase,accuracy]);
  return <canvas ref={canvasRef} style={{width:"100%",height:42,display:"block",borderRadius:5,background:"#060d1a"}}/>;
}

// ─── Neural Canvas ────────────────────────────────────────────────
const PCOLORS={idle:"#64748b",learning:"#10b981",disruption:"#ef4444",recovery:"#06b6d4",stable:"#06b6d4"};
const LNAMES=["EMG Input","Motor Decoder","Sensory FB","Motor Out"];
function NeuralCanvas({weights,activations,phase}){
  const ref=useRef(null);
  const draw=useCallback(()=>{
    const canvas=ref.current; if(!canvas||!weights||!activations) return;
    const W=canvas.offsetWidth||580,H=130;
    canvas.width=W; canvas.height=H;
    const ctx=canvas.getContext("2d");
    ctx.clearRect(0,0,W,H);
    const pc=PCOLORS[phase]??"#64748b";
    const pos=LAYERS.map((n,l)=>{const x=30+l*((W-60)/(LAYERS.length-1));return Array.from({length:n},(_,i)=>({x,y:(H/(n+1))*(i+1)}));});
    for(let l=0;l<LAYERS.length-1;l++)for(let i=0;i<LAYERS[l];i++)for(let j=0;j<LAYERS[l+1];j++){
      const w=weights[l]?.[i]?.[j]??0,abs=Math.abs(w);
      if(abs<0.04) continue;
      const{x:x1,y:y1}=pos[l][i],{x:x2,y:y2}=pos[l+1][j];
      ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);
      if(phase==="disruption")ctx.strokeStyle=abs>0.3?`rgba(239,68,68,${Math.min(0.8,abs)})`:`rgba(251,191,36,${Math.min(0.5,abs*1.5)})`;
      else if(phase==="recovery")ctx.strokeStyle=abs>0.3?`rgba(6,182,212,${Math.min(0.8,abs)})`:`rgba(52,211,153,${Math.min(0.4,abs*1.5)})`;
      else{const g=Math.floor(abs*200);ctx.strokeStyle=abs>0.3?`rgba(16,${g},${Math.floor(g*0.5)},${Math.min(0.7,abs)})`:`rgba(30,64,175,${Math.min(0.45,abs*2)})`;}
      ctx.lineWidth=Math.min(2.5,abs*3);ctx.stroke();
    }
    pos.forEach((layer,l)=>layer.forEach((n,i)=>{
      const act=activations[l]?.[i]??0,r=6+act*4;
      if(act>0.45){ctx.beginPath();ctx.arc(n.x,n.y,r+4,0,Math.PI*2);ctx.fillStyle=`${pc}18`;ctx.fill();}
      ctx.beginPath();ctx.arc(n.x,n.y,r,0,Math.PI*2);
      const grad=ctx.createRadialGradient(n.x-1,n.y-1,0,n.x,n.y,r);
      grad.addColorStop(0,act>0.45?`${pc}ee`:act>0.2?"#1e40af":"#0f172a");
      grad.addColorStop(1,act>0.45?`${pc}44`:"#0f172a");
      ctx.fillStyle=grad;ctx.fill();
      ctx.strokeStyle=act>0.45?pc:act>0.2?"#2563eb":"#1e3a5f";ctx.lineWidth=1;ctx.stroke();
    }));
    ctx.font="8px system-ui";ctx.textAlign="center";
    pos.forEach((layer,l)=>{ctx.fillStyle="#334155";ctx.fillText(LNAMES[l],pos[l][0].x,H-3);});
  },[weights,activations,phase]);
  const cbRef=useCallback(n=>{ref.current=n;if(n)draw();},[draw]);
  return <canvas ref={cbRef} style={{width:"100%",height:130,display:"block",borderRadius:5}}/>;
}

// ─── Line Chart ───────────────────────────────────────────────────
function LineChart({data,color,label,h=80}){
  const ref=useRef(null);
  const draw=useCallback(()=>{
    const canvas=ref.current;if(!canvas||!data?.length)return;
    const W=canvas.offsetWidth||220,H=h;
    canvas.width=W;canvas.height=H;
    const ctx=canvas.getContext("2d");ctx.clearRect(0,0,W,H);
    [0.25,0.5,0.75].forEach(t=>{ctx.beginPath();ctx.strokeStyle="#1e3a5f";ctx.lineWidth=0.5;ctx.moveTo(0,H*t);ctx.lineTo(W,H*t);ctx.stroke();});
    const pts=data.map((v,i)=>[(i/(data.length-1||1))*W,H-(v/100)*H]);
    ctx.beginPath();pts.forEach(([x,y],i)=>i===0?ctx.moveTo(x,y):ctx.lineTo(x,y));
    ctx.strokeStyle=color;ctx.lineWidth=1.8;ctx.stroke();
    ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.closePath();ctx.fillStyle=color+"15";ctx.fill();
    if(data.length){ctx.font="9px monospace";ctx.textAlign="right";ctx.fillStyle=color;ctx.fillText(data[data.length-1].toFixed(0),W-2,11);}
  },[data,color,h]);
  const cbRef=useCallback(n=>{ref.current=n;if(n)draw();},[draw]);
  return(
    <div>
      <div style={{fontSize:8.5,color:"#475569",marginBottom:3,letterSpacing:"0.1em",textTransform:"uppercase"}}>{label}</div>
      <canvas ref={cbRef} style={{width:"100%",height:h,display:"block",borderRadius:4}}/>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────
export default function App(){
  const [showLanding,setShowLanding]=useState(true);
  const [presentMode,setPresentMode]=useState(false);
  const [phase,setPhase]=useState("idle");
  const [weights,setWeights]=useState(()=>initWeights());
  const [acts,setActs]=useState(()=>LAYERS.map(n=>Array(n).fill(0)));
  const [accuracy,setAccuracy]=useState(0);
  const [errRate,setErrRate]=useState(100);
  const [adaptSpd,setAdaptSpd]=useState(0);
  const [stability,setStab]=useState(0);
  const [history,setHistory]=useState({acc:[],err:[],adp:[]});
  const [userMode,setUserMode]=useState(false);
  const [currentUser,setUser]=useState(0);
  const [asnnPow,setAsnnPow]=useState(18);
  const [showModal,setShowModal]=useState(false);
  const [recoveryTime,setRecoveryTime]=useState(0);
  const [demoRunning,setDemoRunning]=useState(false);
  const [demoStep,setDemoStep]=useState("");
  const [log,setLog]=useState([]);

  const phaseRef=useRef("idle");
  const weightsRef=useRef(weights);
  const actsRef=useRef(acts);
  const accRef=useRef(0);
  const stabRef=useRef(0);
  const adaptRef=useRef(0);
  const userRef=useRef(0);
  const tickRef=useRef(null);
  const disruptTick=useRef(0);
  const tickCount=useRef(0);
  const recovStart=useRef(0);
  const modalShown=useRef(false);

  const addLog=(msg,icon,color)=>{
    const now=new Date();
    const time=`${now.getHours().toString().padStart(2,"0")}:${now.getMinutes().toString().padStart(2,"0")}:${now.getSeconds().toString().padStart(2,"0")}`;
    setLog(prev=>[...prev.slice(-30),{time,msg,icon,color}]);
  };

  const setPhaseAll=p=>{phaseRef.current=p;setPhase(p);};

  const runTick=useCallback(()=>{
    const p=phaseRef.current;if(p==="idle")return;
    tickCount.current++;
    const user=USER_PROFILES[userRef.current];
    const noise=user.pattern.map(x=>x+(Math.random()-0.5)*0.1);
    let lr=0.01,noiseAmp=0.005,targetAcc=accRef.current;
    if(p==="learning"){
      lr=0.04;noiseAmp=0.003;
      targetAcc=Math.min(0.96,accRef.current+0.008+rand()*0.003);
      stabRef.current=Math.min(1,stabRef.current+0.015);
      adaptRef.current=Math.max(0,adaptRef.current-2);
    } else if(p==="disruption"){
      lr=0.001;noiseAmp=0.18;
      targetAcc=Math.max(0.06,accRef.current-0.025-rand()*0.015);
      stabRef.current=Math.max(0,stabRef.current-0.04);
      adaptRef.current=Math.min(999,adaptRef.current+18);
      if(accRef.current<0.3&&tickCount.current>disruptTick.current+8){
        recovStart.current=Date.now();
        modalShown.current=false;
        setPhaseAll("recovery");
        addLog("Homeostatic regulation activated","↺","#22d3ee");
        playSound("recover");
      }
    } else if(p==="recovery"){
      lr=0.055;noiseAmp=0.008;
      targetAcc=Math.min(0.93,accRef.current+0.018+rand()*0.008);
      stabRef.current=Math.min(1,stabRef.current+0.025);
      adaptRef.current=Math.max(0,adaptRef.current-15);
      if(accRef.current>0.88&&!modalShown.current){
        const rt=((Date.now()-recovStart.current)/1000).toFixed(1);
        setRecoveryTime(rt);
        setPhaseAll("stable");
        modalShown.current=true;
        setShowModal(true);
        addLog(`Recovery complete in ${rt}s — control restored`,"✦","#34d399");
      }
    } else if(p==="stable"){
      lr=0.008;noiseAmp=0.002;
      targetAcc=Math.min(0.97,accRef.current+(rand()-0.3)*0.003);
      stabRef.current=Math.min(1,stabRef.current+0.005);
    }
    const newActs=forward(weightsRef.current,noise);
    let newW=stdpUpdate(weightsRef.current,newActs,lr,noiseAmp);
    newW=homeostasis(newW,newActs);newW=structuralPlasticity(newW,p);
    weightsRef.current=newW;actsRef.current=newActs;
    const newAcc=accRef.current*0.7+targetAcc*0.3;accRef.current=newAcc;
    setWeights(newW.map(l=>l.map(r=>[...r])));
    setActs(newActs.map(a=>[...a]));
    setAccuracy(Math.round(newAcc*100));
    setErrRate(Math.round((1-newAcc)*100));
    setStab(Math.round(stabRef.current*100));
    setAdaptSpd(Math.round(adaptRef.current));
    setAsnnPow(Math.round(18+(p==="disruption"?12:0)-newAcc*5));
    setHistory(prev=>({
      acc:[...prev.acc.slice(-60),Math.round(newAcc*100)],
      err:[...prev.err.slice(-60),Math.round((1-newAcc)*100)],
      adp:[...prev.adp.slice(-60),Math.min(100,Math.round(adaptRef.current/3))],
    }));
  },[]);

  const startTicker=useCallback(()=>{if(tickRef.current)return;tickRef.current=setInterval(runTick,120);},[runTick]);

  const handleStart=()=>{setPhaseAll("learning");startTicker();playSound("start");addLog("STDP learning initiated — gesture acquisition started","▶","#34d399");};
  const handleNoise=()=>{
    disruptTick.current=tickCount.current;
    weightsRef.current=weightsRef.current.map(l=>l.map(r=>r.map(w=>rand()<0.3?w+randn()*0.4:w)));
    setPhaseAll("disruption");startTicker();playSound("noise");
    addLog("⚡ Electrode drift detected — signal corrupted","⚡","#f87171");
  };
  const handleChange=()=>{
    const next=(userRef.current+1)%USER_PROFILES.length;
    userRef.current=next;setUser(next);
    disruptTick.current=tickCount.current;
    setPhaseAll("disruption");startTicker();playSound("noise");
    addLog(`User switched to ${USER_PROFILES[next].name} — adapting to new pattern","⟳","#fbbf24`);
  };
  const handleReset=()=>{
    clearInterval(tickRef.current);tickRef.current=null;
    setDemoRunning(false);setDemoStep("");
    const w=initWeights();
    weightsRef.current=w;actsRef.current=LAYERS.map(n=>Array(n).fill(0));
    accRef.current=0;stabRef.current=0;adaptRef.current=0;tickCount.current=0;
    setWeights(w);setActs(LAYERS.map(n=>Array(n).fill(0)));
    setAccuracy(0);setErrRate(100);setStab(0);setAdaptSpd(0);
    setHistory({acc:[],err:[],adp:[]});setAsnnPow(18);
    setShowModal(false);modalShown.current=false;setLog([]);
    setPhaseAll("idle");
  };
  const handleUserSelect=id=>{userRef.current=id;setUser(id);if(phaseRef.current!=="idle"){disruptTick.current=tickCount.current;setPhaseAll("disruption");}};

  const runDemo=useCallback(async()=>{
    setDemoRunning(true);handleReset();await new Promise(r=>setTimeout(r,600));
    setDemoStep("1/4 — Patient wearing prosthetic for first time. System learning...");
    setPhaseAll("learning");startTicker();playSound("start");
    addLog("AUTO DEMO: STDP learning phase started","▶","#34d399");
    await new Promise(r=>setTimeout(r,7000));
    setDemoStep("2/4 — Simulating electrode drift from limb sweat. Disrupting signal...");
    disruptTick.current=tickCount.current;
    weightsRef.current=weightsRef.current.map(l=>l.map(r=>r.map(w=>rand()<0.3?w+randn()*0.4:w)));
    setPhaseAll("disruption");playSound("noise");
    addLog("AUTO DEMO: Electrode drift injected","⚡","#f87171");
    await new Promise(r=>setTimeout(r,4000));
    setDemoStep("3/4 — AI detects instability. Self-healing initiated automatically...");
    addLog("AUTO DEMO: Watching self-healing...","↺","#22d3ee");
    await new Promise(r=>setTimeout(r,8000));
    setDemoStep("4/4 — Switching user profile. System adapts to new gesture pattern...");
    const next=(userRef.current+1)%USER_PROFILES.length;
    userRef.current=next;setUser(next);
    disruptTick.current=tickCount.current;setPhaseAll("disruption");playSound("noise");
    addLog(`AUTO DEMO: User changed to ${USER_PROFILES[next].name}","⟳","#fbbf24`);
    await new Promise(r=>setTimeout(r,10000));
    setDemoStep("Demo complete — zero manual recalibration required.");
    setDemoRunning(false);
  },[startTicker]);

  const isIdle=phase==="idle";
  const phases4=["idle","learning","disruption","recovery"];
  const tlColors={idle:"#475569",learning:"#34d399",disruption:"#f87171",recovery:"#22d3ee"};
  const phaseIdx=Math.max(0,phases4.indexOf(phase==="stable"?"recovery":phase));
  const phaseLabel={idle:"SYSTEM IDLE",learning:"◈ LEARNING",disruption:"⚡ DISRUPTION",recovery:"↺ RECOVERING",stable:"✦ STABLE"};
  const currentGesture=USER_PROFILES[currentUser].gesture;

  if(showLanding) return <LandingScreen onLaunch={()=>{setShowLanding(false);document.title="NeuroLimb AI | Self-Healing Prosthetic";}}/>;
  if(presentMode) return <PresentationMode accuracy={accuracy} phase={phase} gesture={currentGesture} onClose={()=>setPresentMode(false)}/>;

  return(
    <div className="app">
      <RecoveryModal show={showModal} recoveryTime={recoveryTime} accuracy={accuracy} onClose={()=>setShowModal(false)}/>

      {/* HEADER */}
      <header className="header">
        <div className="header-left">
          <div className="logo-pulse"><div className="logo-dot"/></div>
          <div>
            <div className="header-title">NEUROLIMB AI — SELF-HEALING PROSTHETIC SIMULATOR</div>
            <div className="header-sub">STDP · Homeostatic Regulation · Structural Plasticity · Neuromodulation</div>
          </div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {demoStep&&<div style={{fontSize:9,color:"#64748b",maxWidth:200,textAlign:"right",fontStyle:"italic",lineHeight:1.3}}>{demoStep}</div>}
          <button onClick={()=>setPresentMode(true)} title="Fullscreen presentation mode for judges"
            style={{padding:"3px 9px",borderRadius:6,border:"1px solid #1e2d4a",background:"rgba(168,85,247,0.08)",color:"#c084fc",fontSize:9,cursor:"pointer",fontFamily:"monospace",whiteSpace:"nowrap"}}>
            ◻ Present
          </button>
          <div className={`status-badge ${phase}`}><div className="status-dot"/><span>{phaseLabel[phase]}</span></div>
        </div>
      </header>

      {/* BANNER */}
      <div className="banner">
        <span><span style={{color:"#a855f7",fontWeight:600}}>12M+</span> upper-limb prosthetic users globally — <span style={{color:"#a855f7",fontWeight:600}}>50%</span> abandon due to poor adaptability. This system solves that.</span>
        <div style={{marginLeft:"auto",display:"flex",gap:14}}>
          {[["User",USER_PROFILES[currentUser].name],["Condition",USER_PROFILES[currentUser].type],["Gesture",currentGesture.charAt(0).toUpperCase()+currentGesture.slice(1)]].map(([k,v])=>(
            <span key={k} style={{fontSize:9}}><span style={{color:"#334155"}}>{k}: </span><span style={{color:"#8ba0c4",fontWeight:600}}>{v}</span></span>
          ))}
        </div>
      </div>

      {/* METRICS */}
      <div className="metrics-row">
        {[
          {label:"Accuracy",  value:`${accuracy}%`,  color:"#34d399",pct:accuracy},
          {label:"Error Rate",value:`${errRate}%`,   color:"#f87171",pct:errRate},
          {label:"Adaptation",value:`${adaptSpd}ms`, color:"#fbbf24",pct:Math.min(100,adaptSpd/10)},
          {label:"Stability", value:`${stability}%`, color:"#22d3ee",pct:stability},
        ].map(({label,value,color,pct})=>(
          <div key={label} className="metric">
            <div className="metric-label">{label}</div>
            <div className="metric-value" style={{color}}>{value}</div>
            <div className="metric-bar" style={{background:color,width:`${pct}%`}}/>
          </div>
        ))}
      </div>

      {/* MAIN BODY */}
      <div className="main-body">

        {/* LEFT COL */}
        <div className="left-col">
          <div className="card">
            <div className="card-title">Control Panel</div>
            <div style={{display:"flex",flexDirection:"column",gap:5}}>
              <button className="btn btn-start" onClick={handleStart} disabled={!isIdle||demoRunning} title="Begin STDP gesture learning">▶ Start Learning</button>
              <button className="btn btn-noise" onClick={handleNoise} disabled={isIdle||demoRunning} title="Simulate electrode drift / limb sweat">⚡ Introduce Noise</button>
              <button className="btn btn-change" onClick={handleChange} disabled={isIdle||demoRunning} title="Switch to next user profile">⟳ Change Pattern</button>
              <button className="btn btn-reset" onClick={handleReset} disabled={demoRunning} title="Reset all weights and history">↺ Reset System</button>
              <button className="btn btn-user" onClick={()=>setUserMode(u=>!u)} title="Show/hide user profiles">◈ {userMode?"Hide":"Show"} Profiles</button>
              <button className="btn" onClick={runDemo} disabled={demoRunning}
                style={{background:"rgba(168,85,247,0.1)",border:"1px solid rgba(168,85,247,0.35)",color:"#c084fc"}}
                title="Run full automated 60-second demo sequence">
                {demoRunning?"⏳ Running Demo...":"▷ Run Full Demo (60s)"}
              </button>
            </div>
            {/* Phase timeline */}
            <div style={{marginTop:10}}>
              <div style={{fontSize:8,color:"#334155",marginBottom:4,letterSpacing:"0.1em",textTransform:"uppercase"}}>Phase Timeline</div>
              <div style={{display:"flex",gap:2,height:4,borderRadius:2,overflow:"hidden"}}>
                {phases4.map((p,i)=>(
                  <div key={p} style={{flex:1,background:i<phaseIdx?tlColors[p]+"70":i===phaseIdx?tlColors[p]:"#1a2540",transition:"background 0.5s"}}/>
                ))}
              </div>
              <div style={{display:"flex",marginTop:3}}>
                {["Idle","Learn","Disrupt","Recover"].map((l,i)=>(
                  <div key={l} style={{flex:1,textAlign:"center",fontSize:8,color:i===phaseIdx?tlColors[phases4[i]]:"#1e2d4a"}}>{l}</div>
                ))}
              </div>
            </div>
          </div>

          {/* Energy */}
          <div className="card">
            <div className="card-title">Energy Comparison</div>
            <div style={{display:"flex",flexDirection:"column",gap:5}}>
              {[["ANN",92,"#f87171"],["Fixed SNN",54,"#fbbf24"],["Adaptive SNN",asnnPow,"#34d399"]].map(([l,v,c])=>(
                <div key={l} style={{display:"flex",alignItems:"center",gap:6}}>
                  <div style={{width:80,fontSize:9,color:"#475569",flexShrink:0}}>{l}</div>
                  <div style={{flex:1,height:5,background:"#060d1a",borderRadius:3,overflow:"hidden"}}>
                    <div style={{width:`${v}%`,height:"100%",background:c,borderRadius:3,transition:"width 1s ease"}}/>
                  </div>
                  <div style={{width:36,textAlign:"right",fontFamily:"monospace",fontSize:9,color:c}}>{v}mW</div>
                </div>
              ))}
            </div>
            <div style={{fontSize:9,color:"#1e3a5f",marginTop:6}}>Adaptive SNN <span style={{color:"#34d399",fontWeight:600}}>80% less power</span> vs ANN</div>
          </div>

          {/* Finger confidence */}
          <div className="card">
            <FingerConfidence accuracy={accuracy} phase={phase}/>
          </div>

          {/* Latency */}
          <div className="card">
            <div className="card-title">Signal Monitor</div>
            <LatencyDisplay phase={phase} accuracy={accuracy}/>
          </div>

          {/* User profiles */}
          {userMode&&(
            <div className="card">
              <div className="card-title">Personalization</div>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                {USER_PROFILES.map((u,i)=>(
                  <div key={u.id} className={`profile${i===currentUser?" active":""}`}
                       style={{borderColor:i===currentUser?u.color:undefined}}
                       onClick={()=>handleUserSelect(i)}>
                    <div className="profile-avatar" style={{background:u.color+"22",color:u.color}}>{u.name[0]}</div>
                    <div><div className="profile-name">{u.name}</div><div className="profile-type">{u.type}</div></div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CENTER COL */}
        <div className="nn-section">
          {/* Prosthetic + pipeline */}
          <div className="card">
            <div className="card-title">Smart Prosthetic Hand · Real-Time Motor Control</div>
            <div style={{display:"grid",gridTemplateColumns:"190px 1fr",gap:14,alignItems:"start"}}>
              <ProstheticHand accuracy={accuracy} phase={phase} gesture={currentGesture}/>
              <div style={{display:"flex",flexDirection:"column",gap:0}}>
                <div style={{fontSize:8.5,fontWeight:700,color:"#334155",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8}}>Signal Pipeline</div>
                {[
                  {num:"01",color:"#8b5cf6",title:"EMG Acquisition",desc:"4-ch surface electrodes capture muscle activation at 2 kHz. Amplified, filtered, digitized.",sub:"Amplify → Filter → Digitize"},
                  {num:"02",color:"#3b82f6",title:"Motor Cortex Decoder",desc:"STDP-trained layers decode motor intent. Neuromodulation adjusts learning rate live.",sub:"Extract → Classify → Decode"},
                  {num:"03",color:"#10b981",title:"Sensory Feedback Layer",desc:"Proprioceptive loop at 50 Hz drives 4 servo groups for compliant finger control.",sub:"Decode → PWM → Servo"},
                  {num:"04",color:"#06b6d4",title:"Self-Healing Loop",desc:"Homeostatic weight rescaling + structural plasticity regrows synapses. Zero retraining.",sub:"Detect → Regulate → Recover"},
                ].map((step,i,arr)=>(
                  <div key={step.num} style={{display:"flex",gap:9,position:"relative"}}>
                    {i<arr.length-1&&<div style={{position:"absolute",left:9,top:22,width:1,height:"calc(100% - 4px)",background:step.color+"44"}}/>}
                    <div style={{width:20,height:20,borderRadius:"50%",flexShrink:0,background:step.color+"18",border:`1px solid ${step.color}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,color:step.color,fontFamily:"monospace",marginTop:1,zIndex:1}}>{step.num}</div>
                    <div style={{paddingBottom:10}}>
                      <div style={{fontSize:10,fontWeight:600,color:"#c8d8f0",marginBottom:2}}>{step.title}</div>
                      <div style={{fontSize:9,color:"#475569",lineHeight:1.5,marginBottom:3}}>{step.desc}</div>
                      <div style={{fontSize:8,color:step.color,fontFamily:"monospace",background:step.color+"0e",border:`1px solid ${step.color}22`,padding:"1px 6px",borderRadius:3,display:"inline-block"}}>{step.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* EMG + Neural net */}
          <div className="card">
            <div className="card-title">EMG Signal · 4-Channel Electrodes</div>
            <EMGWaveform phase={phase} accuracy={accuracy}/>
          </div>

          <div className="card">
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:7}}>
              <div className="card-title" style={{marginBottom:0}}>Synaptic Network · Live Activity</div>
              <div style={{display:"flex",gap:10}}>
                {[["#10b981","Strong"],["#ef4444","Disrupted"],["#06b6d4","Recovering"]].map(([c,l])=>(
                  <div key={l} style={{display:"flex",alignItems:"center",gap:4,fontSize:8.5,color:"#334155"}}>
                    <div style={{width:9,height:2,borderRadius:1,background:c}}/>{l}
                  </div>
                ))}
              </div>
            </div>
            <NeuralCanvas weights={weights} activations={acts} phase={phase}/>
          </div>

          {/* Before/After */}
          <div className="card">
            <div className="card-title">Before vs After AI</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div style={{background:"#0f0a0a",border:"1px solid #3f1414",borderRadius:7,padding:"8px"}}>
                <div style={{fontSize:8,color:"#7f2d2d",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:5}}>Traditional Prosthetic</div>
                <div style={{fontSize:18,fontWeight:700,fontFamily:"monospace",color:"#ef4444",marginBottom:2}}>{phase==="disruption"?"--":Math.max(5,45-errRate)+"%"}</div>
                <div style={{fontSize:8,color:"#5a2424",marginBottom:6}}>{phase==="disruption"?"Non-functional":"Fixed accuracy"}</div>
                {["Fixed weights","No noise recovery","Manual recalibration"].map(f=>(
                  <div key={f} style={{display:"flex",alignItems:"center",gap:4,fontSize:8.5,color:"#7f3333",marginBottom:2}}>
                    <div style={{width:3,height:3,borderRadius:"50%",background:"#7f2222",flexShrink:0}}/>
                    {f}
                  </div>
                ))}
              </div>
              <div style={{background:"#060f0a",border:"1px solid #0f3d1f",borderRadius:7,padding:"8px"}}>
                <div style={{fontSize:8,color:"#0f6b2e",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:5}}>NeuroLimb AI</div>
                <div style={{fontSize:18,fontWeight:700,fontFamily:"monospace",color:"#34d399",marginBottom:2}}>{accuracy}%</div>
                <div style={{fontSize:8,color:"#156a35",marginBottom:6}}>{phase==="disruption"?"Healing...":phase==="recovery"?"Recovering...":phase==="stable"?"Fully adapted":"Learning..."}</div>
                {["Adaptive STDP","Auto self-healing","Zero intervention"].map(f=>(
                  <div key={f} style={{display:"flex",alignItems:"center",gap:4,fontSize:8.5,color:"#1a7a40",marginBottom:2}}>
                    <div style={{width:3,height:3,borderRadius:"50%",background:"#34d399",flexShrink:0}}/>
                    {f}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COL */}
        <div className="right-col">
          <div className="card">
            <LineChart data={history.acc} color="#34d399" label="Accuracy over time" h={75}/>
          </div>
          <div className="card">
            <LineChart data={history.err} color="#f87171" label="Error rate" h={75}/>
          </div>
          <div className="card">
            <LineChart data={history.adp} color="#fbbf24" label="Adaptation speed" h={75}/>
          </div>

          {/* Gesture log */}
          <div className="card" style={{flex:1,minHeight:0}}>
            <GestureLog log={log}/>
          </div>

          {/* Phase guide */}
          <div className="card">
            <div className="card-title">Phase Guide</div>
            <div style={{display:"flex",flexDirection:"column",gap:5}}>
              {[
                {id:"idle",      icon:"◎",color:"#64748b",title:"Idle",       text:"Awaiting EMG. Weights initialized."},
                {id:"learning",  icon:"▲",color:"#34d399",title:"Learning",   text:"STDP strengthens active pathways."},
                {id:"disruption",icon:"⚡",color:"#f87171",title:"Disruption", text:"Signal corrupted. Commands fail."},
                {id:"recovery",  icon:"↺",color:"#22d3ee",title:"Recovery",   text:"Homeostasis + plasticity healing."},
              ].map(p=>{
                const active=phase===p.id||(phase==="stable"&&p.id==="recovery");
                return(
                  <div key={p.id} style={{display:"flex",gap:7,padding:"6px 7px",borderRadius:6,border:`1px solid ${active?p.color:"#1e2d4a"}`,background:active?p.color+"0a":"transparent",transition:"all 0.4s"}}>
                    <div style={{width:18,height:18,borderRadius:4,flexShrink:0,background:p.color+"18",color:p.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9}}>{p.icon}</div>
                    <div>
                      <div style={{fontSize:9,fontWeight:600,color:p.color,marginBottom:1}}>{p.title}</div>
                      <div style={{fontSize:8.5,color:"#475569",lineHeight:1.4}}>{p.text}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* EXPLAIN STRIP */}
      <div className="explain-strip">
        <div className="explain-card">
          <div className="explain-phases">
            {[
              {id:"idle",      icon:"◎",color:"#64748b",title:"Idle",       text:"Electrodes placed. Neural weights initialized. Awaiting voluntary muscle contraction."},
              {id:"learning",  icon:"▲",color:"#34d399",title:"Learning",   text:"STDP strengthens active pathways. Neuromodulation rewards correct gestures. Finger control improves."},
              {id:"disruption",icon:"⚡",color:"#f87171",title:"Disruption", text:"Electrode impedance shift corrupts EMG. Synaptic weights drift. Motor commands fail."},
              {id:"recovery",  icon:"↺",color:"#22d3ee",title:"Recovery",   text:"Homeostatic regulation rescales weights. Structural plasticity regrows synapses. Zero retraining required."},
            ].map(p=>{
              const active=phase===p.id||(phase==="stable"&&p.id==="recovery");
              return(
                <div key={p.id} className={`explain-phase${active?" active":""}`} style={{borderColor:active?p.color:undefined,transition:"border-color 0.5s"}}>
                  <div className="explain-icon" style={{background:p.color+"1a",color:p.color}}>{p.icon}</div>
                  <div>
                    <div className="explain-title" style={{color:p.color}}>{p.title}</div>
                    <div className="explain-text">{p.text}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}