import React, { useEffect, useMemo, useState } from 'react'

const API_BASE = String((import.meta as any).env?.VITE_FACTORY_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')
const apiHeaders = (withJson = true): Record<string, string> => {
  const key = String((import.meta as any).env?.VITE_FACTORY_API_KEY || '')
  return { ...(withJson ? { 'Content-Type': 'application/json' } : {}), ...(key ? { 'X-API-Key': key } : {}) }
}

const LOCAL_INVENTORY_KEY = 'indux-os-v12-inventory-cache'
const LOCAL_PRODUCTION_KEY = 'indux-os-v12-production-cache'
function readLocalRows(key: string): any[] {
  try {
    if (typeof window === 'undefined') return []
    const parsed = JSON.parse(window.localStorage.getItem(key) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
}
function writeLocalRows(key: string, rows: any[]) {
  try { if (typeof window !== 'undefined') window.localStorage.setItem(key, JSON.stringify(rows)) } catch { /* private browsing/quota: app continues in memory */ }
}
function localId(prefix: string) { return `local-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` }

type ModuleItem = { id: string; title: string; category: string; icon: string; color: string; description: string; metric: string; actions: string[] }
type ChatMessage = { role: 'user' | 'assistant'; text: string; source?: string }

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const MODULES: ModuleItem[] = [
  { id:'digital-twin', title:'CAD & Production Digital Twin', category:'Design & Production', icon:'🧊', color:'#42e8f5', description:'Explore a conceptual machine/line twin, rotate the visual model and calculate production-load what-if scenarios. CAD import/editing requires a future CAD engine integration.', metric:'Digital-twin simulation · not a calibrated plant model', actions:['Run what-if scenario','Rotate model','Reset baseline'] },
  { id:'inventory', title:'Inventory & Materials', category:'Operations', icon:'📦', color:'#fbbf24', description:'Create a parts catalogue, maintain stock balances, track reorder thresholds and record material movements using the connected backend.', metric:'Persistent inventory API when backend is online', actions:['Refresh inventory','Export inventory'] },
  { id:'production', title:'Production Planning', category:'Operations', icon:'🗓️', color:'#60a5fa', description:'Record production jobs, compare priorities and durations, and calculate an explainable single-machine schedule with a classical heuristic.', metric:'Persistent job list + schedule optimizer', actions:['Refresh jobs','Optimize schedule'] },
  { id:'maintenance', title:'Maintenance & Reliability', category:'Maintenance', icon:'⚙️', color:'#f59e0b', description:'Review condition indicators, trend examples and failure scenarios; connect approved IoT telemetry for asset-specific monitoring.', metric:'Sample condition data until gateway telemetry is connected', actions:['Run health assessment','View trend','Simulate anomaly'] },
  { id:'quality', title:'Quality Inspection & Vision', category:'Quality', icon:'🔬', color:'#34d399', description:'Capture an inspection image, run inference only when validated model weights are configured, and require a human disposition.', metric:'Optional YOLO model integration', actions:['Choose image','Run demo inspection','Save inspection'] },
  { id:'rag', title:'Factory Intelligence & Multimodal RAG', category:'Intelligence', icon:'🧠', color:'#42e8f5', description:'Search approved SOPs, manuals and expert notes with retrieval-grounded answers, page references, safety context and multilingual voice UI.', metric:'ChromaDB + embeddings when API/model is ready', actions:['Ask a maintenance question','Upload a manual','Try voice input'] },
  { id:'ot-security', title:'OT Cybersecurity & Safety', category:'Safety & Security', icon:'🛡️', color:'#fb7185', description:'Review supplied PLC/SCADA security signals and safety events. The demo is passive: it does not scan networks or issue control commands.', metric:'Passive event analysis; no network probing', actions:['Run demo scan','Review event log','Export incident summary'] },
  { id:'drone', title:'Robotics, Drones & Field Intelligence', category:'Robotics & Field', icon:'🚁', color:'#fbbf24', description:'Plan simulated drone surveys, inspect mission status, log observations and link to an indoor-mapping/SLAM extension.', metric:'Mission planning simulator; no drone actuation', actions:['Plan survey','Run simulated mission','Save observation'] },
  { id:'business', title:'Business Automation & Agentic AI', category:'Automation', icon:'🔗', color:'#c4b5fd', description:'Coordinate inventory, production, maintenance and reporting tasks with proposed actions, audit records and human approval gates.', metric:'Approval-based workflow sandbox', actions:['Preview workflow','Approve task','Generate report'] },
  { id:'workflow', title:'Agentic Workflow Studio', category:'Automation Extensions', icon:'🤖', color:'#c4b5fd', description:'Stage a guarded workflow from anomaly through evidence review and work-order proposal. Approvals are recorded but never actuate equipment.', metric:'Persistent backend approvals; no machine actuation', actions:['Run sample workflow','Approve next step','Clear run'] },
  { id:'emergency', title:'Emergency Alerting & Drill Console', category:'Safety Extensions', icon:'🚨', color:'#fb7185', description:'Run fire, flood, heat and equipment incident drills with a checklist and audit log.', metric:'Drill mode only; no real dispatch', actions:['Simulate fire drill','Simulate flood alert','Acknowledge alert'] },
  { id:'risk-map', title:'Disaster Risk Mapping', category:'Safety Extensions', icon:'🗺️', color:'#60a5fa', description:'Review illustrative risk zones, response assets and evacuation planning layers.', metric:'Illustrative map layer; GIS feed not connected', actions:['Toggle risk layer','Plan evacuation','Export drill report'] },
  { id:'health', title:'Worker Health & PPE', category:'People Extensions', icon:'🩺', color:'#34d399', description:'Review sample PPE and wellbeing indicators; not a medical diagnosis or live monitoring feed.', metric:'Synthetic data only unless consented sensors are integrated', actions:['Run PPE checklist','Review wellbeing alert','Create safety note'] },
  { id:'indoor-map', title:'Indoor Mapping & SLAM', category:'Robotics Extensions', icon:'📐', color:'#60a5fa', description:'Explore an illustrative indoor map and simulate waypoint navigation for mobile robots.', metric:'Map simulator; live SLAM data not connected', actions:['Generate sample map','Plan path','Pause navigation'] },
  { id:'quantum', title:'Quantum-Inspired Optimizer', category:'Emerging Technology', icon:'⚛️', color:'#c4b5fd', description:'Compare a classical baseline with an explainable heuristic for small scheduling examples.', metric:'Classical heuristic only · no quantum hardware', actions:['Optimize sample schedule','Compare baseline','Clear results'] },
  { id:'analytics', title:'Factory Analytics & KPIs', category:'Analytics Extensions', icon:'📊', color:'#60a5fa', description:'Review sample production, energy, downtime and safety trends; load persisted readings from an authorized telemetry gateway.', metric:'Gateway telemetry or clearly labelled illustrative metrics', actions:['Refresh sample metrics','Export CSV snapshot','Open issue analysis'] },
  { id:'energy', title:'Energy & Utilities', category:'Sustainability Extensions', icon:'⚡', color:'#fbbf24', description:'Inspect supplied electricity, water and compressed-air usage and test efficiency ideas.', metric:'Synthetic values until utility meters are integrated', actions:['Run efficiency check','Compare shift usage','Export utility report'] },
  { id:'knowledge-graph', title:'Industrial Knowledge Graph', category:'Intelligence Extensions', icon:'🕸️', color:'#42e8f5', description:'Trace keyword-derived relationships between equipment, symptoms, manuals, parts and safety procedures.', metric:'Graph generated from indexed document text', actions:['Trace bearing issue','Find related SOPs','Reset graph'] },
]

const CORE_MODULE_IDS = ['digital-twin', 'inventory', 'production', 'maintenance', 'quality', 'rag', 'ot-security', 'drone', 'business']
const CORE_MODULES = MODULES.filter(m => CORE_MODULE_IDS.includes(m.id))
const EXTENSION_MODULES = MODULES.filter(m => !CORE_MODULE_IDS.includes(m.id))

const SAMPLE_ANSWERS: Array<{match: RegExp; title: string; body: string; source: string; steps: string[]; safety: string}> = [
  { match:/bearing|vibration|motor noise/i, title:'Bearing vibration — example retrieval', body:'The demo knowledge set suggests checking the vibration reading against the equipment-specific limit and consulting the approved maintenance procedure. This is a sample response, not a live retrieval from your plant manuals.', source:'Sample-Motor-Maintenance.pdf • example page 47 (demo citation)', steps:['Confirm asset ID and compare readings with the approved site limit.','Follow site lockout/tagout and isolate energy before inspection.','Inspect lubrication, mounting and bearing condition using the approved SOP.','Record findings and escalate if the reading exceeds the site alarm threshold.'], safety:'Do not open, touch or service equipment while energized. Follow your plant-approved procedure and qualified-person requirements.'},
  { match:/heat|hot|temperature|garam|85.?c/i, title:'Motor overheating — example retrieval', body:'The demo knowledge set recommends verifying the temperature sensor, cooling path and current load before taking action. Use the manufacturer manual and plant-approved operating limits for real equipment.', source:'Sample-Cooling-SOP.pdf • example page 12 (demo citation)', steps:['Verify the temperature reading with an approved instrument.','Check cooling airflow and coolant status only where safe.','Notify the supervisor and reduce or stop operation only according to site procedure.','Log the event and inspect the cause before restarting.'], safety:'Hot surfaces and electrical systems can cause serious injury. Do not bypass interlocks or restart without authorization.'},
  { match:/leak|hydraulic|oil/i, title:'Fluid leak — example retrieval', body:'This example prioritizes safe isolation and pressure relief before inspection. Confirm the actual system type and the approved maintenance instructions.', source:'Sample-Hydraulic-Manual.pdf • example page 89 (demo citation)', steps:['Keep people clear and report the leak.','Isolate the equipment using the approved procedure.','A qualified technician must verify zero energy/pressure before repair.','Contain and dispose of the fluid according to site environmental rules.'], safety:'Never search for a pressurized leak with your hand. High-pressure fluid injection injuries are medical emergencies.'},
  { match:/scratch|defect|crack|quality|visual/i, title:'Visual quality inspection — example retrieval', body:'This demo outlines an inspection workflow; no production vision model is connected in this standalone page.', source:'Sample-Quality-SOP.pdf • example page 23 (demo citation)', steps:['Capture an image with suitable lighting and scale reference.','Compare the defect against the approved acceptance criteria.','Quarantine uncertain parts for a qualified quality inspector.','Record disposition and retain the inspection image under site policy.'], safety:'Do not allow this demo to automatically release or reject real product without a validated inspection system.'},
  { match:/safety|ppe|helmet|emergency|fire|flood/i, title:'Safety procedure — example retrieval', body:'Use the site emergency plan and supervisor instructions as the authoritative source. This page is a demonstration interface, not an emergency dispatch system.', source:'Sample-Safety-SOP.pdf • example page 5 (demo citation)', steps:['Raise the alarm through the site-approved channel.','Move people away from the hazard and keep exits clear.','Follow the posted evacuation route and assembly-point procedure.','Account for personnel and wait for the authorized all-clear.'], safety:'If there is an actual emergency, use your facility emergency procedures and local emergency services immediately.'},
]

const initialEvents = [
  {time:'09:41:08', level:'INFO', text:'Demo environment initialized'},
  {time:'09:41:12', level:'INFO', text:'Sample telemetry stream loaded'},
  {time:'09:41:16', level:'READY', text:'Human approval required for consequential actions'},
]

export default function FactoryIntelligenceOS() {
  const [activeModule, setActiveModule] = useState<string>('overview')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [query, setQuery] = useState('bearing vibration high hai, kya karu?')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [uploadNames, setUploadNames] = useState<string[]>([])
  const [recording, setRecording] = useState(false)
  const [voiceLang, setVoiceLang] = useState('en-IN')
  const [eventLog, setEventLog] = useState(initialEvents)
  const [actionStatus, setActionStatus] = useState<Record<string,string>>({})
  const [riskLayer, setRiskLayer] = useState(true)
  const [simulation, setSimulation] = useState(false)
  const [twinRotation, setTwinRotation] = useState(false)
  const [twinLoad, setTwinLoad] = useState(78)
  const [defectResult, setDefectResult] = useState('')
  const [selectedImage, setSelectedImage] = useState('')
  const [workflowStep, setWorkflowStep] = useState(0)
  const [scanDone, setScanDone] = useState(false)
  const [quantumResult, setQuantumResult] = useState('')
  const [clock, setClock] = useState(new Date())
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [apiInfo, setApiInfo] = useState<any>(null)
  const [indexedDocuments, setIndexedDocuments] = useState<any[]>([])
  const [uploadMessage, setUploadMessage] = useState('')
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const [workflowId, setWorkflowId] = useState('')
  const [graphData, setGraphData] = useState<{nodes:any[]; edges:any[]}>({nodes:[], edges:[]})
  const [telemetryRows, setTelemetryRows] = useState<any[]>([])
  const [inventoryItems, setInventoryItems] = useState<any[]>(() => readLocalRows(LOCAL_INVENTORY_KEY))
  const [inventoryForm, setInventoryForm] = useState({ sku: '', name: '', quantity: '1', unit: 'pcs', reorder_level: '2', location: 'Main Store' })
  const [inventoryMessage, setInventoryMessage] = useState('')
  const [productionJobs, setProductionJobs] = useState<any[]>(() => readLocalRows(LOCAL_PRODUCTION_KEY))
  const [productionForm, setProductionForm] = useState({ job_number: '', product: '', quantity: '100', priority: '5', duration_hours: '4' })
  const [productionMessage, setProductionMessage] = useState('')
  const [productionPlan, setProductionPlan] = useState<any[]>([])
  const [productionPlanSummary, setProductionPlanSummary] = useState('')

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000)
    const onPop = () => setActiveModule(window.location.hash.replace('#module=', '') || 'overview')
    window.addEventListener('popstate', onPop)
    return () => { window.clearInterval(timer); window.removeEventListener('popstate', onPop) }
  }, [])

  useEffect(() => { writeLocalRows(LOCAL_INVENTORY_KEY, inventoryItems) }, [inventoryItems])
  useEffect(() => { writeLocalRows(LOCAL_PRODUCTION_KEY, productionJobs) }, [productionJobs])

  const syncOfflineRecords = async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return
    let localInventory = readLocalRows(LOCAL_INVENTORY_KEY)
    for (const record of localInventory.filter((item: any) => item._pendingSync)) {
      try {
        if (record._localNew) {
          const response = await fetch(`${API_BASE}/api/inventory/items`, { method: 'POST', headers: apiHeaders(), body: JSON.stringify({ sku: record.sku, name: record.name, quantity: Number(record.quantity), unit: record.unit || 'pcs', reorder_level: Number(record.reorder_level || 0), location: record.location || 'Main Store' }) })
          if (response.ok) {
            const data = await response.json()
            localInventory = localInventory.map((item: any) => item.id === record.id ? data.item : item)
          } else if (response.status === 409) {
            const listed = await fetch(`${API_BASE}/api/inventory/items`, { headers: apiHeaders(false) })
            const body = listed.ok ? await listed.json() : { items: [] }
            const existing = (body.items || []).find((item: any) => item.sku === record.sku)
            if (existing) localInventory = localInventory.map((item: any) => item.id === record.id ? existing : item)
          }
        } else if (Array.isArray(record._pendingAdjustments) && record._pendingAdjustments.length) {
          let updated = record
          const completed: number[] = []
          for (let idx = 0; idx < record._pendingAdjustments.length; idx++) {
            const delta = Number(record._pendingAdjustments[idx])
            const response = await fetch(`${API_BASE}/api/inventory/items/${encodeURIComponent(updated.id)}/adjust`, { method: 'POST', headers: apiHeaders(), body: JSON.stringify({ quantity_delta: delta, note: 'Offline movement synced from INDUX-OS V12 cache' }) })
            if (!response.ok) break
            const data = await response.json(); updated = data.item; completed.push(idx)
          }
          const remaining = record._pendingAdjustments.filter((_: any, idx: number) => !completed.includes(idx))
          localInventory = localInventory.map((item: any) => item.id === record.id ? (remaining.length ? { ...updated, quantity: Number(updated.quantity) + remaining.reduce((sum: number, value: number) => sum + Number(value), 0), _pendingSync: true, _pendingAdjustments: remaining } : updated) : item)
        }
      } catch { /* keep pending row in the local cache for a later reconnect */ }
    }

    let localProduction = readLocalRows(LOCAL_PRODUCTION_KEY)
    for (const record of localProduction.filter((job: any) => job._pendingSync)) {
      try {
        const response = await fetch(`${API_BASE}/api/production/jobs`, { method: 'POST', headers: apiHeaders(), body: JSON.stringify({ job_number: record.job_number, product: record.product, quantity: Number(record.quantity), priority: Number(record.priority), duration_hours: Number(record.duration_hours) }) })
        if (response.ok) {
          const data = await response.json()
          localProduction = localProduction.map((job: any) => job.id === record.id ? data.job : job)
        } else if (response.status === 409) {
          const listed = await fetch(`${API_BASE}/api/production/jobs`, { headers: apiHeaders(false) })
          const body = listed.ok ? await listed.json() : { jobs: [] }
          const existing = (body.jobs || []).find((job: any) => job.job_number === record.job_number)
          if (existing) localProduction = localProduction.map((job: any) => job.id === record.id ? existing : job)
        }
      } catch { /* keep pending row in the local cache for a later reconnect */ }
    }

    try {
      const [inventoryResponse, jobsResponse] = await Promise.all([
        fetch(`${API_BASE}/api/inventory/items`, { headers: apiHeaders(false) }),
        fetch(`${API_BASE}/api/production/jobs`, { headers: apiHeaders(false) }),
      ])
      const pendingInventory = localInventory.filter((item: any) => item._pendingSync)
      const pendingJobs = localProduction.filter((job: any) => job._pendingSync)
      const serverInventory = inventoryResponse.ok ? (await inventoryResponse.json()).items || [] : []
      const serverJobs = jobsResponse.ok ? (await jobsResponse.json()).jobs || [] : []
      localInventory = serverInventory.map((row: any) => {
        const pending = pendingInventory.find((item: any) => item.sku === row.sku && Array.isArray(item._pendingAdjustments) && item._pendingAdjustments.length)
        return pending ? { ...row, quantity: pending.quantity, _pendingSync: true, _pendingAdjustments: pending._pendingAdjustments } : row
      })
      localInventory = [...pendingInventory.filter((item: any) => item._localNew && !serverInventory.some((row: any) => row.sku === item.sku)), ...localInventory]
      localProduction = [...pendingJobs.filter((job: any) => !serverJobs.some((row: any) => row.job_number === job.job_number)), ...serverJobs]
      writeLocalRows(LOCAL_INVENTORY_KEY, localInventory)
      writeLocalRows(LOCAL_PRODUCTION_KEY, localProduction)
      setInventoryItems(localInventory)
      setProductionJobs(localProduction)
    } catch { /* current local cache remains usable offline */ }
  }

  useEffect(() => {
    const onOnline = () => { void syncOfflineRecords() }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [])

  useEffect(() => {
    let stopped = false
    const checkApi = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/health`, { method: 'GET' })
        if (!response.ok) throw new Error(`Health check returned ${response.status}`)
        const data = await response.json()
        if (!stopped) { setApiStatus('online'); setApiInfo(data) }
        try { await syncOfflineRecords() } catch {}
        try {
          const docsResponse = await fetch(`${API_BASE}/api/rag/documents`, { headers: apiHeaders(false) })
          if (docsResponse.ok) {
            const docsData = await docsResponse.json()
            if (!stopped) setIndexedDocuments(Array.isArray(docsData.documents) ? docsData.documents : [])
          }
        } catch {}
      } catch {
        if (!stopped) { setApiStatus('offline'); setApiInfo(null) }
      }
    }
    void checkApi()
    const timer = window.setInterval(checkApi, 30000)
    return () => { stopped = true; window.clearInterval(timer) }
  }, [])

  const categories = useMemo(() => ['All', ...Array.from(new Set(MODULES.map(m => m.category)))], [])
  const matchesModuleFilter = (m: ModuleItem) => (category === 'All' || m.category === category) && `${m.title} ${m.description} ${m.category}`.toLowerCase().includes(search.toLowerCase())
  const filteredCoreModules = useMemo(() => CORE_MODULES.filter(matchesModuleFilter), [category, search])
  const filteredExtensionModules = useMemo(() => EXTENSION_MODULES.filter(matchesModuleFilter), [category, search])
  const filteredModules = useMemo(() => [...filteredCoreModules, ...filteredExtensionModules], [filteredCoreModules, filteredExtensionModules])
  const currentModule = MODULES.find(m => m.id === activeModule)

  const logEvent = (text: string, level = 'INFO') => {
    setEventLog(old => [{ time: new Date().toLocaleTimeString('en-GB'), level, text }, ...old].slice(0, 12))
  }
  const openModule = (id: string) => {
    setActiveModule(id)
    window.history.pushState({module:id}, '', `${window.location.pathname}#module=${id}`)
    window.scrollTo({top:0, behavior:'smooth'})
    logEvent(`Opened module: ${MODULES.find(m=>m.id===id)?.title || id}`)
  }
  const goOverview = () => {
    setActiveModule('overview')
    window.history.pushState({module:'overview'}, '', window.location.pathname)
    window.scrollTo({top:0, behavior:'smooth'})
  }

  const askAssistant = async (question = query) => {
    const clean = question.trim()
    if (!clean) return
    const pending = `Searching indexed manuals via ${API_BASE}…`
    setMessages(old => [...old, { role: 'user', text: clean }, { role: 'assistant', text: pending }])
    setQuery('')
    try {
      const response = await fetch(`${API_BASE}/api/rag/query`, {
        method: 'POST', headers: apiHeaders(),
        body: JSON.stringify({ question: clean, top_k: 5, language: voiceLang }),
      })
      if (!response.ok) {
        let detail = `Backend returned ${response.status}`
        try { const errorBody = await response.json(); detail = String(errorBody.detail || detail) } catch {}
        throw new Error(detail)
      }
      const data = await response.json()
      const sourceList = Array.isArray(data.sources) ? data.sources : []
      const sourceText = sourceList.length
        ? sourceList.map((src: any, i: number) => `[${i + 1}] ${src.filename || 'document'}${src.page ? ` • page ${src.page}` : ''} • relevance ${Math.round((Number(src.score) || 0) * 100)}%`).join(' | ')
        : 'No indexed evidence retrieved. No document citation is available.'
      const mode = data.grounded ? `LIVE RETRIEVAL · ${data.generator || 'RAG'}` : `NO MATCHING EVIDENCE · ${data.generator || 'RAG'}`
      setMessages(old => {
        const next = [...old]
        // Find the most recent placeholder without relying on message array indexes from a stale render.
        let target = -1
        for (let i = next.length - 1; i >= 0; i--) { if (next[i].role === 'assistant' && next[i].text === pending) { target = i; break } }
        if (target >= 0) next[target] = { role: 'assistant', text: `${mode}\n\n${String(data.answer || 'The backend returned no answer text.')}`, source: sourceText }
        return next
      })
      setApiStatus('online')
      logEvent(`Backend RAG query completed (${sourceList.length} source chunks).`, data.grounded ? 'READY' : 'WARN')
    } catch (error) {
      const sample = SAMPLE_ANSWERS.find(item => item.match.test(clean))
      const fallback = sample
        ? `LOCAL SAMPLE RESPONSE — NOT RETRIEVED FROM YOUR MANUALS\n${sample.title}\n${sample.body}\n\n${sample.steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}\n\nSafety: ${sample.safety}`
        : 'The backend is unavailable and no matching local sample exists. Start the Factory Intelligence API and try again. No manual-backed answer was produced.'
      setMessages(old => {
        const next = [...old]
        let target = -1
        for (let i = next.length - 1; i >= 0; i--) { if (next[i].role === 'assistant' && next[i].text === pending) { target = i; break } }
        if (target >= 0) next[target] = { role: 'assistant', text: `${fallback}\n\nBackend connection: ${String(error).replace(/^Error: /, '')}`, source: sample ? 'SAMPLE DATA ONLY • NOT A REAL MANUAL CITATION' : 'No source retrieved' }
        return next
      })
      setApiStatus('offline')
      logEvent(`Backend RAG request failed: ${String(error).slice(0, 100)}`, 'WARN')
    }
  }
  const refreshInventory = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/inventory/items`, { headers: apiHeaders(false) })
      if (!response.ok) throw new Error(`Backend returned ${response.status}`)
      const data = await response.json()
      setInventoryItems(Array.isArray(data.items) ? data.items : [])
      setInventoryMessage(`Loaded ${Array.isArray(data.items) ? data.items.length : 0} persisted inventory item(s).`)
      setApiStatus('online')
    } catch (error) {
      setInventoryMessage(`Inventory API unavailable. Stock edits require the backend; ${String(error).replace(/^Error: /, '')}`)
    }
  }

  const saveInventoryItem = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      const response = await fetch(`${API_BASE}/api/inventory/items`, {
        method: 'POST', headers: apiHeaders(),
        body: JSON.stringify({ sku: inventoryForm.sku.trim(), name: inventoryForm.name.trim(), quantity: Number(inventoryForm.quantity), unit: inventoryForm.unit.trim() || 'pcs', reorder_level: Number(inventoryForm.reorder_level), location: inventoryForm.location.trim() || 'Main Store' }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(String(data.detail || `Backend returned ${response.status}`))
      setInventoryItems(old => [data.item, ...old.filter(item => item.id !== data.item.id)])
      setInventoryMessage(`Item ${data.item.sku} saved to the backend inventory.`)
      setInventoryForm({ sku: '', name: '', quantity: '1', unit: 'pcs', reorder_level: '2', location: 'Main Store' })
      setApiStatus('online')
      logEvent(`Inventory item created: ${data.item.sku}`, 'READY')
    } catch (error) {
      const offlineItem = { id: localId('inventory'), sku: inventoryForm.sku.trim(), name: inventoryForm.name.trim(), quantity: Number(inventoryForm.quantity), unit: inventoryForm.unit.trim() || 'pcs', reorder_level: Number(inventoryForm.reorder_level), location: inventoryForm.location.trim() || 'Main Store', updated_at: new Date().toISOString(), low_stock: Number(inventoryForm.quantity) <= Number(inventoryForm.reorder_level), _localNew: true, _pendingSync: true }
      setInventoryItems(old => [offlineItem, ...old.filter(item => item.sku !== offlineItem.sku)])
      setInventoryMessage(`Backend unavailable. ${offlineItem.sku} is saved in this browser's offline cache and will be queued for sync after reconnect. ${String(error).replace(/^Error: /, '')}`)
      setInventoryForm({ sku: '', name: '', quantity: '1', unit: 'pcs', reorder_level: '2', location: 'Main Store' })
    }
  }

  const adjustInventory = async (item: any, delta: number) => {
    try {
      const response = await fetch(`${API_BASE}/api/inventory/items/${encodeURIComponent(item.id)}/adjust`, {
        method: 'POST', headers: apiHeaders(), body: JSON.stringify({ quantity_delta: delta, note: 'Adjusted from INDUX-OS inventory screen' }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(String(data.detail || `Backend returned ${response.status}`))
      setInventoryItems(old => old.map(row => row.id === data.item.id ? data.item : row))
      setInventoryMessage(`${data.item.sku} quantity updated to ${data.item.quantity} ${data.item.unit}.`)
      setApiStatus('online')
    } catch (error) {
      setInventoryItems(old => old.map(row => {
        if (row.id !== item.id) return row
        const nextQuantity = Number(row.quantity) + delta
        if (nextQuantity < 0) return row
        return row._localNew
          ? { ...row, quantity: nextQuantity, low_stock: nextQuantity <= Number(row.reorder_level), _pendingSync: true }
          : { ...row, quantity: nextQuantity, low_stock: nextQuantity <= Number(row.reorder_level), _pendingSync: true, _pendingAdjustments: [...(row._pendingAdjustments || []), delta] }
      }))
      setInventoryMessage(`Backend unavailable. Stock movement was recorded in this browser's offline cache and is queued for sync. ${String(error).replace(/^Error: /, '')}`)
    }
  }

  const refreshProduction = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/production/jobs`, { headers: apiHeaders(false) })
      if (!response.ok) throw new Error(`Backend returned ${response.status}`)
      const data = await response.json()
      setProductionJobs(Array.isArray(data.jobs) ? data.jobs : [])
      setProductionMessage(`Loaded ${Array.isArray(data.jobs) ? data.jobs.length : 0} persisted production job(s).`)
      setApiStatus('online')
    } catch (error) {
      setProductionMessage(`Production API unavailable. Job persistence requires the backend; ${String(error).replace(/^Error: /, '')}`)
    }
  }

  const saveProductionJob = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      const response = await fetch(`${API_BASE}/api/production/jobs`, {
        method: 'POST', headers: apiHeaders(),
        body: JSON.stringify({ job_number: productionForm.job_number.trim(), product: productionForm.product.trim(), quantity: Number(productionForm.quantity), priority: Number(productionForm.priority), duration_hours: Number(productionForm.duration_hours) }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(String(data.detail || `Backend returned ${response.status}`))
      setProductionJobs(old => [data.job, ...old.filter(job => job.id !== data.job.id)])
      setProductionMessage(`Production job ${data.job.job_number} persisted in the backend.`)
      setProductionForm({ job_number: '', product: '', quantity: '100', priority: '5', duration_hours: '4' })
      setProductionPlan([])
      setApiStatus('online')
      logEvent(`Production job created: ${data.job.job_number}`, 'READY')
    } catch (error) {
      const offlineJob = { id: localId('job'), job_number: productionForm.job_number.trim(), product: productionForm.product.trim(), quantity: Number(productionForm.quantity), priority: Number(productionForm.priority), duration_hours: Number(productionForm.duration_hours), status: 'local-pending-sync', created_at: new Date().toISOString(), _pendingSync: true }
      setProductionJobs(old => [offlineJob, ...old.filter(job => job.job_number !== offlineJob.job_number)])
      setProductionMessage(`Backend unavailable. ${offlineJob.job_number} is saved in this browser's offline cache and queued for sync after reconnect. ${String(error).replace(/^Error: /, '')}`)
      setProductionForm({ job_number: '', product: '', quantity: '100', priority: '5', duration_hours: '4' })
    }
  }

  const optimizeProductionPlan = async () => {
    if (!productionJobs.length) { setProductionMessage('Add at least one production job before optimizing.'); return }
    try {
      const response = await fetch(`${API_BASE}/api/optimization/schedule`, {
        method: 'POST', headers: apiHeaders(),
        body: JSON.stringify({ jobs: productionJobs.map((job: any) => ({ id: String(job.job_number), duration: Number(job.duration_hours), priority: Number(job.priority) })) }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(String(data.detail || `Backend returned ${response.status}`))
      setProductionPlan(Array.isArray(data.schedule) ? data.schedule : [])
      setProductionPlanSummary(`Classical single-machine heuristic · weighted completion cost ${data.baseline_weighted_completion_cost} → ${data.optimized_weighted_completion_cost} (${data.improvement_percent}% on this sample order). No production schedule was sent to a machine.`)
      setProductionMessage('Schedule calculated by the backend. Review constraints before using it in production.')
      setApiStatus('online')
      logEvent('Production schedule optimized using a classical heuristic.', 'READY')
    } catch (error) {
      const sorted = [...productionJobs].sort((a: any, b: any) => (Number(a.duration_hours) / Number(a.priority)) - (Number(b.duration_hours) / Number(b.priority)))
      setProductionPlan(sorted.map((job: any, index: number) => ({ position: index + 1, id: job.job_number, duration: Number(job.duration_hours), priority: Number(job.priority) })))
      setProductionMessage(`Backend unavailable; a local classical heuristic produced a draft plan. It is stored only in this browser and must be reviewed. ${String(error).replace(/^Error: /, '')}`)
      setProductionPlanSummary('OFFLINE PLAN · local heuristic; no backend record or live factory schedule was changed.')
    }
  }

  const startVoice = () => {
    const w = window as any
    const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SpeechRecognition) { logEvent('Speech recognition is unavailable in this browser; type your question instead.', 'WARN'); return }
    const recognition = new SpeechRecognition()
    recognition.lang = voiceLang
    recognition.interimResults = false
    recognition.onstart = () => setRecording(true)
    recognition.onend = () => setRecording(false)
    recognition.onerror = () => { setRecording(false); logEvent('Voice capture ended; use text input if needed.', 'WARN') }
    recognition.onresult = (event: any) => { const text = event.results?.[0]?.[0]?.transcript || ''; setQuery(text); if (text) askAssistant(text) }
    try { recognition.start() } catch { setRecording(false); logEvent('Could not start voice capture.', 'WARN') }
  }
  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return
    const selected = Array.from(files)
    const names = selected.map(f => f.name)
    setUploadNames(old => [...names, ...old].slice(0, 12))
    setUploadMessage(`Uploading ${selected.length} file(s) to the RAG backend…`)
    const form = new FormData()
    selected.forEach(file => form.append('files', file))
    try {
      const response = await fetch(`${API_BASE}/api/rag/upload`, { method: 'POST', headers: apiHeaders(false), body: form })
      if (!response.ok) {
        let detail = `Backend returned ${response.status}`
        try { const errorBody = await response.json(); detail = String(errorBody.detail || detail) } catch {}
        throw new Error(detail)
      }
      const result = await response.json()
      const rows = Array.isArray(result.results) ? result.results : []
      const indexed = rows.filter((row: any) => row.status === 'indexed').length
      const repeated = rows.filter((row: any) => row.status === 'already_indexed').length
      const errors = rows.filter((row: any) => row.status === 'error')
      const errorText = errors.map((row: any) => `${row.filename}: ${row.error}`).join(' | ')
      setUploadMessage(`${indexed} file(s) indexed into ChromaDB; ${repeated} already indexed; ${errors.length} failed.${errorText ? ` ${errorText}` : ''}`)
      setApiStatus('online')
      try {
        const docsResponse = await fetch(`${API_BASE}/api/rag/documents`, { headers: apiHeaders(false) })
        if (docsResponse.ok) { const docsData = await docsResponse.json(); setIndexedDocuments(Array.isArray(docsData.documents) ? docsData.documents : []) }
        const healthResponse = await fetch(`${API_BASE}/api/health`)
        if (healthResponse.ok) setApiInfo(await healthResponse.json())
      } catch {}
      logEvent(`RAG ingestion finished: ${indexed} indexed, ${repeated} already indexed, ${errors.length} failed.`, errors.length ? 'WARN' : 'READY')
    } catch (error) {
      setUploadMessage(`UPLOAD FAILED — files were selected in the browser but not indexed. ${String(error).replace(/^Error: /, '')}`)
      setApiStatus('offline')
      logEvent(`Document upload failed: ${String(error).slice(0, 120)}`, 'WARN')
    }
  }
  const runModuleAction = async (m: ModuleItem, action: string) => {
    if (m.id === 'ot-security' && action === 'Run demo scan') {
      setScanDone(true)
      try {
        const response = await fetch(`${API_BASE}/api/cyber/scan`, { method: 'POST', headers: apiHeaders(), body: JSON.stringify({ mode: 'passive-demo', signals: [{ asset_id: 'DEMO-PLC-01', firmware: 'unknown', failed_logins_10m: 6, unknown_services: ['unapproved-service-example'], change_outside_window: false }] }) })
        if (!response.ok) throw new Error(`Backend returned ${response.status}`)
        const data = await response.json()
        setActionStatus(old => ({ ...old, [m.id]: `Passive input review complete: ${data.count} finding(s). No live PLC/SCADA devices or network were scanned.` }))
        setApiStatus('online')
        logEvent('Backend passive OT event analysis completed; no network devices scanned.', 'READY')
      } catch (error) {
        setActionStatus(old => ({ ...old, [m.id]: `Backend unavailable; local status only. ${String(error)}` }))
        setApiStatus('offline')
      }
      return
    }
    if (m.id === 'ot-security' && action === 'Review event log') {
      try {
        const response = await fetch(`${API_BASE}/api/events?limit=50`, { headers: apiHeaders(false) })
        if (!response.ok) throw new Error(`Backend returned ${response.status}`)
        const data = await response.json()
        const rows = Array.isArray(data.events) ? data.events : []
        setEventLog(rows.map((e: any) => ({ time: new Date(e.created_at).toLocaleTimeString('en-GB'), level: e.level || 'INFO', text: `[${e.source || 'backend'}] ${e.message || ''}` })))
        setActionStatus(old => ({ ...old, [m.id]: `Loaded ${rows.length} persisted backend events. No network scan was run.` }))
        setApiStatus('online')
      } catch (error) {
        setActionStatus(old => ({ ...old, [m.id]: `Could not load persisted events: ${String(error)}` }))
      }
      return
    }
    if (m.id === 'ot-security' && action === 'Export incident summary') {
      let rows: any[] = eventLog.map(e => ({ ...e, source: 'local-ui' }))
      try {
        const response = await fetch(`${API_BASE}/api/events?limit=100`, { headers: apiHeaders(false) })
        if (response.ok) { const data = await response.json(); if (Array.isArray(data.events)) rows = data.events }
      } catch {}
      const report = { generated_at: new Date().toISOString(), system: 'INDUX-OS Factory Intelligence', mode: 'passive event review', network_devices_scanned: 0, events: rows, note: 'Report contains submitted/demo events only; no live network scan is implied.' }
      downloadFile(`indux-incident-summary-${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(report, null, 2), 'application/json')
      setActionStatus(old => ({ ...old, [m.id]: `Incident summary exported with ${rows.length} event record(s).` }))
      return
    }
    if (m.id === 'workflow' && action === 'Clear run') {
      setWorkflowStep(0)
      setWorkflowId('')
      setActionStatus(old => ({ ...old, [m.id]: 'Workflow view reset. Previously persisted approvals remain in the backend audit history.' }))
      logEvent('Workflow run cleared from current UI.', 'INFO')
      return
    }
    if (m.id === 'knowledge-graph' && (action === 'Trace bearing issue' || action === 'Find related SOPs')) {
      const term = action === 'Trace bearing issue' ? 'bearing' : 'sop'
      try {
        const response = await fetch(`${API_BASE}/api/knowledge-graph?query=${encodeURIComponent(term)}&limit=100`, { headers: apiHeaders(false) })
        if (!response.ok) throw new Error(`Backend returned ${response.status}`)
        const data = await response.json()
        setGraphData({ nodes: Array.isArray(data.nodes) ? data.nodes : [], edges: Array.isArray(data.edges) ? data.edges : [] })
        setActionStatus(old => ({ ...old, [m.id]: `Retrieved ${data.nodes?.length || 0} knowledge graph node(s) and ${data.edges?.length || 0} relationship(s) from indexed documents.` }))
        setApiStatus('online')
      } catch (error) {
        setActionStatus(old => ({ ...old, [m.id]: `Knowledge graph backend unavailable: ${String(error)}` }))
      }
      return
    }
    if (m.id === 'knowledge-graph' && action === 'Reset graph') {
      setGraphData({ nodes: [], edges: [] })
      setActionStatus(old => ({ ...old, [m.id]: 'Graph view cleared; indexed graph data remains stored on the server.' }))
      return
    }
    if ((m.id === 'analytics' || m.id === 'energy') && action === 'Refresh sample metrics') {
      try {
        const response = await fetch(`${API_BASE}/api/telemetry/latest?limit=100`, { headers: apiHeaders(false) })
        if (!response.ok) throw new Error(`Backend returned ${response.status}`)
        const data = await response.json()
        const items = Array.isArray(data.items) ? data.items : []
        setTelemetryRows(items)
        setActionStatus(old => ({ ...old, [m.id]: items.length ? `Loaded ${items.length} stored gateway measurement(s). These readings come from the API ingestion route and are not generated by this screen.` : 'No gateway telemetry has been ingested yet. Use POST /api/telemetry/ingest from an authorized gateway; sample dashboard figures remain illustrative.' }))
        setApiStatus('online')
      } catch (error) {
        setActionStatus(old => ({ ...old, [m.id]: `Could not load backend telemetry: ${String(error)}` }))
      }
      return
    }
    if (m.id === 'analytics' && action === 'Export CSV snapshot') {
      const headers = ['asset_id','metric','value','unit','source','observed_at']
      const csv = [headers.join(','), ...telemetryRows.map((r:any) => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\r\n')
      downloadFile(`indux-telemetry-snapshot-${new Date().toISOString().slice(0,10)}.csv`, csv, 'text/csv;charset=utf-8')
      setActionStatus(old => ({ ...old, [m.id]: `CSV exported with ${telemetryRows.length} server-ingested telemetry row(s); this export does not include fabricated dashboard sample metrics.` }))
      return
    }
    if (m.id === 'workflow' && action === 'Run sample workflow') {
      const steps = ['Collect approved asset signal or user report', 'Retrieve relevant SOP evidence', 'Propose maintenance work order and safety checklist', 'Authorized human reviews proposed action', 'Record reviewed outcome']
      try {
        const response = await fetch(`${API_BASE}/api/workflows`, { method: 'POST', headers: apiHeaders(), body: JSON.stringify({ title: 'Factory anomaly review workflow', steps }) })
        if (!response.ok) throw new Error(`Backend returned ${response.status}`)
        const data = await response.json()
        setWorkflowId(String(data.id || ''))
        setWorkflowStep(1)
        setActionStatus(old => ({ ...old, [m.id]: `Workflow ${data.id} persisted in backend and paused at human approval. No external action was executed.` }))
        setApiStatus('online')
        logEvent('Backend workflow staged and awaiting approval.', 'READY')
      } catch (error) {
        setWorkflowStep(1)
        setActionStatus(old => ({ ...old, [m.id]: `Workflow staged locally only because the backend is unavailable. ${String(error)}` }))
        setApiStatus('offline')
      }
      return
    }
    if (m.id === 'workflow' && action === 'Approve next step') {
      if (workflowId) {
        try {
          const stepIndex = Math.max(1, workflowStep)
          const response = await fetch(`${API_BASE}/api/workflows/${encodeURIComponent(workflowId)}/approve`, { method: 'POST', headers: apiHeaders(), body: JSON.stringify({ approved_by: 'Frontend operator', step_index: stepIndex, note: 'Approved through Factory Intelligence UI' }) })
          if (!response.ok) {
            let d = `Backend returned ${response.status}`
            try { const body = await response.json(); d = String(body.detail || d) } catch {}
            throw new Error(d)
          }
          const data = await response.json()
          setWorkflowStep(s => Math.min(5, s + 1))
          setActionStatus(old => ({ ...old, [m.id]: `Backend approval recorded for step ${stepIndex}; workflow status: ${data.status}. No machine action executed.` }))
          setApiStatus('online')
          logEvent(`Workflow step ${stepIndex} approval persisted in backend.`, 'READY')
        } catch (error) {
          setActionStatus(old => ({ ...old, [m.id]: `Approval was not recorded in backend: ${String(error)}` }))
        }
      } else {
        setWorkflowStep(s => Math.min(5, s + 1))
        setActionStatus(old => ({ ...old, [m.id]: 'Local demo approval advanced; run the workflow with a working backend to persist approvals.' }))
      }
      return
    }
    if (m.id === 'quantum' && action === 'Optimize sample schedule') {
      const jobs = [{id:'JOB-01',duration:7,priority:4},{id:'JOB-02',duration:3,priority:8},{id:'JOB-03',duration:9,priority:2},{id:'JOB-04',duration:4,priority:7},{id:'JOB-05',duration:6,priority:5},{id:'JOB-06',duration:2,priority:3},{id:'JOB-07',duration:8,priority:6},{id:'JOB-08',duration:5,priority:9}]
      try {
        const response = await fetch(`${API_BASE}/api/optimization/schedule`, { method: 'POST', headers: apiHeaders(), body: JSON.stringify({ jobs }) })
        if (!response.ok) throw new Error(`Backend returned ${response.status}`)
        const data = await response.json()
        setQuantumResult(`Backend optimization completed using ${data.method}. Weighted completion cost: ${data.baseline_weighted_completion_cost} → ${data.optimized_weighted_completion_cost} (${data.improvement_percent}% improvement). Classical heuristic simulation; no quantum processor used.`)
        setActionStatus(old => ({ ...old, [m.id]: 'Optimization result calculated by backend and recorded in its event log.' }))
        setApiStatus('online')
        logEvent('Backend schedule optimization completed (classical heuristic).', 'READY')
      } catch (error) {
        setQuantumResult(`Backend optimizer unavailable: ${String(error)}. No live schedule was changed.`)
        setApiStatus('offline')
      }
      return
    }
    if (m.id === 'quality' && action === 'Choose image') { document.getElementById('quality-file-input')?.click(); return }
    if (m.id === 'quality' && action === 'Run demo inspection') {
      if (!selectedImageFile) { setDefectResult('Choose an image first. Inference needs a configured backend and validated model weights.'); return }
      const form = new FormData()
      form.append('file', selectedImageFile)
      form.append('asset_id', 'M-12')
      try {
        const response = await fetch(`${API_BASE}/api/vision/inspect`, { method: 'POST', headers: apiHeaders(false), body: form })
        const data = await response.json()
        if (!response.ok) throw new Error(String(data.detail || `Backend returned ${response.status}`))
        setDefectResult(data.inference_ran ? `Inference completed for ${data.filename} (${data.width}×${data.height}). ${data.detections.length} detection(s): ${data.detections.map((d: any) => `${d.label} ${Math.round(d.confidence * 100)}%`).join(', ') || 'none returned'}. Validate results before disposition.` : `${data.message} Image is received and validated, but a trained model has not run.`)
        setApiStatus('online')
        logEvent(`Vision API processed ${selectedImageFile.name}; inference=${Boolean(data.inference_ran)}.`, data.inference_ran ? 'READY' : 'WARN')
      } catch (error) {
        setDefectResult(`Backend inspection unavailable: ${String(error).replace(/^Error: /, '')}`)
        setApiStatus('offline')
      }
      return
    }
    if (m.id === 'quality' && action === 'Save inspection') {
      const message = selectedImageFile ? `Inspection record saved for ${selectedImageFile.name}; image inference status: ${defectResult || 'not run'}` : 'Inspection checklist saved without an image attachment.'
      try { await fetch(`${API_BASE}/api/events`, { method: 'POST', headers: apiHeaders(), body: JSON.stringify({ level: 'INFO', source: 'quality.inspection', message, details: { filename: selectedImageFile?.name || null, disposition: 'requires-human-review' } }) }) } catch {}
      setActionStatus(old => ({ ...old, [m.id]: 'Inspection record sent to the backend event log when available. No automatic accept/reject decision was made.' }))
      logEvent('Visual inspection record saved for review.', 'READY')
      return
    }
    if (m.id === 'emergency' && action.startsWith('Simulate')) {
      const note = `${action} started in drill mode. No real alerts or dispatches were sent.`
      setActionStatus(old => ({ ...old, [m.id]: note }))
      logEvent(`${action} — drill mode only.`, 'WARN')
      try { await fetch(`${API_BASE}/api/events`, { method: 'POST', headers: apiHeaders(), body: JSON.stringify({ level: 'WARN', source: 'emergency.drill', message: action, details: { mode: 'drill-only', real_dispatch: false } }) }) } catch {}
      return
    }
    if (m.id === 'digital-twin' && action === 'Run what-if scenario') {
      try {
        const response = await fetch(`${API_BASE}/api/digital-twin/simulate`, { method: 'POST', headers: apiHeaders(), body: JSON.stringify({ load_percent: twinLoad, baseline_units_per_hour: 100, baseline_kwh_per_hour: 48 }) })
        if (!response.ok) throw new Error(`Backend returned ${response.status}`)
        const data = await response.json()
        setSimulation(true)
        setActionStatus(old => ({ ...old, [m.id]: `Backend simulation at ${data.load_percent}% load: ~${data.estimated_units_per_hour} units/hour and ${data.estimated_kwh_per_hour} kWh/hour. ${data.mode}; not calibrated to real plant data.` }))
        setApiStatus('online')
        logEvent(`Backend digital-twin scenario evaluated at ${twinLoad}% load.`, 'READY')
      } catch (error) {
        setSimulation(true)
        setActionStatus(old => ({ ...old, [m.id]: `Local simulation only; backend unavailable. ${String(error)}` }))
        setApiStatus('offline')
      }
      return
    }
    if (m.id === 'digital-twin' && action === 'Rotate model') { setTwinRotation(s => !s); return }
    if (m.id === 'digital-twin' && action === 'Reset baseline') { setSimulation(false); setTwinLoad(78); setTwinRotation(false); return }
    const text = `${action} completed in local demo mode. This action is not connected to an external factory system.`
    setActionStatus(old => ({ ...old, [m.id]: text }))
    logEvent(`${m.title}: ${action} (demo mode)`, 'READY')
    try { await fetch(`${API_BASE}/api/events`, { method: 'POST', headers: apiHeaders(), body: JSON.stringify({ level: 'INFO', source: m.id, message: action, details: { mode: 'ui-demo' } }) }) } catch {}
  }
  const buttonStyle: React.CSSProperties = {border:'1px solid #26435d', background:'#10243a', color:'#e6f5ff', borderRadius:10, padding:'10px 13px', fontWeight:700, cursor:'pointer', fontSize:12}
  const primaryButton: React.CSSProperties = {...buttonStyle, background:'linear-gradient(120deg,#32d9ed,#55a9ff)', color:'#04111f', border:'none'}

  return <div className="fio-root">
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&display=swap');
      .fio-root{min-height:100vh;background:#050b16;color:#e8f2ff;font-family:Inter,system-ui,sans-serif;--cyan:#42e8f5;--line:#1a334b;overflow:hidden}
      .fio-root *{box-sizing:border-box}.fio-root button,.fio-root input,.fio-root select,.fio-root textarea{font:inherit}.fio-root button{transition:transform .18s,border-color .18s,filter .18s}.fio-root button:hover{filter:brightness(1.12);transform:translateY(-1px)}.fio-root button:disabled{opacity:.4;cursor:not-allowed;filter:none;transform:none}
      .fio-gridbg{background-image:linear-gradient(rgba(52,105,143,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(52,105,143,.07) 1px,transparent 1px);background-size:32px 32px}
      .fio-top{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:14px;padding:12px 20px;border-bottom:1px solid #19334b;background:rgba(4,11,23,.92);backdrop-filter:blur(18px)}
      .fio-brand{font-family:'Space Grotesk',sans-serif;font-size:14px;font-weight:900;letter-spacing:.04em;color:#e8faff}.fio-logo{display:grid;place-items:center;width:34px;height:34px;border:1px solid #42e8f5;border-radius:10px;color:#42e8f5;box-shadow:0 0 20px #42e8f522}
      .fio-chip{font-size:10px;letter-spacing:.08em;border:1px solid #28516b;color:#7eeeff;border-radius:999px;padding:5px 8px;white-space:nowrap}.fio-dot{width:7px;height:7px;border-radius:50%;background:#35e6a0;box-shadow:0 0 12px #35e6a0;display:inline-block;animation:fioPulse 1.8s infinite}
      .fio-container{max-width:1500px;margin:auto;padding:24px}.fio-hero{display:grid;grid-template-columns:1.15fr .85fr;gap:24px;align-items:stretch;padding:30px;border:1px solid #1c405a;border-radius:24px;background:radial-gradient(ellipse at 90% 0%,#153f5c 0%,transparent 42%),linear-gradient(140deg,#0c1d31,#07111f 72%);position:relative;overflow:hidden}
      .fio-eyebrow{font-size:10px;color:#42e8f5;letter-spacing:.2em;font-weight:900;text-transform:uppercase}.fio-title{font-family:'Space Grotesk',sans-serif;font-size:clamp(30px,4vw,54px);line-height:1.04;letter-spacing:-.05em;margin:14px 0}.fio-muted{color:#91a8bd;line-height:1.65}.fio-card{border:1px solid #1b354c;background:linear-gradient(145deg,rgba(15,34,55,.96),rgba(7,18,32,.96));border-radius:17px;padding:17px;min-width:0}.fio-card:hover{border-color:#37617d}.fio-section-title{font-family:'Space Grotesk',sans-serif;font-size:20px;font-weight:800;letter-spacing:-.02em}.fio-kpi{font-size:24px;font-weight:900;font-family:'Space Grotesk',sans-serif}.fio-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:13px}.fio-module{cursor:pointer;text-align:left;position:relative;overflow:hidden;min-height:190px;display:flex;flex-direction:column;gap:10px}.fio-module:after{content:'';position:absolute;right:-28px;bottom:-44px;width:120px;height:120px;border-radius:50%;background:var(--module-color);opacity:.07;filter:blur(4px)}.fio-module-icon{font-size:23px;width:46px;height:46px;border-radius:14px;display:grid;place-items:center;background:#ffffff08;border:1px solid #ffffff15}.fio-tag{font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:#9bb4c9;border:1px solid #29435b;border-radius:999px;padding:4px 7px}.fio-input{width:100%;border:1px solid #29465f;background:#050e1b;color:#e8f2ff;border-radius:10px;padding:12px;outline:none}.fio-input:focus{border-color:#42e8f5;box-shadow:0 0 0 3px #42e8f51a}.fio-row{display:flex;gap:9px;align-items:center;flex-wrap:wrap}.fio-two{display:grid;grid-template-columns:1.2fr .8fr;gap:14px}.fio-three{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.fio-chart{height:145px;display:flex;align-items:flex-end;gap:8px;padding:12px 4px 0;border-bottom:1px solid #26445c}.fio-bar{flex:1;min-width:6px;border-radius:6px 6px 0 0;background:linear-gradient(180deg,#42e8f5,#2785c6);position:relative;animation:fioGrow .8s ease both}.fio-bar span{position:absolute;bottom:-23px;left:50%;transform:translateX(-50%);font-size:9px;color:#7894ad}.fio-line{height:1px;background:#1e394f;margin:18px 0}.fio-back{color:#90a9c1;background:none;border:0;cursor:pointer;padding:0;font-size:12px}.fio-chat{height:330px;overflow:auto;display:flex;flex-direction:column;gap:10px;padding:12px;background:#050d19;border:1px solid #1a354d;border-radius:13px}.fio-msg{white-space:pre-wrap;line-height:1.55;font-size:12px;max-width:95%;padding:12px;border-radius:12px}.fio-user{align-self:flex-end;background:#0d3950;border:1px solid #24617a}.fio-ai{align-self:flex-start;background:#101e31;border:1px solid #29435b}.fio-orbit{position:absolute;width:280px;height:280px;border:1px solid #42e8f52a;border-radius:50%;right:6%;top:12%;animation:fioSpin 32s linear infinite}.fio-orbit:before,.fio-orbit:after{content:'';position:absolute;inset:25px;border:1px dashed #42e8f54a;border-radius:50%}.fio-orbit:after{inset:65px;border-color:#a78bfa44}.fio-planet{position:absolute;top:45%;left:45%;width:45px;height:45px;border-radius:50%;background:radial-gradient(circle at 30% 25%,#b4fbff,#2083b8 55%,#0b2945);box-shadow:0 0 35px #42e8f555}.fio-alert{border:1px solid #7f2e43;background:linear-gradient(120deg,#361423,#1a1422);border-radius:12px;padding:13px;color:#ffd6df}.fio-footer{padding:24px 0;color:#5f7890;font-size:10px;text-align:center}.fio-progress{height:6px;background:#172b40;border-radius:999px;overflow:hidden}.fio-progress>span{display:block;height:100%;background:linear-gradient(90deg,#42e8f5,#a78bfa);border-radius:999px;transition:width .3s}
      @keyframes fioPulse{50%{opacity:.4;box-shadow:0 0 2px #35e6a0}}@keyframes fioSpin{to{transform:rotate(360deg)}}@keyframes fioGrow{from{height:0;opacity:.2}}@media(max-width:1050px){.fio-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.fio-hero{grid-template-columns:1fr}.fio-orbit{opacity:.45;right:-4%;top:5%}.fio-two{grid-template-columns:1fr}}@media(max-width:650px){.fio-container{padding:13px}.fio-top{padding:10px;flex-wrap:wrap}.fio-grid,.fio-three{grid-template-columns:1fr}.fio-hero{padding:20px}.fio-title{font-size:34px}.fio-brand{font-size:12px}.fio-hide-mobile{display:none}.fio-chat{height:280px}}
    `}</style>

    <header className="fio-top">
      <div className="fio-logo">⬡</div>
      <div><div className="fio-brand">INDUX-OS V12 <span style={{color:'#42e8f5'}}>ATMANIRBHAR FACTORY INTELLIGENCE</span></div><div style={{fontSize:10,color:'#7692aa',marginTop:3}}>Team Reborn Innovators · InduX5-26VU-353 · Student-built prototype</div></div>
      <span className="fio-chip">ADVANCED MANUFACTURING · AI · ROBOTICS</span>
      <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:13}}><span className="fio-hide-mobile" style={{fontSize:11,color:'#89a6be'}}>{clock.toLocaleTimeString()}</span><span title={apiInfo ? `Documents indexed: ${apiInfo.documents ?? 0}; vector DB: ${apiInfo.vector_db_status || 'unknown'}` : 'Start the FastAPI service to enable backend endpoints'} style={{fontSize:10,color:apiStatus==='online'?'#75e7b5':apiStatus==='checking'?'#fbbf24':'#fb7185',display:'flex',alignItems:'center',gap:7,whiteSpace:'nowrap'}}><span className="fio-dot" style={{background:apiStatus==='online'?'#35e6a0':apiStatus==='checking'?'#fbbf24':'#fb7185',boxShadow:'none'}}/> {apiStatus==='online'?(apiInfo?.vector_db_status==='ready'?`API ONLINE · ${apiInfo?.documents ?? 0} DOCS`:'API UP · VECTOR INDEX ISSUE'):apiStatus==='checking'?'CHECKING API':'API OFFLINE · LOCAL MODE'}</span><button style={buttonStyle} onClick={()=>window.location.href='/CommandCenter'}>← Command Center</button></div>
    </header>

    <main className="fio-container fio-gridbg">
      {activeModule === 'overview' ? <>
        <section className="fio-hero">
          <div style={{position:'relative',zIndex:1}}>
            <div className="fio-eyebrow">Atmanirbhar Bharat · Affordable Industry 4.0 for MSME factories</div>
            <h1 className="fio-title">INDUX-OS V12:<br/><span style={{color:'#42e8f5'}}>Factory Intelligence OS for Atmanirbhar Bharat</span></h1><div style={{fontSize:12,fontWeight:800,letterSpacing:'.07em',color:'#bbd7e6',marginTop:9}}>AI-POWERED OPERATING SYSTEM FOR MSME FACTORIES</div>
            <p className="fio-muted" style={{maxWidth:650,fontSize:14}}>An AI-powered operating system concept for MSME factories: one practical workspace for CAD and digital twins, inventory, production, maintenance, quality, factory intelligence, safety, robotics and business automation. Designed around low-cost retrofits, repairable scrap-hardware labs and offline-tolerant operation.</p>
            <div className="fio-row" style={{marginTop:20}}><button style={primaryButton} onClick={()=>openModule('rag')}>Open Factory Intelligence ↗</button><button style={buttonStyle} onClick={()=>openModule('digital-twin')}>Explore Digital Twin</button><button style={buttonStyle} onClick={()=>openModule('workflow')}>Launch Agentic Workflows</button></div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:20}}><span className="fio-chip">9 CORE MODULES + EXTENSIONS</span><span className="fio-chip">OFFLINE-CACHED SHELL + LOCAL QUEUE</span><span className="fio-chip">HUMAN-APPROVED AUTOMATION</span></div>
          </div>
          <div style={{position:'relative',minHeight:260,display:'flex',alignItems:'center',justifyContent:'center'}}><div className="fio-orbit"><div className="fio-planet"/></div><div style={{position:'relative',zIndex:2,width:'min(100%,300px)',border:'1px solid #2c5b76',borderRadius:20,overflow:'hidden',background:'#071523dd',boxShadow:'0 20px 80px #0008'}}><img alt="Modern industrial robotics line" src="https://images.unsplash.com/photo-1567789884554-0b844b597180?auto=format&fit=crop&w=900&q=80" style={{width:'100%',height:155,objectFit:'cover',opacity:.82}}/><div style={{padding:14}}><div className="fio-row" style={{justifyContent:'space-between'}}><b style={{fontSize:12}}>MSME FACTORY OVERVIEW</b><span className="fio-tag">ILLUSTRATIVE</span></div><div className="fio-three" style={{marginTop:13,gap:8}}><div><div className="fio-kpi" style={{fontSize:18,color:'#42e8f5'}}>97.2%</div><div style={{fontSize:9,color:'#88a5bc'}}>Illustrative OEE</div></div><div><div className="fio-kpi" style={{fontSize:18,color:'#34d399'}}>−4.2%</div><div style={{fontSize:9,color:'#88a5bc'}}>Demo energy</div></div><div><div className="fio-kpi" style={{fontSize:18,color:'#fbbf24'}}>03</div><div style={{fontSize:9,color:'#88a5bc'}}>Drill scenarios</div></div></div></div></div></div>
        </section>

        <section className="fio-card" style={{marginTop:17,borderColor:'#2a5369',background:'linear-gradient(120deg,#0b2437,#091525)'}}>
          <div className="fio-row" style={{justifyContent:'space-between',alignItems:'flex-start'}}>
            <div style={{maxWidth:850}}><div className="fio-eyebrow">National challenge · Advanced manufacturing + emerging technologies</div><div className="fio-section-title" style={{marginTop:7}}>Affordable factory digitalisation for Atmanirbhar Bharat</div><p className="fio-muted" style={{fontSize:12,marginBottom:0}}>MSMEs often face affordability, integration and skills barriers when adopting Industry 4.0. INDUX-OS is a student-built prototype intended to bring useful factory workflows into a lower-cost, modular and repairable platform—supporting the broader Make in India direction through indigenous software, local repairability and hands-on skills development.</p></div>
            <span className="fio-tag" style={{color:'#fbbf24',borderColor:'#7d5a26'}}>PROTOTYPE + PILOT / FIELD TESTING</span>
          </div>
          <div className="fio-grid" style={{marginTop:18}}>
            {[{v:'~6.3 crore',l:'MSME ecosystem scale',d:'Ministry of MSME review published 1 Jan 2025',c:'#42e8f5'},{v:'28%',l:'Productivity-loss estimate',d:'Team challenge framing; validate with pilot baseline',c:'#fb7185'},{v:'₹350–₹6,000',l:'Scrap-hardware lab range',d:'Target kit range; depends on parts and reuse',c:'#fbbf24'},{v:'30–40%',l:'Automation cost reduction target',d:'Hypothesis to measure, not an achieved result',c:'#34d399'}].map(k=><div key={k.l} style={{padding:14,border:'1px solid #1d3a50',background:'#06132199',borderRadius:13}}><div className="fio-kpi" style={{fontSize:22,color:k.c}}>{k.v}</div><div style={{fontSize:11,fontWeight:800,marginTop:7}}>{k.l}</div><div style={{fontSize:10,color:'#8ba5ba',lineHeight:1.5,marginTop:5}}>{k.d}</div></div>)}
          </div>
          <div className="fio-row" style={{justifyContent:'space-between',marginTop:15,alignItems:'flex-start'}}>
            <div style={{fontSize:11,color:'#a8c0d2',lineHeight:1.6,maxWidth:830}}>SAMARTH Udyog Bharat 4.0 alignment: affordable Industry 4.0 solutions, integration of legacy machines, KPI benchmarking and skill development. INDUX-OS is an independent student prototype; this alignment does not imply official affiliation, certification or endorsement. Offline UI can remain available after caching; cloud RAG, LLM generation and remote telemetry require connectivity.</div>
            <a href="https://www.heavyindustries.gov.in/en/samarth-udyog-bharat-40" target="_blank" rel="noreferrer" style={{fontSize:11,color:'#42e8f5',whiteSpace:'nowrap'}}>SAMARTH Udyog source ↗</a>
          </div>
        </section>

        <section style={{marginTop:17}} className="fio-three">
          {[{label:'Factory Intelligence',value:'RAG CORE',sub:'Document-aware assistant',icon:'🧠',color:'#42e8f5',id:'rag'},{label:'Design + Operations',value:'DIGITAL TWIN',sub:'CAD concept + production planning',icon:'🏭',color:'#fbbf24',id:'digital-twin'},{label:'Safe Automation',value:'HUMAN IN LOOP',sub:'Agents propose, people approve',icon:'🤖',color:'#c4b5fd',id:'workflow'}].map(k=><button key={k.id} className="fio-card" onClick={()=>openModule(k.id)} style={{textAlign:'left',cursor:'pointer',display:'flex',alignItems:'center',gap:14}}><div style={{fontSize:25,width:52,height:52,display:'grid',placeItems:'center',background:k.color+'14',borderRadius:14,border:`1px solid ${k.color}44`}}>{k.icon}</div><div style={{flex:1}}><div style={{fontSize:10,color:'#809ab0'}}>{k.label}</div><div style={{fontSize:15,fontWeight:900,margin:'4px 0'}}>{k.value}</div><div style={{fontSize:11,color:'#8da6bb'}}>{k.sub}</div></div><span style={{color:k.color}}>↗</span></button>)}
        </section>

        <section style={{marginTop:28}}>
          <div className="fio-row" style={{justifyContent:'space-between',marginBottom:13}}><div><div className="fio-section-title">Nine core factory modules</div><div className="fio-muted" style={{fontSize:12}}>Designed as one low-cost operating workspace; each card opens its own module view.</div></div><span className="fio-tag">9 CORE MODULES</span></div>
          <div className="fio-row" style={{marginBottom:13}}><input className="fio-input" style={{maxWidth:320}} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search all modules…"/><select className="fio-input" style={{maxWidth:220}} value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select><span style={{fontSize:11,color:'#7f9bb2'}}>{filteredModules.length} matching modules</span></div>
          <div className="fio-grid">{filteredCoreModules.map(m=><button key={m.id} className="fio-card fio-module" onClick={()=>openModule(m.id)} style={{'--module-color':m.color} as React.CSSProperties}><div className="fio-row" style={{justifyContent:'space-between'}}><div className="fio-module-icon" style={{color:m.color}}>{m.icon}</div><span className="fio-tag">{m.category}</span></div><div style={{fontWeight:800,fontSize:14}}>{m.title}</div><div style={{fontSize:11,color:'#8da7bc',lineHeight:1.55,flex:1}}>{m.description}</div><div className="fio-row" style={{justifyContent:'space-between',marginTop:5}}><span style={{fontSize:10,color:m.color}}>{m.metric}</span><span style={{color:m.color,fontSize:14}}>↗</span></div></button>)}</div>
          <div className="fio-row" style={{justifyContent:'space-between',margin:'26px 0 13px'}}><div><div className="fio-section-title" style={{fontSize:18}}>Advanced capability extensions</div><div className="fio-muted" style={{fontSize:12}}>Specialized workspaces extend the same core system for emergencies, mapping, energy, knowledge graphs and optimisation.</div></div><span className="fio-tag">{EXTENSION_MODULES.length} EXTENSIONS</span></div>
          <div className="fio-grid">{filteredExtensionModules.map(m=><button key={m.id} className="fio-card fio-module" onClick={()=>openModule(m.id)} style={{'--module-color':m.color} as React.CSSProperties}><div className="fio-row" style={{justifyContent:'space-between'}}><div className="fio-module-icon" style={{color:m.color}}>{m.icon}</div><span className="fio-tag">{m.category}</span></div><div style={{fontWeight:800,fontSize:14}}>{m.title}</div><div style={{fontSize:11,color:'#8da7bc',lineHeight:1.55,flex:1}}>{m.description}</div><div className="fio-row" style={{justifyContent:'space-between',marginTop:5}}><span style={{fontSize:10,color:m.color}}>{m.metric}</span><span style={{color:m.color,fontSize:14}}>↗</span></div></button>)}</div>
        </section>

        <section className="fio-two" style={{marginTop:26}}>
          <div className="fio-card"><div className="fio-row" style={{justifyContent:'space-between'}}><div><div className="fio-section-title">Operational pulse</div><div className="fio-muted" style={{fontSize:11}}>Illustrative sample values · not connected to live plant equipment</div></div><span className="fio-tag">DEMO DATA</span></div><div className="fio-three" style={{marginTop:20}}>{[{l:'Production plan',v:'4,862 / 5,000',p:97,c:'#42e8f5'},{l:'Energy efficiency',v:'−4.2%',p:74,c:'#34d399'},{l:'PPE checklist',v:'98%',p:98,c:'#fbbf24'}].map(x=><div key={x.l}><div style={{fontSize:10,color:'#8ba5ba'}}>{x.l}</div><div className="fio-kpi" style={{fontSize:19,margin:'8px 0',color:x.c}}>{x.v}</div><div className="fio-progress"><span style={{width:`${x.p}%`,background:x.c}}/></div></div>)}</div><div className="fio-chart">{[45,57,51,70,64,83,75,92,80,97,87,100].map((v,i)=><div key={i} className="fio-bar" style={{height:`${v}%`,animationDelay:`${i*40}ms`}}><span>{['M','T','W','T','F','S','S','M','T','W','T','F'][i]}</span></div>)}</div></div>
          <div className="fio-card"><div className="fio-row" style={{justifyContent:'space-between'}}><div className="fio-section-title">System event stream</div><span className="fio-tag">{apiStatus==='online'?'BACKEND + LOCAL':'LOCAL ONLY'}</span></div><div style={{marginTop:12,display:'grid',gap:8}}>{eventLog.slice(0,6).map((e,i)=><div key={`${e.time}-${i}`} style={{display:'grid',gridTemplateColumns:'70px 52px 1fr',gap:8,fontSize:10,alignItems:'start',paddingBottom:8,borderBottom:'1px solid #172d42'}}><span style={{color:'#66849c'}}>{e.time}</span><span style={{color:e.level==='WARN'?'#fb7185':e.level==='READY'?'#42e8f5':'#34d399'}}>{e.level}</span><span style={{color:'#afc1d1'}}>{e.text}</span></div>)}</div></div>
        </section>
      </> : currentModule ? <>
        <div style={{marginBottom:20}}><button className="fio-back" onClick={goOverview}>← All Factory Intelligence modules</button><div className="fio-row" style={{marginTop:17,alignItems:'flex-start'}}><div className="fio-module-icon" style={{width:58,height:58,fontSize:28,color:currentModule.color}}>{currentModule.icon}</div><div style={{flex:1}}><div className="fio-eyebrow">{currentModule.category} module · INDUX-OS</div><h1 className="fio-title" style={{fontSize:'clamp(27px,3vw,42px)',margin:'7px 0 9px'}}>{currentModule.title}</h1><p className="fio-muted" style={{maxWidth:850,fontSize:13,margin:0}}>{currentModule.description}</p></div><span className="fio-tag">{currentModule.metric}</span></div></div>

        {activeModule === 'rag' ? <div className="fio-two"><section className="fio-card"><div className="fio-row" style={{justifyContent:'space-between',marginBottom:12}}><div className="fio-section-title">📚 Multimodal GenAI Assistant</div><span className="fio-tag">SOURCE-GROUNDED RAG</span></div><p className="fio-muted" style={{fontSize:12}}>Ingestion → embedding → retrieval → citation → safety review. When the API and vector index are online, answers retrieve chunks from your uploaded manuals. If the API is unavailable, local sample answers are clearly marked and must not be treated as manual citations.</p><div className="fio-row" style={{margin:'14px 0'}}><select className="fio-input" style={{maxWidth:150}} value={voiceLang} onChange={e=>setVoiceLang(e.target.value)}><option value="en-IN">English</option><option value="hi-IN">Hindi</option><option value="bn-IN">Bengali</option><option value="ta-IN">Tamil</option><option value="de-DE">German</option></select><button style={buttonStyle} onClick={startVoice}>{recording?'Listening…':'🎤 Speak'}</button><label style={buttonStyle}>📎 Add manuals<input type="file" multiple accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.webp,.doc,.docx" onChange={e=>handleFiles(e.target.files)} style={{display:'none'}}/></label></div><div className="fio-chat">{messages.length===0?<div style={{margin:'auto',textAlign:'center',color:'#7e9ab0',fontSize:12}}><div style={{fontSize:32,marginBottom:10}}>◈</div><b style={{color:'#d7eaf7'}}>Ask the factory knowledge core</b><p>Try a sample question below to see a grounded-style response.</p></div>:messages.map((msg,i)=><div key={i} className={`fio-msg ${msg.role==='user'?'fio-user':'fio-ai'}`}><div style={{fontSize:9,color:msg.role==='user'?'#76d9ef':'#9aadd0',fontWeight:900,marginBottom:5}}>{msg.role==='user'?'YOU':'INDUX ASSISTANT'}</div>{msg.text}{msg.source&&<div style={{marginTop:9,paddingTop:8,borderTop:'1px solid #2b455c',fontSize:10,color:'#42e8f5'}}>Source reference: {msg.source}</div>}</div>)}</div><form onSubmit={e=>{e.preventDefault();askAssistant()}} className="fio-row" style={{marginTop:10}}><input className="fio-input" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Ask in English or Hinglish…"/><button style={primaryButton} type="submit">Ask ↗</button></form><div className="fio-row" style={{marginTop:10}}>{['bearing vibration high hai','motor garam ho raha hai','hydraulic leak','quality scratch defect','safety checklist'].map(s=><button key={s} style={{...buttonStyle,padding:'7px 9px',fontSize:10}} onClick={()=>{setQuery(s);askAssistant(s)}}>{s}</button>)}</div></section><aside style={{display:'grid',gap:12,alignContent:'start'}}><div className="fio-card"><div className="fio-section-title">Knowledge ingestion queue</div><p className="fio-muted" style={{fontSize:11}}>Uploads are sent to the configured Factory Intelligence API for parsing, chunking, BGE embeddings and ChromaDB indexing when the API is online. Supported document formats are listed in the API docs.</p>{uploadNames.length===0?<div style={{padding:16,border:'1px dashed #34516a',borderRadius:12,textAlign:'center',fontSize:11,color:'#8099ae'}}>No files selected yet</div>:uploadNames.map((n,i)=><div key={`${n}-${i}`} style={{fontSize:11,padding:'8px 0',borderBottom:'1px solid #1d3449'}}>📄 {n}<span style={{float:'right',color:'#fbbf24'}}>{apiStatus==='online'?'Check ingest summary':'Selected in browser'}</span></div>)}{uploadMessage&&<div className={uploadMessage.includes('FAILED')?'fio-alert':''} style={{fontSize:11,marginTop:10,color:uploadMessage.includes('FAILED')?'#ffd6df':'#9bd8e7',lineHeight:1.55}}>{uploadMessage}</div>}{indexedDocuments.length > 0 && <><div className="fio-line"/><div className="fio-row" style={{justifyContent:'space-between'}}><b style={{fontSize:11}}>Indexed documents persisted on server</b><span className="fio-tag">{indexedDocuments.length} DOCS</span></div>{indexedDocuments.slice(0,8).map((doc:any)=><div key={doc.id} style={{fontSize:11,padding:'8px 0',borderBottom:'1px solid #1d3449'}}>📚 {doc.filename}<div style={{fontSize:9,color:'#7e9ab0',marginTop:3}}>{doc.chunk_count} chunks · {Math.round((doc.byte_size || 0)/1024)} KB · {doc.indexed_at ? new Date(doc.indexed_at).toLocaleString() : 'Indexed'}</div></div>)}</> }<div className="fio-line"/><div style={{fontSize:11,color:'#8da6bc'}}>Pipeline blueprint</div>{['Parse PDF / OCR / voice transcription','Chunk + BGE embeddings','ChromaDB / vector index','Knowledge graph relations','Retrieve chunks + rerank','Citation + safety policy check'].map((s,i)=><div key={s} className="fio-row" style={{fontSize:11,marginTop:10}}><span style={{color:'#42e8f5'}}>{String(i+1).padStart(2,'0')}</span><span>{s}</span></div>)}</div><div className="fio-alert"><b style={{fontSize:12}}>Safety boundary</b><p style={{fontSize:11,lineHeight:1.6,marginBottom:0}}>Do not rely on a demo response for live maintenance. Verify the cited page in your approved manual and follow local safety procedures.</p></div></aside></div> : null}

        {activeModule === 'inventory' ? <div className="fio-two">
          <section className="fio-card"><div className="fio-section-title">📦 Inventory & Materials Register</div><p className="fio-muted" style={{fontSize:12}}>Inventory records are stored in the backend SQLite database. This is useful for pilot stock tracking; connect purchasing/ERP systems only through an authorized integration.</p>
            <form onSubmit={saveInventoryItem} style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10,marginTop:15}}>
              <label style={{fontSize:11,color:'#91a8bd'}}>SKU / Part ID<input required className="fio-input" value={inventoryForm.sku} onChange={e=>setInventoryForm({...inventoryForm,sku:e.target.value})} placeholder="BRG-6202" style={{marginTop:5}}/></label>
              <label style={{fontSize:11,color:'#91a8bd'}}>Part name<input required className="fio-input" value={inventoryForm.name} onChange={e=>setInventoryForm({...inventoryForm,name:e.target.value})} placeholder="Bearing 6202" style={{marginTop:5}}/></label>
              <label style={{fontSize:11,color:'#91a8bd'}}>Opening quantity<input required type="number" min="0" step="0.01" className="fio-input" value={inventoryForm.quantity} onChange={e=>setInventoryForm({...inventoryForm,quantity:e.target.value})} style={{marginTop:5}}/></label>
              <label style={{fontSize:11,color:'#91a8bd'}}>Unit<input className="fio-input" value={inventoryForm.unit} onChange={e=>setInventoryForm({...inventoryForm,unit:e.target.value})} placeholder="pcs / kg / m" style={{marginTop:5}}/></label>
              <label style={{fontSize:11,color:'#91a8bd'}}>Reorder threshold<input required type="number" min="0" step="0.01" className="fio-input" value={inventoryForm.reorder_level} onChange={e=>setInventoryForm({...inventoryForm,reorder_level:e.target.value})} style={{marginTop:5}}/></label>
              <label style={{fontSize:11,color:'#91a8bd'}}>Store / location<input className="fio-input" value={inventoryForm.location} onChange={e=>setInventoryForm({...inventoryForm,location:e.target.value})} placeholder="Main Store" style={{marginTop:5}}/></label>
              <button type="submit" style={primaryButton}>Save inventory item ↗</button><button type="button" style={buttonStyle} onClick={refreshInventory}>Refresh from backend</button>
            </form>
            {inventoryMessage&&<div className="fio-alert" style={{marginTop:12,borderColor:'#28586b',background:'#0a2434',color:'#c3edf7'}}>{inventoryMessage}</div>}
          </section>
          <section className="fio-card"><div className="fio-row" style={{justifyContent:'space-between'}}><div className="fio-section-title">Stock ledger</div><span className="fio-tag">{inventoryItems.length} ITEMS</span></div>
            {inventoryItems.length===0?<div className="fio-muted" style={{fontSize:12,marginTop:15}}>No inventory records yet. Add your first part to create a persistent item in the connected backend.</div>:<div style={{display:'grid',gap:9,marginTop:12}}>{inventoryItems.map((item:any)=><div key={item.id} style={{padding:12,border:'1px solid #213d53',borderRadius:12,background:'#071523'}}><div className="fio-row" style={{justifyContent:'space-between',alignItems:'flex-start'}}><div><b style={{fontSize:12}}>{item.name}</b><div style={{fontSize:10,color:'#7896ad',marginTop:4}}>{item.sku} · {item.location}</div></div><span className="fio-tag" style={{color:Number(item.quantity)<=Number(item.reorder_level)?'#fb7185':'#34d399',borderColor:Number(item.quantity)<=Number(item.reorder_level)?'#7d3243':'#28634d'}}>{Number(item.quantity)<=Number(item.reorder_level)?'REORDER':'IN STOCK'}</span></div><div className="fio-row" style={{justifyContent:'space-between',marginTop:10}}><div><span className="fio-kpi" style={{fontSize:20}}>{item.quantity}</span> <span style={{fontSize:10,color:'#91a8bd'}}>{item.unit} · minimum {item.reorder_level}</span></div><div className="fio-row"><button style={buttonStyle} onClick={()=>adjustInventory(item,-1)} disabled={Number(item.quantity)<=0}>−1</button><button style={buttonStyle} onClick={()=>adjustInventory(item,1)}>+1</button></div></div></div>)}</div>}
            <div className="fio-alert" style={{marginTop:14}}><b>Operational boundary</b><p style={{fontSize:11,marginBottom:0}}>Stock changes are recorded in the INDUX-OS database only; they do not place purchase orders or modify an external ERP.</p></div>
          </section>
        </div> : null}

        {activeModule === 'production' ? <div className="fio-two">
          <section className="fio-card"><div className="fio-section-title">🗓️ Production job planner</div><p className="fio-muted" style={{fontSize:12}}>Add jobs, assign a relative priority and estimated duration, then calculate an explainable schedule. The result is a planning aid and is not transmitted to a PLC or MES.</p>
            <form onSubmit={saveProductionJob} style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10,marginTop:15}}>
              <label style={{fontSize:11,color:'#91a8bd'}}>Job number<input required className="fio-input" value={productionForm.job_number} onChange={e=>setProductionForm({...productionForm,job_number:e.target.value})} placeholder="JOB-001" style={{marginTop:5}}/></label>
              <label style={{fontSize:11,color:'#91a8bd'}}>Product / batch<input required className="fio-input" value={productionForm.product} onChange={e=>setProductionForm({...productionForm,product:e.target.value})} placeholder="Bracket batch A" style={{marginTop:5}}/></label>
              <label style={{fontSize:11,color:'#91a8bd'}}>Quantity<input required type="number" min="1" step="1" className="fio-input" value={productionForm.quantity} onChange={e=>setProductionForm({...productionForm,quantity:e.target.value})} style={{marginTop:5}}/></label>
              <label style={{fontSize:11,color:'#91a8bd'}}>Priority (1–10)<input required type="number" min="1" max="10" step="1" className="fio-input" value={productionForm.priority} onChange={e=>setProductionForm({...productionForm,priority:e.target.value})} style={{marginTop:5}}/></label>
              <label style={{fontSize:11,color:'#91a8bd'}}>Estimated duration (hours)<input required type="number" min="0.1" step="0.1" className="fio-input" value={productionForm.duration_hours} onChange={e=>setProductionForm({...productionForm,duration_hours:e.target.value})} style={{marginTop:5}}/></label>
              <div className="fio-row"><button type="submit" style={primaryButton}>Save job ↗</button><button type="button" style={buttonStyle} onClick={refreshProduction}>Refresh jobs</button></div>
            </form>
            {productionMessage&&<div className="fio-alert" style={{marginTop:12,borderColor:'#28586b',background:'#0a2434',color:'#c3edf7'}}>{productionMessage}</div>}
            <div className="fio-line"/><div className="fio-row" style={{justifyContent:'space-between'}}><div className="fio-section-title" style={{fontSize:16}}>Current jobs</div><span className="fio-tag">{productionJobs.length} JOBS</span></div>
            {productionJobs.length===0?<p className="fio-muted" style={{fontSize:12}}>Add a job to start a production plan.</p>:productionJobs.map((job:any)=><div key={job.id} className="fio-row" style={{justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid #20374b'}}><div><b style={{fontSize:12}}>{job.job_number} · {job.product}</b><div style={{fontSize:10,color:'#839db2',marginTop:4}}>{job.quantity} units · {job.duration_hours} h · priority {job.priority}</div></div><span className="fio-tag">{job.status || 'planned'}</span></div>)}
            <div className="fio-row" style={{marginTop:14}}><button style={primaryButton} onClick={optimizeProductionPlan}>Optimize sequence</button></div>
          </section>
          <section className="fio-card"><div className="fio-section-title">Schedule analysis</div><p className="fio-muted" style={{fontSize:12}}>Uses a classical single-machine weighted-completion heuristic. It does not include setup times, due dates, multiple machines or real-time constraints.</p>{productionPlanSummary&&<div className="fio-alert" style={{marginTop:12,borderColor:'#59418c',background:'#19152a',color:'#e3d8ff'}}>{productionPlanSummary}</div>}{productionPlan.length===0?<div style={{marginTop:15,padding:20,border:'1px dashed #31516a',borderRadius:12,color:'#7e9ab0',fontSize:12,textAlign:'center'}}>The optimized sequence will appear here.</div>:productionPlan.map((job:any)=><div key={job.id} className="fio-row" style={{justifyContent:'space-between',padding:12,borderBottom:'1px solid #1d3449'}}><div><span className="fio-tag">STEP {job.position}</span> <b style={{fontSize:12,marginLeft:7}}>{job.id}</b></div><span style={{fontSize:11,color:'#42e8f5'}}>{job.duration} h · priority {job.priority}</span></div>)}<div className="fio-line"/><div style={{fontSize:11,color:'#91a8bd'}}>Human scheduling approval is required before any live factory schedule changes. None are made by this screen.</div></section>
        </div> : null}

        {activeModule === 'digital-twin' || activeModule === 'maintenance' ? <div className="fio-two"><div className="fio-card"><div className="fio-row" style={{justifyContent:'space-between'}}><div className="fio-section-title">{activeModule==='digital-twin'?'Factory line digital twin':'Motor M-12 condition view'}</div><span className="fio-tag">SIMULATED MODEL</span></div><div style={{marginTop:14,border:'1px solid #1e4159',borderRadius:15,overflow:'hidden',position:'relative',background:'radial-gradient(circle at 50% 50%,#173c55,#07121f 70%)'}}><img alt="Industrial automation equipment" src="https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=1000&q=80" style={{width:'100%',height:290,objectFit:'cover',opacity:.62,transform:twinRotation?'scale(1.12) rotate(2deg)':'scale(1)',transition:'transform .5s'}}/><div style={{position:'absolute',inset:0,pointerEvents:'none',background:'linear-gradient(transparent 60%,#07121fee)'}}/><div style={{position:'absolute',left:14,top:14,background:'#061321dd',border:'1px solid #2d5d78',borderRadius:9,padding:10,fontSize:10}}>ASSET: M-12 / LINE 03<br/><span style={{color:'#42e8f5'}}>MODEL VIEW • NOT LIVE TELEMETRY</span></div><div style={{position:'absolute',right:14,top:14,width:10,height:10,borderRadius:'50%',background:simulation?'#fb7185':'#34d399',boxShadow:`0 0 15px ${simulation?'#fb7185':'#34d399'}`}}/></div><div style={{marginTop:18}}><div className="fio-row" style={{justifyContent:'space-between'}}><label style={{fontSize:12}}>Production load</label><b style={{color:'#42e8f5'}}>{twinLoad}%</b></div><input type="range" min="30" max="100" value={twinLoad} onChange={e=>setTwinLoad(Number(e.target.value))} style={{width:'100%',accentColor:'#42e8f5',margin:'13px 0'}}/><div className="fio-row">{currentModule.actions.map(a=><button key={a} style={a.includes('Reset')?buttonStyle:primaryButton} onClick={()=>runModuleAction(currentModule,a)}>{a}</button>)}</div>{actionStatus[currentModule.id]&&<p className="fio-muted" style={{fontSize:11,marginTop:12}}>{actionStatus[currentModule.id]}</p>}</div></div><div className="fio-card"><div className="fio-section-title">Condition indicators</div><div className="fio-three" style={{gridTemplateColumns:'repeat(2,minmax(0,1fr))',marginTop:14}}>{[{l:'Bearing health',v:simulation?'62%':'94%',c:simulation?'#fbbf24':'#34d399'},{l:'Vibration',v:simulation?'4.8 mm/s':'1.2 mm/s',c:simulation?'#fb7185':'#42e8f5'},{l:'Motor temp',v:simulation?'76°C':'41°C',c:simulation?'#fbbf24':'#34d399'},{l:'Predicted risk',v:simulation?'Elevated':'Normal',c:simulation?'#fb7185':'#34d399'}].map(k=><div key={k.l} className="fio-card"><div style={{fontSize:10,color:'#829bb0'}}>{k.l}</div><div className="fio-kpi" style={{fontSize:19,color:k.c,marginTop:8}}>{k.v}</div></div>)}</div><div className="fio-line"/><div style={{fontSize:12,fontWeight:800}}>Sample trend</div><div className="fio-chart">{(simulation?[25,35,40,55,65,77,90]:[25,30,27,35,31,37,34]).map((v,i)=><div key={i} className="fio-bar" style={{height:`${v}%`,background:simulation?'linear-gradient(#fb7185,#a52b4b)':'linear-gradient(#42e8f5,#2785c6)'}}><span>{i+1}h</span></div>)}</div><p className="fio-muted" style={{fontSize:10,marginTop:30}}>Synthetic values for UI testing. Connect validated sensors and asset-specific thresholds before operational use.</p></div></div> : null}

        {activeModule === 'ot-security' ? <div className="fio-two"><div className="fio-card"><div className="fio-section-title">OT security operations console</div><p className="fio-muted" style={{fontSize:12}}>This safe demonstration does not scan a network, contact PLCs or change device configurations.</p><div className="fio-three" style={{marginTop:15}}>{[{l:'Confirmed threats',v:'0',c:'#34d399'},{l:'Info findings',v:scanDone?'2':'—',c:'#fbbf24'},{l:'Device changes',v:'0',c:'#42e8f5'}].map(k=><div className="fio-card" key={k.l}><div style={{fontSize:10,color:'#8aa2b8'}}>{k.l}</div><div className="fio-kpi" style={{color:k.c}}>{k.v}</div></div>)}</div><div className="fio-row" style={{marginTop:16}}><button style={primaryButton} onClick={()=>runModuleAction(currentModule!,'Run demo scan')}>Run safe demo scan</button><button style={buttonStyle} onClick={()=>{setScanDone(false);setActionStatus(old=>({...old,'ot-security':''}));logEvent('OT demo scan view reset.')}}>Reset view</button></div>{scanDone&&<div className="fio-alert" style={{marginTop:14,borderColor:'#6c5730',background:'#241d10',color:'#f9e4b4'}}><b>Demo scan summary</b><p style={{fontSize:11}}>Two illustrative informational findings: asset inventory review recommended; firmware baseline review recommended. These are not observations from a real network.</p></div>}</div><div className="fio-card"><div className="fio-section-title">OT defense workflow</div>{['Asset inventory & ownership','Passive monitoring / approved telemetry','Baseline and anomaly review','Analyst triage and evidence capture','Human approval before any change'].map((s,i)=><div key={s} className="fio-row" style={{marginTop:15,fontSize:12}}><span style={{color:'#42e8f5',fontWeight:900}}>{String(i+1).padStart(2,'0')}</span><span>{s}</span><span style={{marginLeft:'auto',color:i===4?'#fbbf24':'#34d399',fontSize:10}}>{i===4?'GATE':'READY'}</span></div>)}</div></div> : null}

        {activeModule === 'quality' ? <div className="fio-two"><div className="fio-card"><div className="fio-section-title">Visual inspection workbench</div><p className="fio-muted" style={{fontSize:12}}>Choose an inspection image. The backend validates the upload and only runs vision inference when a validated YOLO model is configured; otherwise it clearly reports that inference did not run.</p><input id="quality-file-input" type="file" accept="image/*" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f){setSelectedImage(f.name);setSelectedImageFile(f);setDefectResult('')}}}/><div style={{minHeight:240,border:'1px dashed #31536d',borderRadius:14,display:'grid',placeItems:'center',marginTop:15,overflow:'hidden',background:'#07121f'}}>{selectedImage?<div style={{padding:24,textAlign:'center'}}><div style={{fontSize:35}}>🖼️</div><b>{selectedImage}</b><p className="fio-muted" style={{fontSize:11}}>Selected in browser until Run demo inspection sends it to the configured API.</p></div>:<div style={{textAlign:'center',color:'#7995ad'}}><div style={{fontSize:36}}>⌗</div><div style={{fontSize:12}}>No inspection image selected</div></div>}</div><div className="fio-row" style={{marginTop:13}}><button style={buttonStyle} onClick={()=>document.getElementById('quality-file-input')?.click()}>Choose image</button><button style={primaryButton} onClick={()=>runModuleAction(currentModule!,'Run demo inspection')}>Run demo inspection</button><button style={buttonStyle} onClick={()=>{setSelectedImage('');setSelectedImageFile(null);setDefectResult('')}}>Clear</button></div>{defectResult&&<div className="fio-alert" style={{marginTop:12}}>{defectResult}</div>}</div><div className="fio-card"><div className="fio-section-title">Inspection checklist</div>{['Lighting and focus verified','Correct part / batch ID captured','Approved defect criteria selected','Human quality disposition recorded','Evidence retained per site policy'].map((s,i)=><label key={s} style={{display:'flex',gap:10,alignItems:'center',fontSize:12,marginTop:15,color:'#b4c6d6'}}><input type="checkbox" style={{accentColor:'#42e8f5'}}/>{s}</label>)}<div className="fio-alert" style={{marginTop:18}}><b>Release control</b><p style={{fontSize:11}}>Do not use this demo to automatically accept or reject real products.</p></div></div></div> : null}

        {activeModule === 'workflow' ? <div className="fio-two"><div className="fio-card"><div className="fio-section-title">Agentic workflow canvas</div><p className="fio-muted" style={{fontSize:12}}>The agent can propose a sequence; consequential actions stop at an approval gate. Backend workflow and approval records persist when the API is online; no external business service or machine actuation is called.</p><div style={{display:'grid',gap:8,marginTop:18}}>{[{t:'1. Detect anomaly',d:'Collect an approved signal or user report.'},{t:'2. Retrieve evidence',d:'Search the relevant SOP and asset history.'},{t:'3. Propose action',d:'Draft a work order and safety checklist.'},{t:'4. Human approval',d:'Authorized person reviews the proposed action.'},{t:'5. Record outcome',d:'Write a local demo event after approval.'}].map((s,i)=><div key={s.t} className="fio-row" style={{padding:12,borderRadius:10,border:`1px solid ${workflowStep>=i+1?'#36768a':'#1c354c'}`,background:workflowStep>=i+1?'#0b2937':'#081524'}}><span style={{color:workflowStep>=i+1?'#42e8f5':'#58738a',fontSize:19}}>{workflowStep>=i+1?'✓':'○'}</span><div><b style={{fontSize:12}}>{s.t}</b><div style={{fontSize:10,color:'#829bb0',marginTop:4}}>{s.d}</div></div><span className="fio-tag" style={{marginLeft:'auto'}}>{i===3?'APPROVAL GATE':workflowStep>=i+1?'STAGED':'WAITING'}</span></div>)}</div><div className="fio-row" style={{marginTop:14}}>{currentModule.actions.map(a=><button key={a} style={primaryButton} onClick={()=>runModuleAction(currentModule!,a)}>{a}</button>)}</div>{actionStatus[currentModule.id]&&<p className="fio-muted" style={{fontSize:11,marginTop:12}}>{actionStatus[currentModule.id]}</p>}</div><div className="fio-card"><div className="fio-section-title">Agent guardrails</div>{['Read-only by default','Cite retrieved sources','Use least-privilege tool access','Require human approval for machine changes','Audit every tool call','Stop safely on missing evidence'].map((s,i)=><div key={s} className="fio-row" style={{fontSize:12,marginTop:14}}><span style={{color:'#34d399'}}>✓</span>{s}</div>)}</div></div> : null}

        {activeModule === 'quantum' ? <div className="fio-two"><div className="fio-card"><div className="fio-section-title">Quantum-inspired scheduling lab</div><p className="fio-muted" style={{fontSize:12}}>The backend runs a classical scheduling heuristic so the result is reproducible and explainable. This is quantum-inspired research framing, not quantum hardware or a quantum-advantage claim.</p><div className="fio-three" style={{marginTop:15}}>{[{l:'Sample jobs',v:'12'},{l:'Constraints',v:'4'},{l:'Baseline makespan',v:'100 units'}].map(x=><div className="fio-card" key={x.l}><div style={{fontSize:10,color:'#8ba4b9'}}>{x.l}</div><div className="fio-kpi" style={{fontSize:21,color:'#c4b5fd',marginTop:7}}>{x.v}</div></div>)}</div><div className="fio-row" style={{marginTop:15}}>{currentModule.actions.map(a=><button key={a} style={primaryButton} onClick={()=>runModuleAction(currentModule!,a)}>{a}</button>)}</div>{quantumResult&&<div className="fio-alert" style={{marginTop:15,borderColor:'#59418c',background:'#19152a',color:'#e3d8ff'}}>{quantumResult}</div>}</div><div className="fio-card"><div className="fio-section-title">Research pathway</div>{['Define objective and constraints','Create classical baseline','Run heuristic search','Compare cost and runtime','Validate against real production constraints'].map((s,i)=><div className="fio-row" key={s} style={{marginTop:15,fontSize:12}}><span style={{color:'#c4b5fd'}}>0{i+1}</span>{s}</div>)}</div></div> : null}

        {activeModule === 'emergency' || activeModule === 'risk-map' || activeModule === 'health' || activeModule === 'drone' || activeModule === 'indoor-map' || activeModule === 'business' || activeModule === 'analytics' || activeModule === 'energy' || activeModule === 'knowledge-graph' ? <div className="fio-two"><div className="fio-card"><div className="fio-row" style={{justifyContent:'space-between'}}><div className="fio-section-title">{currentModule.title} workspace</div><span className="fio-tag">SIMULATION / SAMPLE DATA</span></div><div style={{marginTop:14,border:'1px solid #23435d',borderRadius:15,overflow:'hidden',position:'relative'}}><img alt="Industrial control room and infrastructure" src={activeModule==='drone'?'https://images.unsplash.com/photo-1473968512647-3e447244af8f?auto=format&fit=crop&w=1000&q=80':activeModule==='health'?'https://images.unsplash.com/photo-1581093458791-9d42e3c7f4e7?auto=format&fit=crop&w=1000&q=80':'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=1000&q=80'} style={{width:'100%',height:260,objectFit:'cover',opacity:.58}}/><div style={{position:'absolute',left:15,bottom:15,right:15,background:'#061321e8',border:'1px solid #31536c',borderRadius:12,padding:13}}><div style={{fontSize:10,color:'#42e8f5',letterSpacing:'.1em'}}>WORKSPACE STATUS</div><div style={{fontSize:17,fontWeight:900,marginTop:6}}>{activeModule==='emergency'?'Emergency drill console':activeModule==='risk-map'?'Risk layers & evacuation planning':activeModule==='health'?'Worker wellbeing & PPE':activeModule==='drone'?'Field mission planning':activeModule==='indoor-map'?'Indoor map & waypoint planning':activeModule==='business'?'Business process orchestration':activeModule==='analytics'?'Factory performance insights':activeModule==='energy'?'Energy and utilities monitor':'Equipment relationship graph'}</div><div className="fio-muted" style={{fontSize:11,marginTop:5}}>Illustrative visual only. Live sensors, dispatch, medical devices, GIS feeds and enterprise connectors are not connected.</div></div></div><div className="fio-row" style={{marginTop:14}}>{currentModule.actions.map(a=><button key={a} style={a.toLowerCase().includes('alert')||a.toLowerCase().includes('fire')||a.toLowerCase().includes('flood')?{...buttonStyle,background:'#4a1725',borderColor:'#82364a'}:primaryButton} onClick={()=>runModuleAction(currentModule!,a)}>{a}</button>)}</div>{activeModule==='risk-map'&&<label className="fio-row" style={{marginTop:12,fontSize:12}}><input type="checkbox" checked={riskLayer} onChange={e=>setRiskLayer(e.target.checked)} style={{accentColor:'#42e8f5'}}/> Show illustrative risk layer <span className="fio-tag">{riskLayer?'ON':'OFF'}</span></label>}{actionStatus[currentModule.id]&&<div className="fio-alert" style={{marginTop:13}}>{actionStatus[currentModule.id]}</div>}{activeModule==='knowledge-graph'&&<div style={{marginTop:14}}><div className="fio-section-title" style={{fontSize:15}}>Retrieved knowledge graph</div><div className="fio-row" style={{marginTop:10,alignItems:'stretch'}}>{graphData.nodes.map((n:any)=><span key={n.id} className="fio-tag" title={n.kind}>{n.label} · {n.kind}</span>)}</div>{graphData.edges.slice(0,30).map((edge:any)=><div key={edge.id} style={{fontSize:10,color:'#91a8bd',marginTop:7}}>{edge.relation} · document ID {edge.document_id || 'n/a'}</div>)}</div>}{(activeModule==='analytics'||activeModule==='energy')&&<div style={{marginTop:14}}><div className="fio-section-title" style={{fontSize:15}}>Stored gateway telemetry</div>{telemetryRows.length?telemetryRows.slice(0,8).map((row:any)=><div key={row.id} style={{fontSize:11,padding:'8px 0',borderBottom:'1px solid #1d3449'}}><b>{row.asset_id}</b> · {row.metric}: {row.value} {row.unit}<div style={{fontSize:9,color:'#7e9ab0'}}>{row.source} · {row.observed_at}</div></div>):<p className="fio-muted" style={{fontSize:11}}>No backend readings loaded. Use “Refresh sample metrics” to check the persistent telemetry inbox.</p>}</div>}</div><div className="fio-card"><div className="fio-section-title">Operational checklist</div>{(activeModule==='emergency'?['Choose drill scenario','Confirm assembly point','Notify authorized drill lead','Account for people','Document lessons learned']:activeModule==='drone'?['Confirm legal flight authorization','Review weather and site boundaries','Define survey area and return-to-home','Check battery and link status','Review imagery with field operator']:activeModule==='health'?['Use consented, minimum necessary data','Verify PPE checklist','Escalate concerns to trained safety staff','Protect personal data','Do not treat as a medical diagnosis']:['Confirm source and timestamp','Review data quality and limitations','Assign accountable owner','Require human approval for action','Save an auditable record']).map((s,i)=><label key={s} className="fio-row" style={{fontSize:12,marginTop:15,alignItems:'flex-start'}}><input type="checkbox" style={{accentColor:'#42e8f5',marginTop:2}}/>{s}</label>)}<div className="fio-line"/><div style={{fontSize:10,color:'#829bb0'}}>Each action records only a local UI event; no real-world action is performed.</div></div></div> : null}

        {!['rag','digital-twin','inventory','production','maintenance','ot-security','quality','workflow','quantum','emergency','risk-map','health','drone','indoor-map','business','analytics','energy','knowledge-graph'].includes(activeModule) && <div className="fio-card"><p>Module not found.</p><button style={primaryButton} onClick={goOverview}>Return to modules</button></div>}
        <div style={{marginTop:22}}><button className="fio-back" onClick={goOverview}>← Return to Factory Intelligence overview</button></div>
      </> : null}
      <footer className="fio-footer">INDUX-OS V12 · Factory Intelligence OS for Atmanirbhar Bharat · Team Reborn Innovators · InduX5-26VU-353 · Student-built prototype<br/>Backend: {API_BASE} · {apiStatus==='online'?'API reachable; see each module for model/device integration status.':apiStatus==='checking'?'Checking API availability.':'Offline / demo mode.'}<br/>Prototype / pilot stage. Inventory and production records persist in the companion API; external ERP/MES, live PLC/SCADA, emergency dispatch and drone actuation require separate authorized adapters, security review and human approval.</footer>
    </main>
  </div>
}
