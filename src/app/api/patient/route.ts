// src/app/api/patient/route.ts - Updated DELETE method with Cloudinary integration
import { dbConnect } from "@/db";
import PatientSchema from "@/models/Patient";
import mongoose, { isValidObjectId, Model } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { buildPaginationQuery, createPaginatedResponse } from "@/utils/paginationHelpers";
import { PaginationParams } from "@/interfaces/IPagination";
import { batchDeleteFromCloudinary, extractPublicIdFromUrl } from "@/utils/cloudinaryUploader";

// Define the Patient interface to match the schema
interface IPatientDocument extends mongoose.Document {
  name: string;
  HN_code: string;
  ID_code?: string;
  history?: Array<{
    timestamp?: Date;
    document_urls?: string[];
    notes?: string;
  }>;
  lastVisit?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// Get the correct model for the specific clinic with proper typing
function getPatientModel(clinicId: string): Model<IPatientDocument> {
  const modelName = `Patient_${clinicId}`;
  const collectionName = `patients_clinic_${clinicId}`;

  // If model already exists, return it with proper typing
  if (mongoose.models[modelName]) {
    return mongoose.models[modelName] as Model<IPatientDocument>;
  }

  // Otherwise, create it with proper typing
  return mongoose.model<IPatientDocument>(modelName, PatientSchema, collectionName);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinicId");
    const patientId = searchParams.get("id");
    
    // Extract pagination parameters
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = (searchParams.get("sortOrder") || "desc") as "asc" | "desc";

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

      const patient = await Patient.findById(patientId).lean().exec();

      if (!patient) {
        return NextResponse.json(
          { success: false, error: "Patient not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, patient });
    }

    // Build pagination query
    const paginationParams: PaginationParams = {
      page,
      limit,
      search,
      sortBy,
      sortOrder,
    };

    const searchFields = ["name", "HN_code", "ID_code"];
    const { query, skip, sort } = buildPaginationQuery(paginationParams, searchFields);

    // Execute query with pagination using proper error handling
    try {
      const [patients, totalItems] = await Promise.all([
        Patient.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean() // Use lean() for better performance
          .exec(), // Explicitly call exec()
        Patient.countDocuments(query).exec(),
      ]);

      // Create paginated response
      const paginatedResponse = createPaginatedResponse(
        patients,
        totalItems,
        page,
        limit
      );

      return NextResponse.json({ 
        success: true, 
        ...paginatedResponse
      });
    } catch (queryError) {
      console.error("Error executing patient query:", queryError);
      return NextResponse.json(
        { success: false, error: "Failed to query patients" },
        { status: 500 }
      );
    }
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
      try {
        // Find the patient with the highest HN code
        const lastPatient = await Patient
          .findOne({}, { HN_code: 1 })
          .sort({ HN_code: -1 })
          .lean()
          .exec();

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
      } catch (hnError) {
        console.error("Error generating HN code:", hnError);
        return NextResponse.json(
          { success: false, error: "Failed to generate HN code" },
          { status: 500 }
        );
      }
    }

    // Determine the lastVisit date
    let lastVisit = body.lastVisit;
    
    // If the history array exists, check for the latest history record date
    if (body.history && Array.isArray(body.history) && body.history.length > 0) {
      // Sort history records by timestamp (newest first)
      const sortedHistory = [...body.history].sort((a, b) => {
        const dateA = new Date(a.timestamp).getTime();
        const dateB = new Date(b.timestamp).getTime();
        return dateB - dateA;
      });
      
      // Set lastVisit to the timestamp of the newest history record
      if (sortedHistory[0] && sortedHistory[0].timestamp) {
        lastVisit = sortedHistory[0].timestamp;
      }
    }
    
    // If no lastVisit is determined from history, use the provided lastVisit or current date
    if (!lastVisit) {
      lastVisit = new Date(); // Default to creation date
    }

    // Create patient with proper lastVisit
    const patientToCreate = {
      ...body,
      lastVisit,
    };

    const patient = await Patient.create(patientToCreate);

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

    const body = await request.json();
    await dbConnect();

    const Patient = getPatientModel(clinicId);
    
    // Get the current patient to update the lastVisit field if needed
    const currentPatient = await Patient.findById(patientId).lean().exec();
    
    if (!currentPatient) {
      return NextResponse.json(
        { success: false, error: "Patient not found" }, 
        { status: 404 }
      );
    }

    // Determine the lastVisit date
    let lastVisit = body.lastVisit;
    
    // If the history array is being updated, check for the latest history record date
    if (body.history && Array.isArray(body.history) && body.history.length > 0) {
      // Sort history records by timestamp (newest first)
      const sortedHistory = [...body.history].sort((a, b) => {
        const dateA = new Date(a.timestamp).getTime();
        const dateB = new Date(b.timestamp).getTime();
        return dateB - dateA;
      });
      
      // Set lastVisit to the timestamp of the newest history record
      if (sortedHistory[0] && sortedHistory[0].timestamp) {
        lastVisit = sortedHistory[0].timestamp;
      }
    }
    
    // If no lastVisit is determined, use the original lastVisit or createdAt
    if (!lastVisit) {
      lastVisit = currentPatient.lastVisit || currentPatient.createdAt;
    }

    // Update patient with new data including the determined lastVisit
    const updatedPatient = await Patient.findByIdAndUpdate(
      patientId,
      { 
        ...body, 
        lastVisit, 
        updatedAt: new Date() 
      },
      { new: true, runValidators: true }
    ).exec();

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
    const forceDelete = searchParams.get("forceDelete") === "true";

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

    // First, get the patient to collect all document URLs
    const patient = await Patient.findById(patientId).lean().exec();

    if (!patient) {
      return NextResponse.json(
        { success: false, error: "Patient not found" },
        { status: 404 }
      );
    }

    console.log('Deleting patient:', {
      patientId,
      name: patient.name,
      HN_code: patient.HN_code,
      historyCount: patient.history?.length || 0
    });

    // Collect all document URLs from medical history
    const documentUrls: string[] = [];
    if (patient.history) {
      patient.history.forEach((record: any) => {
        if (record.document_urls && Array.isArray(record.document_urls)) {
          documentUrls.push(...record.document_urls);
        }
      });
    }

    console.log('Found documents to delete:', {
      totalDocuments: documentUrls.length,
      urls: documentUrls
    });

    // Delete patient from database first
    await Patient.findByIdAndDelete(patientId).exec();
    console.log('Patient deleted from database');

    // If there are documents to delete, clean them up from Cloudinary
    if (documentUrls.length > 0) {
      try {
        // Extract public IDs from URLs
        const publicIds = documentUrls
          .map(url => extractPublicIdFromUrl(url))
          .filter(id => id !== null) as string[];

        console.log('Extracted public IDs for deletion:', publicIds);

        if (publicIds.length > 0) {
          const cleanupResult = await batchDeleteFromCloudinary(publicIds);
          
          console.log('Cloudinary cleanup result:', cleanupResult);

          if (!cleanupResult.success || cleanupResult.failed.length > 0) {
            const failedCount = cleanupResult.failed.length;
            const successCount = cleanupResult.deleted.length;
            
            console.warn('Some files could not be deleted from Cloudinary:', {
              successful: successCount,
              failed: failedCount,
              failedFiles: cleanupResult.failed
            });
            
            // If not forced delete and some files failed, we already deleted from DB
            // so we'll just warn but continue (patient is already deleted)
            if (!forceDelete && failedCount > 0) {
              return NextResponse.json({
                success: true,
                message: `Patient deleted successfully, but ${failedCount} file(s) could not be removed from storage`,
                filesDeleted: successCount,
                filesNotDeleted: failedCount,
                warning: "Some files may remain in cloud storage"
              });
            }
          }
        }
      } catch (error) {
        console.error('Error during Cloudinary cleanup:', error);
        
        // Patient is already deleted from DB, so we'll return success with warning
        return NextResponse.json({
          success: true,
          message: "Patient deleted successfully, but file cleanup encountered errors",
          filesDeleted: 0,
          filesNotDeleted: documentUrls.length,
          warning: "Files may remain in cloud storage due to cleanup error",
          cleanupError: error instanceof Error ? error.message : "Unknown cleanup error"
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Patient deleted successfully",
      filesDeleted: documentUrls.length,
      filesNotDeleted: 0
    });
  } catch (error) {
    console.error("DELETE patient error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete patient" },
      { status: 500 }
    );
  }
}