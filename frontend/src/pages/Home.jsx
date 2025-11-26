import React, { useCallback, useRef, useEffect, useState, Suspense } from 'react'
import SideBar from '../components/SideBar'
import MessageArea from '../components/MessageArea'
import getOtherUsers from '../Hooks/getOtherUsers'
import { getBrowserCompatibilityMessage } from '../utils/connectionDiagnostics'
import { getBrowserInfo, logBrowserInfo } from '../utils/browserDetection'
import '../utils/debugOnlineUsersFlow.js'

// Lazy load useSocket to prevent circular dependencies
const useSocket = React.lazy(() => 
  import('../Hooks/useSocket').then(module => ({ default: module.default }))
)

function Home() {
  // Create a ref to pass the message handler from MessageArea to the socket
  const messageHandlerRef = useRef(null)
  const [compatibilityMessage, setCompatibilityMessage] = useState(null)
  const [showCompatibilityAlert, setShowCompatibilityAlert] = useState(false)
  
  // Socket message handler that will be called by useSocket
  const handleNewMessage = useCallback((newMessage) => {
    // Forward the message to MessageArea's handler
    if (messageHandlerRef.current) {
      messageHandlerRef.current(newMessage)
    }
  }, []);

  // State for socket data
  const [socketData, setSocketData] = useState({ isConnected: false, onlineUsers: [], typingUsers: [] })
  const [SocketHook, setSocketHook] = useState(null)

  // Load socket hook dynamically
  useEffect(() => {
    const loadSocket = async () => {
      try {
        const { default: useSocketHook } = await import('../Hooks/useSocket')
        setSocketHook(() => useSocketHook)
      } catch (error) {
        console.error('Failed to load socket hook:', error)
      }
    }
    loadSocket()
  }, [])

  // Initialize socket when hook is loaded
  useEffect(() => {
    if (SocketHook) {
      try {
        const data = SocketHook(handleNewMessage)
        setSocketData(data)
      } catch (error) {
        console.error('Failed to initialize socket:', error)
      }
    }
  }, [SocketHook, handleNewMessage])

  // Fetch other users (this was missing!)
  getOtherUsers();

  // Debug socket data flow
  useEffect(() => {
    console.log('🏠 [HOME] Socket data updated:', {
      isConnected: socketData.isConnected,
      onlineUsersCount: socketData.onlineUsers?.length || 0,
      onlineUsers: socketData.onlineUsers
    });
  }, [socketData.isConnected, socketData.onlineUsers]);

  // Run browser compatibility check on mount
  useEffect(() => {
    const checkCompatibility = async () => {
      // Log browser info for debugging
      logBrowserInfo()
      
      // Check for compatibility issues
      const message = await getBrowserCompatibilityMessage()
      if (message) {
        setCompatibilityMessage(message)
        setShowCompatibilityAlert(true)
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
          setShowCompatibilityAlert(false)
        }, 10000)
      }
    }
    
    checkCompatibility()
  }, [])
  // Show compatibility alert if needed
  const CompatibilityAlert = () => {
    if (!showCompatibilityAlert || !compatibilityMessage) return null
    
    return (
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md mx-4">
        <div className="bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-400 dark:border-yellow-600 text-yellow-800 dark:text-yellow-300 px-4 py-3 rounded-lg shadow-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-mono">
                <span className="font-bold">⚠️ Browser Compatibility Notice</span>
              </p>
              <p className="text-xs mt-1 font-mono">{compatibilityMessage}</p>
            </div>
            <button
              onClick={() => setShowCompatibilityAlert(false)}
              className="ml-2 text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-screen flex bg-gradient-to-br from-pastel-cream via-pastel-lavender to-pastel-peach dark:from-[#181c2f] dark:via-[#23234a] dark:to-[#181c2f] overflow-hidden relative">
      {/* Browser Compatibility Alert */}
      <CompatibilityAlert />
      
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-10 pointer-events-none z-0">
        <div className="grid grid-cols-12 gap-4 h-full">
          {Array.from({ length: 48 }, (_, i) => (
            <div 
              key={i} 
              className="bg-gradient-to-br from-pastel-rose via-pastel-mint to-pastel-sunny dark:from-[#39ff14] dark:via-[#ffe156] dark:to-[#ff6f3c] rounded-lg animate-pulse" 
              style={{ 
                animationDelay: `${i * 0.1}s`,
                animationDuration: `${2 + Math.random() * 3}s`
              }}
            ></div>
          ))}
        </div>
      </div>
      {/* Ambient glow effects */}
      <div className="fixed top-10 left-10 w-32 h-32 bg-pastel-rose/20 dark:bg-[#39ff14]/20 rounded-full blur-3xl animate-pulse z-20"></div>      
      <div className="fixed bottom-10 right-10 w-40 h-40 bg-pastel-coral/20 dark:bg-[#ff6f3c]/20 rounded-full blur-3xl animate-pulse z-20"></div>
      <div className="fixed top-1/2 left-1/2 w-24 h-24 bg-pastel-sunny/20 dark:bg-[#ffe156]/20 rounded-full blur-3xl animate-pulse transform -translate-x-1/2 -translate-y-1/2 z-20"></div>{/* Main Layout */}
      <div className="relative z-10 flex w-full h-full">
        <SideBar 
          onlineUsers={socketData.onlineUsers} 
          isConnected={socketData.isConnected} 
        />        <div className="flex-1 flex flex-col h-full">
          <MessageArea 
            socketData={socketData}
            messageHandlerRef={messageHandlerRef}
          />
        </div>
      </div>
    </div>
  )
}

export default Home