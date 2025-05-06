"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Types } from "mongoose";
import { Sidebar, Navbar, LoadingScreen, Card } from "@/components";
import { IClinic, IPatient } from "@/interfaces";
import { useAppSelector } from "@/redux/hooks/useAppSelector";
import { useAppDispatch } from "@/redux/hooks/useAppDispatch";
import { fetchClinics } from "@/redux/features/clinics/clinicsSlice";
import { fetchPatients, deletePatient, clearPatients } from "@/redux/features/patients/patientsSlice";
import { fetchAdminData } from "@/redux/features/admin/adminSlice";
import { useAuth } from "@/context";
import { toObjectId, toIdString } from "@/utils/mongoHelpers";

// Extract clinics from the Redux state
const extractClinicsData = (clinicsState: any): any[] => {
  console.log("Extracting clinics from state:", clinicsState);
  
  if (!clinicsState) {
    console.warn("Clinics state is undefined");
    return [];
  }
  
  // Check if items is an array and has elements
  if (Array.isArray(clinicsState.items) && clinicsState.items.length > 0) {
    console.log("Found clinics array in items");
    return clinicsState.items;
  }
  
  // Check for nested data structure where items is an object with a data property
  if (clinicsState.items && clinicsState.items.data) {
    // Check if there's a clinics array in the data
    if (clinicsState.items.data.clinics && Array.isArray(clinicsState.items.data.clinics)) {
      console.log("Found clinics in items.data.clinics structure");
      return clinicsState.items.data.clinics;
    }
    
    // If items.data itself is an array, return it
    if (Array.isArray(clinicsState.items.data)) {
      console.log("Found array in items.data");
      return clinicsState.items.data;
    }
  }
  
  // Finally, if items itself is an object with clinic-like properties, wrap it in an array
  if (clinicsState.items && typeof clinicsState.items === 'object' && !Array.isArray(clinicsState.items)) {
    if (clinicsState.items._id || clinicsState.items.name) {
      console.log("Found single clinic object in items");
      return [clinicsState.items];
    }
  }
  
  console.warn("Could not extract clinics data from state", clinicsState);
  return [];
};

// Format date for display
const formatDate = (date: Date | string | undefined): string => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString();
};

