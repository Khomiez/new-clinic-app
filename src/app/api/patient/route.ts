// src/app/api/patient/route.ts
import { dbConnect } from "@/db";
import PatientSchema from "@/models/Patient";
import mongoose, { isValidObjectId } from "mongoose";
import { NextRequest, NextResponse } from "next/server";

// Get the correct model for the specific clinic
function getPatientModel(clinicId: string) {
  const modelName = `Patient_${clinicId}`;
  const collectionName = `patients_clinic_${clinicId}`;

  return (
    mongoose.models[modelName] ||
    mongoose.model(modelName, PatientSchema, collectionName)
  );
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinicId");
    const patientId = searchParams.get("id");

    if (!clinicId) {
      return NextResponse.json(
        { success: false, error: "clinicId is required" },
        { status: 400 }
      );
    }

    // Validate clinic ID format
    if (!isValidObjectId(clinicId)) {
      return NextResponse.json(
        { success: false, error: "Invalid clinic ID format" },
        { status: 400 }
      );
    }

    // Connect to the database
    await dbConnect();

    // Get the proper patient model for this clinic
    const Patient = getPatientModel(clinicId);

    // If patientId is provided, get a single patient
    if (patientId) {
      if (!isValidObjectId(patientId)) {
        return NextResponse.json(
          { success: false, error: "Invalid patient ID format" },
          { status: 400 }
        );
      }

      const patient = await Patient.findById(patientId);

      if (!patient) {
        return NextResponse.json(
          { success: false, error: "Patient not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, patient });
    }

    // Otherwise, get all patients for this clinic
    const patients = await Patient.find({}).sort({ createdAt: -1 });

    // Return empty array even if no patients are found (not an error)
    return NextResponse.json({ success: true, patients: patients || [] });
  } catch (error) {
    console.error("GET patients error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch patients" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinicId");

    if (!clinicId) {
      return NextResponse.json(
        { success: false, error: "clinicId is required" },
        { status: 400 }
      );
    }

    // Validate clinic ID format
    if (!isValidObjectId(clinicId)) {
      return NextResponse.json(
        { success: false, error: "Invalid clinic ID format" },
        { status: 400 }
      );
    }

    const body = await request.json();

    await dbConnect();

    const Patient = getPatientModel(clinicId);
    
    // If no HN_code is provided, generate one
    if (!body.HN_code) {
      // Find the patient with the highest HN code
      const lastPatient = await Patient.findOne({})
        .sort({ HN_code: -1 })
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
      
      // Set the generated HN code
      body.HN_code = nextHNCode;
    }

    const patient = await Patient.create(body);

    return NextResponse.json({ success: true, patient }, { status: 201 });
  } catch (error) {
    console.error("POST patient error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create patient" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinicId");
    const patientId = searchParams.get("id");

    if (!clinicId) {
      return NextResponse.json(
        { success: false, error: "clinicId is required" },
        { status: 400 }
      );
    }

    if (!patientId) {
      return NextResponse.json(
        { success: false, error: "patientId is required" },
        { status: 400 }
      );
    }

    // Validate ID formats
    if (!isValidObjectId(clinicId) || !isValidObjectId(patientId)) {
      return NextResponse.json(
        { success: false, error: "Invalid ID format" },
        { status: 400 }
      );
    }

    const body = await request.json();

    await dbConnect();

    const Patient = getPatientModel(clinicId);

    // Update patient with new data
    const updatedPatient = await Patient.findByIdAndUpdate(
      patientId,
      { ...body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!updatedPatient) {
      return NextResponse.json(
        { success: false, error: "Patient not found" }, 
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, patient: updatedPatient });
  } catch (error) {
    console.error("PATCH patient error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update patient" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinicId");
    const patientId = searchParams.get("id");

    if (!clinicId || !patientId) {
      return NextResponse.json(
        { success: false, error: "clinicId and patientId are required" },
        { status: 400 }
      );
    }

    // Validate ID formats
    if (!isValidObjectId(clinicId) || !isValidObjectId(patientId)) {
      return NextResponse.json(
        { success: false, error: "Invalid ID format" },
        { status: 400 }
      );
    }

    await dbConnect();

    const Patient = getPatientModel(clinicId);

    const result = await Patient.findByIdAndDelete(patientId);

    if (!result) {
      return NextResponse.json(
        { success: false, error: "Patient not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Patient deleted successfully" }
    );
  } catch (error) {
    console.error("DELETE patient error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete patient" },
      { status: 500 }
    );
  }
}