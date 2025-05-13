// src/components/ui/PatientForm.tsx - Simplified for inline editing
import React from 'react';
import { IPatient } from '@/interfaces';

interface PatientFormProps {
  patient: Partial<IPatient>;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isEditMode?: boolean;
  nextHNCode?: string;
  disabled?: boolean;
}

const PatientForm: React.FC<PatientFormProps> = ({
  patient,
  handleChange,
  isEditMode = false,
  nextHNCode = "",
  disabled = false
}) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
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
            value={patient.name || ""}
            onChange={handleChange}
            placeholder="Enter patient's full name"
            required
            disabled={disabled}
            className="w-full px-4 py-2 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
            value={isEditMode ? (patient.HN_code || "") : (nextHNCode || "HN0001")}
            onChange={handleChange}
            placeholder={isEditMode ? "" : "Auto-generated"}
            disabled={true}
            className="w-full px-4 py-2 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-100 cursor-not-allowed"
          />
          {isEditMode ? (
            <p className="text-xs text-blue-500 mt-1">
              HN code cannot be changed after creation
            </p>
          ) : (
            <p className="text-xs text-blue-500 mt-1">
              This HN code will be automatically assigned
            </p>
          )}
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
          value={patient.ID_code || ""}
          onChange={handleChange}
          placeholder="Enter ID number (optional)"
          disabled={disabled}
          className="w-full px-4 py-2 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
          value={typeof patient.lastVisit === 'string' ? patient.lastVisit : 
                patient.lastVisit instanceof Date ? patient.lastVisit.toISOString().split('T')[0] : ''}
          onChange={handleChange}
          disabled={disabled}
          className="w-full px-4 py-2 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
      </div>
      
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
        <p className="text-sm text-blue-600">
          <span className="font-bold">Note:</span> {isEditMode 
            ? 'Changes to patient information will be saved when you click "Save Changes" above.' 
            : 'Medical history records can be added after creating the patient.'
          }
        </p>
      </div>
      
      <div className="py-2">
        <p className="text-sm text-slate-500">
          <span className="text-red-500">*</span> Required fields
        </p>
      </div>
    </div>
  );
};

export default PatientForm;