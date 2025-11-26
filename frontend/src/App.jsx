import React, { Suspense, useMemo } from 'react'
import { Route, Routes, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import ErrorBoundary from './components/ErrorBoundary'
import { LoadingPage } from './components/LoadingSpinner'
import getCurrentUser from './Hooks/getCurrentUser'
import getOtherUsers from './Hooks/getOtherUsers'

// Lazy load components to avoid potential circular dependencies
const Login = React.lazy(() => import('./pages/Login'))
const SignUp = React.lazy(() => import('./pages/SignUp'))
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword'))
const Home = React.lazy(() => import('./pages/Home'))
const Profile = React.lazy(() => import('./pages/Profile'))
const NotFound = React.lazy(() => import('./pages/NotFound'))

function App() {
  // Use hooks properly
  getCurrentUser()
  getOtherUsers()
  
  const { userData, isLoadingAuth } = useSelector(state => state.user)
  
  // Memoize the loading check to prevent unnecessary re-renders
  const isLoading = useMemo(() => isLoadingAuth, [isLoadingAuth])
  
  // Show loading screen while checking authentication
  if (isLoading) {
    return <LoadingPage message="Checking authentication..." />
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingPage message="Loading application..." />}>
        <Routes>
          <Route path='/login' element={!userData ? <Login /> : <Navigate to="/" replace />} />
          <Route path='/signup' element={!userData ? <SignUp /> : <Navigate to="/" replace />} />
          <Route path='/forgot-password' element={!userData ? <ForgotPassword /> : <Navigate to="/" replace />} />
          <Route path='/' element={userData ? <Home /> : <Navigate to="/login" replace />} />
          <Route path='/profile' element={userData ? <Profile /> : <Navigate to="/login" replace />} />
          <Route path='*' element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}


export default App