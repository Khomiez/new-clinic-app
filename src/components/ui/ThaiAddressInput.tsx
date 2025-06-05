// src/components/ui/ThaiAddressInput.tsx - Complete address input with cascading dropdowns
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { IPatientAddress } from "@/interfaces/IPatient";
import {
  getProvinceOptions,
  getDistrictsByProvince,
  getSubdistrictsByDistrict,
  getPostalCode,
  validateAddress,
} from "@/utils/thaiLocationUtils";
import { LocationOption } from "@/types/thaiLocation";

interface ThaiAddressInputProps {
  address: IPatientAddress | undefined;
  onChange: (address: IPatientAddress) => void;
  disabled?: boolean;
  className?: string;
  clinicColor?: string;
}

const ThaiAddressInput: React.FC<ThaiAddressInputProps> = ({
  address = {},
  onChange,
  disabled = false,
  className = "",
  clinicColor = "#3B82F6",
}) => {
  // Local state for the address
  const [localAddress, setLocalAddress] = useState<IPatientAddress>(address);

  // Memoized options for better performance
  const provinceOptions = useMemo(() => getProvinceOptions(), []);

  const districtOptions = useMemo(() => {
    return localAddress.provinceCode
      ? getDistrictsByProvince(localAddress.provinceCode)
      : [];
  }, [localAddress.provinceCode]);

  const subdistrictOptions = useMemo(() => {
    return localAddress.provinceCode && localAddress.districtCode
      ? getSubdistrictsByDistrict(
          localAddress.provinceCode,
          localAddress.districtCode
        )
      : [];
  }, [localAddress.provinceCode, localAddress.districtCode]);

  // Update local state when external address changes
  useEffect(() => {
    if (JSON.stringify(address) !== JSON.stringify(localAddress)) {
      setLocalAddress(address || {});
    }
  }, [address]);

  // Auto-update postal code when subdistrict changes
  useEffect(() => {
    if (localAddress.subdistrictCode && !localAddress.postalCode) {
      const postalCode = getPostalCode(localAddress.subdistrictCode);
      if (postalCode) {
        const updatedAddress = { ...localAddress, postalCode };
        setLocalAddress(updatedAddress);
        onChange(updatedAddress);
      }
    }
  }, [localAddress.subdistrictCode]);

  // Handle province change
  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const provinceCode = e.target.value ? Number(e.target.value) : undefined;
    const updatedAddress: IPatientAddress = {
      ...localAddress,
      provinceCode,
      districtCode: undefined, // Reset district when province changes
      subdistrictCode: undefined, // Reset subdistrict when province changes
      postalCode: undefined, // Reset postal code
    };
    setLocalAddress(updatedAddress);
    onChange(updatedAddress);
  };

  // Handle district change
  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const districtCode = e.target.value ? Number(e.target.value) : undefined;
    const updatedAddress: IPatientAddress = {
      ...localAddress,
      districtCode,
      subdistrictCode: undefined, // Reset subdistrict when district changes
      postalCode: undefined, // Reset postal code
    };
    setLocalAddress(updatedAddress);
    onChange(updatedAddress);
  };

  // Handle subdistrict change
  const handleSubdistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const subdistrictCode = e.target.value ? Number(e.target.value) : undefined;
    const updatedAddress: IPatientAddress = {
      ...localAddress,
      subdistrictCode,
      postalCode: undefined, // Let the useEffect handle postal code
    };
    setLocalAddress(updatedAddress);
    onChange(updatedAddress);
  };

  // Handle text input changes
  const handleTextChange =
    (field: keyof IPatientAddress) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const updatedAddress = {
        ...localAddress,
        [field]: e.target.value || undefined,
      };
      setLocalAddress(updatedAddress);
      onChange(updatedAddress);
    };

  // Dynamic styles based on clinic color
  const inputStyles = {
    backgroundColor: clinicColor ? `${clinicColor}10` : "#EBF8FF",
    borderColor: clinicColor ? `${clinicColor}40` : "#DBEAFE",
    color: clinicColor || "#1E40AF",
  };

  const focusStyles = `focus:ring-2 focus:outline-none transition-colors`;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Address Lines */}
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label
            className="block text-sm font-medium text-slate-600 mb-1"
            htmlFor="addressLine1"
          >
            ที่อยู่ บรรทัดที่ 1
          </label>
          <input
            type="text"
            id="addressLine1"
            value={localAddress.addressLine1 || ""}
            onChange={handleTextChange("addressLine1")}
            placeholder="บ้านเลขที่ ถนน ซอย"
            disabled={disabled}
            className={`w-full px-4 py-2 rounded-lg border ${focusStyles} disabled:bg-gray-100 disabled:cursor-not-allowed`}
            style={disabled ? {} : inputStyles}
            maxLength={200}
          />
        </div>

        <div>
          <label
            className="block text-sm font-medium text-slate-600 mb-1"
            htmlFor="addressLine2"
          >
            ที่อยู่ บรรทัดที่ 2 (ไม่บังคับ)
          </label>
          <input
            type="text"
            id="addressLine2"
            value={localAddress.addressLine2 || ""}
            onChange={handleTextChange("addressLine2")}
            placeholder="รายละเอียดเพิ่มเติม"
            disabled={disabled}
            className={`w-full px-4 py-2 rounded-lg border ${focusStyles} disabled:bg-gray-100 disabled:cursor-not-allowed`}
            style={disabled ? {} : inputStyles}
            maxLength={200}
          />
        </div>
      </div>

      {/* Location Dropdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Province */}
        <div>
          <label
            className="block text-sm font-medium text-slate-600 mb-1"
            htmlFor="province"
          >
            จังหวัด
          </label>
          <select
            id="province"
            value={localAddress.provinceCode || ""}
            onChange={handleProvinceChange}
            disabled={disabled}
            className={`w-full px-4 py-2 rounded-lg border ${focusStyles} disabled:bg-gray-100 disabled:cursor-not-allowed`}
            style={disabled ? {} : inputStyles}
          >
            <option value="">เลือกจังหวัด</option>
            {provinceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* District */}
        <div>
          <label
            className="block text-sm font-medium text-slate-600 mb-1"
            htmlFor="district"
          >
            อำเภอ/เขต
          </label>
          <select
            id="district"
            value={localAddress.districtCode || ""}
            onChange={handleDistrictChange}
            disabled={disabled || !localAddress.provinceCode}
            className={`w-full px-4 py-2 rounded-lg border ${focusStyles} disabled:bg-gray-100 disabled:cursor-not-allowed`}
            style={disabled || !localAddress.provinceCode ? {} : inputStyles}
          >
            <option value="">เลือกอำเภอ/เขต</option>
            {districtOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {localAddress.provinceCode && districtOptions.length === 0 && (
            <p className="text-xs text-gray-500 mt-1">
              กำลังโหลดข้อมูลอำเภอ...
            </p>
          )}
        </div>

        {/* Subdistrict */}
        <div>
          <label
            className="block text-sm font-medium text-slate-600 mb-1"
            htmlFor="subdistrict"
          >
            ตำบล/แขวง
          </label>
          <select
            id="subdistrict"
            value={localAddress.subdistrictCode || ""}
            onChange={handleSubdistrictChange}
            disabled={disabled || !localAddress.districtCode}
            className={`w-full px-4 py-2 rounded-lg border ${focusStyles} disabled:bg-gray-100 disabled:cursor-not-allowed`}
            style={disabled || !localAddress.districtCode ? {} : inputStyles}
          >
            <option value="">เลือกตำบล/แขวง</option>
            {subdistrictOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {localAddress.districtCode && subdistrictOptions.length === 0 && (
            <p className="text-xs text-gray-500 mt-1">กำลังโหลดข้อมูลตำบล...</p>
          )}
        </div>
      </div>

      {/* Postal Code (Auto-filled) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            className="block text-sm font-medium text-slate-600 mb-1"
            htmlFor="postalCode"
          >
            รหัสไปรษณีย์
          </label>
          <input
            type="text"
            id="postalCode"
            value={localAddress.postalCode || ""}
            onChange={handleTextChange("postalCode")}
            placeholder="กรอกรหัสไปรษณีย์ 5 หลัก"
            disabled={disabled}
            className={`w-full px-4 py-2 rounded-lg border ${focusStyles} disabled:bg-gray-100 disabled:cursor-not-allowed`}
            style={disabled ? {} : inputStyles}
            pattern="[0-9]{5}"
            maxLength={5}
          />
          {localAddress.subdistrictCode && localAddress.postalCode && (
            <p className="text-xs text-green-600 mt-1">
              ✓ รหัสไปรษณีย์ถูกเติมอัตโนมัติ
            </p>
          )}
        </div>
      </div>

      {/* Validation Messages */}
      {localAddress.provinceCode && (
        <div className="mt-2">
          {(() => {
            const validation = validateAddress(localAddress);
            if (!validation.isValid) {
              return (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <span className="text-red-500 text-sm">⚠️</span>
                    <div>
                      <p className="text-sm text-red-700 font-medium">
                        ข้อมูลที่อยู่ไม่ถูกต้อง:
                      </p>
                      <ul className="text-sm text-red-600 mt-1 space-y-1">
                        {validation.errors.map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })()}
        </div>
      )}

      {/* Helper Text */}
      <div className="text-xs text-slate-500">
        💡 เลือกจังหวัดก่อน จากนั้นเลือกอำเภอและตำบล
        รหัสไปรษณีย์จะถูกเติมอัตโนมัติ
      </div>
    </div>
  );
};

export default ThaiAddressInput;
