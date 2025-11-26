import React from 'react'
import { Route, Routes, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import ForgotPassword from './pages/ForgotPassword'
import Home from './pages/Home'
import Profile from './pages/Profile'
import NotFound from './pages/NotFound'
import ErrorBoundary from './components/ErrorBoundary'
import { LoadingPage } from './components/LoadingSpinner'
import getCurrentUser from './Hooks/getCurrentUser'
import getOtherUsers from './Hooks/getOtherUsers'

function App() {
  // Use hooks properly
  getCurrentUser()
  getOtherUsers()
  
  let {userData, isLoadingAuth}=useSelector(state=>state.user)
  
  // Show loading screen while checking authentication
  if (isLoadingAuth) {
    return <LoadingPage message="Checking authentication..." />
  }
  
  return (
    <ErrorBoundary>
      <Routes>
        <Route path='/login' element={!userData?<Login />:<Navigate to="/"/>} />
        <Route path='/signup' element={!userData?<SignUp />:<Navigate to="/"/>} />
        <Route path='/forgot-password' element={!userData?<ForgotPassword />:<Navigate to="/"/>} />
        <Route path='/' element={userData?<Home />:<Navigate to="/login"/>} />
        <Route path='/profile' element={userData?<Profile/>:<Navigate to="/login" />} />
        <Route path='*' element={<NotFound />} />
      </Routes>
    </ErrorBoundary>
  )
}


export default App