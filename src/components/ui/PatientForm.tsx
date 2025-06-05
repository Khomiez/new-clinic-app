// src/components/ui/PatientForm.tsx - COMPLETE UPDATED: Enhanced with Thai address functionality
import React from "react";
import { IPatient, IPatientAddress } from "@/interfaces";
import ThaiDateInput from "./ThaiDateInput";
import ThaiAddressInput from "./ThaiAddressInput";
import { ThaiDatePicker } from "@/components/ui";

interface PatientFormProps {
  patient: Partial<IPatient>;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleAddressChange?: (address: IPatientAddress) => void; // NEW: Address change handler
  handleSubmit?: (e: React.FormEvent) => void; // Optional for edit mode
  isEditMode?: boolean;
  nextHNCode?: string;
  disabled?: boolean;
  isSubmitting?: boolean;
  submitLabel?: string;
  cancelAction?: () => void;
  clinicColor?: string; // NEW: For styling consistency
}

const PatientForm: React.FC<PatientFormProps> = ({
  patient,
  handleChange,
  handleAddressChange, // NEW: Address change handler
  handleSubmit,
  isEditMode = false,
  nextHNCode = "",
  disabled = false,
  isSubmitting = false,
  submitLabel = "Add Patient",
  cancelAction,
  clinicColor = "#3B82F6", // NEW: Default clinic color
}) => {
  // NEW: Default address change handler if not provided
  const defaultHandleAddressChange = (address: IPatientAddress) => {
    // This creates a synthetic event to work with existing handleChange pattern
    const syntheticEvent = {
      target: {
        name: "address",
        value: address,
      },
    } as any;
    
    // If a specific handler is provided, use it; otherwise use the generic one
    if (handleAddressChange) {
      handleAddressChange(address);
    } else {
      handleChange(syntheticEvent);
    }
  };

  // Dynamic styles based on clinic color
  const getInputStyles = () => ({
    backgroundColor: disabled ? undefined : clinicColor ? `${clinicColor}10` : '#EBF8FF',
    borderColor: disabled ? undefined : clinicColor ? `${clinicColor}40` : '#DBEAFE',
    color: disabled ? undefined : clinicColor || '#1E40AF',
  });

  const getButtonStyles = () => ({
    backgroundColor: clinicColor || '#3B82F6',
    borderColor: clinicColor || '#3B82F6',
  });

  const getNoteBgStyles = () => ({
    backgroundColor: clinicColor ? `${clinicColor}05` : '#EBF8FF',
    borderColor: clinicColor ? `${clinicColor}20` : '#DBEAFE',
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information Section */}
      <div className="space-y-6">
        <h3 
          className="text-lg font-medium border-b pb-2"
          style={{ 
            color: clinicColor || '#1E40AF',
            borderColor: clinicColor ? `${clinicColor}30` : '#DBEAFE'
          }}
        >
          ข้อมูลพื้นฐาน
        </h3>
        
        <div className="grid grid-cols-1 gap-6">
          {/* Patient Name */}
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
              placeholder="กรอกชื่อ-นามสกุลผู้ป่วย"
              required
              disabled={disabled}
              className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
              style={disabled ? {} : getInputStyles()}
            />
          </div>

          {/* Hospital Number */}
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
              className="w-full px-4 py-2 rounded-lg border bg-gray-100 cursor-not-allowed text-gray-600"
            />
            {isEditMode ? (
              <p className="text-xs text-blue-500 mt-1">
                รหัส HN ไม่สามารถเปลี่ยนแปลงได้หลังจากสร้างแล้ว
              </p>
            ) : (
              <p className="text-xs text-blue-500 mt-1">
                รหัส HN นี้จะถูกกำหนดโดยอัตโนมัติ
              </p>
            )}
          </div>

          {/* ID Code */}
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
              placeholder="กรอกหมายเลขบัตรประชาชน 13 หลัก (ไม่บังคับ)"
              disabled={disabled}
              maxLength={13}
              pattern="[0-9]{13}"
              className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
              style={disabled ? {} : getInputStyles()}
            />
            <p className="text-xs text-gray-500 mt-1">
              ใส่เฉพาะตัวเลข 13 หลัก (ไม่ต้องใส่เครื่องหมาย - )
            </p>
          </div>
        </div>
      </div>

      {/* Address Section */}
      <div className="space-y-4">
        <h3 
          className="text-lg font-medium border-b pb-2 flex items-center gap-2"
          style={{ 
            color: clinicColor || '#1E40AF',
            borderColor: clinicColor ? `${clinicColor}30` : '#DBEAFE'
          }}
        >
          <span>🏠</span> ที่อยู่ (ไม่บังคับ)
        </h3>
        
        <div 
          className="p-4 rounded-lg border"
          style={{
            backgroundColor: clinicColor ? `${clinicColor}05` : '#F8FAFC',
            borderColor: clinicColor ? `${clinicColor}20` : '#E2E8F0',
          }}
        >
          <ThaiAddressInput
            address={patient.address}
            onChange={defaultHandleAddressChange}
            disabled={disabled}
            clinicColor={clinicColor}
          />
        </div>
      </div>

      {/* Last Visit Section */}
      <div className="space-y-4">
        <h3 
          className="text-lg font-medium border-b pb-2 flex items-center gap-2"
          style={{ 
            color: clinicColor || '#1E40AF',
            borderColor: clinicColor ? `${clinicColor}30` : '#DBEAFE'
          }}
        >
          <span>📅</span> ข้อมูลการเข้ารับบริการ
        </h3>
        
        <div>
          <label
            className="block text-sm font-medium text-slate-600 mb-1"
            htmlFor="lastVisit"
          >
            วันที่เข้ารับบริการครั้งล่าสุด
          </label>
          <ThaiDatePicker
            selectedDate={
              patient.lastVisit
                ? typeof patient.lastVisit === "string"
                  ? new Date(patient.lastVisit)
                  : patient.lastVisit
                : null
            }
            onChange={(date) => {
              // Create a synthetic event to match the onChange handler
              const syntheticEvent = {
                target: {
                  name: "lastVisit",
                  value: date.toISOString(),
                },
              } as React.ChangeEvent<HTMLInputElement>;

              handleChange(syntheticEvent);
            }}
            disabled={disabled}
            placeholder="เลือกวันที่เข้ารับบริการ"
          />
          <p className="text-xs text-gray-500 mt-1">
            หากไม่ได้กรอก ระบบจะใช้วันที่ล่าสุดจากประวัติการรักษาแทน
          </p>
        </div>
      </div>

      {/* Information Note */}
      <div 
        className="p-4 rounded-lg border"
        style={getNoteBgStyles()}
      >
        <div className="flex items-start space-x-3">
          <span className="text-lg">💡</span>
          <div>
            <p 
              className="text-sm font-medium mb-1"
              style={{ color: clinicColor || '#2563EB' }}
            >
              หมายเหตุสำคัญ:
            </p>
            <div className="text-sm space-y-1">
              {isEditMode ? (
                <>
                  <p style={{ color: clinicColor || '#2563EB' }}>
                    • การเปลี่ยนแปลงข้อมูลจะได้รับการบันทึกเมื่อคุณคลิก "Save Changes" ด้านบน
                  </p>
                  <p style={{ color: clinicColor || '#2563EB' }}>
                    • ข้อมูลที่อยู่สามารถเพิ่มหรือแก้ไขได้ตลอดเวลา
                  </p>
                </>
              ) : (
                <>
                  <p style={{ color: clinicColor || '#2563EB' }}>
                    • สามารถเพิ่มบันทึกเวชระเบียนได้หลังจากสร้างผู้ป่วยแล้ว
                  </p>
                  <p style={{ color: clinicColor || '#2563EB' }}>
                    • ข้อมูลที่อยู่สามารถเพิ่มในภายหลังได้ หากไม่ได้กรอกตอนนี้
                  </p>
                  <p style={{ color: clinicColor || '#2563EB' }}>
                    • รหัส HN จะถูกสร้างอัตโนมัติและไม่สามารถเปลี่ยนแปลงได้
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons - Only show for add mode (not edit mode) */}
      {!isEditMode && handleSubmit && (
        <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-6 border-t"
             style={{ borderColor: clinicColor ? `${clinicColor}20` : '#E2E8F0' }}>
          {cancelAction && (
            <button
              type="button"
              onClick={cancelAction}
              disabled={isSubmitting}
              className="px-6 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="mr-2">❌</span>
              ยกเลิก
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting || disabled || !patient.name}
            className="flex items-center justify-center px-6 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px]"
            style={getButtonStyles()}
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                กำลังบันทึก...
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

      {/* Required Fields Note */}
      <div className="pt-2 border-t" style={{ borderColor: clinicColor ? `${clinicColor}10` : '#F1F5F9' }}>
        <p className="text-sm text-slate-500 flex items-center">
          <span className="text-red-500 mr-1">*</span> 
          ข่องที่มีเครื่องหมายดาวสีแดงจำเป็นต้องกรอก
        </p>
      </div>
    </form>
  );
};

export default PatientForm;