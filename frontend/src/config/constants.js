// Server configuration with proper URL handling
const getServerUrl = () => {
  // Get the environment variable
  const envUrl = import.meta.env.VITE_API_URL;
  
  if (envUrl) {
    // Ensure no double slashes and proper format
    return envUrl.replace(/\/+$/, ''); // Remove trailing slashes
  }
  
  // Development fallback - use Render URL if local server not available
  if (!import.meta.env.PROD) {
    return "https://alpha-chats-new.onrender.com";
  }
  
  // Production fallback
  return "https://alpha-chats-new.onrender.com";
};

export const serverUrl = getServerUrl();

// Debug logging for development
if (!import.meta.env.PROD) {
  console.log('🔧 Server URL configured:', serverUrl);
  console.log('🔧 Environment:', import.meta.env.PROD ? 'Production' : 'Development');
  console.log('🔧 VITE_API_URL:', import.meta.env.VITE_API_URL);
}
