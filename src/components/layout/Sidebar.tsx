// components/Sidebar.tsx
import React from 'react';
import Image from 'next/image';
import { IClinic } from '@/interfaces';
import { toIdString } from '@/utils/mongoHelpers';

interface SidebarProps {
  clinics: IClinic[];
  selectedClinic?: IClinic;
  handleClinicChange: (clinicId: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  clinics, 
  selectedClinic, 
  handleClinicChange 
}) => {
  return (
    <div className="w-64 bg-white shadow-md h-screen">
      {/* Logo Section */}
      <div className="p-6 border-b border-blue-100">
        <div className="flex items-center">
          <div className="text-2xl mr-2">🏥</div>
          <h1 className="text-xl font-bold text-blue-900">Boxmoji Clinical</h1>
        </div>
        <p className="text-blue-500 text-sm mt-1">Staff Portal</p>
      </div>

      {/* Navigation */}
      <nav className="p-4">
        <p className="text-blue-400 uppercase text-xs font-semibold mb-2">
          Main Menu
        </p>
        
        <ul>
          <li className="mb-1">
            <a 
              href="#" 
              className="flex items-center px-4 py-3 text-blue-800 bg-blue-100 rounded-lg"
            >
              <span className="mr-3">📊</span>
              Dashboard
            </a>
          </li>
          <li className="mb-1">
            <a 
              href="#" 
              className="flex items-center px-4 py-3 text-blue-500 hover:bg-blue-50 rounded-lg"
            >
              <span className="mr-3">📅</span>
              Appointments
            </a>
          </li>
          <li className="mb-1">
            <a 
              href="#" 
              className="flex items-center px-4 py-3 text-blue-500 hover:bg-blue-50 rounded-lg"
            >
              <span className="mr-3">🩺</span>
              Examinations
            </a>
          </li>
          <li className="mb-1">
            <a 
              href="#" 
              className="flex items-center px-4 py-3 text-blue-500 hover:bg-blue-50 rounded-lg"
            >
              <span className="mr-3">💊</span>
              Medications
            </a>
          </li>
        </ul>
        
        {/* Clinic Selection */}
        <div className="mt-8">
          <p className="text-blue-400 uppercase text-xs font-semibold mb-2">
            Your Clinics
          </p>
          
          {clinics && clinics.length > 0 ? (
            <select
              value={selectedClinic ? toIdString(selectedClinic._id) : ''}
              onChange={(e) => handleClinicChange(e.target.value)}
              className="w-full p-2 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="" disabled>
                Select a clinic
              </option>
              {clinics.map((clinic) => (
                <option key={toIdString(clinic._id)} value={toIdString(clinic._id)}>
                  {clinic.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="text-blue-400 text-sm p-2">
              No clinics available
            </div>
          )}
        </div>
      </nav>

      {/* Settings Bottom Section */}
      <div className="absolute bottom-0 w-64 p-4 border-t border-blue-100">
        <a 
          href="#" 
          className="flex items-center px-4 py-3 text-blue-500 hover:bg-blue-50 rounded-lg"
        >
          <span className="mr-3">⚙️</span>
          Settings
        </a>
      </div>
    </div>
  );
};

export default Sidebar;