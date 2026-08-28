#!/usr/bin/env python3
"""Build the CIP Dashboard Presentation HTML file."""

OUTPUT = r"d:/Documents/cip-dashboard-react_backup_41/marketing/cip-presentation-ppt.html"

CSS = """
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
:root{--navy:#060d1a;--navy2:#0d1b2a;--cyan:#00d4ff;--cyan2:#0ea5e9;--teal:#14b8a6;--indigo:#6366f1;--purple:#a855f7;--amber:#f59e0b;--green:#10b981;--red:#ef4444;--glass:rgba(255,255,255,0.06);--sw:1280px;--sh:720px}
html,body{width:100%;height:100%;overflow:hidden}
body{font-family:Inter,Segoe UI,sans-serif;background:#000;color:#fff;user-select:none}
#pres{width:100vw;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#090e1a;overflow:hidden}
#vp{position:relative;width:var(--sw);height:var(--sh);overflow:hidden;border-radius:12px;box-shadow:0 40px 100px rgba(0,0,0,.8),0 0 0 1px rgba(255,255,255,.08)}
@media(max-width:1360px){#vp{transform:scale(.9);transform-origin:center}}
@media(max-width:1200px){#vp{transform:scale(.78);transform-origin:center}}
@media(max-width:900px){#vp{transform:scale(.6);transform-origin:center}}
#track{display:flex;width:calc(var(--sw)*12);height:var(--sh);transition:transform .55s cubic-bezier(.77,0,.175,1)}
.sl{width:var(--sw);height:var(--sh);flex-shrink:0;position:relative;overflow:hidden;padding:52px 68px;display:flex;flex-direction:column}
.sl::before{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(0,212,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,.04) 1px,transparent 1px);background-size:60px 60px;pointer-events:none}
.dark{background:linear-gradient(135deg,#060d1a 0%,#0d1b2a 60%,#0a1628 100%)}
.navy{background:linear-gradient(150deg,#050d1e 0%,#0c1a2e 50%,#0a1525 100%)}
.indig{background:linear-gradient(135deg,#0f0a2e 0%,#150d3a 50%,#0d0c28 100%)}
.gteal{background:linear-gradient(135deg,#031a1a 0%,#062828 50%,#041e1a 100%)}
.ggrn{background:linear-gradient(135deg,#021a10 0%,#04240f 50%,#021609 100%)}
.gamb{background:linear-gradient(135deg,#1a0f00 0%,#241500 50%,#1a1000 100%)}
#ctrl{display:flex;align-items:center;gap:24px;margin-top:18px;z-index:100}
.cbtn{width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);color:#fff;font-size:1.2rem;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s}
.cbtn:hover{background:rgba(0,212,255,.2);border-color:var(--cyan)}
#dots{display:flex;gap:8px;align-items:center}
.dot{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.2);cursor:pointer;transition:all .3s}
.dot.active{background:var(--cyan);width:24px;border-radius:4px}
#ctr{font-size:.75rem;font-weight:600;color:rgba(255,255,255,.4);letter-spacing:1px;font-family:Orbitron,sans-serif;min-width:60px;text-align:center}
#fsb{position:fixed;top:16px;right:16px;padding:8px 16px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:8px;color:rgba(255,255,255,.7);font-family:Inter,sans-serif;font-size:.75rem;font-weight:600;cursor:pointer;z-index:999;transition:all .2s}
#fsb:hover{background:rgba(0,212,255,.15);color:#fff}
#pgb{position:fixed;top:0;left:0;right:0;height:3px;background:rgba(255,255,255,.05);z-index:999}
#pgf{height:100%;background:linear-gradient(90deg,var(--cyan),var(--teal));transition:width .4s ease;box-shadow:0 0 8px rgba(0,212,255,.6)}
#kbh{position:fixed;bottom:14px;left:50%;transform:translateX(-50%);font-size:.62rem;color:rgba(255,255,255,.18);letter-spacing:1px;z-index:999}
.badge{display:inline-flex;align-items:center;padding:4px 14px;background:rgba(0,212,255,.12);border:1px solid rgba(0,212,255,.3);border-radius:20px;font-size:.68rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--cyan);margin-bottom:16px;width:fit-content}
.h2{font-family:Orbitron,sans-serif;font-size:2.1rem;font-weight:700;line-height:1.15;background:linear-gradient(135deg,#fff 0%,var(--cyan) 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:8px}
.h2.ind{background:linear-gradient(135deg,#fff 0%,#a855f7 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.h2.grn{background:linear-gradient(135deg,#fff 0%,var(--green) 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.h2.amb{background:linear-gradient(135deg,#fff 0%,var(--amber) 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.h2.tel{background:linear-gradient(135deg,#fff 0%,var(--teal) 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.sub{font-size:1rem;color:rgba(255,255,255,.5);max-width:620px;line-height:1.6;margin-bottom:4px}
.gc{background:var(--glass);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:22px}
.gc-c{border-color:rgba(0,212,255,.25);border-top:3px solid var(--cyan)}
.gc-g{border-color:rgba(16,185,129,.25);border-top:3px solid var(--green)}
.gc-i{border-color:rgba(99,102,241,.3);border-top:3px solid var(--indigo)}
.gc-p{border-color:rgba(168,85,247,.3);border-top:3px solid var(--purple)}
.gc-a{border-color:rgba(245,158,11,.3);border-top:3px solid var(--amber)}
.gc-r{border-color:rgba(239,68,68,.3);border-top:3px solid var(--red)}
.ci{font-size:1.7rem;margin-bottom:8px;display:block}
.ct{font-size:.9rem;font-weight:700;color:#fff;margin-bottom:5px}
.cb{font-size:.78rem;color:rgba(255,255,255,.58);line-height:1.65}
.cb strong{color:rgba(255,255,255,.88)}
.kn{font-family:Orbitron,sans-serif;font-size:2.5rem;font-weight:900;background:linear-gradient(135deg,var(--cyan),var(--teal));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;line-height:1;margin-bottom:4px}
.kl{font-size:.68rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.4)}
.fr{display:flex;align-items:flex-start;gap:14px;padding:11px 0;border-bottom:1px solid rgba(255,255,255,.06)}
.fr:last-child{border-bottom:none}
.fi{width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0}
.fn{font-size:.86rem;font-weight:700;color:#fff;margin-bottom:3px}
.fd{font-size:.74rem;color:rgba(255,255,255,.53);line-height:1.5}
.ct2{width:100%;border-collapse:collapse;font-size:.78rem}
.ct2 th{padding:9px 13px;font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;background:rgba(255,255,255,.06);color:rgba(255,255,255,.45)}
.ct2 td{padding:8px 13px;border-bottom:1px solid rgba(255,255,255,.06);vertical-align:middle}
.ct2 tr:last-child td{border-bottom:none}
.ct2 tr:hover td{background:rgba(255,255,255,.03)}
.ty{color:var(--green);font-weight:700}
.tn{color:rgba(255,255,255,.3)}
.tc{color:rgba(255,255,255,.72);font-weight:500}
.ai-g{display:grid;grid-template-columns:repeat(4,1fr);gap:11px;margin-top:18px}
.aic{padding:16px 14px;background:rgba(99,102,241,.08);border:1px solid rgba(99,102,241,.2);border-radius:13px;text-align:center;transition:all .25s}
.aic:hover{background:rgba(99,102,241,.16);border-color:rgba(99,102,241,.4);transform:translateY(-2px)}
.acc{font-family:Orbitron,sans-serif;font-size:.58rem;font-weight:700;letter-spacing:2px;color:#a5b4fc;margin-bottom:7px}
.acn{font-size:.8rem;font-weight:700;color:#fff;margin-bottom:5px}
.acd{font-size:.68rem;color:rgba(255,255,255,.48);line-height:1.5}
.aci{font-size:1.3rem;margin-bottom:7px}
.tag{padding:4px 11px;border-radius:20px;font-size:.68rem;font-weight:600;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);color:rgba(255,255,255,.68)}
.tag.c{background:rgba(0,212,255,.12);border-color:rgba(0,212,255,.3);color:var(--cyan)}
.tag.g{background:rgba(16,185,129,.12);border-color:rgba(16,185,129,.3);color:var(--green)}
.tag.i{background:rgba(99,102,241,.15);border-color:rgba(99,102,241,.35);color:#a5b4fc}
.tag.a{background:rgba(245,158,11,.15);border-color:rgba(245,158,11,.35);color:var(--amber)}
#s1{align-items:center;justify-content:center;text-align:center;background:radial-gradient(ellipse 80% 60% at 50% 40%,rgba(0,100,160,.35) 0%,transparent 70%),linear-gradient(160deg,#040810 0%,#050d1c 40%,#07111f 100%)}
.logo{font-family:Orbitron,sans-serif;font-size:.72rem;font-weight:700;letter-spacing:4px;color:rgba(255,255,255,.38);text-transform:uppercase;margin-bottom:26px}
.logo span{color:var(--cyan)}
.mt{font-family:Orbitron,sans-serif;font-size:4.8rem;font-weight:900;line-height:1;background:linear-gradient(135deg,#fff 0%,#a8d8f0 40%,var(--cyan) 70%,var(--cyan2) 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:8px;filter:drop-shadow(0 0 40px rgba(0,180,255,.3))}
.mts{font-size:1.1rem;color:rgba(255,255,255,.45);letter-spacing:3px;text-transform:uppercase;margin-bottom:40px}
.ctags{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:48px}
.ctag{padding:8px 20px;border-radius:30px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.05);font-size:.76rem;font-weight:600;letter-spacing:1px;color:rgba(255,255,255,.68)}
.ckpis{display:flex;gap:22px;justify-content:center}
.ckpi{text-align:center;padding:15px 26px;background:rgba(255,255,255,.04);border:1px solid rgba(0,212,255,.2);border-radius:13px}
.ckn{font-family:Orbitron,sans-serif;font-size:1.75rem;font-weight:900;color:var(--cyan)}
.ckl{font-size:.62rem;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,.32);margin-top:4px}
.cft{position:absolute;bottom:26px;left:0;right:0;text-align:center;font-size:.68rem;color:rgba(255,255,255,.18);letter-spacing:2px;text-transform:uppercase}
.agr{display:grid;grid-template-columns:1fr 1fr;gap:13px;margin-top:24px;flex:1}
.agi{display:flex;align-items:center;gap:13px;padding:13px 17px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:12px}
.agn{width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,var(--cyan),var(--cyan2));display:flex;align-items:center;justify-content:center;font-family:Orbitron,sans-serif;font-weight:700;font-size:.82rem;color:#000;flex-shrink:0}
.agt{font-size:.83rem;font-weight:600;color:rgba(255,255,255,.83)}
.ags{font-size:.68rem;color:rgba(255,255,255,.38);margin-top:2px}
.arch-s{display:grid;grid-template-columns:1fr 1fr;gap:22px;margin-top:18px;flex:1}
.arl{display:flex;align-items:center;gap:13px;padding:9px 16px;border-radius:10px;margin-bottom:5px}
.ari{width:38px;height:38px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0}
.arla{font-size:.58rem;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin-bottom:2px}
.ard{font-size:.76rem;color:rgba(255,255,255,.68)}
.ara{font-size:.68rem;color:rgba(255,255,255,.22);padding-left:16px;margin-bottom:4px}
.fs{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:18px;flex:1}
.ug{display:grid;grid-template-columns:1fr 1fr;gap:13px;margin-top:16px}
.kg{display:grid;grid-template-columns:repeat(4,1fr);gap:15px;margin-top:18px}
.kc{padding:20px 16px;text-align:center;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:13px}
.dg{display:grid;grid-template-columns:repeat(3,1fr);gap:15px;margin-top:20px}
#s12{align-items:center;justify-content:center;text-align:center;background:radial-gradient(ellipse 60% 50% at 50% 50%,rgba(0,100,180,.3) 0%,transparent 70%),linear-gradient(160deg,#040810 0%,#050d1c 40%,#07111f 100%)}
.ctas{display:flex;gap:18px;justify-content:center;margin-top:28px}
.ctac{flex:1;max-width:255px;padding:20px 18px;background:rgba(255,255,255,.04);border:1px solid rgba(0,212,255,.15);border-radius:14px}
"""

