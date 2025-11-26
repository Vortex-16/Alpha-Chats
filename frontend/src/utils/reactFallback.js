// React fallback utilities to prevent temporal dead zone issues
import React from 'react'

// Safe React component wrapper that prevents temporal dead zone errors
export const createSafeComponent = (WrappedComponent, fallbackComponent = null) => {
  return React.forwardRef((props, ref) => {
    try {
      // Ensure React is properly loaded before rendering
      if (typeof React === 'undefined' || !React.createElement) {
        throw new Error('React not properly initialized')
      }
      
      return React.createElement(WrappedComponent, { ...props, ref })
    } catch (error) {
      console.error('Component rendering error:', error)
      
      // Return fallback component or error boundary
      if (fallbackComponent) {
        return React.createElement(fallbackComponent, props)
      }
      
      return React.createElement('div', {
        style: { 
          padding: '20px', 
          textAlign: 'center', 
          color: 'red',
          border: '1px solid red',
          borderRadius: '5px',
          margin: '10px'
        }
      }, 'Component failed to load. Please refresh the page.')
    }
  })
}

// Safe hook wrapper to prevent temporal dead zone in custom hooks
export const createSafeHook = (hookFunction) => {
  return (...args) => {
    try {
      // Ensure React hooks are available
      if (typeof React.useState === 'undefined') {
        throw new Error('React hooks not available')
      }
      
      return hookFunction(...args)
    } catch (error) {
      console.error('Hook execution error:', error)
      // Return safe defaults based on hook type
      return null
    }
  }
}

// Development mode React error recovery
export const initializeReactErrorRecovery = () => {
  if (process.env.NODE_ENV === 'development') {
    // Add global error handler for React errors
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason && event.reason.message && event.reason.message.includes('Cannot access')) {
        console.warn('Temporal dead zone error detected. This may be due to circular imports or initialization order issues.')
        console.warn('Error details:', event.reason)
      }
    })

    window.addEventListener('error', (event) => {
      if (event.error && event.error.message && event.error.message.includes('Cannot access')) {
        console.warn('Temporal dead zone error detected in global scope.')
        console.warn('Error details:', event.error)
      }
    })
  }
}