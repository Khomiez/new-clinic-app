// src/app/(protected)/dashboard/page.tsx - Enhanced with better delete handling
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Sidebar,
  Navbar,
  LoadingScreen,
  ErrorScreen,
  Card,
} from "@/components";
import { PatientDeleteDialog } from "@/components/PatientDeleteDialog";
import { IClinic, IPatient } from "@/interfaces";
import { useAppSelector } from "@/redux/hooks/useAppSelector";
import { useAppDispatch } from "@/redux/hooks/useAppDispatch";
import { fetchClinics } from "@/redux/features/clinics/clinicsSlice";
import {
  fetchPatients,
  deletePatient,
  clearPatients,
} from "@/redux/features/patients/patientsSlice";
import { fetchAdminData } from "@/redux/features/admin/adminSlice";
import { setSelectedClinic } from "@/redux/features/settings/settingsSlice";
import { useAuth } from "@/context";
import { toIdString } from "@/utils/mongoHelpers";

// Format date for display
const formatDate = (date: Date | string | undefined): string => {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString();
};

export default function AdminDashboard() {
  // Redux state
  const adminInfo = useAppSelector((state) => state.admin);
  const clinicsState = useAppSelector((state) => state.clinics);
  const patientsState = useAppSelector((state) => state.patients);
  const selectedClinicId = useAppSelector(
    (state) => state.settings.selectedClinicId
  );
  const dispatch = useAppDispatch();

  // Local state for selected clinic
  const [selectedClinic, setSelectedClinicState] = useState<
    IClinic | undefined
  >(undefined);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filteredPatients, setFilteredPatients] = useState<IPatient[]>([]);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    patient: IPatient | null;
  }>({ isOpen: false, patient: null });

  // Auth context
  const { isAuthenticated, logout, loading } = useAuth();

  const router = useRouter();

  // First, fetch admin data when component mounts
  useEffect(() => {
    dispatch(fetchAdminData());
  }, [dispatch]);

  // Then, fetch clinics when admin data is available
  useEffect(() => {
    if (adminInfo.id && adminInfo.loading === "succeeded") {
      dispatch(fetchClinics(adminInfo.id));
    }
  }, [adminInfo.loading, adminInfo.id, dispatch]);

  // Set the selected clinic based on persisted selection or default to first clinic
  useEffect(() => {
    if (
      clinicsState.loading === "succeeded" &&
      Array.isArray(clinicsState.items) &&
      clinicsState.items.length > 0
    ) {
      // If we have a saved clinic ID in Redux, try to use that first
      if (selectedClinicId) {
        const savedClinic = clinicsState.items.find(
          (c) => toIdString(c._id) === selectedClinicId
        );

        if (savedClinic) {
          setSelectedClinicState(savedClinic);
          dispatch(fetchPatients(selectedClinicId));
          return;
        }
      }

      // Fallback to first clinic if no saved clinic or saved clinic not found
      if (!selectedClinic) {
        setSelectedClinicState(clinicsState.items[0]);
        const firstClinicId = toIdString(clinicsState.items[0]._id);
        dispatch(setSelectedClinic(firstClinicId));
        dispatch(fetchPatients(firstClinicId));
      }
    }
  }, [
    clinicsState.loading,
    clinicsState.items,
    selectedClinic,
    selectedClinicId,
    dispatch,
  ]);

  // Filter patients based on search term
  useEffect(() => {
    if (
      patientsState.loading === "succeeded" &&
      Array.isArray(patientsState.items)
    ) {
      const filtered = patientsState.items.filter(
        (patient) =>
          patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          patient.HN_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (patient.ID_code &&
            patient.ID_code.toLowerCase().includes(searchTerm.toLowerCase()))
      );

      setFilteredPatients(filtered);
    } else {
      setFilteredPatients([]);
    }
  }, [patientsState.items, patientsState.loading, searchTerm]);

  const handleAddPatient = (): void => {
    if (selectedClinic) {
      router.push(`/patients/add?clinicId=${toIdString(selectedClinic._id)}`);
    } else {
      alert("Please select a clinic first");
    }
  };

  const handleEditPatient = (patient: IPatient): void => {
    if (selectedClinic) {
      router.push(
        `/patients/edit/${toIdString(patient._id)}?clinicId=${toIdString(
          selectedClinic._id
        )}`
      );
    }
  };

  const handleDeletePatient = (patient: IPatient): void => {
    setDeleteDialog({ isOpen: true, patient });
  };

  const confirmDeletePatient = async (forceDelete: boolean): Promise<void> => {
    if (!deleteDialog.patient || !selectedClinic) {
      return;
    }

    try {
      await dispatch(
        deletePatient({
          clinicId: toIdString(selectedClinic._id),
          patientId: toIdString(deleteDialog.patient._id),
          forceDelete, // This would need to be added to the Redux action
        })
      ).unwrap();

      setDeleteDialog({ isOpen: false, patient: null });
    } catch (error: any) {
      // Error is thrown back to the dialog component
      throw error;
    }
  };

  const handleClinicChange = (clinicId: string): void => {
    if (!clinicId) return;

    // Clear patients when changing clinic
    dispatch(clearPatients());

    const clinic = clinicsState.items.find(
      (c) => toIdString(c._id) === clinicId
    );
    if (clinic) {
      setSelectedClinicState(clinic);
      dispatch(setSelectedClinic(clinicId));
      dispatch(fetchPatients(clinicId));
    }
  };

  // Show loading screen
  if (loading || adminInfo.loading === "pending") {
    return <LoadingScreen pageName="Dashboard" />;
  }

  // Show error if admin data failed to load
  if (adminInfo.loading === "failed") {
    return (
      <ErrorScreen
        title="Admin Data Error"
        error={adminInfo.error || "Failed to load administrator data"}
        retry={() => dispatch(fetchAdminData())}
      />
    );
  }

  // Get the patients count
  const patientsCount = Array.isArray(patientsState.items)
    ? patientsState.items.length
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      {/* Delete Dialog */}
      {deleteDialog.patient && (
        <PatientDeleteDialog
          patient={deleteDialog.patient}
          isOpen={deleteDialog.isOpen}
          onConfirm={confirmDeletePatient}
          onCancel={() => setDeleteDialog({ isOpen: false, patient: null })}
        />
      )}

      {/* Top Navigation */}
      <Navbar
        clinicName={selectedClinic?.name}
        adminUsername={adminInfo?.username || "Administrator"}
        logout={logout}
      />

      <div className="flex">
        {/* Sidebar */}
        <Sidebar
          clinics={Array.isArray(clinicsState.items) ? clinicsState.items : []}
          selectedClinic={selectedClinic}
          handleClinicChange={handleClinicChange}
          activePage="dashboard"
        />

        {/* Main Content */}
        <div className="flex-grow p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-blue-800 mb-2">
              จัดการผู้ป่วย
            </h2>
            <p className="text-blue-400">จัดการผู้ป่วยและเวชระเบียนของคุณ</p>
            {selectedClinic && (
              <p className="text-blue-500 mt-2">
                คลินิกปัจจุบัน: <strong>{selectedClinic.name}</strong>
              </p>
            )}
          </div>

          Dashboard Summary Cards
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card
              cardTopic="ผู้ป่วยทั้งหมด"
              cardEmoji="👥"
              cardValue={patientsCount || 0}
              cardDescription1="↑ 2 คน "
              cardDescription2="จากเดือนที่แล้ว"
            />
            <Card
              cardTopic="ยอดผู้ป่วยวันนี้"
              cardEmoji="✅"
              cardValue={10}
              cardDescription1="↑ 5 คน "
              cardDescription2="จากเมื่อวาน"
            />
            <Card
              cardTopic="รายการผู้ป่วยที่แสดง"
              cardEmoji="📝"
              cardValue={filteredPatients.length}
              cardDescription1="🔍 "
              cardDescription2={
                searchTerm ? "รายการที่ผ่านการกรอง" : "รายการทั้งหมด"
              }
            />
          </div>

          {/* Patient List Section */}
          <div className="bg-white p-6 rounded-xl shadow-md border border-blue-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-blue-800">
                เวชระเบียนผู้ป่วย
              </h3>
              <button
                onClick={handleAddPatient}
                className="flex items-center bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
                disabled={!selectedClinic}
              >
                <span className="mr-2">➕</span>
                เพิ่มผู้ป่วย
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
                  placeholder="ค้นหาด้วย ชื่อ-สกุล, HN code, หรือ รหัสประชาชน..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-blue-200 rounded-lg bg-blue-50 focus:ring-2 focus:ring-blue-300 focus:border-blue-300 focus:outline-none"
                  disabled={
                    !selectedClinic || patientsState.loading !== "succeeded"
                  }
                />
              </div>
            </div>

            {/* Patients Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-blue-100">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-blue-400 uppercase tracking-wider">
                      ชื่อ-สกุล
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-blue-400 uppercase tracking-wider">
                      HN CODE
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-blue-400 uppercase tracking-wider">
                      รหัสประชาชน
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-blue-400 uppercase tracking-wider">
                      เข้ารับบริการล่าสุด
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-blue-400 uppercase tracking-wider">
                      แก้ไขล่าสุด
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-blue-400 uppercase tracking-wider">
                      จัดการ{" (แก้ไข/ลบ)"}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-blue-100">
                  {filteredPatients.map((patient) => (
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
                        <div className="text-sm text-gray-900">
                          {patient.HN_code}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {patient.ID_code || "N/A"}
                        </div>
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
                          aria-label="Edit patient"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeletePatient(patient)}
                          className="text-red-500 hover:text-red-700"
                          aria-label="Delete patient"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Loading state */}
              {patientsState.loading === "pending" && (
                <div className="text-center py-8 text-blue-400">
                  <div className="text-3xl mb-2 animate-pulse">⏳</div>
                  <p>Loading patients...</p>
                </div>
              )}

              {/* Error state */}
              {patientsState.loading === "failed" && (
                <div className="text-center py-8 text-red-500">
                  <div className="text-3xl mb-2">⚠️</div>
                  <p>Error loading patients: {patientsState.error}</p>
                  <button
                    onClick={() =>
                      selectedClinic &&
                      dispatch(fetchPatients(toIdString(selectedClinic._id)))
                    }
                    className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Empty state - no patients for clinic */}
              {patientsState.loading === "succeeded" &&
                patientsState.items.length === 0 &&
                selectedClinic && (
                  <div className="text-center py-8 text-blue-500">
                    <div className="text-3xl mb-2">📋</div>
                    <p>ปัจจุบันไม่มีเวชระเบียนในคลินิกนี้</p>
                    <button
                      onClick={handleAddPatient}
                      className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                    >
                      เพิ่มผู้ป่วยคนแรก
                    </button>
                  </div>
                )}

              {/* No search results */}
              {patientsState.loading === "succeeded" &&
                patientsState.items.length > 0 &&
                filteredPatients.length === 0 && (
                  <div className="text-center py-8 text-blue-400">
                    <div className="text-3xl mb-2">🔍</div>
                    <p>ไม่พบผู้ป่วยที่ตรงตามเกณฑ์การค้นหาของคุณ</p>
                  </div>
                )}
            </div>

            {/* Pagination - only show if there are patients */}
            {filteredPatients.length > 0 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-blue-600">
                  แสดง{" "}
                  <span className="font-medium">{filteredPatients.length}</span>{" "}
                  จากทั้งหมด{" "}
                  <span className="font-medium">{patientsCount}</span> รายการ
                </div>

                <div className="flex space-x-2">
                  <button className="px-3 py-1 border border-blue-200 rounded text-blue-600 hover:bg-blue-50">
                    หน้าก่อน
                  </button>
                  <button className="px-3 py-1 bg-blue-100 border border-blue-200 rounded text-blue-800">
                    1
                  </button>
                  <button className="px-3 py-1 border border-blue-200 rounded text-blue-600 hover:bg-blue-50">
                    หน้าถัดไป
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