SLIDES = [
    # S1 COVER
    '''<div class="sl" id="s1">
<div class="logo">Goose Digital &middot; <span>Industrial Intelligence Solutions</span></div>
<div class="mt">CIP Dashboard</div>
<div class="mts">Clean-In-Place &middot; AI-Powered &middot; Real-Time</div>
<div class="ctags">
 <div class="ctag">Real-Time Monitoring</div>
 <div class="ctag">7 AI Diagnostic Models</div>
 <div class="ctag">Industrial Edge Ready</div>
 <div class="ctag">Full Analytics Suite</div>
</div>
<div class="ckpis">
 <div class="ckpi"><div class="ckn">99.96%</div><div class="ckl">AI Accuracy</div></div>
 <div class="ckpi"><div class="ckn">7</div><div class="ckl">AI Models</div></div>
 <div class="ckpi"><div class="ckn">3s</div><div class="ckl">Live Refresh</div></div>
 <div class="ckpi"><div class="ckn">1000+</div><div class="ckl">PLC Tags</div></div>
</div>
<div class="cft">Goose Digital &middot; CIP Dashboard v2.1.0 &middot; 2026</div>
</div>''',

    # S2 AGENDA
    '''<div class="sl dark" id="s2">
<div class="badge">Overview</div>
<div class="h2">What We Will Cover Today</div>
<div class="sub">A complete walkthrough of CIP Dashboard, written so anyone can understand it.</div>
<div class="agr">
<div class="agi"><div class="agn">1</div><div><div class="agt">What is CIP and the Problem</div><div class="ags">Why this dashboard exists</div></div></div>
<div class="agi"><div class="agn">2</div><div><div class="agt">How It Works - Architecture</div><div class="ags">Data flow from machine to screen</div></div></div>
<div class="agi"><div class="agn">3</div><div><div class="agt">Dashboard Features</div><div class="ags">6 modules explained simply</div></div></div>
<div class="agi"><div class="agn">4</div><div><div class="agt">GOOSE AI Diagnostics</div><div class="ags">The 7 intelligent models</div></div></div>
<div class="agi"><div class="agn">5</div><div><div class="agt">AI Explained Simply</div><div class="ags">What each model does in plain words</div></div></div>
<div class="agi"><div class="agn">6</div><div><div class="agt">vs. Old Systems</div><div class="ags">Why CIP Dashboard wins</div></div></div>
<div class="agi"><div class="agn">7</div><div><div class="agt">Who It Is For</div><div class="ags">Industries and user roles</div></div></div>
<div class="agi"><div class="agn">8</div><div><div class="agt">Key Numbers and ROI</div><div class="ags">The business case</div></div></div>
</div>
</div>''',

    # S3 WHAT IS CIP
    '''<div class="sl navy" id="s3">
<div class="badge">Background</div>
<div class="h2">What is CIP? And What is the Problem?</div>
<div class="sub">Understanding the industrial challenge that CIP Dashboard solves.</div>
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:15px;margin-top:20px;flex:1;align-items:start">
<div class="gc gc-a">
<span class="ci">&#127981;</span>
<div class="ct">The Industrial Challenge</div>
<div style="width:38px;height:3px;background:var(--amber);border-radius:2px;margin-bottom:11px"></div>
<div class="cb"><strong>CIP (Clean-In-Place)</strong> is how factories automatically clean the inside of pipes, tanks and equipment without taking anything apart.<br><br>Used in <strong>food, dairy, pharmaceutical</strong> and chemical factories.<br><br>Each clean uses precise amounts of <strong>hot water, acid and caustic chemicals</strong> in specific steps that must be exactly right.</div>
</div>
<div class="gc gc-r">
<span class="ci">&#9888;</span>
<div class="ct">The Old Way - Blind Monitoring</div>
<div style="width:38px;height:3px;background:var(--red);border-radius:2px;margin-bottom:11px"></div>
<div class="cb">Traditional SCADA/HMI systems only show <strong>raw numbers</strong> on a screen.<br><br>No intelligence. No predictions. No warnings.<br><br><strong>Problems are discovered AFTER they happen</strong> - causing costly downtime, failed quality checks, and regulatory fines.<br><br>Operators are <strong>always reacting, never preventing.</strong></div>
</div>
<div class="gc gc-c">
<span class="ci">&#129504;</span>
<div class="ct">Our Solution - CIP Dashboard</div>
<div style="width:38px;height:3px;background:var(--cyan);border-radius:2px;margin-bottom:11px"></div>
<div class="cb">Think of it as a <strong>"smart brain"</strong> watching your entire cleaning process 24/7.<br><br>&#9989; Tells you <strong>what is happening right now</strong><br>&#9989; <strong>Warns you before anything goes wrong</strong><br>&#9989; Learns from history to <strong>keep improving</strong><br>&#9989; Runs in any <strong>web browser</strong> on phone, tablet or PC</div>
</div>
</div>
</div>''',

    # S4 ARCHITECTURE
    '''<div class="sl navy" id="s4">
<div class="badge">Architecture</div>
<div class="h2">How It Works - 4 Simple Layers</div>
<div class="sub">Data travels from the factory floor to your screen in under 3 seconds.</div>
<div class="arch-s">
<div>
<div class="arl" style="background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.2)">
<div class="ari" style="background:rgba(245,158,11,.15)">&#128295;</div>
<div><div class="arla" style="color:var(--amber)">Layer 1 - Field</div><div class="ard"><strong style="color:#fff">PLC (Siemens S7) + Sensors</strong> - Temperature, Flow, pH, Conductivity, Pressure</div></div>
</div>
<div class="ara">&#8595; OPC UA / MQTT (Industrial Protocol)</div>
<div class="arl" style="background:rgba(0,212,255,.06);border:1px solid rgba(0,212,255,.2)">
<div class="ari" style="background:rgba(0,212,255,.1)">&#128452;</div>
<div><div class="arla" style="color:var(--cyan)">Layer 2 - Edge</div><div class="ard"><strong style="color:#fff">IIH Essentials + InfluxDB</strong> - Collects and stores all sensor readings</div></div>
</div>
<div class="ara">&#8595; REST API (Docker Network)</div>
<div class="arl" style="background:rgba(16,185,129,.06);border:1px solid rgba(16,185,129,.2)">
<div class="ari" style="background:rgba(16,185,129,.1)">&#9889;</div>
<div><div class="arla" style="color:var(--green)">Layer 3 - App</div><div class="ard"><strong style="color:#fff">Flask API + 7 AI Models</strong> - Processes data, runs predictions</div></div>
</div>
<div class="ara">&#8595; HTTPS / Nginx Proxy</div>
<div class="arl" style="background:rgba(99,102,241,.08);border:1px solid rgba(99,102,241,.25)">
<div class="ari" style="background:rgba(99,102,241,.12)">&#128421;</div>
<div><div class="arla" style="color:#a5b4fc">Layer 4 - Dashboard UI</div><div class="ard"><strong style="color:#fff">React 18 in Any Browser</strong> - The beautiful dashboard you see</div></div>
</div>
</div>
<div style="display:flex;flex-direction:column;gap:11px">
<div class="gc" style="flex:1"><div class="ci">&#128268;</div><div class="ct">Factory Floor (Layer 1)</div><div class="cb">Physical sensors on the CIP equipment read values like temperature and flow rate. A <strong>PLC (computer controller)</strong> collects all these readings every second.</div></div>
<div class="gc" style="flex:1"><div class="ci">&#128190;</div><div class="ct">Data Gateway (Layer 2)</div><div class="cb"><strong>IIH Essentials</strong> (Siemens software) picks up the data and saves it to <strong>InfluxDB</strong> - a super-fast recording system for millions of sensor readings.</div></div>
<div class="gc" style="flex:1"><div class="ci">&#129302;</div><div class="ct">Intelligence (Layer 3)</div><div class="cb">Our <strong>Flask server</strong> fetches the data and passes it through <strong>7 AI models</strong> that analyse everything and generate predictions every 3 seconds.</div></div>
<div class="gc" style="flex:1"><div class="ci">&#127760;</div><div class="ct">Your Screen (Layer 4)</div><div class="cb">The <strong>React dashboard</strong> shows all the results in a clean, modern interface. Open it on any device - PC, tablet, or phone - no special software needed.</div></div>
</div>
</div>
</div>''',

    # S5 FEATURES
    '''<div class="sl dark" id="s5">
<div class="badge">Features</div>
<div class="h2 grn">6 Powerful Dashboard Modules</div>
<div class="sub">Everything an operator, manager, or engineer needs - all in one place.</div>
<div class="fs">
<div class="gc" style="display:flex;flex-direction:column;gap:0">
<div class="fr"><div class="fi" style="background:rgba(0,212,255,.12)">&#128202;</div><div><div class="fn">Live KPI Monitoring</div><div class="fd">Big colour-coded cards showing Temperature, Flow Rate, Conductivity, Pressure and pH - updated every 3 seconds. <strong>Green = Good, Amber = Warning, Red = Alert.</strong></div></div></div>
<div class="fr"><div class="fi" style="background:rgba(16,185,129,.12)">&#128260;</div><div><div class="fn">CIP Cycle Tracking</div><div class="fd">Visual progress bar showing which step is running - Pre-rinse, Caustic wash, Acid wash, or Final rinse. Instantly alerts when a step goes off-track.</div></div></div>
<div class="fr"><div class="fi" style="background:rgba(245,158,11,.12)">&#128200;</div><div><div class="fn">Trend Charts and History</div><div class="fd">Interactive graphs of any parameter over time. Switch between <strong>Live Mode</strong> (last 30 min) or <strong>Historical Mode</strong> (any date range). Export to CSV/Excel.</div></div></div>
</div>
<div class="gc" style="display:flex;flex-direction:column;gap:0">
<div class="fr"><div class="fi" style="background:rgba(239,68,68,.12)">&#128680;</div><div><div class="fn">Alarm Management</div><div class="fd">Three-level alarm system: Critical (Red), Warning (Amber), Info (Blue). Every alarm must be <strong>acknowledged</strong> by an operator - creating a full audit trail for compliance.</div></div></div>
<div class="fr"><div class="fi" style="background:rgba(99,102,241,.12)">&#128176;</div><div><div class="fn">Performance Analytics</div><div class="fd">OEE score, cycle time tracking, water and energy cost tracking. Doughnut chart showing cost split: water 45%, chemicals 35%, energy 20%.</div></div></div>
<div class="fr"><div class="fi" style="background:rgba(168,85,247,.12)">&#128203;</div><div><div class="fn">Reports and Compliance</div><div class="fd">One-click PDF reports for every CIP cycle. <strong>FDA 21 CFR Part 11 compliant</strong>. Role-based access: Admin, Operator, QA Supervisor. No manual reporting ever again.</div></div></div>
</div>
</div>
</div>''',

    # S6 AI ENGINE
    '''<div class="sl indig" id="s6">
<div class="badge" style="background:rgba(168,85,247,.15);border-color:rgba(168,85,247,.4);color:#e879f9">AI Engine</div>
<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:18px">
<div>
<div class="h2 ind">GOOSE AI Diagnostics Engine</div>
<div class="sub">7 specialised AI models running simultaneously. Our biggest competitive advantage. No other system has this.</div>
</div>
<div style="display:flex;gap:14px;flex-shrink:0;margin-top:4px">
<div style="text-align:center;padding:13px 18px;background:rgba(168,85,247,.12);border:1px solid rgba(168,85,247,.25);border-radius:12px"><div style="font-family:Orbitron,sans-serif;font-size:1.7rem;font-weight:900;color:#c084fc">99.96%</div><div style="font-size:.62rem;color:rgba(255,255,255,.38);letter-spacing:1px;text-transform:uppercase;margin-top:3px">Accuracy</div></div>
<div style="text-align:center;padding:13px 18px;background:rgba(168,85,247,.12);border:1px solid rgba(168,85,247,.25);border-radius:12px"><div style="font-family:Orbitron,sans-serif;font-size:1.7rem;font-weight:900;color:#c084fc">3s</div><div style="font-size:.62rem;color:rgba(255,255,255,.38);letter-spacing:1px;text-transform:uppercase;margin-top:3px">Refresh</div></div>
</div>
</div>
<div class="ai-g">
<div class="aic"><div class="aci">&#127919;</div><div class="acc">GOOSE-ALPHA</div><div class="acn">Failure Prediction</div><div class="acd">Predicts the probability of a system failure before it happens. Shows Low / Medium / High risk with a plain-English recommendation.</div></div>
<div class="aic"><div class="aci">&#128138;</div><div class="acc">GOOSE-BETA</div><div class="acn">Cycle Health Monitor</div><div class="acd">Gives the current CIP cycle a school-style grade (A to F). Compares against ideal values from successful past cycles.</div></div>
<div class="aic"><div class="aci">&#127807;</div><div class="acc">GOOSE-GAMMA</div><div class="acn">Resource Optimizer</div><div class="acd">Tracks water saved (L), energy saved (kWh), and CO2 reduction (kg) compared to an unoptimised cycle.</div></div>
<div class="aic"><div class="aci">&#128297;</div><div class="acc">GOOSE-DELTA</div><div class="acn">Hardware Maintenance</div><div class="acd">Monitors pump wear %, valve health %, and predicts exactly how many days until next service is needed.</div></div>
<div class="aic"><div class="aci">&#129514;</div><div class="acc">GOOSE-EPSILON</div><div class="acn">Recipe Intelligence</div><div class="acd">Suggests better temperature and cycle time settings to achieve the same clean using less water and energy.</div></div>
<div class="aic"><div class="aci">&#9879;</div><div class="acc">GOOSE-ZETA</div><div class="acn">Chemical Concentration</div><div class="acd">Monitors actual caustic (NaOH) and acid (HNO3) levels in real-time vs. target. Alerts when out of safe range.</div></div>
<div class="aic"><div class="aci">&#128225;</div><div class="acc">GOOSE-ETA</div><div class="acn">Sensor Drift Detector</div><div class="acd">Detects when a sensor silently starts giving wrong readings. Flags which sensor needs re-calibration before data quality is compromised.</div></div>
<div class="aic" style="background:rgba(0,212,255,.06);border-color:rgba(0,212,255,.2)"><div class="aci">&#127918;</div><div class="acc" style="color:var(--cyan)">SIMULATION</div><div class="acn">Demo Mode</div><div class="acd">When no PLC is connected, all 7 models auto-switch to realistic simulation. Perfect for live demos anywhere.</div></div>
</div>
</div>''',

    # S7 AI EXPLAINED
    '''<div class="sl indig" id="s7">
<div class="badge" style="background:rgba(168,85,247,.15);border-color:rgba(168,85,247,.4);color:#e879f9">AI Explained Simply</div>
<div class="h2 ind">What Does AI Diagnostics Actually Mean?</div>
<div class="sub">Think of it like having 7 expert engineers watching your process 24/7, automatically.</div>
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:15px;margin-top:18px;flex:1">
<div class="gc gc-i">
<div class="ci">&#128302;</div>
<div class="ct">Predicting Problems (ALPHA + BETA)</div>
<div style="width:36px;height:3px;background:var(--indigo);border-radius:2px;margin-bottom:11px"></div>
<div class="cb"><strong>ALPHA</strong> - Like a doctor checking your vitals. It looks at 11 sensor readings and says "this process will fail soon" before you see any symptoms.<br><br><strong>BETA</strong> - Gives your whole cleaning cycle a report card grade (A to F) so you know at a glance how well it is running right now.</div>
</div>
<div class="gc gc-g">
<div class="ci">&#128154;</div>
<div class="ct">Saving Resources (GAMMA + EPSILON)</div>
<div style="width:36px;height:3px;background:var(--green);border-radius:2px;margin-bottom:11px"></div>
<div class="cb"><strong>GAMMA</strong> - Like a fuel efficiency meter in your car. Shows exactly how much water, energy and chemicals you are saving compared to the old way.<br><br><strong>EPSILON</strong> - Acts like a wise advisor who says "try lowering the temperature by 5 degrees - same cleaning result, 15% less energy used."</div>
</div>
<div class="gc gc-p">
<div class="ci">&#128736;</div>
<div class="ct">Protecting Equipment (DELTA + ZETA + ETA)</div>
<div style="width:36px;height:3px;background:var(--purple);border-radius:2px;margin-bottom:11px"></div>
<div class="cb"><strong>DELTA</strong> - Like a car service reminder. "Your pump is 73% worn, service needed in 12 days." No more surprise breakdowns.<br><br><strong>ZETA</strong> - Checks if chemical concentrations are exactly right - not too strong, not too weak.<br><br><strong>ETA</strong> - Catches when a sensor silently starts giving wrong readings before it causes problems.</div>
</div>
</div>
<div style="margin-top:15px;padding:13px 18px;background:rgba(168,85,247,.08);border:1px solid rgba(168,85,247,.25);border-radius:11px">
<div style="font-size:.8rem;color:rgba(255,255,255,.68)"><strong style="color:#c084fc">How it learns:</strong> All models trained on real historical CIP data using a Random Forest algorithm achieving 99.96% accuracy. Runs every 3 seconds on live sensor readings. No cloud connection required.</div>
</div>
</div>''',

    # S8 COMPARISON
    '''<div class="sl dark" id="s8">
<div class="badge">Comparison</div>
<div class="h2">CIP Dashboard vs. Traditional Systems</div>
<div class="sub">See exactly why conventional SCADA and HMI systems fall short.</div>
<div style="margin-top:16px;flex:1;display:flex;flex-direction:column">
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:12px">
<div style="padding:9px 15px;background:rgba(0,212,255,.08);border:1px solid rgba(0,212,255,.2);border-radius:9px;text-align:center;font-weight:700;font-size:.82rem;color:var(--cyan)">CIP Dashboard (Goose Digital)</div>
<div style="padding:9px 15px;background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.15);border-radius:9px;text-align:center;font-weight:700;font-size:.82rem;color:rgba(239,68,68,.7)">Traditional SCADA / HMI</div>
</div>
<table class="ct2">
<thead><tr><th style="text-align:left;width:26%">Capability</th><th style="text-align:left;width:37%">CIP Dashboard</th><th style="text-align:left;width:37%">Old System</th></tr></thead>
<tbody>
<tr><td class="tc">Data refresh speed</td><td class="ty">Every 3 seconds - near real-time</td><td class="tn">10 to 30 second delays</td></tr>
<tr><td class="tc">AI failure prediction</td><td class="ty">7 ML models, 99.96% accuracy</td><td class="tn">Not available in any standard product</td></tr>
<tr><td class="tc">User interface</td><td class="ty">Modern browser - any device</td><td class="tn">Fixed legacy screen, desktop only</td></tr>
<tr><td class="tc">Deployment time</td><td class="ty">Setup in hours, not weeks</td><td class="tn">Weeks of vendor-specific configuration</td></tr>
<tr><td class="tc">Analytics and cost tracking</td><td class="ty">OEE, cost per cycle, water and energy</td><td class="tn">Basic trends only, no cost analysis</td></tr>
<tr><td class="tc">Sensor drift detection</td><td class="ty">GOOSE-ETA automatic alerts</td><td class="tn">Manual periodic calibration only</td></tr>
<tr><td class="tc">Predictive maintenance</td><td class="ty">GOOSE-DELTA: days to failure</td><td class="tn">Not available</td></tr>
<tr><td class="tc">Licensing cost</td><td class="ty">No per-user fees, flat cost</td><td class="tn">Expensive per-seat licensing</td></tr>
</tbody>
</table>
</div>
</div>''',

    # S9 WHO IS IT FOR
    '''<div class="sl gteal" id="s9">
<div class="badge" style="background:rgba(20,184,166,.12);border-color:rgba(20,184,166,.3);color:var(--teal)">Audience</div>
<div class="h2 tel">Who Uses CIP Dashboard?</div>
<div class="sub">Built for every stakeholder - from the factory floor to the boardroom.</div>
<div class="ug">
<div class="gc gc-c"><div style="display:flex;align-items:center;gap:11px;margin-bottom:11px"><div style="font-size:1.6rem">&#127981;</div><div class="ct" style="font-size:.9rem">Plant Manager</div></div><div class="cb">Needs operational visibility across all circuits. Uses <strong>Dashboard overview, OEE analytics, and cost tracking</strong>. Benefits from summary KPIs at a glance without needing technical knowledge.</div></div>
<div class="gc gc-g"><div style="display:flex;align-items:center;gap:11px;margin-bottom:11px"><div style="font-size:1.6rem">&#128203;</div><div class="ct" style="font-size:.9rem">QA / Compliance Officer</div></div><div class="cb">Requires <strong>FDA 21 CFR Part 11</strong> compliant data records. Uses Reports module for cycle documentation and alarm audit trails. Zero manual reporting ever again.</div></div>
<div class="gc gc-a"><div style="display:flex;align-items:center;gap:11px;margin-bottom:11px"><div style="font-size:1.6rem">&#128295;</div><div class="ct" style="font-size:.9rem">Maintenance Supervisor</div></div><div class="cb">Responds to <strong>predictive alerts from GOOSE-DELTA and ETA</strong>. Shifts from emergency repairs to planned maintenance - reducing unexpected downtime by up to 40%.</div></div>
<div class="gc gc-i"><div style="display:flex;align-items:center;gap:11px;margin-bottom:11px"><div style="font-size:1.6rem">&#128202;</div><div class="ct" style="font-size:.9rem">Operations Director</div></div><div class="cb">Tracks <strong>ROI metrics, multi-site efficiency, sustainability scores</strong>. Uses Analytics dashboards for strategic decisions on water, chemical, and energy investments.</div></div>
</div>
<div style="margin-top:14px">
<div style="font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:rgba(255,255,255,.32);margin-bottom:9px">Target Industries</div>
<div style="display:flex;flex-wrap:wrap;gap:8px">
<div class="tag c">Food and Beverage</div>
<div class="tag g">Dairy Processing</div>
<div class="tag">Pharmaceutical and Biotech</div>
<div class="tag a">Chemical Processing</div>
<div class="tag">Life Sciences</div>
<div class="tag i">Industrial Manufacturing</div>
</div>
</div>
</div>''',

    # S10 ROI
    '''<div class="sl ggrn" id="s10">
<div class="badge" style="background:rgba(16,185,129,.12);border-color:rgba(16,185,129,.3);color:var(--green)">Business Case</div>
<div class="h2 grn">Key Numbers and Return on Investment</div>
<div class="sub">Real business value backed by measurable outcomes.</div>
<div class="kg">
<div class="kc" style="border-top:3px solid var(--green)"><div class="kn">99.96%</div><div style="font-size:.78rem;color:#fff;font-weight:700;margin:7px 0 3px">AI Accuracy</div><div class="kl">On real production data</div></div>
<div class="kc" style="border-top:3px solid var(--cyan)"><div class="kn">30%</div><div style="font-size:.78rem;color:#fff;font-weight:700;margin:7px 0 3px">Water Savings</div><div class="kl">Smart rinse optimisation</div></div>
<div class="kc" style="border-top:3px solid var(--amber)"><div class="kn">40%</div><div style="font-size:.78rem;color:#fff;font-weight:700;margin:7px 0 3px">Less Downtime</div><div class="kl">With predictive maintenance</div></div>
<div class="kc" style="border-top:3px solid var(--purple)"><div class="kn">94.2%</div><div style="font-size:.78rem;color:#fff;font-weight:700;margin:7px 0 3px">OEE Score</div><div class="kl">Overall Equipment Efficiency</div></div>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:13px;margin-top:14px;flex:1">
<div class="gc gc-g"><div class="ci">&#8987;</div><div class="ct">Setup in Hours</div><div class="cb">Docker containerised - one command to start. Traditional SCADA takes weeks. We take hours. <strong>No vendor lock-in.</strong></div></div>
<div class="gc" style="border-top:3px solid var(--amber)"><div class="ci">&#128176;</div><div class="ct">ROI in 6 to 12 Months</div><div class="cb">Savings from <strong>water reduction (30%), chemical optimisation, fewer emergency repairs</strong> and faster compliance reporting pay back the investment within one year.</div></div>
<div class="gc" style="border-top:3px solid var(--cyan)"><div class="ci">&#128220;</div><div class="ct">FDA Compliant</div><div class="cb">Built to meet <strong>FDA 21 CFR Part 11</strong> requirements. Every user action is logged. No more manual record-keeping for audits.</div></div>
</div>
</div>''',

    # S11 DEPLOYMENT
    '''<div class="sl gamb" id="s11">
<div class="badge" style="background:rgba(245,158,11,.12);border-color:rgba(245,158,11,.3);color:var(--amber)">Deployment</div>
<div class="h2 amb">3 Ways to Deploy</div>
<div class="sub">Flexible deployment options to fit your existing infrastructure. No rip-and-replace needed.</div>
<div class="dg">
<div class="gc gc-c" style="display:flex;flex-direction:column">
<div style="font-size:1.9rem;margin-bottom:11px">&#127981;</div>
<div class="ct" style="font-size:.95rem;margin-bottom:3px">Option 1: Siemens Industrial Edge</div>
<div style="font-size:.67rem;font-weight:700;color:var(--cyan);letter-spacing:1px;text-transform:uppercase;margin-bottom:9px">Recommended</div>
<div class="cb" style="flex:1">Packaged as a ready-to-install <strong>Industrial Edge App</strong>. Runs directly on Siemens Edge hardware next to your factory equipment.<br><br>&#10003; No cloud needed<br>&#10003; Maximum security<br>&#10003; Fastest data speed<br>&#10003; Plug-and-play with existing Siemens PLCs</div>
</div>
<div class="gc gc-g" style="display:flex;flex-direction:column">
<div style="font-size:1.9rem;margin-bottom:11px">&#128051;</div>
<div class="ct" style="font-size:.95rem;margin-bottom:3px">Option 2: Any Linux Server</div>
<div style="font-size:.67rem;font-weight:700;color:var(--green);letter-spacing:1px;text-transform:uppercase;margin-bottom:9px">Most Flexible</div>
<div class="cb" style="flex:1">Deploy on any existing Ubuntu or Debian server using a single command:<br><code style="background:rgba(0,0,0,.3);padding:3px 7px;border-radius:5px;font-size:.73rem;color:var(--green);display:inline-block;margin:7px 0">docker compose up</code><br><br>&#10003; Works on existing servers<br>&#10003; No special hardware needed<br>&#10003; Full control of your data</div>
</div>
<div class="gc gc-p" style="display:flex;flex-direction:column">
<div style="font-size:1.9rem;margin-bottom:11px">&#9729;</div>
<div class="ct" style="font-size:.95rem;margin-bottom:3px">Option 3: Cloud (Azure or AWS)</div>
<div style="font-size:.67rem;font-weight:700;color:#c084fc;letter-spacing:1px;text-transform:uppercase;margin-bottom:9px">Multi-Site Ready</div>
<div class="cb" style="flex:1">Monitor <strong>multiple factories</strong> from one central dashboard in the cloud.<br><br>&#10003; Monitor all sites in one place<br>&#10003; Access from anywhere<br>&#10003; Scales automatically<br>&#10003; Secure VPN connectivity</div>
</div>
</div>
<div style="margin-top:13px;padding:12px 18px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:11px">
<div style="display:flex;gap:18px;flex-wrap:wrap;font-size:.78rem;color:rgba(255,255,255,.7)">
<span><span style="color:var(--green)">&#10003;</span> 3 Docker containers: <strong>Backend API + AI Engine + Dashboard UI</strong></span>
<span><span style="color:var(--green)">&#10003;</span> <strong>Dark and Light mode</strong> for any lighting environment</span>
<span><span style="color:var(--green)">&#10003;</span> <strong>Role-based access</strong>: Admin, Operator, QA Supervisor</span>
<span><span style="color:var(--green)">&#10003;</span> <strong>Mobile responsive</strong> on tablets and phones</span>
</div>
</div>
</div>''',

    # S12 CTA
    '''<div class="sl" id="s12">
<div style="position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;text-align:center">
<div class="badge">Summary</div>
<div class="mt" style="font-size:3.5rem">CIP Dashboard</div>
<div style="font-size:.96rem;color:rgba(255,255,255,.45);letter-spacing:2px;text-transform:uppercase;margin-bottom:28px">The Smarter Way to Run Clean-In-Place</div>
<div class="ctas">
<div class="ctac"><span style="font-size:1.9rem;display:block;margin-bottom:9px">&#9889;</span><div style="font-size:.88rem;font-weight:700;color:#fff;margin-bottom:5px">Real-Time Visibility</div><div style="font-size:.74rem;color:rgba(255,255,255,.48);line-height:1.5">Live KPIs, cycle tracking, trend charts - every parameter updated every 3 seconds. Always know what is happening.</div></div>
<div class="ctac"><span style="font-size:1.9rem;display:block;margin-bottom:9px">&#129302;</span><div style="font-size:.88rem;font-weight:700;color:#fff;margin-bottom:5px">AI That Protects You</div><div style="font-size:.74rem;color:rgba(255,255,255,.48);line-height:1.5">7 AI models predicting failures, saving resources, guarding hardware and ensuring sensor accuracy 24/7 automatically.</div></div>
<div class="ctac"><span style="font-size:1.9rem;display:block;margin-bottom:9px">&#128640;</span><div style="font-size:.88rem;font-weight:700;color:#fff;margin-bottom:5px">Easy to Deploy</div><div style="font-size:.74rem;color:rgba(255,255,255,.48);line-height:1.5">Up and running in hours. Works on Siemens Edge, Linux servers, or the cloud. No per-user fees. ROI in 6 to 12 months.</div></div>
</div>
<div style="margin-top:22px;padding:18px 34px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:13px;display:inline-block">
<div style="font-size:.67rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.28);margin-bottom:9px">Get in Touch</div>
<div style="display:flex;gap:28px">
<div style="font-size:.8rem;color:rgba(255,255,255,.58)">Sales: <span style="color:var(--cyan);font-weight:600">sales@goosedigital.com</span></div>
<div style="font-size:.8rem;color:rgba(255,255,255,.58)">Support: <span style="color:var(--cyan);font-weight:600">support@goosedigital.com</span></div>
<div style="font-size:.8rem;color:rgba(255,255,255,.58)">Partners: <span style="color:var(--cyan);font-weight:600">partners@goosedigital.com</span></div>
</div>
</div>
<div style="display:flex;gap:9px;margin-top:18px;justify-content:center;flex-wrap:wrap">
<div class="tag c">FDA 21 CFR Part 11</div>
<div class="tag g">Docker Ready</div>
<div class="tag i">Siemens IIH Compatible</div>
<div class="tag a">Mobile Responsive</div>
</div>
</div>
<div class="cft">Copyright 2026 Goose Digital - Industrial Intelligence Solutions - CIP Dashboard v2.1.0</div>
</div>''',
]

