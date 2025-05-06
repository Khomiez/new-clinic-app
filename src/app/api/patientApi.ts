// api/patientApi.ts
import { Types } from 'mongoose';
import { IPatient } from '@/interfaces';
import { toIdString } from '@/utils/mongoHelpers';

/**
 * API module for patient-related operations with proper ObjectId handling
 */
export const PatientApi = {
  /**
   * Fetch all patients for a specific clinic
   */
  getPatients: async (clinicId: string | Types.ObjectId): Promise<IPatient[]> => {
    const clinicIdStr = toIdString(clinicId);
    
    if (!clinicIdStr) {
      throw new Error('Invalid clinic ID');
    }
    
    try {
      // Update endpoint from '/api/patients' to '/api/patient'
      const response = await fetch(`/api/patient?clinicId=${clinicIdStr}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch patients');
      }
      
      const data = await response.json();
      return data.patients || [];
    } catch (error) {
      console.error('API Error - getPatients:', error);
      throw error;
    }
  },
  
  /**
   * Fetch a single patient by ID
   */
  getPatientById: async (
    clinicId: string | Types.ObjectId, 
    patientId: string | Types.ObjectId
  ): Promise<IPatient> => {
    const clinicIdStr = toIdString(clinicId);
    const patientIdStr = toIdString(patientId);
    
    if (!clinicIdStr || !patientIdStr) {
      throw new Error('Invalid clinic or patient ID');
    }
    
    try {
      // Update endpoint from '/api/patients' to '/api/patient'
      const response = await fetch(`/api/patient?clinicId=${clinicIdStr}&id=${patientIdStr}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch patient');
      }
      
      const data = await response.json();
      return data.patient;
    } catch (error) {
      console.error('API Error - getPatientById:', error);
      throw error;
    }
  },
  
  /**
   * Create a new patient
   */
  createPatient: async (
    clinicId: string | Types.ObjectId, 
    patientData: Partial<IPatient>
  ): Promise<IPatient> => {
    const clinicIdStr = toIdString(clinicId);
    
    if (!clinicIdStr) {
      throw new Error('Invalid clinic ID');
    }
    
    try {
      // Update endpoint from '/api/patients' to '/api/patient'
      const response = await fetch(`/api/patient?clinicId=${clinicIdStr}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(patientData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create patient');
      }
      
      const data = await response.json();
      return data.patient;
    } catch (error) {
      console.error('API Error - createPatient:', error);
      throw error;
    }
  },
  
  /**
   * Update an existing patient
   */
  updatePatient: async (
    clinicId: string | Types.ObjectId, 
    patientId: string | Types.ObjectId, 
    patientData: Partial<IPatient>
  ): Promise<IPatient> => {
    const clinicIdStr = toIdString(clinicId);
    const patientIdStr = toIdString(patientId);
    
    if (!clinicIdStr || !patientIdStr) {
      throw new Error('Invalid clinic or patient ID');
    }
    
    try {
      // Update endpoint from '/api/patients' to '/api/patient'
      const response = await fetch(`/api/patient?clinicId=${clinicIdStr}&id=${patientIdStr}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(patientData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update patient');
      }
      
      const data = await response.json();
      return data.patient;
    } catch (error) {
      console.error('API Error - updatePatient:', error);
      throw error;
    }
  },
  
  /**
   * Delete a patient
   */
  deletePatient: async (
    clinicId: string | Types.ObjectId, 
    patientId: string | Types.ObjectId
  ): Promise<string> => {
    const clinicIdStr = toIdString(clinicId);
    const patientIdStr = toIdString(patientId);
    
    if (!clinicIdStr || !patientIdStr) {
      throw new Error('Invalid clinic or patient ID');
    }
    
    try {
      // Update endpoint from '/api/patients' to '/api/patient'
      const response = await fetch(`/api/patient?clinicId=${clinicIdStr}&id=${patientIdStr}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete patient');
      }
      
      return patientIdStr;
    } catch (error) {
      console.error('API Error - deletePatient:', error);
      throw error;
    }
  }
};