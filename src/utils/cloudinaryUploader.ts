// src/utils/cloudinaryUploader.ts - ENHANCED: Added detailed debugging
import { v2 as cloudinary } from "cloudinary";
import { configureCloudinary, debugCloudinaryEnv } from "./cloudinaryConfig";

interface UploadOptions {
  clinicId: string;
  clinicName: string;
  filename?: string;
  fileType?: string;
  patientId?: string;
}

interface UploadResult {
  success: boolean;
  url?: string;
  public_id?: string;
  originalFilename?: string;
  error?: string;
}

interface CloudinaryResource {
  public_id: string;
  secure_url: string;
  format: string;
  resource_type: string;
  created_at: string;
  bytes?: number;
  original_filename?: string;
  context?: {
    [key: string]: any;
  };
  tags?: string[];
}

interface GetResourcesResult {
  success: boolean;
  resources?: CloudinaryResource[];
  error?: string;
}

/**
 * Create safe folder name while preserving Thai characters
 */
function createSafeClinicFolderName(clinicName: string): string {
  if (!clinicName) return "default_clinic";
  
  return clinicName
    .trim()
    .replace(/[\/\\:*?"<>|]/g, "_") // Replace file system problematic chars
    .replace(/\s+/g, "_") // Replace spaces with underscores
    .replace(/_{2,}/g, "_") // Replace multiple underscores with single
    .replace(/^_|_$/g, ""); // Remove leading/trailing underscores
}

/**
 * Create safe filename for Cloudinary public_id while preserving Thai
 */
function createSafePublicId(filename: string): string {
  if (!filename) return "document";
  
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  
  return nameWithoutExt
    .replace(/[\/\\:*?"<>|]/g, '_') // Replace problematic file chars
    .replace(/\s+/g, '_') // Replace spaces
    .replace(/_{2,}/g, '_') // Multiple underscores to single
    .replace(/^_|_$/g, '') // Remove leading/trailing underscores
    || "document"; // Fallback if empty
}

/**
 * Get original filename from Cloudinary resource
 */
export function getOriginalFilename(resource: CloudinaryResource): string {
  // Priority 1: Context contains original filename
  if (resource.context?.original_filename) {
    return resource.context.original_filename;
  }
  
  // Priority 2: Parse context string format (key1=value1|key2=value2)
  if (resource.context && typeof resource.context === 'string') {
    const contextStr = resource.context as string;
    const contextPairs = contextStr.split('|');
    for (const pair of contextPairs) {
      const [key, value] = pair.split('=');
      if (key === 'original_filename' && value) {
        try {
          return decodeURIComponent(value);
        } catch {
          return value;
        }
      }
    }
  }
  
  // Priority 3: Check tags for filename
  if (resource.tags && resource.tags.length > 0) {
    for (const tag of resource.tags) {
      if (tag.startsWith('filename:')) {
        return tag.substring(9);
      }
    }
  }
  
  // Priority 4: Use original_filename property
  if (resource.original_filename) {
    return resource.original_filename;
  }
  
  // Priority 5: Extract from public_id
  if (resource.public_id) {
    const parts = resource.public_id.split('/');
    const lastPart = parts[parts.length - 1];
    const cleanName = lastPart.replace(/_\d+$/, ''); // Remove timestamp suffix
    
    if (cleanName && cleanName !== 'document') {
      return cleanName + (resource.format ? `.${resource.format}` : '');
    }
  }
  
  // Fallback
  return `Document.${resource.format || 'file'}`;
}

/**
 * ENHANCED: Upload file to Cloudinary with detailed debugging
 */
export async function uploadToCloudinary(
  file: Buffer,
  options: UploadOptions
): Promise<UploadResult> {
  console.log('🚀 Starting uploadToCloudinary function...');
  console.log('📊 Upload options:', {
    clinicId: options.clinicId,
    clinicName: options.clinicName,
    filename: options.filename,
    fileType: options.fileType,
    patientId: options.patientId,
    fileSize: file.length
  });

  try {
    // Step 1: Check environment variables
    console.log('🔧 Step 1: Checking environment variables...');
    const envVars = {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      apiSecret: process.env.CLOUDINARY_API_SECRET ? '[SET]' : '[MISSING]'
    };
    console.log('📋 Environment variables:', envVars);

    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      const missingVars = [];
      if (!process.env.CLOUDINARY_CLOUD_NAME) missingVars.push('CLOUDINARY_CLOUD_NAME');
      if (!process.env.CLOUDINARY_API_KEY) missingVars.push('CLOUDINARY_API_KEY');
      if (!process.env.CLOUDINARY_API_SECRET) missingVars.push('CLOUDINARY_API_SECRET');
      
      console.error('❌ Missing environment variables:', missingVars);
      debugCloudinaryEnv();
      return {
        success: false,
        error: `Missing Cloudinary environment variables: ${missingVars.join(', ')}. Please check your .env.local file.`,
      };
    }

    // Step 2: Configure Cloudinary
    console.log('🔧 Step 2: Configuring Cloudinary...');
    try {
      configureCloudinary();
      console.log('✅ Cloudinary configured successfully');
    } catch (configError: any) {
      console.error('❌ Cloudinary configuration failed:', configError);
      return {
        success: false,
        error: `Cloudinary configuration failed: ${configError.message}`,
      };
    }
    
    const { clinicId, clinicName, filename = 'document', fileType, patientId } = options;
    
    // Step 3: Prepare folder structure
    console.log('📁 Step 3: Preparing folder structure...');
    const safeClinicName = createSafeClinicFolderName(clinicName);
    const folder = `clinic_management/${safeClinicName}`;
    console.log('📁 Folder info:', {
      originalClinicName: clinicName,
      safeClinicName,
      finalFolder: folder
    });
    
    // Step 4: Create public ID
    console.log('🏷️ Step 4: Creating public ID...');
    const timestamp = Date.now();
    const safeFilename = createSafePublicId(filename);
    const publicId = `${folder}/${safeFilename}_${timestamp}`;
    console.log('🏷️ Public ID info:', {
      originalFilename: filename,
      safeFilename,
      timestamp,
      publicId
    });

    // Step 5: Convert buffer to base64
    console.log('🔄 Step 5: Converting file to base64...');
    const base64File = `data:${fileType || "application/octet-stream"};base64,${file.toString("base64")}`;
    console.log('🔄 Base64 conversion complete, length:', base64File.length);

    // Step 6: Prepare upload options
    console.log('⚙️ Step 6: Preparing upload options...');
    const uploadOptions = {
      public_id: publicId,
      resource_type: "auto" as const,
      context: {
        clinic_id: clinicId,
        clinic_name: clinicName,
        original_filename: filename,
        patient_id: patientId || "general",
        upload_timestamp: new Date().toISOString(),
      },
      tags: [
        `clinic_${clinicId}`,
        "patient_documents",
        patientId ? `patient_${patientId}` : "general",
        `filename:${filename}`,
        "clinic_management"
      ],
      folder: folder,
    };
    console.log('⚙️ Upload options:', uploadOptions);

    // Step 7: Upload to Cloudinary
    console.log('☁️ Step 7: Uploading to Cloudinary...');
    console.log('☁️ Starting cloudinary.uploader.upload...');
    
    const result = await cloudinary.uploader.upload(base64File, uploadOptions);
    
    console.log('✅ Cloudinary upload successful!');
    console.log('📊 Upload result:', {
      secure_url: result.secure_url,
      public_id: result.public_id,
      folder: result.folder,
      format: result.format,
      bytes: result.bytes,
      resource_type: result.resource_type
    });

    return {
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
      originalFilename: filename,
    };
  } catch (error: any) {
    console.error('❌ uploadToCloudinary error occurred:');
    console.error('❌ Error type:', error.constructor.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    
    // More specific error handling
    if (error.message?.includes('Invalid API Key')) {
      return {
        success: false,
        error: "Invalid Cloudinary API Key. Please check your CLOUDINARY_API_KEY in .env.local",
      };
    }
    
    if (error.message?.includes('Invalid API Secret')) {
      return {
        success: false,
        error: "Invalid Cloudinary API Secret. Please check your CLOUDINARY_API_SECRET in .env.local",
      };
    }
    
    if (error.message?.includes('Must supply cloud_name')) {
      return {
        success: false,
        error: "Missing Cloudinary Cloud Name. Please check your CLOUDINARY_CLOUD_NAME in .env.local",
      };
    }
    
    if (error.message?.includes('Missing Cloudinary environment variables')) {
      debugCloudinaryEnv();
      return {
        success: false,
        error: "Cloudinary configuration error. Please check your environment variables in .env.local",
      };
    }
    
    return {
      success: false,
      error: `Upload failed: ${error.message}`,
    };
  }
}

/**
 * Delete file from Cloudinary
 */
export async function deleteFromCloudinary(publicId: string): Promise<UploadResult> {
  try {
    configureCloudinary();
    
    console.log('Attempting to delete from Cloudinary:', publicId);
    
    const result = await cloudinary.uploader.destroy(publicId);
    
    console.log('Cloudinary delete result:', result);
    
    if (result.result === "ok") {
      return { success: true };
    } else {
      return {
        success: false,
        error: `Failed to delete: ${result.result}`,
      };
    }
  } catch (error: any) {
    console.error("Cloudinary delete error:", error);
    return {
      success: false,
      error: error.message || "Delete failed",
    };
  }
}

/**
 * Get all resources for a clinic with proper folder structure
 */
export async function getClinicResources(
  clinicId: string, 
  clinicName: string
): Promise<GetResourcesResult> {
  try {
    configureCloudinary();
    
    const safeClinicName = createSafeClinicFolderName(clinicName);
    const folderPrefix = `clinic_management/${safeClinicName}`;

    console.log('Fetching resources for folder:', folderPrefix);

    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: folderPrefix,
      max_results: 500,
      context: true,
      tags: true,
    });

    console.log('Found resources:', {
      count: result.resources?.length || 0,
      folderPrefix
    });

    return {
      success: true,
      resources: result.resources || [],
    };
  } catch (error: any) {
    console.error("Get clinic resources error:", error);
    return {
      success: false,
      error: error.message || "Failed to fetch resources",
    };
  }
}

/**
 * Extract public ID from Cloudinary URL
 */
export function extractPublicIdFromUrl(url: string): string | null {
  try {
    const match = url.match(/\/v\d+\/(.+)\.[^/?]+/);
    if (match) {
      const publicId = match[1];
      console.log('Extracted public ID:', publicId, 'from URL:', url);
      return publicId;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Batch delete multiple files from Cloudinary
 */
export async function batchDeleteFromCloudinary(publicIds: string[]): Promise<{
  success: boolean;
  deleted: string[];
  failed: string[];
  error?: string;
}> {
  try {
    configureCloudinary();
    
    if (publicIds.length === 0) {
      return { success: true, deleted: [], failed: [] };
    }

    console.log('Batch deleting files:', publicIds);

    const result = await cloudinary.api.delete_resources(publicIds);
    
    console.log('Batch delete result:', result);
    
    const deleted: string[] = [];
    const failed: string[] = [];
    
    Object.entries(result.deleted || {}).forEach(([id, status]) => {
      if (status === 'deleted') {
        deleted.push(id);
      } else {
        failed.push(id);
      }
    });

    Object.entries(result.partial || {}).forEach(([id]) => {
      failed.push(id);
    });

    return {
      success: true,
      deleted,
      failed,
    };
  } catch (error: any) {
    console.error("Batch delete error:", error);
    return {
      success: false,
      deleted: [],
      failed: publicIds,
      error: error.message || "Batch delete failed",
    };
  }
}