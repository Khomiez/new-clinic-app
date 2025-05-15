// src/utils/cloudinaryUploader.ts - Server-side only Cloudinary utilities
import { v2 as cloudinary } from "cloudinary";
import type { UploadApiResponse, UploadApiOptions } from "cloudinary";

cloudinary.config({
  secure: true,
});

interface CloudinaryResource {
  public_id: string;
  secure_url: string;
  url: string;
  format: string;
  resource_type: string;
  created_at: string;
  bytes: number;
  width?: number;
  height?: number;
  context?: {
    [key: string]: string;
  };
  tags?: string[];
  original_filename?: string;
}

type UploadOptions = {
  clinicId: string;
  clinicName: string;
  filename?: string;
  fileType?: string;
  patientId?: string;
  tags?: string[];
};

type UploadResponse =
  | {
      success: true;
      url: string;
      public_id: string;
      format: string;
      resource_type: string;
      created_at: string;
      original_filename: string;
    }
  | {
      success: false;
      error: string;
    };

// Helper function to sanitize filename for Cloudinary
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special characters with underscore
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
}

export async function uploadToCloudinary(
  file: Buffer,
  options: UploadOptions
): Promise<UploadResponse> {
  try {
    // Sanitize clinic name for folder path
    const sanitizedClinicName = options.clinicName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_");

    // Extract filename without extension for public_id
    const originalFilename = options.filename || `document_${Date.now()}`;
    const fileExtension = originalFilename.split('.').pop() || '';
    const filenameWithoutExt = originalFilename.replace(/\.[^/.]+$/, '');
    const sanitizedFilename = sanitizeFilename(filenameWithoutExt);

    // Construct the folder path
    const folder = `clinic_management/${sanitizedClinicName}`;

    // Generate a unique public ID that includes the original filename
    const timestamp = Date.now();
    const publicId = `${folder}/${
      options.patientId || "general"
    }/${sanitizedFilename}_${timestamp}`;

    // Prepare upload options
    const uploadOptions: UploadApiOptions = {
      folder,
      public_id: publicId,
      resource_type: "auto",
      // Preserve original filename in metadata
      context: {
        clinic_id: options.clinicId,
        patient_id: options.patientId || "general",
        alt: originalFilename,
        original_filename: originalFilename, // Store original filename
      },
      tags: [
        ...(options.tags || []),
        `clinic_${options.clinicId}`,
        "patient_documents",
        fileExtension ? `type_${fileExtension}` : "unknown_type"
      ],
      // Use filename as display name in Cloudinary
      use_filename: true,
      unique_filename: true,
    };

    // Convert buffer to base64 string for upload
    const base64File = `data:${
      options.fileType || "application/octet-stream"
    };base64,${file.toString("base64")}`;

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(base64File, uploadOptions);

    return {
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      resource_type: result.resource_type,
      created_at: result.created_at,
      original_filename: originalFilename,
    };
  } catch (error: any) {
    console.error("Cloudinary upload error:", error);
    return {
      success: false,
      error: error.message || "Upload failed",
    };
  }
}

// Update the get clinic resources function to include original filename
export async function getClinicResources(
  clinicId: string,
  clinicName: string
): Promise<{
  success: boolean;
  resources?: CloudinaryResource[];
  error?: string;
}> {
  try {
    const sanitizedClinicName = clinicName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_");

    const folder = `clinic_management/${sanitizedClinicName}`;

    const result = await cloudinary.search
      .expression(`folder:${folder}`)
      .with_field("context")
      .with_field("tags")
      .max_results(500)
      .execute();

    // Map resources to include original filename from context
    const resourcesWithFilename = result.resources.map((resource: any) => ({
      ...resource,
      original_filename: resource.context?.original_filename || 
                        resource.context?.alt || 
                        extractFilenameFromPublicId(resource.public_id),
    }));

    return {
      success: true,
      resources: resourcesWithFilename,
    };
  } catch (error: any) {
    console.error("Cloudinary search error:", error);
    return {
      success: false,
      error: error.message || "Search failed",
    };
  }
}

// Helper function to extract filename from public_id if context is missing
function extractFilenameFromPublicId(publicId: string): string {
  const parts = publicId.split('/');
  const lastPart = parts[parts.length - 1];
  // Remove timestamp suffix and sanitization
  const cleanedName = lastPart.replace(/_\d+$/, '').replace(/_/g, ' ');
  return cleanedName || 'Document';
}

export async function deleteFromCloudinary(
  publicId: string
): Promise<{ success: boolean; error?: string }> {
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

// Simple client-safe function to extract public ID
export function extractPublicIdFromUrl(url: string): string | null {
  try {
    const regex = /\/v\d+\/([^/]+\.[^/?]+)/;
    const match = url.match(regex);

    if (match && match[1]) {
      return match[1].split('.')[0];
    }

    // For folders, the pattern might include paths
    const folderRegex = /\/v\d+\/(.+)\.[^/?]+/;
    const folderMatch = url.match(folderRegex);

    if (folderMatch && folderMatch[1]) {
      return folderMatch[1];
    }

    return null;
  } catch (error) {
    console.error("Error extracting public ID:", error);
    return null;
  }
}