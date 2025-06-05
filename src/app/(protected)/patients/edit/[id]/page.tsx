// src/app/(protected)/patients/edit/[id]/page.tsx - FIXED: Clinic info display and locked clinic selection
"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Navbar,
  Sidebar,
  LoadingScreen,
  ErrorScreen,
  MedicalHistorySection,
  ThaiDatePicker,
  ThaiAddressInput,
} from "@/components";
import { IPatient, IClinic, IHistoryRecord, IPatientAddress } from "@/interfaces";
import {
  TemporaryFile,
  revokeFilePreviewUrl,
} from "@/utils/temporaryFileStorage";
import { uploadToCloudinary } from "@/utils/cloudinaryUploader";
import { useAppSelector } from "@/redux/hooks/useAppSelector";
import { useAppDispatch } from "@/redux/hooks/useAppDispatch";
import {
  fetchPatientById,
  updatePatient,
} from "@/redux/features/patients/patientsSlice";
import { fetchClinics } from "@/redux/features/clinics/clinicsSlice";
import { fetchAdminData } from "@/redux/features/admin/adminSlice";
import { useAuth } from "@/context";
import { toIdString } from "@/utils/mongoHelpers";
import { lightenColor, generateClinicColorTheme } from "@/utils/colorUtils";

// Fix type for Next.js 15 - params is now a Promise
interface PageProps {
  params: Promise<{ id: string }>;
}

// Interface for tracking pending file deletions
interface PendingFileDeletion {
  recordIndex: number;
  documentIndex: number;
  url: string;
  filename: string;
}

