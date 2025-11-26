/**
 * Utility functions for handling images and preventing tracking issues
 */

/**
 * Transform Cloudinary URL to bypass tracking prevention
 * Adds fetch format and delivery type parameters
 * @param {string} imageUrl - The original Cloudinary image URL
 * @returns {string} - The transformed URL
 */
export const getCloudinaryUrl = (imageUrl) => {
  if (!imageUrl) return null;
  
  // If it's not a Cloudinary URL, return as is
  if (!imageUrl.includes('cloudinary.com')) {
    return imageUrl;
  }
  
  try {
    const url = new URL(imageUrl);
    
    // Ensure HTTPS
    url.protocol = 'https:';
    
    // Add fetch format parameter to ensure browser compatibility
    const pathParts = url.pathname.split('/');
    const uploadIndex = pathParts.indexOf('upload');
    
    if (uploadIndex !== -1) {
      // Add transformations after 'upload'
      // f_auto: auto format selection
      // q_auto: auto quality
      const transformations = 'f_auto,q_auto:good';
      
      // Check if there are already transformations
      if (pathParts[uploadIndex + 1] && pathParts[uploadIndex + 1].includes('v')) {
        // Version exists, insert before it
        pathParts.splice(uploadIndex + 1, 0, transformations);
      } else {
        // No version, just add after upload
        pathParts.splice(uploadIndex + 1, 0, transformations);
      }
      
      url.pathname = pathParts.join('/');
    }
    
    return url.toString();
  } catch (error) {
    console.error('Error transforming Cloudinary URL:', error);
    return imageUrl;
  }
};

/**
 * Handle image load errors by using fallback
 * @param {Event} event - The error event
 * @param {string} fallbackSrc - Fallback image source
 */
export const handleImageError = (event, fallbackSrc) => {
  if (event.target && fallbackSrc) {
    event.target.onerror = null; // Prevent infinite loop
    event.target.src = fallbackSrc;
  }
};

/**
 * Preload images to avoid tracking prevention issues
 * @param {string[]} imageUrls - Array of image URLs to preload
 */
export const preloadImages = (imageUrls) => {
  if (!Array.isArray(imageUrls)) return;
  
  imageUrls.forEach(url => {
    if (url) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.referrerPolicy = 'no-referrer';
      img.src = getCloudinaryUrl(url);
    }
  });
};

/**
 * Get image props for consistent rendering
 * @param {string} src - Image source URL
 * @param {string} fallback - Fallback image
 * @returns {object} - Props object for img tag
 */
export const getImageProps = (src, fallback) => ({
  src: getCloudinaryUrl(src) || fallback,
  crossOrigin: 'anonymous',
  referrerPolicy: 'no-referrer',
  loading: 'lazy',
  onError: (e) => handleImageError(e, fallback),
});
