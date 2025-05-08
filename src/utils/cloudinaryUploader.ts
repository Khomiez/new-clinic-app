// src/utils/cloudinaryUploader.ts
import { v2 as cloudinary } from "cloudinary";
import type { UploadApiResponse, UploadApiOptions } from "cloudinary";

// Configure Cloudinary (should be called once on server initialization)
// You need to set CLOUDINARY_URL in your .env file
cloudinary.config({
  // This will use the CLOUDINARY_URL from env variables
  // Format: cloudinary://API_KEY:API_SECRET@CLOUD_NAME
  secure: true,
});

// Define custom types that cover what we need
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
    }
  | {
      success: false;
      error: string;
    };

type GetResourcesResponse =
  | {
      success: true;
      resources: CloudinaryResource[];
    }
  | {
      success: false;
      error: string;
    };

/**
 * Uploads a file to Cloudinary with proper organization by clinic and patient
 */
export async function uploadToCloudinary(
  file: Buffer,
  options: UploadOptions
): Promise<UploadResponse> {
  try {
    // Sanitize clinic name for folder path
    const sanitizedClinicName = options.clinicName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_");

    // Construct the folder path
    const folder = `clinic_management/${sanitizedClinicName}`;

    // Generate a unique public ID that includes clinic and patient info
    const publicId = `${folder}/${
      options.patientId || "general"
    }_${Date.now()}`;

    // Prepare upload options
    // The UploadApiOptions type from cloudinary requires resource_type to be
    // specifically one of: "image" | "auto" | "video" | "raw"
    const uploadOptions: UploadApiOptions = {
      folder,
      public_id: publicId,
      resource_type: "auto", // TypeScript now knows this is one of the allowed literals
      tags: [
        ...(options.tags || []),
        `clinic_${options.clinicId}`,
        "patient_documents",
      ],
      context: {
        clinic_id: options.clinicId,
        patient_id: options.patientId || "general",
        alt: options.filename || "Patient document",
      },
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
    };
  } catch (error: any) {
    console.error("Cloudinary upload error:", error);
    return {
      success: false,
      error: error.message || "Upload failed",
    };
  }
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

export function extractPublicIdFromUrl(url: string): string | null {
  try {
    // Cloudinary URLs typically follow this pattern:
    // https://res.cloudinary.com/<cloud_name>/image/upload/v<version>/<public_id>.<extension>
    const regex = /\/v\d+\/([^/]+)\.\w+$/;
    const match = url.match(regex);

    if (match && match[1]) {
      return match[1];
    }

    // For folders, the pattern might include paths
    const folderRegex = /\/v\d+\/(.+)\.\w+$/;
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

/**
 * Get all resources for a specific clinic
 */
export async function getClinicResources(
  clinicId: string,
  clinicName: string
): Promise<GetResourcesResponse> {
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

    return {
      success: true,
      resources: result.resources,
    };
  } catch (error: any) {
    console.error("Cloudinary search error:", error);
    return {
      success: false,
      error: error.message || "Search failed",
    };
  }
}
