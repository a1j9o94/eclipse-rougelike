import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import EclipseVariableDemoPage from './pages/EclipseVariableDemoPage.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <EclipseVariableDemoPage />
  </StrictMode>,
)
