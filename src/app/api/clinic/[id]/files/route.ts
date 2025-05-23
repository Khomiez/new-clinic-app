// src/app/api/clinic/[id]/files/route.ts - Enhanced file management API
import { NextRequest, NextResponse } from 'next/server';
import { deleteFromCloudinary, extractPublicIdFromUrl, getClinicResources } from '@/utils/cloudinaryUploader';
import { dbConnect } from '@/db';
import { isValidObjectId } from 'mongoose';
import { Clinic } from '@/models';

interface ClinicFilesParamsProps {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: ClinicFilesParamsProps) {
  try {
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

    console.log('Fetching resources for clinic:', {
      clinicId: id,
      clinicName: clinic.name,
      patientId
    });

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
        (resource) => {
          // Check context for patient_id
          if (resource.context && typeof resource.context === 'object') {
            return resource.context.patient_id === patientId;
          }
          // Check tags for patient_id
          return resource.tags?.includes(`patient_${patientId}`);
        }
      );
    }

    console.log('Resources found:', {
      total: resourcesResult.resources?.length || 0,
      filtered: filteredResources.length
    });

    // Return raw Cloudinary resources so components can process them
    return NextResponse.json({
      success: true,
      files: filteredResources,
      clinic: {
        id: clinic._id,
        name: clinic.name
      }
    });
  } catch (error: any) {
    console.error('Get clinic files error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch clinic files' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: ClinicFilesParamsProps) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const fileUrl = searchParams.get('url');
    
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid clinic ID format' },
        { status: 400 }
      );
    }
    
    if (!fileUrl) {
      return NextResponse.json(
        { success: false, error: 'File URL is required' },
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
    
    // Extract the public ID from the URL
    const publicId = extractPublicIdFromUrl(fileUrl);
    
    if (!publicId) {
      return NextResponse.json(
        { success: false, error: 'Could not extract public ID from URL' },
        { status: 400 }
      );
    }
    
    console.log('Deleting file:', {
      clinicId: id,
      clinicName: clinic.name,
      fileUrl,
      publicId
    });
    
    // Delete from Cloudinary
    const result = await deleteFromCloudinary(publicId);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'File deleted successfully',
      deletedUrl: fileUrl
    });
  } catch (error: any) {
    console.error('Delete file error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete file' },
      { status: 500 }
    );
  }
}