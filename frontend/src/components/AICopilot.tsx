import React, {useState} from 'react'

export default function AICopilot(){
  const [mode,setMode]=useState<'push'|'continuous'|'text'>('text')
  const [listening,setListening]=useState(false)
  const [lang,setLang]=useState('hi-IN')
  const [speed,setSpeed]=useState(1.0)
  const [transcript,setTranscript]=useState('')

  return (
    <div>
      <div style={{display:'flex',gap:6}}>
        <button className="btn" onClick={()=>setMode('push')}>Push to Talk</button>
        <button className="btn" onClick={()=>setMode('continuous')}>Continuous</button>
        <button className="btn" onClick={()=>setMode('text')}>Text Chat</button>
      </div>
      {listening && <div style={{color:'#22c55e',fontSize:10}}>● Recording — visible indicator</div>}
      <div style={{fontSize:10}}>Language: {lang} • Speed: {speed}x • Mode: {mode}</div>
      <div style={{fontSize:10}}>Transcript (editable/copyable): {transcript}</div>
      <button className="btn" onClick={()=>speechSynthesis.cancel()}>⏹ Stop Speaking</button>
      <button className="btn" onClick={()=>{ if(transcript) { const u=new SpeechSynthesisUtterance(transcript); u.lang=lang; speechSynthesis.speak(u) }}}>▶ Replay</button>
    </div>
  )
}
