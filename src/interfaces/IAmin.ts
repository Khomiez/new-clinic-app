import { Document, Types } from 'mongoose';
export interface IAdmin extends Document {
    username: string;
    password: string;
    managedClinics: Types.ObjectId[];
}