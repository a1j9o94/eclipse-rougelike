import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import GalaxyDemoPage from './pages/GalaxyDemoPage.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GalaxyDemoPage />
  </StrictMode>,
)