JS = """
var T=12,c=0;
var tr=document.getElementById('track'),dc=document.getElementById('dots'),ct=document.getElementById('ctr'),pf=document.getElementById('pgf');
for(var i=0;i<T;i++){(function(i){var d=document.createElement('div');d.className='dot'+(i===0?' active':'');d.onclick=function(){go(i);};dc.appendChild(d);})(i);}
function upd(){tr.style.transform='translateX(-'+(c*1280)+'px)';var ds=document.querySelectorAll('.dot');for(var i=0;i<ds.length;i++)ds[i].classList.toggle('active',i===c);ct.textContent=(c+1<10?'0':'')+(c+1)+' / 12';pf.style.width=((c+1)/T*100)+'%';}
function go(i){if(i<0||i>=T)return;c=i;upd();}
function nav(d){go(c+d);}
document.addEventListener('keydown',function(e){if(e.key==='ArrowRight'||e.key==='ArrowDown'||e.key===' '){e.preventDefault();nav(1);}else if(e.key==='ArrowLeft'||e.key==='ArrowUp'){e.preventDefault();nav(-1);}else if(e.key==='Home'){e.preventDefault();go(0);}else if(e.key==='End'){e.preventDefault();go(T-1);}else if(e.key.toLowerCase()==='f')toggleFS();});
var tx=0;document.getElementById('vp').addEventListener('touchstart',function(e){tx=e.touches[0].clientX;});document.getElementById('vp').addEventListener('touchend',function(e){var dx=e.changedTouches[0].clientX-tx;if(Math.abs(dx)>50)nav(dx<0?1:-1);});
function toggleFS(){if(!document.fullscreenElement)document.documentElement.requestFullscreen().catch(function(){});else document.exitFullscreen();}
upd();
"""

