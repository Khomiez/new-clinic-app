// redux/features/admin/adminSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

// Update the state interface to match your needs
interface AdminState {
  username: string | null;
  id?: string | null;
  managedClinics?: string[] | null;
  loading: 'idle' | 'pending' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: AdminState = {
  username: null,
  id: null,
  managedClinics: null,
  loading: 'idle',
  error: null
};

// Define proper types for your admin data response
interface AdminResponse {
  admin?: {
    _id: string;
    username: string;
    managedClinics?: Array<string | { toString(): string }>;
  };
  username?: string;
  _id?: string;
  managedClinics?: Array<string | { toString(): string }>;
}

// Create the async thunk properly
export const fetchAdminData = createAsyncThunk(
  'admin/fetchAdminData',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch admin data');
      }
      return await response.json() as AdminResponse;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const adminSlice = createSlice({
  name: "admin",
  initialState,
  reducers: {
    // Keep your existing action for backward compatibility
    setAdmin: (
      state,
      action: PayloadAction<{username: string;}>
    ) => {
      state.username = action.payload.username;
      state.loading = 'succeeded';
    },
    // Add a new action to set the complete admin data
    setAdminData: (
      state,
      action: PayloadAction<AdminResponse>
    ) => {
      // Handle nested admin object if it exists
      const adminData = action.payload.admin || action.payload;
      
      if (adminData.username) {
        state.username = adminData.username;
      }
      
      if (adminData._id) {
        state.id = adminData._id.toString();
      }
      
      if (adminData.managedClinics && adminData.managedClinics.length > 0) {
        state.managedClinics = adminData.managedClinics.map(id => 
          typeof id === 'string' ? id : id.toString());
      }
      
      state.loading = 'succeeded';
    },
    clearAdmin: (state) => {
      state.username = null;
      state.id = null;
      state.managedClinics = null;
      state.loading = 'idle';
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Properly handle the fetchAdminData async thunk
      .addCase(fetchAdminData.pending, (state) => {
        state.loading = 'pending';
      })
      .addCase(fetchAdminData.fulfilled, (state, action) => {
        // Handle nested admin object if it exists
        const adminData = action.payload.admin || action.payload;
        
        if (adminData.username) {
          state.username = adminData.username;
        }
        
        if (adminData._id) {
          state.id = adminData._id.toString();
        }
        
        if (adminData.managedClinics && adminData.managedClinics.length > 0) {
          state.managedClinics = adminData.managedClinics.map(id => 
            typeof id === 'string' ? id : id.toString());
        }
        
        state.loading = 'succeeded';
        state.error = null;
      })
      .addCase(fetchAdminData.rejected, (state, action) => {
        state.loading = 'failed';
        state.error = action.payload as string || 'Unknown error';
      });
  }
});

export const { setAdmin, setAdminData, clearAdmin } = adminSlice.actions;
export default adminSlice.reducer;