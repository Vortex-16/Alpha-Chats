import axios from 'axios';
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom';
import { serverUrl } from '../config/constants';
import { useDispatch } from 'react-redux';
import { setUserData } from '../redux/userSlice';
import { FaTerminal, FaCode } from 'react-icons/fa';
import { useTheme } from '../components/ThemeContext';
import { AuthManager } from '../utils/auth';

function Login() {
  const { theme } = useTheme();
  const [show, setShow] = useState(false);
  let navigate = useNavigate();
  let [github,setGithub]= useState("")
  let [password,setPassword]= useState("")
  let [error, setError] = useState("");
  let [loading,setLoading]= useState(false)
  let dispatch = useDispatch()
  const validateForm = () => {
    if (!github.trim()) {
      setError("GitHub username is required")
      return false
    }
    if (!password.trim()) {
      setError("Password is required")
      return false
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return false
    }
    return true
  }

  const handleLogin = async (e) => {
        e.preventDefault()
        
        if (!validateForm()) {
          return
        }
          setLoading(true);
        try {
          setError("");
          let result = await axios.post(`${serverUrl}/api/auth/login`, {
            github: github.trim(),
            password
          }, { withCredentials: true })
           
          // Use AuthManager to properly store authentication data
          AuthManager.setAuth(result.data, result.data.token);
          console.log('✅ [Login] Authentication data stored successfully');
          
          dispatch(setUserData(result.data))
          navigate("/")
          setGithub("")
          setPassword("")
          setLoading(false)
        } catch (error) {
          console.error("Login error:", error)
          setError(error.response?.data?.message || "Login failed. Please try again.")
          setLoading(false)
        }
      }

  return (
    <div className='w-full h-screen flex items-center justify-center relative overflow-auto bg-gradient-to-br from-pastel-cream via-pastel-lavender to-pastel-peach dark:from-[#181c2f] dark:via-[#2d1e60] dark:to-[#39ff14]'>
      {/* Animated background */}
      <div className="absolute inset-0 opacity-10 pointer-events-none z-0">
        <div className="grid grid-cols-20 gap-1 h-full">
          {Array.from({ length: 400 }, (_, i) => (
            <div 
              key={i} 
              className="bg-pastel-rose dark:bg-[#39ff14] animate-pulse" 
              style={{ 
                animationDelay: `${i * 0.01}s`,
                animationDuration: `${1 + Math.random() * 2}s`
              }}
            ></div>
          ))}
        </div>
      </div>      {/* Ambient glow effects */}
      <div className="fixed top-20 left-20 w-40 h-40 bg-pastel-rose/20 dark:bg-[#39ff14]/20 rounded-full blur-3xl animate-pulse z-20"></div>
      <div className="fixed bottom-20 right-20 w-32 h-32 bg-pastel-mint/20 dark:bg-[#7f53ac]/20 rounded-full blur-3xl animate-pulse z-20"></div>
      <div className="fixed top-1/2 left-1/2 w-24 h-24 bg-pastel-sunny/20 dark:bg-[#7f53ac]/20 rounded-full blur-3xl animate-pulse transform -translate-x-1/2 -translate-y-1/2 z-20"></div>
      {/* Main login container */}
      <div className='w-full max-w-md mx-4 relative z-10'>
        {/* Terminal window */}        <div className='terminal-window backdrop-blur-md bg-pastel-cream/90 dark:bg-[#23234a]/90 border border-pastel-rose dark:border-[#39ff14]/30 rounded-2xl shadow-xl'>
          {/* Terminal header */}
          <div className='terminal-header flex items-center gap-2 px-4 py-2 border-b border-pastel-rose dark:border-[#39ff14]/20'>
            <div className="terminal-dot red"></div>
            <div className="terminal-dot yellow"></div>
            <div className="terminal-dot green"></div>
            <div className="flex-1 text-center">
              <span className="text-pastel-muted dark:text-[#b3b3ff] font-mono text-sm">alpha-chat@terminal ~ login</span>
            </div>
          </div>
          {/* Content area */}
          <div className='p-8'>            {/* Header */}
            <div className='text-center mb-8'>
              <div className="flex items-center justify-center gap-3 mb-4">                <FaTerminal className="text-pastel-rose dark:text-[#39ff14] text-2xl animate-pulse" />
                <h1 className='text-2xl font-bold font-mono text-pastel-plum dark:text-white'>
                  Alpha<span className='text-pastel-rose dark:text-[#39ff14]'>Chat</span>
                </h1>
                <FaCode className="text-purple-600 dark:text-[#7f53ac] text-2xl animate-pulse" />
              </div>              <p className="text-pastel-muted dark:text-[#b3b3ff] font-mono text-sm">
                <span className="text-pastel-rose dark:text-[#39ff14]">$</span> sudo login --developer-mode
              </p>
            </div>            <form className='w-full flex flex-col gap-[20px] px-8 mt-4' onSubmit={handleLogin}>
              <input 
                type="text" 
                placeholder='GitHub id' 
                className='p-3 rounded-lg bg-pastel-cream dark:bg-[#181c2f]/70 border border-pastel-rose dark:border-[#39ff14]/30 text-pastel-plum dark:text-white placeholder-pastel-muted dark:placeholder-[#b3b3ff] focus:outline-none focus:ring-2 focus:ring-pastel-rose dark:focus:ring-[#39ff14] focus:border-pastel-coral dark:focus:border-[#39ff14] transition font-mono shadow-sm' 
                onChange={(e)=>setGithub(e.target.value)}
                value={github}
              />
              {error && <p className="text-red-500 dark:text-[#ff6f3c] text-sm font-mono animate-pulse">{error}</p>}
              <div className='relative flex items-center'>
                <input 
                  type={show ? "text" : "password"} 
                  placeholder='Password' 
                  className='w-full p-3 rounded-lg bg-pastel-cream dark:bg-[#181c2f]/70 border border-pastel-rose dark:border-[#39ff14]/30 text-pastel-plum dark:text-white placeholder-pastel-muted dark:placeholder-[#b3b3ff] focus:outline-none focus:ring-2 focus:ring-pastel-rose dark:focus:ring-[#39ff14] focus:border-pastel-coral dark:focus:border-[#39ff14] transition font-mono pr-16 shadow-sm'
                  onChange={(e) => setPassword(e.target.value)}
                  value={password}
                />
                <button 
                  type="button" 
                  className='absolute right-3 text-pastel-rose dark:text-[#39ff14] font-semibold text-sm hover:text-pastel-coral dark:hover:text-[#ffe156] focus:outline-none transition font-mono' 
                  onClick={() => setShow(s => !s)}
                >
                  {show ? "Hide" : "Show"}
                </button>
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className='mt-2 bg-gradient-to-r from-pastel-rose to-pastel-coral dark:from-[#39ff14] dark:to-[#ffe156] text-white dark:text-[#181c2f] font-bold py-3 rounded-lg shadow-md hover:from-pastel-coral hover:to-pastel-sunny dark:hover:from-[#ffe156] dark:hover:to-[#ff6f3c] transition disabled:opacity-70 font-mono transform hover:scale-105'
              >
                {loading ? "Initializing..." : "Access Granted"}
              </button>
              
              {/* Forgot Password Link */}
              <div className='w-full flex justify-center mt-2'>
                <button 
                  onClick={() => navigate("/forgot-password")}
                  className='text-pastel-muted dark:text-[#b3b3ff] hover:text-pastel-rose dark:hover:text-[#39ff14] font-mono text-sm underline focus:outline-none bg-transparent border-none cursor-pointer transition min-h-[44px] touch-manipulation'
                  aria-label="Reset forgotten password"
                >
                  🔐 Forgot Password?
                </button>
              </div>
            </form>
            <div className='w-full flex justify-center items-center pb-4'>
              <span className='text-pastel-muted dark:text-[#b3b3ff] font-mono'>Need access credentials?</span>
              <button onClick={() => navigate("/signup")}
                className='ml-2 text-pastel-rose dark:text-[#39ff14] font-semibold hover:text-pastel-coral dark:hover:text-[#ffe156] focus:outline-none bg-transparent border-none p-0 cursor-pointer font-mono transition'>
                Create Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login