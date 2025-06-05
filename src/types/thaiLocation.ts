// src/types/thaiLocation.ts - Types for Thai location data
export interface ThaiProvince {
  id: number;
  provinceCode: number;
  provinceNameEn: string;
  provinceNameTh: string;
}

export interface ThaiDistrict {
  id: number;
  provinceCode: number;
  districtCode: number;
  districtNameEn: string;
  districtNameTh: string;
  postalCode: number;
}

export interface ThaiSubdistrict {
  id: number;
  provinceCode: number;
  districtCode: number;
  subdistrictCode: number;
  subdistrictNameEn: string;
  subdistrictNameTh: string;
  postalCode: number;
}

// Helper types for dropdowns
export interface LocationOption {
  value: number;
  label: string;
  labelEn?: string;
  postalCode?: number;
}

// Complete address with names for display
export interface FormattedAddress {
  provinceCode?: number;
  provinceName?: string;
  districtCode?: number;
  districtName?: string;
  subdistrictCode?: number;
  subdistrictName?: string;
  postalCode?: string;
  addressLine1?: string;
  addressLine2?: string;
}