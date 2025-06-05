// src/components/ui/AddressDisplay.tsx - Component for displaying formatted addresses
"use client";

import React from "react";
import { IPatientAddress } from "@/interfaces/IPatient";
import { getFullAddressString, formatAddress } from "@/utils/thaiLocationUtils";

interface AddressDisplayProps {
  address?: IPatientAddress;
  compact?: boolean;
  showLabel?: boolean;
  className?: string;
}

const AddressDisplay: React.FC<AddressDisplayProps> = ({
  address,
  compact = false,
  showLabel = true,
  className = "",
}) => {
  // Don't render anything if no address
  if (!address || Object.keys(address).length === 0) {
    return compact ? (
      <span className={`text-gray-500 italic text-sm ${className}`}>
        ไม่มีที่อยู่
      </span>
    ) : null;
  }

  const fullAddressString = getFullAddressString(address);
  const formattedAddress = formatAddress(address);

  if (compact) {
    return (
      <div className={`text-sm ${className}`}>
        {showLabel && (
          <span className="text-gray-600 font-medium">ที่อยู่: </span>
        )}
        <span className="text-gray-700" title={fullAddressString}>
          {fullAddressString.length > 50
            ? `${fullAddressString.substring(0, 50)}...`
            : fullAddressString}
        </span>
      </div>
    );
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {showLabel && (
        <p className="text-sm font-medium text-gray-600">ที่อยู่:</p>
      )}

      {/* Address Lines */}
      {(address.addressLine1 || address.addressLine2) && (
        <div className="text-sm text-gray-700">
          {address.addressLine1 && <div>{address.addressLine1}</div>}
          {address.addressLine2 && <div>{address.addressLine2}</div>}
        </div>
      )}

      {/* Location Details */}
      {(formattedAddress.subdistrictName ||
        formattedAddress.districtName ||
        formattedAddress.provinceName) && (
        <div className="text-sm text-gray-700">
          {formattedAddress.subdistrictName && (
            <span>ตำบล{formattedAddress.subdistrictName} </span>
          )}
          {formattedAddress.districtName && (
            <span>อำเภอ{formattedAddress.districtName} </span>
          )}
          {formattedAddress.provinceName && (
            <span>จังหวัด{formattedAddress.provinceName}</span>
          )}
        </div>
      )}

      {/* Postal Code */}
      {formattedAddress.postalCode && (
        <div className="text-sm text-gray-600">
          รหัสไปรษณีย์: {formattedAddress.postalCode}
        </div>
      )}
    </div>
  );
};

export default AddressDisplay;