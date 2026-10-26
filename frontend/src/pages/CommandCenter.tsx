import React, { useEffect, useState } from 'react'
import ReactECharts from 'echarts-for-react'

export default function CommandCenter(){
  const [machines,setMachines]=useState<any[]>([
    {name:'CNC-01',status:'Running',pct:92,temp:'42°C',vib:'1.2 mm/s OK'},
    {name:'PLASMA-03',status:'Idle',pct:45,temp:'Standby',vib:'Maint due 01:30'},
    {name:'ROBOT-ARM-B07',status:'Running',pct:88,temp:'Cycle 1247',vib:'Efficiency 94%'},
    {name:'PACK-LINE-02',status:'Running',pct:76,temp:'Throughput',vib:'210 units/hr'},
  ])
  const [aiAnswer,setAiAnswer]=useState("सह-पायलट: लाइन-3 पर मोटर तापमान 2.4°C अधिक पाया गया। सुझाव: कूलिंग पंप की गति 15% बढ़ाएं • रोकथाम: अगले 2 घंटे में बेयरिंग निरीक्षण निर्धारित • अनुमान: डाउनटाइम जोखिम कम → 12% से 3%")
  const [q,setQ]=useState("")
  const [activeNav,setActiveNav]=useState('CAD Digital Twin')
  const [recording,setRecording]=useState(false)
  const [voiceLang,setVoiceLang]=useState('hi-IN')
  const [showEmergency,setShowEmergency]=useState(true)
  const [uploadedFiles,setUploadedFiles]=useState([{name:'SOP-Cooling-Protocol.pdf', lang:'German', status:'Translated to 14 languages'}, {name:'Safety-Training.mp4', lang:'English', status:'Voice cloned in Hindi/Bhojpuri'}])
  const [voices,setVoices]=useState<SpeechSynthesisVoice[]>([])

  const [rotate,setRotate]=useState(false)
  const [zoomBearing,setZoomBearing]=useState(false)
  const [thermal,setThermal]=useState(false)
  const [showTrend,setShowTrend]=useState(false)
  const [simulateFail,setSimulateFail]=useState(false)

  const NAVS = ['OEE Overview','Problem Statement','Solutions','AI Co-pilot','SOP Knowledge','Power BI Analytics','CAD Digital Twin','Predictive Maintenance']
  const LANGS = [
    {code:'hi-IN', label:'🇮🇳 Hindi - हिंदी'},
    {code:'bho-IN', label:'🇮🇳 Bhojpuri - भोजपुरी'},
    {code:'bn-IN', label:'🇮🇳 Bengali - বাংলা'},
    {code:'ta-IN', label:'🇮🇳 Tamil - தமிழ்'},
    {code:'te-IN', label:'🇮🇳 Telugu'},
    {code:'mr-IN', label:'🇮🇳 Marathi'},
    {code:'en-IN', label:'🇬🇧 English'},
    {code:'de-DE', label:'🇩🇪 German'},
    {code:'ja-JP', label:'🇯🇵 Japanese'},
    {code:'ko-KR', label:'🇰🇷 Korean'},
  ]

  useEffect(()=>{
    const loadVoices=()=> setVoices(window.speechSynthesis.getVoices())
    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices
    const id=setInterval(()=> setMachines(m=>m.map(x=>({...x, pct: Math.max(10, Math.min(99, x.pct + (Math.random()>0.5?1:-1)))}))),3000)
    return()=>clearInterval(id)
  },[])

  const speak = (text:string, langCode:string)=>{
    if(!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    let v = voices.find(vo=>vo.lang===langCode) || voices.find(vo=>vo.lang.startsWith(langCode.split('-')[0])) || voices.find(vo=>vo.lang==='hi-IN') || voices[0]
    if(['bho-IN','mai-IN','mag-IN'].includes(langCode)) v = voices.find(vo=>vo.lang==='hi-IN') || voices.find(vo=>vo.lang.startsWith('hi')) || v
    if(v) u.voice = v
    u.lang = v?.lang || langCode
    u.rate = 0.95
    window.speechSynthesis.speak(u)
  }

  const startVoiceRecognition = ()=>{
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    if(!SpeechRecognition){ alert("Use Chrome"); return }
    const rec = new SpeechRecognition()
    rec.lang = voiceLang
    rec.onstart = ()=> setRecording(true)
    rec.onend = ()=> setRecording(false)
    rec.onerror = ()=> setRecording(false)
    rec.onresult = (event:any)=>{ const transcript = event.results[0][0].transcript; setQ(transcript); setTimeout(()=>askAI(transcript), 400) }
    rec.start()
    setTimeout(()=>{ try{ rec.stop() }catch{}; setRecording(false) }, 6000)
  }

  const askAI = async(textOverride?:string)=>{
    const query = textOverride || q
    if(!query) return
    setAiAnswer("सोच रहा हूँ... / Thinking... / ভাবছি... / யோசிக்கிறேன்...")
    setTimeout(()=>{
      const answers:any={
        'hi-IN': `नमस्ते! आपके प्रश्न "${query}" के लिए: बेयरिंग वाइब्रेशन लिमिट 4.5 mm/s (SOP Page 47)।`,
        'bho-IN': `प्रणाम! "${query}" खातिर: मोटर के तापमान 42°C से ज्यादा होखे पर कूलिंग पंप 15% बढ़ाईं।`,
        'bn-IN': `নমস্কার! আপনার প্রশ্ন "${query}" এর জন্য: বিয়ারিং ভাইব্রেশন সীমা 4.5 mm/s (SOP পৃষ্ঠা 47)।`,
        'ta-IN': `வணக்கம்! உங்கள் கேள்வி "${query}" க்கு: பேரிங் அதிர்வு வரம்பு 4.5 mm/s`,
        'en-IN': `Hello! For "${query}": Bearing vibration threshold is 4.5 mm/s. Current MOTOR-12 is 1.2 mm/s - still OK.`,
      }
      const ans = answers[voiceLang] || answers['en-IN']
      setAiAnswer(ans)
      speak(ans, voiceLang)
    },900)
  }

  const chartOpt = {
    xAxis:{type:'category', data:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], axisLabel:{color:'#8899aa'}},
    yAxis:{type:'value', axisLabel:{color:'#8899aa'}},
    series:[{type:'bar', data:[720,780,810,790,830,760,800], itemStyle:{color:'#22d3ee'}}],
    grid:{left:30,right:10,top:10,bottom:20},
  }

  const MOTOR_LOCAL = "/motor-3d.jpg"
  const MOTOR_FALLBACK = "/motor-3d.png"

  return (
    <div style={{background:'#051121', minHeight:'100vh', color:'white', fontFamily:'Inter, sans-serif'}}>
      <style>{`
        @keyframes pulse{0%{box-shadow:0 0 0 0 rgba(34,211,238,0.7)}70%{box-shadow:0 0 0 10px rgba(34,211,238,0)}100%{box-shadow:0 0 0 0 rgba(34,211,238,0)}}
        @keyframes rotate3d{0%{transform:rotateY(0deg)}100%{transform:rotateY(360deg)}}
        .card{background:linear-gradient(145deg, #0f203f, #0a1930); border:1px solid #1e3a52; border-radius:12px; padding:12px;}
        .btn{background:#12304a; color:white; padding:6px 12px; border-radius:8px; border:1px solid #1e3a52; cursor:pointer; font-size:11px;}
        .btn:hover{background:#22d3ee; color:black;}
        .btn-active{background:#22d3ee !important; color:black !important; font-weight:800}
        .ring{width:56px; height:56px; border-radius:50%; border:4px solid #22d3ee; display:flex; align-items:center; justify-content:center; font-weight:800; animation:pulse 2s infinite}
        .row{display:flex; justify-content:space-between; font-size:11px; padding:6px 0; border-bottom:1px solid #12304a}
        .live-dot{width:8px; height:8px; background:#22c55e; border-radius:50%; display:inline-block; animation:pulse 1s infinite}
        .motor-rotate{animation:rotate3d 2.5s linear infinite}
        .motor-zoom{transform:scale(1.7); transition:0.6s}
        .motor-thermal{filter:sepia(1) hue-rotate(-50deg) saturate(3) contrast(1.2)}
      `}</style>

      <div style={{position:'sticky', top:0, zIndex:100, background:'rgba(5,17,33,0.95)', backdropFilter:'blur(10px)', display:'flex', gap:6, padding:'10px 12px', overflowX:'auto', borderBottom:'1px solid #1e3a52'}}>
        <div style={{fontWeight:900,color:'#22d3ee',marginRight:12, fontSize:14}}>⬢ INDUX-OS V12 <span style={{fontSize:9, background:'#22d3ee', color:'black', padding:'2px 6px', borderRadius:4}}>MULTI-MODAL GEN AI</span></div>
        {NAVS.map((n)=><div key={n} onClick={()=>setActiveNav(n)} style={{cursor:'pointer', background: activeNav===n ? '#22d3ee' : '#102a43', color: activeNav===n ? '#000' : '#cbd5e1', padding:'7px 12px', borderRadius:8, fontSize:11, whiteSpace:'nowrap', fontWeight: activeNav===n ? 800 : 500}}>{n}</div>)}
        <button
          onClick={() => {
            window.location.href = '/FactoryIntelligence';
          }}
          style={{
            background: 'linear-gradient(135deg, #22d3ee, #0ea5e9)',
            color: '#03111f',
            padding: '7px 14px',
            borderRadius: 8,
            border: '1px solid #22d3ee',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 900,
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}
        >
          🏭 Factory Intelligence ↗
        </button>
        <div style={{marginLeft:'auto',fontSize:11, display:'flex', alignItems:'center', gap:8}}><span className="live-dot"></span> Ashish • Admin</div>
      </div>

      {showEmergency && activeNav!=='Predictive Maintenance' && (
        <div style={{background:'linear-gradient(90deg, #ef4444, #b91c1c)', padding:'8px 16px', display:'flex', justifyContent:'space-between', fontSize:12}}>
          <span>🚨 EMERGENCY: MOTOR-12 Temp 2.4°C HIGH + Vibration 1.2 mm/s — Risk 12% → Auto-Alert Sent to Supervisor • Sriperumbudur Line-3</span>
          <span><button onClick={()=>setActiveNav('Predictive Maintenance')} style={{background:'white', color:'red', borderRadius:6, padding:'2px 8px', border:'none', cursor:'pointer', fontWeight:700}}>VIEW + CONNECT HEAD</button> <button onClick={()=>setShowEmergency(false)} style={{marginLeft:8, background:'transparent', color:'white', border:'1px solid white', borderRadius:6, padding:'2px 8px'}}>X</button></span>
        </div>
      )}

      {activeNav==='OEE Overview' && (
        <div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:10,padding:12}}>
            <div className="card" style={{display:'flex',gap:12, alignItems:'center'}}><div className="ring">87%</div><div style={{fontSize:11}}>OEE<br/><b>Target: 90%</b><br/>Availability 92%<br/>Performance 88%<br/>Quality 99%</div></div>
            <div className="card"><div style={{fontSize:11, opacity:0.7}}>Production Output</div><div style={{fontSize:22,fontWeight:800}}>4862 / 5000</div><div style={{fontSize:10, color:'#22c55e'}}>+142 vs yesterday ↑</div><div style={{height:4, background:'#12304a', borderRadius:4, marginTop:6}}><div style={{width:'87%', height:'100%', background:'#22d3ee'}}></div></div></div>
            <div className="card"><div style={{fontSize:11}}>Energy</div><div style={{fontSize:22,fontWeight:800}}>1245 MWh</div><div style={{fontSize:10}}>↓ 4.2% vs avg • ₹1.24L</div></div>
            <div className="card"><div style={{fontSize:11}}>Water</div><div style={{fontSize:22,fontWeight:800}}>12430 m³</div><div style={{fontSize:10}}>Recycled 68% • Flow 512 m³/h</div></div>
            <div className="card"><div style={{fontSize:11}}>Active Machines</div><div style={{fontSize:22,fontWeight:800}}>18 / 20</div><div style={{fontSize:10, color:'#eab308'}}>2 Offline • 90% Uptime</div></div>
            <div className="card" style={{background:'linear-gradient(145deg, #052e1f, #0a1930)'}}><div style={{fontSize:11}}>Safety • PPE</div><div style={{fontSize:22,fontWeight:800}}>0 Incidents</div><div style={{fontSize:10}}>CAM-07 AI Detection 98%</div></div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1.6fr 1fr 1fr',gap:10,padding:'0 12px 12px'}}>
            <div className="card"><b>📍 Live Factory View — Sriperumbudur, Tamil Nadu • 12.98°N 79.95°E • Monitoring 132 IoT Sensors</b><img src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1200" style={{width:'100%',height:340,objectFit:'cover',borderRadius:10,marginTop:8}}/><div style={{display:'flex',gap:6,marginTop:8}}><span className="btn">🏭 Bay of Bengal 18km E</span><span className="btn">🛣 NH48</span><span className="btn">⚓ Chennai Port 45km</span><span className="btn" style={{background:'#22c55e', color:'white'}}>● LIVE REC</span></div><div style={{marginTop:10}}><b>Machine Status (Real-time)</b>{machines.map(m=><div key={m.name} className="row"><span>{m.name} — <span style={{color: m.status==='Running'?'#22c55e':'#eab308'}}>{m.status}</span> {m.pct}%</span><span>Temp {m.temp} • {m.vib}</span></div>)}</div></div>
            <div><div className="card" style={{border:'1px solid #22d3ee'}}><div style={{display:'flex',justifyContent:'space-between'}}><b>✨ AI Co-pilot — Multi-Lingual</b><span style={{background:'#22d3ee',color:'#000',padding:'2px 8px',borderRadius:6,fontSize:10}}>30 LANGS</span></div><div style={{background:'#051121',borderRadius:8,padding:10,marginTop:8,fontSize:12, border:'1px solid #1e3a52'}}>{aiAnswer}</div><div style={{display:'flex',gap:6,marginTop:8, flexWrap:'wrap'}}><button className="btn" style={{background:'#22d3ee',color:'#000'}} onClick={()=>setActiveNav('AI Co-pilot')}>Open Full Co-pilot</button><button className="btn" onClick={()=>setActiveNav('Predictive Maintenance')}>Connect Supervisor</button></div></div><div className="card" style={{marginTop:10}}><b>Power BI Analytics — Daily Output Last 7 Days</b><ReactECharts option={chartOpt} style={{height:200}}/><div style={{fontSize:10}}>Avg 761 units • Trend +5.2% • AI Predicted Tomorrow: 812 units</div></div></div>
            <div><div className="card"><b>CAD Digital Twin — MOTOR MODEL (Live Telemetry)</b><img src={MOTOR_LOCAL} onError={e=>{(e.target as HTMLImageElement).src=MOTOR_FALLBACK}} style={{width:'100%',height:150,objectFit:'contain', background:'#0a1930', borderRadius:8}}/><div style={{fontSize:11, display:'grid', gridTemplateColumns:'1fr 1fr', gap:4, marginTop:6}}><span>Stator: 41°C OK</span><span>RPM: 1485</span><span>Bearing: OK</span><span>Load: 78%</span><span>Vib: 1.2 mm/s</span><span>Health: 94%</span></div></div><div className="card" style={{marginTop:10}}><b>Camera Vision — PPE Detection — CAM-07 • AI YOLOv8</b><img src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600" style={{width:'100%',height:130,objectFit:'cover',borderRadius:8}}/><div style={{fontSize:10,display:'flex',gap:6,marginTop:6, flexWrap:'wrap'}}><span style={{border:'1px solid #22c55e',padding:'3px 6px', borderRadius:4}}>Helmet: 98%</span><span style={{border:'1px solid #22c55e',padding:'3px 6px', borderRadius:4}}>Vest: 97%</span><span style={{border:'1px solid #22c55e',padding:'3px 6px', borderRadius:4}}>Gloves: 96%</span><span style={{background:'#22c55e', color:'white', padding:'3px 6px', borderRadius:4}}>PPE: OK</span></div></div></div>
          </div>
        </div>
      )}

      {activeNav==='Problem Statement' && (
        <div style={{padding:16}}>
          <div style={{display:'grid', gridTemplateColumns:'1.2fr 1fr', gap:16}}>
            <div className="card" style={{padding:20}}>
              <h1 style={{fontSize:28, fontWeight:900}}>Problem Statement — Why INDUX-OS Needed?</h1>
              <img src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800" style={{width:'100%', height:220, objectFit:'cover', borderRadius:12, margin:'14px 0'}}/>
              <div style={{fontSize:13, lineHeight:'22px'}}>
                <div style={{background:'#1a0a0a', borderLeft:'4px solid #ef4444', padding:12, borderRadius:8, marginBottom:12}}><b>❌ Current Reality at Sriperumbudur Plant:</b> OEE 78% only, 142 units lost/day = ₹2.4L/hour loss when MOTOR-12 fails. 70% workforce from Bihar, UP, Bengal, Tamil Nadu — SOPs only in English.</div>
                <ul><li>🔴 <b>Language Barrier:</b> Hindi, Bhojpuri, Maithili, Magahi, Tamil, Telugu, Bengali — can't read English SOPs → Safety incidents ↑ 23%</li><li>🔴 <b>Data Silos:</b> MES, ERP SAP, SCADA PLC, IoT 132 — not connected</li><li>🔴 <b>No Predictive:</b> Bearing failure only after breakdown</li><li>🔴 <b>Manual PPE Checking:</b> Misses 12% cases</li><li>🔴 <b>Foreign Heads:</b> German/Japanese/Korean SOPs — workers can't understand</li></ul>
              </div>
            </div>
            <div>
              <div className="card" style={{padding:16}}><h3>Impact Metrics</h3><div style={{marginTop:10, fontSize:12}}><div className="row"><span>Downtime / Month</span><span style={{color:'#ef4444'}}>42 hrs</span></div><div className="row"><span>Language Mismatch</span><span>70%</span></div><div className="row"><span>PPE Non-Compliance</span><span>12%</span></div><div className="row"><span>SOP Search Time</span><span>18 mins</span></div><div className="row"><span>Incident Response</span><span>25 mins</span></div></div></div>
              <div className="card" style={{padding:16, marginTop:12}}><h3>Worker Persona — Ramesh (Bihar)</h3><p style={{fontSize:12, marginTop:8}}>Language: Bhojpuri + Hindi. Works on CNC-01. "SOP अंग्रेजी में बा, समझ में ना आवेला। मोटर गरम होला त का करीं?"<br/><br/>Needs: Bol ke puchhe, Bhojpuri me jawaab sunke, Video dekhe, na samjhe to Head se connect kare</p></div>
            </div>
          </div>
        </div>
      )}

      {activeNav==='Solutions' && (
        <div style={{padding:16}}>
          <h1 style={{fontSize:28, fontWeight:900, textAlign:'center'}}>Complete Solution — Multi-Modal Gen AI INDUX-OS V12 Architecture</h1>
          <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:14, marginTop:16}}>
            {[
              {title:'1. Unified Command Center', desc:'MES + ERP SAP + SCADA PLC + 132 IoT + Power BI + Camera Vision in one OEE 87% dashboard.', img:'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400'},
              {title:'2. Multi-Lingual Voice AI (30 Langs)', desc:'Worker speaks ANY language → STT Whisper → LLM RAG → TTS Real Human Cloned Voice.', img:'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400'},
              {title:'3. SOP Knowledge — Any Format', desc:'Head uploads PDF/DOC/TXT/Video in German/Japanese/English → Auto Translate to all worker languages.', img:'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400'},
              {title:'4. CAD Digital Twin + Predictive', desc:'MOTOR 3D Model live telemetry: Temp, RPM, Vibration, Load. AI predicts bearing failure 38 hrs before.', img:MOTOR_LOCAL},
              {title:'5. Emergency Auto-Alert + Supervisor Connect', desc:'If Temp >42°C or Vib >4.5 or PPE missing → Instant Alert: Buzzer + WhatsApp + Dashboard RED.', img:'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400'},
              {title:'6. Human-in-Loop Escalation', desc:'If AI confidence <70% or worker clicks "Not Understood" → Direct Connect to Head Authority via WebRTC.', img:'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=400'},
            ].map(c=>(
              <div key={c.title} className="card" style={{padding:14}}><img src={c.img} onError={e=>{(e.target as HTMLImageElement).src=MOTOR_FALLBACK}} style={{width:'100%', height:140, objectFit:'cover', borderRadius:8, background:'#0a1930'}}/><h3 style={{marginTop:10, fontSize:14, fontWeight:800}}>{c.title}</h3><p style={{fontSize:11, marginTop:6}}>{c.desc}</p></div>
            ))}
          </div>
        </div>
      )}

      {activeNav==='AI Co-pilot' && (
        <div style={{padding:16, display:'grid', gridTemplateColumns:'1.3fr 0.7fr', gap:16}}>
          <div className="card" style={{padding:20}}>
            <h2>✨ AI Co-pilot — Speak ANY Language, Get Answer in Your Language + Real Human Voice</h2>
            <div style={{display:'flex', gap:8, marginTop:12, flexWrap:'wrap'}}>
              <select value={voiceLang} onChange={e=>setVoiceLang(e.target.value)} style={{background:'#051121', color:'white', border:'1px solid #22d3ee', borderRadius:8, padding:'8px'}}>
                {LANGS.map(l=><option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
              <button className="btn" onClick={startVoiceRecognition} style={{background: recording?'#ef4444':'#22d3ee', color: recording?'white':'black', padding:'10px 16px'}}>{recording?'● Listening... बोलिए':'🎤 Push to Talk'}</button>
              <button className="btn" onClick={()=>{window.speechSynthesis.cancel(); setRecording(false)}}>⏹ Stop</button>
            </div>
            <div style={{background:'#051121', border:'2px solid #22d3ee', borderRadius:12, padding:16, marginTop:16, minHeight:120, fontSize:14}}>{aiAnswer}</div>
            <div style={{display:'flex', gap:8, marginTop:14}}>
              <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Type in Hindi/Bhojpuri/Bengali/Tamil/English..." style={{flex:1, background:'#051121', border:'1px solid #1e3a52', color:'white', borderRadius:10, padding:'12px'}}/>
              <button onClick={()=>askAI()} style={{background:'#22d3ee', color:'black', borderRadius:10, padding:'0 24px', fontWeight:800, cursor:'pointer', border:'none'}}>Ask →</button>
            </div>
          </div>
          <div>
            <div className="card" style={{padding:16}}><h3>🎙️ Real Human Voice Clone - 30 Languages</h3><img src="https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400" style={{width:'100%', height:160, objectFit:'cover', borderRadius:8, marginTop:8}}/><p style={{fontSize:11, marginTop:8}}>Supports Tamil தமிழ், Bengali বাংলা, Hindi, Bhojpuri + German, Japanese, Korean.</p><div style={{marginTop:8, fontSize:10, background:'#051121', padding:8, borderRadius:6}}>Available voices: {voices.length} loaded ✅<br/>Current: {voiceLang}</div></div>
          </div>
        </div>
      )}

      {activeNav==='SOP Knowledge' && (
        <div style={{padding:16}}>
          <h1 style={{fontSize:24, fontWeight:800}}>SOP Knowledge Base — Multi-Lingual Ingestion (PDF/DOC/TXT/Video)</h1>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginTop:14}}>
            <div className="card" style={{padding:16, border:'2px dashed #22d3ee'}}>
              <h3>📤 Head Upload Zone — Any Language</h3>
              <div style={{background:'#051121', padding:20, borderRadius:10, marginTop:12, textAlign:'center'}}><div style={{fontSize:40}}>📄</div><div style={{fontSize:12, marginTop:8}}>Drag & Drop PDF, DOC, TXT, MP4, MP3</div><button className="btn" style={{background:'#22d3ee', color:'black', marginTop:12, width:'auto'}} onClick={()=>setUploadedFiles([...uploadedFiles, {name:'New-SOP-'+Date.now()+'.pdf', lang:'Uploaded', status:'Translating...'}])}>Choose Files</button></div>
              <div style={{marginTop:14}}>{uploadedFiles.map(f=><div key={f.name} className="row"><span>📄 {f.name} ({f.lang})</span><span style={{color:'#22c55e', fontSize:10}}>{f.status}</span></div>)}</div>
            </div>
            <div className="card" style={{padding:16}}>
              <h3>🔍 Worker Search — Ask in Your Language</h3>
              <div style={{display:'flex', gap:8, marginTop:10}}><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search SOP in Tamil/Bengali/Bhojpuri/Hindi..." style={{flex:1, padding:10, background:'#051121', color:'white', border:'1px solid #1e3a52', borderRadius:8}}/><button className="btn" style={{width:'auto'}} onClick={()=>askAI()}>Search</button></div>
              <div style={{background:'#051121', padding:12, borderRadius:8, marginTop:12, fontSize:12}}>{aiAnswer}<br/><br/><span style={{fontSize:10, color:'#22d3ee'}}>📚 Sources: Doc SOP-47 Page 47, Doc SOP-124 Page 12 — 94% confidence</span></div>
            </div>
          </div>
        </div>
      )}

      {activeNav==='Power BI Analytics' && (
        <div style={{padding:16}}>
          <h1>Power BI Analytics — Real-time Factory Intelligence</h1>
          <div style={{display:'grid', gridTemplateColumns:'2fr 1fr', gap:16, marginTop:14}}>
            <div className="card" style={{padding:16}}><b>Daily Output Last 7 Days — AI Predicted +5.2% Trend</b><ReactECharts option={chartOpt} style={{height:320}}/><div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, fontSize:11, marginTop:10}}><div className="btn">Avg 761 units</div><div className="btn">Predicted Tomorrow 812</div><div className="btn">OEE 87% → Target 90%</div><div className="btn" style={{background:'#22c55e'}}>Trend +5.2% UP</div></div></div>
            <div><div className="card" style={{padding:14}}><h3>Energy & Water</h3><div style={{fontSize:12, marginTop:8}}><div>Energy: 1245 MWh ↓ 4.2%</div><div>Cost: ₹1.24L / day</div><div>Water: 12430 m³ Recycled 68%</div></div></div><div className="card" style={{padding:14, marginTop:12}}><h3>Connected Systems</h3><div style={{fontSize:11, marginTop:8}}><div className="row"><span>MES</span><span style={{color:'#22c55e'}}>CONNECTED</span></div><div className="row"><span>ERP SAP</span><span style={{color:'#22c55e'}}>CONNECTED</span></div><div className="row"><span>SCADA PLC</span><span style={{color:'#22c55e'}}>CONNECTED</span></div><div className="row"><span>IoT Sensors</span><span>132/132 ONLINE</span></div></div></div></div>
          </div>
        </div>
      )}

      {activeNav==='CAD Digital Twin' && (
        <div style={{padding:16, textAlign:'center'}}>
          <h1 style={{fontSize:26, fontWeight:900}}>CAD Digital Twin — Live 3D MOTOR MODEL</h1>
          <div style={{display:'grid', gridTemplateColumns:'1.5fr 1fr', gap:16, marginTop:16, textAlign:'left'}}>
            <div className="card" style={{padding:20}}>
              <div style={{width:'100%', height:380, display:'flex', alignItems:'center', justifyContent:'center', background:'#0a1930', borderRadius:12, overflow:'hidden'}}>
                <img src={MOTOR_LOCAL} onError={e=>{(e.target as HTMLImageElement).src=MOTOR_FALLBACK}} className={`${rotate?'motor-rotate':''} ${zoomBearing?'motor-zoom':''} ${thermal?'motor-thermal':''}`} style={{width:'70%', height:'100%', objectFit:'contain', transition:'0.6s'}} alt="Motor"/>
              </div>
              {thermal && <div style={{marginTop:8, fontSize:11, color:'#ef4444', textAlign:'center', fontWeight:800}}>🌡 THERMAL VIEW: Stator Hotspot 44.4°C Detected</div>}
              {zoomBearing && <div style={{marginTop:8, fontSize:11, color:'#22d3ee', textAlign:'center', fontWeight:800}}>🔍 BEARING ZOOM: Inner Race Wear — Vibration 1.2 mm/s</div>}
              {simulateFail && <div style={{marginTop:8, fontSize:11, color:'#ef4444', textAlign:'center', fontWeight:800, background:'#1a0a0a', padding:6, borderRadius:6}}>🚨 SIMULATED FAILURE: Bearing Temp 89°C CRITICAL</div>}
              <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginTop:16}}>
                <div style={{background:'#051121', border:`1px solid ${simulateFail?'#ef4444':'#22c55e'}`, padding:10, borderRadius:8, fontSize:11}}><div style={{opacity:0.7}}>Stator Temp</div><div style={{fontWeight:800, color:simulateFail?'#ef4444':'#22c55e'}}>{simulateFail?'89°C HIGH':'41°C OK'}</div></div>
                <div style={{background:'#051121', border:`1px solid ${simulateFail?'#ef4444':'#22c55e'}`, padding:10, borderRadius:8, fontSize:11}}><div style={{opacity:0.7}}>Bearing Health</div><div style={{fontWeight:800, color:simulateFail?'#ef4444':'#22c55e'}}>{simulateFail?'23% FAIL':'94% OK'}</div></div>
                <div style={{background:'#051121', border:'1px solid #22d3ee', padding:10, borderRadius:8, fontSize:11}}><div style={{opacity:0.7}}>RPM</div><div style={{fontWeight:800, color:'#22d3ee'}}>{simulateFail?'620 LOW':'1485'}</div></div>
                <div style={{background:'#051121', border:'1px solid #eab308', padding:10, borderRadius:8, fontSize:11}}><div style={{opacity:0.7}}>Load</div><div style={{fontWeight:800, color:'#eab308'}}>78%</div></div>
                <div style={{background:'#051121', border:`1px solid ${simulateFail?'#ef4444':'#eab308'}`, padding:10, borderRadius:8, fontSize:11}}><div style={{opacity:0.7}}>Vibration</div><div style={{fontWeight:800, color:simulateFail?'#ef4444':'#eab308'}}>{simulateFail?'6.8 mm/s HIGH':'1.2 mm/s'}</div></div>
                <div style={{background:'#051121', border:'1px solid #ef4444', padding:10, borderRadius:8, fontSize:11}}><div style={{opacity:0.7}}>Predicted Life</div><div style={{fontWeight:800, color:'#ef4444'}}>{simulateFail?'0.5 hrs':'38 hrs'}</div></div>
              </div>
              {showTrend && <div className="card" style={{marginTop:12, padding:12}}><b>Historical Trend — Vibration Last 72 Hrs</b><ReactECharts option={{xAxis:{type:'category', data:['-72h','-60h','-48h','-36h','-24h','-12h','Now'], axisLabel:{color:'#8899aa'}}, yAxis:{type:'value', axisLabel:{color:'#8899aa'}}, series:[{type:'line', data:simulateFail?[1.0,1.8,2.5,3.8,4.2,5.5,6.8]:[1.0,1.1,1.0,1.2,1.3,1.2,1.4], smooth:true, lineStyle:{color:simulateFail?'#ef4444':'#22d3ee', width:3}}], grid:{left:30,right:10,top:10,bottom:20}}} style={{height:180}} /></div>}
            </div>
            <div><div className="card" style={{padding:16}}><h3>🔧 Interactive Controls — WORKING</h3><div style={{marginTop:12, display:'flex', flexDirection:'column', gap:10}}><button className={`btn ${rotate?'btn-active':''}`} onClick={()=>{setRotate(!rotate); setZoomBearing(false); setThermal(false)}}>{rotate?'⏸ Stop Rotation':'▶ Rotate 360°'}</button><button className={`btn ${zoomBearing?'btn-active':''}`} onClick={()=>{setZoomBearing(!zoomBearing); setRotate(false); setThermal(false)}}>🔍 {zoomBearing?'Zoom Out':'Zoom Bearing'}</button><button className={`btn ${thermal?'btn-active':''}`} onClick={()=>{setThermal(!thermal); setZoomBearing(false); setRotate(false)}}>🌡 {thermal?'Normal View':'Thermal View'}</button><button className={`btn ${showTrend?'btn-active':''}`} onClick={()=>setShowTrend(!showTrend)}>📊 {showTrend?'Hide Trend':'Show Historical Trend'}</button><button className="btn" style={{background:'#ef4444', color:'white', fontWeight:800}} onClick={()=>setSimulateFail(!simulateFail)}>🚨 {simulateFail?'Reset Normal':'Simulate Failure'}</button></div></div><div className="card" style={{padding:16, marginTop:12}}><h3>📹 Live Monitoring</h3><img src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=500" style={{width:'100%', height:160, objectFit:'cover', borderRadius:8, marginTop:8}}/><div style={{fontSize:11, marginTop:8}}>Workers: 24 | PPE: 98% OK | Heat Zone: Line-3</div></div></div>
          </div>
        </div>
      )}

      {activeNav==='Predictive Maintenance' && (
        <div style={{padding:16}}>
          <h1>Predictive Maintenance + Emergency Response + Supervisor Connect</h1>
          <div style={{display:'grid', gridTemplateColumns:'1.5fr 1fr', gap:16, marginTop:14}}>
            <div>
              <div style={{background:'linear-gradient(90deg, #ef4444, #991b1b)', padding:16, borderRadius:12, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div><b style={{fontSize:16}}>🚨 EMERGENCY LIVE: MOTOR-12</b><br/><span style={{fontSize:12}}>Bearing wear predicted in 38 hrs • Confidence 94% • Temp 44.4°C (Limit 42°C) • Location: Sriperumbudur Line-3 Bay-2</span></div>
                <button onClick={()=>alert('Calling Head Admin + Supervisor via WebRTC Video...')} style={{background:'white', color:'red', padding:'10px 18px', borderRadius:8, fontWeight:800, cursor:'pointer', border:'none'}}>📞 CONNECT HEAD NOW</button>
              </div>
              <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginTop:14}}>
                <div className="card" style={{borderLeft:'4px solid #ef4444'}}><b style={{color:'#ef4444'}}>CRITICAL</b><br/>MOTOR-12 — Bearing<br/>38 hrs left</div>
                <div className="card" style={{borderLeft:'4px solid #eab308'}}><b style={{color:'#eab308'}}>WARNING</b><br/>PLASMA-03 — Air Pressure Low</div>
                <div className="card" style={{borderLeft:'4px solid #22c55e'}}><b style={{color:'#22c55e'}}>HEALTHY</b><br/>CNC-01 — All OK</div>
              </div>
            </div>
            <div>
              <div className="card" style={{padding:16}}><h3>📹 Live Monitoring — 360° Factory + Workers</h3><img src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=500" style={{width:'100%', height:180, objectFit:'cover', borderRadius:8, marginTop:8}}/><div style={{fontSize:11, marginTop:8}}><div>👷 Workers Detected: 24</div><div>🦺 PPE Compliance: 98%</div><div>🔥 Heat Zone: Line-3 — Alert Active</div></div></div>
              <div className="card" style={{padding:16, marginTop:12}}><h3>🔗 Human-in-Loop Escalation</h3><p style={{fontSize:11, marginTop:8}}>If worker clicks "Not Understood" → Auto Connect to Supervisor</p><button className="btn" style={{marginTop:10, background:'#22d3ee', color:'black', width:'100%'}}>Open Supervisor Dashboard</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}