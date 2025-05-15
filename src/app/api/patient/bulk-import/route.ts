// src/app/api/patient/bulk-import/route.ts
import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/db";
import PatientSchema from "@/models/Patient";
import mongoose, { isValidObjectId } from "mongoose";
import { serializeData } from "@/redux/serialization";

// Get the correct model for the specific clinic
function getPatientModel(clinicId: string) {
  const modelName = `Patient_${clinicId}`;
  const collectionName = `patients_clinic_${clinicId}`;

  return (
    mongoose.models[modelName] ||
    mongoose.model(modelName, PatientSchema, collectionName)
  );
}

// Interface for bulk import patient data
interface BulkPatientData {
  name: string;
  ID_code: string;
  HN_code?: string; // Optional, will be auto-generated if not provided
  lastVisit?: Date | string;
  history?: any[];
}

interface BulkImportResponse {
  success: boolean;
  message?: string;
  results?: {
    totalProcessed: number;
    successfulImports: number;
    failedImports: number;
    duplicateSkipped: number;
    errors: Array<{
      index: number;
      patientData: BulkPatientData;
      error: string;
    }>;
    importedPatients: any[];
    skippedDuplicates: Array<{
      index: number;
      patientData: BulkPatientData;
      existingHN: string;
      reason: string;
    }>;
  };
  error?: string;
}

