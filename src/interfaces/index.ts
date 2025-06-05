// src/interfaces/index.ts - Updated exports with address types
export * from './redux/states';
export * from './IAmin';
export * from './IClinic';
export * from './IHistoryRecord';
export * from './IPatient'; // This now includes IPatientAddress
export * from './IPagination';

// Re-export address interface for convenience
export type { IPatientAddress } from './IPatient';