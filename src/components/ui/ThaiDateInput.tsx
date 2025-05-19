// src/components/ui/ThaiDateInput.tsx
import React from "react";
import { formatDateForInput } from "./dateFormatters";

interface ThaiDateInputProps {
  id: string;
  name: string;
  value: Date | string | undefined;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

const ThaiDateInput: React.FC<ThaiDateInputProps> = ({
  id,
  name,
  value,
  onChange,
  label,
  required = false,
  disabled = false,
  className = "",
  placeholder = "",
}) => {
  // Convert date to yyyy-MM-dd format for input
  const formattedValue = formatDateForInput(value);

  // Display date in Thai format in a tooltip or help text
  const thaiDate = value
    ? new Date(value).toLocaleDateString("th-TH", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        calendar: "buddhist",
      })
    : "";

  return (
    <div className="relative">
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-slate-600 mb-1"
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <input
        type="date"
        id={id}
        name={name}
        value={formattedValue}
        onChange={onChange}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        className={`w-full px-4 py-2 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50 disabled:bg-gray-100 disabled:cursor-not-allowed ${className}`}
      />

      {value && (
        <div className="text-xs text-blue-500 mt-1">วันที่ไทย: {thaiDate}</div>
      )}
    </div>
  );
};

export default ThaiDateInput;