// Function to generate next HN code for bulk import
async function generateNextHNCode(
  Patient: any,
  clinicId: string
): Promise<string> {
  // Find the patient with the highest HN code
  const lastPatient = await Patient.findOne({}).sort({ HN_code: -1 }).limit(1);

  let nextNumber = 1; // Default starting number

  if (lastPatient && lastPatient.HN_code) {
    // Extract the numeric part of the HN code
    const lastCodeMatch = lastPatient.HN_code.match(/HN(\d+)/);

    if (lastCodeMatch && lastCodeMatch[1]) {
      nextNumber = parseInt(lastCodeMatch[1], 10) + 1;
    }
  }

  return `HN${nextNumber.toString().padStart(4, "0")}`;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<BulkImportResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinicId");

    // Validate clinic ID
    if (!clinicId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "clinicId query parameter is required. Use: /api/patient/bulk-import?clinicId=YOUR_CLINIC_ID",
        },
        { status: 400 }
      );
    }

    if (!isValidObjectId(clinicId)) {
      return NextResponse.json(
        { success: false, error: "Invalid clinic ID format" },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate body is an array
    if (!Array.isArray(body)) {
      return NextResponse.json(
        {
          success: false,
          error: "Request body must be an array of patient objects",
        },
        { status: 400 }
      );
    }

    // Validate array is not empty
    if (body.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot import empty array of patients",
        },
        { status: 400 }
      );
    }

    // Validate each patient object has required fields
    for (let i = 0; i < body.length; i++) {
      const patient = body[i];
      if (!patient.name || typeof patient.name !== "string") {
        return NextResponse.json(
          {
            success: false,
            error: `Patient at index ${i} is missing required field 'name' or name is not a string`,
          },
          { status: 400 }
        );
      }

      // ID_code is optional, but if provided, should be a string
      if (patient.ID_code && typeof patient.ID_code !== "string") {
        return NextResponse.json(
          {
            success: false,
            error: `Patient at index ${i} has invalid 'ID_code' - must be a string`,
          },
          { status: 400 }
        );
      }
    }

    // Connect to database
    await dbConnect();

    // Get the patient model for this clinic
    const Patient = getPatientModel(clinicId);

    // Get the starting HN code
    let currentHNNumber = 1;
    const lastPatient = await Patient.findOne({})
      .sort({ HN_code: -1 })
      .limit(1);

    if (lastPatient && lastPatient.HN_code) {
      const lastCodeMatch = lastPatient.HN_code.match(/HN(\d+)/);
      if (lastCodeMatch && lastCodeMatch[1]) {
        currentHNNumber = parseInt(lastCodeMatch[1], 10) + 1;
      }
    }

    // Initialize tracking arrays
    const results = {
      totalProcessed: body.length,
      successfulImports: 0,
      failedImports: 0,
      duplicateSkipped: 0,
      errors: [] as Array<{
        index: number;
        patientData: BulkPatientData;
        error: string;
      }>,
      importedPatients: [] as any[],
      skippedDuplicates: [] as Array<{
        index: number;
        patientData: BulkPatientData;
        existingHN: string;
        reason: string;
      }>,
    };

    // Process each patient
    for (let i = 0; i < body.length; i++) {
      const patientData = body[i] as BulkPatientData;

      try {
        // Check for existing patient with same ID_code (if provided)
        let existingPatient = null;
        if (patientData.ID_code) {
          existingPatient = await Patient.findOne({
            ID_code: patientData.ID_code,
          });

          if (existingPatient) {
            results.duplicateSkipped++;
            results.skippedDuplicates.push({
              index: i,
              patientData,
              existingHN: existingPatient.HN_code,
              reason: `Patient with ID_code ${patientData.ID_code} already exists (HN: ${existingPatient.HN_code})`,
            });
            continue;
          }
        }

        // Check for existing patient with same name (less strict check)
        const nameCheckPatient = await Patient.findOne({
          name: { $regex: new RegExp(`^${patientData.name.trim()}$`, "i") },
        });

        if (nameCheckPatient) {
          // If we have both name and ID_code matches, it's definitely a duplicate
          if (
            patientData.ID_code &&
            nameCheckPatient.ID_code === patientData.ID_code
          ) {
            results.duplicateSkipped++;
            results.skippedDuplicates.push({
              index: i,
              patientData,
              existingHN: nameCheckPatient.HN_code,
              reason: `Patient with same name and ID_code already exists (HN: ${nameCheckPatient.HN_code})`,
            });
            continue;
          }

          // If only name matches but different/missing ID_code, log a warning but continue
          console.warn(
            `Potential duplicate name detected: ${patientData.name} (existing HN: ${nameCheckPatient.HN_code})`
          );
        }

        // Generate HN code if not provided
        const hnCode =
          patientData.HN_code ||
          `HN${currentHNNumber.toString().padStart(4, "0")}`;
        if (!patientData.HN_code) {
          currentHNNumber++;
        }

        // Prepare patient object for creation
        const newPatient = {
          name: patientData.name.trim(),
          HN_code: hnCode,
          ID_code: patientData.ID_code?.trim() || undefined,
          lastVisit: patientData.lastVisit
            ? new Date(patientData.lastVisit)
            : undefined,
          history: patientData.history || [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Check if HN_code already exists (additional safety check)
        const existingHN = await Patient.findOne({ HN_code: hnCode });
        if (existingHN) {
          // Generate a new HN code
          const newHNCode = `HN${currentHNNumber.toString().padStart(4, "0")}`;
          newPatient.HN_code = newHNCode;
          currentHNNumber++;
        }

        // Create the patient
        const createdPatient = await Patient.create(newPatient);

        results.successfulImports++;
        results.importedPatients.push(serializeData(createdPatient));
      } catch (error: any) {
        results.failedImports++;
        results.errors.push({
          index: i,
          patientData,
          error: error.message || "Unknown error occurred",
        });

        console.error(`Error importing patient at index ${i}:`, error);
      }
    }

    // Return results
    const response: BulkImportResponse = {
      success: results.successfulImports > 0,
      message: `Bulk import completed. ${results.successfulImports} patients imported successfully, ${results.duplicateSkipped} duplicates skipped, ${results.failedImports} failed.`,
      results,
    };

    return NextResponse.json(response, {
      status: results.failedImports === body.length ? 400 : 200,
    });
  } catch (error: any) {
    console.error("Bulk import error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to process bulk import",
      },
      { status: 500 }
    );
  }
}
