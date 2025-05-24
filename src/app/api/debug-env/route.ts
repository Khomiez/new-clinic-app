// src/app/api/debug-env/route.ts - Temporary debug route
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    nodeEnv: process.env.NODE_ENV,
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME ? 'SET' : 'MISSING',
      apiKey: process.env.CLOUDINARY_API_KEY ? 'SET' : 'MISSING', 
      apiSecret: process.env.CLOUDINARY_API_SECRET ? 'SET' : 'MISSING',
      // Show actual values in development (remove this in production)
      ...(process.env.NODE_ENV === 'development' && {
        cloudNameValue: process.env.CLOUDINARY_CLOUD_NAME,
        apiKeyValue: process.env.CLOUDINARY_API_KEY,
        apiSecretPreview: process.env.CLOUDINARY_API_SECRET?.substring(0, 10) + '...'
      })
    }
  });
}