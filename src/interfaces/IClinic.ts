// src/interfaces/IClinic.ts
import { Types } from "mongoose";

export interface IClinic {
  _id: Types.ObjectId | string;
  name: string;
  address?: string;
  phone: string[];
  managerId: Array<Types.ObjectId | string>;
  color?: string; // NEW: Hex color code (e.g., "#3B82F6")
  createdAt?: Date;
  updatedAt?: Date;
}