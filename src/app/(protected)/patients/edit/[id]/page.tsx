"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Types } from "mongoose";
import { HistoryRecord, Navbar, Sidebar, LoadingScreen } from "@/components";
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
import { toObjectId, toIdString } from "@/utils/mongoHelpers";

// Helper function to format date for input fields
const formatDateForInput = (date: string | Date | undefined): string => {
  if (!date) return "";
  if (date instanceof Date) {
    return date.toISOString().split("T")[0];
  }
  // Try parsing the string as a date
  try {
    return new Date(date).toISOString().split("T")[0];
  } catch (e) {
    // If parsing fails, return the original string if it's valid for date input
    return typeof date === "string" ? date : "";
  }
};

// Helper function to format datetime for datetime-local input fields
const formatDateTimeForInput = (date: string | Date | undefined): string => {
  if (!date) return "";
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toISOString().slice(0, 16);
  } catch (e) {
    return typeof date === "string" ? date : "";
  }
};

export default function EditPatient({ params }: { params: { id: string } }) {
  // Get patient ID from route params directly for now
  // Next.js will change this in the future, but as of now, we can use params directly
  const patientId = params.id;

  // Router and search params
  const router = useRouter();
  const searchParams = useSearchParams();
  const clinicId = searchParams.get("clinicId");

  // Redux hooks
  const dispatch = useAppDispatch();
  const adminInfo = useAppSelector((state) => state.admin);
  const clinicsFromStore = useAppSelector((state) => state.clinics);
  
  // Explicitly type the loading state to include all possible values
  const patientLoading = useAppSelector((state) => state.patients.loading) as 'idle' | 'pending' | 'succeeded' | 'failed';
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
    // Initialize lastVisit as a Date object or undefined
    lastVisit: undefined,
    history: []
  });

  // State for clinics
  const [displayedClinics, setDisplayedClinics] = useState<IClinic[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<IClinic | undefined>(
    undefined
  );

  // Local state for managing history record updates
  const [isAddingRecord, setIsAddingRecord] = useState<boolean>(false);
  const [currentRecord, setCurrentRecord] = useState<IHistoryRecord>({
    // Initialize timestamp as a Date object, not a string
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

  // Extract clinics from store
  const extractClinicsData = (clinicsState: any): any[] => {
    if (!clinicsState || !clinicsState.items) {
      return [];
    }

    // If items is an array, return it directly
    if (Array.isArray(clinicsState.items)) {
      return clinicsState.items;
    }

    // If items has a clinics property, return that
    if (
      clinicsState.items.clinics &&
      Array.isArray(clinicsState.items.clinics)
    ) {
      return clinicsState.items.clinics;
    }

    // If items has a data property with clinics, return that
    if (clinicsState.items.data) {
      if (
        clinicsState.items.data.clinics &&
        Array.isArray(clinicsState.items.data.clinics)
      ) {
        return clinicsState.items.data.clinics;
      }
      // Try data directly if it's an array
      if (Array.isArray(clinicsState.items.data)) {
        return clinicsState.items.data;
      }
    }

    // Log the structure we encountered for debugging
    console.warn("Unexpected clinics data structure:", clinicsState);
    return [];
  };

  // Process clinics data
  useEffect(() => {
    if (clinicsFromStore.loading === "succeeded") {
      try {
        // Use the extraction function
        const rawClinics = extractClinicsData(clinicsFromStore);
        console.log("Raw clinics after extraction:", rawClinics);

        if (rawClinics.length > 0) {
          // Map to ensure correct types and convert string IDs to ObjectIds
          const clinics = rawClinics.map((clinic) => ({
            _id: toObjectId(clinic._id),
            name: clinic.name || "",
            address: clinic.address || "",
            phone: Array.isArray(clinic.phone) ? clinic.phone : [],
            managerId: Array.isArray(clinic.managerId) 
              ? clinic.managerId.map((id: string | Types.ObjectId) => toObjectId(id))
              : []
          }));

          setDisplayedClinics(clinics);

          // Set selected clinic based on clinicId param
          if (clinicId) {
            const clinic = clinics.find((c) => toIdString(c._id) === clinicId);
            if (clinic) {
              setSelectedClinic(clinic);
            }
          }
        } else {
          console.log("No clinics data available after extraction");
          setDisplayedClinics([]);
        }
      } catch (error) {
        console.error("Error processing clinics:", error);
        setDisplayedClinics([]);
      }
    }
  }, [clinicsFromStore, clinicId]);

  // Fetch patient data when ID is available
  useEffect(() => {
    if (patientId && clinicId) {
      dispatch(fetchPatientById({ patientId, clinicId }));
    }
  }, [patientId, clinicId, dispatch]);

  // Update local state when patient data is loaded
  useEffect(() => {
    if (patientFromStore && patientLoading === "succeeded") {
      // Convert string dates to Date objects where needed
      const processedHistory = patientFromStore.history?.map(record => ({
        ...record,
        // Convert timestamp string to Date if it's a string
        timestamp: typeof record.timestamp === 'string' ? new Date(record.timestamp) : record.timestamp
      })) || [];

      setPatient({
        _id: toObjectId(patientFromStore._id),
        name: patientFromStore.name,
        HN_code: patientFromStore.HN_code,
        ID_code: patientFromStore.ID_code || "",
        // Convert lastVisit string to Date if it exists
        lastVisit: patientFromStore.lastVisit ? 
          (typeof patientFromStore.lastVisit === 'string' ? 
            new Date(patientFromStore.lastVisit) : patientFromStore.lastVisit) 
          : undefined,
        history: processedHistory,
        createdAt: patientFromStore.createdAt,
        updatedAt: patientFromStore.updatedAt
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
        [name]: new Date(value) // Convert string date to Date object
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
    
    // Special handling for date fields
    if (name === 'timestamp' && value) {
      setCurrentRecord((prev) => ({
        ...prev,
        [name]: new Date(value) // Convert string date to Date object
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

    setPatient((prev) => ({
      ...prev,
      history: [...(prev.history || []), currentRecord]
    }));

    // Reset record form
    setCurrentRecord({
      timestamp: new Date(),
      document_urls: [],
      notes: ""
    });

    setIsAddingRecord(false);
  };

  // Delete a history record
  const handleDeleteRecord = (index: number) => {
    if (confirm("Are you sure you want to remove this record?")) {
      setPatient((prev) => ({
        ...prev,
        history: prev.history?.filter((_, i) => i !== index)
      }));
    }
  };

  // Prepare data for API submission by ensuring dates are properly formatted
  const preparePatientDataForSubmission = (patientData: Partial<IPatient>): Partial<IPatient> => {
    // Create a copy to prevent modifying the original state
    const processedData = { ...patientData };
    
    // Process history records to ensure dates are in the correct format
    if (processedData.history) {
      processedData.history = processedData.history.map(record => ({
        ...record,
        // Keep timestamp as a Date object as required by the interface
        timestamp: record.timestamp
      }));
    }
    
    return processedData;
  };

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if (!patient._id || !clinicId) {
      alert("Missing patient ID or clinic ID");
      return;
    }

    // Validate required fields
    if (!patient.name || !patient.HN_code) {
      alert("Name and HN code are required fields");
      return;
    }

    try {
      // Prepare data for submission
      const patientDataForSubmission = preparePatientDataForSubmission(patient);
      
      await dispatch(
        updatePatient({
          patientId: toIdString(patient._id),
          clinicId,
          patientData: patientDataForSubmission
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

    const clinic = displayedClinics.find((c) => toIdString(c._id) === clinicId);
    if (clinic) {
      setSelectedClinic(clinic);
    }
  };

  // Show loading screen
  if (
    loading ||
    adminInfo.loading === "pending" ||
    patientLoading === "pending"
  ) {
    return <LoadingScreen pageName="Edit Patient" />;
  }

  // Show error if patient loading failed
  if (patientLoading === "failed") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <div className="bg-white p-8 rounded-xl shadow-md text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-red-600 mb-4">
            Failed to Load Patient Data
          </h2>
          <p className="text-gray-700 mb-4">
            {useAppSelector((state) => state.patients.error) ||
              "Could not load the patient information. Please try again."}
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => router.push("/dashboard")}
              className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
            >
              Back to Dashboard
            </button>
            <button
              onClick={() =>
                dispatch(
                  fetchPatientById({ patientId, clinicId: clinicId || "" })
                )
              }
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
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
          clinics={displayedClinics}
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
                    Medical History 🗂️
                  </h2>
                  <button
                    className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition flex items-center gap-1 text-sm"
                    onClick={() => setIsAddingRecord(true)}
                  >
                    Add Record ➕
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

                {/* History List */}
                <div className="space-y-4">
                  {patient.history && patient.history.length > 0 ? (
                    patient.history.map((record, index) => (
                      <div
                        key={index}
                        className="bg-blue-50 rounded-lg p-4 border border-blue-100"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="font-medium text-blue-700">
                            {new Date(record.timestamp).toLocaleString()}
                          </div>
                          <div className="flex space-x-2">
                            <button
                              className="text-red-500 hover:text-red-700"
                              title="Delete Record"
                              onClick={() => handleDeleteRecord(index)}
                            >
                              🗑️
                            </button>
                          </div>
                        </div>

                        {/* Notes section */}
                        {record.notes && (
                          <div className="mb-3">
                            <p className="text-sm text-gray-600">
                              {record.notes}
                            </p>
                          </div>
                        )}

                        {/* Document links */}
                        {record.document_urls &&
                          record.document_urls.length > 0 && (
                            <div>
                              <p className="text-xs text-blue-600 mb-2">
                                Documents:
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {record.document_urls.map((url, idx) => {
                                  // Extract filename from URL
                                  const filename =
                                    url.split("/").pop() ||
                                    `Document ${idx + 1}`;

                                  // Determine file type icon based on extension
                                  let icon = "📄"; // Default document icon
                                  if (url.endsWith(".pdf")) icon = "📕";
                                  if (
                                    url.endsWith(".jpg") ||
                                    url.endsWith(".png") ||
                                    url.endsWith(".jpeg")
                                  )
                                    icon = "🖼️";
                                  if (
                                    url.endsWith(".docx") ||
                                    url.endsWith(".doc")
                                  )
                                    icon = "📝";

                                  return (
                                    <a
                                      key={idx}
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-xs bg-white py-1 px-2 rounded border border-blue-200 hover:bg-blue-100 transition-colors"
                                    >
                                      <span>{icon}</span>
                                      <span className="truncate max-w-[120px]">
                                        {filename}
                                      </span>
                                    </a>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                      </div>
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
