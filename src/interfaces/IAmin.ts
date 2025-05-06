import { Types } from 'mongoose';

export interface IAdmin {
  _id: Types.ObjectId | string; // Support both ObjectId and string
  id?: string; // Additional ID field that might be used in the API
  username: string;
  email: string;
  role: string;
  clinics?: (Types.ObjectId | string)[]; // Support both ObjectId and string
}