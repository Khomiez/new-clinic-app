// src/utils/thaiLocationUtils.ts - Utilities for working with Thai location data
import {
  ThaiProvince,
  ThaiDistrict,
  ThaiSubdistrict,
  LocationOption,
  FormattedAddress,
} from "@/types/thaiLocation";
import { IPatientAddress } from "@/interfaces/IPatient";

// Import the JSON data (you'll need to place these files in src/data/)
import provincesData from "@/data/provinces.json";
import districtsData from "@/data/districts.json";
import subdistrictsData from "@/data/subdistricts.json";

// Type assertions for the imported data
const provinces = provincesData as ThaiProvince[];
const districts = districtsData as ThaiDistrict[];
const subdistricts = subdistrictsData as ThaiSubdistrict[];

/**
 * Get all provinces as options for dropdown
 */
export function getProvinceOptions(): LocationOption[] {
  return provinces
    .map((province) => ({
      value: province.provinceCode,
      label: province.provinceNameTh,
      labelEn: province.provinceNameEn,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "th"));
}

/**
 * Get districts for a specific province
 */
export function getDistrictsByProvince(provinceCode: number): LocationOption[] {
  return districts
    .filter((district) => district.provinceCode === provinceCode)
    .map((district) => ({
      value: district.districtCode,
      label: district.districtNameTh,
      labelEn: district.districtNameEn,
      postalCode: district.postalCode,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "th"));
}

/**
 * Get subdistricts for a specific district
 */
export function getSubdistrictsByDistrict(
  provinceCode: number,
  districtCode: number
): LocationOption[] {
  return subdistricts
    .filter(
      (subdistrict) =>
        subdistrict.provinceCode === provinceCode &&
        subdistrict.districtCode === districtCode
    )
    .map((subdistrict) => ({
      value: subdistrict.subdistrictCode,
      label: subdistrict.subdistrictNameTh,
      labelEn: subdistrict.subdistrictNameEn,
      postalCode: subdistrict.postalCode,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "th"));
}

/**
 * Get province name by code
 */
export function getProvinceName(
  provinceCode: number,
  language: "th" | "en" = "th"
): string | null {
  const province = provinces.find((p) => p.provinceCode === provinceCode);
  if (!province) return null;
  return language === "th" ? province.provinceNameTh : province.provinceNameEn;
}

/**
 * Get district name by code
 */
export function getDistrictName(
  districtCode: number,
  language: "th" | "en" = "th"
): string | null {
  const district = districts.find((d) => d.districtCode === districtCode);
  if (!district) return null;
  return language === "th" ? district.districtNameTh : district.districtNameEn;
}

/**
 * Get subdistrict name by code
 */
export function getSubdistrictName(
  subdistrictCode: number,
  language: "th" | "en" = "th"
): string | null {
  const subdistrict = subdistricts.find(
    (s) => s.subdistrictCode === subdistrictCode
  );
  if (!subdistrict) return null;
  return language === "th"
    ? subdistrict.subdistrictNameTh
    : subdistrict.subdistrictNameEn;
}

/**
 * Get postal code for a subdistrict
 */
export function getPostalCode(subdistrictCode: number): string | null {
  const subdistrict = subdistricts.find(
    (s) => s.subdistrictCode === subdistrictCode
  );
  return subdistrict ? subdistrict.postalCode.toString() : null;
}

/**
 * Format address for display
 */
export function formatAddress(
  address: IPatientAddress,
  language: "th" | "en" = "th"
): FormattedAddress {
  const formatted: FormattedAddress = {
    ...address,
  };

  if (address.provinceCode) {
    const provinceName = getProvinceName(address.provinceCode, language);
    if (provinceName) {
      formatted.provinceName = provinceName;
    }
  }

  if (address.districtCode) {
    const districtName = getDistrictName(address.districtCode, language);
    if (districtName) {
      formatted.districtName = districtName;
    }
  }

  if (address.subdistrictCode) {
    const subdistrictName = getSubdistrictName(
      address.subdistrictCode,
      language
    );
    if (subdistrictName) {
      formatted.subdistrictName = subdistrictName;
    }

    // Auto-fill postal code if not provided
    if (!address.postalCode) {
      const postalCode = getPostalCode(address.subdistrictCode);
      if (postalCode) {
        formatted.postalCode = postalCode;
      }
    }
  }

  return formatted;
}

/**
 * Get full address string for display
 */
export function getFullAddressString(
  address: IPatientAddress,
  language: "th" | "en" = "th"
): string {
  const formatted = formatAddress(address, language);
  const parts: string[] = [];

  if (formatted.addressLine1) parts.push(formatted.addressLine1);
  if (formatted.addressLine2) parts.push(formatted.addressLine2);
  if (formatted.subdistrictName) parts.push(`ตำบล${formatted.subdistrictName}`);
  if (formatted.districtName) parts.push(`อำเภอ${formatted.districtName}`);
  if (formatted.provinceName) parts.push(`จังหวัด${formatted.provinceName}`);
  if (formatted.postalCode) parts.push(formatted.postalCode);

  return parts.join(" ");
}

/**
 * Validate address codes
 */
export function validateAddress(address: IPatientAddress): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (
    address.provinceCode &&
    !provinces.find((p) => p.provinceCode === address.provinceCode)
  ) {
    errors.push("Invalid province code");
  }

  if (
    address.districtCode &&
    !districts.find((d) => d.districtCode === address.districtCode)
  ) {
    errors.push("Invalid district code");
  }

  if (
    address.subdistrictCode &&
    !subdistricts.find((s) => s.subdistrictCode === address.subdistrictCode)
  ) {
    errors.push("Invalid subdistrict code");
  }

  // Check if district belongs to province
  if (address.provinceCode && address.districtCode) {
    const district = districts.find(
      (d) => d.districtCode === address.districtCode
    );
    if (district && district.provinceCode !== address.provinceCode) {
      errors.push("District does not belong to the selected province");
    }
  }

  // Check if subdistrict belongs to district
  if (address.districtCode && address.subdistrictCode) {
    const subdistrict = subdistricts.find(
      (s) => s.subdistrictCode === address.subdistrictCode
    );
    if (subdistrict && subdistrict.districtCode !== address.districtCode) {
      errors.push("Subdistrict does not belong to the selected district");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
