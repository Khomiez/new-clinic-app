// src/app/api/clinic/[id]/files/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { deleteFromCloudinary, extractPublicIdFromUrl, getClinicResources } from '@/utils/cloudinaryUploader';
import { dbConnect } from '@/db';
import { isValidObjectId } from 'mongoose';
import { Clinic } from '@/models';

// Define a type for the file response
interface FileResponse {
  id: string;
  url: string;
  format: string;
  resourceType: string;
  createdAt: string;
  context?: {
    [key: string]: string;
  };
  tags?: string[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
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
    let filteredResources = resourcesResult.resources;
    if (patientId) {
      filteredResources = filteredResources.filter(
        (resource) => resource.context?.patient_id === patientId
      );
    }

    const files: FileResponse[] = filteredResources.map(resource => ({
      id: resource.public_id,
      url: resource.secure_url,
      format: resource.format,
      resourceType: resource.resource_type,
      createdAt: resource.created_at,
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
    { params }: { params: { id: string } }
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