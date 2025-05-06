import mongoose from 'mongoose';
import {Patient}  from '@/models';

export function getPatientModelForClinic(clinicId: string) {
  const modelName = `Patient_${clinicId}`;
  
  // If model already exists, return it
  if (mongoose.models[modelName]) {
    return mongoose.models[modelName];
  }

  // Otherwise, create it
  return mongoose.model(modelName, Patient, `patients_${clinicId}`);
}