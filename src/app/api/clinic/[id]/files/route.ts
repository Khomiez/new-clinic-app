// src/app/api/clinic/[id]/files/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getClinicResources } from '@/utils/cloudinaryUploader';
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