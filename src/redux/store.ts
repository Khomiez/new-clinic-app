// redux/store.ts
import { configureStore } from '@reduxjs/toolkit';
import patientsReducer from './features/patients/patientsSlice';
import clinicsReducer from './features/clinics/clinicsSlice';
import adminReducer from './features/admin/adminSlice';

const store = configureStore({
  reducer: {
    patients: patientsReducer,
    clinics: clinicsReducer,
    admin: adminReducer,
  },
  // Configure middleware to ignore non-serializable values in specific paths
  // This is only needed during development while we transition to fully serialized state
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these specific paths in the state
        ignoredPaths: [
          'patients.items',
          'clinics.items',
          'admin.data',
        ],
        // Ignore these specific action paths
        ignoredActions: [
          'patients/fetchPatients/fulfilled',
          'patients/fetchPatientById/fulfilled',
          'patients/addPatient/fulfilled',
          'patients/updatePatient/fulfilled',
          'clinics/fetchClinics/fulfilled',
          'clinics/fetchClinicById/fulfilled',
          'clinics/addClinic/fulfilled',
          'clinics/updateClinic/fulfilled',
        ],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;