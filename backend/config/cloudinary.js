import { v2 as cloudinary } from 'cloudinary';

const uplodOnCloudinary = async (fileBuffer, originalName) => {
    // Check if we're in development with mock credentials
    const isDevelopmentMock = process.env.NODE_ENV === 'development' && 
                              process.env.CLOUDINARY_CLOUD_NAME === 'dev-mock';
    
    if (isDevelopmentMock) {
        console.log('🟡 Development mode: Skipping Cloudinary upload, using placeholder');
        
        // Return a placeholder URL for development
        return `https://via.placeholder.com/400x300.png?text=Dev+Image`;
    }

    // Production/real Cloudinary configuration
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true // Always use HTTPS
    })

    try {
        console.log('📤 Uploading buffer to Cloudinary...');
        
        // Upload from buffer instead of file path
        const uploadResult = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                {
                    resource_type: 'auto',
                    folder: 'alpha-chats', // Optional: organize uploads in folders
                    public_id: `profile_${Date.now()}`, // Generate unique ID
                    access_mode: 'public', // Ensure images are publicly accessible
                    invalidate: true, // Invalidate CDN cache if updating
                },
                (error, result) => {
                    if (error) {
                        console.error('❌ Cloudinary upload error:', error);
                        reject(error);
                    } else {
                        console.log('✅ Cloudinary upload success:', result.secure_url);
                        resolve(result);
                    }
                }
            ).end(fileBuffer);
        });
        
        return uploadResult.secure_url;
    } catch (error) {
        console.error('❌ Cloudinary upload error:', error);
        throw error;
    }
}

export default uplodOnCloudinary;