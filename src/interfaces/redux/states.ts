import { IClinic } from '../IClinic';
import { IPatient } from '../IPatient';

export interface AdminState {
  id: string | null;
  username: string | null;
  email: string | null;
  role: string | null;
  loading: 'idle' | 'pending' | 'succeeded' | 'failed';
  error: string | null;
}

export interface ClinicsState {
  items: IClinic[];
  loading: 'idle' | 'pending' | 'succeeded' | 'failed';
  error: string | null;
}

export interface PatientsState {
  items: IPatient[];
  currentPatient: IPatient | null;
  loading: 'idle' | 'pending' | 'succeeded' | 'failed';
  error: string | null;
}