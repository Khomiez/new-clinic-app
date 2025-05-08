import { IAdmin, IClinic } from "@/interfaces";
import React from "react";

type Props = {
  clinicName: string | undefined;
  adminUsername: string | null;
  logout: () => void;
};

const Navbar = ({ clinicName, adminUsername, logout }: Props) => {
  return (
    <nav className="bg-white shadow-sm border-b border-blue-100">
      <div className="min-w-7xl mx-4 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="text-3xl mr-2">🏥</div>
            <div>
              <h1 className="text-xl font-bold text-blue-800">
                {clinicName || "Medical Clinic"}
              </h1>
              <p className="text-sm text-blue-400">ระบบจัดการคลินิก</p>
            </div>
          </div>
          <div className="flex items-center">
            <div className="mr-4 text-right">
              <p className="text-sm font-medium text-blue-800">
                {adminUsername || "Admin User"}
              </p>
              <p className="text-xs text-blue-400">ผู้ดูแล</p>
            </div>
            <button
              onClick={() => logout()}
              className="bg-blue-100 p-2 rounded-lg hover:bg-blue-200 transition-colors"
            >
              <span className="text-lg">🚪</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
