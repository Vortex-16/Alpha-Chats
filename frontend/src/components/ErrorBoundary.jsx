import React, { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    this.setState({
      error: error,
      errorInfo: errorInfo
    })
  }

  render() {
    if (this.state.hasError) {
      // Check theme from document or localStorage
      const isDark = document.documentElement.classList.contains('dark') || 
                    localStorage.getItem('theme') === 'dark' ||
                    (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
      
      return (
        <div className='w-full h-screen flex items-center justify-center bg-gradient-to-br from-pastel-cream via-pastel-lavender to-pastel-peach dark:from-[#181c2f] dark:via-[#2d1e60] dark:to-[#39ff14] relative'>
          {/* Animated background grid */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="grid grid-cols-12 gap-4 h-full">
              {Array.from({ length: 48 }, (_, i) => (
                <div 
                  key={i} 
                  className="bg-red-500 dark:bg-[#39ff14] rounded-lg animate-pulse" 
                  style={{ 
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: `${2 + Math.random() * 3}s`
                  }}
                ></div>
              ))}
            </div>
          </div>
          
          <div className='relative z-10 bg-pastel-cream dark:bg-[#23234a] p-8 rounded-2xl shadow-2xl max-w-md text-center border border-red-300 dark:border-[#39ff14]/30'>
            <div className="mb-6">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">⚠️</span>
              </div>
              <h1 className='text-2xl font-bold text-red-500 dark:text-red-400 mb-2 font-mono'>System Error</h1>
              <div className="text-xs text-red-600 dark:text-[#39ff14] font-mono mb-4">ERROR_CODE: 0x001</div>
            </div>
            
            <p className='text-pastel-muted dark:text-[#b3b3ff] mb-6 font-mono text-sm'>
              A critical error has occurred in the system. Please restart the application or contact support.
            </p>
            
            <button 
              onClick={() => window.location.reload()}
              className='bg-gradient-to-r from-pastel-rose to-pastel-coral dark:from-[#39ff14] dark:to-[#7f53ac] text-white dark:text-[#181c2f] px-6 py-3 rounded-lg hover:scale-105 transition-all font-mono font-bold shadow-lg'
            >
              RESTART SYSTEM
            </button>
            
            {process.env.NODE_ENV === 'development' && (
              <details className='mt-6 text-left'>
                <summary className='cursor-pointer text-sm text-pastel-rose dark:text-[#39ff14] font-mono hover:text-pastel-coral dark:hover:text-white'>
                  &gt; Show Error Details
                </summary>
                <pre className='text-xs mt-3 p-3 bg-pastel-cream dark:bg-[#181c2f] rounded border border-pastel-rose dark:border-[#39ff14]/20 overflow-auto text-pastel-plum dark:text-[#b3b3ff] font-mono'>
                  {this.state.error && this.state.error.toString()}
                  <br />
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
          
          {/* Ambient glow effects */}
          <div className="fixed top-10 left-10 w-32 h-32 bg-red-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="fixed bottom-10 right-10 w-40 h-40 bg-green-500/20 dark:bg-[#39ff14]/20 rounded-full blur-3xl animate-pulse"></div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
