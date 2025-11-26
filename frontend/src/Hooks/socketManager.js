// Global socket manager - prevents multiple socket connections
import { io } from 'socket.io-client'
import { getBrowserInfo, hasSocketIOIssues, getOptimalTransports, logBrowserInfo, getSocketConfig, handleSocketError } from '../utils/browserDetection.js'

class SocketManager {
  constructor() {
    this.socket = null
    this.isConnected = false
    this.userId = null
    this.callbacks = new Set()
    this.onlineUsers = []
    this.typingUsers = new Set()
    this.browserInfo = getBrowserInfo()
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 15
  }

  // Initialize socket connection (only once per user session)
  init(userId, socketUrl = null) {
    if (this.socket && this.userId === userId) {
      console.log('✅ Socket already initialized for user:', userId)
      return this.socket
    }

    if (this.socket) {
      console.log('🔄 Cleaning up existing socket for different user')
      this.cleanup()
    }

    // Log browser information for debugging
    logBrowserInfo()

    console.log('🔌 Creating new global socket connection for user:', userId)
    this.userId = userId

    // Use environment variable or fallback to provided URL
    const finalSocketUrl = socketUrl || import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || 'https://alpha-chats-new.onrender.com'
    console.log('🔧 Socket URL:', finalSocketUrl)

    // Get browser-specific socket configuration
    const socketConfig = getSocketConfig()
    
    console.log('🔧 Socket config for', this.browserInfo.name, ':', {
      transports: socketConfig.transports,
      timeout: socketConfig.timeout,
      hasIssues: hasSocketIOIssues()
    })

    this.socket = io(finalSocketUrl, socketConfig)

    this.setupEventListeners()
    return this.socket
  }
  setupEventListeners() {
    this.socket.on('connect', () => {
      console.log('✅ Global socket connected successfully on', this.browserInfo.name)
      this.isConnected = true
      this.reconnectAttempts = 0
      this.socket.emit('join', this.userId)
      this.notifyCallbacks('connect')
    })

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Global socket disconnected:', reason, 'on', this.browserInfo.name)
      this.isConnected = false
      this.notifyCallbacks('disconnect')
      
      // Handle browser-specific reconnection issues
      if (hasSocketIOIssues() && reason === 'transport close') {
        console.log('🔄 Browser compatibility issue detected, attempting manual reconnection...')
        setTimeout(() => {
          if (!this.isConnected && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++
            this.socket.connect()
          }        }, 2000)
      }
    })

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message)
      handleSocketError(error, this.browserInfo)
      
      // For problematic browsers, try polling-only mode
      if (hasSocketIOIssues() && this.reconnectAttempts < 3) {
        console.log('🔄 Switching to polling-only mode for', this.browserInfo.name)
        this.socket.io.opts.transports = ['polling']
      }
    })

    this.socket.on('onlineUsers', (data) => {
      try {
        console.log('📡 [SOCKET] Raw onlineUsers data received:', data);
        console.log('📡 [SOCKET] Data type:', typeof data);
        console.log('📡 [SOCKET] Is array:', Array.isArray(data));
        
        if (data && typeof data === 'object' && data.users) {
          this.onlineUsers = Array.isArray(data.users) ? data.users : [];
          console.log('📡 [SOCKET] Processed users from object:', this.onlineUsers);
        } else if (Array.isArray(data)) {
          this.onlineUsers = data;
          console.log('📡 [SOCKET] Processed users from array:', this.onlineUsers);
        } else {
          console.warn('⚠️ Received invalid onlineUsers data:', data);
          this.onlineUsers = [];
        }
        
        console.log('👥 Online users updated:', this.onlineUsers.length, 'users on', this.browserInfo.name);
        console.log('👥 Final onlineUsers array:', this.onlineUsers);
        this.notifyCallbacks('onlineUsers', this.onlineUsers);
      } catch (error) {
        console.error('❌ Error processing onlineUsers:', error);
        this.onlineUsers = [];
        this.notifyCallbacks('onlineUsers', []);
      }
    });

    this.socket.on('newMessage', (message) => {
      console.log('📩 Global socket received message:', message)
      this.notifyCallbacks('newMessage', message)
    })

    // Handle message delivered confirmation
    this.socket.on('messageDelivered', (data) => {
      console.log('✓✓ Message delivered:', data)
      this.notifyCallbacks('messageDelivered', data)
    })

    // Handle message read confirmation
    this.socket.on('messageRead', (data) => {
      console.log('👁 Message read:', data)
      this.notifyCallbacks('messageRead', data)
    })

    // Add other event listeners...
    this.socket.on('userTyping', (data) => {
      if (data.isTyping) {
        this.typingUsers.add(data.userId)
      } else {
        this.typingUsers.delete(data.userId)
      }
      this.notifyCallbacks('userTyping', data)
    })

    // Enhanced error handling
    this.socket.on('error', (error) => {
      handleSocketError(error, this.browserInfo)
    })
  }
  // Register callback for events
  subscribe(callback) {
    console.log(`📝 [SOCKET] Subscribing callback. Total callbacks: ${this.callbacks.size + 1}`);
    this.callbacks.add(callback);
    return () => {
      console.log(`🗑️ [SOCKET] Unsubscribing callback. Remaining callbacks: ${this.callbacks.size - 1}`);
      this.callbacks.delete(callback);
    };
  }
  // Notify all registered callbacks
  notifyCallbacks(event, data) {
    console.log(`🔔 [SOCKET] Notifying ${this.callbacks.size} callbacks for event: ${event}`);
    this.callbacks.forEach((callback, index) => {
      if (typeof callback === 'function') {
        try {
          console.log(`🔔 [SOCKET] Calling callback ${index + 1} for event: ${event}`);
          callback(event, data);
        } catch (error) {
          console.error(`❌ [SOCKET] Error in callback ${index + 1}:`, error);
        }
      } else {
        console.warn(`⚠️ [SOCKET] Invalid callback ${index + 1}:`, typeof callback);
      }
    });
  }

  // Send message
  sendMessage(messageData, currentUserId) {
    if (this.socket && this.isConnected) {
      const enhancedData = {
        ...messageData,
        senderId: currentUserId,
        messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date()
      }
      
      this.socket.emit('sendMessage', enhancedData)
      return enhancedData.messageId
    } else {
      console.warn('Global socket not connected, cannot send message')
      return null
    }
  }

  // Cleanup socket
  cleanup() {
    if (this.socket) {
      console.log('🚪 Cleaning up global socket')
      this.socket.removeAllListeners()
      this.socket.disconnect()
      this.socket = null
      this.userId = null
      this.isConnected = false
      this.onlineUsers = []
      this.typingUsers.clear()
      this.callbacks.clear()
    }
  }

  // Get current status
  getStatus() {
    return {
      isConnected: this.isConnected,
      onlineUsers: this.onlineUsers,
      typingUsers: Array.from(this.typingUsers),
      userId: this.userId
    }
  }
}

// Export singleton instance
export const socketManager = new SocketManager()

// Expose for debugging in development
if (import.meta.env.DEV) {
  window.socketManager = socketManager
}
