import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { IClinic } from '@/interfaces';
import { serializeData, prepareForApiSubmission } from '@/redux/serialization';
import { toIdString } from '@/utils/mongoHelpers';

interface ClinicsState {
  items: IClinic[];
  loading: 'idle' | 'pending' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: ClinicsState = {
  items: [],
  loading: 'idle',
  error: null
};

// Thunk to fetch clinics by admin ID
export const fetchClinics = createAsyncThunk(
  'clinics/fetchClinics',
  async (adminId: string, { rejectWithValue }) => {
    try {
      if (!adminId) {
        throw new Error('Admin ID is required');
      }

      console.log(`Fetching clinics for admin ID: ${adminId}`);
      
      const response = await fetch(`/api/clinics?adminId=${adminId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.error || 'Failed to fetch clinics');
      }
      
      const data = await response.json();
      
      // Serialize the data to ensure all ObjectIds are converted to strings
      // This is critical for Redux which requires serializable state
      return serializeData(data.clinics || []);
    } catch (error) {
      console.error('Error fetching clinics:', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch clinics');
    }
  }
);

// Thunk to fetch a single clinic by ID
export const fetchClinicById = createAsyncThunk(
  'clinics/fetchClinicById',
  async (clinicId: string, { rejectWithValue }) => {
    try {
      if (!clinicId) {
        throw new Error('Clinic ID is required');
      }
      
      const response = await fetch(`/api/clinics/${clinicId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.error || 'Failed to fetch clinic');
      }
      
      const data = await response.json();
      
      // Serialize the clinic data to ensure all ObjectIds are strings
      return serializeData(data.clinic);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch clinic');
    }
  }
);

// Thunk to add a new clinic
export const addClinic = createAsyncThunk(
  'clinics/addClinic',
  async (clinicData: Partial<IClinic>, { rejectWithValue }) => {
    try {
      // Prepare data for API by serializing ObjectIds and dates
      const serializedData = prepareForApiSubmission(clinicData);
      
      const response = await fetch('/api/clinics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(serializedData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.error || 'Failed to add clinic');
      }
      
      const data = await response.json();
      
      // Serialize the response to ensure all ObjectIds are strings
      return serializeData(data.clinic);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to add clinic');
    }
  }
);

// Thunk to update an existing clinic
export const updateClinic = createAsyncThunk(
  'clinics/updateClinic',
  async ({ 
    clinicId, 
    clinicData 
  }: { 
    clinicId: string, 
    clinicData: Partial<IClinic> 
  }, { rejectWithValue }) => {
    try {
      if (!clinicId) {
        throw new Error('Clinic ID is required');
      }
      
      // Prepare data for API by serializing ObjectIds and dates
      const serializedData = prepareForApiSubmission(clinicData);
      
      const response = await fetch(`/api/clinics/${clinicId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(serializedData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.error || 'Failed to update clinic');
      }
      
      const data = await response.json();
      
      // Serialize the response to ensure all ObjectIds are strings
      return serializeData(data.clinic);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update clinic');
    }
  }
);

// Thunk to delete a clinic
export const deleteClinic = createAsyncThunk(
  'clinics/deleteClinic',
  async (clinicId: string, { rejectWithValue }) => {
    try {
      if (!clinicId) {
        throw new Error('Clinic ID is required');
      }
      
      const response = await fetch(`/api/clinics/${clinicId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.error || 'Failed to delete clinic');
      }
      
      return clinicId; // Return the deleted clinic ID for state updates
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete clinic');
    }
  }
);

const clinicsSlice = createSlice({
  name: 'clinics',
  initialState,
  reducers: {
    clearClinics: (state) => {
      state.items = [];
      state.loading = 'idle';
    }
  },
  extraReducers: (builder) => {
    builder
      // Handle fetchClinics
      .addCase(fetchClinics.pending, (state) => {
        state.loading = 'pending';
        state.error = null;
      })
      .addCase(fetchClinics.fulfilled, (state, action) => {
        state.loading = 'succeeded';
        state.items = action.payload;
        state.error = null;
      })
      .addCase(fetchClinics.rejected, (state, action) => {
        state.loading = 'failed';
        state.error = action.payload as string || 'Failed to fetch clinics';
      })
      
      // Handle fetchClinicById
      .addCase(fetchClinicById.pending, (state) => {
        state.loading = 'pending';
        state.error = null;
      })
      .addCase(fetchClinicById.fulfilled, (state, action) => {
        state.loading = 'succeeded';
        // If the clinic is not already in the items array, add it
        const existingIndex = state.items.findIndex(clinic => 
          toIdString(clinic._id) === toIdString(action.payload._id)
        );
        
        if (existingIndex >= 0) {
          state.items[existingIndex] = action.payload;
        } else {
          state.items.push(action.payload);
        }
        
        state.error = null;
      })
      .addCase(fetchClinicById.rejected, (state, action) => {
        state.loading = 'failed';
        state.error = action.payload as string || 'Failed to fetch clinic details';
      })
      
      // Handle addClinic
      .addCase(addClinic.pending, (state) => {
        state.loading = 'pending';
        state.error = null;
      })
      .addCase(addClinic.fulfilled, (state, action) => {
        state.loading = 'succeeded';
        state.items.push(action.payload);
        state.error = null;
      })
      .addCase(addClinic.rejected, (state, action) => {
        state.loading = 'failed';
        state.error = action.payload as string || 'Failed to add clinic';
      })
      
      // Handle updateClinic
      .addCase(updateClinic.pending, (state) => {
        state.loading = 'pending';
        state.error = null;
      })
      .addCase(updateClinic.fulfilled, (state, action) => {
        state.loading = 'succeeded';
        // Update in the items array
        state.items = state.items.map(clinic => 
          toIdString(clinic._id) === toIdString(action.payload._id) 
            ? action.payload 
            : clinic
        );
        state.error = null;
      })
      .addCase(updateClinic.rejected, (state, action) => {
        state.loading = 'failed';
        state.error = action.payload as string || 'Failed to update clinic';
      })
      
      // Handle deleteClinic
      .addCase(deleteClinic.pending, (state) => {
        state.loading = 'pending';
        state.error = null;
      })
      .addCase(deleteClinic.fulfilled, (state, action) => {
        state.loading = 'succeeded';
        // Remove the deleted clinic from items array
        state.items = state.items.filter(
          clinic => toIdString(clinic._id) !== action.payload
        );
        state.error = null;
      })
      .addCase(deleteClinic.rejected, (state, action) => {
        state.loading = 'failed';
        state.error = action.payload as string || 'Failed to delete clinic';
      });
  }
});

export const { clearClinics } = clinicsSlice.actions;
export default clinicsSlice.reducer;