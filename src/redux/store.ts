// src/redux/store.ts
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
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore specific non-serializable paths
        ignoredPaths: [
          'patients.items',
          'clinics.items',
          'admin.data',
        ],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;