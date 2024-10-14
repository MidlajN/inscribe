import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CommunicationProvider, CanvasProvider } from './context.jsx'
import App from './App.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CanvasProvider>
      <CommunicationProvider>
        <App />
      </CommunicationProvider>
    </CanvasProvider>
  </StrictMode>,
)
