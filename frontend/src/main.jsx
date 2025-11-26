import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { store } from './redux/store.js'
import { ThemeProvider } from './components/ThemeContext'
import BackendHealthCheck from './components/BackendHealthCheck.jsx'
import './config/axios.js'
import { serverUrl } from './config/constants.js'
import { initializeReactErrorRecovery } from './utils/reactFallback.js'

// Initialize React error recovery in development
initializeReactErrorRecovery()

// Export for backward compatibility
export { serverUrl }

// Expose store for debugging in development
if (import.meta.env.DEV) {
  window.store = store
}

// Ensure React is properly loaded before rendering
const renderApp = () => {
  try {
    const rootElement = document.getElementById('root')
    if (!rootElement) {
      throw new Error('Root element not found')
    }

    const root = createRoot(rootElement)
    root.render(
      <BrowserRouter>
        <Provider store={store}>
          <ThemeProvider>
            <BackendHealthCheck>
              <App />
            </BackendHealthCheck>
          </ThemeProvider>
        </Provider>
      </BrowserRouter>
    )
  } catch (error) {
    console.error('Failed to render app:', error)
    // Fallback rendering
    document.body.innerHTML = `
      <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
        <h1>Application Loading Error</h1>
        <p>Please refresh the page to try again.</p>
        <button onclick="window.location.reload()">Refresh Page</button>
      </div>
    `
  }
}

// Wait for DOM to be fully loaded before rendering
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderApp)
} else {
  renderApp()
}
