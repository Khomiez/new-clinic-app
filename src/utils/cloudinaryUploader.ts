// src/utils/cloudinaryUploader.ts - Complete file with fixed Thai filename handling
import { v2 as cloudinary } from "cloudinary";

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
    [key: string]: any; // Changed to 'any' to allow nested objects
  };
  tags?: string[];
}

interface GetResourcesResult {
  success: boolean;
  resources?: CloudinaryResource[];
  error?: string;
}

/**
 * Get original filename from Cloudinary resource with better fallback logic
 */
export function getOriginalFilename(resource: CloudinaryResource): string {
  console.log('Getting filename for resource:', {
    public_id: resource.public_id,
    context: resource.context,
    original_filename: resource.original_filename,
    format: resource.format
  });

  // Priority 1: Original filename from context string (Cloudinary format: key1=value1|key2=value2)
  if (resource.context && typeof resource.context === 'object') {
    // Handle object-style context
    if (resource.context.original_filename) {
      console.log('Found filename in context object:', resource.context.original_filename);
      return resource.context.original_filename;
    }
    
    // Handle custom nested object
    if (resource.context.custom?.original_filename) {
      console.log('Found filename in context.custom:', resource.context.custom.original_filename);
      return resource.context.custom.original_filename;
    }
  }

  // Priority 2: Parse context string format (key1=value1|key2=value2)
  if (resource.context && typeof resource.context === 'string') {
    const contextPairs = (resource.context as string).split('|');
    for (const pair of contextPairs) {
      const [key, value] = pair.split('=');
      if (key === 'original_filename' && value) {
        console.log('Found filename in context string:', value);
        return decodeURIComponent(value);
      }
    }
  }
  
  // Priority 3: Original filename property from Cloudinary
  if (resource.original_filename) {
    console.log('Found filename in original_filename property:', resource.original_filename);
    return resource.original_filename;
  }
  
  // Priority 4: Check tags for filename
  if (resource.tags && resource.tags.length > 0) {
    for (const tag of resource.tags) {
      if (tag.startsWith('filename:')) {
        const extractedName = tag.substring(9); // Remove 'filename:' prefix
        if (extractedName) {
          console.log('Found filename in tags:', extractedName);
          return extractedName;
        }
      }
    }
  }
  
  // Priority 5: Try to extract meaningful name from public_id
  if (resource.public_id) {
    const parts = resource.public_id.split('/');
    const lastPart = parts[parts.length - 1];
    
    // Remove timestamp suffix if present (_1234567890)
    const cleanName = lastPart.replace(/_\d+$/, '');
    
    console.log('Extracting from public_id:', {
      public_id: resource.public_id,
      lastPart,
      cleanName
    });
    
    if (cleanName && cleanName !== 'document' && cleanName.length > 1) {
      const filename = cleanName + (resource.format ? `.${resource.format}` : '');
      console.log('Extracted filename from public_id:', filename);
      return filename;
    }
  }
  
  // Priority 6: Fallback - Create descriptive name based on type and format
  const fallbackName = `Document.${resource.format || 'file'}`;
  console.log('Using fallback name:', fallbackName);
  return fallbackName;
}

/**
 * Create safe filename for Cloudinary public_id (ASCII only)
 * While preserving original filename in context
 */
function createSafePublicId(filename: string): string {
  // Remove file extension for public_id
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  
  // Create safe version for public_id (ASCII only)
  return nameWithoutExt
    .replace(/[^a-zA-Z0-9.-_]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Upload file to Cloudinary with proper Thai filename preservation
 */
export async function uploadToCloudinary(
  file: Buffer,
  options: UploadOptions
): Promise<UploadResult> {
  try {
    const { clinicId, clinicName, filename = 'document', fileType, patientId } = options;
    
    // Create folder structure with safe names
    const sanitizedClinicName = clinicName.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const folder = `clinic_management/${sanitizedClinicName}`;
    
    // Create unique public ID with safe characters only
    const timestamp = Date.now();
    const safeFilename = createSafePublicId(filename);
    const publicId = `${folder}/${patientId || "general"}/${safeFilename}_${timestamp}`;

    // Convert buffer to base64
    const base64File = `data:${fileType || "application/octet-stream"};base64,${file.toString("base64")}`;

    console.log('Uploading with original filename:', filename);

    // Upload to Cloudinary with original filename preserved in context
    const result = await cloudinary.uploader.upload(base64File, {
      public_id: publicId,
      resource_type: "auto",
      // Simplified context structure to avoid TypeScript issues
      context: `clinic_id=${clinicId}|patient_id=${patientId || "general"}|original_filename=${filename}|upload_timestamp=${new Date().toISOString()}|clinic_name=${clinicName}`,
      tags: [
        `clinic_${clinicId}`,
        "patient_documents",
        patientId ? `patient_${patientId}` : "general",
        `filename:${filename}` // Also store as tag for backup
      ],
    });

    console.log('Upload successful, result:', {
      url: result.secure_url,
      public_id: result.public_id,
      originalFilename: filename
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
 * Get all resources for a clinic with proper filename extraction
 */
export async function getClinicResources(
  clinicId: string, 
  clinicName: string
): Promise<GetResourcesResult> {
  try {
    const sanitizedClinicName = clinicName.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const folderPrefix = `clinic_management/${sanitizedClinicName}`;

    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: folderPrefix,
      max_results: 500,
      context: true, // Include context data (important for original_filename)
      tags: true,    // Include tags
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

/**
 * Update file context (useful for updating metadata of existing files)
 */
export async function updateFileContext(
  publicId: string,
  context: Record<string, string>
): Promise<UploadResult> {
  try {
    // Convert context object to Cloudinary's string format
    const contextString = Object.entries(context)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('|');
    
    // Use the correct Cloudinary API method for updating context
    const result = await cloudinary.api.update(publicId, {
      context: contextString
    });
    
    return {
      success: true,
      public_id: publicId,
    };
  } catch (error: any) {
    console.error("Update context error:", error);
    return {
      success: false,
      error: error.message || "Failed to update context",
    };
  }
}

/**
 * Get file info by public ID
 */
export async function getFileInfo(publicId: string): Promise<{
  success: boolean;
  resource?: CloudinaryResource;
  error?: string;
}> {
  try {
    const result = await cloudinary.api.resource(publicId, {
      context: true,
      tags: true,
    });
    
    return {
      success: true,
      resource: result,
    };
  } catch (error: any) {
    console.error("Get file info error:", error);
    return {
      success: false,
      error: error.message || "Failed to get file info",
    };
  }
}