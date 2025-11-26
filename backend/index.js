import express from "express"
import dotenv from "dotenv"
import connectDB from "./config/db.js"
import authRouter from "./routes/auth.routes.js"
import cookieParser from "cookie-parser"
import cors from "cors"
import userRouter from "./routes/user.routes.js"
import messageRouter from "./routes/message.routes.js"
import { Server } from "socket.io"
import http from "http"
import User from "./models/user.model.js"
import Message from "./models/message.model.js"
import Conversation from "./models/conversation.model.js"

dotenv.config()

const port = process.env.PORT || 4000
const app = express()
const server = http.createServer(app)

// Initialize Socket.io with CORS settings
const io = new Server(server, {
  cors: {    origin: process.env.NODE_ENV === 'production' 
      ? ["https://alpha-chats.vercel.app", "https://alpha-chats-api.vercel.app"] // Updated production URLs
      : ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "https://congenial-trout-wr97rgrgx7xg29xq4-4000.app.github.dev/","http://localhost:5176","https://congenial-trout-wr97rgrgx7xg29xq4-5173.app.github.dev",
    "https://congenial-trout-wr97rgrgx7xg29xq4-5173.app.github.dev/"],
    methods: ["GET", "POST"],
    credentials: true
  }
})

// Store online users with enhanced tracking
const onlineUsers = new Map()
const typingUsers = new Map() // Track typing status
const userActivity = new Map() // Track user activity

