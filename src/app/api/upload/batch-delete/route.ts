// src/app/api/upload/batch-delete/route.ts - For batch deletion of files
import { NextRequest, NextResponse } from 'next/server';
import { batchDeleteFromCloudinary, extractPublicIdFromUrl } from '@/utils/cloudinaryUploader';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { urls } = body;

    if (!urls || !Array.isArray(urls)) {
      return NextResponse.json(
        { success: false, error: 'URLs array is required' },
        { status: 400 }
      );
    }

    if (urls.length === 0) {
      return NextResponse.json({
        success: true,
        deleted: [],
        failed: [],
        message: 'No files to delete'
      });
    }

    // Extract public IDs from URLs
    const publicIds: string[] = [];
    const invalidUrls: string[] = [];

    for (const url of urls) {
      if (typeof url !== 'string') {
        invalidUrls.push(String(url));
        continue;
      }

      const publicId = extractPublicIdFromUrl(url);
      if (publicId) {
        publicIds.push(publicId);
      } else {
        invalidUrls.push(url);
      }
    }

    console.log('Batch delete request:', {
      totalUrls: urls.length,
      validPublicIds: publicIds.length,
      invalidUrls: invalidUrls.length
    });

    // Perform batch deletion
    const result = await batchDeleteFromCloudinary(publicIds);

    return NextResponse.json({
      success: result.success,
      deleted: result.deleted,
      failed: [...result.failed, ...invalidUrls],
      totalRequested: urls.length,
      successfullyDeleted: result.deleted.length,
      failedToDelete: result.failed.length + invalidUrls.length,
      error: result.error
    });
  } catch (error: any) {
    console.error('Batch delete error:', error);
    return NextResponse.json(
      { success: false, error: 'Batch delete operation failed' },
      { status: 500 }
    );
  }
}