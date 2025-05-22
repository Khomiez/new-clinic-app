// src/utils/cloudinaryUploader.ts - Complete file with Thai filename support
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
    [key: string]: string;
  };
  tags?: string[];
}

interface GetResourcesResult {
  success: boolean;
  resources?: CloudinaryResource[];
  error?: string;
}

/**
 * Get original filename from Cloudinary resource with Thai character support
 * Priority: context.original_filename > original_filename > extract from public_id > fallback
 */
export function getOriginalFilename(resource: CloudinaryResource): string {
  // Priority 1: Original filename from context (our fix for Thai characters)
  if (resource.context?.original_filename) {
    return resource.context.original_filename;
  }

  // Priority 2: Original filename property from Cloudinary
  if (resource.original_filename) {
    return resource.original_filename;
  }

  // Priority 3: Extract from public_id as last resort
  if (resource.public_id) {
    const parts = resource.public_id.split("/");
    const lastPart = parts[parts.length - 1];
    // Remove timestamp suffix if present (_1234567890)
    const cleanName = lastPart.replace(/_\d+$/, "");
    if (cleanName && cleanName !== "document") {
      return cleanName + (resource.format ? `.${resource.format}` : "");
    }
  }

  // Priority 4: Fallback
  return `Document.${resource.format || "file"}`;
}

/**
 * Create safe filename for Cloudinary public_id (ASCII only)
 * While preserving original filename in context
 */
function createSafePublicId(filename: string): string {
  // Remove file extension for public_id
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");

  // Create safe version for public_id (ASCII only)
  return nameWithoutExt
    .replace(/[^a-zA-Z0-9.-_]/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_|_$/g, "");
}

/**
 * Upload file to Cloudinary with proper Thai filename preservation
 */
export async function uploadToCloudinary(
  file: Buffer,
  options: UploadOptions
): Promise<UploadResult> {
  try {
    const {
      clinicId,
      clinicName,
      filename = "document",
      fileType,
      patientId,
    } = options;

    // Create folder structure with safe names
    const sanitizedClinicName = clinicName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_");
    const folder = `clinic_management/${sanitizedClinicName}`;

    // Create unique public ID with safe characters only
    const timestamp = Date.now();
    const safeFilename = createSafePublicId(filename);
    const publicId = `${folder}/${
      patientId || "general"
    }/${safeFilename}_${timestamp}`;

    // Convert buffer to base64
    const base64File = `data:${
      fileType || "application/octet-stream"
    };base64,${file.toString("base64")}`;

    // Upload to Cloudinary with original filename preserved in context
    const result = await cloudinary.uploader.upload(base64File, {
      public_id: publicId,
      resource_type: "auto",
      // CRITICAL: Store original filename and metadata in context
      context: {
        clinic_id: clinicId,
        patient_id: patientId || "general",
        original_filename: filename, // This preserves Thai characters like "ดัมมี่.pdf"
      },
      tags: [
        `clinic_${clinicId}`,
        "patient_documents",
        patientId ? `patient_${patientId}` : "general",
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

/**
 * Delete file from Cloudinary
 */
export async function deleteFromCloudinary(
  publicId: string
): Promise<UploadResult> {
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
    const sanitizedClinicName = clinicName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_");
    const folderPrefix = `clinic_management/${sanitizedClinicName}`;

    const result = await cloudinary.api.resources({
      type: "upload",
      prefix: folderPrefix,
      max_results: 500,
      context: true, // Include context data (important for original_filename)
      tags: true, // Include tags
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
      if (status === "deleted") {
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
    // Use the correct Cloudinary API method for updating context
    const result = await cloudinary.api.update(publicId, {
      context: context,
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
