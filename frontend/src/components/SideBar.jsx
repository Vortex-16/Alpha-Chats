import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import dp from '../assets/pp.webp'
import { MdOutlinePersonSearch } from "react-icons/md";
import { GiCrossMark } from "react-icons/gi";
import { BiLogOut } from "react-icons/bi";
import { FiSettings, FiMessageCircle, FiHash, FiUsers, FiWifi, FiWifiOff, FiRefreshCw } from "react-icons/fi";
import axios from 'axios';
import { serverUrl } from '../config/constants';
import { setSelectedUser, setOtherUsers, setUserData } from '../redux/userSlice';
import { useNavigate } from 'react-router-dom';
import { useTheme } from './ThemeContext';
import { debounce, isMobileDevice } from '../utils/mobileOptimizations';
import { AuthManager } from '../utils/auth';

function SideBar({ onlineUsers = [], isConnected = false }) {
    let {userData,otherUsers,selectedUser,messages} = useSelector(state => state.user)
    let [search, setSearch] = useState(false)
    let [searchTerm, setSearchTerm] = useState("")
    let [activeTab, setActiveTab] = useState('chats')
    let [isLoadingUsers, setIsLoadingUsers] = useState(false)
    let [connectionError, setConnectionError] = useState(false)
    let dispatch = useDispatch()
    let navigate = useNavigate()
    const { theme, toggleTheme } = useTheme();
      // Socket data is now passed as props
    console.log('📡 SideBar - Socket connected:', isConnected, 'Online users:', onlineUsers.length);
    console.log('📊 SideBar - Detailed data:', { 
        onlineUsers, 
        otherUsers: otherUsers?.length, 
        isConnected,
        userData: userData?._id 
    });
    
    // Monitor connection status and users loading
    useEffect(() => {
        if (!isConnected) {
            setConnectionError(true)
        } else {
            setConnectionError(false)
        }
    }, [isConnected])
    
    // Check if users are loading
    useEffect(() => {
        if (!otherUsers) {
            setIsLoadingUsers(true)
        } else {
            setIsLoadingUsers(false)
        }
    }, [otherUsers])
    
    // Debug effect to monitor messages changes
    React.useEffect(() => {
        if (selectedUser?._id) {
            const unreadForSelected = getUserUnreadCount(selectedUser._id);
            console.log(`🔍 [SIDEBAR] Messages changed - Selected user ${selectedUser._id} has ${unreadForSelected} unread messages`);
        }
    }, [messages, selectedUser?._id]);
    // Manual refresh function for when users list fails to load
    const refreshUsersList = async () => {
        setIsLoadingUsers(true)
        try {
            console.log('🔄 Manually refreshing users list...')
            const result = await axios.get(`${serverUrl}/api/user/others`, {
                withCredentials: true,
                timeout: 10000,
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            })
            
            if (result.data && Array.isArray(result.data)) {
                dispatch(setOtherUsers(result.data))
                console.log('✅ Manual refresh successful:', result.data.length, 'users loaded')
            } else {
                console.warn('⚠️ Manual refresh returned invalid data')
                dispatch(setOtherUsers([]))
            }
        } catch (error) {
            console.error('❌ Manual refresh failed:', error)
            setConnectionError(true)
        } finally {
            setIsLoadingUsers(false)
        }
    }
    // Calculate unread messages for each user - Memoized for performance
    const getUserUnreadCount = useCallback((userId) => {
        // Always show unread count if there are unread messages in Redux state
        const unreadMessages = messages?.filter(msg => 
            msg.sender === userId && 
            msg.reciver === userData?._id && 
            !msg.read
        ) || [];
        
        const unreadCount = unreadMessages.length;
        
        // Enhanced debug logging (only in development)
        if (unreadCount > 0 && import.meta.env.DEV) {
            console.log(`🔢 [SIDEBAR] User ${userId} has ${unreadCount} unread messages:`, 
                unreadMessages.map(m => ({ 
                    id: m._id, 
                    read: m.read, 
                    message: m.message?.substring(0, 20),
                    sender: m.sender,
                    reciver: m.reciver
                }))
            );
        }
        
        return unreadCount;
    }, [messages, userData?._id]);

    // Get total unread messages - Optimized with useMemo
    const totalUnread = useMemo(() => {
        const total = otherUsers?.reduce((total, user) => {
            return total + getUserUnreadCount(user._id);
        }, 0) || 0;
        
        if (import.meta.env.DEV) {
            console.log(`📊 [SIDEBAR] Total unread messages calculated:`, total);
        }
        return total;
    }, [otherUsers, getUserUnreadCount]);
    
    // Check if user is online - Memoized for performance
    const isUserOnline = useCallback((userId) => {
        return onlineUsers.includes(userId);
    }, [onlineUsers]);
    
    // Count online users - Optimized with useMemo
    const onlineCount = useMemo(() => {
        return otherUsers?.filter(user => isUserOnline(user._id)).length || 0;
    }, [otherUsers, isUserOnline]);
    
    // Filtered users - Optimized with useMemo
    const filteredUsers = useMemo(() => {
        if (!searchTerm) return otherUsers;
        return otherUsers?.filter(user => 
            user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.userName?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [otherUsers, searchTerm]);
      const handleSearch = (e) => {
        e.preventDefault()
        // Search functionality is handled by filteredUsers
    }
    
    // Theme toggle button
    const ThemeToggle = () => (
        <button
            onClick={toggleTheme}
            className="flex items-center gap-1 text-pastel-purple dark:text-[#b3b3ff] hover:text-pastel-plum dark:hover:text-white transition-colors p-2 rounded-lg hover:bg-pastel-peach dark:hover:bg-[#181c2f] min-h-[44px] min-w-[44px] touch-manipulation active:scale-95"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
            <span className="text-xs">{theme === 'dark' ? '🌙' : '☀️'}</span>
            <span className="text-xs hidden sm:inline">{theme === 'dark' ? 'Dark' : 'Light'} Mode</span>
        </button>
    )
    
    const handelLogoout= async()=>{
      try {
        let result= await axios.get(`${serverUrl}/api/auth/logout`,{withCredentials:true})
        // Clear all authentication data
        AuthManager.clearAuth();
        dispatch(setUserData(null))
        dispatch(setOtherUsers(null))
        navigate("/login")
      } catch (error) {
        console.error("Error logging out:", error)
        // Even if server logout fails, clear local auth data
        AuthManager.clearAuth();
        dispatch(setUserData(null))
        dispatch(setOtherUsers(null))
        navigate("/login")
      }
    }// Responsive: detect mobile with optimization
    const [isMobile, setIsMobile] = useState(() => isMobileDevice() || window.innerWidth < 640);
    
    // Debounced resize handler for better performance
    const debouncedHandleResize = useMemo(
        () => debounce(() => {
            const newIsMobile = isMobileDevice() || window.innerWidth < 640;
            setIsMobile(newIsMobile);
        }, 150),
        []
    );
    
    React.useEffect(() => {
        window.addEventListener('resize', debouncedHandleResize);
        return () => {
            window.removeEventListener('resize', debouncedHandleResize);
            // Cleanup debounced function
            if (debouncedHandleResize.cancel) {
                debouncedHandleResize.cancel();
            }
        };
    }, [debouncedHandleResize]);

    // On mobile, if a user is selected, hide the sidebar (show only chat)
    if (isMobile && selectedUser) return null;    return (
        <div 
            data-testid="sidebar"
            className={`lg:w-[350px] w-full h-full border-r border-pastel-border dark:border-[#23234a] shadow-xl flex flex-col 
          bg-gradient-to-b from-pastel-cream via-pastel-lavender to-pastel-peach dark:from-[#23234a] dark:via-[#181c2f] dark:to-[#23234a]`}>
            {/* Header */}
            <div className="p-6 pb-3 rounded-b-3xl shadow-md bg-gradient-to-r from-pastel-cream via-pastel-lavender to-pastel-peach dark:from-[#23234a] dark:via-[#181c2f] dark:to-[#23234a] border-b border-pastel-rose dark:border-[#39ff14]/30">
                <div className="flex items-center gap-4">
                    <img src={userData?.image || dp} alt="Profile" className="w-16 h-16 rounded-2xl border-4 border-pastel-rose dark:border-[#39ff14] shadow-lg object-cover cursor-pointer hover:scale-105 transition-transform" onClick={() => navigate('/profile')} onContextMenu={(e) => e.preventDefault()} crossOrigin="anonymous" referrerPolicy="no-referrer" />
                    <div>                        <h1 className="text-pastel-plum dark:text-white font-extrabold text-2xl font-mono tracking-tight">Alpha<span className="text-pastel-rose dark:text-[#39ff14]">Chat</span></h1>
                        <p className="text-xs text-pastel-muted dark:text-[#b3b3ff] font-mono">v2.0.0 // Coder Edition</p>
                        <p className="text-pastel-rose dark:text-[#39ff14] font-mono text-sm mt-1">{userData?.name || userData?.userName || 'Developer'}</p>
                        <p className="text-pastel-muted dark:text-[#b3b3ff] text-xs font-mono">@{userData?.github || 'coder'}</p>
                    </div>
                </div>
            </div>            {/* Stats */}
            <div className="flex gap-4 text-center px-6 py-3 bg-pastel-lavender dark:bg-[#23234a] rounded-xl mx-4 mt-2 z-10 relative shadow-md border border-pastel-border dark:border-transparent">                <div className="flex-1">
                    <div className="text-pastel-plum dark:text-white font-bold text-lg flex items-center justify-center gap-1">
                        {onlineCount}
                        {onlineCount > 0 && <div className="w-2 h-2 bg-pastel-mint dark:bg-[#39ff14] rounded-full animate-pulse"></div>}
                    </div>
                    <div className="text-xs text-pastel-mint dark:text-[#39ff14]">Online</div>
                </div>
                <div className="flex-1">
                    <div className="text-pastel-plum dark:text-white font-bold text-lg flex items-center justify-center gap-1">
                        {totalUnread}
                        {totalUnread > 0 && <div className="w-2 h-2 bg-pastel-coral dark:bg-[#ff6f3c] rounded-full animate-pulse"></div>}
                    </div>
                    <div className="text-xs text-pastel-sunny dark:text-[#ffe156]">Unread</div>
                </div>
                <div className="flex-1">
                    <div className="text-pastel-plum dark:text-white font-bold text-lg">{otherUsers?.length || 0}</div>
                    <div className="text-xs text-pastel-rose dark:text-[#39ff14]">Devs</div>
                </div>
            </div>{/* Navigation Tabs */}
            <div className="flex gap-1 mt-4 px-4">
                {[
                    { id: 'chats', icon: FiMessageCircle, label: 'Chats' },
                    { id: 'channels', icon: FiHash, label: 'Channels' },
                    { id: 'teams', icon: FiUsers, label: 'Teams' }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}                        className={`flex-1 flex items-center justify-center gap-2 py-2 px-2 rounded-lg font-mono text-sm transition-all duration-200 ${                            activeTab === tab.id 
                                ? 'bg-gradient-to-r from-pastel-rose to-pastel-coral dark:from-[#39ff14] dark:to-[#2dd60a] text-white dark:text-[#181c2f] font-bold shadow-lg shadow-pastel-rose/30 dark:shadow-none'
                                : 'text-pastel-purple dark:text-[#b3b3ff] hover:text-pastel-plum dark:hover:text-white hover:bg-pastel-peach dark:hover:bg-[#23234a]'
                        }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>            {/* Search Section */}
            <div className="p-4 pb-2">
                <div className="flex items-center gap-2 mb-3">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            placeholder="Search developers..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onFocus={() => setSearch(true)}
                            onBlur={() => setSearch(false)}                        className="w-full pl-10 pr-4 py-2 rounded-lg bg-pastel-cream dark:bg-[#23234a] text-pastel-plum dark:text-white font-mono border border-pastel-rose dark:border-[#39ff14] focus:outline-none focus:ring-2 focus:ring-pastel-rose/50 dark:focus:ring-[#39ff14]/30 transition-all placeholder-pastel-muted dark:placeholder-[#b3b3ff] shadow-sm"
                        />
                        <MdOutlinePersonSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-pastel-rose dark:text-[#39ff14]" />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-pastel-rose dark:text-[#39ff14] hover:text-pastel-coral dark:hover:text-white"
                            >
                                <GiCrossMark className='w-[25px] h-[25px]'/>
                            </button>
                        )}
                    </div>                    {/* Manual refresh button */}
                    <button
                        onClick={refreshUsersList}
                        disabled={isLoadingUsers}
                        className={`p-2 rounded-lg border transition-all duration-200 ${
                            isLoadingUsers 
                                ? 'bg-pastel-muted dark:bg-gray-600 cursor-not-allowed' 
                                : 'bg-pastel-cream dark:bg-[#23234a] border-pastel-rose dark:border-[#39ff14] hover:bg-pastel-lavender dark:hover:bg-[#39ff14]/20'
                        }`}
                        title="Refresh developers list"
                    >
                        <FiRefreshCw className={`w-4 h-4 text-pastel-rose dark:text-[#39ff14] ${isLoadingUsers ? 'animate-spin' : ''}`} />                    </button>
                </div>
                
                {/* Connection status indicator */}
                <div className="flex items-center justify-between text-xs font-mono mb-2">
                    <div className="flex items-center gap-2">
                        {isConnected ? (
                            <>
                                <FiWifi className="w-3 h-3 text-pastel-mint dark:text-[#39ff14]" />
                                <span className="text-pastel-sage dark:text-[#39ff14]">Connected</span>
                            </>
                        ) : (
                            <>
                                <FiWifiOff className="w-3 h-3 text-red-500" />
                                <span className="text-red-500">Disconnected</span>
                            </>
                        )}
                    </div>
                    {connectionError && (
                        <span className="text-red-500">Network Issue</span>
                    )}
                </div>
            </div>            {/* User List */}
            <div className="flex-1 overflow-y-auto p-4 pt-2 space-y-3">
                {isLoadingUsers ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="w-8 h-8 border-2 border-pastel-rose dark:border-[#39ff14] border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-pastel-muted dark:text-[#b3b3ff] font-mono text-sm">Loading developers...</p>
                    </div>
                ) : (!otherUsers || otherUsers.length === 0) ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="w-16 h-16 bg-pastel-lavender dark:bg-[#23234a] rounded-full flex items-center justify-center mb-4 border-2 border-pastel-border dark:border-transparent">
                            <FiUsers className="w-8 h-8 text-pastel-rose dark:text-[#39ff14]" />
                        </div>
                        {connectionError ? (
                            <>
                                <p className="text-red-500 font-mono text-sm mb-2">Connection Error</p>
                                <p className="text-pastel-muted dark:text-[#b3b3ff] font-mono text-xs mb-3">Unable to load developers list</p>
                                <button
                                    onClick={refreshUsersList}
                                    className="px-3 py-1 bg-pastel-rose dark:bg-[#39ff14] text-white dark:text-[#181c2f] rounded-lg font-mono text-xs hover:bg-pastel-coral dark:hover:bg-[#2dd60a] transition-all"
                                >
                                    Try Again
                                </button>
                            </>
                        ) : (
                            <>
                                <p className="text-pastel-muted dark:text-[#b3b3ff] font-mono">No developers found</p>
                                <p className="text-pastel-muted dark:text-gray-500 text-sm font-mono mt-1">Invite your team to get started</p>
                            </>
                        )}
                    </div>
                ) : (
                    (search ? filteredUsers : otherUsers)?.filter(user => user && user._id).map((user) => {
                        const userIsOnline = isUserOnline(user._id);
                        const unreadCount = getUserUnreadCount(user._id);
                        
                        return (                            <div 
                                key={user._id}
                                className={`w-full p-3 flex items-center gap-3 rounded-xl border transition-all duration-200 cursor-pointer hover:scale-[1.02] min-h-[68px] touch-manipulation active:scale-95 ${
                                    selectedUser?._id === user._id 
                                        ? 'bg-gradient-to-r from-pastel-lavender to-pastel-peach dark:from-[#39ff14]/20 dark:to-[#7f53ac]/20 border-pastel-rose dark:border-[#39ff14] shadow-lg shadow-pastel-rose/20 dark:shadow-[#39ff14]/20' 
                                        : 'bg-pastel-cream dark:bg-[#23234a]/50 border-pastel-border dark:border-pastel-muted hover:bg-pastel-lavender dark:hover:bg-[#23234a] hover:border-pastel-rose dark:hover:border-[#39ff14]/50'
                                }`}
                                onClick={() => dispatch(setSelectedUser(user))}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        dispatch(setSelectedUser(user));
                                    }
                                }}
                                aria-label={`Chat with ${user.name || user.userName}${unreadCount > 0 ? `, ${unreadCount} unread messages` : ''}`}
                            >
                                <div className="relative">                                <img 
                                        src={user.image || dp} 
                                        alt="Profile" 
                                        className="w-12 h-12 rounded-xl object-cover border-2 border-pastel-rose dark:border-[#39ff14]/30"
                                        onContextMenu={(e) => e.preventDefault()}
                                        crossOrigin="anonymous"
                                        referrerPolicy="no-referrer"
                                    />
                                    {/* Online indicator */}
                                    <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-[#181c2f] ${
                                        userIsOnline ? 'bg-pastel-mint dark:bg-[#39ff14] animate-pulse' : 'bg-pastel-muted'
                                    }`}></div>
                                </div>                                <div className="flex-1 overflow-hidden">
                                    <div className="flex items-center gap-2">
                                        <h3 className={`text-pastel-plum dark:text-white font-semibold font-mono flex-1 ${isMobile ? 'text-base' : 'text-sm'}`} 
                                            style={{ 
                                                whiteSpace: 'nowrap', 
                                                overflow: 'hidden', 
                                                textOverflow: 'ellipsis',
                                                maxWidth: isMobile ? 'calc(100% - 30px)' : '100%'
                                            }}>
                                            {user.name || user.userName}
                                        </h3>
                                        {userIsOnline && (
                                            <span className="text-pastel-sage dark:text-[#39ff14] text-xs font-mono flex-shrink-0">●</span>
                                        )}
                                    </div>
                                    <p className={`text-pastel-muted dark:text-[#b3b3ff] font-mono ${isMobile ? 'text-sm' : 'text-xs'}`}
                                       style={{ 
                                           whiteSpace: 'nowrap', 
                                           overflow: 'hidden', 
                                           textOverflow: 'ellipsis',
                                           maxWidth: '100%'
                                       }}>
                                        @{user.github || user.userName}
                                    </p>
                                    <div className="flex items-center justify-between mt-1">
                                        <p className="text-pastel-muted dark:text-gray-400 text-xs font-mono">
                                            {userIsOnline ? 'Online' : 'Offline'}
                                        </p>
                                        {unreadCount > 0 && (
                                            <div className="flex items-center gap-1">
                                                <span className="bg-pastel-coral dark:bg-[#ff6f3c] text-white dark:text-white text-xs font-bold font-mono px-2 py-0.5 rounded-full flex-shrink-0 shadow-md animate-pulse">
                                                    {unreadCount > 99 ? '99+' : unreadCount}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>            {/* Bottom Action Bar */}
            <div className="sticky bottom-0 left-0 w-full z-30 bg-pastel-peach dark:bg-[#23234a] border-t border-pastel-rose dark:border-[#39ff14]/30 p-2">
                <div className="flex items-center justify-between gap-2">
                    <button className="flex items-center gap-1 text-pastel-purple dark:text-[#b3b3ff] hover:text-pastel-plum dark:hover:text-white transition-colors p-2 rounded-lg hover:bg-pastel-peach dark:hover:bg-[#181c2f]" onClick={() => navigate('/profile')}>
                        <FiSettings className="w-4 h-4" />
                        <span className="text-xs hidden sm:inline">Settings</span>
                    </button>
                    <ThemeToggle />                    <button 
                        onClick={handelLogoout}
                        className="flex items-center gap-1 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 min-h-[44px] min-w-[44px] touch-manipulation active:scale-95"
                        aria-label="Logout"
                    >
                        <BiLogOut className="w-4 h-4" />
                        <span className="text-xs">Logout</span>
                    </button>
                </div>
            </div>
        </div>
    )
}

export default SideBar
