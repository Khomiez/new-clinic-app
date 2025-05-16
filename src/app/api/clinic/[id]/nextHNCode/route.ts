// src/app/api/clinic/[id]/nextHNCode/route.ts - Fixed with better error handling
import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/db";
import { isValidObjectId } from "mongoose";
import { getPatientModelForClinic } from "@/utils/getPatientModel";

// Fix interface for Next.js 15
interface ClinicParamsProps {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: ClinicParamsProps
) {
  try {
    // Await the params Promise in Next.js 15
    const { id } = await params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid clinic ID format" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Get the patient model for this specific clinic
    const Patient = getPatientModelForClinic(id);

    try {
      // Find the patient with the highest HN code
      // Using findOne with sort and limit to get the last HN code
      const lastPatient = await Patient
        .findOne({}, { HN_code: 1 }) // Only select HN_code field for performance
        .sort({ HN_code: -1 }) // Sort in descending order
        .lean() // Use lean() for better performance since we only need data
        .exec(); // Explicitly call exec() to ensure proper typing

      let nextHNCode = "HN0001"; // Default starting HN code

      if (lastPatient && lastPatient.HN_code) {
        // Extract the numeric part of the HN code
        const lastCodeMatch = lastPatient.HN_code.match(/HN(\d+)/);
        
        if (lastCodeMatch && lastCodeMatch[1]) {
          // Increment the numeric part and pad with zeros
          const nextNumber = parseInt(lastCodeMatch[1], 10) + 1;
          nextHNCode = `HN${nextNumber.toString().padStart(4, '0')}`;
        }
      }

      return NextResponse.json({ 
        success: true, 
        nextHNCode 
      });
    } catch (queryError) {
      console.error("Error querying patients:", queryError);
      return NextResponse.json(
        { success: false, error: "Failed to query patient records" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error generating next HN code:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate next HN code" },
      { status: 500 }
    );
  }
}