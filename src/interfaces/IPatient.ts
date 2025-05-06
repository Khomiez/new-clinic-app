import { Types } from "mongoose";
import { IHistoryRecord } from "./IHistoryRecord";

export interface IPatient {
  _id: Types.ObjectId;
  name: string;
  HN_code: string;
  ID_code?: string;
  history?: IHistoryRecord[];
  lastVisit?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}