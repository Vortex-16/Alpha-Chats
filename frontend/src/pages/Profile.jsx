import React, { useRef, useState } from 'react'
import dp from '../assets/pp.webp'
import { IoCameraOutline } from 'react-icons/io5';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { serverUrl } from '../config/constants';
import { setUserData } from '../redux/userSlice';
import { FaUser, FaEdit } from 'react-icons/fa';
import { useTheme } from '../components/ThemeContext';

function Profile() {
  const { theme } = useTheme();
  let {userData} = useSelector(state => state.user)
  let dispatch = useDispatch()
  let navigate = useNavigate();
  let [name, setName] = useState(userData?.name || "")
  let [frontendImage, setFrontendImage] = useState(userData?.image || dp)
  let [backendImage, setBackendImage] = useState(null)
  let image = useRef();
  let [saving, setSaving] = useState(false);
  
  // Debug: Log the userData.image to see what we're getting
  console.log('👤 Profile - userData.image:', userData?.image)
  console.log('🖼️ Profile - frontendImage:', frontendImage)
    const handleImage = (e) => {
    let file = e.target.files[0]
    setFrontendImage(URL.createObjectURL(file))
    setBackendImage(file)
  }
  
  const handleProfile = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      let formData = new FormData()
      formData.append("name", name)
      if (backendImage) {
        formData.append("image", backendImage)
        console.log('📁 FormData created with image:', {
          fileName: backendImage.name,
          fileSize: backendImage.size,
          fileType: backendImage.type
        })
      }
      
      console.log('📤 Sending FormData to server...')
      
      let result = await axios.put(`${serverUrl}/api/user/profile`, formData, {withCredentials:true})
      setSaving(false)
      
      // Debug: Log the server response
      console.log('🔍 Server response:', result.data)
      console.log('🖼️ Server returned image:', result.data.image)
      
      dispatch(setUserData(result.data))
      
      // Update the frontend image with the new image from server
      if (result.data.image) {
        setFrontendImage(result.data.image)
        console.log('✅ Updated frontendImage to:', result.data.image)
      } else {
        console.log('❌ No image in server response')
      }      // Clear the backend image since it's now saved
      setBackendImage(null)
      
      // Show success message in button and redirect after a brief delay
      setSaving("success")
      
      setTimeout(() => {
        navigate("/")
      }, 1500) // 1.5 second delay to show success message
      
    } catch (error) {
      setSaving(false)
      alert("Error updating profile")
    }
  }
  return (
    <div className='w-full h-screen flex items-center justify-center relative overflow-auto bg-gradient-to-br from-pastel-cream via-pastel-lavender to-pastel-peach dark:from-[#181c2f] dark:via-[#23234a] dark:to-[#181c2f]'>
      {/* Animated background */}
      <div className="absolute inset-0 opacity-10 pointer-events-none z-0">
        <div className="grid grid-cols-20 gap-1 h-full">
          {Array.from({ length: 400 }, (_, i) => (
            <div 
              key={i} 
              className="bg-gradient-to-br from-pastel-rose via-pastel-mint to-pastel-sunny dark:from-[#39ff14] dark:via-[#ffe156] dark:to-[#ff6f3c] rounded animate-pulse" 
              style={{ 
                animationDelay: `${i * 0.05}s`,
                animationDuration: `${2 + Math.random() * 3}s`
              }}
            ></div>
          ))}
        </div>
      </div>      {/* Ambient glow effects */}
      <div className="fixed top-20 left-20 w-40 h-40 bg-pastel-rose/20 dark:bg-[#39ff14]/20 rounded-full blur-3xl animate-pulse z-20"></div>
      <div className="fixed bottom-20 right-20 w-32 h-32 bg-pastel-coral/20 dark:bg-[#ff6f3c]/20 rounded-full blur-3xl animate-pulse z-20"></div>
      <div className="fixed top-1/2 right-10 w-24 h-24 bg-pastel-sunny/20 dark:bg-[#ffe156]/20 rounded-full blur-3xl animate-pulse z-20"></div>
      {/* Main profile container */}
      <div className='w-full max-w-lg mx-4 relative z-10'>
        {/* Terminal window */}        <div className='terminal-window backdrop-blur-md bg-pastel-cream/90 dark:bg-[#23234a]/90 border border-pastel-rose dark:border-[#39ff14]/30 rounded-2xl shadow-xl'>
          {/* Terminal header */}
          <div className='terminal-header flex items-center gap-2 px-4 py-2 border-b border-pastel-rose dark:border-[#39ff14]/20'>
            <div className="terminal-dot red"></div>
            <div className="terminal-dot yellow"></div>
            <div className="terminal-dot green"></div>
            <div className="flex-1 text-center">
              <span className="text-pastel-purple dark:text-[#b3b3ff] font-mono text-sm">alpha-chat@terminal ~ profile --edit</span>
            </div>
          </div>          {/* Content area */}
          <div className='p-8'>
            {/* Header */}
            <div className='text-center mb-8'>
              <div className="flex items-center justify-center gap-3 mb-4">                <FaUser className="text-pastel-rose dark:text-[#39ff14] text-2xl animate-pulse" />
                <h1 className='text-2xl font-bold font-mono text-pastel-plum dark:text-white'>
                  Profile<span className='text-pastel-rose dark:text-[#39ff14]'>Config</span>
                </h1>
                <FaEdit className="text-purple-600 dark:text-[#7f53ac] text-2xl animate-pulse" />
              </div>              <p className="text-pastel-muted dark:text-[#b3b3ff] font-mono text-sm">
                <span className="text-pastel-rose dark:text-[#39ff14]">$</span> nano ~/.config/user/profile.json
              </p>            </div>
            <div className='flex flex-col items-center'>
              <div className='bg-pastel-lavender dark:bg-[#23234a] rounded-full border-4 border-pastel-rose dark:border-[#39ff14] shadow-lg shadow-pastel-rose/30 dark:shadow-[#39ff14]/30 relative cursor-pointer hover:scale-105 transition-transform' onClick={() => image.current.click()}>
                <div className='w-[200px] h-[200px] rounded-full overflow-hidden flex items-center justify-center'>
                  <img src={frontendImage} alt="Profile" className='h-[100%] w-[100%] object-cover' onContextMenu={(e) => e.preventDefault()} crossOrigin="anonymous" referrerPolicy="no-referrer" />
                </div>
                <div className='absolute bottom-4 right-4 w-[35px] h-[35px] cursor-pointer rounded-full bg-pastel-rose dark:bg-[#39ff14] flex justify-center items-center hover:bg-pastel-coral dark:hover:bg-[#ffe156] transition-all shadow-lg'>
                  <IoCameraOutline className='w-[25px] h-[25px] text-white dark:text-[#181c2f]' />
                </div>
              </div>
              <form className='w-[95%] max-w-[500px] flex flex-col gap-[20px] items-center justify-center mt-6' onSubmit={handleProfile}>
                <input type="file" accept='image/*' ref={image} hidden onChange={handleImage} />
                <input 
                  type="text" 
                  placeholder='Enter your name' 
                  className='w-[90%] outline-none border-2 border-pastel-rose dark:border-[#39ff14] px-[20px] py-[10px] bg-pastel-cream dark:bg-[#23234a] rounded-lg shadow-lg text-pastel-plum dark:text-white text-[19px] font-mono focus:border-pastel-coral dark:focus:border-[#ffe156] transition-all placeholder-pastel-muted dark:placeholder-[#b3b3ff]' 
                  onChange={e => setName(e.target.value)} 
                  value={name} 
                />
                <input 
                  type="text"                readOnly 
                  className='w-[90%] outline-none border-2 border-pastel-border dark:border-[#39ff14]/50 px-[20px] py-[10px] bg-pastel-peach dark:bg-[#181c2f] rounded-lg shadow-lg text-pastel-purple dark:text-[#b3b3ff] text-[19px] font-mono cursor-not-allowed' 
                  value={userData?.userName || ""}
                />
                <input 
                  type="text"                  readOnly 
                  className='w-[90%] outline-none border-2 border-pastel-border dark:border-[#39ff14]/50 px-[20px] py-[10px] bg-pastel-peach dark:bg-[#181c2f] rounded-lg shadow-lg text-pastel-purple dark:text-[#b3b3ff] text-[19px] font-mono cursor-not-allowed' 
                  value={userData?.github || ""}
                />                <button 
                  className='px-[20px] py-[10px] bg-gradient-to-r from-pastel-rose to-pastel-coral dark:from-[#39ff14] dark:to-[#ffe156] text-white dark:text-[#181c2f] rounded-2xl shadow-lg text-[20px] w-[200px] mt-[20px] font-semibold font-mono hover:shadow-xl hover:from-pastel-coral hover:to-pastel-sunny dark:hover:from-[#ffe156] dark:hover:to-[#39ff14] transition-all disabled:opacity-70 transform hover:scale-105' 
                  disabled={saving}
                >
                  {saving === true ? "Saving..." : saving === "success" ? "Saved! ✨ Exiting..." : "Save & Exit"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile;
