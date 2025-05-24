// src/app/api/upload/route.ts - FIXED: Better error handling and debugging
import { NextRequest, NextResponse } from 'next/server';
import { uploadToCloudinary } from '@/utils/cloudinaryUploader';
import { debugCloudinaryEnv } from '@/utils/cloudinaryConfig';
import { dbConnect } from '@/db';
import { isValidObjectId } from 'mongoose';
import { Clinic } from '@/models';

export async function POST(request: NextRequest) {
  try {
    // Debug environment variables at the start
    console.log('=== Upload API Route Debug ===');
    debugCloudinaryEnv();
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const clinicId = formData.get('clinicId') as string;
    const patientId = formData.get('patientId') as string || undefined;

    // Validate inputs
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!clinicId || !isValidObjectId(clinicId)) {
      return NextResponse.json(
        { success: false, error: 'Valid clinic ID is required' },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'File type not supported' },
        { status: 400 }
      );
    }

    // Get clinic info
    await dbConnect();
    const clinic = await Clinic.findById(clinicId);
    if (!clinic) {
      return NextResponse.json(
        { success: false, error: 'Clinic not found' },
        { status: 404 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Preserve original filename exactly as uploaded
    const originalFilename = file.name;
    
    console.log('Processing upload:', {
      originalFilename,
      clinicName: clinic.name,
      fileSize: file.size,
      fileType: file.type,
      clinicId
    });

    // Upload to Cloudinary
    const result = await uploadToCloudinary(buffer, {
      clinicId,
      clinicName: clinic.name,
      filename: originalFilename,
      fileType: file.type,
      patientId,
    });

    if (!result.success) {
      console.error('Upload to Cloudinary failed:', result.error);
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    console.log('Upload successful:', result.url);

    return NextResponse.json({
      success: true,
      file: {
        url: result.url,
        filename: result.originalFilename || originalFilename,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString(),
      }
    });
  } catch (error: any) {
    console.error('Upload API error:', error);
    
    // Provide more specific error messages
    let errorMessage = 'File upload failed';
    
    if (error.message?.includes('Missing Cloudinary environment variables')) {
      errorMessage = 'Server configuration error: Missing Cloudinary credentials';
    } else if (error.message?.includes('Invalid')) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}