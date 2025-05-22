// src/app/api/clinic/[id]/files/route.ts - Fixed with proper filename handling
import { NextRequest, NextResponse } from 'next/server';
import { deleteFromCloudinary, extractPublicIdFromUrl, getClinicResources, getOriginalFilename } from '@/utils/cloudinaryUploader';
import { dbConnect } from '@/db';
import { isValidObjectId } from 'mongoose';
import { Clinic } from '@/models';

// Define a type for the file response with proper filename
interface FileResponse {
  id: string;
  url: string;
  format: string;
  resourceType: string;
  createdAt: string;
  originalFilename: string; // Always include this
  context?: {
    [key: string]: string;
  };
  tags?: string[];
}

// Fix interface for Next.js 15
interface ClinicFilesParamsProps {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: ClinicFilesParamsProps
) {
  try {
    // Await the params Promise in Next.js 15
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid clinic ID format' },
        { status: 400 }
      );
    }

    await dbConnect();

    const clinic = await Clinic.findById(id);
    if (!clinic) {
      return NextResponse.json(
        { success: false, error: 'Clinic not found' },
        { status: 404 }
      );
    }

    const resourcesResult = await getClinicResources(id, clinic.name);
    
    if (!resourcesResult.success) {
      return NextResponse.json(
        { success: false, error: resourcesResult.error },
        { status: 500 }
      );
    }

    // Filter by patient ID if provided
    let filteredResources = resourcesResult.resources || [];
    if (patientId) {
      filteredResources = filteredResources.filter(
        (resource) => resource.context?.patient_id === patientId
      );
    }

    // Map resources to FileResponse with proper filename extraction
    const files: FileResponse[] = filteredResources.map(resource => ({
      id: resource.public_id,
      url: resource.secure_url,
      format: resource.format,
      resourceType: resource.resource_type,
      createdAt: resource.created_at,
      originalFilename: getOriginalFilename(resource), // Use the fixed function
      context: resource.context,
      tags: resource.tags
    }));

    return NextResponse.json({
      success: true,
      files
    });
  } catch (error) {
    console.error('Get clinic files error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch clinic files' },
      { status: 500 }
    );
  }
}

export async function DELETE(
    request: NextRequest,
    { params }: ClinicFilesParamsProps
  ) {
    try {
      const { searchParams } = new URL(request.url);
      const fileUrl = searchParams.get('url');
      
      if (!fileUrl) {
        return NextResponse.json(
          { success: false, error: 'File URL is required' },
          { status: 400 }
        );
      }
      
      // Extract the public ID from the URL
      const publicId = extractPublicIdFromUrl(fileUrl);
      
      if (!publicId) {
        return NextResponse.json(
          { success: false, error: 'Could not extract public ID from URL' },
          { status: 400 }
        );
      }
      
      // Delete from Cloudinary
      const result = await deleteFromCloudinary(publicId);
      
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 500 }
        );
      }
      
      return NextResponse.json({ success: true });
    } catch (error: any) {
      console.error('Delete file error:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to delete file' },
        { status: 500 }
      );
    }
  }