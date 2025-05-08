// src/app/api/upload/batch-delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  deleteFromCloudinary,
  extractPublicIdFromUrl,
} from "@/utils/cloudinaryUploader";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { urls } = body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { success: false, error: "Valid array of URLs is required" },
        { status: 400 }
      );
    }

    const results = await Promise.allSettled(
      urls.map(async (url) => {
        const publicId = extractPublicIdFromUrl(url);
        if (!publicId)
          return { url, success: false, error: "Invalid URL format" };

        const result = await deleteFromCloudinary(publicId);
        return { url, ...result };
      })
    );

    // Count successful and failed deletions
    const successful = results.filter(
      (r) => r.status === "fulfilled" && (r.value as any).success
    ).length;
    const failed = results.filter(
      (r) => r.status === "rejected" || !(r.value as any).success
    ).length;

    return NextResponse.json({
      success: true,
      summary: { successful, failed },
      results: results.map((r) =>
        r.status === "fulfilled"
          ? r.value
          : { success: false, error: "Promise rejected" }
      ),
    });
  } catch (error: any) {
    console.error("Batch delete error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete files" },
      { status: 500 }
    );
  }
}
