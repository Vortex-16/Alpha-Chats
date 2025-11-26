import React, { useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { FaUserPlus, FaCode } from 'react-icons/fa'
import { serverUrl } from '../config/constants'
import { setUserData } from '../redux/userSlice'
import { useTheme } from '../components/ThemeContext'
import { AuthManager } from '../utils/auth'

function SignUp() {
      const { theme } = useTheme();
      let navigate = useNavigate();
      let [show,setShow] = useState(false)
      let [userName,setUserName]= useState("")
      let [github,setGithub]= useState("")
      let [password,setPassword]= useState("")
      let [loading,setLoading]= useState(false)
      let [error,setError]= useState("")
      let dispatch = useDispatch()

      const validateForm = () => {
        if (!userName.trim()) {
          setError("Username is required")
          return false
        }
        if (userName.trim().length < 3) {
          setError("Username must be at least 3 characters")
          return false
        }
        if (!github.trim()) {
          setError("GitHub username is required")
          return false
        }
        if (!password.trim()) {
          setError("Password is required")
          return false
        }        if (password.length < 6) {
          setError("Password must be at least 6 characters")
          return false
        }
        return true
      }

      const handleSignup = async (e) => {
        e.preventDefault()
        
        if (!validateForm()) {
          return
        }
        
        setLoading(true)
        try {
          let result = await axios.post(`${serverUrl}/api/auth/signup`, {
            userName: userName.trim(),
            github: github.trim(),
            password          }, { withCredentials: true })
          
          // Use AuthManager to properly store authentication data
          AuthManager.setAuth(result.data, result.data.token);
          console.log('✅ [SignUp] Authentication data stored successfully');
          
          dispatch(setUserData(result.data))
          navigate("/profile")
          setUserName("")
          setGithub("")
          setPassword("")
          setLoading(false)
          setError("")} catch (error) {
          console.error("Signup error:", error)
          setError(error.response?.data?.message || "Signup failed. Please try again.")
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
      </div>      {/* Ambient glow effects */}
      <div className="fixed top-20 right-20 w-40 h-40 bg-pastel-mint/30 dark:bg-[#ff512f]/30 rounded-full blur-3xl animate-pulse z-20"></div>
      <div className="fixed bottom-20 left-20 w-32 h-32 bg-pastel-sunny/20 dark:bg-[#ffe53b]/20 rounded-full blur-3xl animate-pulse z-20"></div>
      <div className="fixed top-1/2 left-1/2 w-24 h-24 bg-pastel-coral/20 dark:bg-[#1e130c]/30 rounded-full blur-3xl animate-pulse transform -translate-x-1/2 -translate-y-1/2 z-20"></div>
      {/* Main signup container */}
      <div className='w-full max-w-md mx-4 relative z-10'>
        {/* Terminal window */}        <div className="terminal-window backdrop-blur-md bg-pastel-cream/90 dark:bg-gradient-to-br dark:from-[#232526]/90 dark:via-[#1e130c]/90 dark:to-[#ff512f]/80 border border-pastel-rose dark:border-[#ffe53b]/30 rounded-2xl shadow-xl">
          {/* Terminal header */}
          <div className="terminal-header flex items-center gap-2 px-4 py-2 border-b border-pastel-rose dark:border-[#ffe53b]/20">
            <div className="terminal-dot red"></div>
            <div className="terminal-dot yellow"></div>
            <div className="terminal-dot green"></div>            <div className="flex-1 text-center">
              <span className="text-pastel-purple dark:text-[#ffe53b] font-mono text-sm">alpha-chat@terminal ~ register</span>
            </div>
          </div>
          {/* Content area */}
          <div className='p-8'>            {/* Header */}            <div className='text-center mb-8'>
              <div className="flex items-center justify-center gap-3 mb-4">
                <FaUserPlus className="text-pastel-rose dark:text-[#ff512f] text-2xl animate-pulse" />
                <h1 className="text-2xl font-bold font-mono text-pastel-plum dark:text-[#ffe53b]">
                  Join<span className="text-pastel-rose dark:text-[#ff512f]">Alpha</span><span className="text-pastel-mint dark:text-[#ffe53b]">Chat</span>
                </h1>
                <FaCode className="text-pastel-mint dark:text-[#ffe53b] text-2xl animate-pulse" />
              </div>
              <p className="text-pastel-purple dark:text-[#ff512f] font-mono text-sm">
                <span className="text-pastel-mint dark:text-[#ffe53b]">$</span> sudo useradd --developer --group=alpha-coders
              </p>
            </div>
            <form className='w-full flex flex-col gap-[20px] px-8 mt-4' onSubmit={handleSignup}>
              <input type="text" placeholder='Username' className="p-3 rounded border bg-pastel-cream dark:bg-[#232526] border-pastel-rose dark:border-[#ff512f] text-pastel-plum dark:text-[#ffe53b] placeholder-pastel-muted dark:placeholder-[#ff512f]/60 focus:outline-none focus:ring-2 focus:ring-pastel-rose dark:focus:ring-[#ff512f] transition font-mono shadow-sm" onChange={(e)=>setUserName(e.target.value)} value={userName}/>
              <input type="text" placeholder='GitHub' className="p-3 rounded border bg-pastel-cream dark:bg-[#232526] border-pastel-rose dark:border-[#ff512f] text-pastel-plum dark:text-[#ffe53b] placeholder-pastel-muted dark:placeholder-[#ff512f]/60 focus:outline-none focus:ring-2 focus:ring-pastel-rose dark:focus:ring-[#ff512f] transition font-mono shadow-sm" onChange={(e)=>setGithub(e.target.value)} value={github}/>
              {error && <p className="text-red-500 text-sm font-mono animate-pulse">{error}</p>}
              <div className='relative flex items-center'>
                <input 
                  type={show ? "text" : "password"} 
                  placeholder='Password' 
                  className="w-full p-3 rounded border bg-pastel-cream dark:bg-[#232526] border-pastel-rose dark:border-[#ff512f] text-pastel-plum dark:text-[#ffe53b] placeholder-pastel-muted dark:placeholder-[#ff512f]/60 focus:outline-none focus:ring-2 focus:ring-pastel-rose dark:focus:ring-[#ff512f] transition pr-16 font-mono shadow-sm"
                  onChange={(e) => setPassword(e.target.value)}
                  value={password}
                />              <button 
                type="button" 
                className="absolute right-3 text-pastel-rose dark:text-[#ff512f] font-semibold text-sm hover:text-pastel-coral dark:hover:underline focus:outline-none font-mono min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation" 
                onClick={() => setShow(s => !s)}
                aria-label={show ? "Hide password" : "Show password"}
              >
                {show ? "Hide" : "Show"}
              </button>
              </div>              <button 
                type="submit"
                disabled={loading}
                className="mt-2 bg-gradient-to-r from-pastel-rose to-pastel-coral dark:from-[#ff512f] dark:to-[#dd2476] text-white dark:text-[#ffe53b] hover:from-pastel-coral hover:to-pastel-sunny dark:hover:from-[#ffe53b] dark:hover:to-[#ff512f] font-bold py-3 px-6 rounded-lg shadow-md transition disabled:opacity-70 font-mono transform hover:scale-105 min-h-[48px] touch-manipulation active:scale-95"
                aria-label={loading ? "Creating account..." : "Create account"}
              >
                {loading ? "Loading..." : "Sign Up"}
              </button>
            </form>
            <div className='w-full flex justify-center items-center pb-4'>              <span className="text-pastel-purple dark:text-[#ffe53b] font-mono">Already have an account?</span>              <button onClick={() => navigate("/login")}
                className="ml-2 text-pastel-rose dark:text-[#ff512f] font-semibold hover:text-pastel-coral dark:hover:underline focus:outline-none bg-transparent border-none p-2 cursor-pointer font-mono min-h-[44px] touch-manipulation active:scale-95"
                aria-label="Go to login page">
                Login
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

}

export default SignUp