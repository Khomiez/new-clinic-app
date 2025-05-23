// src/utils/cloudinaryUploader.ts - Enhanced with proper Thai filename preservation
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
 * Create safe folder name while preserving original for context
 */
function createSafeClinicFolderName(clinicName: string): string {
  // For folder names, we need ASCII-safe characters
  // But we'll preserve the original Thai name in context
  return clinicName
    .toLowerCase()
    .replace(/[^a-z0-9ก-๙\u0E00-\u0E7F]/g, "_") // Allow Thai characters but replace special chars
    .replace(/_{2,}/g, "_")
    .replace(/^_|_$/g, "");
}

/**
 * Create safe filename for Cloudinary public_id while preserving original
 */
function createSafePublicId(filename: string): string {
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  return nameWithoutExt
    .replace(/[^a-zA-Z0-9.-_ก-๙\u0E00-\u0E7F]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '');
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
        return decodeURIComponent(value);
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
 * Upload file to Cloudinary with proper Thai filename preservation
 */
export async function uploadToCloudinary(
  file: Buffer,
  options: UploadOptions
): Promise<UploadResult> {
  try {
    checkCloudinaryConfig();
    
    const { clinicId, clinicName, filename = 'document', fileType, patientId } = options;
    
    // Create folder structure: clinic_management/clinic_name/
    const safeClinicName = createSafeClinicFolderName(clinicName);
    const folder = `clinic_management/${safeClinicName}`;
    
    // Create unique public ID with safe characters
    const timestamp = Date.now();
    const safeFilename = createSafePublicId(filename);
    const publicId = `${folder}/${safeFilename}_${timestamp}`;

    // Convert buffer to base64
    const base64File = `data:${fileType || "application/octet-stream"};base64,${file.toString("base64")}`;

    console.log('Uploading to Cloudinary:', {
      folder,
      publicId,
      originalFilename: filename,
      clinicName
    });

    // Upload to Cloudinary with comprehensive metadata
    const result = await cloudinary.uploader.upload(base64File, {
      public_id: publicId,
      resource_type: "auto",
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
    });

    console.log('Upload successful:', {
      url: result.secure_url,
      public_id: result.public_id,
      original_filename: filename
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
    
    const result = await cloudinary.uploader.destroy(publicId);
    
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
 * Get all resources for a clinic
 */
export async function getClinicResources(
  clinicId: string, 
  clinicName: string
): Promise<GetResourcesResult> {
  try {
    checkCloudinaryConfig();
    
    const safeClinicName = createSafeClinicFolderName(clinicName);
    const folderPrefix = `clinic_management/${safeClinicName}`;

    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: folderPrefix,
      max_results: 500,
      context: true,
      tags: true,
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
    // Match pattern: https://res.cloudinary.com/{cloud_name}/{resource_type}/upload/v{version}/{public_id}.{format}
    const match = url.match(/\/v\d+\/(.+?)\.[^/?]+/);
    return match ? match[1] : null;
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

    const result = await cloudinary.api.delete_resources(publicIds);
    
    const deleted: string[] = [];
    const failed: string[] = [];
    
    Object.entries(result.deleted || {}).forEach(([id, status]) => {
      if (status === 'deleted') {
        deleted.push(id);
      } else {
        failed.push(id);
      }
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