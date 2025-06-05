// src/interfaces/IPatient.ts - UPDATED: Added address field
import { Types } from "mongoose";
import { IHistoryRecord } from "./IHistoryRecord";

// New interface for patient address
export interface IPatientAddress {
  provinceCode?: number;
  districtCode?: number;
  subdistrictCode?: number;
  addressLine1?: string; // For house number, street, etc.
  addressLine2?: string; // For additional address details
  postalCode?: string;
}

export interface IPatient {
  _id: Types.ObjectId | string;
  name: string;
  HN_code: string;
  ID_code?: string;
  address?: IPatientAddress; // NEW: Optional address field
  history?: IHistoryRecord[];
  lastVisit?: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}