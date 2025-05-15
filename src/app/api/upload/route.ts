// src/app/api/upload/route.ts - Enhanced with metadata storage
import { NextRequest, NextResponse } from 'next/server';
import { uploadToCloudinary } from '@/utils/cloudinaryUploader';
import { dbConnect } from '@/db';
import { isValidObjectId } from 'mongoose';
import { Clinic } from '@/models';

interface FileMetadata {
  originalFilename: string;
  size: number;
  type: string;
  clinicId: string;
  patientId?: string;
  uploadedAt: Date;
  cloudinaryUrl: string;
  cloudinaryPublicId: string;
}

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

    // Upload to Cloudinary with original filename
    const result = await uploadToCloudinary(buffer, {
      clinicId,
      clinicName: clinic.name,
      filename: file.name, // Pass original filename
      fileType: file.type,
      patientId,
      tags: ['medical_document', `type_${file.type.replace('/', '_')}`]
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    // Optionally, store file metadata in MongoDB for better tracking
    // This is useful for quick searches and maintaining file history
    try {
      // Create or connect to files collection
      const mongoose = require('mongoose');
      
      const FileMetadataSchema = new mongoose.Schema({
        originalFilename: String,
        size: Number,
        type: String,
        clinicId: String,
        patientId: String,
        uploadedAt: { type: Date, default: Date.now },
        cloudinaryUrl: String,
        cloudinaryPublicId: String,
      });

      const FileMetadata = mongoose.models.FileMetadata || 
                          mongoose.model('FileMetadata', FileMetadataSchema);

      // Store metadata
      await FileMetadata.create({
        originalFilename: file.name,
        size: file.size,
        type: file.type,
        clinicId,
        patientId,
        uploadedAt: new Date(),
        cloudinaryUrl: result.url,
        cloudinaryPublicId: result.public_id,
      });
    } catch (metadataError) {
      console.warn('Failed to store file metadata:', metadataError);
      // Don't fail the entire request if metadata storage fails
    }

    // Return enhanced response with original filename
    return NextResponse.json({ 
      success: true, 
      file: {
        ...result,
        originalFilename: file.name,
        size: file.size,
        type: file.type,
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, error: 'File upload failed' },
      { status: 500 }
    );
  }
}