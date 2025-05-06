// src/interfaces/IClinic.ts
import { Types } from "mongoose";

export interface IClinic {
  _id: Types.ObjectId | string;
  name: string;
  address?: string;
  phone: string[];
  managerId: Array<Types.ObjectId | string>;
  createdAt?: Date;
  updatedAt?: Date;
}