// Socket.io connection handling with enhanced browser support
io.on('connection', (socket) => {
  console.log(`🔌 User connected: ${socket.id}`)
  
  // Log browser information from headers
  const userAgent = socket.handshake.headers['user-agent'] || 'Unknown'
  const customHeader = socket.handshake.headers['x-custom-header']
  
  if (customHeader) {
    console.log(`📱 Browser type detected: ${customHeader}`)
  }
  
  if (userAgent.includes('SamsungBrowser')) {
    console.log(`🔧 Samsung Browser detected - using optimized settings`)
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    console.log(`🍎 Safari detected - using extended timeouts`)
  }

  // Handle user joining/login
  socket.on('join', async (userId) => {
    // CRITICAL: Remove any existing connection for this user (prevent multiple connections)
    const existingConnection = Array.from(onlineUsers.entries())
      .find(([uId, userData]) => uId === userId);
    
    if (existingConnection) {
      const [existingUserId, existingUserData] = existingConnection;
      console.log(`🔄 [RECONNECT] User ${userId} replacing old connection ${existingUserData.socketId} with ${socket.id}`);
      onlineUsers.delete(existingUserId);
      
      // Disconnect the old socket if it still exists
      const oldSocket = io.sockets.sockets.get(existingUserData.socketId);
      if (oldSocket) {
        oldSocket.disconnect(true);
      }
    }
    
    const currentTime = new Date()
    
    onlineUsers.set(userId, {
      socketId: socket.id,
      status: 'online',
      lastSeen: currentTime,
      joinedAt: currentTime
    })
    
    // Update user status in database
    try {
      await User.findByIdAndUpdate(userId, {
        status: 'online',
        isOnline: true,
        lastSeen: currentTime
      })
      console.log(`💾 Updated online status in database for user ${userId}`)
    } catch (error) {
      console.error(`❌ Failed to update online status for user ${userId}:`, error)
    }
    
    // Initialize activity tracking
    userActivity.set(userId, {
      messagesSent: 0,
      sessionStart: currentTime,
      lastActivity: currentTime
    })
      // Broadcast updated online users list to all clients
    const onlineUsersData = {
      users: Array.from(onlineUsers.keys()),
      count: onlineUsers.size,
      timestamp: currentTime
    }
    
    console.log('📤 [BROADCAST] Sending online users to all clients:', {
      count: onlineUsersData.count,
      users: onlineUsersData.users,
      connectedSockets: io.sockets.sockets.size
    })
    
    io.emit('onlineUsers', onlineUsersData)
    
    // Send user status update
    socket.broadcast.emit('userStatusUpdate', {
      userId,
      status: 'online',
      timestamp: currentTime
    })
    
    console.log(`✅ User ${userId} joined. Online users: ${onlineUsers.size}`)
  })
  // Handle sending messages with enhanced features
  socket.on('sendMessage', async (data) => {
    try {
      console.log('📩 [SOCKET] Received message for real-time delivery:', {
        senderId: data.senderId,
        recipientId: data.recipientId,
        messageId: data.messageId,
        type: data.type
      });
      
      const { senderId, recipientId, message, type = 'text', metadata = {}, messageId, dbId } = data
      
      // CRITICAL: Socket.IO should NOT create messages in database
      // Messages are created via HTTP route. Socket.IO only handles real-time delivery.
      
      // Update user activity
      if (userActivity.has(senderId)) {
        const activity = userActivity.get(senderId)
        activity.messagesSent++
        activity.lastActivity = new Date()
        userActivity.set(senderId, activity)
      }
      
      // Enhanced message data based on type
      let messageContent = message || ''
      let enhancedMetadata = { ...metadata }
      
      if (type === 'code') {
        enhancedMetadata = {
          ...enhancedMetadata,
          language: data.codeLang || metadata.language || 'javascript',
          code: data.code || message
        }
        messageContent = data.code || message
      } else if (type === 'terminal') {
        enhancedMetadata = {
          ...enhancedMetadata,
          terminal: data.terminal || message,
          command: data.command || data.terminal || message
        }
        messageContent = data.terminal || message
      }
      
      // DO NOT CREATE MESSAGE IN DATABASE - HTTP route handles that
      // Socket.IO is ONLY for real-time delivery to recipients      // Find recipient's socket and delivery status
      const recipient = Array.from(onlineUsers.entries())
        .find(([userId, userData]) => userId === recipientId)
      
      const messageData = {
        _id: dbId || `temp_${messageId}`, // Use database ID if available
        messageId: messageId,
        senderId,
        recipientId,
        message: messageContent,
        type,
        metadata: enhancedMetadata,
        timestamp: new Date(), // Use current timestamp for socket delivery
        delivered: !!recipient,
        read: false
      }
      
      // Clear typing status for sender
      if (typingUsers.has(senderId)) {
        typingUsers.delete(senderId)
        socket.broadcast.emit('userStoppedTyping', { userId: senderId })
      }
      
      if (recipient) {
        const [userId, userData] = recipient
        
        // CRITICAL DEBUG: Check for multiple connections
        const userConnections = Array.from(onlineUsers.entries())
          .filter(([uId, uData]) => uId === recipientId)
        
        console.log(`🔍 [DEBUG] Recipient connections for ${recipientId}:`, userConnections.length);
        if (userConnections.length > 1) {
          console.log('⚠️ [WARNING] Multiple connections detected for same user!', 
            userConnections.map(([uId, uData]) => uData.socketId));
        }
        
        // Send message to recipient ONLY (not to sender)
        io.to(userData.socketId).emit('newMessage', messageData)
        
        // Mark message as delivered in database if dbId exists
        if (dbId) {
          try {
            await Message.findByIdAndUpdate(dbId, { delivered: true });
            console.log(`✓ Marked message ${dbId} as delivered in database`);
          } catch (error) {
            console.error('Failed to update delivery status:', error);
          }
        }
        
        // Send delivery confirmation to sender
        socket.emit('messageDelivered', {
          messageId: dbId || messageId,
          recipientId,
          timestamp: new Date(),
          status: 'delivered'
        })
        
        console.log(`📩 [SOCKET] Message delivered: ${senderId} → ${recipientId} (Socket: ${userData.socketId})`)
      } else {
        // User is offline, message saved but not delivered
        socket.emit('messageStatus', {
          messageId: messageId,
          status: 'offline',
          recipientId
        })
        
        console.log(`📱 [SOCKET] Recipient offline: ${senderId} → ${recipientId}`)
      }
      
      // CRITICAL: Do NOT send message back to sender via Socket.IO
      // Sender gets their message copy from HTTP response only
      
    } catch (error) {
      console.error('❌ [SOCKET] Error in message delivery:', error)
      socket.emit('messageError', {
        messageId: data.messageId,
        error: 'Failed to deliver message',
        details: error.message
      })
    }})

  // Enhanced typing indicators
  socket.on('typing', (data) => {
    const { recipientId, isTyping, senderId } = data
    
    if (isTyping) {
      typingUsers.set(senderId, {
        recipientId,
        startTime: new Date()
      })
    } else {
      typingUsers.delete(senderId)
    }
    
    const recipient = Array.from(onlineUsers.entries())
      .find(([userId, userData]) => userId === recipientId)
    
    if (recipient) {
      const [userId, userData] = recipient
      io.to(userData.socketId).emit('userTyping', {
        userId: senderId,
        isTyping,
        timestamp: new Date()
      })
    }
  })

  // Handle user status updates
  socket.on('updateStatus', (data) => {
    const { userId, status } = data
    if (onlineUsers.has(userId)) {
      onlineUsers.get(userId).status = status
      onlineUsers.get(userId).lastSeen = new Date()
      
      // Broadcast status update
      io.emit('userStatusUpdate', { 
        userId, 
        status, 
        timestamp: new Date() 
      })
    }
  })

  // Handle joining specific rooms/conversations
  socket.on('joinRoom', (roomId) => {
    socket.join(roomId)
    console.log(`👥 User ${socket.id} joined room: ${roomId}`)
  })

  // Handle leaving rooms
  socket.on('leaveRoom', (roomId) => {
    socket.leave(roomId)
    console.log(`👋 User ${socket.id} left room: ${roomId}`)
  })

  // Handle file sharing
  socket.on('shareFile', (data) => {
    const { recipientId, fileData } = data
    const recipient = Array.from(onlineUsers.entries())
      .find(([userId, userData]) => userId === recipientId)
    
    if (recipient) {
      const [userId, userData] = recipient
      io.to(userData.socketId).emit('fileReceived', {
        ...fileData,
        senderId: data.senderId,
        timestamp: new Date()
      })
    }
  })

  // Handle message read receipts
  socket.on('markAsRead', async (data) => {
    const { messageId, senderId, recipientId } = data
    
    // Update message read status in database
    if (messageId) {
      try {
        await Message.findByIdAndUpdate(messageId, { 
          read: true,
          delivered: true 
        });
        console.log(`👁 Marked message ${messageId} as read in database`);
      } catch (error) {
        console.error('Failed to update read status:', error);
      }
    }
    
    // Notify sender that message was read
    const sender = Array.from(onlineUsers.entries())
      .find(([userId, userData]) => userId === senderId)
    
    if (sender) {
      const [userId, userData] = sender
      io.to(userData.socketId).emit('messageRead', {
        messageId,
        readBy: recipientId,
        timestamp: new Date()
      })
    }
  })
  // Get user activity stats
  socket.on('getUserActivity', (userId) => {
    const activity = userActivity.get(userId)
    const userStatus = onlineUsers.get(userId)
    
    socket.emit('userActivityUpdate', {
      userId,
      activity: activity || null,
      status: userStatus || null,
      timestamp: new Date()
    })
  })

  // Debug: Handle manual request for online users
  socket.on('requestOnlineUsers', () => {
    console.log('🔍 [DEBUG] Manual request for online users from:', socket.id)
    
    const onlineUsersData = {
      users: Array.from(onlineUsers.keys()),
      count: onlineUsers.size,
      timestamp: new Date()
    }
    
    console.log('📤 [DEBUG] Sending online users data:', onlineUsersData)
    socket.emit('onlineUsers', onlineUsersData)
  })

  // Handle disconnection
  socket.on('disconnect', async () => {
    // Find and remove user from online users
    const userEntry = Array.from(onlineUsers.entries())
      .find(([userId, userData]) => userData.socketId === socket.id)
    
    if (userEntry) {
      const [userId] = userEntry
      
      const currentTime = new Date()
      
      // Update last seen time in memory
      onlineUsers.get(userId).lastSeen = currentTime
      onlineUsers.get(userId).status = 'offline'
      
      // IMPORTANT: Update lastSeen in database for persistent storage
      try {
        await User.findByIdAndUpdate(userId, {
          lastSeen: currentTime,
          status: 'offline',
          isOnline: false
        })
        console.log(`💾 Updated lastSeen in database for user ${userId}`)
      } catch (error) {
        console.error(`❌ Failed to update lastSeen for user ${userId}:`, error)
      }
      
      // Clean up typing status
      typingUsers.delete(userId)
      
      // Remove from online users
      onlineUsers.delete(userId)
        // Broadcast updated online users list
      const onlineUsersData = {
        users: Array.from(onlineUsers.keys()),
        count: onlineUsers.size,
        timestamp: currentTime
      }
      
      console.log('📤 [DISCONNECT BROADCAST] Sending updated online users:', {
        count: onlineUsersData.count,
        users: onlineUsersData.users,
        connectedSockets: io.sockets.sockets.size
      })
      
      io.emit('onlineUsers', onlineUsersData)
      
      // Broadcast user offline status
      socket.broadcast.emit('userStatusUpdate', {
        userId,
        status: 'offline',
        lastSeen: currentTime,
        timestamp: currentTime
      })
      
      console.log(`❌ User ${userId} disconnected. Online users: ${onlineUsers.size}`)
    }
  })
})

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ["https://alpha-chats.vercel.app", "https://alpha-chats-api.vercel.app"] // Updated production URLs
    : ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176"],
  credentials: true
}))
app.use(express.json())
app.use(cookieParser())

// Make io accessible to routes
app.use((req, res, next) => {
  req.io = io
  req.onlineUsers = onlineUsers
  req.userActivity = userActivity
  next()
})

app.use("/api/auth", authRouter)
app.use("/api/user", userRouter)
app.use("/api/message", messageRouter)

// ✅ Connect to MongoDB FIRST, then start server
connectDB().then(() => {
  server.listen(port, () => {
    console.log(`✅ Server is running on port ${port}`)
    console.log(`🌐 http://localhost:${port}`)
    console.log(`🔌 Socket.io server ready`)
  });
}).catch((err) => {
  console.error("❌ Failed to connect to DB. Server not started.")
});
