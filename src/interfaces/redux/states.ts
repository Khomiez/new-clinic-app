// src/interfaces/redux/states.ts
import { IClinic } from '../IClinic';
import { IPatient } from '../IPatient';

export type LoadingState = 'idle' | 'pending' | 'succeeded' | 'failed';

export interface AdminState {
  id: string | null;
  username: string | null;
  email: string | null;
  role: string | null;
  managedClinics?: string[] | null;
  loading: LoadingState;
  error: string | null;
}

export interface ClinicsState {
  items: IClinic[];
  loading: LoadingState;
  error: string | null;
}

export interface PatientsState {
  items: IPatient[];
  currentPatient: IPatient | null;
  loading: LoadingState;
  error: string | null;
}