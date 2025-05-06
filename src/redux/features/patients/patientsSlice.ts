// src/redux/features/patients/patientsSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { IPatient } from '@/interfaces';
import { toIdString } from '@/utils/mongoHelpers';
import { serializeData } from '@/redux/serialization';

interface PatientsState {
  items: IPatient[];
  currentPatient: IPatient | null;
  loading: 'idle' | 'pending' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: PatientsState = {
  items: [],
  currentPatient: null,
  loading: 'idle',
  error: null
};

// Fetch patients by clinic ID
export const fetchPatients = createAsyncThunk(
  'patients/fetchPatients',
  async (clinicId: string, { rejectWithValue }) => {
    try {
      if (!clinicId) {
        throw new Error('Clinic ID is required');
      }
      
      const response = await fetch(`/api/patient?clinicId=${clinicId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.error || 'Failed to fetch patients');
      }
      
      const data = await response.json();
      
      if (!data.success) {
        return rejectWithValue(data.error || 'Failed to fetch patients');
      }
      
      return serializeData(data.patients || []);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch patients');
    }
  }
);

// Fetch a single patient by ID
export const fetchPatientById = createAsyncThunk(
  'patients/fetchPatientById',
  async ({ 
    clinicId, 
    patientId 
  }: { 
    clinicId: string, 
    patientId: string 
  }, { rejectWithValue }) => {
    try {
      if (!clinicId || !patientId) {
        throw new Error('Clinic ID and Patient ID are required');
      }
      
      const response = await fetch(`/api/patient?clinicId=${clinicId}&id=${patientId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.error || 'Failed to fetch patient');
      }
      
      const data = await response.json();
      
      if (!data.success) {
        return rejectWithValue(data.error || 'Failed to fetch patient');
      }
      
      return serializeData(data.patient);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch patient');
    }
  }
);

// Add a new patient
export const addPatient = createAsyncThunk(
  'patients/addPatient',
  async ({ 
    clinicId, 
    patientData 
  }: { 
    clinicId: string, 
    patientData: Partial<IPatient> 
  }, { rejectWithValue }) => {
    try {
      if (!clinicId) {
        throw new Error('Clinic ID is required');
      }
      
      const response = await fetch(`/api/patient?clinicId=${clinicId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(patientData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.error || 'Failed to add patient');
      }
      
      const data = await response.json();
      
      if (!data.success) {
        return rejectWithValue(data.error || 'Failed to add patient');
      }
      
      return serializeData(data.patient);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to add patient');
    }
  }
);

// Update an existing patient
export const updatePatient = createAsyncThunk(
  'patients/updatePatient',
  async ({ 
    clinicId, 
    patientId, 
    patientData 
  }: { 
    clinicId: string, 
    patientId: string, 
    patientData: Partial<IPatient> 
  }, { rejectWithValue }) => {
    try {
      if (!clinicId || !patientId) {
        throw new Error('Clinic ID and Patient ID are required');
      }
      
      const response = await fetch(`/api/patient?clinicId=${clinicId}&id=${patientId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(patientData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.error || 'Failed to update patient');
      }
      
      const data = await response.json();
      
      if (!data.success) {
        return rejectWithValue(data.error || 'Failed to update patient');
      }
      
      return serializeData(data.patient);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update patient');
    }
  }
);

// Delete a patient
export const deletePatient = createAsyncThunk(
  'patients/deletePatient',
  async ({ 
    clinicId, 
    patientId 
  }: { 
    clinicId: string, 
    patientId: string 
  }, { rejectWithValue }) => {
    try {
      if (!clinicId || !patientId) {
        throw new Error('Clinic ID and Patient ID are required');
      }
      
      const response = await fetch(`/api/patient?clinicId=${clinicId}&id=${patientId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.error || 'Failed to delete patient');
      }
      
      const data = await response.json();
      
      if (!data.success) {
        return rejectWithValue(data.error || 'Failed to delete patient');
      }
      
      return patientId; // Return the deleted patient ID for state updates
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete patient');
    }
  }
);

const patientsSlice = createSlice({
  name: 'patients',
  initialState,
  reducers: {
    clearPatients: (state) => {
      state.items = [];
      state.currentPatient = null;
      state.loading = 'idle';
      state.error = null;
    },
    clearCurrentPatient: (state) => {
      state.currentPatient = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Handle fetchPatients
      .addCase(fetchPatients.pending, (state) => {
        state.loading = 'pending';
        state.error = null;
      })
      .addCase(fetchPatients.fulfilled, (state, action) => {
        state.loading = 'succeeded';
        state.items = action.payload;
        state.error = null;
      })
      .addCase(fetchPatients.rejected, (state, action) => {
        state.loading = 'failed';
        state.error = action.payload as string || 'Failed to fetch patients';
      })
      
      // Handle fetchPatientById
      .addCase(fetchPatientById.pending, (state) => {
        state.loading = 'pending';
        state.error = null;
      })
      .addCase(fetchPatientById.fulfilled, (state, action) => {
        state.loading = 'succeeded';
        state.currentPatient = action.payload;
        state.error = null;
      })
      .addCase(fetchPatientById.rejected, (state, action) => {
        state.loading = 'failed';
        state.error = action.payload as string || 'Failed to fetch patient details';
      })
      
      // Handle addPatient
      .addCase(addPatient.pending, (state) => {
        state.loading = 'pending';
        state.error = null;
      })
      .addCase(addPatient.fulfilled, (state, action) => {
        state.loading = 'succeeded';
        state.items = [...state.items, action.payload];
        state.error = null;
      })
      .addCase(addPatient.rejected, (state, action) => {
        state.loading = 'failed';
        state.error = action.payload as string || 'Failed to add patient';
      })
      
      // Handle updatePatient
      .addCase(updatePatient.pending, (state) => {
        state.loading = 'pending';
        state.error = null;
      })
      .addCase(updatePatient.fulfilled, (state, action) => {
        state.loading = 'succeeded';
        state.currentPatient = action.payload;
        // Also update in the items array if it exists
        state.items = state.items.map(patient => 
          patient._id.toString() === action.payload._id.toString() 
            ? action.payload 
            : patient
        );
        state.error = null;
      })
      .addCase(updatePatient.rejected, (state, action) => {
        state.loading = 'failed';
        state.error = action.payload as string || 'Failed to update patient';
      })
      
      // Handle deletePatient
      .addCase(deletePatient.pending, (state) => {
        state.loading = 'pending';
        state.error = null;
      })
      .addCase(deletePatient.fulfilled, (state, action) => {
        state.loading = 'succeeded';
        // Remove the deleted patient from items array
        state.items = state.items.filter(
          patient => patient._id.toString() !== action.payload
        );
        state.error = null;
      })
      .addCase(deletePatient.rejected, (state, action) => {
        state.loading = 'failed';
        state.error = action.payload as string || 'Failed to delete patient';
      });
  }
});

export const { clearPatients, clearCurrentPatient } = patientsSlice.actions;
export default patientsSlice.reducer;