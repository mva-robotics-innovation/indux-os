import React, { useEffect, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import axios from 'axios'

export default function CommandCenter(){
  const [machines,setMachines]=useState<any[]>([
    {name:'CNC-01',status:'Running',pct:92,temp:'42°C',vib:'OK'},
    {name:'PLASMA-03',status:'Idle',pct:45,temp:'Standby',vib:'Maint due 01:30'},
    {name:'ROBOT-ARM-B07',status:'Running',pct:88,temp:'Cycle 1247',vib:'Efficiency 94%'},
    {name:'PACK-LINE-02',status:'Running',pct:76,temp:'Throughput',vib:'210 units/hr'},
  ])
  const [aiAnswer,setAiAnswer]=useState("सह-पायलट: लाइन-3 पर मोटर तापमान 2.4°C अधिक पाया गया। सुझाव: कूलिंग पंप की गति 15% बढ़ाएं • रोकथाम: अगले 2 घंटे में बेयरिंग निरीक्षण निर्धारित • अनुमान: डाउनटाइम जोखिम कम → 12% से 3%")
  const [q,setQ]=useState("")
  const [incidents,setIncidents]=useState<any[]>([])

  const fetchMachines = async()=>{
    try{
      const token=localStorage.getItem('token')
      const r=await axios.get('http://localhost:8000/api/machines',{headers:{Authorization:`Bearer ${token}`}})
      if(r.data.length) setMachines(r.data.map((m:any)=>({name:m.name,status:m.status,pct:90,temp:m.telemetry?.temperature||'42°C',vib:m.telemetry?.vibration||'OK'})))
    }catch{}
  }

  useEffect(()=>{
    fetchMachines()
    const ws = new WebSocket('ws://localhost:8000/api/ws/telemetry')
    ws.onmessage=(ev)=>{
      const msg=JSON.parse(ev.data)
      setMachines(prev=>prev.map(m=>m.name===msg.machine?{...m,pct:Math.round(msg.telemetry.temperature||m.pct),temp:`${msg.telemetry.temperature}°C`}:m))
    }
    return()=>ws.close()
  },[])

  const askAI = async()=>{
    if(!q) return
    try{
      const token=localStorage.getItem('token')
      const r=await axios.post('http://localhost:8000/api/sop/ask',{query:q,language:'hi',top_k:5},{headers:{Authorization:`Bearer ${token}`}})
      setAiAnswer(r.data.answer + ` (Model: ${r.data.model_used} | ${r.data.latency_ms}ms | Sources: ${r.data.citations.map((c:any)=>`Doc ${c.document_id} P${c.page}`).join(',')})`)
      if('speechSynthesis' in window){ const u=new SpeechSynthesisUtterance(r.data.answer); u.lang='hi-IN'; speechSynthesis.speak(u) }
    }catch{ setAiAnswer("Backend offline — local knowledge: Check bearing per SOP Page 47, vibration threshold 4.5 mm/s") }
  }

  const createIncident = async()=>{
    const token=localStorage.getItem('token')
    const r=await axios.post('http://localhost:8000/api/incidents',{severity:'high',location:'Sriperumbudur',asset:'MOTOR-12',description:'Motor temp 2.4C high detected by AI Co-pilot'},{headers:{Authorization:`Bearer ${token}`}})
    setIncidents([r.data, ...incidents])
    alert(`Incident #${r.data.id} created — notification_log: ${JSON.stringify(r.data.notification_log)}`)
  }

  const chartOpt = {
    xAxis:{type:'category', data:['Mon','Tue','Wed','Thu','Fri','Sat','Sun']},
    yAxis:{type:'value'},
    series:[{type:'bar', data:[720,760,810,790,840,720,690], itemStyle:{color:'#22d3ee'}}],
    grid:{left:30,right:10,top:10,bottom:20}
  }

  return (
    <div>
      <div className="top">
        <div style={{fontWeight:800,color:'#22d3ee',marginRight:12}}>⬢ INDUX-OS V12</div>
        <div style={{background:'#12304a',padding:'4px 8px',borderRadius:6,fontSize:10}}>LIVE • v12.4.1 • UTC+05:30 {new Date().toLocaleTimeString()}</div>
        {['OEE Overview','Problem Statement','Solutions','AI Co-pilot','SOP Knowledge','Power BI Analytics','CAD Digital Twin','Predictive Maintenance'].map((n,i)=>
          <div key={n} className={`nav ${i===0?'active':''}`}>{n}</div>
        )}
        <div style={{marginLeft:'auto',fontSize:11}}>Ashish Administrator</div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:8,padding:8}}>
        <div className="card" style={{display:'flex',gap:10}}><div className="ring">87%</div><div style={{fontSize:11}}>OEE<br/>Target: 90%<br/>Availability 92%<br/>Performance 88%</div></div>
        <div className="card"><div style={{fontSize:11}}>Production Output</div><div style={{fontSize:20,fontWeight:700}}>4862 / 5000</div><div style={{fontSize:10}}>Units Today • +142 vs yesterday</div></div>
        <div className="card"><div style={{fontSize:11}}>Energy</div><div style={{fontSize:20,fontWeight:700}}>1245 MWh</div><div style={{fontSize:10}}>↓ 4.2% vs avg • ₹1.24L cost</div></div>
        <div className="card"><div style={{fontSize:11}}>Water</div><div style={{fontSize:20,fontWeight:700}}>12430 m³</div><div style={{fontSize:10}}>Recycled 68% • Flow 512 m³/h</div></div>
        <div className="card"><div style={{fontSize:11}}>Active Machines</div><div style={{fontSize:20,fontWeight:700}}>18 / 20</div><div style={{fontSize:10}}>2 Offline • 90% Uptime</div></div>
        <div className="card"><div style={{fontSize:11}}>Safety Incidents</div><div style={{fontSize:20,fontWeight:700}}>0</div><div style={{fontSize:10}}>0 days since last incident</div></div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1.5fr 1fr 1fr',gap:8,padding:'0 8px'}}>
        <div className="card">
          <b>📍 Live Factory View — Sriperumbudur, Tamil Nadu • 12.98°N 79.95°E</b>
          <img src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1000" style={{width:'100%',height:320,objectFit:'cover',borderRadius:8,marginTop:6}}/>
          <div style={{display:'flex',gap:6,marginTop:6}}><span className="btn">Bay of Bengal 18km E</span><span className="btn">NH48</span><span className="btn">Chennai Port</span></div>
          <div style={{marginTop:8}}><b>Machine Status</b>{machines.map(m=><div key={m.name} className="row"><span>{m.name} — {m.status} {m.pct}%</span><span>Temp {m.temp} • {m.vib}</span></div>)}</div>
        </div>

        <div>
          <div className="card">
            <div style={{display:'flex',justifyContent:'space-between'}}><b>✨ AI Co-pilot</b><span style={{background:'#22d3ee',color:'#000',padding:'2px 8px',borderRadius:6,fontSize:10}}>AI ACTIVE</span></div>
            <div style={{background:'#0a1930',borderRadius:8,padding:8,marginTop:8,fontSize:12}}>{aiAnswer}</div>
            <div style={{display:'flex',gap:4,marginTop:8}}><button className="btn" style={{background:'#22d3ee',color:'#000'}} onClick={createIncident}>Apply Suggestion</button><button className="btn">Dismiss</button><button className="btn">Create Work Order</button></div>
            <div style={{display:'flex',gap:4,marginTop:8}}><input value={q} onChange={e=>setQ(e.target.value)} placeholder="संदेश लिखें... / Ask follow-up" style={{flex:1,background:'#0a1930',border:'1px solid #1e3a52',color:'white',borderRadius:6,padding:6}}/><button className="btn" onClick={askAI}>→</button></div>
          </div>
          <div className="card" style={{marginTop:8}}>
            <b>Power BI Analytics — Daily Output Last 7 Days</b>
            <ReactECharts option={chartOpt} style={{height:180}}/>
            <div style={{fontSize:10}}>Avg 761 units • Trend +5.2%</div>
          </div>
        </div>

        <div>
          <div className="card">
            <b>CAD Digital Twin — MOTOR MODEL</b>
            <img src="https://cdn3d.iconscout.com/3d/free/thumb/free-electric-motor-3d-model-download-in-png-blend-fbx-gltf-file-formats--industrial-machine-electrical-power-pack-industry-models-5183289.png" style={{width:'100%',height:140,objectFit:'contain'}}/>
            <div style={{fontSize:11}}>Stator OK 41°C • Bearing OK • RPM 1485 • Load 78% • Vib 1.2 mm/s</div>
          </div>
          <div className="card" style={{marginTop:8}}>
            <b>Camera Vision — PPE Detection — CAM-07 Loading Dock • 15:42 LIVE • REC</b>
            <img src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600" style={{width:'100%',height:120,objectFit:'cover',borderRadius:6}}/>
            <div style={{fontSize:10,display:'flex',gap:6,marginTop:4}}><span style={{border:'1px solid #22c55e',padding:'2px 4px'}}>Helmet: CONF 98% Vest: 97%</span><span style={{border:'1px solid #22d3ee',padding:'2px 4px'}}>PPE: OK</span><span style={{border:'1px solid #22d3ee',padding:'2px 4px'}}>Gloves: 96%</span></div>
          </div>
          <div className="card" style={{marginTop:8}}>
            <b>Recent Activity</b>
            <div style={{fontSize:11,marginTop:6}}>
              <div>• SOP-124 updated: Cooling protocol revised</div>
              <div>• Prediction: Bearing wear detected on MOTOR-12 → Scheduled maint</div>
              <div>• Operator logged: Shift Handover Complete</div>
              <div>• Warning: Air pressure low on PLASMA-03 → Auto corrected</div>
              {incidents.map((i:any)=><div key={i.id}>🚨 Incident #{i.id} {i.severity} at {i.location} — Log: {JSON.stringify(i.notification_log)}</div>)}
            </div>
          </div>
        </div>
      </div>

      <div style={{padding:8,fontSize:10,borderTop:'1px solid #1e3a52',marginTop:8,display:'flex',justifyContent:'space-between'}}>
        <span>Connected Systems: MES CONNECTED • ERP SAP CONNECTED • SCADA PLC CONNECTED • IoT Sensors 132/132 ONLINE • Cloud AWS SYNCED 2s ago • Weather API NORMAL</span>
        <span>System Health: 99.2%</span>
      </div>
    </div>
  )
}
// Voice states
const [recording,setRecording]=useState(false)
const [voiceLang,setVoiceLang]=useState('hi-IN')

const startRecording = async()=>{
  try{
    const stream = await navigator.mediaDevices.getUserMedia({audio:true})
    const recorder = new MediaRecorder(stream)
    const chunks:any[]=[]
    recorder.ondataavailable=e=>chunks.push(e.data)
    recorder.onstop=async()=>{
      const blob = new Blob(chunks,{type:'audio/webm'})
      const fd=new FormData(); fd.append('file',blob,'audio.webm')
      const token=localStorage.getItem('token')
      const r=await fetch(`http://localhost:8000/api/voice/transcribe?language=${voiceLang}`,{method:'POST',headers:{Authorization:`Bearer ${token}`},body:fd})
      const j=await r.json()
      // j.transcript would be real when whisper installed
      setQ(j.transcript || "CNC मशीन में वाइब्रेशन क्यों बढ़ रहा है?")
    }
    recorder.start(); setRecording(true)
    setTimeout(()=>{recorder.stop(); setRecording(false); stream.getTracks().forEach(t=>t.stop())}, 4000)
  }catch(e){ alert("Mic permission denied: "+e) }
}

// Power BI embed token fetch
const fetchPowerBIToken = async()=>{
  const token=localStorage.getItem('token')
  const r=await fetch('http://localhost:8000/api/powerbi/embed-token',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({
    tenant_id: import.meta.env.VITE_POWERBI_TENANT||"your-tenant",
    client_id: import.meta.env.VITE_POWERBI_CLIENT||"your-client",
    client_secret: "backend-only",
    workspace_id: import.meta.env.VITE_POWERBI_WORKSPACE||"ws",
    report_id: import.meta.env.VITE_POWERBI_REPORT||"rep"
  })})
  const j=await r.json(); console.log("Power BI",j)
}

// Add buttons in AI Co-pilot panel:
// <select value={voiceLang} onChange={e=>setVoiceLang(e.target.value)}><option value="hi-IN">Hindi</option><option value="en-IN">English</option><option value="bho-IN">Bhojpuri (fallback)</option><option value="mai-IN">Maithili</option></select>
// <button className="btn" onClick={startRecording} style={{background: recording?'#ef4444':''}}>{recording?'● Recording':'🎤 Push to Talk'}</button>
// <button className="btn" onClick={()=>speechSynthesis.cancel()}>⏹ Stop Speaking</button>
// <button className="btn" onClick={fetchPowerBIToken}>Power BI Connect Test</button>
