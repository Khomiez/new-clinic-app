// src/redux/store.ts
import { configureStore } from '@reduxjs/toolkit';
import { ThunkAction, Action } from '@reduxjs/toolkit';
import patientsReducer from './features/patients/patientsSlice';
import clinicsReducer from './features/clinics/clinicsSlice';
import adminReducer from './features/admin/adminSlice';
import settingsReducer from './features/settings/settingsSlice';

const store = configureStore({
  reducer: {
    patients: patientsReducer,
    clinics: clinicsReducer,
    admin: adminReducer,
    settings: settingsReducer,
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
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;

export default store;