// src/components/ui/PatientForm.tsx
import React from 'react';
import { IPatient } from '@/interfaces';

interface PatientFormProps {
  patient: Partial<IPatient>;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  submitLabel?: string;
  cancelAction?: () => void;
}

const PatientForm: React.FC<PatientFormProps> = ({
  patient,
  handleChange,
  handleSubmit,
  isSubmitting,
  submitLabel = "Save Patient",
  cancelAction
}) => {
  return (
    <form className="max-w-2xl mx-auto" onSubmit={handleSubmit}>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              className="w-full px-4 py-2 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50"
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
              value={patient.HN_code || ""}
              onChange={handleChange}
              placeholder="Enter hospital number"
              required
              className="w-full px-4 py-2 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50"
            />
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
            className="w-full px-4 py-2 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50"
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
            className="w-full px-4 py-2 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50"
          />
        </div>
        
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
          <p className="text-sm text-blue-600">
            <span className="font-bold">Note:</span> Medical history records can be added after creating the patient.
          </p>
        </div>
        
        <div className="py-2">
          <p className="text-sm text-slate-500">
            <span className="text-red-500">*</span> Required fields
          </p>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          {cancelAction && (
            <button
              type="button"
              onClick={cancelAction}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition flex items-center gap-1"
            >
              <span>Cancel</span> ❌
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors disabled:bg-blue-300"
          >
            {isSubmitting ? "Saving..." : submitLabel + " 💾"}
          </button>
        </div>
      </div>
    </form>
  );
};

export default PatientForm;