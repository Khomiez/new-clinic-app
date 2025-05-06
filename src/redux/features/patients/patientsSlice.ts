import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { IPatient } from '@/interfaces';
import { toIdString } from '@/utils/mongoHelpers';
import { serializeData, prepareForApiSubmission } from '@/redux/serialization';
import { Types } from 'mongoose';

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

// Thunk to fetch patients by clinic ID
export const fetchPatients = createAsyncThunk(
  'patients/fetchPatients',
  async (clinicId: string | Types.ObjectId, { rejectWithValue }) => {
    try {
      // Convert ObjectId to string if needed
      const clinicIdStr = toIdString(clinicId);
      
      // Ensure clinicId is valid before making request
      if (!clinicIdStr) {
        throw new Error('Invalid clinic ID');
      }
      
      console.log(`Fetching patients for clinic ID: ${clinicIdStr}`);
      // Use the correct API endpoint
      const response = await fetch(`/api/patient?clinicId=${clinicIdStr}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.error || 'Failed to fetch patients');
      }
      
      const data = await response.json();
      
      // Serialize the data to ensure all ObjectIds are converted to strings
      // This is critical for Redux which requires serializable state
      return serializeData(data.patients || []); 
    } catch (error) {
      console.error('Error fetching patients:', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch patients');
    }
  }
);

// Thunk to fetch a single patient by ID
export const fetchPatientById = createAsyncThunk(
  'patients/fetchPatientById',
  async ({ 
    clinicId, 
    patientId 
  }: { 
    clinicId: string | Types.ObjectId, 
    patientId: string | Types.ObjectId 
  }, { rejectWithValue }) => {
    try {
      const clinicIdStr = toIdString(clinicId);
      const patientIdStr = toIdString(patientId);
      
      if (!clinicIdStr || !patientIdStr) {
        throw new Error('Invalid clinic or patient ID');
      }
      
      const response = await fetch(`/api/patient?clinicId=${clinicIdStr}&id=${patientIdStr}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.error || 'Failed to fetch patient');
      }
      
      const data = await response.json();
      
      // Serialize the patient data to ensure all ObjectIds are strings
      return serializeData(data.patient);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch patient');
    }
  }
);

// Thunk to add a new patient
export const addPatient = createAsyncThunk(
  'patients/addPatient',
  async ({ 
    clinicId, 
    patientData 
  }: { 
    clinicId: string | Types.ObjectId, 
    patientData: Partial<IPatient> 
  }, { rejectWithValue }) => {
    try {
      const clinicIdStr = toIdString(clinicId);
      
      if (!clinicIdStr) {
        throw new Error('Invalid clinic ID');
      }
      
      // Prepare data for API by serializing ObjectIds and dates
      const serializedData = prepareForApiSubmission(patientData);
      
      const response = await fetch(`/api/patient?clinicId=${clinicIdStr}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(serializedData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.error || 'Failed to add patient');
      }
      
      const data = await response.json();
      
      // Serialize the response to ensure all ObjectIds are strings
      return serializeData(data.patient);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to add patient');
    }
  }
);

// Thunk to update an existing patient
export const updatePatient = createAsyncThunk(
  'patients/updatePatient',
  async ({ 
    clinicId, 
    patientId, 
    patientData 
  }: { 
    clinicId: string | Types.ObjectId, 
    patientId: string | Types.ObjectId, 
    patientData: Partial<IPatient> 
  }, { rejectWithValue }) => {
    try {
      const clinicIdStr = toIdString(clinicId);
      const patientIdStr = toIdString(patientId);
      
      if (!clinicIdStr || !patientIdStr) {
        throw new Error('Invalid clinic or patient ID');
      }
      
      // Prepare data for API by serializing ObjectIds and dates
      const serializedData = prepareForApiSubmission(patientData);
      
      const response = await fetch(`/api/patient?clinicId=${clinicIdStr}&id=${patientIdStr}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(serializedData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.error || 'Failed to update patient');
      }
      
      const data = await response.json();
      
      // Serialize the response to ensure all ObjectIds are strings
      return serializeData(data.patient);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update patient');
    }
  }
);

// Thunk to delete a patient
export const deletePatient = createAsyncThunk(
  'patients/deletePatient',
  async ({ 
    clinicId, 
    patientId 
  }: { 
    clinicId: string | Types.ObjectId, 
    patientId: string | Types.ObjectId 
  }, { rejectWithValue }) => {
    try {
      const clinicIdStr = toIdString(clinicId);
      const patientIdStr = toIdString(patientId);
      
      if (!clinicIdStr || !patientIdStr) {
        throw new Error('Invalid clinic or patient ID');
      }
      
      const response = await fetch(`/api/patient?clinicId=${clinicIdStr}&id=${patientIdStr}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.error || 'Failed to delete patient');
      }
      
      return patientIdStr; // Return the deleted patient ID for state updates
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete patient');
    }
  }
);

const patientsSlice = createSlice({
  name: 'patients',
  initialState,
  reducers: {
    clearPatients: (state) => {
      state.items = [];
      state.loading = 'idle';
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
        if (state.items.length > 0) {
          state.items = state.items.map(patient => 
            patient._id.toString() === action.payload._id.toString() 
              ? action.payload 
              : patient
          );
        }
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