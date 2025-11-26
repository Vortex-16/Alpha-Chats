import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { serverUrl } from '../config/constants';
import { LoadingPage } from './LoadingSpinner';

const BackendHealthCheck = ({ children }) => {
  const [backendStatus, setBackendStatus] = useState({
    isLoading: true,
    isReady: false,
    error: null,
    retryCount: 0
  });

  const MAX_RETRIES = 10;
  const RETRY_DELAY = 3000; // 3 seconds between retries

  useEffect(() => {
    let isMounted = true;
    let timeoutId;

    const checkBackendHealth = async (retryCount = 0) => {
      if (!isMounted) return;

      try {
        console.log(`🏥 [Health Check] Attempt ${retryCount + 1}/${MAX_RETRIES + 1} - Checking backend at ${serverUrl}`);
        
        // Make a simple health check request with a short timeout
        const response = await axios.get(`${serverUrl}/api/auth/health`, {
          timeout: 10000, // 10 second timeout
          withCredentials: true,
          validateStatus: (status) => status < 500 // Accept any status < 500
        });

        if (isMounted) {
          console.log('✅ [Health Check] Backend is ready!', response.data);
          setBackendStatus({
            isLoading: false,
            isReady: true,
            error: null,
            retryCount
          });
        }
      } catch (error) {
        console.warn(`⚠️ [Health Check] Attempt ${retryCount + 1} failed:`, error.message);

        if (!isMounted) return;

        // If we haven't exceeded max retries, try again
        if (retryCount < MAX_RETRIES) {
          const delay = RETRY_DELAY * (retryCount + 1); // Exponential backoff
          console.log(`🔄 [Health Check] Retrying in ${delay/1000} seconds...`);
          
          setBackendStatus(prev => ({
            ...prev,
            retryCount: retryCount + 1
          }));

          timeoutId = setTimeout(() => {
            checkBackendHealth(retryCount + 1);
          }, delay);
        } else {
          // Max retries exceeded
          console.error('❌ [Health Check] Backend unavailable after maximum retries');
          setBackendStatus({
            isLoading: false,
            isReady: false,
            error: 'Backend server is not responding. Please try again later.',
            retryCount
          });
        }
      }
    };

    // Start the health check
    checkBackendHealth(0);

    // Cleanup function
    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  // Show loading screen while checking backend
  if (backendStatus.isLoading) {
    const message = backendStatus.retryCount > 0 
      ? `Connecting to server... (Attempt ${backendStatus.retryCount + 1}/${MAX_RETRIES + 1})`
      : 'Connecting to server...';
    
    return <LoadingPage message={message} />;
  }

  // Show error screen if backend is not available
  if (!backendStatus.isReady && backendStatus.error) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-100 dark:bg-[#181c2f]">
        <div className="bg-pastel-cream dark:bg-[#23234a] p-8 rounded-lg shadow-lg border border-red-300 dark:border-red-500/30 max-w-md">
          <div className="text-center">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">
              Connection Error
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {backendStatus.error}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-pastel-rose dark:bg-[#39ff14] text-white dark:text-[#181c2f] rounded-lg hover:opacity-90 transition-opacity font-medium"
            >
              Retry Connection
            </button>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-4">
              Server may be starting up. This usually takes 30-60 seconds for Render free tier.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Backend is ready, render the app
  return <>{children}</>;
};

export default BackendHealthCheck;
