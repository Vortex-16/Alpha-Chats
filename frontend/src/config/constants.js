// Server configuration with proper URL handling
const getServerUrl = () => {
  // Get the environment variable
  const envUrl = import.meta.env.VITE_API_URL;
  
  // Debug logging
  console.log('🔧 VITE_API_URL from env:', envUrl);
  console.log('🔧 All env vars:', import.meta.env);
  console.log('🔧 NODE_ENV:', import.meta.env.NODE_ENV);
  console.log('🔧 PROD mode:', import.meta.env.PROD);
  console.log('🔧 DEV mode:', import.meta.env.DEV);
  
  // Force local development for now
  if (import.meta.env.DEV) {
    console.log('🔧 FORCING LOCAL DEVELOPMENT URL');
    return "http://localhost:5000";
  }
  
  if (envUrl) {
    // Ensure no double slashes and proper format
    const cleanUrl = envUrl.replace(/\/+$/, ''); // Remove trailing slashes
    console.log('🔧 Using environment URL:', cleanUrl);
    return cleanUrl;
  }
  
  // Development fallback - use local server for development
  if (!import.meta.env.PROD) {
    console.log('🔧 Using local development server');
    return "http://localhost:5000";
  }
  
  // Production fallback
  console.log('🔧 Using production server');
  return "https://alpha-chats-new.onrender.com";
};

export const serverUrl = getServerUrl();

// Debug logging for development
if (!import.meta.env.PROD) {
  console.log('🔧 Server URL configured:', serverUrl);
  console.log('🔧 Environment:', import.meta.env.PROD ? 'Production' : 'Development');
  console.log('🔧 VITE_API_URL:', import.meta.env.VITE_API_URL);
}
