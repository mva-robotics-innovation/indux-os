
import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import CommandCenter from './pages/CommandCenter'
import FactoryIntelligenceOS from './pages/FactoryIntelligenceOS'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CommandCenter />} />
        <Route path="/CommandCenter" element={<CommandCenter />} />
        <Route path="/FactoryIntelligence" element={<FactoryIntelligenceOS />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
