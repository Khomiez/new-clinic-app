// src/components/layout/Sidebar.tsx
import React from "react";
import Link from "next/link";
import { IClinic } from "@/interfaces";
import { toIdString } from "@/utils/mongoHelpers";

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
}

const Sidebar: React.FC<SidebarProps> = ({
  clinics,
  selectedClinic,
  handleClinicChange,
  activePage = "dashboard",
}) => {
  // Navigation links configuration
  const navLinks = [
    { id: "dashboard", name: "Dashboard", icon: "📊", href: "/dashboard" },
    // { id: "appointments", name: "Appointments", icon: "📅", href: "#" },
    // { id: "examinations", name: "Examinations", icon: "🩺", href: "#" },
    // { id: "medications", name: "Medications", icon: "💊", href: "#" },
  ];

  return (
    <div className="w-64 bg-white shadow-md h-[calc(100vh-4.1rem)] flex flex-col">
      {/* Logo Section */}
      {/* <div className="p-6 border-b border-blue-100">
        <div className="flex items-center">
          <div className="text-2xl mr-2">🏥</div>
          <h1 className="text-xl font-bold text-blue-900">Boxmoji Clinical</h1>
        </div>
        <p className="text-blue-500 text-sm mt-1">Staff Portal</p>
      </div> */}

      {/* Navigation */}
      <nav className="p-4 flex-grow">
        <p className="text-blue-400 uppercase text-md font-semibold mb-2">
          เมนูหลัก
        </p>

        <ul>
          {navLinks.map((link) => (
            <li key={link.id} className="mb-1">
              <Link
                href={link.href}
                className={`flex items-center px-4 py-3 rounded-lg ${
                  activePage === link.id
                    ? "text-blue-800 bg-blue-100"
                    : "text-blue-500 hover:bg-blue-50"
                }`}
              >
                <span className="mr-3">{link.icon}</span>
                {link.name}
              </Link>
            </li>
          ))}
        </ul>

        {/* Clinic Selection */}
        <div className="mt-8">
          <p className="text-blue-400 uppercase text-md font-semibold mb-2">
            คลินิกของคุณ
          </p>

          {clinics && clinics.length > 0 ? (
            <select
              value={selectedClinic ? toIdString(selectedClinic._id) : ""}
              onChange={(e) => handleClinicChange(e.target.value)}
              className="w-full p-2 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="" disabled>
                Select a clinic
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
          ) : (
            <div className="text-blue-400 text-sm p-2 bg-blue-50 rounded-lg">
              No clinics available
            </div>
          )}
        </div>
      </nav>

      {/* Settings Bottom Section */}
      <div className="p-4 border-t border-blue-100">
        <Link
          href="/settings"
          className={`flex items-center px-4 py-3 rounded-lg ${
            activePage === "settings"
              ? "text-blue-800 bg-blue-100"
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
