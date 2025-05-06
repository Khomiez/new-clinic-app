"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Navbar, Sidebar, LoadingScreen } from "@/components";
import { IClinic } from "@/interfaces";
import { useAppSelector } from "@/redux/hooks/useAppSelector";
import { useAppDispatch } from "@/redux/hooks/useAppDispatch";
import { addPatient } from "@/redux/features/patients/patientsSlice";
import { fetchClinics } from "@/redux/features/clinics/clinicsSlice";
import { fetchAdminData } from "@/redux/features/admin/adminSlice";
import { useAuth } from "@/context";

export default function AddPatient() {
  // Router and search params
  const router = useRouter();
  const searchParams = useSearchParams();
  const clinicId = searchParams.get("clinicId");

  // Redux hooks
  const dispatch = useAppDispatch();
  const adminInfo = useAppSelector((state) => state.admin);
  const clinicsFromStore = useAppSelector((state) => state.clinics);
  const patientStatus = useAppSelector((state) => state.patients.loading);

  // Auth context
  const { isAuthenticated, logout, loading } = useAuth();

  // Local state for patient data
  const [patient, setPatient] = useState({
    name: "",
    HN_code: "",
    ID_code: "",
    lastVisit: "",
    history: []
  });
  
  // State for clinics
  const [displayedClinics, setDisplayedClinics] = useState<IClinic[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<IClinic | undefined>(undefined);

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
  useEffect(() => {
    if (clinicsFromStore.loading === "succeeded") {
      try {
        let rawClinics = [];
        
        if (clinicsFromStore.items.data && clinicsFromStore.items.data.clinics && 
            Array.isArray(clinicsFromStore.items.data.clinics)) {
          rawClinics = clinicsFromStore.items.data.clinics;
        } else if (Array.isArray(clinicsFromStore.items)) {
          rawClinics = clinicsFromStore.items;
        }
        
        if (rawClinics.length > 0) {
          setDisplayedClinics(rawClinics);
          
          // Set selected clinic based on clinicId param
          if (clinicId) {
            const clinic = rawClinics.find((c) => c._id.toString() === clinicId);
            if (clinic) {
              setSelectedClinic(clinic);
            }
          }
        }
      } catch (error) {
        console.error("Error processing clinics:", error);
      }
    }
  }, [clinicsFromStore, clinicId]);

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPatient((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    
    if (!clinicId) {
      alert("Missing clinic ID");
      return;
    }
    
    // Validate required fields
    if (!patient.name || !patient.HN_code) {
      alert("Name and Hospital Number (HN) are required fields");
      return;
    }
    
    try {
      await dispatch(addPatient({
        clinicId,
        patientData: patient
      })).unwrap();
      
      // Navigate back to dashboard after successful creation
      router.push(`/dashboard`);
    } catch (error) {
      console.error("Failed to add patient:", error);
      alert("Failed to add patient. Please try again.");
    }
  };

  const handleClinicChange = (clinicId: string): void => {
    if (!clinicId) return;
    
    const clinic = displayedClinics.find((c) => c._id.toString() === clinicId);
    if (clinic) {
      setSelectedClinic(clinic);
      // Update the URL without navigating
      const url = new URL(window.location.href);
      url.searchParams.set("clinicId", clinicId);
      window.history.pushState({}, '', url);
    }
  };

  // Show loading screen
  if (loading || adminInfo.loading === "pending") {
    return <LoadingScreen pageName="Add Patient" />;
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
                Add New Patient <span className="text-xl">👤</span>
              </h1>
              <p className="text-slate-500">
                Create a new patient record in the system
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition flex items-center gap-1"
              >
                <span>Cancel</span> ❌
              </button>
              <button
                onClick={handleSubmit}
                disabled={patientStatus === "pending"}
                className="flex items-center bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors disabled:bg-blue-300"
              >
                {patientStatus === "pending" ? "Saving..." : "Save Patient 💾"}
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-blue-100">
            <h2 className="text-xl text-blue-700 font-medium mb-6 flex items-center gap-2">
              Patient Details 📋
            </h2>
            
            {selectedClinic ? (
              <form className="max-w-2xl mx-auto">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        value={patient.name}
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
                        Hospital Number (HN) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="HN_code"
                        name="HN_code"
                        value={patient.HN_code}
                        onChange={handleChange}
                        placeholder="Enter hospital number"
                        required
                        className="w-full px-4 py-2 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50"
                      />
                    </div>
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
                      value={patient.ID_code}
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
                      Last Visit Date
                    </label>
                    <input
                      type="date"
                      id="lastVisit"
                      name="lastVisit"
                      value={patient.lastVisit}
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50"
                    />
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <p className="text-sm text-blue-600">
                      <span className="font-bold">Note:</span> Medical history records can be added after creating the patient.
                    </p>
                  </div>
                  
                  <div className="py-2">
                    <p className="text-sm text-slate-500">
                      <span className="text-red-500">*</span> Required fields
                    </p>
                  </div>
                </div>
              </form>
            ) : (
              <div className="text-center py-8 text-blue-500">
                <div className="text-5xl mb-4">🏥</div>
                <h3 className="text-xl font-medium mb-2">Select a Clinic First</h3>
                <p className="text-slate-500 mb-4">
                  Please select a clinic from the sidebar before adding a patient.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}