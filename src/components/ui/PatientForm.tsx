// src/components/ui/PatientForm.tsx - Enhanced with conditional save functionality
import React from "react";
import { IPatient } from "@/interfaces";
import ThaiDateInput from "./ThaiDateInput";

interface PatientFormProps {
  patient: Partial<IPatient>;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit?: (e: React.FormEvent) => void; // Optional for edit mode
  isEditMode?: boolean;
  nextHNCode?: string;
  disabled?: boolean;
  isSubmitting?: boolean;
  submitLabel?: string;
  cancelAction?: () => void;
}

const PatientForm: React.FC<PatientFormProps> = ({
  patient,
  handleChange,
  handleSubmit,
  isEditMode = false,
  nextHNCode = "",
  disabled = false,
  isSubmitting = false,
  submitLabel = "Add Patient",
  cancelAction,
}) => {
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        <div>
          <label
            className="block text-sm font-medium text-slate-600 mb-1"
            htmlFor="name"
          >
            ชื่อ-สกุล <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={patient.name || ""}
            onChange={handleChange}
            placeholder=""
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
            value={isEditMode ? patient.HN_code || "" : nextHNCode || "HN0001"}
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
              รหัส HN นี้จะถูกกำหนดโดยอัตโนมัติ
            </p>
          )}
        </div>
      </div>

      <div>
        <label
          className="block text-sm font-medium text-slate-600 mb-1"
          htmlFor="ID_code"
        >
          รหัสประชาชน
        </label>
        <input
          type="text"
          id="ID_code"
          name="ID_code"
          value={patient.ID_code || ""}
          onChange={handleChange}
          placeholder="กรอกหมายเลขบัตรประชาชน (ไม่บังคับ)"
          disabled={disabled}
          className="w-full px-4 py-2 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
      </div>

      <ThaiDateInput
        id="lastVisit"
        name="lastVisit"
        value={
          typeof patient.lastVisit === "string"
            ? patient.lastVisit
            : patient.lastVisit instanceof Date
            ? patient.lastVisit.toISOString().split("T")[0]
            : ""
        }
        onChange={handleChange}
        disabled={disabled}
        label="วันที่เข้ารับบริการครั้งล่าสุด"
      />

      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
        <p className="text-sm text-blue-600">
          <span className="font-bold">Note:</span>{" "}
          {isEditMode
            ? 'การเปลี่ยนแปลงข้อมูลผู้ป่วยจะได้รับการบันทึกเมื่อคุณคลิก "save" ด้านบน'
            : "สามารถเพิ่มบันทึกเวชระเบียนได้หลังจากสร้างผู้ป่วยแล้ว"}
        </p>
      </div>

      {/* Show action buttons only for add mode (not edit mode) */}
      {!isEditMode && handleSubmit && (
        <div className="flex justify-end space-x-3 pt-4">
          {cancelAction && (
            <button
              type="button"
              onClick={cancelAction}
              className="px-6 py-2 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting || disabled}
            className="flex items-center px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Adding...
              </>
            ) : (
              <>
                <span className="mr-2">➕</span>
                {submitLabel}
              </>
            )}
          </button>
        </div>
      )}

      <div className="py-2">
        <p className="text-sm text-slate-500">
          <span className="text-red-500">*</span> ช่องที่จำเป็น
        </p>
      </div>
    </form>
  );
};

export default PatientForm;
