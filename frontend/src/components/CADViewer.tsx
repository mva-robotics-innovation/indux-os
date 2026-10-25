import React, { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF, Environment } from '@react-three/drei'

function Model({url}:{url:string}){
  const {scene} = useGLTF(url)
  return <primitive object={scene} scale={1.5} />
}

export default function CADViewer({glbUrl}:{glbUrl:string}){
  const [mode,setMode]=React.useState<'3d'|'exploded'|'section'>('3d')
  return (
    <div>
      <div style={{display:'flex',gap:6,marginBottom:6}}>
        <button className="btn" onClick={()=>setMode('3d')} style={{background: mode==='3d'?'#12304a':''}}>3D View</button>
        <button className="btn" onClick={()=>setMode('exploded')}>Exploded View</button>
        <button className="btn" onClick={()=>setMode('section')}>Section</button>
      </div>
      <div style={{height:220,background:'#0a0f14',borderRadius:8}}>
        <Canvas camera={{position:[2,2,2]}}>
          <ambientLight intensity={0.8}/><directionalLight position={[5,5,5]} intensity={1}/>
          <Suspense fallback={null}>
            {glbUrl ? <Model url={glbUrl}/> : <mesh><boxGeometry/><meshStandardMaterial color="#1e3a52"/></mesh>}
          </Suspense>
          <OrbitControls/>
          <Environment preset="studio"/>
        </Canvas>
      </div>
      <div style={{fontSize:10,marginTop:4}}>Mode: {mode} • Provenance: Real GLB from /api/cad/upload • Simulation: Submit via /api/cad/simulate (background worker)</div>
    </div>
  )
}
