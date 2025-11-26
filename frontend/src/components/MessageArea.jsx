import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { IoArrowBack, IoSend, IoCheckmark, IoCheckmarkDone } from "react-icons/io5";
import { FiMonitor, FiTerminal, FiCode, FiChevronDown } from "react-icons/fi";
import dp from '../assets/pp.webp'
import { useDispatch, useSelector } from 'react-redux';
import { setSelectedUser, setMessages, addMessage, markMessagesAsRead, updateMessageStatus } from '../redux/userSlice';
import { markMessagesAsReadAPI, messageUtils } from '../utils/messageUtils';
import axios from 'axios';
import { serverUrl } from '../config/constants';
import LoadingSpinner from './LoadingSpinner';
import { useTheme } from './ThemeContext';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark, prism } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { formatLastSeen } from '../utils/dateUtils';
import { debounce, isMobileDevice, optimizeForMobile } from '../utils/mobileOptimizations';

function MessageArea({ socketData, messageHandlerRef }) {
  const { theme } = useTheme();
  let {selectedUser, userData, messages} = useSelector(state => state.user)
  let dispatch = useDispatch()
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [fetchingMessages, setFetchingMessages] = useState(false)
  const [inputMode, setInputMode] = useState('text'); // 'text', 'code', 'terminal'
  const [codeLang, setCodeLang] = useState('javascript');
  const [showTemplates, setShowTemplates] = useState(false);
    // Mobile detection with optimization
  const [isMobile, setIsMobile] = useState(() => isMobileDevice() || window.innerWidth < 640);
  const [inputFocused, setInputFocused] = useState(false);
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null)
  const selectedUserRef = useRef(selectedUser)
  const startTypingRef = useRef()
  const stopTypingRef = useRef()
  const messagesRef = useRef(messages)
  
  // Debug inputMode changes
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('🔄 Input mode changed to:', inputMode);
    }
  }, [inputMode]);
  
  // Debounced resize handler for better performance
  const debouncedHandleResize = useMemo(
    () => debounce(() => {
      const newIsMobile = isMobileDevice() || window.innerWidth < 640;
      setIsMobile(newIsMobile);
    }, 100),
    []
  );

  // Mobile detection with performance optimization
  useEffect(() => {
    window.addEventListener('resize', debouncedHandleResize);
    return () => window.removeEventListener('resize', debouncedHandleResize);
  }, [debouncedHandleResize]);

  // Initialize mobile optimizations
  useEffect(() => {
    if (isMobile) {
      optimizeForMobile();
    }
  }, [isMobile]);
  // Handle input focus for mobile keyboard behavior
  useEffect(() => {
    if (isMobile && inputFocused && inputRef.current) {
      // Delay to ensure keyboard is fully shown
      const timeoutId = setTimeout(() => {
        inputRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'nearest'
        });
        
        // Only scroll to bottom if user was already at bottom
        if (isUserAtBottom && messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ 
            behavior: 'smooth',
            block: 'end'
          });
        }
      }, 300);
      
      return () => clearTimeout(timeoutId);
    }
  }, [inputFocused, isMobile, isUserAtBottom]);

  // Prevent zoom on iOS when input is focused
  useEffect(() => {
    if (isMobile) {
      const metaViewport = document.querySelector('meta[name=viewport]');
      if (inputFocused) {
        metaViewport?.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
      } else {
        metaViewport?.setAttribute('content', 'width=device-width, initial-scale=1.0');
      }
    }
  }, [inputFocused, isMobile]);
  // Handle real-time messages - ENHANCED APPROACH for global message store
  const handleNewMessage = useCallback((newMessage) => {
    // Skip processing if we're currently fetching messages (page load)
    if (fetchingMessages) {
      console.log('⏸️ [SOCKET] Skipping message during fetch phase');
      return;
    }
    
    console.log('📩 [SOCKET] Received message:', {
      id: newMessage._id,
      from: newMessage.senderId,
      to: newMessage.recipientId,
      message: newMessage.message?.substring(0, 30),
      currentSelectedUser: selectedUserRef.current?._id
    });
    
    // WhatsApp-like behavior: Process ALL messages for global store
    // No filtering by current conversation - store everything globally
    
    // CRITICAL: Use ref to get current messages (avoids stale closure)
    const currentMessages = messagesRef.current;
    
    // Rule 1: Never add our own messages from Socket.IO (sender gets via HTTP)
    if (newMessage.senderId === userData?._id) {
      console.log('🚫 [SOCKET] Ignoring own message echo');
      return;
    }
    
    // Rule 2: Check if message already exists by ID (most reliable)
    if (newMessage._id && currentMessages?.find(msg => msg._id === newMessage._id)) {
      console.log('🚫 [SOCKET] Message already exists by ID:', newMessage._id);
      return;
    }
    
    // Rule 3: Check for content duplicates (fallback protection)
    const isDuplicate = currentMessages?.some(existingMsg => 
      existingMsg && existingMsg.message === newMessage.message &&
      existingMsg.sender === newMessage.senderId &&
      (existingMsg.recipientId === newMessage.recipientId || existingMsg.reciver === newMessage.recipientId) &&
      Math.abs(new Date(existingMsg.createdAt || existingMsg.timestamp || Date.now()) - new Date(newMessage.timestamp || Date.now())) < 3000
    );
    
    if (isDuplicate) {
      console.log('🚫 [SOCKET] Duplicate message by content+time, skipping');
      return;
    }
    
    // Rule 4: Transform and add message with proper normalization
    const transformedMessage = {
      ...newMessage,
      sender: newMessage.senderId,
      reciver: newMessage.recipientId,
      messageType: newMessage.type,
      createdAt: newMessage.timestamp
    };
    
    dispatch(addMessage(transformedMessage));
    console.log('✅ [SOCKET] Added relevant message to current conversation');
  }, [dispatch, userData?._id, fetchingMessages])  // Extract socket functions from props first
  const { 
    sendMessage: sendSocketMessage, 
    startTyping, 
    stopTyping, 
    isConnected, 
    onlineUsers, 
    typingUsers,
    markAsRead 
  } = socketData || {}

  // Memoize expensive message filtering and sorting
  const currentConversationMessages = useMemo(() => {
    if (!selectedUser?._id || !userData?._id) return [];
    
    const filtered = messages?.filter(msg => 
      (msg.sender === selectedUser._id && msg.reciver === userData._id) ||
      (msg.sender === userData._id && msg.reciver === selectedUser._id)
    ) || [];
    
    const sorted = filtered.sort((a, b) => 
      new Date(a.createdAt || a.timestamp) - new Date(b.createdAt || b.timestamp)
    );
    
    if (import.meta.env.DEV) {
      console.log(`💬 [CONVERSATION] Filtered ${sorted.length} messages for conversation with ${selectedUser.name || selectedUser._id}`);
    }
    return sorted;
  }, [messages, selectedUser?._id, userData?._id]);

  // Optimize typing indicator check
  const isUserTyping = useMemo(() => {
    return typingUsers?.includes(selectedUser?._id) || false;
  }, [typingUsers, selectedUser?._id]);
  // Set the message handler ref so Home component can use it
  useEffect(() => {
    if (messageHandlerRef) {
      messageHandlerRef.current = handleNewMessage
    }
  }, [handleNewMessage, messageHandlerRef])
  
  // Keep typing function refs updated
  useEffect(() => {
    startTypingRef.current = startTyping
    stopTypingRef.current = stopTyping
  }, [startTyping, stopTyping])

  // Handle message delivery and read status updates
  useEffect(() => {
    if (!socketData?.socket) return;

    const handleMessageDelivered = (data) => {
      console.log('✓✓ Message delivered:', data);
      dispatch(updateMessageStatus({ 
        messageId: data.messageId, 
        status: 'delivered' 
      }));
    };

    const handleMessageRead = (data) => {
      console.log('👁 Message read:', data);
      dispatch(updateMessageStatus({ 
        messageId: data.messageId, 
        status: 'read' 
      }));
    };

    // Subscribe to socket events via socketManager
    const unsubscribeDelivered = socketData.socket?.on ? 
      (socketData.socket.on('messageDelivered', handleMessageDelivered), () => socketData.socket?.off('messageDelivered', handleMessageDelivered)) : 
      () => {};
    
    const unsubscribeRead = socketData.socket?.on ? 
      (socketData.socket.on('messageRead', handleMessageRead), () => socketData.socket?.off('messageRead', handleMessageRead)) : 
      () => {};

    return () => {
      if (typeof unsubscribeDelivered === 'function') unsubscribeDelivered();
      if (typeof unsubscribeRead === 'function') unsubscribeRead();
    };
  }, [socketData?.socket, dispatch])
  const fetchMessages = useCallback(async () => {
    if (!selectedUser?._id) return
    
    console.log('🔄 Fetching messages for:', selectedUser.name, selectedUser._id);
    setFetchingMessages(true)
    try {
      const result = await axios.get(`${serverUrl}/api/message/get/${selectedUser._id}`, {
        withCredentials: true
      })
      
      const fetchedMessages = result.data || [];
      console.log('📥 Fetched', fetchedMessages.length, 'messages from database');
      
      // WhatsApp-like behavior: Check if messages for this conversation already exist
      // Use messagesRef to avoid dependency on messages state
      const currentMessages = messagesRef.current || [];
      const conversationMessages = currentMessages.filter(msg => 
        msg && msg.sender && msg.reciver && (
          (msg.sender === selectedUser._id && msg.reciver === userData?._id) ||
          (msg.sender === userData?._id && msg.reciver === selectedUser._id)
        )
      );
      
      if (conversationMessages.length === 0 && fetchedMessages.length > 0) {
        // Only add messages if this conversation hasn't been loaded yet
        console.log('💬 Loading conversation for first time, adding messages to global store');
        fetchedMessages.forEach(msg => {
          if (msg && msg._id) {
            dispatch(addMessage(msg));
          }
        });
      } else {
        console.log('💬 Conversation already loaded, messages exist in global store');
      }
      
      console.log('✅ Messages processed for global store');
    } catch (error) {
      console.error("Error fetching messages:", error)
      // Don't clear messages on error - keep existing conversations intact
    } finally {
      setFetchingMessages(false)
    }
  }, [selectedUser?._id, dispatch, userData?._id]) // Removed messages dependency  // WhatsApp-like smart scroll behavior
  const [isUserAtBottom, setIsUserAtBottom] = useState(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [hasScrolledToUnread, setHasScrolledToUnread] = useState(false);
  const messagesContainerRef = useRef(null);

  // Check if user is at bottom of chat
  const checkIfAtBottom = useCallback(() => {
    if (!messagesContainerRef.current) return false;
    
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 50; // 50px threshold for better detection
    
    setIsUserAtBottom(isAtBottom);
    setShowScrollToBottom(!isAtBottom && currentConversationMessages.length > 0);
    
    return isAtBottom;
  }, [currentConversationMessages.length]);

  // Handle scroll events
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      checkIfAtBottom();
    };

    // Use passive event listener for better scroll performance
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [checkIfAtBottom]);

  // Smart auto-scroll logic (WhatsApp behavior)
  useEffect(() => {
    if (currentConversationMessages.length === 0) return;

    const lastMessage = currentConversationMessages[currentConversationMessages.length - 1];
    const isMyMessage = lastMessage?.sender === userData?._id;
    
    // Count unread messages
    const unreadMessages = currentConversationMessages.filter(msg => 
      msg.sender === selectedUser?._id && 
      msg.reciver === userData?._id && 
      !msg.read
    );
    const unreadCount = unreadMessages.length;
    
    setUnreadMessageCount(unreadCount);

    // WhatsApp-like scroll behavior:
    // 1. Always scroll for my own messages
    // 2. Only scroll for others' messages if user is already at bottom
    // 3. If there are unread messages, scroll to first unread (only once per conversation)
    
    if (isMyMessage || isUserAtBottom) {
      // Scroll to bottom for my messages or if user is already at bottom
      setHasScrolledToUnread(false);
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ 
            behavior: "smooth",
            block: "end"
          });
        }
      }, 100);
    } else if (unreadCount > 0 && !hasScrolledToUnread) {
      // Find first unread message and scroll to it
      const firstUnreadMessage = unreadMessages[0];
      
      if (firstUnreadMessage?._id) {
        setHasScrolledToUnread(true);
        setTimeout(() => {
          const messageElement = document.querySelector(`[data-message-id="${firstUnreadMessage._id}"]`);
          if (messageElement) {
            messageElement.scrollIntoView({ 
              behavior: "smooth",
              block: "center"
            });
            console.log('📍 Scrolled to first unread message:', firstUnreadMessage._id);
          } else {
            console.warn('⚠️ Could not find unread message element:', firstUnreadMessage._id);
          }
        }, 300);
      }
    }
  }, [currentConversationMessages.length, selectedUser?._id, userData?._id, isUserAtBottom, hasScrolledToUnread]);

  // Initial scroll when switching users
  useEffect(() => {
    if (selectedUser?._id) {
      setHasScrolledToUnread(false);
      
      // Check for unread messages in the conversation
      setTimeout(() => {
        const unreadMessages = currentConversationMessages.filter(msg => 
          msg.sender === selectedUser._id && 
          msg.reciver === userData?._id && 
          !msg.read
        );
        
        if (unreadMessages.length > 0 && unreadMessages[0]?._id) {
          // Scroll to first unread message
          const firstUnreadMessage = unreadMessages[0];
          const messageElement = document.querySelector(`[data-message-id="${firstUnreadMessage._id}"]`);
          if (messageElement) {
            messageElement.scrollIntoView({ 
              behavior: "smooth",
              block: "center"
            });
            setHasScrolledToUnread(true);
            console.log('📍 Initial scroll to first unread message');
          } else {
            // Fallback to bottom if element not found
            if (messagesEndRef.current) {
              messagesEndRef.current.scrollIntoView({ 
                behavior: "instant",
                block: "end"
              });
            }
          }
        } else {
          // No unread messages, scroll to bottom
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ 
              behavior: "instant",
              block: "end"
            });
          }
        }
        setIsUserAtBottom(unreadMessages.length === 0);
        setShowScrollToBottom(false);
      }, 400);
    }
  }, [selectedUser?._id]);
  // Scroll to bottom function for the button
  const scrollToBottom = async () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: "smooth",
        block: "end"
      });
    }
    setShowScrollToBottom(false);
    setIsUserAtBottom(true);
    
    // Mark messages as read when manually scrolling to bottom
    if (unreadMessageCount > 0 && selectedUser?._id) {
      try {
        await markMessagesAsReadAPI(selectedUser._id);
        dispatch(markMessagesAsRead({ senderId: selectedUser._id }));
      } catch (error) {
        console.error('Failed to mark messages as read on scroll:', error);
        // Still update local state even if API fails
        if (selectedUser?._id) {
          dispatch(markMessagesAsRead({ senderId: selectedUser._id }));
        }
      }
    }
  };
    // Fetch messages when selectedUser changes
  useEffect(() => {
    if (selectedUser?._id) {
      console.log('👤 Selected user changed, fetching messages for:', selectedUser.name);
      fetchMessages()
    }
  }, [selectedUser?._id])  // Mark messages as read when opening a conversation
  useEffect(() => {
    const markAsReadAsync = async () => {
      if (selectedUser?._id && currentConversationMessages.length > 0 && !fetchingMessages && markAsRead) {
        // Check how many unread messages we have before marking as read
        const unreadMessages = currentConversationMessages.filter(msg => 
          msg && msg.sender === selectedUser._id && 
          msg.reciver === userData?._id && 
          !msg.read
        );
        
        if (unreadMessages.length > 0) {
          console.log(`📖 [MESSAGE AREA] Marking ${unreadMessages.length} messages as read for user:`, selectedUser._id);
          
          // Mark messages as read via API (for persistent database update)
          try {
            await markMessagesAsReadAPI(selectedUser._id);
            
            // Mark messages as read via socket (for real-time updates)
            if (markAsRead && typeof markAsRead === 'function') {
              markAsRead(selectedUser._id);
            }
            
            // Also mark messages as read in local state immediately (for instant UI update)
            dispatch(markMessagesAsRead({ senderId: selectedUser._id }));
            
            console.log(`✅ [MESSAGE AREA] Messages marked as read for user:`, selectedUser._id);
          } catch (error) {
            console.error('Failed to mark messages as read:', error);
            // Still update local state even if API/socket fails
            dispatch(markMessagesAsRead({ senderId: selectedUser._id }));
          }
        } else {
          console.log(`ℹ️ [MESSAGE AREA] No unread messages to mark for user:`, selectedUser._id);
        }
      }
    };
    
    // Debounce the mark as read to avoid too many API calls
    const timeoutId = setTimeout(markAsReadAsync, 500);
    return () => clearTimeout(timeoutId);
  }, [selectedUser?._id, currentConversationMessages.length, fetchingMessages, markAsRead, dispatch, userData?._id])
  
  // Typing indicator timer
  useEffect(() => {
    let typingTimer;
    const currentSelectedUser = selectedUserRef.current;
    const startTypingFn = startTypingRef.current;
    const stopTypingFn = stopTypingRef.current;
    
    if (message.trim() && currentSelectedUser?._id && startTypingFn) {
      startTypingFn(currentSelectedUser._id);
      
      // Set new timer to stop typing after 2 seconds of inactivity
      typingTimer = setTimeout(() => {
        if (stopTypingFn && currentSelectedUser?._id) {
          stopTypingFn(currentSelectedUser._id);
        }
      }, 2000);
    } else if (!message.trim() && currentSelectedUser?._id && stopTypingFn) {
      stopTypingFn(currentSelectedUser._id);
    }

    return () => {
      if (typingTimer) {
        clearTimeout(typingTimer);
      }
      // Stop typing when component unmounts or message clears
      if (!message.trim() && currentSelectedUser?._id && stopTypingFn) {
        stopTypingFn(currentSelectedUser._id);
      }
    };
  }, [message])
  
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!selectedUser?._id) return;
    if (
      (inputMode === 'text' && !message.trim()) ||
      (inputMode === 'code' && !message.trim()) ||
      (inputMode === 'terminal' && !message.trim())
    ) return;

    console.log(`🚀 Sending ${inputMode} message:`, { message: message.trim(), inputMode, codeLang });
    setLoading(true);
    
    // Stop typing indicator
    if (stopTypingRef.current && selectedUser?._id) {
      stopTypingRef.current(selectedUser._id);
    }

    try {
      let payload = { message: message.trim() };
      let socketPayload = { 
        recipientId: selectedUser._id,
        message: message.trim(),
        type: inputMode 
      };

      if (inputMode === 'code') {
        payload = { ...payload, code: message.trim(), codeLang };
        socketPayload = { 
          ...socketPayload, 
          code: message.trim(), 
          codeLang,
          metadata: { language: codeLang }
        };
      } else if (inputMode === 'terminal') {
        payload = { ...payload, terminal: message.trim() };
        socketPayload = { 
          ...socketPayload, 
          terminal: message.trim(),
          metadata: { command: message.trim() }
        };
      }
      
      const result = await axios.post(`${serverUrl}/api/message/send/${selectedUser._id}`, payload, { withCredentials: true });
      
      console.log('💾 HTTP response received:', result.data._id);
      
      // Simply add the HTTP response message (sender's copy)
      dispatch(addMessage(result.data));
      console.log('✅ Added HTTP message to state');
        // Send via socket for real-time delivery to other clients
      // CRITICAL: Pass database ID to socket for proper tracking
      const socketPayloadWithDbId = {
        ...socketPayload,
        dbId: result.data._id // Include database ID
      };
      const messageId = sendSocketMessage(socketPayloadWithDbId);
      
      setMessage("");
      
      // Auto-scroll to bottom after sending message
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
      
      console.log('✅ [SENT] Message via HTTP+Socket:', {
        httpId: result.data._id,
        socketId: messageId
      });
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  }
  
  // Early return if userData is not available
  if (!userData) {
    return (
      <div className='flex-1 flex flex-col h-full bg-gradient-to-br from-pastel-cream via-pastel-lavender to-pastel-peach dark:from-[#181c2f] dark:via-[#2d1e60] dark:to-[#23234a] items-center justify-center'>
        <LoadingSpinner size="lg" />
        <p className="text-pastel-muted dark:text-[#b3b3ff] font-mono mt-4">Loading user data...</p>
      </div>
    )
  }

  const languageOptions = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'c', label: 'C' },
    { value: 'cpp', label: 'C++' },
    { value: 'go', label: 'Go' },
    { value: 'bash', label: 'Bash' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'php', label: 'PHP' },
    { value: 'ruby', label: 'Ruby' },
    { value: 'rust', label: 'Rust' },
    { value: 'kotlin', label: 'Kotlin' },
    { value: 'swift', label: 'Swift' },
  ];

  if (isMobile && !selectedUser) {
    // On mobile, if no user selected, hide chat area (sidebar will be visible)
    return null;
  }
  
  return (
    <div className={`flex-1 flex flex-col h-full relative overflow-hidden bg-gradient-to-br from-pastel-cream via-pastel-lavender to-pastel-peach dark:from-[#181c2f] dark:via-[#23234a] dark:to-[#181c2f]`}>
      {/* Animated background effects */}
      <div className="absolute inset-0 pointer-events-none z-0 opacity-10">
        <div className="grid grid-cols-20 gap-1 h-full">
          {Array.from({ length: 400 }, (_, i) => (
            <div 
              key={i} 
              className="bg-gradient-to-br from-pastel-rose via-pastel-mint to-pastel-sunny dark:from-[#39ff14] dark:via-[#ffe156] dark:to-[#ff6f3c] rounded animate-pulse" 
              style={{ 
                animationDelay: `${i * 0.05}s`,
                animationDuration: `${3 + Math.random() * 4}s`
              }}
            ></div>
          ))}
        </div>
      </div>
      
      {/* Ambient glow effects */}
      <div className="absolute top-20 right-20 w-32 h-32 bg-pastel-rose/10 dark:bg-[#39ff14]/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 left-20 w-40 h-40 bg-pastel-coral/10 dark:bg-[#ff6f3c]/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-pastel-sunny/10 dark:bg-[#ffe156]/10 rounded-full blur-3xl animate-pulse transform -translate-x-1/2 -translate-y-1/2"></div>

      <div className="relative z-10 flex-1 flex flex-col h-full w-full max-w-full">
        {selectedUser ? (
          <>
            {/* Terminal-style Header */}            <div className='w-full bg-gradient-to-r from-pastel-cream via-pastel-lavender to-pastel-peach dark:from-[#23234a] dark:via-[#2d1e60] dark:to-[#23234a] border-b border-pastel-rose dark:border-[#39ff14]/30 shadow-lg'>
              <div className="flex items-center justify-between p-2 sm:p-4 gap-2 w-full">
                <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                  <button 
                    className='p-2 hover:bg-pastel-peach dark:hover:bg-[#39ff14]/20 rounded-lg transition-all duration-200 group flex-shrink-0' 
                    onClick={() => dispatch(setSelectedUser(null))}
                  >
                    <IoArrowBack className='w-6 h-6 text-pastel-rose dark:text-[#39ff14] group-hover:text-pastel-plum dark:group-hover:text-white transition-colors' />
                  </button>
                  <div className='relative'>                    <img 
                      src={selectedUser?.image || dp} 
                      alt="Profile" 
                      className='w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover border-2 border-pastel-rose dark:border-[#39ff14] shadow-lg cursor-pointer hover:scale-105 transition-transform' 
                      onContextMenu={(e) => e.preventDefault()} // Prevent right-click download
                    />
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 dark:bg-[#39ff14] rounded-full border-2 border-white dark:border-[#23234a] animate-pulse"></div>
                  </div>                  <div className="flex-1 min-w-0 mr-2">
                    <h1 className='text-pastel-plum dark:text-white font-bold text-lg sm:text-xl font-mono truncate'>
                      {selectedUser?.name || selectedUser?.userName || "Anonymous"}
                    </h1>
                    <p className='text-pastel-rose dark:text-[#39ff14] text-xs sm:text-sm font-mono truncate'>@{selectedUser?.github || selectedUser?.userName}</p>
                  </div>
                </div>
                {/* Terminal window controls - only show on desktop */}
                {!isMobile && (
                  <div className="flex items-center gap-2">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-pastel-mint dark:bg-[#39ff14] rounded-full animate-pulse"></div>
                    </div>
                    <div className="ml-2 sm:ml-4 text-pastel-purple dark:text-[#b3b3ff] font-mono text-xs sm:text-sm">
                      <FiTerminal className="w-5 h-5" />
                    </div>
                  </div>
                )}
              </div>
              {/* Terminal prompt bar - only show on desktop */}
              {!isMobile && (
                <div className="px-2 sm:px-4 pb-2 sm:pb-3">
                  <div className="bg-pastel-lavender dark:bg-[#181c2f] rounded-lg p-2 border border-pastel-rose dark:border-[#39ff14]/20">
                    <span className="text-pastel-rose dark:text-[#39ff14] font-mono text-xs sm:text-sm">
                      developer@alphachat:~$ chat --with {selectedUser?.userName || 'user'} --secure
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Live Status Bar */}
            <div className="w-full flex flex-wrap items-center justify-between px-2 sm:px-4 py-2 bg-gradient-to-r from-pastel-lavender to-pastel-peach dark:from-[#23234a] dark:to-[#181c2f] border-b border-pastel-rose dark:border-[#39ff14]/20 sticky top-0 z-20 gap-2 sm:gap-0 text-xs sm:text-sm shadow-sm">
              {/* Live/Offline status */}
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${onlineUsers?.includes(selectedUser?._id) ? 'bg-pastel-mint dark:bg-[#39ff14] animate-pulse' : 'bg-pastel-muted'}`}></span>
                <span className={`font-mono ${onlineUsers?.includes(selectedUser?._id) ? 'text-pastel-sage dark:text-[#39ff14]' : 'text-pastel-muted dark:text-gray-400'}`}>
                  {onlineUsers?.includes(selectedUser?._id) ? 'Live' : 'Offline'}
                </span>
              </div>
              {/* Connection status */}
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 dark:bg-[#39ff14]' : 'bg-red-500'}`}></span>
                <span className="font-mono text-pastel-muted dark:text-[#b3b3ff]">
                  {isConnected ? 'Connected' : 'Reconnecting...'}
                </span>
              </div>
                {/* Typing Indicator - Fixed for mobile stability */}
              <div className={`flex items-center gap-2 transition-opacity duration-200 ${typingUsers?.includes(selectedUser?._id) ? 'opacity-100' : 'opacity-0'}`} style={{minHeight: isMobile ? '20px' : '16px'}}>
                {typingUsers?.includes(selectedUser?._id) && (
                  <>
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-pastel-rose dark:bg-[#39ff14] rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-pastel-rose dark:bg-[#39ff14] rounded-full animate-pulse" style={{animationDelay: '0.3s'}}></div>
                      <div className="w-2 h-2 bg-pastel-rose dark:bg-[#39ff14] rounded-full animate-pulse" style={{animationDelay: '0.6s'}}></div>
                    </div>
                    <span className="text-pastel-muted dark:text-[#b3b3ff] font-mono text-xs">
                      {selectedUser?.userName} is typing...
                    </span>
                  </>
                )}
              </div>
              
              {/* Last seen */}
              <div className="flex items-center gap-2">
                <span className="font-mono text-pastel-muted dark:text-[#b3b3ff]">Last seen:</span>
                <span className="font-mono text-pastel-sage dark:text-[#39ff14]">
                  {onlineUsers?.includes(selectedUser?._id) ? 'Now' : formatLastSeen(selectedUser?.lastSeen)}
                </span>
              </div>
            </div>              {/* Messages Area */}
            <div 
              ref={messagesContainerRef}
              className={`flex-1 overflow-y-auto p-2 sm:p-6 relative`} 
              style={{
                paddingBottom: isMobile ? (inputFocused ? '300px' : '340px') : '320px',
                scrollBehavior: 'smooth',
                minHeight: '400px'
              }}
            >
              {/* Scroll to Bottom Button */}
              {showScrollToBottom && (
                <button
                  onClick={scrollToBottom}
                  className="fixed bottom-24 right-8 z-30 bg-pastel-rose dark:bg-[#39ff14] text-white dark:text-[#181c2f] rounded-full p-3 shadow-lg hover:scale-110 transition-all duration-200 flex items-center gap-2"
                  aria-label="Scroll to bottom"
                >
                  <FiChevronDown className="w-5 h-5" />
                  {unreadMessageCount > 0 && (
                    <span className="bg-white dark:bg-[#181c2f] text-pastel-rose dark:text-[#39ff14] text-xs font-bold px-2 py-0.5 rounded-full">
                      {unreadMessageCount}
                    </span>
                  )}
                </button>
              )}
              {fetchingMessages ? (
                <div className='flex items-center justify-center h-full'>
                  <div className="bg-pastel-cream dark:bg-[#23234a] rounded-xl p-8 border border-pastel-rose dark:border-[#39ff14]/30 shadow-lg">
                    <LoadingSpinner size="lg" />
                    <p className="text-pastel-muted dark:text-[#39ff14] font-mono mt-4 text-center">Loading chat history...</p>
                  </div>
                </div>
              ) : currentConversationMessages.length === 0 ? (
                <div className='flex items-center justify-center h-full'>
                  <div className="text-center">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-pastel-cream dark:bg-[#23234a] rounded-full flex items-center justify-center mb-6 mx-auto border-2 border-pastel-rose dark:border-[#39ff14]/30 shadow-lg">
                      <FiCode className="w-8 h-8 sm:w-10 sm:h-10 text-pastel-rose dark:text-[#39ff14]" />
                    </div>
                    <h3 className='text-pastel-plum dark:text-white font-bold text-lg sm:text-xl font-mono mb-2'>Start Coding Together</h3>
                    <p className='text-pastel-muted dark:text-[#b3b3ff] font-mono text-sm sm:text-base'>Send your first message to begin collaboration</p>
                    <div className="mt-6 text-pastel-rose dark:text-[#39ff14] font-mono text-xs sm:text-sm opacity-60">// No messages in buffer</div>
                  </div>
                </div>              ) : (
                currentConversationMessages.filter(msg => msg && msg._id).map((msg, index) => {
                  const isUnread = msg.sender === selectedUser?._id && msg.reciver === userData?._id && !msg.read;
                  
                  return (
                  <div 
                    key={msg._id || index} 
                    data-message-id={msg._id}
                    className={`flex ${msg.sender === userData._id ? 'justify-end' : 'justify-start'} mb-4 sm:mb-6 scroll-mt-24`}
                  >
                    {isUnread && msg.sender !== userData._id && (
                      <div className="absolute left-0 right-0 flex items-center gap-2 mb-2">
                        <div className="flex-1 h-px bg-pastel-coral dark:bg-[#ff6f3c]"></div>
                        <span className="bg-pastel-coral dark:bg-[#ff6f3c] text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                          New Messages
                        </span>
                        <div className="flex-1 h-px bg-pastel-coral dark:bg-[#ff6f3c]"></div>
                      </div>
                    )}
                    <div className={`max-w-[90vw] sm:max-w-[75%] ${msg.sender === userData._id ? 'order-2' : 'order-1'}`}>
                      <div className={`p-3 sm:p-4 rounded-2xl font-mono relative ${msg.sender === userData._id ? 'bg-gradient-to-r from-pastel-rose to-pastel-coral dark:from-[#39ff14] dark:to-[#2dd60a] text-white dark:text-[#181c2f] shadow-lg shadow-pastel-rose/30 dark:shadow-[#39ff14]/20' : 'bg-pastel-cream dark:bg-[#23234a] text-pastel-plum dark:text-white border border-pastel-border dark:border-[#39ff14]/20 shadow-lg'} ${msg.sender === userData._id ? 'rounded-br-md' : 'rounded-bl-md'} ${isUnread ? 'ring-2 ring-pastel-coral dark:ring-[#ff6f3c] ring-opacity-70' : ''}`}>
                        {/* Message content */}                        {msg.image && (
                          <img src={msg.image} alt="attachment" className='max-w-full rounded-lg mb-3 border border-[#39ff14]/30' onContextMenu={(e) => e.preventDefault()} />
                        )}
                        
                        {/* Message type header */}
                        {(msg.messageType === 'code' || msg.messageType === 'terminal' || msg.type === 'code' || msg.type === 'terminal') && (
                          <div className={`flex items-center gap-2 mb-2 pb-2 border-b ${msg.sender === userData._id ? 'border-white/20 dark:border-[#181c2f]/20' : 'border-pastel-border dark:border-[#39ff14]/20'}`}>
                            {(msg.messageType === 'code' || msg.type === 'code') ? (
                              <>
                                <FiCode className="w-4 h-4" />
                                <span className="font-mono text-xs opacity-70">{msg.metadata?.language || 'code'}</span>
                              </>
                            ) : (
                              <>
                                <FiTerminal className="w-4 h-4" />
                                <span className="font-mono text-xs opacity-70">terminal</span>
                              </>
                            )}
                          </div>
                        )}
                        
                        {/* Code syntax highlighting */}
                        {(msg.messageType === 'code' || msg.type === 'code') && msg.message ? (
                          <div className="rounded-lg overflow-x-auto border border-pastel-border dark:border-[#39ff14]/20">
                            <SyntaxHighlighter
                              language={msg.metadata?.language || 'javascript'}
                              style={theme === 'dark' ? atomDark : prism}
                              customStyle={{
                                margin: 0,
                                background: msg.sender === userData._id ? (theme === 'dark' ? '#0f1419' : '#f8f9fa') : (theme === 'dark' ? '#1a1a2e' : '#ffffff'),
                                fontSize: '13px',
                                minWidth: '200px',
                                maxWidth: '80vw',
                                overflowX: 'auto',
                              }}
                            >
                              {msg.message}
                            </SyntaxHighlighter>
                          </div>
                        ) : (msg.messageType === 'terminal' || msg.type === 'terminal') && msg.message ? (
                          <div className="bg-black rounded-lg p-3 border border-pastel-border dark:border-[#39ff14]/20 overflow-x-auto">
                            <div className="text-pastel-sage dark:text-[#39ff14] font-mono text-sm">
                              <span className="text-pastel-muted">$ </span>
                              {msg.message}
                            </div>
                          </div>
                        ) : msg.message && (
                          <p className={`leading-relaxed whitespace-pre-wrap break-words ${
                            msg.message.length < 50 
                              ? 'text-sm sm:text-base min-h-[1.5rem] py-1' 
                              : 'text-sm leading-relaxed'
                          }`}>
                            {msg.message}
                          </p>
                        )}
                        
                        {/* Timestamp and status */}
                        <div className={`flex items-center justify-end gap-2 mt-2 pt-2 border-t ${msg.sender === userData._id ? 'border-white/20 dark:border-[#181c2f]/20' : 'border-pastel-border dark:border-[#39ff14]/20'}`}>
                          <p className={`text-xs font-mono ${msg.sender === userData._id ? 'text-white/70 dark:text-[#181c2f]/70' : 'text-pastel-muted dark:text-[#b3b3ff]'}`}>
                            {new Date(msg.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          {msg.sender === userData._id && (
                            <div className="flex items-center" title={msg.read ? 'Read' : msg.delivered ? 'Delivered' : 'Sent'}>
                              {msg.read ? (
                                <IoCheckmarkDone className={`w-4 h-4 ${msg.sender === userData._id ? 'text-blue-400 dark:text-blue-300' : 'text-pastel-muted'}`} />
                              ) : msg.delivered ? (
                                <IoCheckmarkDone className={`w-4 h-4 ${msg.sender === userData._id ? 'text-white/70 dark:text-[#181c2f]/70' : 'text-pastel-muted'}`} />
                              ) : (
                                <IoCheckmark className={`w-4 h-4 ${msg.sender === userData._id ? 'text-white/70 dark:text-[#181c2f]/70' : 'text-pastel-muted'}`} />
                              )}
                            </div>
                          )}
                        </div>
                        
                        {/* Message type indicator */}
                        <div className={`absolute -bottom-1 ${msg.sender === userData._id ? '-right-1' : '-left-1'} w-3 h-3 transform rotate-45 ${msg.sender === userData._id ? 'bg-pastel-coral dark:bg-[#39ff14]' : 'bg-pastel-cream dark:bg-[#23234a] border-r border-b border-pastel-border dark:border-[#39ff14]/20'}`}></div>
                      </div>
                    </div>                  </div>
                );
                })
              )}
              
              {/* Scroll anchor with proper spacing */}
              <div className="h-16 sm:h-20"></div>
              <div ref={messagesEndRef} className="h-8"></div>
              
              {/* WhatsApp-like scroll to bottom button with unread count */}
              {showScrollToBottom && (
                <div className={`absolute ${isMobile ? 'bottom-40' : 'bottom-36'} right-4 z-10`}>                  <button
                    onClick={scrollToBottom}
                    className="scroll-to-bottom bg-pastel-rose dark:bg-[#39ff14] text-white dark:text-[#181c2f] rounded-full p-3 shadow-lg hover:scale-110 transition-all duration-200 flex items-center gap-2"
                  >
                    <FiChevronDown className="w-5 h-5" />
                    {unreadMessageCount > 0 && (
                      <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center">
                        {unreadMessageCount}
                      </span>
                    )}
                  </button>
                </div>
              )}
              
              {/* Unread messages indicator */}
              {unreadMessageCount > 0 && !showScrollToBottom && (
                <div className={`absolute ${isMobile ? 'bottom-40' : 'bottom-36'} left-1/2 transform -translate-x-1/2 z-10`}>
                  <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-mono shadow-lg">
                    {unreadMessageCount} unread message{unreadMessageCount > 1 ? 's' : ''}
                  </div>
                </div>
              )}
            </div>
            
            {/* Terminal-style Message Input */}
            <div className={`${isMobile ? 'fixed bottom-0 left-0 right-0 bg-pastel-cream dark:bg-[#181c2f] border-t border-pastel-rose dark:border-[#39ff14]/30 shadow-2xl z-50' : 'absolute bottom-2 left-2 right-2 sm:bottom-4 sm:left-4 sm:right-4'}`} ref={inputRef}>
              <div className={`${isMobile ? '' : 'bg-pastel-cream dark:bg-[#181c2f] rounded-xl border border-pastel-rose dark:border-[#39ff14]/30 shadow-2xl'} overflow-hidden`}>
                {/* Terminal header - only show on desktop */}
                {!isMobile && (
                  <div className="bg-gradient-to-r from-pastel-lavender to-pastel-peach dark:from-[#23234a] dark:to-[#181c2f] px-2 sm:px-4 py-2 border-b border-pastel-rose dark:border-[#39ff14]/20 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0">
                    <div className="flex items-center gap-2">
                      <FiTerminal className="w-4 h-4 text-pastel-rose dark:text-[#39ff14]" />
                      <span className="text-pastel-purple dark:text-[#b3b3ff] font-mono text-xs sm:text-sm">Message Terminal</span>
                      <span className="text-pastel-rose dark:text-[#39ff14] font-mono text-xs">[Mode: {inputMode.toUpperCase()}]</span>
                      {inputMode === 'code' && (
                        <span className="text-pastel-muted dark:text-[#b3b3ff] font-mono text-xs">[{codeLang}]</span>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Mobile mode selector */}
                {isMobile && (
                  <div className="bg-gradient-to-r from-pastel-lavender to-pastel-peach dark:from-[#23234a] dark:to-[#181c2f] px-3 py-2 border-b border-pastel-rose dark:border-[#39ff14]/20">
                    <div className="flex gap-2 justify-center">                      <button
                        type="button"
                        className={`px-3 py-1.5 rounded font-mono text-xs transition-all duration-200 hover:scale-105 cursor-pointer select-none min-h-[44px] touch-manipulation active:scale-95 ${inputMode === 'text' 
                            ? 'bg-gradient-to-r from-pastel-rose to-pastel-coral dark:from-[#39ff14] dark:to-[#2dd60a] text-white dark:text-[#181c2f] shadow-lg shadow-pastel-rose/30 dark:shadow-[#39ff14]/30'
                            : 'bg-pastel-cream dark:bg-[#23234a] text-pastel-purple dark:text-[#b3b3ff] border border-pastel-rose dark:border-[#39ff14]/30 hover:bg-pastel-peach dark:hover:bg-[#39ff14]/10 hover:border-pastel-coral dark:hover:border-[#39ff14]/50'
                        }`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setInputMode('text');
                        }}
                        onMouseDown={(e) => e.preventDefault()}
                        aria-label="Switch to text mode"
                      >
                        💬
                      </button><button
                        type="button"
                        className={`px-3 py-1.5 rounded font-mono text-xs transition-all duration-200 hover:scale-105 cursor-pointer select-none min-h-[44px] touch-manipulation active:scale-95 ${inputMode === 'code' 
                            ? 'bg-gradient-to-r from-pastel-mint to-pastel-sage dark:from-[#39ff14] dark:to-[#2dd60a] text-white dark:text-[#181c2f] shadow-lg shadow-pastel-mint/30 dark:shadow-[#39ff14]/30'
                            : 'bg-pastel-cream dark:bg-[#23234a] text-pastel-purple dark:text-[#b3b3ff] border border-pastel-mint dark:border-[#39ff14]/30 hover:bg-pastel-peach dark:hover:bg-[#39ff14]/10 hover:border-pastel-sage dark:hover:border-[#39ff14]/50'
                        }`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setInputMode('code');
                        }}
                        onMouseDown={(e) => e.preventDefault()}
                        aria-label="Switch to code mode"
                      >
                        💻
                      </button>                      <button
                        type="button"
                        className={`px-3 py-1.5 rounded font-mono text-xs transition-all duration-200 hover:scale-105 cursor-pointer select-none min-h-[44px] touch-manipulation active:scale-95 ${inputMode === 'terminal' 
                            ? 'bg-gradient-to-r from-pastel-sunny to-pastel-coral dark:from-[#39ff14] dark:to-[#2dd60a] text-white dark:text-[#181c2f] shadow-lg shadow-pastel-sunny/30 dark:shadow-[#39ff14]/30'
                            : 'bg-pastel-cream dark:bg-[#23234a] text-pastel-purple dark:text-[#b3b3ff] border border-pastel-sunny dark:border-[#39ff14]/30 hover:bg-pastel-peach dark:hover:bg-[#39ff14]/10 hover:border-pastel-coral dark:hover:border-[#39ff14]/50'
                        }`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setInputMode('terminal');
                        }}
                        onMouseDown={(e) => e.preventDefault()}
                        aria-label="Switch to terminal mode"
                      >
                        ⚡
                      </button>
                      {(inputMode === 'code' || inputMode === 'terminal') && (
                        <button
                          type="button"
                          className={`px-3 py-1.5 rounded font-mono text-xs transition-all duration-200 hover:scale-105 cursor-pointer select-none min-h-[44px] touch-manipulation active:scale-95 ${showTemplates 
                              ? 'bg-gradient-to-r from-pastel-purple to-pastel-plum dark:from-[#6a5acd] dark:to-[#483d8b] text-white shadow-lg shadow-pastel-purple/30'
                              : 'bg-pastel-cream dark:bg-[#23234a] text-pastel-purple dark:text-[#b3b3ff] border border-pastel-purple dark:border-[#6a5acd]/30 hover:bg-pastel-peach dark:hover:bg-[#6a5acd]/10 hover:border-pastel-plum dark:hover:border-[#6a5acd]/50'
                          }`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowTemplates(!showTemplates);
                          }}
                          onMouseDown={(e) => e.preventDefault()}
                          aria-label="Toggle templates"
                        >
                          📋
                        </button>
                      )}
                      {inputMode === 'code' && (
                        <select
                          className="ml-2 px-2 py-1.5 rounded font-mono text-xs bg-pastel-lavender dark:bg-[#23234a] text-pastel-plum dark:text-[#39ff14] border border-pastel-rose dark:border-[#39ff14]/30 hover:bg-pastel-peach dark:hover:bg-[#39ff14]/10 transition-colors duration-200"
                          value={codeLang}
                          onChange={e => {
                            console.log('🔧 Language changed to:', e.target.value);
                            setCodeLang(e.target.value);
                          }}
                        >
                          {languageOptions.map(lang => (
                            <option key={lang.value} value={lang.value} className="bg-pastel-lavender dark:bg-[#23234a] text-pastel-plum dark:text-[#39ff14]">
                              {lang.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>                )}
                
                {/* Code Templates - Show when code mode is active */}
                {inputMode === 'code' && showTemplates && (
                  <div className="border-t border-pastel-rose dark:border-[#39ff14]/20 bg-pastel-lavender dark:bg-[#0d1117] p-2 sm:p-3">
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span className="text-pastel-purple dark:text-[#b3b3ff] font-mono text-xs">Quick Templates:</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {Object.entries(messageUtils.codeTemplates[codeLang] || messageUtils.codeTemplates.javascript).map(([key, template]) => (
                        <button
                          key={key}
                          type="button"
                          className="p-2 text-left text-xs font-mono bg-pastel-cream dark:bg-[#23234a] text-pastel-plum dark:text-[#39ff14] border border-pastel-rose dark:border-[#39ff14]/30 rounded hover:bg-pastel-peach dark:hover:bg-[#39ff14]/10 transition-colors min-h-[44px] touch-manipulation active:scale-95"
                          onClick={() => {
                            setMessage(template);
                            setShowTemplates(false);
                          }}
                        >
                          {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Terminal Templates - Show when terminal mode is active */}
                {inputMode === 'terminal' && showTemplates && (
                  <div className="border-t border-pastel-rose dark:border-[#39ff14]/20 bg-pastel-lavender dark:bg-[#0d1117] p-2 sm:p-3">
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span className="text-pastel-purple dark:text-[#b3b3ff] font-mono text-xs">Quick Commands:</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                      {Object.entries(messageUtils.terminalTemplates).map(([category, commands]) => (
                        <div key={category} className="mb-2">
                          <div className="text-pastel-rose dark:text-[#39ff14] font-mono text-xs mb-1 capitalize">{category}:</div>
                          <div className="flex flex-wrap gap-1">
                            {commands.slice(0, 3).map((command, idx) => (
                              <button
                                key={idx}
                                type="button"
                                className="px-2 py-1 text-xs font-mono bg-pastel-cream dark:bg-[#23234a] text-pastel-plum dark:text-[#39ff14] border border-pastel-rose dark:border-[#39ff14]/30 rounded hover:bg-pastel-peach dark:hover:bg-[#39ff14]/10 transition-colors min-h-[32px] touch-manipulation active:scale-95"
                                onClick={() => {
                                  setMessage(command);
                                  setShowTemplates(false);
                                }}
                              >
                                {command.split(' ')[0]}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Input form */}
                <form className={`${isMobile ? 'p-3' : 'p-2 sm:p-4'}`} onSubmit={handleSendMessage}>
                  <div className={`flex items-center gap-2 ${isMobile ? 'items-end' : 'sm:items-center'} w-full`}>
                    {!isMobile && (
                      <span className="text-pastel-rose dark:text-[#39ff14] font-mono text-xs sm:text-sm flex-shrink-0">
                        {userData?.userName || 'user'}@alphachat:~$
                      </span>
                    )}
                    <div className="flex-1 flex flex-col gap-2">
                      {isMobile && inputMode !== 'text' && (
                        <div className="flex gap-1 px-2">
                          <span className="text-pastel-rose dark:text-[#39ff14] font-mono text-xs">[{inputMode.toUpperCase()}]</span>
                          {inputMode === 'code' && (
                            <span className="text-pastel-muted dark:text-[#b3b3ff] font-mono text-xs">[{codeLang}]</span>
                          )}
                        </div>
                      )}
                      {inputMode === 'code' ? (
                        <textarea
                          ref={inputFocused ? inputRef : null}
                          rows={isMobile ? 2 : 3}
                          placeholder={`Write your ${codeLang} code here...\n// Example:\nfunction hello() {\n  console.log("Hello World!");\n}`}
                          className={`bg-pastel-cream dark:bg-[#0d1117] text-pastel-plum dark:text-[#39ff14] placeholder-pastel-muted dark:placeholder-[#b3b3ff]/50 outline-none font-mono text-xs sm:text-sm p-2 sm:p-3 border-2 border-pastel-rose dark:border-[#39ff14]/30 rounded-lg resize-y ${isMobile ? 'min-h-[40px] max-h-[120px]' : 'min-h-[60px] max-h-[200px]'} focus:border-pastel-coral dark:focus:border-[#39ff14] focus:shadow-lg focus:shadow-pastel-rose/20 dark:focus:shadow-[#39ff14]/20 transition-all duration-200`}
                          value={message}
                          onChange={e => setMessage(e.target.value)}
                          onFocus={() => setInputFocused(true)}
                          onBlur={() => setInputFocused(false)}
                          disabled={loading}
                        />
                      ) : inputMode === 'terminal' ? (
                        <input
                          ref={inputFocused ? inputRef : null}
                          type="text"
                          placeholder="$ npm install react-syntax-highlighter"
                          className={`bg-pastel-muted dark:bg-[#000000] text-pastel-mint dark:text-[#39ff14] placeholder-pastel-muted dark:placeholder-[#666] outline-none font-mono text-xs sm:text-sm ${isMobile ? 'py-3 px-3' : 'py-2 sm:py-3 px-2 sm:px-3'} border-2 border-pastel-rose dark:border-[#39ff14]/30 rounded-lg focus:border-pastel-coral dark:focus:border-[#39ff14] focus:shadow-lg focus:shadow-pastel-rose/20 dark:focus:shadow-[#39ff14]/20 transition-all duration-200`}
                          value={message}
                          onChange={e => setMessage(e.target.value)}
                          onFocus={() => setInputFocused(true)}
                          onBlur={() => setInputFocused(false)}
                          disabled={loading}
                        />
                      ) : (
                        <input
                          ref={inputFocused ? inputRef : null}
                          type="text"
                          placeholder="Type a message..."
                          className={`bg-transparent text-pastel-plum dark:text-white placeholder-pastel-muted dark:placeholder-[#b3b3ff]/50 outline-none font-mono text-xs sm:text-sm ${isMobile ? 'py-3 px-3 border-2 border-pastel-rose dark:border-[#39ff14]/30 rounded-lg' : 'py-2 sm:py-3 px-2 border-b-2 border-pastel-rose dark:border-[#39ff14]/20'} focus:border-pastel-coral dark:focus:border-[#39ff14] transition-all duration-200`}
                          value={message}
                          onChange={e => setMessage(e.target.value)}
                          onFocus={() => setInputFocused(true)}
                          onBlur={() => setInputFocused(false)}
                          disabled={loading}
                        />
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={!message.trim() || loading}
                      className={`${isMobile ? 'w-12 h-12 rounded-full flex items-center justify-center' : 'px-3 sm:px-4 py-2 rounded-lg flex items-center gap-2'} bg-gradient-to-r from-pastel-rose to-pastel-coral dark:from-[#39ff14] dark:to-[#2dd60a] text-white dark:text-[#181c2f] font-mono font-bold text-xs sm:text-sm hover:shadow-lg hover:shadow-pastel-rose/30 dark:hover:shadow-[#39ff14]/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0`}
                    >
                      {loading ? (
                        <div className="w-4 h-4 border-2 border-white/30 dark:border-[#181c2f]/30 border-t-white dark:border-t-[#181c2f] rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <IoSend className="w-4 h-4" />
                          {!isMobile && <span>Send</span>}
                        </>
                      )}
                    </button>
                  </div>
                  {!isMobile && (
                    <div className="flex gap-2 mt-2 justify-center">                      <button
                        type="button"
                        className={`px-3 py-1.5 rounded font-mono text-xs transition-all duration-200 hover:scale-105 cursor-pointer select-none min-h-[44px] touch-manipulation active:scale-95 ${inputMode === 'text' 
                            ? 'bg-gradient-to-r from-pastel-rose to-pastel-coral dark:from-[#39ff14] dark:to-[#2dd60a] text-white dark:text-[#181c2f] shadow-lg shadow-pastel-rose/30 dark:shadow-[#39ff14]/30'
                            : 'bg-pastel-cream dark:bg-[#23234a] text-pastel-purple dark:text-[#b3b3ff] border border-pastel-rose dark:border-[#39ff14]/30 hover:bg-pastel-peach dark:hover:bg-[#39ff14]/10 hover:border-pastel-coral dark:hover:border-[#39ff14]/50'
                        }`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setInputMode('text');
                        }}
                        onMouseDown={(e) => e.preventDefault()}
                        aria-label="Switch to text mode"
                      >
                        💬 Text
                      </button>                      <button
                        type="button"
                        className={`px-3 py-1.5 rounded font-mono text-xs transition-all duration-200 hover:scale-105 cursor-pointer select-none min-h-[44px] touch-manipulation active:scale-95 ${inputMode === 'code' 
                            ? 'bg-gradient-to-r from-pastel-mint to-pastel-sage dark:from-[#39ff14] dark:to-[#2dd60a] text-white dark:text-[#181c2f] shadow-lg shadow-pastel-mint/30 dark:shadow-[#39ff14]/30'
                            : 'bg-pastel-cream dark:bg-[#23234a] text-pastel-purple dark:text-[#b3b3ff] border border-pastel-mint dark:border-[#39ff14]/30 hover:bg-pastel-peach dark:hover:bg-[#39ff14]/10 hover:border-pastel-sage dark:hover:border-[#39ff14]/50'
                        }`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setInputMode('code');
                        }}
                        onMouseDown={(e) => e.preventDefault()}
                        aria-label="Switch to code mode"
                      >
                        💻 Code
                      </button>                      <button
                        type="button"
                        className={`px-3 py-1.5 rounded font-mono text-xs transition-all duration-200 hover:scale-105 cursor-pointer select-none min-h-[44px] touch-manipulation active:scale-95 ${inputMode === 'terminal' 
                            ? 'bg-gradient-to-r from-pastel-sunny to-pastel-coral dark:from-[#39ff14] dark:to-[#2dd60a] text-white dark:text-[#181c2f] shadow-lg shadow-pastel-sunny/30 dark:shadow-[#39ff14]/30'
                            : 'bg-pastel-cream dark:bg-[#23234a] text-pastel-purple dark:text-[#b3b3ff] border border-pastel-sunny dark:border-[#39ff14]/30 hover:bg-pastel-peach dark:hover:bg-[#39ff14]/10 hover:border-pastel-coral dark:hover:border-[#39ff14]/50'
                        }`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setInputMode('terminal');
                        }}
                        onMouseDown={(e) => e.preventDefault()}
                        aria-label="Switch to terminal mode"
                      >
                        ⚡ Terminal
                      </button>
                      {inputMode === 'code' && (
                        <select
                          className="ml-2 px-3 py-1.5 rounded font-mono text-xs bg-pastel-lavender dark:bg-[#23234a] text-pastel-plum dark:text-[#39ff14] border border-pastel-rose dark:border-[#39ff14]/30 hover:bg-pastel-peach dark:hover:bg-[#39ff14]/10 transition-colors duration-200"
                          value={codeLang}
                          onChange={e => {
                            console.log('🔧 Language changed to:', e.target.value);
                            setCodeLang(e.target.value);
                          }}
                        >
                          {languageOptions.map(lang => (
                            <option key={lang.value} value={lang.value} className="bg-pastel-lavender dark:bg-[#23234a] text-pastel-plum dark:text-[#39ff14]">
                              {lang.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                </form>
              </div>
            </div>
          </>
        ) : (
          /* Welcome Screen */
          <div className='w-full h-full flex flex-col items-center justify-center gap-6 sm:gap-8 p-4 sm:p-8'>
            <div className="text-center">
              <div className="w-24 h-24 sm:w-32 sm:h-32 bg-pastel-cream dark:bg-[#23234a] rounded-full flex items-center justify-center mb-6 sm:mb-8 mx-auto border-4 border-pastel-rose dark:border-[#39ff14]/30 shadow-2xl">
                <FiMonitor className="w-12 h-12 sm:w-16 sm:h-16 text-pastel-rose dark:text-[#39ff14]" />
              </div>
              <h1 className='text-pastel-plum dark:text-white font-bold text-3xl sm:text-5xl font-mono mb-2 sm:mb-4'>
                Welcome to <span className="text-pastel-rose dark:text-[#39ff14]">Alpha</span>Chat
              </h1>
              <p className='text-pastel-purple dark:text-[#b3b3ff] font-mono text-lg sm:text-xl mb-4 sm:mb-6'>
                Elite Developer Communication Terminal
              </p>
              <div className="bg-pastel-lavender dark:bg-[#181c2f] rounded-xl p-4 sm:p-6 border border-pastel-rose dark:border-[#39ff14]/20 max-w-xs sm:max-w-md mx-auto shadow-lg">
                <div className="text-pastel-rose dark:text-[#39ff14] font-mono text-xs sm:text-sm space-y-2">
                  <p>// System Status: <span className="text-pastel-plum dark:text-white">Online</span></p>
                  <p>// Connected Developers: <span className="text-pastel-plum dark:text-white">Ready</span></p>
                  <p>// Security: <span className="text-pastel-plum dark:text-white">End-to-End Encrypted</span></p>
                </div>
              </div>
              <p className='text-pastel-purple dark:text-[#b3b3ff] font-mono text-base sm:text-lg mt-6 sm:mt-8'>
                Select a developer from the sidebar to start coding together
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default MessageArea
