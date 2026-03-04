import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { TipProvider } from './context/TipContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { reportWebVitals } from './lib/web-vitals.js'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <TipProvider>
            <App />
          </TipProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)

reportWebVitals()
