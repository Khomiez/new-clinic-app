// src/utils/cloudinaryUploader.ts
import { v2 as cloudinary } from 'cloudinary';
import type { UploadApiResponse, UploadApiOptions, DeleteApiResponse } from 'cloudinary';

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

// Define custom search response since it's not exported by the package
interface CloudinarySearchResponse {
  total_count: number;
  time: number;
  resources: CloudinaryResource[];
  rate_limit_allowed: number;
  rate_limit_reset_at: number;
  rate_limit_remaining: number;
}

type UploadOptions = {
  clinicId: string;
  clinicName: string;
  filename?: string;
  fileType?: string;
  patientId?: string;
  tags?: string[];
};

type UploadResponse = {
  success: true;
  url: string;
  public_id: string;
  format: string;
  resource_type: string;
  created_at: string;
} | {
  success: false;
  error: string;
};

type DeleteResponse = {
  success: true;
  result: string; // DeleteApiResponse doesn't have result property as expected
} | {
  success: false;
  error: string;
};

type GetResourcesResponse = {
  success: true;
  resources: CloudinaryResource[];
} | {
  success: false;
  error: string;
};

export async function uploadToCloudinary(file: string | Buffer, options: UploadOptions): Promise<UploadResponse> {
  try {
    // Sanitize clinic name for folder path
    const sanitizedClinicName = options.clinicName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_');
    
    // Construct the folder path
    const folder = `clinic_management_clinics/${sanitizedClinicName}`;
    
    // Extract file extension if filename is provided
    let publicId = undefined;
    if (options.filename) {
      // Generate a unique public ID that includes clinic and patient info
      publicId = `${folder}/${options.patientId || 'general'}_${Date.now()}`;
    }
    
    // Prepare upload options
    const uploadOptions: UploadApiOptions = {
      folder: folder,
      public_id: publicId,
      overwrite: true,
      resource_type: "auto",
      upload_preset: "clinic_management",
      tags: [...(options.tags || []), `clinic_${options.clinicId}`, 'patient_documents'],
      context: {
        clinic_id: options.clinicId,
        patient_id: options.patientId || 'general',
        alt: options.filename || 'Patient document'
      }
    };

    // Function overloads for Buffer vs string
    let result: UploadApiResponse;
    
    // If file is a Buffer, convert to base64 string
    if (Buffer.isBuffer(file)) {
      const base64File = `data:${options.fileType || 'application/octet-stream'};base64,${file.toString('base64')}`;
      result = await cloudinary.uploader.upload(base64File, uploadOptions);
    } else {
      // It's already a string (could be a URL or base64)
      result = await cloudinary.uploader.upload(file, uploadOptions);
    }
    
    return {
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      resource_type: result.resource_type,
      created_at: result.created_at
    };
  } catch (error: any) {
    console.error('Cloudinary upload error:', error);
    return {
      success: false,
      error: error.message || 'Upload failed'
    };
  }
}

// Helper function to delete files
export async function deleteFromCloudinary(publicId: string): Promise<DeleteResponse> {
  try {
    const response = await cloudinary.uploader.destroy(publicId);
    
    // The response might be an object with result property or just a string
    const result = typeof response === 'object' ? 
      (response as any).result : // Cast to any to access possible result property
      response as string;
    
    if (result === 'ok') {
      return {
        success: true as const,
        result: result
      };
    } else {
      return {
        success: false,
        error: `Delete failed with result: ${result}`
      };
    }
  } catch (error: any) {
    console.error('Cloudinary delete error:', error);
    return {
      success: false,
      error: error.message || 'Delete failed'
    };
  }
}

// Get all resources for a specific clinic
export async function getClinicResources(clinicId: string, clinicName: string): Promise<GetResourcesResponse> {
  try {
    const sanitizedClinicName = clinicName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_');
    
    const folder = `clinic_management_clinics/${sanitizedClinicName}`;
    
    const result = await cloudinary.search
      .expression(`folder:${folder}`)
      .with_field('context')
      .with_field('tags')
      .max_results(500)
      .execute() as CloudinarySearchResponse;
      
    // Map the results to our CloudinaryResource type to ensure type safety
    const resources = result.resources.map((resource: CloudinaryResource) => ({
      public_id: resource.public_id,
      secure_url: resource.secure_url,
      url: resource.url,
      format: resource.format,
      resource_type: resource.resource_type,
      created_at: resource.created_at,
      bytes: resource.bytes,
      width: resource.width,
      height: resource.height,
      context: resource.context,
      tags: resource.tags
    }));
      
    return {
      success: true,
      resources
    };
  } catch (error: any) {
    console.error('Cloudinary search error:', error);
    return {
      success: false,
      error: error.message || 'Search failed'
    };
  }
}