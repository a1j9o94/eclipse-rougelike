import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import EclipseDemoPage from './pages/EclipseDemoPage.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <EclipseDemoPage />
  </StrictMode>,
)
