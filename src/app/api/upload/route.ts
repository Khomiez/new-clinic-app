// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { uploadToCloudinary } from '@/utils/cloudinaryUploader';
import { dbConnect } from '@/db';
import { isValidObjectId } from 'mongoose';
import { Clinic } from '@/models';

export async function POST(request: NextRequest) {
  try {
    // Parse form data
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

    // Connect to database
    await dbConnect();

    // Get clinic name for folder structure
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

    // Upload to Cloudinary
    const result = await uploadToCloudinary(buffer, {
      clinicId,
      clinicName: clinic.name,
      filename: file.name,
      fileType: file.type,
      patientId,
      tags: ['medical_document']
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, file: result });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, error: 'File upload failed' },
      { status: 500 }
    );
  }
}