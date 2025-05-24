// src/app/(protected)/patients/edit/[id]/page.tsx - FIXED: Proper file deletion flow
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
} from "@/components";
import { IPatient, IClinic, IHistoryRecord } from "@/interfaces";
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

// Fix type for Next.js 15 - params is now a Promise
interface PageProps {
  params: Promise<{ id: string }>;
}

// NEW: Interface for tracking pending file deletions
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
  });
  const [originalPatient, setOriginalPatient] =
    useState<Partial<IPatient> | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // NEW: State for tracking pending file deletions
  const [pendingFileDeletions, setPendingFileDeletions] = useState<
    PendingFileDeletion[]
  >([]);

  // State for clinics
  const [selectedClinic, setSelectedClinic] = useState<IClinic | undefined>(
    undefined
  );

  // State for showing discard confirmation
  const [showDiscardConfirmation, setShowDiscardConfirmation] = useState(false);

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

  // Set selected clinic based on URL param
  useEffect(() => {
    if (
      clinicsState.loading === "succeeded" &&
      Array.isArray(clinicsState.items) &&
      clinicsState.items.length > 0
    ) {
      if (clinicId) {
        const clinic = clinicsState.items.find(
          (c) => toIdString(c._id) === clinicId
        );
        if (clinic) {
          setSelectedClinic(clinic);
        }
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

      // NEW: Clear pending deletions when loading fresh data
      setPendingFileDeletions([]);
    }
  }, [patientFromStore, patientLoading]);

  // NEW: Check for unsaved changes including pending deletions
  useEffect(() => {
    if (originalPatient && patient) {
      const hasDataChanges =
        JSON.stringify(patient) !== JSON.stringify(originalPatient);
      const hasPendingDeletions = pendingFileDeletions.length > 0;
      setHasUnsavedChanges(hasDataChanges || hasPendingDeletions);
    }
  }, [patient, originalPatient, pendingFileDeletions]);

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

  // NEW: Helper function to actually delete files from Cloudinary
  const deleteFilesFromCloudinary = async (urls: string[]): Promise<void> => {
    if (!selectedClinic || urls.length === 0) return;

    try {
      console.log("Deleting files from Cloudinary:", urls);

      // Delete files one by one (you could also implement batch delete)
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

  // UPDATED: Save handler with proper file deletion
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
      // NEW: First, delete files from Cloudinary that are marked for deletion
      if (pendingFileDeletions.length > 0) {
        const urlsToDelete = pendingFileDeletions.map(
          (deletion) => deletion.url
        );
        await deleteFilesFromCloudinary(urlsToDelete);
        console.log(
          `Deleted ${pendingFileDeletions.length} files from Cloudinary`
        );
      }

      // Save patient data to database
      await dispatch(
        updatePatient({
          patientId: toIdString(patient._id),
          clinicId,
          patientData: patient,
        })
      ).unwrap();

      // Update original state to current state
      setOriginalPatient(JSON.parse(JSON.stringify(patient)));

      // NEW: Clear pending deletions after successful save
      setPendingFileDeletions([]);
      setHasUnsavedChanges(false);

      // Navigate back to dashboard after successful update
      router.push(`/dashboard`);
    } catch (error: any) {
      console.error("Failed to update patient:", error);
      alert(`Failed to save changes: ${error.message || "Unknown error"}`);
    } finally {
      setIsSaving(false);
    }
  };

  // UPDATED: Handle discard changes with pending deletions
  const handleDiscard = async () => {
    if (hasUnsavedChanges) {
      setShowDiscardConfirmation(true);
    } else {
      router.push(`/dashboard`);
    }
  };

  // UPDATED: Confirm discard changes with pending deletions
  const confirmDiscard = async () => {
    // Reset to original state
    if (originalPatient) {
      setPatient(JSON.parse(JSON.stringify(originalPatient)));
    }

    // NEW: Clear pending deletions (files will remain in Cloudinary)
    setPendingFileDeletions([]);
    setHasUnsavedChanges(false);
    setShowDiscardConfirmation(false);
    router.push(`/dashboard`);
  };

  // Cancel discard
  const cancelDiscard = () => {
    setShowDiscardConfirmation(false);
  };

  // Clinic selection change handler
  const handleClinicChange = (clinicId: string): void => {
    if (!clinicId) return;

    const clinic = clinicsState.items.find(
      (c) => toIdString(c._id) === clinicId
    );
    if (clinic) {
      setSelectedClinic(clinic);
    }
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

  // Simplified record removal
  const handleRemoveRecord = async (index: number) => {
    if (confirm("Are you sure you want to delete this medical record?")) {
      // NEW: When removing a record, also remove any pending deletions for that record
      setPendingFileDeletions((prev) =>
        prev.filter((deletion) => deletion.recordIndex !== index)
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

  // NEW: Updated document removal handler - only marks for deletion
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

    // NEW: Add to pending deletions instead of deleting immediately
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

  // NEW: Helper function to check if a file is pending deletion
  const isFilePendingDeletion = (
    recordIndex: number,
    documentIndex: number
  ): boolean => {
    return pendingFileDeletions.some(
      (deletion) =>
        deletion.recordIndex === recordIndex &&
        deletion.documentIndex === documentIndex
    );
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      {/* Discard Confirmation Modal */}
      {showDiscardConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-xl font-bold text-red-600 mb-4">
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
                className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
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
          handleClinicChange={handleClinicChange}
        />

        <div className="flex-grow p-8">
          {/* Header with Main Save/Cancel Buttons */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-blue-800 flex items-center gap-2">
                แก้ไขข้อมูลผู้ป่วย <span className="text-xl">👩‍⚕️</span>
                {hasUnsavedChanges && (
                  <span className="text-sm bg-orange-100 text-orange-600 px-2 py-1 rounded">
                    Unsaved changes
                  </span>
                )}
              </h1>
              <p className="text-slate-500">
                ปรับปรุงข้อมูลผู้ป่วยและประวัติการรักษา
              </p>
              {/* NEW: Show pending deletions info */}
              {pendingFileDeletions.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-orange-600 bg-orange-50 px-2 py-1 rounded">
                    {pendingFileDeletions.length} file(s) marked for deletion -
                    will be removed when you save
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleDiscard}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition flex items-center gap-1"
                disabled={isSaving}
              >
                <span>Cancel</span> ❌
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !hasUnsavedChanges}
                className="flex items-center bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors disabled:bg-blue-300"
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

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Patient Information Card */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-blue-100">
                <h2 className="text-xl text-blue-700 font-medium mb-4 flex items-center gap-2">
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
                        className="w-full px-4 py-2 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50"
                      />
                    </div>

                    <div>
                      <label
                        className="block text-sm font-medium text-slate-600 mb-1"
                        htmlFor="HN_code"
                      >
                        Hospital Number (HN){" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="HN_code"
                        name="HN_code"
                        value={patient.HN_code || ""}
                        onChange={handleChange}
                        disabled={true}
                        className="w-full px-4 py-2 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-100 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      className="block text-sm font-medium text-slate-600 mb-1"
                      htmlFor="ID_code"
                    >
                      รหัสประชาชน
                    </label>
                    <input
                      type="text"
                      id="ID_code"
                      name="ID_code"
                      value={patient.ID_code || ""}
                      onChange={handleChange}
                      placeholder="Enter ID number (optional)"
                      className="w-full px-4 py-2 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50"
                    />
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

                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <p className="text-sm text-blue-600">
                      <span className="font-bold">Note:</span> ใช้ปุ่ม "save
                      changes"
                      ด้านบนเพื่อบันทึกข้อมูลผู้ป่วยและประวัติการรักษาทั้งหมด
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
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
