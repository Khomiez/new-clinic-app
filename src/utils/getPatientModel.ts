import mongoose, { Model } from 'mongoose';
import PatientSchema from '@/models/Patient';

// Define the Patient interface to match the schema
interface IPatientDocument extends mongoose.Document {
  name: string;
  HN_code: string;
  ID_code?: string;
  history?: Array<{
    timestamp?: Date;
    document_urls?: string[];
    notes?: string;
  }>;
  lastVisit?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// Type the return value properly to avoid union type issues
export function getPatientModelForClinic(clinicId: string): Model<IPatientDocument> {
  const modelName = `Patient_${clinicId}`;
  const collectionName = `patients_clinic_${clinicId}`;
  
  // If model already exists, return it with proper typing
  if (mongoose.models[modelName]) {
    return mongoose.models[modelName] as Model<IPatientDocument>;
  }

  // Otherwise, create it with proper typing
  return mongoose.model<IPatientDocument>(modelName, PatientSchema, collectionName);
}