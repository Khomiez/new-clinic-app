// src/utils/cloudinaryUploader.ts - COMPLETE FIXED VERSION: Proper Thai filename preservation & folder structure
import { v2 as cloudinary } from "cloudinary";
import { checkCloudinaryConfig } from "./cloudinaryConfig";

cloudinary.config({
  secure: true,
});

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
 * FIXED: Create safe folder name while preserving Thai characters
 * Now properly handles Thai clinic names for folder structure
 */
function createSafeClinicFolderName(clinicName: string): string {
  if (!clinicName) return "default_clinic";
  
  // For Thai names, we'll use a combination approach:
  // 1. Keep Thai characters as they are (Cloudinary supports UTF-8)
  // 2. Replace only truly problematic characters
  return clinicName
    .trim()
    .replace(/[\/\\:*?"<>|]/g, "_") // Replace file system problematic chars
    .replace(/\s+/g, "_") // Replace spaces with underscores
    .replace(/_{2,}/g, "_") // Replace multiple underscores with single
    .replace(/^_|_$/g, ""); // Remove leading/trailing underscores
}

/**
 * FIXED: Create safe filename for Cloudinary public_id while preserving Thai
 */
function createSafePublicId(filename: string): string {
  if (!filename) return "document";
  
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  
  // Preserve Thai characters, replace only problematic ones
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
 * FIXED: Upload file to Cloudinary with proper Thai filename preservation
 * Now follows exact folder structure: clinic_management/<clinic_name>/
 */
export async function uploadToCloudinary(
  file: Buffer,
  options: UploadOptions
): Promise<UploadResult> {
  try {
    checkCloudinaryConfig();
    
    const { clinicId, clinicName, filename = 'document', fileType, patientId } = options;
    
    console.log('Upload options received:', {
      clinicId,
      clinicName,
      originalFilename: filename,
      fileType,
      patientId
    });
    
    // FIXED: Create proper folder structure: clinic_management/<clinic_name>/
    const safeClinicName = createSafeClinicFolderName(clinicName);
    const folder = `clinic_management/${safeClinicName}`;
    
    console.log('Folder structure:', {
      originalClinicName: clinicName,
      safeClinicName,
      finalFolder: folder
    });
    
    // Create unique public ID with safe characters but preserve original in context
    const timestamp = Date.now();
    const safeFilename = createSafePublicId(filename);
    const publicId = `${folder}/${safeFilename}_${timestamp}`;

    console.log('Public ID creation:', {
      originalFilename: filename,
      safeFilename,
      publicId
    });

    // Convert buffer to base64
    const base64File = `data:${fileType || "application/octet-stream"};base64,${file.toString("base64")}`;

    console.log('Starting Cloudinary upload:', {
      folder,
      publicId,
      originalFilename: filename,
      clinicName,
      fileSize: file.length
    });

    // FIXED: Upload to Cloudinary with comprehensive metadata and proper context
    const result = await cloudinary.uploader.upload(base64File, {
      public_id: publicId,
      resource_type: "auto",
      // FIXED: Store original filename in context for proper retrieval
      context: {
        clinic_id: clinicId,
        clinic_name: clinicName,
        original_filename: filename, // This preserves Thai characters exactly
        patient_id: patientId || "general",
        upload_timestamp: new Date().toISOString(),
      },
      tags: [
        `clinic_${clinicId}`,
        "patient_documents",
        patientId ? `patient_${patientId}` : "general",
        `filename:${filename}`, // Also store in tags as backup
        "clinic_management"
      ],
      // FIXED: Add folder to ensure proper organization
      folder: folder,
    });

    console.log('Cloudinary upload successful:', {
      url: result.secure_url,
      public_id: result.public_id,
      folder: result.folder,
      original_filename: filename,
      context: result.context
    });

    return {
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
      originalFilename: filename,
    };
  } catch (error: any) {
    console.error("Cloudinary upload error:", error);
    return {
      success: false,
      error: error.message || "Upload failed",
    };
  }
}

/**
 * Delete file from Cloudinary
 */
export async function deleteFromCloudinary(publicId: string): Promise<UploadResult> {
  try {
    checkCloudinaryConfig();
    
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
 * FIXED: Get all resources for a clinic with proper folder structure
 */
export async function getClinicResources(
  clinicId: string, 
  clinicName: string
): Promise<GetResourcesResult> {
  try {
    checkCloudinaryConfig();
    
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
    // Updated pattern to handle folders properly
    // Pattern: https://res.cloudinary.com/{cloud_name}/{resource_type}/upload/v{version}/{folder}/{public_id}.{format}
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
    checkCloudinaryConfig();
    
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

    // Handle partial results from Cloudinary
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