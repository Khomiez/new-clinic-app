// src/interfaces/IPatient.ts
import { Types } from "mongoose";
import { IHistoryRecord } from "./IHistoryRecord";

export interface IPatient {
  _id: Types.ObjectId | string;
  name: string;
  HN_code: string;
  ID_code?: string;
  history?: IHistoryRecord[];
  lastVisit?: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}