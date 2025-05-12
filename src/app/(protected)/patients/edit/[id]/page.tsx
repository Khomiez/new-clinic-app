// src/app/(protected)/patients/edit/[id]/page.tsx - Final version
"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Navbar,
  Sidebar,
  LoadingScreen,
  ErrorScreen,
  PatientForm,
  MedicalHistorySection,
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
import { Types } from "mongoose";

// Helper function to format date for input fields
const formatDateForInput = (date: string | Date | undefined): string => {
  if (!date) return "";

  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toISOString().split("T")[0];
  } catch (e) {
    return "";
  }
};

export default function EditPatient({ params }: { params: { id: string } }) {
  // Get patient ID from route params
  const patientId = params.id;

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
  const [originalPatient, setOriginalPatient] = useState<Partial<IPatient> | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRollbackInProgress, setIsRollbackInProgress] = useState(false);

  // State for clinics
  const [selectedClinic, setSelectedClinic] = useState<IClinic | undefined>(
    undefined
  );

  // State for showing discard confirmation
  const [showDiscardConfirmation, setShowDiscardConfirmation] = useState(false);

  // State for tracking pending file operations
  const [pendingFileOperations, setPendingFileOperations] = useState<{
    type: 'add' | 'remove';
    recordIndex: number;
    url: string;
    documentIndex?: number;
  }[]>([]);

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
    }
  }, [patientFromStore, patientLoading]);

  // Check for unsaved changes
  useEffect(() => {
    if (originalPatient && patient) {
      const hasChanges = JSON.stringify(patient) !== JSON.stringify(originalPatient);
      setHasUnsavedChanges(hasChanges || pendingFileOperations.length > 0);
    }
  }, [patient, originalPatient, pendingFileOperations]);

  // Handle browser refresh/close with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
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

  // Enhanced save handler with rollback on failure
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
      // Save patient data
      await dispatch(
        updatePatient({
          patientId: toIdString(patient._id),
          clinicId,
          patientData: patient,
        })
      ).unwrap();

      // Clear pending operations after successful save
      setPendingFileOperations([]);
      
      // Update original state to current state
      setOriginalPatient(JSON.parse(JSON.stringify(patient)));
      setHasUnsavedChanges(false);

      // Navigate back to dashboard after successful update
      router.push(`/dashboard`);
    } catch (error: any) {
      console.error("Failed to update patient:", error);
      
      // Show error and ask if user wants to keep editing
      const keepEditing = confirm(
        `Failed to save changes: ${error.message || 'Unknown error'}. Would you like to keep editing?`
      );
      
      if (!keepEditing) {
        // Reset to original state and go back
        await handleDiscard();
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSave();
  };

  // Rollback pending file operations
  const rollbackPendingOperations = async () => {
    if (pendingFileOperations.length === 0) return;

    setIsRollbackInProgress(true);
    
    try {
      // Extract URLs of files that need to be deleted
      const urlsToDelete = pendingFileOperations
        .filter(op => op.type === 'add')
        .map(op => op.url);

      if (urlsToDelete.length > 0) {
        // Delete newly added files from Cloudinary
        const response = await fetch('/api/upload/batch-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ urls: urlsToDelete })
        });

        if (!response.ok) {
          console.warn('Some files could not be deleted during rollback');
        }
      }
    } catch (error) {
      console.error('Error during rollback:', error);
    } finally {
      setPendingFileOperations([]);
      setIsRollbackInProgress(false);
    }
  };

  // Handle discard changes
  const handleDiscard = async () => {
    if (hasUnsavedChanges) {
      setShowDiscardConfirmation(true);
    } else {
      router.push(`/dashboard`);
    }
  };

  // Confirm discard changes
  const confirmDiscard = async () => {
    // Rollback any pending file operations
    await rollbackPendingOperations();
    
    // Reset to original state
    if (originalPatient) {
      setPatient(JSON.parse(JSON.stringify(originalPatient)));
      setHasUnsavedChanges(false);
    }
    
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

  const handleRemoveRecord = async (index: number) => {
    if (
      confirm(
        "Are you sure you want to remove this record? This will also delete any attached documents."
      )
    ) {
      try {
        // Check if the record has documents
        const recordToDelete = patient.history?.[index];

        if (
          recordToDelete?.document_urls &&
          recordToDelete.document_urls.length > 0
        ) {
          // Delete all documents from Cloudinary first
          const response = await fetch("/api/upload/batch-delete", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              urls: recordToDelete.document_urls,
            }),
          });

          const result = await response.json();

          if (!result.success) {
            console.warn(
              "Some files could not be deleted from storage",
              result
            );
            
            if (!confirm("Some files could not be deleted from storage. Continue anyway?")) {
              return;
            }
          }
        }

        // Then remove from local state
        setPatient((prev) => ({
          ...prev,
          history: prev.history?.filter((_, i) => i !== index),
        }));
      } catch (error) {
        console.error("Error removing record:", error);
        alert(
          "There was a problem deleting the record. Some files might not have been removed."
        );
      }
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

  const handleAddDocument = (recordIndex: number, url: string) => {
    setPatient((prev) => {
      if (!prev.history) return prev;

      // Make sure we don't exceed the bounds of the array
      if (recordIndex < 0 || recordIndex >= prev.history.length) {
        console.error(`Invalid record index: ${recordIndex}. Valid range: 0-${prev.history.length - 1}`);
        return prev;
      }

      const updatedHistory = [...prev.history];
      const record = updatedHistory[recordIndex];

      // Check if the record exists
      if (!record) {
        console.error(`Record at index ${recordIndex} is undefined`);
        return prev;
      }

      updatedHistory[recordIndex] = {
        ...record,
        document_urls: [...(record.document_urls || []), url],
      };

      // Track this operation for potential rollback
      setPendingFileOperations(prev => [...prev, {
        type: 'add',
        recordIndex,
        url
      }]);

      return {
        ...prev,
        history: updatedHistory,
      };
    });
  };

  const handleRemoveDocument = (recordIndex: number, documentIndex: number) => {
    setPatient((prev) => {
      if (!prev.history) return prev;

      // Make sure we don't exceed the bounds of the array
      if (recordIndex < 0 || recordIndex >= prev.history.length) {
        console.error(`Invalid record index: ${recordIndex}. Valid range: 0-${prev.history.length - 1}`);
        return prev;
      }

      const updatedHistory = [...prev.history];
      const record = updatedHistory[recordIndex];

      // Check if the record exists
      if (!record) {
        console.error(`Record at index ${recordIndex} is undefined`);
        return prev;
      }

      // Check if the document_urls array exists and has the specified document
      if (!record.document_urls || documentIndex < 0 || documentIndex >= record.document_urls.length) {
        console.error(`Invalid document index: ${documentIndex} for record ${recordIndex}`);
        return prev;
      }

      const removedUrl = record.document_urls[documentIndex];

      updatedHistory[recordIndex] = {
        ...record,
        document_urls: record.document_urls.filter((_, i) => i !== documentIndex),
      };

      // Track this operation for potential rollback
      setPendingFileOperations(prev => [...prev, {
        type: 'remove',
        recordIndex,
        url: removedUrl,
        documentIndex
      }]);

      return {
        ...prev,
        history: updatedHistory,
      };
    });
  };

  // Show loading screen
  if (
    loading ||
    adminInfo.loading === "pending" ||
    patientLoading === "pending"
  ) {
    return <LoadingScreen pageName="Edit Patient" />;
  }

  // Show error if admin data or clinics failed to load
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
          dispatch(fetchPatientById({ patientId, clinicId: clinicId || "" }))
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
            <p className="text-gray-700 mb-4">
              You have unsaved changes that will be lost.
            </p>
            {pendingFileOperations.length > 0 && (
              <p className="text-orange-600 text-sm mb-4">
                {pendingFileOperations.length} file operation(s) will be rolled back.
              </p>
            )}
            <p className="text-gray-700 mb-6">
              Are you sure you want to continue?
            </p>
            <div className="flex space-x-3">
              <button
                onClick={cancelDiscard}
                className="flex-1 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition"
                disabled={isRollbackInProgress}
              >
                Keep Editing
              </button>
              <button
                onClick={confirmDiscard}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                disabled={isRollbackInProgress}
              >
                {isRollbackInProgress ? 'Rolling back...' : 'Discard Changes'}
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
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-blue-800 flex items-center gap-2">
                Edit Patient <span className="text-xl">👩‍⚕️</span>
                {hasUnsavedChanges && (
                  <span className="text-sm bg-orange-100 text-orange-600 px-2 py-1 rounded">
                    {pendingFileOperations.length > 0 
                      ? `${pendingFileOperations.length} pending file operations`
                      : 'Unsaved changes'
                    }
                  </span>
                )}
              </h1>
              <p className="text-slate-500">
                Update patient information and medical history
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleDiscard}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition flex items-center gap-1"
                disabled={isSaving || isRollbackInProgress}
              >
                <span>Cancel</span> ❌
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !hasUnsavedChanges || isRollbackInProgress}
                className="flex items-center bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors disabled:bg-blue-300"
              >
                {isSaving ? "Saving..." : "Save Changes 💾"}
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Patient Information Card */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-blue-100">
                <h2 className="text-xl text-blue-700 font-medium mb-4 flex items-center gap-2">
                  Patient Details 📋
                </h2>
                <PatientForm
                  patient={patient}
                  handleChange={handleChange}
                  handleSubmit={handleSubmit}
                  isSubmitting={isSaving}
                  submitLabel="Update Patient"
                  cancelAction={handleDiscard}
                  isEditMode={true}
                />
              </div>
            </div>

            {/* Enhanced Medical History Section */}
            <div className="lg:col-span-2">
              <MedicalHistorySection
                patientId={patientId}
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
                onSavePatient={handleSave}
                onCancelEdit={handleDiscard}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}