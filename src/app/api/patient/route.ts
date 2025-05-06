import { dbConnect } from "@/db";
import PatientSchema from "@/models/Patient";
import mongoose, { isValidObjectId } from "mongoose";
import { NextRequest, NextResponse } from "next/server";

// Get the correct model for the specific clinic
function getPatientModel(clinicId: string) {
  const modelName = `Patient_${clinicId}`;
  const collectionName = `patients_clinic_${clinicId}`;

  console.log(
    `Getting/creating model: ${modelName} for collection: ${collectionName}`
  );

  return (
    mongoose.models[modelName] ||
    mongoose.model(modelName, PatientSchema, collectionName)
  );
}

export async function GET(request: NextRequest) {
  console.log("GET /api/patients called");
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinicId");
    const patientId = searchParams.get("id");

    console.log("Query params:", { clinicId, patientId });

    if (!clinicId) {
      console.log("Error: clinicId is required");
      return NextResponse.json(
        { error: "clinicId is required" },
        { status: 400 }
      );
    }

    // Validate clinic ID format
    if (!isValidObjectId(clinicId)) {
      console.log("Error: Invalid clinic ID format", clinicId);
      return NextResponse.json(
        { error: "Invalid clinic ID format" },
        { status: 400 }
      );
    }

    // Connect to the database
    console.log("Connecting to database...");
    await dbConnect();
    console.log("Connected to database");

    // Get the proper patient model for this clinic
    const Patient = getPatientModel(clinicId);
    console.log("Patient model created/retrieved");

    // If patientId is provided, get a single patient
    if (patientId) {
      if (!isValidObjectId(patientId)) {
        console.log("Error: Invalid patient ID format");
        return NextResponse.json(
          { error: "Invalid patient ID format" },
          { status: 400 }
        );
      }

      console.log(`Fetching single patient with ID: ${patientId}`);
      const patient = await Patient.findById(patientId);

      if (!patient) {
        console.log("Patient not found");
        return NextResponse.json(
          { error: "Patient not found" },
          { status: 404 }
        );
      }

      console.log("Patient found:", patient?._id);
      return NextResponse.json({ patient });
    }

    // Otherwise, get all patients for this clinic
    console.log(`Fetching all patients for clinic: ${clinicId}`);
    const patients = await Patient.find({}).sort({ createdAt: -1 });
    console.log(`Found ${patients.length} patients`);

    // Return empty array even if no patients are found (not an error)
    return NextResponse.json({ patients: patients || [] });
  } catch (error) {
    console.error("GET patients error:", error);
    return NextResponse.json(
      { error: "Failed to fetch patients" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  console.log("POST /api/patients called");
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinicId");

    console.log("Query params:", { clinicId });

    if (!clinicId) {
      console.log("Error: clinicId is required");
      return NextResponse.json(
        { error: "clinicId is required" },
        { status: 400 }
      );
    }

    // Validate clinic ID format
    if (!isValidObjectId(clinicId)) {
      console.log("Error: Invalid clinic ID format");
      return NextResponse.json(
        { error: "Invalid clinic ID format" },
        { status: 400 }
      );
    }

    const body = await request.json();
    console.log("Request body:", body);

    await dbConnect();
    console.log("Connected to database");

    const Patient = getPatientModel(clinicId);
    const patient = await Patient.create(body);
    console.log("Patient created:", patient?._id);

    return NextResponse.json({ patient }, { status: 201 });
  } catch (error) {
    console.error("POST patient error:", error);
    return NextResponse.json(
      { error: "Failed to create patient" },
      { status: 500 }
    );
  }
}

// New PATCH method for updating patients
export async function PATCH(request: NextRequest) {
  console.log("PATCH /api/patients called");
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinicId");
    const patientId = searchParams.get("id");

    console.log("Query params:", { clinicId, patientId });

    if (!clinicId) {
      console.log("Error: clinicId is required");
      return NextResponse.json(
        { error: "clinicId is required" },
        { status: 400 }
      );
    }

    if (!patientId) {
      console.log("Error: patientId is required");
      return NextResponse.json(
        { error: "patientId is required" },
        { status: 400 }
      );
    }

    // Validate ID formats
    if (!isValidObjectId(clinicId)) {
      console.log("Error: Invalid clinic ID format");
      return NextResponse.json(
        { error: "Invalid clinic ID format" },
        { status: 400 }
      );
    }

    if (!isValidObjectId(patientId)) {
      console.log("Error: Invalid patient ID format");
      return NextResponse.json(
        { error: "Invalid patient ID format" },
        { status: 400 }
      );
    }

    const body = await request.json();
    console.log("Update data:", body);

    await dbConnect();
    console.log("Connected to database");

    const Patient = getPatientModel(clinicId);

    // Update patient with new data
    const updatedPatient = await Patient.findByIdAndUpdate(
      patientId,
      { ...body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!updatedPatient) {
      console.log("Patient not found");
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    console.log("Patient updated successfully:", updatedPatient._id);
    return NextResponse.json({ patient: updatedPatient }, { status: 200 });
  } catch (error) {
    console.error("PATCH patient error:", error);
    return NextResponse.json(
      { error: "Failed to update patient" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  console.log("DELETE /api/patients called");
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinicId");
    const patientId = searchParams.get("id");

    console.log("Query params:", { clinicId, patientId });

    if (!clinicId) {
      console.log("Error: clinicId is required");
      return NextResponse.json(
        { error: "clinicId is required" },
        { status: 400 }
      );
    }

    if (!patientId) {
      console.log("Error: patientId is required");
      return NextResponse.json(
        { error: "patientId is required" },
        { status: 400 }
      );
    }

    // Validate ID formats
    if (!isValidObjectId(clinicId)) {
      console.log("Error: Invalid clinic ID format");
      return NextResponse.json(
        { error: "Invalid clinic ID format" },
        { status: 400 }
      );
    }

    if (!isValidObjectId(patientId)) {
      console.log("Error: Invalid patient ID format");
      return NextResponse.json(
        { error: "Invalid patient ID format" },
        { status: 400 }
      );
    }

    await dbConnect();
    console.log("Connected to database");

    const Patient = getPatientModel(clinicId);
    console.log(`Deleting patient with ID: ${patientId}`);

    const result = await Patient.findByIdAndDelete(patientId);
    console.log("Delete result:", result);

    if (!result) {
      console.log("Patient not found");
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    console.log("Patient deleted successfully");
    return NextResponse.json(
      { message: "Patient deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE patient error:", error);
    return NextResponse.json(
      { error: "Failed to delete patient" },
      { status: 500 }
    );
  }
}
