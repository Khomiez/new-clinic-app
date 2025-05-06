// src/app/api/clinic/[id]/nextHNCode/route.ts
import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/db";
import { isValidObjectId } from "mongoose";
import { getPatientModelForClinic } from "@/utils/getPatientModel";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid clinic ID format" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Get the patient model for this specific clinic
    const Patient = getPatientModelForClinic(id);

    // Find the patient with the highest HN code
    const lastPatient = await Patient.findOne({})
      .sort({ HN_code: -1 }) // Sort in descending order to get the highest HN code
      .limit(1);

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
  } catch (error) {
    console.error("Error generating next HN code:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate next HN code" },
      { status: 500 }
    );
  }
}