// src/utils/cloudinaryUploader.ts - Simplified Cloudinary integration
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
  error?: string;
}

// Simple filename sanitization
function sanitizeFilename(filename: string): string {
  return filename
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
    
    // Create folder structure
    const sanitizedClinicName = clinicName.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const folder = `clinic_management/${sanitizedClinicName}`;
    
    // Create unique public ID
    const timestamp = Date.now();
    const sanitizedFilename = sanitizeFilename(filename.replace(/\.[^/.]+$/, ''));
    const publicId = `${folder}/${patientId || "general"}/${sanitizedFilename}_${timestamp}`;

    // Convert buffer to base64
    const base64File = `data:${fileType || "application/octet-stream"};base64,${file.toString("base64")}`;

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(base64File, {
      public_id: publicId,
      resource_type: "auto",
      context: {
        clinic_id: clinicId,
        patient_id: patientId || "general",
        original_filename: filename,
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

// Extract public ID from Cloudinary URL
export function extractPublicIdFromUrl(url: string): string | null {
  try {
    const match = url.match(/\/v\d+\/(.+)\.[^/?]+/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}