export default function AdminDashboard() {
  // Redux state
  const adminInfo = useAppSelector((state) => state.admin);
  const clinicsFromStore = useAppSelector((state) => state.clinics);
  const patientsFromStore = useAppSelector((state) => state.patients);
  const dispatch = useAppDispatch();

  // State with initial values
  const [selectedClinic, setSelectedClinic] = useState<IClinic | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [displayedClinics, setDisplayedClinics] = useState<IClinic[]>([]);
  const [displayedPatients, setDisplayedPatients] = useState<IPatient[]>([]);

  const { isAuthenticated, logout, loading } = useAuth();

  const router = useRouter();

  // First, fetch admin data when component mounts
  useEffect(() => {
    console.log("Init: Fetching admin data");
    dispatch(fetchAdminData());
  }, [dispatch]);

  // Then, fetch clinics when admin data is available
  useEffect(() => {
    if (adminInfo.id && adminInfo.loading === "succeeded") {
      console.log("Admin data loaded, fetching clinics for ID:", adminInfo.id);
      dispatch(fetchClinics(adminInfo.id));
    }
  }, [adminInfo.loading, adminInfo.id, dispatch]);

  // Process clinics data
  useEffect(() => {
    console.log("Processing clinics data:", clinicsFromStore);
    
    if (clinicsFromStore.loading === "succeeded") {
      try {
        // Extract clinic data from the nested structure
        const rawClinics = extractClinicsData(clinicsFromStore);
        console.log("Raw clinics after extraction:", rawClinics);
        
        if (rawClinics.length > 0) {
          // Convert serialized Redux clinic data to IClinic objects
          const clinics = rawClinics.map((clinic) => {
            // Convert string IDs back to ObjectIds for UI operations
            return {
              _id: typeof clinic._id === 'string' ? toObjectId(clinic._id) : clinic._id,
              name: clinic.name || 'Unnamed Clinic',
              address: clinic.address || '',
              // Ensure phone is always an array
              phone: Array.isArray(clinic.phone) ? clinic.phone : 
                   (clinic.phone ? [clinic.phone] : []),
              // Process managerId array - convert strings to ObjectIds
              managerId: Array.isArray(clinic.managerId) 
                ? clinic.managerId.map((id: string | Types.ObjectId) => {
                    return typeof id === 'string' ? toObjectId(id) : id;
                  })
                : []
            };
          });
          
          console.log("Processed clinics:", clinics);
          setDisplayedClinics(clinics);
          
          // Set the first clinic as selected if none is selected yet
          if (!selectedClinic && clinics.length > 0) {
            console.log("Setting initial selected clinic:", clinics[0]);
            setSelectedClinic(clinics[0]);
            
            // Fetch patients for the selected clinic
            dispatch(fetchPatients(toIdString(clinics[0]._id)));
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
  }, [clinicsFromStore, dispatch, selectedClinic]);

  // Process patients data whenever it changes or when search term changes
  useEffect(() => {
    console.log("Processing patients data:", patientsFromStore);
    
    if (patientsFromStore.loading === "succeeded" && patientsFromStore.items) {
      try {
        // Process patient data - convert string IDs to ObjectId
        const processedPatients = patientsFromStore.items.map((patient: any) => {
          return {
            ...patient,
            _id: typeof patient._id === 'string' ? toObjectId(patient._id) : patient._id,
            // Convert date strings to Date objects if needed
            lastVisit: patient.lastVisit ? new Date(patient.lastVisit) : undefined,
            createdAt: patient.createdAt ? new Date(patient.createdAt) : undefined,
            updatedAt: patient.updatedAt ? new Date(patient.updatedAt) : undefined
          };
        });
        
        // Filter patients based on search term
        const filtered = processedPatients.filter(
          (patient: IPatient) =>
            patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            patient.HN_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (patient.ID_code && patient.ID_code.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        
        console.log("Filtered patients:", filtered);
        setDisplayedPatients(filtered);
      } catch (error) {
        console.error("Error processing patients:", error);
        setDisplayedPatients([]);
      }
    } else {
      setDisplayedPatients([]);
    }
  }, [patientsFromStore, searchTerm]);

  const handleAddPatient = (): void => {
    if (selectedClinic) {
      // Navigate to the add patient page with clinic ID
      router.push(`/patients/add?clinicId=${toIdString(selectedClinic._id)}`);
    } else {
      alert("Please select a clinic first");
    }
  };

  const handleEditPatient = (patient: IPatient): void => {
    if (selectedClinic) {
      // Navigate to the edit patient page with patient ID and clinic ID
      router.push(`/patients/edit/${toIdString(patient._id)}?clinicId=${toIdString(selectedClinic._id)}`);
    }
  };

  const handleDeletePatient = (patientId: Types.ObjectId): void => {
    if (!selectedClinic) {
      alert("No clinic selected");
      return;
    }
    
    if (confirm("Are you sure you want to delete this patient?")) {
      // Dispatch the delete action from Redux - pass string IDs to Redux
      dispatch(deletePatient({ 
        clinicId: toIdString(selectedClinic._id), 
        patientId: toIdString(patientId) 
      }));
      console.log(`Deleting patient with ID: ${toIdString(patientId)} from clinic: ${toIdString(selectedClinic._id)}`);
    }
  };

  const handleClinicChange = (clinicId: string): void => {
    console.log("Clinic selection requested:", clinicId);
    if (!clinicId) return;
  
    // Clear patients when changing clinic
    dispatch(clearPatients());
    
    const clinic = displayedClinics.find((c) => toIdString(c._id) === clinicId);
    if (clinic) {
      console.log("Setting selected clinic:", clinic);
      setSelectedClinic(clinic);
      
      // Fetch patients for the selected clinic - using string ID for Redux
      dispatch(fetchPatients(clinicId));
    } else {
      console.warn("Selected clinic not found in displayedClinics:", clinicId);
    }
  };

  // Debug information
  console.log("Admin state:", adminInfo);
  console.log("Clinics state:", clinicsFromStore);
  console.log("Patients state:", patientsFromStore);
  console.log("Displayed patients:", displayedPatients);
  console.log("Selected clinic:", selectedClinic);

  // Show loading screen when fetching admin data
  if (loading || adminInfo.loading === "pending") {
    return <LoadingScreen pageName={`dashboard`} />;
  }

  // Function to check if patients are being loaded
  const isLoadingPatients = (): boolean => {
    return patientsFromStore.loading === "pending";
  };

  // Function to check if patients failed to load
  const hasPatientLoadingFailed = (): boolean => {
    return patientsFromStore.loading === "failed";
  };

  // Function to check if no patients are found and search has completed
  const showNoPatientFound = (): boolean => {
    return (
      displayedPatients.length === 0 &&
      patientsFromStore.loading === "succeeded" &&
      patientsFromStore.items && 
      patientsFromStore.items.length === 0 &&
      selectedClinic !== undefined
    );
  };

  // Function to check if search returned no results
  const showNoSearchResults = (): boolean => {
    return (
      displayedPatients.length === 0 &&
      searchTerm.length > 0 &&
      patientsFromStore.loading === "succeeded" &&
      patientsFromStore.items && 
      patientsFromStore.items.length > 0
    );
  };

  // Show a message if there was an error loading admin data
  if (adminInfo.loading === "failed") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <div className="bg-white p-8 rounded-xl shadow-md text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-red-600 mb-4">
            Admin Data Error
          </h2>
          <p className="text-gray-700 mb-4">
            {adminInfo.error ||
              "Failed to load administrator data. Please refresh or try again later."}
          </p>
          <button
            onClick={() => dispatch(fetchAdminData())}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Get the patients count
  const patientsCount = patientsFromStore.items && Array.isArray(patientsFromStore.items) 
    ? patientsFromStore.items.length 
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      {/* Top Navigation */}
      <Navbar
        clinicName={selectedClinic?.name}
        adminUsername={adminInfo?.username || "Administrator"}
        logout={logout}
      />

      <div className="flex">
        {/* Sidebar - Pass mapped clinics to ensure correct typing */}
        <Sidebar
          clinics={displayedClinics}
          selectedClinic={selectedClinic}
          handleClinicChange={handleClinicChange}
        />

        {/* Main Content */}
        <div className="flex-grow p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-blue-800 mb-2">
              Patient Management
            </h2>
            <p className="text-blue-400">Manage your patients and medical records</p>
            {selectedClinic && (
              <p className="text-blue-500 mt-2">
                Current Clinic: <strong>{selectedClinic.name}</strong>
              </p>
            )}
          </div>

          {/* Dashboard Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card
              cardTopic="Total Patients"
              cardEmoji="👥"
              cardValue={patientsCount || 0}
              cardDescription1="↑ 2 "
              cardDescription2="from last month"
            />
            <Card
              cardTopic="Today's Appointments"
              cardEmoji="✅"
              cardValue={10}
              cardDescription1="→ 5"
              cardDescription2="remaining today"
            />
            <Card
              cardTopic="Patient Records"
              cardEmoji="📝"
              cardValue={displayedPatients.length}
              cardDescription1="🔍 "
              cardDescription2={
                searchTerm ? "Filtered results" : "All records shown"
              }
            />
          </div>

          {/* Patient List Section */}
          <div className="bg-white p-6 rounded-xl shadow-md border border-blue-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-blue-800">
                Patient Records
              </h3>
              <button
                onClick={handleAddPatient}
                className="flex items-center bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
                disabled={!selectedClinic}
              >
                <span className="mr-2">➕</span>
                Add Patient
              </button>
            </div>

            {/* Search and Filter */}
            <div className="mb-6">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-blue-400">🔍</span>
                </div>
                <input
                  type="text"
                  placeholder="Search patients by name, HN code, or ID code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-blue-200 rounded-lg bg-blue-50 focus:ring-2 focus:ring-blue-300 focus:border-blue-300 focus:outline-none"
                  disabled={!selectedClinic}
                />
              </div>
            </div>

            {/* Patients Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-blue-100">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-blue-400 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-blue-400 uppercase tracking-wider">
                      HN CODE
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-blue-400 uppercase tracking-wider">
                      ID CODE
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-blue-400 uppercase tracking-wider">
                      LAST VISIT
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-blue-400 uppercase tracking-wider">
                      UPDATED DATE
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-blue-400 uppercase tracking-wider">
                      ACTIONS
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-blue-100">
                  {displayedPatients.map((patient) => (
                    <tr
                      key={toIdString(patient._id)}
                      className="hover:bg-blue-50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="text-sm font-medium text-gray-900">
                            {patient.name}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{patient.HN_code}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{patient.ID_code || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-left text-sm text-gray-500">
                        {formatDate(patient.lastVisit || patient.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-left text-sm text-gray-500">
                        {formatDate(patient.updatedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEditPatient(patient)}
                          className="text-blue-500 hover:text-blue-700 mr-3"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeletePatient(patient._id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* If patients are still loading */}
              {isLoadingPatients() && (
                <div className="text-center py-8 text-blue-400">
                  <div className="text-3xl mb-2">⏳</div>
                  <p>Loading patients...</p>
                </div>
              )}

              {/* If there was an error loading patients */}
              {hasPatientLoadingFailed() && (
                <div className="text-center py-8 text-red-500">
                  <div className="text-3xl mb-2">⚠️</div>
                  <p>Error loading patients: {patientsFromStore.error}</p>
                  <button
                    onClick={() =>
                      selectedClinic && dispatch(fetchPatients(toIdString(selectedClinic._id)))
                    }
                    className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* If no patients are found for the selected clinic */}
              {showNoPatientFound() && (
                <div className="text-center py-8 text-blue-500">
                  <div className="text-3xl mb-2">📋</div>
                  <p>No patients are currently registered for this clinic.</p>
                  <button
                    onClick={handleAddPatient}
                    className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  >
                    Add Your First Patient
                  </button>
                </div>
              )}

              {/* If search returned no results */}
              {showNoSearchResults() && (
                <div className="text-center py-8 text-blue-400">
                  <div className="text-3xl mb-2">🔍</div>
                  <p>No patients found matching your search criteria.</p>
                </div>
              )}
            </div>

            {/* Pagination - only show if there are patients */}
            {displayedPatients.length > 0 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-blue-600">
                  Showing{" "}
                  <span className="font-medium">{displayedPatients.length}</span>{" "}
                  of{" "}
                  <span className="font-medium">
                    {patientsCount}
                  </span>{" "}
                  patient records
                </div>

                <div className="flex space-x-2">
                  <button className="px-3 py-1 border border-blue-200 rounded text-blue-600 hover:bg-blue-50">
                    Previous
                  </button>
                  <button className="px-3 py-1 bg-blue-100 border border-blue-200 rounded text-blue-800">
                    1
                  </button>
                  <button className="px-3 py-1 border border-blue-200 rounded text-blue-600 hover:bg-blue-50">
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}