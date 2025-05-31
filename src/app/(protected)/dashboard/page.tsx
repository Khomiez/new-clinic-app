// src/app/(protected)/dashboard/page.tsx - Enhanced with clinic colors
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Sidebar, Navbar, LoadingScreen, ErrorScreen } from "@/components";
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
import { formatDateThai } from "@/components";
import { useAuth } from "@/context";
import { toIdString } from "@/utils/mongoHelpers";
import { useClinicStats } from "@/hooks/useClinicStats";
import { lightenColor, generateClinicColorTheme } from "@/utils/colorUtils";
import React from "react";

// Format date for display
const formatDate = (date: Date | string | undefined): string => {
  return formatDateThai(date);
};

// PatientRow component with clinic color support
const PatientRow = React.memo(
  ({
    patient,
    onEdit,
    onDelete,
    isLoading,
    clinicColor,
  }: {
    patient: IPatient;
    onEdit: (patient: IPatient) => void;
    onDelete: (patient: IPatient) => void;
    isLoading: boolean;
    clinicColor?: string;
  }) => {
    const hoverBg = clinicColor ? lightenColor(clinicColor, 0.95) : 'bg-blue-50';
    
    return (
      <tr
        key={toIdString(patient._id)}
        className="transition-colors hover:shadow-sm"
        style={{ 
          '--hover-bg': clinicColor ? lightenColor(clinicColor, 0.95) : '#EBF8FF'
        } as React.CSSProperties}
        onMouseEnter={(e) => {
          if (clinicColor) {
            e.currentTarget.style.backgroundColor = lightenColor(clinicColor, 0.95);
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center">
            <div className="text-sm font-medium text-gray-900">
              {patient.name}
            </div>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="text-sm text-gray-900 font-mono">{patient.HN_code}</div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="text-sm text-gray-900">{patient.ID_code || "N/A"}</div>
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
            className="transition-colors p-1 rounded hover:shadow-sm mr-3"
            style={{
              color: clinicColor || '#3B82F6',
              backgroundColor: 'transparent'
            }}
            onMouseEnter={(e) => {
              if (clinicColor) {
                e.currentTarget.style.backgroundColor = lightenColor(clinicColor, 0.9);
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
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
    );
  }
);

PatientRow.displayName = "PatientRow";

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
  const [currentSearchTerm, setCurrentSearchTerm] = useState<string>("");
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    patient: IPatient | null;
  }>({ isOpen: false, patient: null });
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Clinic statistics hook
  const clinicStats = useClinicStats({
    clinicId: selectedClinic ? toIdString(selectedClinic._id) : undefined,
    refreshInterval: 5 * 60 * 1000,
  });

  // Search input ref for focus management
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auth context
  const { isAuthenticated, logout, loading } = useAuth();
  const router = useRouter();

  // Generate dynamic styles based on clinic color
  const getDynamicStyles = () => {
    if (!selectedClinic?.color) {
      return {
        backgroundClass: "bg-gradient-to-br from-blue-50 to-white",
        cardBg: "bg-white",
        buttonBg: "bg-blue-500 hover:bg-blue-600",
        searchBg: "bg-blue-50",
        borderColor: "border-blue-200",
        focusRing: "focus:ring-blue-300 focus:border-blue-300",
      };
    }

    const theme = generateClinicColorTheme(selectedClinic.color);
    return {
      backgroundClass: `bg-gradient-to-br from-[${theme.primaryLight}] to-white`,
      cardBg: "bg-white",
      buttonBg: `bg-[${selectedClinic.color}] hover:bg-[${lightenColor(selectedClinic.color, -0.1)}]`,
      searchBg: `bg-[${theme.primaryLight}]`,
      borderColor: `border-[${theme.border}]`,
      focusRing: `focus:ring-[${theme.border}] focus:border-[${selectedClinic.color}]`,
      textColor: `text-[${selectedClinic.color}]`,
    };
  };

  const dynamicStyles = getDynamicStyles();

  // Handle search form submission
  const handleSearchSubmit = useCallback(
    (e?: React.FormEvent) => {
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
        dispatch(
          searchPatients({
            clinicId: toIdString(selectedClinic._id),
            search: trimmedSearch,
            page: 1,
          })
        );
      } else {
        dispatch(
          fetchPatientsWithPagination({
            clinicId: toIdString(selectedClinic._id),
          })
        );
      }

      searchInputRef.current?.focus();
    },
    [selectedClinic, searchTerm, dispatch]
  );

  // Handle clear search
  const handleClearSearch = useCallback(() => {
    setSearchTerm("");
    setCurrentSearchTerm("");

    if (selectedClinic) {
      dispatch(
        fetchPatientsWithPagination({
          clinicId: toIdString(selectedClinic._id),
        })
      );
    }

    searchInputRef.current?.focus();
  }, [selectedClinic, dispatch]);

  // Handle Enter key press in search input
  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSearchSubmit();
      }
    },
    [handleSearchSubmit]
  );

  // First, fetch admin data when component mounts
  useEffect(() => {
    if (isAuthenticated && !adminInfo.id) {
      dispatch(fetchAdminData());
    }
  }, [dispatch, isAuthenticated, adminInfo.id]);

  // Then, fetch clinics when admin data is available
  useEffect(() => {
    if (
      adminInfo.id &&
      adminInfo.loading === "succeeded" &&
      clinicsState.loading === "idle"
    ) {
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

      if (selectedClinicId) {
        clinicToSelect = clinicsState.items.find(
          (c) => toIdString(c._id) === selectedClinicId
        );
      }

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

  const handleEditPatient = useCallback(
    (patient: IPatient): void => {
      if (selectedClinic) {
        router.push(
          `/patients/edit/${toIdString(patient._id)}?clinicId=${toIdString(
            selectedClinic._id
          )}`
        );
      }
    },
    [selectedClinic, router]
  );

  const handleDeletePatient = useCallback((patient: IPatient): void => {
    setDeleteDialog({ isOpen: true, patient });
  }, []);

  const confirmDeletePatient = useCallback(
    async (forceDelete: boolean): Promise<void> => {
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
        throw error;
      }
    },
    [
      deleteDialog.patient,
      selectedClinic,
      dispatch,
      patientsState.pagination,
      currentSearchTerm,
    ]
  );

  const handleClinicChange = useCallback(
    (clinicId: string): void => {
      if (!clinicId) return;

      setSearchTerm("");
      setCurrentSearchTerm("");
      dispatch(clearPatients());

      const clinic = clinicsState.items.find(
        (c) => toIdString(c._id) === clinicId
      );

      if (clinic) {
        setSelectedClinicState(clinic);
        dispatch(setSelectedClinic(clinicId));
        dispatch(fetchPatientsWithPagination({ clinicId }));
      }
    },
    [clinicsState.items, dispatch]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      if (selectedClinic) {
        if (currentSearchTerm) {
          dispatch(
            searchPatients({
              clinicId: toIdString(selectedClinic._id),
              search: currentSearchTerm,
              page,
            })
          );
        } else {
          dispatch(
            changePage({
              clinicId: toIdString(selectedClinic._id),
              page,
            })
          );
        }
      }
    },
    [selectedClinic, dispatch, currentSearchTerm]
  );

  const handlePageSizeChange = useCallback(
    (newSize: number) => {
      if (selectedClinic) {
        if (currentSearchTerm) {
          dispatch(
            searchPatients({
              clinicId: toIdString(selectedClinic._id),
              search: currentSearchTerm,
              page: 1,
              limit: newSize,
            })
          );
        } else {
          dispatch(
            changePageSize({
              clinicId: toIdString(selectedClinic._id),
              limit: newSize,
            })
          );
        }
      }
    },
    [selectedClinic, dispatch, currentSearchTerm]
  );

  // Show loading screen
  if (loading || adminInfo.loading === "pending" || isInitialLoad) {
    return <LoadingScreen pageName="Dashboard" />;
  }

  // Show error screens
  if (adminInfo.loading === "failed") {
    return (
      <ErrorScreen
        title="Admin Data Error"
        error={adminInfo.error || "Failed to load administrator data"}
        retry={() => dispatch(fetchAdminData())}
      />
    );
  }

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
    <div 
      className={`min-h-screen transition-all duration-500 ${dynamicStyles.backgroundClass}`}
      style={{
        background: selectedClinic?.color 
          ? `linear-gradient(135deg, ${lightenColor(selectedClinic.color, 0.97)} 0%, white 100%)`
          : 'linear-gradient(135deg, #EBF8FF 0%, white 100%)'
      }}
    >
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
        {/* Enhanced Sidebar with Clinic Colors */}
        <Sidebar
          clinics={Array.isArray(clinicsState.items) ? clinicsState.items : []}
          selectedClinic={selectedClinic}
          handleClinicChange={handleClinicChange}
          activePage="dashboard"
          clinicStats={clinicStats}
        />

        {/* Main Content */}
        <div className="flex-grow p-4 sm:p-6 lg:p-8">
          <div className="mb-6 sm:mb-8">
            <h2 
              className="text-xl sm:text-2xl font-bold mb-2"
              style={{ 
                color: selectedClinic?.color || '#1E40AF'
              }}
            >
              จัดการผู้ป่วย
            </h2>
            <p 
              className="text-sm sm:text-base"
              style={{ 
                color: selectedClinic?.color 
                  ? lightenColor(selectedClinic.color, 0.3)
                  : '#60A5FA'
              }}
            >
              จัดการผู้ป่วยและเวชระเบียนของคุณ
            </p>
            {selectedClinic && (
              <p 
                className="mt-2 text-sm sm:text-base"
                style={{ 
                  color: selectedClinic.color || '#3B82F6'
                }}
              >
                คลินิกปัจจุบัน: <strong>{selectedClinic.name}</strong>
              </p>
            )}
          </div>

          {/* Patient List Section */}
          <div 
            className={`${dynamicStyles.cardBg} p-4 sm:p-6 rounded-xl shadow-md border transition-all duration-300`}
            style={{
              borderColor: selectedClinic?.color 
                ? lightenColor(selectedClinic.color, 0.8)
                : '#DBEAFE'
            }}
          >
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
              <h3 
                className="text-xl sm:text-2xl font-bold"
                style={{ 
                  color: selectedClinic?.color || '#1E40AF'
                }}
              >
                เวชระเบียนผู้ป่วย
              </h3>
              <button
                onClick={handleAddPatient}
                className="flex items-center justify-center text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: selectedClinic?.color || '#3B82F6',
                }}
                onMouseEnter={(e) => {
                  if (selectedClinic?.color) {
                    e.currentTarget.style.backgroundColor = lightenColor(selectedClinic.color, -0.1);
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedClinic?.color) {
                    e.currentTarget.style.backgroundColor = selectedClinic.color;
                  }
                }}
                disabled={!selectedClinic}
              >
                <span className="mr-2">➕</span>
                เพิ่มผู้ป่วย
              </button>
            </div>

            {/* Search Form */}
            <form onSubmit={handleSearchSubmit} className="mb-6">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span 
                      style={{ 
                        color: selectedClinic?.color 
                          ? lightenColor(selectedClinic.color, 0.3)
                          : '#60A5FA'
                      }}
                    >
                      🔍
                    </span>
                  </div>
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="ค้นหาด้วย ชื่อ-สกุล, HN code, หรือ รหัสประชาชน..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    className="block w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:outline-none transition-colors"
                    style={{
                      backgroundColor: selectedClinic?.color 
                        ? lightenColor(selectedClinic.color, 0.95)
                        : '#EBF8FF',
                      borderColor: selectedClinic?.color 
                        ? lightenColor(selectedClinic.color, 0.8)
                        : '#DBEAFE',
                      color: selectedClinic?.color || '#1E40AF',
                    }}
                    disabled={!selectedClinic || isLoading}
                  />
                </div>

                {/* Search and Clear Buttons */}
                <button
                  type="submit"
                  disabled={!selectedClinic || isLoading}
                  className="flex items-center gap-2 px-6 py-3 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  style={{
                    backgroundColor: selectedClinic?.color || '#3B82F6',
                  }}
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
                  <p 
                    className="text-sm"
                    style={{ 
                      color: selectedClinic?.color || '#2563EB'
                    }}
                  >
                    กำลังแสดงผลการค้นหา: "
                    <span className="font-medium">{currentSearchTerm}</span>"
                    {pagination && (
                      <span>
                        {" "}
                        - พบ{" "}
                        <span className="font-medium">
                          {pagination.totalItems}
                        </span>{" "}
                        รายการ
                      </span>
                    )}
                  </p>
                </div>
              )}
            </form>

            {/* Pagination Controls */}
            {pagination && pagination.totalItems > 0 && (
              <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-3">
                  <span 
                    className="text-sm"
                    style={{ 
                      color: selectedClinic?.color || '#2563EB'
                    }}
                  >
                    แสดงผลต่อหน้า:
                  </span>
                  <select
                    value={pagination.itemsPerPage}
                    onChange={(e) =>
                      handlePageSizeChange(Number(e.target.value))
                    }
                    className="px-3 py-1 border rounded-lg bg-white text-sm focus:outline-none focus:ring-2 disabled:opacity-50"
                    style={{
                      borderColor: selectedClinic?.color 
                        ? lightenColor(selectedClinic.color, 0.8)
                        : '#DBEAFE',
                      color: selectedClinic?.color || '#1E40AF',
                    }}
                    disabled={isLoading}
                  >
                    <option value={5}>5 รายการ</option>
                    <option value={10}>10 รายการ</option>
                    <option value={25}>25 รายการ</option>
                    <option value={50}>50 รายการ</option>
                  </select>
                </div>

                <div 
                  className="text-sm"
                  style={{ 
                    color: selectedClinic?.color || '#2563EB'
                  }}
                >
                  หน้า{" "}
                  <span className="font-medium">{pagination.currentPage}</span>{" "}
                  จาก{" "}
                  <span className="font-medium">{pagination.totalPages}</span> ({" "}
                  <span className="font-medium">{pagination.totalItems}</span>{" "}
                  รายการทั้งหมด)
                </div>
              </div>
            )}

            {/* Patients Table - Enhanced with Clinic Colors */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y"
                style={{
                  borderColor: selectedClinic?.color 
                    ? lightenColor(selectedClinic.color, 0.9)
                    : '#DBEAFE'
                }}
              >
                <thead>
                  <tr>
                    <th 
                      className="px-3 sm:px-6 py-3 text-left text-base font-medium uppercase tracking-wider"
                      style={{ 
                        color: selectedClinic?.color 
                          ? lightenColor(selectedClinic.color, 0.3)
                          : '#60A5FA'
                      }}
                    >
                      ชื่อ-สกุล
                    </th>
                    <th 
                      className="px-3 sm:px-6 py-3 text-left text-base font-medium uppercase tracking-wider"
                      style={{ 
                        color: selectedClinic?.color 
                          ? lightenColor(selectedClinic.color, 0.3)
                          : '#60A5FA'
                      }}
                    >
                      HN CODE
                    </th>
                    <th 
                      className="hidden md:table-cell px-3 sm:px-6 py-3 text-left text-base font-medium uppercase tracking-wider"
                      style={{ 
                        color: selectedClinic?.color 
                          ? lightenColor(selectedClinic.color, 0.3)
                          : '#60A5FA'
                      }}
                    >
                      รหัสประชาชน
                    </th>
                    <th 
                      className="hidden lg:table-cell px-3 sm:px-6 py-3 text-left text-base font-medium uppercase tracking-wider"
                      style={{ 
                        color: selectedClinic?.color 
                          ? lightenColor(selectedClinic.color, 0.3)
                          : '#60A5FA'
                      }}
                    >
                      เข้ารับบริการล่าสุด
                    </th>
                    <th 
                      className="hidden xl:table-cell px-3 sm:px-6 py-3 text-left text-base font-medium uppercase tracking-wider"
                      style={{ 
                        color: selectedClinic?.color 
                          ? lightenColor(selectedClinic.color, 0.3)
                          : '#60A5FA'
                      }}
                    >
                      แก้ไขล่าสุด
                    </th>
                    <th 
                      className="px-3 sm:px-6 py-3 text-right text-base font-medium uppercase tracking-wider"
                      style={{ 
                        color: selectedClinic?.color 
                          ? lightenColor(selectedClinic.color, 0.3)
                          : '#60A5FA'
                      }}
                    >
                      จัดการ
                    </th>
                  </tr>
                </thead>
                <tbody 
                  className="bg-white divide-y"
                  style={{
                    borderColor: selectedClinic?.color 
                      ? lightenColor(selectedClinic.color, 0.9)
                      : '#DBEAFE'
                  }}
                >
                  {currentItems.map((patient: IPatient) => (
                    <PatientRow
                      key={toIdString(patient._id)}
                      patient={patient}
                      onEdit={handleEditPatient}
                      onDelete={handleDeletePatient}
                      isLoading={isLoading}
                      clinicColor={selectedClinic?.color}
                    />
                  ))}
                </tbody>
              </table>

              {/* Loading state */}
              {isLoading && (
                <div className="text-center py-8">
                  <div className="text-3xl mb-2 animate-spin">⏳</div>
                  <p 
                    style={{ 
                      color: selectedClinic?.color 
                        ? lightenColor(selectedClinic.color, 0.3)
                        : '#60A5FA'
                    }}
                  >
                    กำลังโหลดข้อมูลผู้ป่วย...
                  </p>
                </div>
              )}

              {/* Error state */}
              {patientsState.loading === "failed" && (
                <div className="text-center py-8 text-red-500">
                  <div className="text-3xl mb-2">⚠️</div>
                  <p className="mb-4">
                    เกิดข้อผิดพลาดในการโหลดข้อมูล: {patientsState.error}
                  </p>
                  <button
                    onClick={() =>
                      selectedClinic &&
                      dispatch(
                        fetchPatientsWithPagination({
                          clinicId: toIdString(selectedClinic._id),
                        })
                      )
                    }
                    className="text-white px-4 py-2 rounded transition-colors"
                    style={{
                      backgroundColor: selectedClinic?.color || '#3B82F6',
                    }}
                  >
                    ลองใหม่
                  </button>
                </div>
              )}

              {/* No clinic selected */}
              {!selectedClinic && (
                <div className="text-center py-8">
                  <div className="text-5xl mb-3">🏥</div>
                  <h3 className="text-xl font-medium mb-2 text-blue-700">กรุณาเลือกคลินิก</h3>
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
                  <div className="text-center py-8">
                    <div className="text-5xl mb-3">📋</div>
                    <h3 
                      className="text-xl font-medium mb-2"
                      style={{ 
                        color: selectedClinic.color || '#3B82F6'
                      }}
                    >
                      ไม่มีเวชระเบียน
                    </h3>
                    <p 
                      className="mb-4"
                      style={{ 
                        color: selectedClinic.color 
                          ? lightenColor(selectedClinic.color, 0.3)
                          : '#60A5FA'
                      }}
                    >
                      ปัจจุบันไม่มีเวชระเบียนในคลินิกนี้
                    </p>
                    <button
                      onClick={handleAddPatient}
                      className="text-white px-6 py-2 rounded-lg transition-colors"
                      style={{
                        backgroundColor: selectedClinic.color || '#3B82F6',
                      }}
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
                  <div className="text-center py-8">
                    <div className="text-5xl mb-3">🔍</div>
                    <h3 
                      className="text-xl font-medium mb-2"
                      style={{ 
                        color: selectedClinic.color || '#3B82F6'
                      }}
                    >
                      ไม่พบผลการค้นหา
                    </h3>
                    <p 
                      className="mb-4"
                      style={{ 
                        color: selectedClinic.color 
                          ? lightenColor(selectedClinic.color, 0.3)
                          : '#60A5FA'
                      }}
                    >
                      ไม่พบผู้ป่วยที่ตรงกับ "
                      <span className="font-medium">{currentSearchTerm}</span>"
                    </p>
                    <button
                      onClick={handleClearSearch}
                      className="underline transition-colors"
                      style={{ 
                        color: selectedClinic.color || '#3B82F6'
                      }}
                    >
                      ล้างการค้นหา
                    </button>
                  </div>
                )}
            </div>

            {/* Enhanced Pagination Component */}
            {pagination && pagination.totalPages > 1 && (
              <div className="mt-6">
                <Pagination
                  currentPage={pagination.currentPage}
                  totalPages={pagination.totalPages}
                  onPageChange={handlePageChange}
                  showInfo={false}
                  showPageSizes={false}
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
              </div>
            )}
          </div>

          {/* Enhanced Help Section */}
          <div 
            className="mt-6 p-4 sm:p-6 rounded-xl border transition-all duration-300"
            style={{
              backgroundColor: selectedClinic?.color 
                ? lightenColor(selectedClinic.color, 0.97)
                : '#EBF8FF',
              borderColor: selectedClinic?.color 
                ? lightenColor(selectedClinic.color, 0.9)
                : '#DBEAFE',
            }}
          >
            <h3 
              className="text-lg font-bold mb-3 flex items-center"
              style={{ 
                color: selectedClinic?.color || '#1E40AF'
              }}
            >
              <span className="mr-2">💡</span>
              วิธีใช้งาน
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 
                  className="font-medium mb-2"
                  style={{ 
                    color: selectedClinic?.color || '#1E40AF'
                  }}
                >
                  การค้นหา:
                </h4>
                <ul 
                  className="space-y-1"
                  style={{ 
                    color: selectedClinic?.color 
                      ? lightenColor(selectedClinic.color, 0.2)
                      : '#2563EB'
                  }}
                >
                  <li>• พิมพ์คำค้นหาในช่องค้นหา</li>
                  <li>• กดปุ่ม "ค้นหา" หรือ Enter เพื่อค้นหา</li>
                  <li>• ค้นหาด้วยชื่อ-นามสกุล, HN Code, หรือรหัสประชาชน</li>
                  <li>• กดปุ่ม "ล้าง" เพื่อแสดงผู้ป่วยทั้งหมด</li>
                </ul>
              </div>
              <div>
                <h4 
                  className="font-medium mb-2"
                  style={{ 
                    color: selectedClinic?.color || '#1E40AF'
                  }}
                >
                  การจัดการ:
                </h4>
                <ul 
                  className="space-y-1"
                  style={{ 
                    color: selectedClinic?.color 
                      ? lightenColor(selectedClinic.color, 0.2)
                      : '#2563EB'
                  }}
                >
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