// src/utils/cloudinaryConfig.ts - FIXED: Better environment variable handling
import { v2 as cloudinary } from 'cloudinary';

// Debug function to check environment variables
export const debugCloudinaryEnv = () => {
  console.log('=== Cloudinary Environment Debug ===');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? 'SET' : 'MISSING');
  console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? 'SET' : 'MISSING');
  console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? 'SET' : 'MISSING');
  
  // Show first few characters for debugging (don't log full secrets)
  if (process.env.CLOUDINARY_CLOUD_NAME) {
    console.log('Cloud Name starts with:', process.env.CLOUDINARY_CLOUD_NAME.substring(0, 3) + '...');
  }
  if (process.env.CLOUDINARY_API_KEY) {
    console.log('API Key starts with:', process.env.CLOUDINARY_API_KEY.substring(0, 3) + '...');
  }
  console.log('=====================================');
};

// Check if environment variables are available
export const checkCloudinaryConfig = () => {
  const requiredEnvs = [
    'CLOUDINARY_CLOUD_NAME', 
    'CLOUDINARY_API_KEY', 
    'CLOUDINARY_API_SECRET'
  ];
  
  const missing = requiredEnvs.filter(env => !process.env[env]);
  
  if (missing.length > 0) {
    // Debug information
    debugCloudinaryEnv();
    
    throw new Error(`Missing Cloudinary environment variables: ${missing.join(', ')}`);
  }
  
  return true;
};

// Configure Cloudinary - call this in API routes, not at module level
export const configureCloudinary = () => {
  // Check environment variables first
  checkCloudinaryConfig();
  
  // Configure Cloudinary
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
  
  console.log('Cloudinary configured successfully');
  return cloudinary;
};

// Default export for backward compatibility
export default cloudinary;