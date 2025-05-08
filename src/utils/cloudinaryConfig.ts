// src/utils/cloudinaryConfig.ts
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  // This will use the CLOUDINARY_URL from env variables automatically
  // Format: cloudinary://API_KEY:API_SECRET@CLOUD_NAME
  secure: true
});

export default cloudinary;