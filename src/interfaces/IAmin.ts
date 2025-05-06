// src/interfaces/IAdmin.ts
import { Types } from 'mongoose';

export interface IAdmin {
  _id: Types.ObjectId | string;
  username: string;
  password?: string; // Optional since we don't always want to expose this
  managedClinics: Array<Types.ObjectId | string>;
  email?: string;
  role?: string;
  createdAt?: Date;
  updatedAt?: Date;
}