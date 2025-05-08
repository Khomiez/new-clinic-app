// src/app/(protected)/patients/edit/[id]/page.tsx
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

  // Local state for patient data
  const [patient, setPatient] = useState<Partial<IPatient>>({
    name: "",
    HN_code: "",
    ID_code: "",
    lastVisit: undefined,
    history: [],
  });

  // State for clinics
  const [selectedClinic, setSelectedClinic] = useState<IClinic | undefined>(
    undefined
  );

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

      setPatient({
        ...patientFromStore,
        history: sortedHistory,
      });
    }
  }, [patientFromStore, patientLoading]);

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

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!patient._id || !clinicId) {
      alert("Missing patient ID or clinic ID");
      return;
    }

    // Validate required fields
    if (!patient.name || !patient.HN_code) {
      alert("Name and Hospital Number (HN) are required fields");
      return;
    }

    try {
      await dispatch(
        updatePatient({
          patientId: toIdString(patient._id),
          clinicId,
          patientData: patient,
        })
      ).unwrap();

      // Navigate back to dashboard after successful update
      router.push(`/dashboard`);
    } catch (error) {
      console.error("Failed to update patient:", error);
      alert("Failed to update patient. Please try again.");
    }
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
            // You might want to show a warning to the user
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

      const updatedHistory = [...prev.history];
      const record = updatedHistory[recordIndex];

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

  const handleRemoveDocument = (recordIndex: number, documentIndex: number) => {
    setPatient((prev) => {
      if (!prev.history) return prev;

      const updatedHistory = [...prev.history];
      const record = updatedHistory[recordIndex];

      updatedHistory[recordIndex] = {
        ...record,
        document_urls:
          record.document_urls?.filter((_, i) => i !== documentIndex) || [],
      };

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
              </h1>
              <p className="text-slate-500">
                Update patient information and medical history
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push("/dashboard")}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition flex items-center gap-1"
              >
                <span>Cancel</span> ❌
              </button>
              <button
                onClick={handleSubmit}
                disabled={patientLoading !== "succeeded"}
                className="flex items-center bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors disabled:bg-blue-300"
              >
                {patientLoading !== "succeeded"
                  ? "Saving..."
                  : "Save Changes 💾"}
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
                  isSubmitting={patientLoading !== "succeeded"}
                  submitLabel="Update Patient"
                  cancelAction={() => router.push("/dashboard")}
                  isEditMode={true} // This indicates it's edit mode
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
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
