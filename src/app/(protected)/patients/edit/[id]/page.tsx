"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Navbar, Sidebar, LoadingScreen, ErrorScreen } from "@/components";
import HistoryRecord from "@/components/ui/HistoryRecord"; // Import the enhanced component
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

// Helper function to format datetime for datetime-local input fields
const formatDateTimeForInput = (date: string | Date | undefined): string => {
  if (!date) return "";
  
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toISOString().slice(0, 16);
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
    history: []
  });

  // State for clinics
  const [selectedClinic, setSelectedClinic] = useState<IClinic | undefined>(
    undefined
  );

  // Local state for managing history record updates
  const [isAddingRecord, setIsAddingRecord] = useState<boolean>(false);
  const [currentRecord, setCurrentRecord] = useState<IHistoryRecord>({
    timestamp: new Date(),
    document_urls: [],
    notes: ""
  });

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
        ? patientFromStore.history.map(record => ({
            ...record,
            timestamp: typeof record.timestamp === 'string' 
              ? new Date(record.timestamp) 
              : record.timestamp
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
        history: sortedHistory
      });
    }
  }, [patientFromStore, patientLoading]);

  // Handle input changes for patient info
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Special handling for date fields
    if (name === 'lastVisit' && value) {
      setPatient((prev) => ({
        ...prev,
        [name]: new Date(value)
      }));
    } else {
      setPatient((prev) => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Handle input changes for a new history record
  const handleRecordChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    
    if (name === 'timestamp' && value) {
      setCurrentRecord((prev) => ({
        ...prev,
        [name]: new Date(value)
      }));
    } else {
      setCurrentRecord((prev) => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Add a new history record
  const handleAddRecord = () => {
    if (!currentRecord.timestamp) {
      alert("Date and time are required for the history record");
      return;
    }

    setPatient((prev) => {
      // Add the new record
      const updatedHistory = [...(prev.history || []), currentRecord];
      
      // Sort by date (newest first)
      const sortedHistory = updatedHistory.sort((a, b) => {
        const dateA = new Date(a.timestamp).getTime();
        const dateB = new Date(b.timestamp).getTime();
        return dateB - dateA;
      });
      
      return {
        ...prev,
        history: sortedHistory
      };
    });

    // Reset record form
    setCurrentRecord({
      timestamp: new Date(),
      document_urls: [],
      notes: ""
    });

    setIsAddingRecord(false);
  };

  // Remove a history record
  const handleRemoveRecord = (index: number) => {
    if (confirm("Are you sure you want to remove this record?")) {
      setPatient((prev) => ({
        ...prev,
        history: prev.history?.filter((_, i) => i !== index)
      }));
    }
  };

  // Update a record's date
  const handleUpdateRecordDate = (index: number, newDate: Date) => {
    setPatient((prev) => {
      if (!prev.history) return prev;
      
      const updatedHistory = [...prev.history];
      updatedHistory[index] = {
        ...updatedHistory[index],
        timestamp: newDate
      };
      
      // Re-sort by date (newest first)
      const sortedHistory = updatedHistory.sort((a, b) => {
        const dateA = new Date(a.timestamp).getTime();
        const dateB = new Date(b.timestamp).getTime();
        return dateB - dateA;
      });
      
      return {
        ...prev,
        history: sortedHistory
      };
    });
  };

  // Add a document to a record
  const handleAddDocument = (recordIndex: number, url: string) => {
    setPatient((prev) => {
      if (!prev.history) return prev;
      
      const updatedHistory = [...prev.history];
      const record = updatedHistory[recordIndex];
      
      updatedHistory[recordIndex] = {
        ...record,
        document_urls: [...(record.document_urls || []), url]
      };
      
      return {
        ...prev,
        history: updatedHistory
      };
    });
  };

  // Remove a document from a record
  const handleRemoveDocument = (recordIndex: number, documentIndex: number) => {
    setPatient((prev) => {
      if (!prev.history) return prev;
      
      const updatedHistory = [...prev.history];
      const record = updatedHistory[recordIndex];
      
      updatedHistory[recordIndex] = {
        ...record,
        document_urls: record.document_urls?.filter((_, i) => i !== documentIndex) || []
      };
      
      return {
        ...prev,
        history: updatedHistory
      };
    });
  };

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
          patientData: patient
        })
      ).unwrap();

      // Navigate back to dashboard after successful update
      router.push(`/dashboard`);
    } catch (error) {
      console.error("Failed to update patient:", error);
      alert("Failed to update patient. Please try again.");
    }
  };

  const handleClinicChange = (clinicId: string): void => {
    if (!clinicId) return;

    const clinic = clinicsState.items.find((c) => toIdString(c._id) === clinicId);
    if (clinic) {
      setSelectedClinic(clinic);
    }
  };

  // Show loading screen
  if (loading || adminInfo.loading === "pending" || patientLoading === "pending") {
    return <LoadingScreen pageName="Edit Patient" />;
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
                {patientLoading !== "succeeded" ? "Saving..." : "Save Changes 💾"}
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
                <form>
                  <div className="space-y-4">
                    <div>
                      <label
                        className="block text-sm font-medium text-slate-600 mb-1"
                        htmlFor="name"
                      >
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={patient.name || ""}
                        onChange={handleChange}
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
                        className="w-full px-4 py-2 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50"
                      />
                    </div>

                    <div>
                      <label
                        className="block text-sm font-medium text-slate-600 mb-1"
                        htmlFor="ID_code"
                      >
                        ID Number
                      </label>
                      <input
                        type="text"
                        id="ID_code"
                        name="ID_code"
                        value={patient.ID_code || ""}
                        onChange={handleChange}
                        className="w-full px-4 py-2 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50"
                      />
                    </div>

                    <div>
                      <label
                        className="block text-sm font-medium text-slate-600 mb-1"
                        htmlFor="lastVisit"
                      >
                        Last Visit Date
                      </label>
                      <input
                        type="date"
                        id="lastVisit"
                        name="lastVisit"
                        value={formatDateForInput(patient.lastVisit)}
                        onChange={handleChange}
                        className="w-full px-4 py-2 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50"
                      />
                    </div>

                    <div>
                      <label
                        className="block text-sm font-medium text-slate-600 mb-1"
                        htmlFor="createdAt"
                      >
                        Created Date
                      </label>
                      <input
                        type="text"
                        id="createdAt"
                        name="createdAt"
                        value={
                          patient.createdAt
                            ? new Date(patient.createdAt).toLocaleDateString()
                            : "N/A"
                        }
                        readOnly
                        className="w-full px-4 py-2 rounded-lg border border-blue-200 bg-gray-100"
                      />
                    </div>

                    <div>
                      <label
                        className="block text-sm font-medium text-slate-600 mb-1"
                        htmlFor="updatedAt"
                      >
                        Last Updated
                      </label>
                      <input
                        type="text"
                        id="updatedAt"
                        name="updatedAt"
                        value={
                          patient.updatedAt
                            ? new Date(patient.updatedAt).toLocaleDateString()
                            : "N/A"
                        }
                        readOnly
                        className="w-full px-4 py-2 rounded-lg border border-blue-200 bg-gray-100"
                      />
                    </div>
                  </div>
                </form>
              </div>
            </div>

            {/* Medical History Section */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-blue-100">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl text-blue-700 font-medium flex items-center gap-2">
                    Medical History 📁
                  </h2>
                  <button
                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition flex items-center gap-1"
                    onClick={() => setIsAddingRecord(true)}
                  >
                    Add Record <span>+</span>
                  </button>
                </div>

                {/* New Record Form */}
                {isAddingRecord && (
                  <div className="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <h3 className="text-md font-medium text-blue-700 mb-3">
                      Add New Record
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">
                          Date and Time <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="datetime-local"
                          name="timestamp"
                          value={formatDateTimeForInput(currentRecord.timestamp)}
                          onChange={handleRecordChange}
                          className="w-full px-3 py-2 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">
                          Notes
                        </label>
                        <textarea
                          name="notes"
                          value={currentRecord.notes || ""}
                          onChange={handleRecordChange}
                          rows={3}
                          className="w-full px-3 py-2 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                          placeholder="Enter notes about this visit..."
                        />
                      </div>
                      <div className="flex space-x-2 justify-end">
                        <button
                          type="button"
                          onClick={() => setIsAddingRecord(false)}
                          className="px-3 py-1.5 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleAddRecord}
                          className="px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                        >
                          Save Record
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* History Records List */}
                <div>
                  {patient.history && patient.history.length > 0 ? (
                    patient.history.map((record, index) => (
                      <HistoryRecord
                        key={index}
                        record={record}
                        index={index}
                        onRemove={handleRemoveRecord}
                        onUpdateDate={handleUpdateRecordDate}
                        onAddDocument={handleAddDocument}
                        onRemoveDocument={handleRemoveDocument}
                      />
                    ))
                  ) : (
                    <div className="text-center py-8 text-blue-400">
                      <div className="text-3xl mb-2">📝</div>
                      <p>No medical history records found for this patient.</p>
                      <button
                        onClick={() => setIsAddingRecord(true)}
                        className="mt-4 bg-blue-100 text-blue-700 px-4 py-2 rounded hover:bg-blue-200"
                      >
                        Add First Record
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}