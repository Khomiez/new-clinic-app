import { Types } from "mongoose";

export interface IClinic {
  _id: Types.ObjectId;
  name: string;
  address: string;
  phone: string[];
  managerId: Types.ObjectId[];
}