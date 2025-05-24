import { NextResponse } from "next/server";
import { configureCloudinary } from "@/utils/cloudinaryConfig";

export async function GET() {
  try {
    console.log("Testing Cloudinary configuration...");

    // Test environment variables
    const envCheck = {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || "MISSING",
      apiKey: process.env.CLOUDINARY_API_KEY || "MISSING",
      apiSecret: process.env.CLOUDINARY_API_SECRET ? "SET" : "MISSING",
    };

    console.log("Environment check:", envCheck);

    // Try to configure Cloudinary
    const cloudinary = configureCloudinary();

    // Test a simple API call
    const result = await cloudinary.api.ping();

    return NextResponse.json({
      success: true,
      message: "Cloudinary connection successful",
      environment: envCheck,
      ping: result,
    });
  } catch (error: any) {
    console.error("Cloudinary test failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        environment: {
          cloudName: process.env.CLOUDINARY_CLOUD_NAME ? "SET" : "MISSING",
          apiKey: process.env.CLOUDINARY_API_KEY ? "SET" : "MISSING",
          apiSecret: process.env.CLOUDINARY_API_SECRET ? "SET" : "MISSING",
        },
      },
      { status: 500 }
    );
  }
}
