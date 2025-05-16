// src/app/(protected)/dashboard/page.tsx - Updated with manual search button
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Sidebar,
  Navbar,
  LoadingScreen,
  ErrorScreen,
} from "@/components";
import Card from "@/components/ui/Card";
import Pagination from "@/components/ui/Pagination";
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
import React from "react";

// Format date for display
const formatDate = (date: Date | string | undefined): string => {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// PatientRow component to prevent unnecessary re-renders
const PatientRow = React.memo(({
  patient,
  onEdit,
  onDelete,
  isLoading
}: {
  patient: IPatient;
  onEdit: (patient: IPatient) => void;
  onDelete: (patient: IPatient) => void;
  isLoading: boolean;
}) => (
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
      <div className="text-sm text-gray-900 font-mono">
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
        onClick={() => onEdit(patient)}
        className="text-blue-500 hover:text-blue-700 mr-3 transition-colors p-1 rounded hover:bg-blue-100"
        aria-label="Edit patient"
        disabled={isLoading}
        title="แก้ไขข้อมูลผู้ป่วย"
      >
        ✏️
      </button>
      <button
        onClick={() => onDelete(patient)}
        className="text-red-500 hover:text-red-700 transition-colors p-1 rounded hover:bg-red-100"
        aria-label="Delete patient"
        disabled={isLoading}
        title="ลบข้อมูลผู้ป่วย"
      >
        🗑️
      </button>
    </td>
  </tr>
));

PatientRow.displayName = 'PatientRow';

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
  const [selectedClinic, setSelectedClinicState] = useState<
    IClinic | undefined
  >(undefined);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [currentSearchTerm, setCurrentSearchTerm] = useState<string>(""); // Track what we're actually searching for
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    patient: IPatient | null;
  }>({ isOpen: false, patient: null });
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Search input ref for focus management
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auth context
  const { isAuthenticated, logout, loading } = useAuth();
  const router = useRouter();

  // Handle search form submission
  const handleSearchSubmit = useCallback((e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (!selectedClinic) {
      alert("กรุณาเลือกคลินิกก่อนทำการค้นหา");
      return;
    }

    const trimmedSearch = searchTerm.trim();
    setCurrentSearchTerm(trimmedSearch);

    if (trimmedSearch) {
      // Perform search
      dispatch(searchPatients({ 
        clinicId: toIdString(selectedClinic._id), 
        search: trimmedSearch, 
        page: 1 
      }));
    } else {
      // If search is empty, fetch all patients
      dispatch(fetchPatientsWithPagination({ 
        clinicId: toIdString(selectedClinic._id) 
      }));
    }

    // Optional: Keep focus on search input for better UX
    searchInputRef.current?.focus();
  }, [selectedClinic, searchTerm, dispatch]);

  // Handle clear search
  const handleClearSearch = useCallback(() => {
    setSearchTerm("");
    setCurrentSearchTerm("");
    
    if (selectedClinic) {
      // Fetch all patients (without search)
      dispatch(
        fetchPatientsWithPagination({
          clinicId: toIdString(selectedClinic._id),
        })
      );
    }
    
    // Maintain focus on the search input
    searchInputRef.current?.focus();
  }, [selectedClinic, dispatch]);

  // Handle Enter key press in search input
  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearchSubmit();
    }
  }, [handleSearchSubmit]);

  // First, fetch admin data when component mounts
  useEffect(() => {
    if (isAuthenticated && !adminInfo.id) {
      dispatch(fetchAdminData());
    }
  }, [dispatch, isAuthenticated, adminInfo.id]);

  // Then, fetch clinics when admin data is available
  useEffect(() => {
    if (adminInfo.id && adminInfo.loading === "succeeded" && clinicsState.loading === "idle") {
      dispatch(fetchClinics(adminInfo.id));
    }
  }, [adminInfo.loading, adminInfo.id, dispatch, clinicsState.loading]);

  // Set the selected clinic and fetch patients
  useEffect(() => {
    if (
      clinicsState.loading === "succeeded" &&
      Array.isArray(clinicsState.items) &&
      clinicsState.items.length > 0 &&
      isInitialLoad
    ) {
      let clinicToSelect: IClinic | undefined;

      // If we have a saved clinic ID in Redux, try to use that first
      if (selectedClinicId) {
        clinicToSelect = clinicsState.items.find(
          (c) => toIdString(c._id) === selectedClinicId
        );
      }

      // Fallback to first clinic if no saved clinic or saved clinic not found
      if (!clinicToSelect) {
        clinicToSelect = clinicsState.items[0];
      }

      if (clinicToSelect) {
        setSelectedClinicState(clinicToSelect);
        const clinicId = toIdString(clinicToSelect._id);
        dispatch(setSelectedClinic(clinicId));
        dispatch(fetchPatientsWithPagination({ clinicId }));
        setIsInitialLoad(false);
      }
    }
  }, [
    clinicsState.loading,
    clinicsState.items,
    selectedClinicId,
    dispatch,
    isInitialLoad,
  ]);

  const handleAddPatient = useCallback((): void => {
    if (selectedClinic) {
      router.push(`/patients/add?clinicId=${toIdString(selectedClinic._id)}`);
    } else {
      alert("กรุณาเลือกคลินิกก่อน");
    }
  }, [selectedClinic, router]);

  const handleEditPatient = useCallback((patient: IPatient): void => {
    if (selectedClinic) {
      router.push(
        `/patients/edit/${toIdString(patient._id)}?clinicId=${toIdString(
          selectedClinic._id
        )}`
      );
    }
  }, [selectedClinic, router]);

  const handleDeletePatient = useCallback((patient: IPatient): void => {
    setDeleteDialog({ isOpen: true, patient });
  }, []);

  const confirmDeletePatient = useCallback(async (forceDelete: boolean): Promise<void> => {
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

      // Refetch based on current search state
      const currentPage = patientsState.pagination?.currentPage || 1;
      
      if (currentSearchTerm) {
        dispatch(
          searchPatients({
            clinicId: toIdString(selectedClinic._id),
            search: currentSearchTerm,
            page: currentPage,
          })
        );
      } else {
        dispatch(
          changePage({
            clinicId: toIdString(selectedClinic._id),
            page: currentPage,
          })
        );
      }
    } catch (error: any) {
      // Error is thrown back to the dialog component
      throw error;
    }
  }, [deleteDialog.patient, selectedClinic, dispatch, patientsState.pagination, currentSearchTerm]);

  const handleClinicChange = useCallback((clinicId: string): void => {
    if (!clinicId) return;

    // Clear existing search
    setSearchTerm("");
    setCurrentSearchTerm("");

    // Clear patients when changing clinic
    dispatch(clearPatients());

    const clinic = clinicsState.items.find(
      (c) => toIdString(c._id) === clinicId
    );
    
    if (clinic) {
      setSelectedClinicState(clinic);
      dispatch(setSelectedClinic(clinicId));
      dispatch(fetchPatientsWithPagination({ clinicId }));
    }
  }, [clinicsState.items, dispatch]);

  const handlePageChange = useCallback((page: number) => {
    if (selectedClinic) {
      if (currentSearchTerm) {
        // If there's an active search, search with the new page
        dispatch(
          searchPatients({
            clinicId: toIdString(selectedClinic._id),
            search: currentSearchTerm,
            page,
          })
        );
      } else {
        // Otherwise, just change page
        dispatch(
          changePage({
            clinicId: toIdString(selectedClinic._id),
            page,
          })
        );
      }
    }
  }, [selectedClinic, dispatch, currentSearchTerm]);

  const handlePageSizeChange = useCallback((newSize: number) => {
    if (selectedClinic) {
      if (currentSearchTerm) {
        // If there's an active search, search with the new page size
        dispatch(
          searchPatients({
            clinicId: toIdString(selectedClinic._id),
            search: currentSearchTerm,
            page: 1,
            limit: newSize,
          })
        );
      } else {
        // Otherwise, just change page size
        dispatch(
          changePageSize({
            clinicId: toIdString(selectedClinic._id),
            limit: newSize,
          })
        );
      }
    }
  }, [selectedClinic, dispatch, currentSearchTerm]);

  // Show loading screen
  if (loading || adminInfo.loading === "pending" || isInitialLoad) {
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

  // Show error if clinics failed to load
  if (clinicsState.loading === "failed") {
    return (
      <ErrorScreen
        title="Clinics Data Error"
        error={clinicsState.error || "Failed to load clinics data"}
        retry={() => adminInfo.id && dispatch(fetchClinics(adminInfo.id))}
      />
    );
  }

  // Get pagination info
  const pagination = patientsState.pagination;
  const currentItems = patientsState.items || [];
  const isLoading = patientsState.loading === "pending";

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
        <div className="flex-grow p-4 sm:p-6 lg:p-8">
          <div className="mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-blue-800 mb-2">
              จัดการผู้ป่วย
            </h2>
            <p className="text-blue-400 text-sm sm:text-base">
              จัดการผู้ป่วยและเวชระเบียนของคุณ
            </p>
            {selectedClinic && (
              <p className="text-blue-500 mt-2 text-sm sm:text-base">
                คลินิกปัจจุบัน: <strong>{selectedClinic.name}</strong>
              </p>
            )}
          </div>

          {/* Dashboard Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <Card
              cardTopic="ผู้ป่วยทั้งหมด"
              cardEmoji="👥"
              cardValue={pagination?.totalItems || 0}
              cardDescription1=""
              cardDescription2="รายการทั้งหมดในระบบ"
            />
            <Card
              cardTopic="หน้าปัจจุบัน"
              cardEmoji="📄"
              cardValue={pagination?.currentPage || 1}
              cardDescription1={`จาก ${pagination?.totalPages || 1} หน้า`}
              cardDescription2=""
            />
            <Card
              cardTopic="รายการในหน้านี้"
              cardEmoji="📝"
              cardValue={currentItems.length}
              cardDescription1={`จาก ${pagination?.itemsPerPage || 10} รายการต่อหน้า`}
              cardDescription2=""
            />
          </div>

          {/* Patient List Section */}
          <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md border border-blue-100">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
              <h3 className="text-xl sm:text-2xl font-bold text-blue-800">
                เวชระเบียนผู้ป่วย
              </h3>
              <button
                onClick={handleAddPatient}
                className="flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!selectedClinic}
              >
                <span className="mr-2">➕</span>
                เพิ่มผู้ป่วย
              </button>
            </div>

            {/* Search Form with Search Button */}
            <form onSubmit={handleSearchSubmit} className="mb-6">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-blue-400">🔍</span>
                  </div>
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="ค้นหาด้วย ชื่อ-สกุล, HN code, หรือ รหัสประชาชน..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    className="block w-full pl-10 pr-4 py-3 border border-blue-200 rounded-lg bg-blue-50 focus:ring-2 focus:ring-blue-300 focus:border-blue-300 focus:outline-none transition-colors"
                    disabled={!selectedClinic || isLoading}
                  />
                </div>
                
                {/* Search Button */}
                <button
                  type="submit"
                  disabled={!selectedClinic || isLoading}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      กำลังค้นหา...
                    </>
                  ) : (
                    <>
                      <span>🔍</span>
                      ค้นหา
                    </>
                  )}
                </button>

                {/* Clear Button */}
                {(searchTerm || currentSearchTerm) && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-3 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span>❌</span>
                    ล้าง
                  </button>
                )}
              </div>
              
              {/* Search results info */}
              {currentSearchTerm && (
                <div className="mt-3">
                  <p className="text-sm text-blue-600">
                    กำลังแสดงผลการค้นหา: "<span className="font-medium">{currentSearchTerm}</span>" 
                    {pagination && (
                      <span> - พบ <span className="font-medium">{pagination.totalItems}</span> รายการ</span>
                    )}
                  </p>
                </div>
              )}
            </form>

            {/* Page Size Selector and Info */}
            {pagination && pagination.totalItems > 0 && (
              <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-blue-600">แสดงผลต่อหน้า:</span>
                  <select
                    value={pagination.itemsPerPage}
                    onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                    className="px-3 py-1 border border-blue-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
                    disabled={isLoading}
                  >
                    <option value={5}>5 รายการ</option>
                    <option value={10}>10 รายการ</option>
                    <option value={25}>25 รายการ</option>
                    <option value={50}>50 รายการ</option>
                  </select>
                </div>

                <div className="text-sm text-blue-600">
                  หน้า <span className="font-medium">{pagination.currentPage}</span> จาก{" "}
                  <span className="font-medium">{pagination.totalPages}</span> 
                  {" "}({" "}
                  <span className="font-medium">{pagination.totalItems}</span> รายการทั้งหมด)
                </div>
              </div>
            )}

            {/* Patients Table - Responsive */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-blue-100">
                <thead>
                  <tr>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-blue-400 uppercase tracking-wider">
                      ชื่อ-สกุล
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-blue-400 uppercase tracking-wider">
                      HN CODE
                    </th>
                    <th className="hidden md:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-blue-400 uppercase tracking-wider">
                      รหัสประชาชน
                    </th>
                    <th className="hidden lg:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-blue-400 uppercase tracking-wider">
                      เข้ารับบริการล่าสุด
                    </th>
                    <th className="hidden xl:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-blue-400 uppercase tracking-wider">
                      แก้ไขล่าสุด
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-blue-400 uppercase tracking-wider">
                      จัดการ
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-blue-100">
                  {currentItems.map((patient: IPatient) => (
                    <tr
                      key={toIdString(patient._id)}
                      className="hover:bg-blue-50 transition-colors"
                    >
                      <td className="px-3 sm:px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                          {patient.name}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-mono">
                          {patient.HN_code}
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-3 sm:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {patient.ID_code || "N/A"}
                        </div>
                      </td>
                      <td className="hidden lg:table-cell px-3 sm:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {formatDate(patient.lastVisit || patient.createdAt)}
                        </div>
                      </td>
                      <td className="hidden xl:table-cell px-3 sm:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {formatDate(patient.updatedAt)}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleEditPatient(patient)}
                            className="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-100 transition-colors disabled:opacity-50"
                            aria-label="Edit patient"
                            disabled={isLoading}
                            title="แก้ไขข้อมูลผู้ป่วย"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeletePatient(patient)}
                            className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-100 transition-colors disabled:opacity-50"
                            aria-label="Delete patient"
                            disabled={isLoading}
                            title="ลบข้อมูลผู้ป่วย"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Loading state */}
              {isLoading && (
                <div className="text-center py-8 text-blue-400">
                  <div className="text-3xl mb-2 animate-spin">⏳</div>
                  <p>กำลังโหลดข้อมูลผู้ป่วย...</p>
                </div>
              )}

              {/* Error state */}
              {patientsState.loading === "failed" && (
                <div className="text-center py-8 text-red-500">
                  <div className="text-3xl mb-2">⚠️</div>
                  <p className="mb-4">เกิดข้อผิดพลาดในการโหลดข้อมูล: {patientsState.error}</p>
                  <button
                    onClick={() =>
                      selectedClinic &&
                      dispatch(
                        fetchPatientsWithPagination({
                          clinicId: toIdString(selectedClinic._id),
                        })
                      )
                    }
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
                  >
                    ลองใหม่
                  </button>
                </div>
              )}

              {/* No clinic selected */}
              {!selectedClinic && (
                <div className="text-center py-8 text-blue-500">
                  <div className="text-5xl mb-3">🏥</div>
                  <h3 className="text-xl font-medium mb-2">
                    กรุณาเลือกคลินิก
                  </h3>
                  <p className="text-blue-400">
                    กรุณาเลือกคลินิกจากแถบด้านข้างเพื่อดูรายการผู้ป่วย
                  </p>
                </div>
              )}

              {/* Empty state - no patients for clinic */}
              {selectedClinic &&
                patientsState.loading === "succeeded" &&
                pagination?.totalItems === 0 &&
                !currentSearchTerm && (
                  <div className="text-center py-8 text-blue-500">
                    <div className="text-5xl mb-3">📋</div>
                    <h3 className="text-xl font-medium mb-2">
                      ไม่มีเวชระเบียน
                    </h3>
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
              {selectedClinic &&
                patientsState.loading === "succeeded" &&
                pagination?.totalItems === 0 &&
                currentSearchTerm && (
                  <div className="text-center py-8 text-blue-400">
                    <div className="text-5xl mb-3">🔍</div>
                    <h3 className="text-xl font-medium mb-2">
                      ไม่พบผลการค้นหา
                    </h3>
                    <p className="text-blue-400 mb-4">
                      ไม่พบผู้ป่วยที่ตรงกับ "<span className="font-medium">{currentSearchTerm}</span>"
                    </p>
                    <button
                      onClick={handleClearSearch}
                      className="text-blue-500 hover:text-blue-700 underline"
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
                startIndex={
                  (pagination.currentPage - 1) * pagination.itemsPerPage
                }
                endIndex={Math.min(
                  pagination.currentPage * pagination.itemsPerPage,
                  pagination.totalItems
                )}
                disabled={isLoading}
                siblingCount={1}
              />
            )}
          </div>

          {/* Quick Stats Section */}
          {selectedClinic && pagination && pagination.totalItems > 0 && (
            <div className="mt-6 bg-white p-4 sm:p-6 rounded-xl shadow-md border border-blue-100">
              <h3 className="text-lg font-bold text-blue-800 mb-4">สถิติคลินิก</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl text-blue-600 font-bold">
                    {pagination.totalItems}
                  </div>
                  <div className="text-sm text-blue-500">ผู้ป่วยทั้งหมด</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl text-green-600 font-bold">
                    {Math.ceil(pagination.totalItems / pagination.totalPages)}
                  </div>
                  <div className="text-sm text-green-500">เฉลี่ยต่อหน้า</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-2xl text-purple-600 font-bold">
                    {pagination.totalPages}
                  </div>
                  <div className="text-sm text-purple-500">หน้าทั้งหมด</div>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <div className="text-2xl text-orange-600 font-bold">
                    {selectedClinic.name.length > 10 
                      ? `${selectedClinic.name.substring(0, 10)}...` 
                      : selectedClinic.name}
                  </div>
                  <div className="text-sm text-orange-500">คลินิกปัจจุบัน</div>
                </div>
              </div>
            </div>
          )}

          {/* Help Section */}
          <div className="mt-6 bg-blue-50 p-4 sm:p-6 rounded-xl border border-blue-100">
            <h3 className="text-lg font-bold text-blue-800 mb-3 flex items-center">
              <span className="mr-2">💡</span>
              วิธีใช้งาน
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
              <div>
                <h4 className="font-medium mb-2">การค้นหา:</h4>
                <ul className="space-y-1 text-blue-600">
                  <li>• พิมพ์คำค้นหาในช่องค้นหา</li>
                  <li>• กดปุ่ม "ค้นหา" หรือ Enter เพื่อค้นหา</li>
                  <li>• ค้นหาด้วยชื่อ-นามสกุล, HN Code, หรือรหัสประชาชน</li>
                  <li>• กดปุ่ม "ล้าง" เพื่อแสดงผู้ป่วยทั้งหมด</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">การจัดการ:</h4>
                <ul className="space-y-1 text-blue-600">
                  <li>• ✏️ แก้ไขข้อมูลผู้ป่วย</li>
                  <li>• 🗑️ ลบข้อมูลผู้ป่วย</li>
                  <li>• ➕ เพิ่มผู้ป่วยใหม่</li>
                  <li>• เปลี่ยนคลินิกจากแถบด้านข้าง</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}