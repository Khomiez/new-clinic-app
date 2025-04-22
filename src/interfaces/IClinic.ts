import { Document, Types } from 'mongoose';
export interface IClinic extends Document {
    name: string;
    address: string;
    phone: string;
    managerId: Types.ObjectId[];
}