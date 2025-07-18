import React, { useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { serverUrl } from '../config/constants'
import { FaLock, FaKey, FaShieldAlt } from 'react-icons/fa'
import { useTheme } from '../components/ThemeContext'

function ForgotPassword() {
    const { theme } = useTheme()
    const navigate = useNavigate()
    
    // Step 1: Request reset code
    const [step, setStep] = useState(1)
    const [github, setGithub] = useState("")
    const [userName, setUserName] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    
    // Step 2: Reset password
    const [resetCode, setResetCode] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)

    const handleRequestReset = async (e) => {
        e.preventDefault()
        
        if (!github.trim() || !userName.trim()) {
            setError("Both GitHub username and display name are required")
            return
        }
        
        setLoading(true)
        setError("")
        
        try {
            const response = await axios.post(`${serverUrl}/api/auth/forgot-password`, {
                github: github.trim(),
                userName: userName.trim()
            })
            
            setSuccess(response.data.message)
            
            // In development, show the reset code
            if (response.data.devResetCode) {
                setSuccess(`${response.data.message}\n\nDEV RESET CODE: ${response.data.devResetCode}`)
            }
            
            setStep(2)
            setLoading(false)
            
        } catch (error) {
            setError(error.response?.data?.message || "Failed to request password reset")
            setLoading(false)
        }
    }

    const handleResetPassword = async (e) => {
        e.preventDefault()
        
        if (!resetCode.trim()) {
            setError("Reset code is required")
            return
        }
        
        if (!newPassword.trim()) {
            setError("New password is required")
            return
        }
        
        if (newPassword.length < 6) {
            setError("Password must be at least 6 characters")
            return
        }
        
        if (newPassword !== confirmPassword) {
            setError("Passwords do not match")
            return
        }
        
        setLoading(true)
        setError("")
        
        try {
            const response = await axios.post(`${serverUrl}/api/auth/reset-password`, {
                github: github.trim(),
                userName: userName.trim(),
                resetCode: resetCode.trim(),
                newPassword
            })
            
            setSuccess(response.data.message)
            
            // Redirect to login after 3 seconds
            setTimeout(() => {
                navigate('/login')
            }, 3000)
            
        } catch (error) {
            setError(error.response?.data?.message || "Password reset failed")
            setLoading(false)
        }
    }

    return (
        <div className='w-full h-screen flex items-center justify-center relative overflow-auto bg-gradient-to-br from-pastel-cream via-pastel-lavender to-pastel-peach dark:from-[#0f2027] dark:via-[#2c5364] dark:to-[#ff512f]'>
            {/* Animated background */}
            <div className="absolute inset-0 opacity-10 pointer-events-none z-0">
                <div className="grid grid-cols-16 gap-2 h-full">
                    {Array.from({ length: 320 }, (_, i) => (
                        <div 
                            key={i} 
                            className="bg-pastel-mint dark:bg-gradient-to-br dark:from-[#ff512f] dark:via-[#dd2476] dark:to-[#1e130c] animate-pulse" 
                            style={{ 
                                animationDelay: `${i * 0.02}s`,
                                animationDuration: `${1.5 + Math.random() * 2}s`
                            }}
                        ></div>
                    ))}
                </div>
            </div>

            {/* Ambient glow effects */}
            <div className="fixed top-20 right-20 w-40 h-40 bg-pastel-mint/30 dark:bg-[#ff512f]/30 rounded-full blur-3xl animate-pulse z-20"></div>
            <div className="fixed bottom-20 left-20 w-32 h-32 bg-pastel-sunny/20 dark:bg-[#ffe53b]/20 rounded-full blur-3xl animate-pulse z-20"></div>
            
            {/* Main container */}
            <div className='w-full max-w-md mx-4 relative z-10'>
                <div className="terminal-window backdrop-blur-md bg-pastel-cream/90 dark:bg-gradient-to-br dark:from-[#232526]/90 dark:via-[#1e130c]/90 dark:to-[#ff512f]/80 border border-pastel-rose dark:border-[#ffe53b]/30 rounded-2xl shadow-xl">
                    {/* Terminal header */}
                    <div className="terminal-header flex items-center gap-2 px-4 py-2 border-b border-pastel-rose dark:border-[#ffe53b]/20">
                        <div className="terminal-dot red"></div>
                        <div className="terminal-dot yellow"></div>
                        <div className="terminal-dot green"></div>
                        <div className="flex-1 text-center">
                            <span className="text-pastel-purple dark:text-[#ffe53b] font-mono text-sm">
                                alpha-chat@security ~ password-reset
                            </span>
                        </div>
                    </div>

                    {/* Content area */}
                    <div className='p-8'>
                        {/* Header */}
                        <div className='text-center mb-8'>
                            <div className="flex items-center justify-center gap-3 mb-4">
                                <FaShieldAlt className="text-pastel-rose dark:text-[#ff512f] text-2xl animate-pulse" />
                                <h1 className="text-2xl font-bold font-mono text-pastel-plum dark:text-[#ffe53b]">
                                    {step === 1 ? 'Reset' : 'Secure'}<span className="text-pastel-rose dark:text-[#ff512f]">Password</span>
                                </h1>
                                <FaLock className="text-pastel-mint dark:text-[#ffe53b] text-2xl animate-pulse" />
                            </div>
                            <p className="text-pastel-purple dark:text-[#ff512f] font-mono text-sm">
                                <span className="text-pastel-mint dark:text-[#ffe53b]">$</span> sudo security --verify-identity --reset-password
                            </p>
                        </div>

                        {/* Step 1: Request Reset */}
                        {step === 1 && (
                            <form onSubmit={handleRequestReset} className='w-full flex flex-col gap-[20px]'>
                                <div className="mb-4">
                                    <h3 className="text-pastel-plum dark:text-[#ffe53b] font-mono text-sm mb-2">
                                        🔐 Secure Identity Verification
                                    </h3>
                                    <p className="text-pastel-muted dark:text-[#ff512f]/70 font-mono text-xs">
                                        Both credentials required for security
                                    </p>
                                </div>
                                
                                <input 
                                    type="text" 
                                    placeholder='GitHub Username' 
                                    className="p-3 rounded border bg-pastel-cream dark:bg-[#232526] border-pastel-rose dark:border-[#ff512f] text-pastel-plum dark:text-[#ffe53b] placeholder-pastel-muted dark:placeholder-[#ff512f]/60 focus:outline-none focus:ring-2 focus:ring-pastel-rose dark:focus:ring-[#ff512f] transition font-mono shadow-sm"
                                    onChange={(e) => setGithub(e.target.value)}
                                    value={github}
                                    required
                                />
                                
                                <input 
                                    type="text" 
                                    placeholder='Display Name (Username)' 
                                    className="p-3 rounded border bg-pastel-cream dark:bg-[#232526] border-pastel-rose dark:border-[#ff512f] text-pastel-plum dark:text-[#ffe53b] placeholder-pastel-muted dark:placeholder-[#ff512f]/60 focus:outline-none focus:ring-2 focus:ring-pastel-rose dark:focus:ring-[#ff512f] transition font-mono shadow-sm"
                                    onChange={(e) => setUserName(e.target.value)}
                                    value={userName}
                                    required
                                />
                                
                                {error && <p className="text-red-500 text-sm font-mono animate-pulse">{error}</p>}
                                {success && <p className="text-green-500 text-sm font-mono whitespace-pre-line">{success}</p>}
                                
                                <button 
                                    type="submit"
                                    disabled={loading}
                                    className="mt-2 bg-gradient-to-r from-pastel-rose to-pastel-coral dark:from-[#ff512f] dark:to-[#dd2476] text-white dark:text-[#ffe53b] hover:from-pastel-coral hover:to-pastel-sunny dark:hover:from-[#ffe53b] dark:hover:to-[#ff512f] font-bold py-3 px-6 rounded-lg shadow-md transition disabled:opacity-70 font-mono transform hover:scale-105 min-h-[48px] touch-manipulation active:scale-95"
                                    aria-label={loading ? "Requesting reset..." : "Request reset code"}
                                >
                                    {loading ? "Verifying..." : "🔐 Request Reset Code"}
                                </button>
                            </form>
                        )}

                        {/* Step 2: Reset Password */}
                        {step === 2 && (
                            <form onSubmit={handleResetPassword} className='w-full flex flex-col gap-[20px]'>
                                <div className="mb-4">
                                    <h3 className="text-pastel-plum dark:text-[#ffe53b] font-mono text-sm mb-2">
                                        🔑 Enter Reset Code & New Password
                                    </h3>
                                    <p className="text-pastel-muted dark:text-[#ff512f]/70 font-mono text-xs">
                                        Code expires in 15 minutes. 5 attempts allowed.
                                    </p>
                                </div>
                                
                                <input 
                                    type="text" 
                                    placeholder='6-Digit Reset Code' 
                                    className="p-3 rounded border bg-pastel-cream dark:bg-[#232526] border-pastel-rose dark:border-[#ff512f] text-pastel-plum dark:text-[#ffe53b] placeholder-pastel-muted dark:placeholder-[#ff512f]/60 focus:outline-none focus:ring-2 focus:ring-pastel-rose dark:focus:ring-[#ff512f] transition font-mono shadow-sm text-center text-xl tracking-widest"
                                    onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    value={resetCode}
                                    maxLength={6}
                                    required
                                />
                                
                                <div className='relative flex items-center'>
                                    <input 
                                        type={showPassword ? "text" : "password"} 
                                        placeholder='New Password (min 6 chars)' 
                                        className="w-full p-3 rounded border bg-pastel-cream dark:bg-[#232526] border-pastel-rose dark:border-[#ff512f] text-pastel-plum dark:text-[#ffe53b] placeholder-pastel-muted dark:placeholder-[#ff512f]/60 focus:outline-none focus:ring-2 focus:ring-pastel-rose dark:focus:ring-[#ff512f] transition pr-16 font-mono shadow-sm"
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        value={newPassword}
                                        required
                                        minLength={6}
                                    />
                                    <button 
                                        type="button" 
                                        className="absolute right-3 text-pastel-rose dark:text-[#ff512f] font-semibold text-sm hover:text-pastel-coral dark:hover:underline focus:outline-none font-mono min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation" 
                                        onClick={() => setShowPassword(s => !s)}
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? "Hide" : "Show"}
                                    </button>
                                </div>
                                
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    placeholder='Confirm New Password' 
                                    className="p-3 rounded border bg-pastel-cream dark:bg-[#232526] border-pastel-rose dark:border-[#ff512f] text-pastel-plum dark:text-[#ffe53b] placeholder-pastel-muted dark:placeholder-[#ff512f]/60 focus:outline-none focus:ring-2 focus:ring-pastel-rose dark:focus:ring-[#ff512f] transition font-mono shadow-sm"
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    value={confirmPassword}
                                    required
                                />
                                
                                {error && <p className="text-red-500 text-sm font-mono animate-pulse">{error}</p>}
                                {success && (
                                    <div className="text-green-500 text-sm font-mono">
                                        <p>{success}</p>
                                        <p className="mt-2 text-xs">Redirecting to login in 3 seconds...</p>
                                    </div>
                                )}
                                
                                {!success && (
                                    <button 
                                        type="submit"
                                        disabled={loading}
                                        className="mt-2 bg-gradient-to-r from-pastel-rose to-pastel-coral dark:from-[#ff512f] dark:to-[#dd2476] text-white dark:text-[#ffe53b] hover:from-pastel-coral hover:to-pastel-sunny dark:hover:from-[#ffe53b] dark:hover:to-[#ff512f] font-bold py-3 px-6 rounded-lg shadow-md transition disabled:opacity-70 font-mono transform hover:scale-105 min-h-[48px] touch-manipulation active:scale-95"
                                        aria-label={loading ? "Resetting password..." : "Reset password"}
                                    >
                                        {loading ? "Resetting..." : "🔑 Reset Password"}
                                    </button>
                                )}
                            </form>
                        )}

                        {/* Back to login */}
                        <div className='w-full flex justify-center items-center pt-4 mt-4 border-t border-pastel-rose/20 dark:border-[#ffe53b]/20'>
                            <span className="text-pastel-purple dark:text-[#ffe53b] font-mono text-sm">Remember your password?</span>
                            <button 
                                onClick={() => navigate("/login")}
                                className="ml-2 text-pastel-rose dark:text-[#ff512f] font-semibold hover:text-pastel-coral dark:hover:underline focus:outline-none bg-transparent border-none p-2 cursor-pointer font-mono min-h-[44px] touch-manipulation active:scale-95"
                                aria-label="Go to login page"
                            >
                                Back to Login
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ForgotPassword