with open(OUTPUT, 'w', encoding='utf-8') as f:
    f.write('<!DOCTYPE html>\n<html lang="en">\n<head>\n')
    f.write('<meta charset="UTF-8"/>\n')
    f.write('<meta name="viewport" content="width=device-width, initial-scale=1.0"/>\n')
    f.write('<title>CIP Dashboard Presentation | Goose Digital</title>\n')
    f.write('<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Orbitron:wght@400;600;700;900&display=swap" rel="stylesheet"/>\n')
    f.write('<style>\n')
    f.write(CSS)
    f.write('\n</style>\n</head>\n<body>\n')
    f.write('<div id="pgb"><div id="pgf"></div></div>\n')
    f.write('<button id="fsb" onclick="toggleFS()">Fullscreen</button>\n')
    f.write('<div id="kbh">Arrow keys to navigate | F for fullscreen</div>\n')
    f.write('<div id="pres">\n<div id="vp">\n<div id="track">\n')
    for s in SLIDES:
        f.write(s)
        f.write('\n')
    f.write('</div>\n</div>\n')
    f.write('<div id="ctrl">\n')
    f.write('<button class="cbtn" onclick="nav(-1)">&#8592;</button>\n')
    f.write('<div id="dots"></div>\n')
    f.write('<button class="cbtn" onclick="nav(1)">&#8594;</button>\n')
    f.write('<div id="ctr">01 / 12</div>\n')
    f.write('</div>\n</div>\n')
    f.write('<script>\n')
    f.write(JS)
    f.write('\n</script>\n</body>\n</html>\n')

print('Presentation built successfully!')
print('File size:', __import__('os').path.getsize(OUTPUT), 'bytes')

