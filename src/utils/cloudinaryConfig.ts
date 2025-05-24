// src/utils/cloudinaryConfig.ts - FIXED: Better environment variable handling
import { v2 as cloudinary } from 'cloudinary';

// Debug function to check environment variables
export const debugCloudinaryEnv = () => {
  console.log('=== Cloudinary Environment Debug ===');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? 'SET' : 'MISSING');
  console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? 'SET' : 'MISSING');
  console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? 'SET' : 'MISSING');
  
  // Show actual values for debugging (don't do this in production)
  if (process.env.NODE_ENV === 'development') {
    console.log('Cloud Name value:', process.env.CLOUDINARY_CLOUD_NAME);
    console.log('API Key value:', process.env.CLOUDINARY_API_KEY);
    console.log('API Secret (first 10 chars):', process.env.CLOUDINARY_API_SECRET?.substring(0, 10) + '...');
  }
  console.log('=====================================');
};

// Check if environment variables are available
export const checkCloudinaryConfig = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  const requiredEnvs = [];
  if (!cloudName) requiredEnvs.push('CLOUDINARY_CLOUD_NAME');
  if (!apiKey) requiredEnvs.push('CLOUDINARY_API_KEY');
  if (!apiSecret) requiredEnvs.push('CLOUDINARY_API_SECRET');
  
  if (requiredEnvs.length > 0) {
    debugCloudinaryEnv();
    throw new Error(`Missing Cloudinary environment variables: ${requiredEnvs.join(', ')}`);
  }
  
  return { cloudName, apiKey, apiSecret };
};

// Configure Cloudinary - call this in API routes, not at module level
export const configureCloudinary = () => {
  // Check environment variables first
  const { cloudName, apiKey, apiSecret } = checkCloudinaryConfig();
  
  // Reset any existing configuration
  cloudinary.config({
    cloud_name: undefined,
    api_key: undefined,
    api_secret: undefined,
  });
  
  // Configure Cloudinary with fresh values
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true
  });
  
  console.log('Cloudinary configured successfully with cloud:', cloudName);
  return cloudinary;
};

// Test Cloudinary connection
export const testCloudinaryConnection = async () => {
  try {
    const cloudinaryInstance = configureCloudinary();
    const result = await cloudinaryInstance.api.ping();
    console.log('Cloudinary ping successful:', result);
    return { success: true, result };
  } catch (error: any) {
    console.error('Cloudinary ping failed:', error);
    return { success: false, error: error.message };
  }
};

// Default export for backward compatibility
export default cloudinary;