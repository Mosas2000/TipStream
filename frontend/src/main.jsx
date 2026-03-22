import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { TipProvider } from './context/TipContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { reportWebVitals } from './lib/web-vitals.js'
import { validateConfigAtStartup, reportValidationErrors } from './config/startup.js'
import { initializeTelemetrySink } from './config/telemetry.js'

const validationResults = validateConfigAtStartup();
reportValidationErrors(validationResults);
initializeTelemetrySink();

if (!validationResults.success) {
  const errorMessage = document.createElement('div');
  errorMessage.style.cssText = 'padding: 20px; background: #fee; border: 2px solid #c00; margin: 20px; font-family: monospace; border-radius: 4px;';
  errorMessage.innerHTML = `
    <h2 style="margin-top: 0; color: #c00;">Configuration Error</h2>
    <p>Application cannot start due to invalid configuration.</p>
    <p style="margin-bottom: 0;"><strong>Check the browser console for details.</strong></p>
  `;
  document.body.appendChild(errorMessage);
  throw new Error('Configuration validation failed. Check console for details.');
}

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
