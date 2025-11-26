import { useEffect, useState, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { socketManager } from './socketManager'

const useSocket = (onMessageReceived) => {
  const { userData } = useSelector(state => state.user)
  const socketUrl = import.meta.env.VITE_SOCKET_URL || "https://alpha-chats-new.onrender.com"
  const [socketStatus, setSocketStatus] = useState(socketManager.getStatus())
  // Handle socket events from global manager
  const handleSocketEvent = useCallback((event, data) => {
    console.log(`🎯 [useSocket] Received event: ${event}`, data);
    switch (event) {
      case 'connect':
      case 'disconnect':
      case 'onlineUsers':
      case 'userTyping':
        const newStatus = socketManager.getStatus();
        console.log(`🔄 [useSocket] Updating socketStatus for event ${event}:`, {
          isConnected: newStatus.isConnected,
          onlineUsersCount: newStatus.onlineUsers?.length || 0,
          onlineUsers: newStatus.onlineUsers
        });
        setSocketStatus(newStatus);
        break
      case 'newMessage':
        if (onMessageReceived) {
          onMessageReceived(data)
        }
        break
    }
  }, [onMessageReceived])

  // Initialize socket when user logs in - CRITICAL: Only depends on userId
  useEffect(() => {
    if (userData?._id) {
      console.log('🎯 Initializing global socket for user:', userData._id)
      socketManager.init(userData._id, socketUrl)
      
      // Subscribe to socket events
      const unsubscribe = socketManager.subscribe(handleSocketEvent)
      
      // Update local state
      setSocketStatus(socketManager.getStatus())
      
      return unsubscribe
    } else {
      // User logged out
      console.log('🚪 User logged out, cleaning up global socket')
      socketManager.cleanup()
      setSocketStatus(socketManager.getStatus())
    }
  }, [userData?._id, socketUrl, handleSocketEvent])

  // Socket functions
  const sendMessage = useCallback((messageData) => {
    return socketManager.sendMessage(messageData, userData?._id)
  }, [userData?._id])

  const startTyping = useCallback((recipientId) => {
    if (socketManager.socket && socketManager.isConnected) {
      socketManager.socket.emit('typing', {
        senderId: userData?._id,
        recipientId,
        isTyping: true
      })
    }
  }, [userData?._id])

  const stopTyping = useCallback((recipientId) => {
    if (socketManager.socket && socketManager.isConnected) {
      socketManager.socket.emit('typing', {
        senderId: userData?._id,
        recipientId,
        isTyping: false
      })
    }
  }, [userData?._id])

  const markAsRead = useCallback((senderId) => {
    if (socketManager.socket && socketManager.isConnected && userData?._id) {
      socketManager.socket.emit('markConversationAsRead', {
        senderId,
        recipientId: userData._id
      })
    }
  }, [userData?._id])

  // Additional functions that were in the original useSocket
  const updateStatus = useCallback((status) => {
    if (socketManager.socket && socketManager.isConnected) {
      socketManager.socket.emit('updateStatus', {
        userId: userData?._id,
        status
      })
    }
  }, [userData?._id])

  const joinRoom = useCallback((roomId) => {
    if (socketManager.socket && socketManager.isConnected) {
      socketManager.socket.emit('joinRoom', roomId)
    }
  }, [])

  const leaveRoom = useCallback((roomId) => {
    if (socketManager.socket && socketManager.isConnected) {
      socketManager.socket.emit('leaveRoom', roomId)
    }
  }, [])

  const getUserActivity = useCallback((userId) => {
    if (socketManager.socket && socketManager.isConnected) {
      socketManager.socket.emit('getUserActivity', userId)
    }
  }, [])

  return {
    sendMessage,
    startTyping,
    stopTyping,
    updateStatus,
    markAsRead,
    joinRoom,
    leaveRoom,
    getUserActivity,
    isConnected: socketStatus.isConnected,
    onlineUsers: socketStatus.onlineUsers,
    typingUsers: socketStatus.typingUsers
  }
}

export default useSocket