// src/app/(protected)/dashboard/page.tsx - Final version with server-side pagination
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Sidebar,
  Navbar,
  LoadingScreen,
  ErrorScreen,
  Card,
  Pagination,
} from "@/components";
import { PatientDeleteDialog } from "@/components/PatientDeleteDialog";
import { IClinic, IPatient } from "@/interfaces";
import { useAppSelector } from "@/redux/hooks/useAppSelector";
import { useAppDispatch } from "@/redux/hooks/useAppDispatch";
import { fetchClinics } from "@/redux/features/clinics/clinicsSlice";
import {
  fetchPatientsWithPagination,
  searchPatients,
  changePage,
  changePageSize,
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
  return new Date(date).toLocaleDateString("th-TH");
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

  // Local state
  const [selectedClinic, setSelectedClinicState] = useState<IClinic | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    patient: IPatient | null;
  }>({ isOpen: false, patient: null });

  // Auth context
  const { isAuthenticated, logout, loading } = useAuth();
  const router = useRouter();

  // Debounced search function
  const debouncedSearch = useCallback((term: string, clinicId: string) => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    const timeout = setTimeout(() => {
      dispatch(searchPatients({ clinicId, search: term }));
    }, 500); // 500ms delay
    
    setSearchTimeout(timeout);
  }, [dispatch, searchTimeout]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

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

  // Set the selected clinic and fetch patients
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
          dispatch(fetchPatientsWithPagination({ clinicId: selectedClinicId }));
          return;
        }
      }

      // Fallback to first clinic if no saved clinic or saved clinic not found
      if (!selectedClinic) {
        setSelectedClinicState(clinicsState.items[0]);
        const firstClinicId = toIdString(clinicsState.items[0]._id);
        dispatch(setSelectedClinic(firstClinicId));
        dispatch(fetchPatientsWithPagination({ clinicId: firstClinicId }));
      }
    }
  }, [
    clinicsState.loading,
    clinicsState.items,
    selectedClinic,
    selectedClinicId,
    dispatch,
  ]);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (selectedClinic) {
      debouncedSearch(value, toIdString(selectedClinic._id));
    }
  };

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
          forceDelete,
        })
      ).unwrap();

      setDeleteDialog({ isOpen: false, patient: null });
      
      // Refetch current page to update the list
      const currentPage = patientsState.pagination?.currentPage || 1;
      dispatch(changePage({ 
        clinicId: toIdString(selectedClinic._id), 
        page: currentPage 
      }));
    } catch (error: any) {
      // Error is thrown back to the dialog component
      throw error;
    }
  };

  const handleClinicChange = (clinicId: string): void => {
    if (!clinicId) return;

    // Clear patients when changing clinic
    dispatch(clearPatients());
    setSearchTerm(""); // Reset search term

    const clinic = clinicsState.items.find(
      (c) => toIdString(c._id) === clinicId
    );
    if (clinic) {
      setSelectedClinicState(clinic);
      dispatch(setSelectedClinic(clinicId));
      dispatch(fetchPatientsWithPagination({ clinicId }));
    }
  };

  const handlePageChange = (page: number) => {
    if (selectedClinic) {
      dispatch(changePage({ 
        clinicId: toIdString(selectedClinic._id), 
        page 
      }));
    }
  };

  const handlePageSizeChange = (newSize: number) => {
    if (selectedClinic) {
      dispatch(changePageSize({ 
        clinicId: toIdString(selectedClinic._id), 
        limit: newSize 
      }));
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

  // Get pagination info
  const pagination = patientsState.pagination;
  const currentItems = patientsState.items || [];

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

          {/* Dashboard Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card
              cardTopic="ผู้ป่วยทั้งหมด"
              cardEmoji="👥"
              cardValue={pagination?.totalItems || 0}
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
              cardTopic="รายการในหน้านี้"
              cardEmoji="📝"
              cardValue={currentItems.length}
              cardDescription1="📄 "
              cardDescription2={`หน้า ${pagination?.currentPage || 1} จาก ${pagination?.totalPages || 1}`}
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

            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-blue-400">🔍</span>
                </div>
                <input
                  type="text"
                  placeholder="ค้นหาด้วย ชื่อ-สกุล, HN code, หรือ รหัสประชาชน..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="block w-full pl-10 pr-3 py-3 border border-blue-200 rounded-lg bg-blue-50 focus:ring-2 focus:ring-blue-300 focus:border-blue-300 focus:outline-none"
                  disabled={
                    !selectedClinic || patientsState.loading === "pending"
                  }
                />
              </div>
              {searchTerm && (
                <p className="text-sm text-blue-600 mt-2">
                  ค้นหา: "{searchTerm}" - พบ {pagination?.totalItems || 0} รายการ
                </p>
              )}
            </div>

{/* Page Size Selector and Info */}
{pagination && pagination.totalItems > 0 && (
              <div className="mb-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-blue-600">
                    แสดงผลต่อหน้า:
                  </span>
                  <select
                    value={pagination.itemsPerPage}
                    onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                    className="px-3 py-1 border border-blue-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    disabled={patientsState.loading === "pending"}
                  >
                    <option value={5}>5 รายการ</option>
                    <option value={10}>10 รายการ</option>
                    <option value={25}>25 รายการ</option>
                    <option value={50}>50 รายการ</option>
                  </select>
                </div>
                
                <div className="text-sm text-blue-600">
                  หน้า {pagination.currentPage} จาก {pagination.totalPages} 
                  ({pagination.totalItems} รายการทั้งหมด)
                </div>
              </div>
            )}

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
                      จัดการ (แก้ไข/ลบ)
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-blue-100">
                  {currentItems.map((patient: IPatient) => (
                    <tr
                      key={toIdString(patient._id)}
                      className="hover:bg-blue-50 transition-colors"
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
                          className="text-blue-500 hover:text-blue-700 mr-3 transition-colors"
                          aria-label="Edit patient"
                          disabled={patientsState.loading === "pending"}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeletePatient(patient)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                          aria-label="Delete patient"
                          disabled={patientsState.loading === "pending"}
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
                  <div className="text-3xl mb-2 animate-spin">⏳</div>
                  <p>กำลังโหลดข้อมูลผู้ป่วย...</p>
                </div>
              )}

              {/* Error state */}
              {patientsState.loading === "failed" && (
                <div className="text-center py-8 text-red-500">
                  <div className="text-3xl mb-2">⚠️</div>
                  <p>เกิดข้อผิดพลาดในการโหลดข้อมูล: {patientsState.error}</p>
                  <button
                    onClick={() =>
                      selectedClinic &&
                      dispatch(fetchPatientsWithPagination({ 
                        clinicId: toIdString(selectedClinic._id) 
                      }))
                    }
                    className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
                  >
                    ลองใหม่
                  </button>
                </div>
              )}

              {/* Empty state - no patients for clinic */}
              {patientsState.loading === "succeeded" &&
                pagination?.totalItems === 0 &&
                !searchTerm &&
                selectedClinic && (
                  <div className="text-center py-8 text-blue-500">
                    <div className="text-5xl mb-3">📋</div>
                    <h3 className="text-xl font-medium mb-2">ไม่มีเวชระเบียน</h3>
                    <p className="text-blue-400 mb-4">
                      ปัจจุบันไม่มีเวชระเบียนในคลินิกนี้
                    </p>
                    <button
                      onClick={handleAddPatient}
                      className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      เพิ่มผู้ป่วยคนแรก
                    </button>
                  </div>
                )}

              {/* No search results */}
              {patientsState.loading === "succeeded" &&
                pagination?.totalItems === 0 &&
                searchTerm && (
                  <div className="text-center py-8 text-blue-400">
                    <div className="text-5xl mb-3">🔍</div>
                    <h3 className="text-xl font-medium mb-2">ไม่พบผลการค้นหา</h3>
                    <p className="text-blue-400">
                      ไม่พบผู้ป่วยที่ตรงกับ "{searchTerm}"
                    </p>
                    <button
                      onClick={handleClearSearch}
                      className="mt-3 text-blue-500 hover:text-blue-700 underline"
                    >
                      ล้างการค้นหา
                    </button>
                  </div>
                )}
            </div>

            {/* Pagination Component */}
            {pagination && pagination.totalPages > 1 && (
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
                showInfo={false} // We're showing custom info above
                showPageSizes={false} // We're showing page size selector above
                totalItems={pagination.totalItems}
                startIndex={(pagination.currentPage - 1) * pagination.itemsPerPage}
                endIndex={Math.min(
                  pagination.currentPage * pagination.itemsPerPage, 
                  pagination.totalItems
                )}
                disabled={patientsState.loading === "pending"}
                siblingCount={1}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}