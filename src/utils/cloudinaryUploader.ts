// src/utils/cloudinaryUploader.ts - Fixed with proper Thai filename handling
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
  originalFilename?: string; // Add original filename to result
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
    [key: string]: string;
  };
  tags?: string[];
}

interface GetResourcesResult {
  success: boolean;
  resources?: CloudinaryResource[];
  error?: string;
}

// Safe filename for Cloudinary public_id (but preserve original in context)
function createSafePublicId(filename: string): string {
  // Remove file extension for public_id
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  
  // Create safe version for public_id (ASCII only)
  return nameWithoutExt
    .replace(/[^a-zA-Z0-9.-_]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '');
}

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

    // Upload to Cloudinary with original filename preserved in context
    const result = await cloudinary.uploader.upload(base64File, {
      public_id: publicId,
      resource_type: "auto",
      // Store original filename and metadata in context
      context: {
        clinic_id: clinicId,
        patient_id: patientId || "general",
        original_filename: filename, // Preserve exact original filename here
      },
      tags: [
        `clinic_${clinicId}`,
        "patient_documents",
        patientId ? `patient_${patientId}` : "general"
      ],
    });

    return {
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
      originalFilename: filename, // Return the original filename
    };
  } catch (error: any) {
    console.error("Cloudinary upload error:", error);
    return {
      success: false,
      error: error.message || "Upload failed",
    };
  }
}

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

// Get all resources for a clinic with proper filename extraction
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
      context: true, // Include context data
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

// Extract public ID from Cloudinary URL
export function extractPublicIdFromUrl(url: string): string | null {
  try {
    const match = url.match(/\/v\d+\/(.+)\.[^/?]+/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

// Get original filename from Cloudinary resource
export function getOriginalFilename(resource: CloudinaryResource): string {
  // Priority order for getting filename:
  // 1. Original filename from context
  // 2. Original filename property
  // 3. Extract from public_id
  // 4. Fallback to "Document"
  
  if (resource.context?.original_filename) {
    return resource.context.original_filename;
  }
  
  if (resource.original_filename) {
    return resource.original_filename;
  }
  
  // Extract from public_id as last resort
  if (resource.public_id) {
    const parts = resource.public_id.split('/');
    const lastPart = parts[parts.length - 1];
    // Remove timestamp suffix if present
    const cleanName = lastPart.replace(/_\d+$/, '');
    if (cleanName && cleanName !== 'document') {
      return cleanName + (resource.format ? `.${resource.format}` : '');
    }
  }
  
  return `Document.${resource.format || 'file'}`;
}