// src/components/layout/Sidebar.tsx - Enhanced with clinic lock for edit mode  
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation"; // NEW: Import to detect current path
import { IClinic } from "@/interfaces";
import { toIdString } from "@/utils/mongoHelpers";
import { 
  generateClinicColorTheme, 
  applyClinicColorTheme,
  lightenColor,
  getContrastTextColor
} from "@/utils/colorUtils";

interface SidebarProps {
  clinics: IClinic[];
  selectedClinic?: IClinic;
  handleClinicChange: (clinicId: string) => void;
  activePage?:
    | "dashboard"
    | "appointments"
    | "examinations"
    | "medications"
    | "settings";
  // New props for statistics
  clinicStats?: {
    totalPatients: number;
    todayNewPatients: number;
    totalPages: number;
    isLoading: boolean;
    lastUpdated?: Date;
  };
}

// Time-based color theme configuration
interface TimeTheme {
  greeting: string;
  icon: string;
  colors: {
    background: string;
    border: string;
    textPrimary: string;
    textSecondary: string;
    iconGlow?: string;
  };
}

const Sidebar: React.FC<SidebarProps> = ({
  clinics,
  selectedClinic,
  handleClinicChange,
  activePage = "dashboard",
  clinicStats,
}) => {
  // NEW: Get current pathname to determine if we're in edit mode
  const pathname = usePathname();
  const isEditMode = pathname?.includes('/patients/edit/') || false;

  // Navigation links configuration
  const navLinks = [
    { id: "dashboard", name: "Dashboard", icon: "📊", href: "/dashboard" },
    // { id: "appointments", name: "Appointments", icon: "📅", href: "#" },
    // { id: "examinations", name: "Examinations", icon: "🩺", href: "#" },
    // { id: "medications", name: "Medications", icon: "💊", href: "#" },
  ];

  // Apply clinic color theme when selected clinic changes
  useEffect(() => {
    if (selectedClinic?.color) {
      applyClinicColorTheme(selectedClinic.color);
    } else {
      // Reset to default blue theme
      applyClinicColorTheme('#3B82F6');
    }
  }, [selectedClinic?.color]);

  // Format today's date in Thai
  const formatThaiDate = (date: Date): string => {
    return date.toLocaleDateString("th-TH", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      calendar: "buddhist",
    });
  };

  const thaiDay = (date: Date): string => {
    const days = [
      "อาทิตย์",
      "จันทร์",
      "อังคาร",
      "พุธ",
      "พฤหัสบดี",
      "ศุกร์",
      "เสาร์",
    ];
    return days[date.getDay()];
  };

  // Thai day-of-the-week color theming based on traditional Thai color associations
  const getDayBasedTheme = (): TimeTheme => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const hour = today.getHours();

    // Get time-based greeting
    const getTimeGreeting = (): { greeting: string; icon: string } => {
      if (hour >= 5 && hour < 12)
        return { greeting: "สวัสดีตอนเช้า", icon: "🌅" };
      if (hour >= 12 && hour < 17)
        return { greeting: "สวัสดีตอนบ่าย", icon: "☀️" };
      if (hour >= 17 && hour < 20)
        return { greeting: "สวัสดีตอนเย็น", icon: "🌆" };
      return { greeting: "สวัสดีตอนค่ำ", icon: "🌙" };
    };

    const { greeting, icon } = getTimeGreeting();

    // ALWAYS use traditional day colors regardless of clinic selection
    switch (dayOfWeek) {
      case 0: // Sunday (วันอาทิตย์) - Red (สีแดง)
        return {
          greeting,
          icon,
          colors: {
            background: "bg-gradient-to-r from-red-200 to-red-50",
            border: "border-red-400",
            textPrimary: "text-red-700",
            textSecondary: "text-red-500",
            iconGlow: "drop-shadow-md",
          },
        };

      case 1: // Monday (วันจันทร์) - Yellow (สีเหลือง)
        return {
          greeting,
          icon,
          colors: {
            background: "bg-gradient-to-r from-yellow-200 to-amber-50",
            border: "border-yellow-400",
            textPrimary: "text-yellow-700",
            textSecondary: "text-yellow-600",
            iconGlow: "drop-shadow-md",
          },
        };

      case 2: // Tuesday (วันอังคาร) - Pink (สีชมพู)
        return {
          greeting,
          icon,
          colors: {
            background: "bg-gradient-to-r from-pink-200 to-rose-50",
            border: "border-pink-400",
            textPrimary: "text-pink-700",
            textSecondary: "text-pink-500",
            iconGlow: "drop-shadow-md",
          },
        };

      case 3: // Wednesday (วันพุธ) - Green (สีเขียว)
        return {
          greeting,
          icon,
          colors: {
            background: "bg-gradient-to-r from-green-200 to-emerald-50",
            border: "border-green-400",
            textPrimary: "text-green-700",
            textSecondary: "text-green-600",
            iconGlow: "drop-shadow-md",
          },
        };

      case 4: // Thursday (วันพฤหัสบดี) - Orange (สีส้ม)
        return {
          greeting,
          icon,
          colors: {
            background: "bg-gradient-to-r from-orange-200 to-amber-50",
            border: "border-orange-400",
            textPrimary: "text-orange-700",
            textSecondary: "text-orange-600",
            iconGlow: "drop-shadow-md",
          },
        };

      case 5: // Friday (วันศุกร์) - Blue (สีฟ้า)
        return {
          greeting,
          icon,
          colors: {
            background: "bg-gradient-to-r from-blue-200 to-sky-50",
            border: "border-blue-400",
            textPrimary: "text-blue-700",
            textSecondary: "text-blue-600",
            iconGlow: "drop-shadow-md",
          },
        };

      case 6: // Saturday (วันเสาร์) - Purple (สีม่วง)
        return {
          greeting,
          icon,
          colors: {
            background: "bg-gradient-to-r from-purple-200 to-violet-50",
            border: "border-purple-400",
            textPrimary: "text-purple-700",
            textSecondary: "text-purple-600",
            iconGlow: "drop-shadow-md",
          },
        };

      default:
        // Fallback (should never happen)
        return {
          greeting,
          icon,
          colors: {
            background: "bg-gradient-to-r from-blue-50 to-blue-100",
            border: "border-blue-200",
            textPrimary: "text-blue-600",
            textSecondary: "text-blue-500",
          },
        };
    }
  };

  // State for current day theme (updates when day changes)
  const [currentTheme, setCurrentTheme] = useState<TimeTheme>(getDayBasedTheme);

  // Update theme when day changes or clinic changes
  useEffect(() => {
    const updateTheme = () => {
      setCurrentTheme(getDayBasedTheme());
    };

    // Update immediately
    updateTheme();

    // Set up interval to update every hour (for time-based greeting changes)
    const interval = setInterval(updateTheme, 60 * 60 * 1000); // 1 hour

    return () => clearInterval(interval);
  }, [selectedClinic?.color]);

  // Generate clinic-specific styles
  const getClinicStyles = (clinic: IClinic) => {
    if (!clinic.color) {
      return {
        backgroundColor: '#8B5CF6', // Default purple
        color: '#FFFFFF',
        lightBackground: '#F3F4F6',
        borderColor: '#E5E7EB',
      };
    }

    const theme = generateClinicColorTheme(clinic.color);
    return {
      backgroundColor: clinic.color,
      color: theme.textContrast,
      lightBackground: theme.primaryLight,
      borderColor: theme.border,
    };
  };

  // NEW: Handle clinic change with edit mode protection
  const handleClinicChangeWithProtection = (clinicId: string) => {
    if (isEditMode) {
      // Show warning in edit mode
      alert("ไม่สามารถเปลี่ยนคลินิกขณะแก้ไขข้อมูลผู้ป่วย กรุณาบันทึกหรือยกเลิกการแก้ไขก่อน");
      return;
    }
    handleClinicChange(clinicId);
  };

  return (
    <div 
      className="w-64 bg-white shadow-md h-[calc(100vh-4.1rem)] flex flex-col transition-all duration-300"
      style={{
        background: selectedClinic?.color 
          ? `linear-gradient(to bottom, ${lightenColor(selectedClinic.color, 0.98)}, white)`
          : undefined
      }}
    >
      {/* Navigation */}
      <nav className="p-4 flex-grow">
        <p className="text-blue-400 uppercase text-md font-semibold mb-2">
          เมนูหลัก
        </p>

        <ul className="mb-6">
          {navLinks.map((link) => (
            <li key={link.id} className="mb-1">
              <Link
                href={link.href}
                className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                  activePage === link.id
                    ? selectedClinic?.color
                      ? `text-[${selectedClinic.color}] bg-[${lightenColor(selectedClinic.color, 0.9)}]`
                      : "text-blue-800 bg-blue-100"
                    : selectedClinic?.color
                      ? `text-[${lightenColor(selectedClinic.color, 0.2)}] hover:bg-[${lightenColor(selectedClinic.color, 0.95)}]`
                      : "text-blue-500 hover:bg-blue-50"
                }`}
              >
                <span className="mr-3">{link.icon}</span>
                {link.name}
              </Link>
            </li>
          ))}
        </ul>

        {/* Clinic Selection - UPDATED with edit mode protection */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-blue-400 uppercase text-md font-semibold">
              คลินิกของคุณ
            </p>
            {/* NEW: Edit mode indicator */}
            {isEditMode && (
              <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                🔒 LOCKED
              </span>
            )}
          </div>

          {clinics && clinics.length > 0 ? (
            <div className="space-y-2">
              {/* Enhanced Clinic Selector - UPDATED with edit mode protection */}
              <select
                value={selectedClinic ? toIdString(selectedClinic._id) : ""}
                onChange={(e) => handleClinicChangeWithProtection(e.target.value)}
                disabled={isEditMode} // NEW: Disable in edit mode
                className={`w-full p-2 border rounded-lg focus:outline-none focus:ring-2 text-sm transition-all ${
                  isEditMode 
                    ? 'cursor-not-allowed opacity-60 bg-gray-100' 
                    : ''
                }`}
                style={{
                  backgroundColor: isEditMode 
                    ? '#F3F4F6' 
                    : selectedClinic?.color 
                      ? lightenColor(selectedClinic.color, 0.95)
                      : '#EBF5FF',
                  borderColor: isEditMode
                    ? '#D1D5DB'
                    : selectedClinic?.color 
                      ? lightenColor(selectedClinic.color, 0.7)
                      : '#DBEAFE',
                  color: isEditMode
                    ? '#6B7280'
                    : selectedClinic?.color || '#1E40AF'
                }}
                title={isEditMode ? "ไม่สามารถเปลี่ยนคลินิกขณะแก้ไขข้อมูลผู้ป่วย" : "เลือกคลินิก"}
              >
                <option value="" disabled>
                  {isEditMode ? "คลินิกถูกล็อค (กำลังแก้ไข)" : "Select a clinic"}
                </option>
                {clinics.map((clinic) => (
                  <option
                    key={toIdString(clinic._id)}
                    value={toIdString(clinic._id)}
                  >
                    {clinic.name}
                  </option>
                ))}
              </select>

              {/* NEW: Edit mode warning */}
              {isEditMode && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <span className="text-orange-500 text-sm">⚠️</span>
                    <div>
                      <p className="text-xs text-orange-700 font-medium">
                        การเปลี่ยนคลินิกถูกปิดใช้งาน
                      </p>
                      <p className="text-xs text-orange-600 mt-1">
                        กรุณาบันทึกหรือยกเลิกการแก้ไขก่อนเปลี่ยนคลินิก
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Clinic Color Indicators - UPDATED with edit mode styling */}
              <div className="flex flex-wrap gap-2">
                {clinics.map((clinic) => {
                  const styles = getClinicStyles(clinic);
                  const isSelected = selectedClinic && toIdString(clinic._id) === toIdString(selectedClinic._id);
                  
                  return (
                    <button
                      key={toIdString(clinic._id)}
                      onClick={() => handleClinicChangeWithProtection(toIdString(clinic._id))}
                      disabled={isEditMode} // NEW: Disable in edit mode
                      className={`
                        w-4 h-4 rounded-full border-2 transition-all duration-200 
                        ${isEditMode 
                          ? 'cursor-not-allowed opacity-50' 
                          : 'hover:scale-110 cursor-pointer'
                        }
                        ${isSelected ? 'scale-125 shadow-lg' : ''}
                      `}
                      style={{
                        backgroundColor: clinic.color || '#8B5CF6',
                        borderColor: isSelected ? '#FFFFFF' : 'transparent',
                        boxShadow: isSelected 
                          ? `0 0 0 2px ${clinic.color || '#8B5CF6'}40` 
                          : 'none',
                      }}
                      title={isEditMode 
                        ? `${clinic.name} (ล็อคการเปลี่ยนแปลง)`
                        : clinic.name
                      }
                    />
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-blue-400 text-sm p-2 bg-blue-50 rounded-lg">
              No clinics available
            </div>
          )}
        </div>

        {/* Rest of the component remains the same... */}
        {/* Clinic Statistics Section */}
        {selectedClinic && (
          <div className="mb-6">
            <div className="flex items-center mb-3">
              <span className="text-blue-400 uppercase text-md font-semibold">
                สถิติคลินิก
              </span>
              {clinicStats?.isLoading && (
                <span className="ml-2 animate-spin">⏳</span>
              )}
            </div>

            {/* Enhanced Dynamic Day-Based Greeting Card */}
            <div
              className={`
                ${currentTheme.colors.background} 
                p-3 rounded-lg mb-3 border 
                ${currentTheme.colors.border}
                transition-all duration-500 ease-in-out
                transform hover:scale-[1.02] hover:shadow-lg
                relative overflow-hidden
              `}
            >
              {/* Optional: Day color indicator strip */}
              <div
                className={`
                  absolute top-0 left-0 right-0 h-1 
                  ${currentTheme.colors.background
                    .replace("from-", "bg-")
                    .replace(" to-", "")
                    .split(" ")[0]
                    .replace("50", "200")}
                `}
              />

              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div
                    className={`text-sm font-medium ${currentTheme.colors.textPrimary}`}
                  >
                    {currentTheme.greeting}วัน{thaiDay(new Date())}
                  </div>
                  <div
                    className={`text-xs ${currentTheme.colors.textSecondary} mt-1`}
                  >
                    {formatThaiDate(new Date())}
                  </div>
                </div>
                <span
                  className={`
                    text-3xl ml-3 
                    ${currentTheme.colors.iconGlow || ""} 
                    transition-all duration-300 
                    hover:scale-110 hover:rotate-12
                  `}
                >
                  {currentTheme.icon}
                </span>
              </div>
            </div>

            {/* Enhanced Clinic Name Card with Dynamic Colors - ONLY THIS CARD USES CLINIC COLORS */}
            <div 
              className="p-3 mb-3 rounded-lg border transition-all duration-300 hover:shadow-md"
              style={{
                backgroundColor: selectedClinic.color 
                  ? lightenColor(selectedClinic.color, 0.92)
                  : '#F3F4F6',
                borderColor: selectedClinic.color 
                  ? lightenColor(selectedClinic.color, 0.7)
                  : '#E5E7EB',
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div
                    className="text-sm font-bold truncate"
                    style={{ 
                      color: selectedClinic.color || '#6B7280'
                    }}
                    title={selectedClinic.name}
                  >
                    {selectedClinic.name.length > 12
                      ? `${selectedClinic.name.substring(0, 12)}...`
                      : selectedClinic.name}
                  </div>
                  <div 
                    className="text-xs"
                    style={{ 
                      color: selectedClinic.color 
                        ? lightenColor(selectedClinic.color, 0.3)
                        : '#9CA3AF'
                    }}
                  >
                    คลินิกปัจจุบัน
                  </div>
                </div>
                <span className="text-xl ml-2">🏥</span>
              </div>
            </div>

            {/* Statistics Cards - BACK TO ORIGINAL BLUE THEME */}
            <div className="space-y-2">
              {/* Total Patients */}
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 transition-colors hover:bg-blue-100">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-bold text-blue-700">
                      {clinicStats?.isLoading
                        ? "..."
                        : clinicStats?.totalPatients || 0}
                    </div>
                    <div className="text-xs text-blue-500">ผู้ป่วยทั้งหมด</div>
                  </div>
                  <span className="text-xl">👥</span>
                </div>
              </div>

              {/* Today's New Patients */}
              <div className="bg-green-50 p-3 rounded-lg border border-green-100 transition-colors hover:bg-green-100">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-bold text-green-700">
                      {clinicStats?.isLoading
                        ? "..."
                        : clinicStats?.todayNewPatients || 0}
                    </div>
                    <div className="text-xs text-green-500">
                      ผู้ป่วยใหม่วันนี้
                    </div>
                  </div>
                  <span className="text-xl">✨</span>
                </div>
              </div>
            </div>

            {/* Last Updated - BACK TO ORIGINAL BLUE */}
            {clinicStats?.lastUpdated && !clinicStats.isLoading && (
              <div className="mt-3 text-xs text-blue-400 text-center">
                อัปเดตล่าสุด:{" "}
                {new Date(clinicStats.lastUpdated).toLocaleTimeString("th-TH", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            )}

            {/* Loading State - BACK TO ORIGINAL BLUE */}
            {clinicStats?.isLoading && (
              <div className="mt-3 text-center">
                <div className="bg-blue-50 p-2 rounded-lg border border-blue-100">
                  <div className="text-xs text-blue-500">กำลังโหลดสถิติ...</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* No Clinic Selected State */}
        {!selectedClinic && clinics && clinics.length > 0 && (
          <div className="mb-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-center">
              <div className="text-3xl mb-2">🏥</div>
              <div className="text-sm text-blue-600 mb-1">เลือกคลินิก</div>
              <div className="text-xs text-blue-400">เพื่อดูสถิติและข้อมูล</div>
            </div>
          </div>
        )}
      </nav>

      {/* Settings Bottom Section */}
      <div className="p-4 border-t border-blue-100">
        <Link
          href="/settings"
          className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
            activePage === "settings"
              ? selectedClinic?.color
                ? `text-[${selectedClinic.color}] bg-[${lightenColor(selectedClinic.color, 0.9)}]`
                : "text-blue-800 bg-blue-100"
              : selectedClinic?.color
                ? `text-[${lightenColor(selectedClinic.color, 0.2)}] hover:bg-[${lightenColor(selectedClinic.color, 0.95)}]`
                : "text-blue-500 hover:bg-blue-50"
          }`}
        >
          <span className="mr-3">⚙️</span>
          ตั้งค่า
        </Link>
      </div>
    </div>
  );
};

export default Sidebar;