export default function EditPatient({ params }: PageProps) {
  // State to store the actual patient ID once params are resolved
  const [patientId, setPatientId] = useState<string | null>(null);

  // Router and search params
  const router = useRouter();
  const searchParams = useSearchParams();
  const clinicId = searchParams.get("clinicId");

  // Redux hooks
  const dispatch = useAppDispatch();
  const adminInfo = useAppSelector((state) => state.admin);
  const clinicsState = useAppSelector((state) => state.clinics);
  const patientLoading = useAppSelector((state) => state.patients.loading);
  const patientFromStore = useAppSelector(
    (state) => state.patients.currentPatient
  );

  // Auth context
  const { isAuthenticated, logout, loading } = useAuth();

  // State for patient data and edit tracking
  const [patient, setPatient] = useState<Partial<IPatient>>({
    name: "",
    HN_code: "",
    ID_code: "",
    lastVisit: undefined,
    history: [],
    address: {},
  });
  const [originalPatient, setOriginalPatient] =
    useState<Partial<IPatient> | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // State for tracking pending file operations
  const [pendingFileDeletions, setPendingFileDeletions] = useState<
    PendingFileDeletion[]
  >([]);

  // NEW: State for tracking temporary files (pending uploads)
  const [temporaryFiles, setTemporaryFiles] = useState<TemporaryFile[]>([]);

  // State for clinics - FIXED: Better clinic state management
  const [selectedClinic, setSelectedClinic] = useState<IClinic | undefined>(
    undefined
  );

  // State for showing discard confirmation
  const [showDiscardConfirmation, setShowDiscardConfirmation] = useState(false);

  // FIXED: Safe helper functions for clinic color handling
  const getClinicColor = (clinic: IClinic | undefined): string | undefined => {
    return clinic?.color;
  };

  const getClinicColorWithFallback = (
    clinic: IClinic | undefined, 
    fallback: string
  ): string => {
    return clinic?.color || fallback;
  };

  const getClinicLightColor = (
    clinic: IClinic | undefined, 
    amount: number = 0.9
  ): string => {
    if (!clinic?.color) return '#EBF8FF';
    return lightenColor(clinic.color, amount);
  };

  // FIXED: Generate dynamic styles with proper fallbacks
  const getDynamicStyles = () => {
    const clinicColor = getClinicColor(selectedClinic);
    
    if (!clinicColor) {
      return {
        background: 'linear-gradient(135deg, #EBF8FF 0%, white 100%)',
        cardBorderColor: '#DBEAFE',
        inputBackground: '#EBF8FF',
        inputBorderColor: '#DBEAFE',
        textColor: '#1E40AF',
        buttonColor: '#3B82F6',
        buttonHoverColor: '#1D4ED8',
      };
    }

    return {
      background: `linear-gradient(135deg, ${lightenColor(clinicColor, 0.97)} 0%, white 100%)`,
      cardBorderColor: lightenColor(clinicColor, 0.8),
      inputBackground: lightenColor(clinicColor, 0.95),
      inputBorderColor: lightenColor(clinicColor, 0.8),
      textColor: clinicColor,
      buttonColor: clinicColor,
      buttonHoverColor: lightenColor(clinicColor, -0.1),
    };
  };

  const dynamicStyles = getDynamicStyles();

  // Resolve params Promise for Next.js 15
  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params;
      setPatientId(resolvedParams.id);
    };
    resolveParams();
  }, [params]);

  // Fetch admin data and clinics when component mounts
  useEffect(() => {
    dispatch(fetchAdminData());
  }, [dispatch]);

  // Fetch clinics when admin data is available
  useEffect(() => {
    if (adminInfo.id && adminInfo.loading === "succeeded") {
      dispatch(fetchClinics(adminInfo.id));
    }
  }, [adminInfo.loading, adminInfo.id, dispatch]);

  // FIXED: Set selected clinic based on URL param with proper clinic data
  useEffect(() => {
    if (
      clinicsState.loading === "succeeded" &&
      Array.isArray(clinicsState.items) &&
      clinicsState.items.length > 0 &&
      clinicId
    ) {
      const clinic = clinicsState.items.find(
        (c) => toIdString(c._id) === clinicId
      );
      if (clinic) {
        console.log('Setting selected clinic:', clinic);
        setSelectedClinic(clinic);
      } else {
        console.warn('Clinic not found for ID:', clinicId);
      }
    }
  }, [clinicsState.loading, clinicsState.items, clinicId]);

  // Fetch patient data when ID is available
  useEffect(() => {
    if (patientId && clinicId) {
      dispatch(fetchPatientById({ patientId, clinicId }));
    }
  }, [patientId, clinicId, dispatch]);

  // Update local state when patient data is loaded
  useEffect(() => {
    if (patientFromStore && patientLoading === "succeeded") {
      // Process dates in history records
      const processedHistory = patientFromStore.history
        ? patientFromStore.history.map((record) => ({
            ...record,
            timestamp:
              typeof record.timestamp === "string"
                ? new Date(record.timestamp)
                : record.timestamp,
          }))
        : [];

      // Sort history by date (newest first)
      const sortedHistory = [...processedHistory].sort((a, b) => {
        const dateA = new Date(a.timestamp).getTime();
        const dateB = new Date(b.timestamp).getTime();
        return dateB - dateA; // Sort descending (newest first)
      });

      const patientData = {
        ...patientFromStore,
        history: sortedHistory,
      };

      setPatient(patientData);
      setOriginalPatient(JSON.parse(JSON.stringify(patientData))); // Deep copy
      setHasUnsavedChanges(false);

      // Clear pending operations when loading fresh data
      setPendingFileDeletions([]);
      setTemporaryFiles([]);
    }
  }, [patientFromStore, patientLoading]);

  // NEW: Check for unsaved changes including pending operations
  useEffect(() => {
    if (originalPatient && patient) {
      const hasDataChanges =
        JSON.stringify(patient) !== JSON.stringify(originalPatient);
      const hasPendingDeletions = pendingFileDeletions.length > 0;
      const hasPendingUploads = temporaryFiles.length > 0;
      setHasUnsavedChanges(
        hasDataChanges || hasPendingDeletions || hasPendingUploads
      );
    }
  }, [patient, originalPatient, pendingFileDeletions, temporaryFiles]);

  // Handle browser refresh/close with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue =
          "You have unsaved changes. Are you sure you want to leave?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // NEW: Cleanup temporary files on unmount
  useEffect(() => {
    return () => {
      // Clean up object URLs to prevent memory leaks
      temporaryFiles.forEach((tempFile) => {
        if (tempFile.previewUrl) {
          revokeFilePreviewUrl(tempFile.previewUrl);
        }
      });
    };
  }, []);

  // Handle input changes for patient info
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Special handling for date fields
    if (name === "lastVisit" && value) {
      setPatient((prev) => ({
        ...prev,
        [name]: new Date(value),
      }));
    } else {
      setPatient((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const uploadTemporaryFiles = async (
    tempFiles: TemporaryFile[]
  ): Promise<string[]> => {
    if (!selectedClinic || tempFiles.length === 0) return [];

    console.log(`Starting upload of ${tempFiles.length} temporary files...`);

    const uploadResults: string[] = [];

    // Upload files sequentially to avoid overwhelming the server
    for (let i = 0; i < tempFiles.length; i++) {
      const tempFile = tempFiles[i];

      try {
        console.log(
          `Uploading file ${i + 1}/${tempFiles.length}: ${tempFile.filename}`
        );

        // Convert File to Buffer
        const arrayBuffer = await tempFile.file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to Cloudinary
        const result = await uploadToCloudinary(buffer, {
          clinicId: toIdString(selectedClinic._id),
          clinicName: selectedClinic.name,
          filename: tempFile.filename,
          fileType: tempFile.type,
          patientId: patientId || undefined,
        });

        if (!result.success) {
          throw new Error(result.error || "Upload failed");
        }

        uploadResults.push(result.url!);
        console.log(
          `Successfully uploaded: ${tempFile.filename} -> ${result.url}`
        );
      } catch (error) {
        console.error(
          `Failed to upload temporary file: ${tempFile.filename}`,
          error
        );
        // Stop the upload process on first failure
        throw new Error(
          `Failed to upload ${tempFile.filename}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    }

    console.log(`All ${tempFiles.length} files uploaded successfully`);
    return uploadResults;
  };

  // Helper function to actually delete files from Cloudinary
  const deleteFilesFromCloudinary = async (urls: string[]): Promise<void> => {
    if (!selectedClinic || urls.length === 0) return;

    try {
      console.log("Deleting files from Cloudinary:", urls);

      // Delete files one by one
      for (const url of urls) {
        const deleteResponse = await fetch(
          `/api/clinic/${toIdString(
            selectedClinic._id
          )}/files?url=${encodeURIComponent(url)}`,
          { method: "DELETE" }
        );

        const result = await deleteResponse.json();

        if (!result.success) {
          console.warn(
            `Failed to delete file from Cloudinary: ${url}`,
            result.error
          );
          // Continue with other deletions even if one fails
        } else {
          console.log(`Successfully deleted file: ${url}`);
        }
      }
    } catch (error) {
      console.error("Error deleting files from Cloudinary:", error);
      // Don't throw - we want to continue with the save operation
    }
  };

  const processPatientDataForSave = (
    patientData: Partial<IPatient>,
    uploadedUrls: string[]
  ): Partial<IPatient> => {
    if (!patientData.history) return patientData;

    let urlIndex = 0;
    const processedHistory = patientData.history.map((record) => {
      if (!record.document_urls) return record;

      // FIXED: Filter out temp:// URLs and replace them with actual uploaded URLs
      const processedUrls: string[] = [];

      record.document_urls.forEach((url) => {
        if (url.startsWith("temp://")) {
          // Replace temporary URL with actual Cloudinary URL
          if (urlIndex < uploadedUrls.length) {
            processedUrls.push(uploadedUrls[urlIndex]);
            urlIndex++;
          }
          // If we run out of uploaded URLs, skip this temp URL (shouldn't happen)
        } else {
          // Keep existing non-temporary URLs
          processedUrls.push(url);
        }
      });

      return {
        ...record,
        document_urls: processedUrls,
      };
    });

    return {
      ...patientData,
      history: processedHistory,
    };
  };

  const handleSave = async () => {
    if (!patient._id || !clinicId) {
      alert("Missing patient ID or clinic ID");
      return;
    }

    // Validate required fields
    if (!patient.name || !patient.HN_code) {
      alert("Name and Hospital Number (HN) are required fields");
      return;
    }

    setIsSaving(true);

    try {
      console.log("Starting save process...", {
        pendingDeletions: pendingFileDeletions.length,
        temporaryFiles: temporaryFiles.length,
      });

      // Step 1: Upload temporary files to Cloudinary
      let uploadedUrls: string[] = [];
      if (temporaryFiles.length > 0) {
        console.log("Uploading temporary files to Cloudinary...");
        uploadedUrls = await uploadTemporaryFiles(temporaryFiles);
        console.log("Upload completed. URLs:", uploadedUrls);
      }

      // Step 2: Process patient data to replace temporary URLs with real ones
      const processedPatientData = processPatientDataForSave(
        patient,
        uploadedUrls
      );

      // VALIDATION: Ensure no temp:// URLs remain in the final data
      const hasRemainingTempUrls =
        JSON.stringify(processedPatientData).includes("temp://");
      if (hasRemainingTempUrls) {
        console.error(
          "ERROR: Temporary URLs still found in processed data!",
          processedPatientData
        );
        throw new Error(
          "Failed to process all temporary files. Please try again."
        );
      }

      // Step 3: Delete files from Cloudinary that are marked for deletion
      if (pendingFileDeletions.length > 0) {
        const urlsToDelete = pendingFileDeletions.map(
          (deletion) => deletion.url
        );
        await deleteFilesFromCloudinary(urlsToDelete);
        console.log(
          `Deleted ${pendingFileDeletions.length} files from Cloudinary`
        );
      }

      // Step 4: Save patient data to database
      console.log("Saving patient data to database...", processedPatientData);
      await dispatch(
        updatePatient({
          patientId: toIdString(patient._id),
          clinicId,
          patientData: processedPatientData,
        })
      ).unwrap();

      // Step 5: Update original state to current state
      setOriginalPatient(JSON.parse(JSON.stringify(processedPatientData)));

      // Step 6: Clear pending operations after successful save
      setPendingFileDeletions([]);

      // Clean up temporary files
      temporaryFiles.forEach((tempFile) => {
        if (tempFile.previewUrl) {
          revokeFilePreviewUrl(tempFile.previewUrl);
        }
      });
      setTemporaryFiles([]);

      setHasUnsavedChanges(false);

      console.log("Save process completed successfully");

      // Navigate back to dashboard after successful update
      router.push(`/dashboard`);
    } catch (error: any) {
      console.error("Failed to save patient:", error);
      alert(`Failed to save changes: ${error.message || "Unknown error"}`);
    } finally {
      setIsSaving(false);
    }
  };

  // UPDATED: Handle discard changes with pending operations
  const handleDiscard = async () => {
    if (hasUnsavedChanges) {
      setShowDiscardConfirmation(true);
    } else {
      router.push(`/dashboard`);
    }
  };

  // UPDATED: Confirm discard changes with pending operations
  const confirmDiscard = async () => {
    // Reset to original state
    if (originalPatient) {
      setPatient(JSON.parse(JSON.stringify(originalPatient)));
    }

    // Clear pending operations
    setPendingFileDeletions([]);

    // NEW: Clean up temporary files
    temporaryFiles.forEach((tempFile) => {
      if (tempFile.previewUrl) {
        revokeFilePreviewUrl(tempFile.previewUrl);
      }
    });
    setTemporaryFiles([]);

    setHasUnsavedChanges(false);
    setShowDiscardConfirmation(false);
    router.push(`/dashboard`);
  };

  // Cancel discard
  const cancelDiscard = () => {
    setShowDiscardConfirmation(false);
  };

  // FIXED: Clinic selection change handler - DISABLED in edit mode
  const handleClinicChange = (clinicId: string): void => {
    // Do nothing in edit mode - clinic is locked
    console.warn('Clinic change attempted in edit mode - operation blocked');
  };

  // Medical History handlers
  const handleAddRecord = (newRecord: IHistoryRecord) => {
    setPatient((prev) => {
      // Add the new record
      const updatedHistory = [...(prev.history || []), newRecord];

      // Sort by date (newest first)
      const sortedHistory = updatedHistory.sort((a, b) => {
        const dateA = new Date(a.timestamp).getTime();
        const dateB = new Date(b.timestamp).getTime();
        return dateB - dateA;
      });

      return {
        ...prev,
        history: sortedHistory,
      };
    });
  };

  const handleUpdateRecord = (index: number, updatedRecord: IHistoryRecord) => {
    setPatient((prev) => {
      if (!prev.history) return prev;

      const updatedHistory = [...prev.history];
      updatedHistory[index] = updatedRecord;

      return {
        ...prev,
        history: updatedHistory,
      };
    });
  };

  const handleRemoveRecord = async (index: number) => {
    if (confirm("Are you sure you want to delete this medical record?")) {
      // When removing a record, also remove any pending operations for that record
      setPendingFileDeletions((prev) =>
        prev.filter((deletion) => deletion.recordIndex !== index)
      );

      // NEW: Remove temporary files for this record
      setTemporaryFiles((prev) =>
        prev.filter((tempFile) => tempFile.recordIndex !== index)
      );

      setPatient((prev) => {
        if (!prev.history) return prev;

        const updatedHistory = prev.history.filter((_, i) => i !== index);

        return {
          ...prev,
          history: updatedHistory,
        };
      });
    }
  };

  const handleUpdateRecordDate = (index: number, newDate: Date) => {
    setPatient((prev) => {
      if (!prev.history) return prev;

      const updatedHistory = [...prev.history];
      updatedHistory[index] = {
        ...updatedHistory[index],
        timestamp: newDate,
      };

      // Re-sort by date (newest first)
      const sortedHistory = updatedHistory.sort((a, b) => {
        const dateA = new Date(a.timestamp).getTime();
        const dateB = new Date(b.timestamp).getTime();
        return dateB - dateA;
      });

      return {
        ...prev,
        history: sortedHistory,
      };
    });
  };

  // Document handlers
  const handleAddDocument = async (recordIndex: number, url: string) => {
    setPatient((prev) => {
      if (!prev.history) return prev;

      const updatedHistory = [...prev.history];
      const record = updatedHistory[recordIndex];

      if (!record) return prev;

      updatedHistory[recordIndex] = {
        ...record,
        document_urls: [...(record.document_urls || []), url],
      };

      return {
        ...prev,
        history: updatedHistory,
      };
    });
  };

  // Document removal handler - marks for deletion
  const handleRemoveDocument = async (
    recordIndex: number,
    documentIndex: number
  ) => {
    if (!patient.history || !patient.history[recordIndex]) return;

    const record = patient.history[recordIndex];
    const documentUrl = record.document_urls?.[documentIndex];

    if (!documentUrl) return;

    // Extract filename for display purposes
    const filename = documentUrl.split("/").pop() || "Document";

    console.log("Marking document for deletion:", {
      recordIndex,
      documentIndex,
      url: documentUrl,
      filename,
    });

    // Add to pending deletions
    setPendingFileDeletions((prev) => [
      ...prev,
      {
        recordIndex,
        documentIndex,
        url: documentUrl,
        filename,
      },
    ]);

    // Remove from patient data (UI will show it as removed)
    setPatient((prev) => {
      if (!prev.history) return prev;

      const updatedHistory = [...prev.history];
      const record = updatedHistory[recordIndex];

      if (!record || !record.document_urls) return prev;

      updatedHistory[recordIndex] = {
        ...record,
        document_urls: record.document_urls.filter(
          (_, i) => i !== documentIndex
        ),
      };

      return {
        ...prev,
        history: updatedHistory,
      };
    });
  };

  // NEW: Handle temporary file addition
  const handleAddTemporaryFile = (
    recordIndex: number,
    tempFile: TemporaryFile
  ) => {
    console.log("Adding temporary file:", { recordIndex, tempFile });

    // Add to temporary files list
    setTemporaryFiles((prev) => [...prev, tempFile]);

    // Add placeholder URL to patient data
    setPatient((prev) => {
      if (!prev.history) return prev;

      const updatedHistory = [...prev.history];
      const record = updatedHistory[recordIndex];

      if (!record) return prev;

      updatedHistory[recordIndex] = {
        ...record,
        document_urls: [
          ...(record.document_urls || []),
          `temp://${tempFile.id}`,
        ],
      };

      return {
        ...prev,
        history: updatedHistory,
      };
    });
  };

  // NEW: Handle temporary file removal
  const handleRemoveTemporaryFile = (tempFileId: string) => {
    console.log("Removing temporary file:", tempFileId);

    // Find and remove the temporary file
    const tempFile = temporaryFiles.find((tf) => tf.id === tempFileId);
    if (tempFile) {
      // Clean up preview URL
      if (tempFile.previewUrl) {
        revokeFilePreviewUrl(tempFile.previewUrl);
      }

      // Remove from temporary files list
      setTemporaryFiles((prev) => prev.filter((tf) => tf.id !== tempFileId));

      // Remove placeholder URL from patient data
      setPatient((prev) => {
        if (!prev.history) return prev;

        const updatedHistory = [...prev.history];
        const record = updatedHistory[tempFile.recordIndex];

        if (!record || !record.document_urls) return prev;

        updatedHistory[tempFile.recordIndex] = {
          ...record,
          document_urls: record.document_urls.filter(
            (url) => url !== `temp://${tempFileId}`
          ),
        };

        return {
          ...prev,
          history: updatedHistory,
        };
      });
    }
  };

  // Add address change handler
  const handleAddressChange = (address: IPatientAddress) => {
    setPatient((prev) => ({
      ...prev,
      address,
    }));
  };

  // Show loading screen while resolving params or loading data
  if (
    loading ||
    adminInfo.loading === "pending" ||
    patientLoading === "pending" ||
    !patientId // Show loading until params are resolved
  ) {
    return <LoadingScreen pageName="Edit Patient" />;
  }

  // Show error screens
  if (adminInfo.loading === "failed") {
    return (
      <ErrorScreen
        title="Admin Data Error"
        error={adminInfo.error || "Failed to load administrator data"}
        retry={() => dispatch(fetchAdminData())}
        goBack={() => router.push("/dashboard")}
      />
    );
  }

  if (clinicsState.loading === "failed") {
    return (
      <ErrorScreen
        title="Clinics Data Error"
        error={clinicsState.error || "Failed to load clinics data"}
        retry={() => dispatch(fetchClinics(adminInfo.id!))}
        goBack={() => router.push("/dashboard")}
      />
    );
  }

  if (patientLoading === "failed") {
    return (
      <ErrorScreen
        title="Patient Data Error"
        error={"Failed to load patient data"}
        retry={() =>
          dispatch(
            fetchPatientById({
              patientId: patientId!,
              clinicId: clinicId || "",
            })
          )
        }
        goBack={() => router.push("/dashboard")}
      />
    );
  }

  return (
    <div 
      className="min-h-screen transition-all duration-500"
      style={{ background: dynamicStyles.background }}
    >
      {/* Discard Confirmation Modal */}
      {showDiscardConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 
              className="text-xl font-bold mb-4"
              style={{ color: dynamicStyles.textColor }}
            >
              Discard Changes?
            </h3>
            <div className="mb-6">
              <p className="text-gray-700 mb-3">
                You have unsaved changes that will be lost:
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Patient information changes</li>
                {pendingFileDeletions.length > 0 && (
                  <li>
                    • {pendingFileDeletions.length} file(s) marked for deletion
                  </li>
                )}
                {temporaryFiles.length > 0 && (
                  <li>• {temporaryFiles.length} file(s) pending upload</li>
                )}
              </ul>
              <p className="text-gray-700 mt-3">
                Are you sure you want to continue?
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={cancelDiscard}
                className="flex-1 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition"
              >
                Keep Editing
              </button>
              <button
                onClick={confirmDiscard}
                className="flex-1 py-2 text-white rounded-lg transition"
                style={{ backgroundColor: '#DC2626' }}
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}

      <Navbar
        clinicName={selectedClinic?.name}
        adminUsername={adminInfo?.username || "Administrator"}
        logout={logout}
      />

      <div className="flex">
        <Sidebar
          clinics={Array.isArray(clinicsState.items) ? clinicsState.items : []}
          selectedClinic={selectedClinic}
          handleClinicChange={handleClinicChange} // FIXED: This will now do nothing in edit mode
        />

        <div className="flex-grow p-8">
          {/* Header with Main Save/Cancel Buttons */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
            <div>
              <h1 
                className="text-2xl font-semibold flex items-center gap-2"
                style={{ color: dynamicStyles.textColor }}
              >
                แก้ไขข้อมูลผู้ป่วย <span className="text-xl">👩‍⚕️</span>
                {hasUnsavedChanges && (
                  <span className="text-sm bg-orange-100 text-orange-600 px-2 py-1 rounded">
                    Unsaved changes
                  </span>
                )}
              </h1>
              <p 
                className="text-slate-500"
              >
                ปรับปรุงข้อมูลผู้ป่วยและประวัติการรักษา
              </p>
              {/* NEW: Enhanced status display */}
              <div className="flex items-center space-x-3 mt-2">
                {pendingFileDeletions.length > 0 && (
                  <p className="text-sm text-red-600 bg-red-50 px-2 py-1 rounded">
                    {pendingFileDeletions.length} file(s) marked for deletion
                  </p>
                )}
                {temporaryFiles.length > 0 && (
                  <p className="text-sm text-orange-600 bg-orange-50 px-2 py-1 rounded">
                    {temporaryFiles.length} file(s) pending upload
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleDiscard}
                className="px-4 py-2 rounded-lg transition flex items-center gap-1 border border-gray-300 text-gray-600 hover:bg-gray-50"
                disabled={isSaving}
              >
                <span>Cancel</span> ❌
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !hasUnsavedChanges}
                className="flex items-center text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                style={{ backgroundColor: dynamicStyles.buttonColor }}
              >
                {isSaving ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Saving...
                  </>
                ) : (
                  <>Save Changes 💾</>
                )}
              </button>
            </div>
          </div>

          {/* FIXED: Clinic Info Display */}
          {selectedClinic && (
            <div className="mb-6">
              <div 
                className="bg-white rounded-xl p-4 shadow-sm border transition-all duration-300"
                style={{ borderColor: dynamicStyles.cardBorderColor }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">🏥</span>
                    <div>
                      <h3 
                        className="font-bold"
                        style={{ color: dynamicStyles.textColor }}
                      >
                        {selectedClinic.name}
                      </h3>
                      <p className="text-sm text-gray-500">คลินิกปัจจุบัน (ล็อคการเปลี่ยนแปลง)</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full">
                      🔒 EDIT MODE
                    </span>
                    <div 
                      className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: selectedClinic.color || '#3B82F6' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Patient Information Card */}
            <div className="lg:col-span-1">
              <div 
                className="bg-white rounded-xl p-6 shadow-sm border transition-all duration-300"
                style={{ borderColor: dynamicStyles.cardBorderColor }}
              >
                <h2 
                  className="text-xl font-medium mb-4 flex items-center gap-2"
                  style={{ color: dynamicStyles.textColor }}
                >
                  ข้อมูลผู้ป่วย 📋
                </h2>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <label
                        className="block text-sm font-medium text-slate-600 mb-1"
                        htmlFor="name"
                      >
                        ชื่อ-สกุล <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={patient.name || ""}
                        onChange={handleChange}
                        placeholder="Enter patient's full name"
                        required
                        className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-colors"
                        style={{
                          backgroundColor: dynamicStyles.inputBackground,
                          borderColor: dynamicStyles.inputBorderColor,
                          color: dynamicStyles.textColor,
                        }}
                      />
                    </div>

                    <div>
                      <label
                        className="block text-sm font-medium text-slate-600 mb-1"
                        htmlFor="HN_code"
                      >
                        เลขที่ HN <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="HN_code"
                        name="HN_code"
                        value={patient.HN_code || ""}
                        onChange={handleChange}
                        placeholder="Enter HN code"
                        required
                        className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-colors"
                        style={{
                          backgroundColor: dynamicStyles.inputBackground,
                          borderColor: dynamicStyles.inputBorderColor,
                          color: dynamicStyles.textColor,
                        }}
                      />
                    </div>

                    <div>
                      <label
                        className="block text-sm font-medium text-slate-600 mb-1"
                        htmlFor="ID_code"
                      >
                        เลขบัตรประชาชน
                      </label>
                      <input
                        type="text"
                        id="ID_code"
                        name="ID_code"
                        value={patient.ID_code || ""}
                        onChange={handleChange}
                        placeholder="Enter ID card number"
                        className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-colors"
                        style={{
                          backgroundColor: dynamicStyles.inputBackground,
                          borderColor: dynamicStyles.inputBorderColor,
                          color: dynamicStyles.textColor,
                        }}
                      />
                    </div>

                    {/* Add ThaiAddressInput component */}
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">
                        ที่อยู่
                      </label>
                      <ThaiAddressInput
                        address={patient.address}
                        onChange={handleAddressChange}
                        clinicColor={selectedClinic?.color}
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      className="block text-sm font-medium text-slate-600 mb-1"
                      htmlFor="lastVisit"
                    >
                      วันที่เข้ารับบริการครั้งล่าสุด
                    </label>
                    <ThaiDatePicker
                      selectedDate={
                        patient.lastVisit ? new Date(patient.lastVisit) : null
                      }
                      onChange={(date) => {
                        setPatient((prev) => ({
                          ...prev,
                          lastVisit: date,
                        }));
                      }}
                      placeholder="เลือกวันที่เข้ารับบริการ"
                    />
                  </div>

                  <div 
                    className="p-4 rounded-lg border"
                    style={{
                      backgroundColor: getClinicLightColor(selectedClinic, 0.97),
                      borderColor: getClinicLightColor(selectedClinic, 0.9),
                    }}
                  >
                    <p 
                      className="text-sm"
                      style={{ color: dynamicStyles.textColor }}
                    >
                      <span className="font-bold">Note:</span> ใช้ปุ่ม "save
                      changes"
                      ด้านบนเพื่อบันทึกข้อมูลผู้ป่วยและประวัติการรักษาทั้งหมด
                      {temporaryFiles.length > 0 && (
                        <>
                          <br />
                          <span className="text-orange-600 font-medium">
                            ⚠️ Files will be uploaded when you save changes
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Medical History Section */}
            <div className="lg:col-span-2">
              <MedicalHistorySection
                patientId={patientId!}
                clinicId={
                  selectedClinic ? toIdString(selectedClinic._id) : undefined
                }
                historyRecords={patient.history || []}
                onAddRecord={handleAddRecord}
                onUpdateRecord={handleUpdateRecord}
                onRemoveRecord={handleRemoveRecord}
                onUpdateRecordDate={handleUpdateRecordDate}
                onAddDocument={handleAddDocument}
                onRemoveDocument={handleRemoveDocument}
                pendingFileDeletions={pendingFileDeletions}
                temporaryFiles={temporaryFiles} // NEW: Pass temporary files
                onAddTemporaryFile={handleAddTemporaryFile} // NEW: Pass handler
                onRemoveTemporaryFile={handleRemoveTemporaryFile} // NEW: Pass handler
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}