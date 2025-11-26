import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import {Provider} from 'react-redux'
import { store } from './redux/store.js'
import { ThemeProvider } from './components/ThemeContext';
import BackendHealthCheck from './components/BackendHealthCheck.jsx';
import './config/axios.js'; 
import { serverUrl } from './config/constants.js';

// Export for backward compatibility
export { serverUrl }

// Expose store for debugging in development
if (import.meta.env.DEV) {
  window.store = store
}

createRoot(document.getElementById('root')).render(
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
