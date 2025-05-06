// src/redux/features/admin/adminSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { AdminState } from "@/interfaces/redux/states";
import { serializeData } from "@/redux/serialization";

const initialState: AdminState = {
  id: null,
  username: null,
  email: null,
  role: null,
  managedClinics: null,
  loading: 'idle',
  error: null
};

// Fetch admin data
export const fetchAdminData = createAsyncThunk(
  'admin/fetchAdminData',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/auth/me');
      
      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.error || 'Failed to fetch admin data');
      }
      
      const data = await response.json();
      
      if (!data.success && !data.admin) {
        return rejectWithValue(data.error || 'Failed to fetch admin data');
      }
      
      return serializeData(data.admin || data);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch admin data');
    }
  }
);

const adminSlice = createSlice({
  name: "admin",
  initialState,
  reducers: {
    setAdminData: (state, action: PayloadAction<any>) => {
      // Handle nested admin object if it exists
      const adminData = action.payload.admin || action.payload;
      
      if (adminData._id) {
        state.id = adminData._id.toString();
      }
      
      if (adminData.username) {
        state.username = adminData.username;
      }
      
      if (adminData.email) {
        state.email = adminData.email;
      }
      
      if (adminData.role) {
        state.role = adminData.role;
      }
      
      if (adminData.managedClinics && adminData.managedClinics.length > 0) {
        state.managedClinics = adminData.managedClinics.map((id: any) => 
          typeof id === 'string' ? id : id.toString());
      }
      
      state.loading = 'succeeded';
      state.error = null;
    },
    clearAdmin: (state) => {
      state.id = null;
      state.username = null;
      state.email = null;
      state.role = null;
      state.managedClinics = null;
      state.loading = 'idle';
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminData.pending, (state) => {
        state.loading = 'pending';
        state.error = null;
      })
      .addCase(fetchAdminData.fulfilled, (state, action) => {
        // Handle nested admin object if it exists
        const adminData = action.payload.admin || action.payload;
        
        if (adminData._id) {
          state.id = adminData._id.toString();
        }
        
        if (adminData.username) {
          state.username = adminData.username;
        }
        
        if (adminData.email) {
          state.email = adminData.email;
        }
        
        if (adminData.role) {
          state.role = adminData.role;
        }
        
        if (adminData.managedClinics && adminData.managedClinics.length > 0) {
          state.managedClinics = adminData.managedClinics.map((id: any) => 
            typeof id === 'string' ? id : id.toString());
        }
        
        state.loading = 'succeeded';
        state.error = null;
      })
      .addCase(fetchAdminData.rejected, (state, action) => {
        state.loading = 'failed';
        state.error = action.payload as string || 'Failed to fetch admin data';
      });
  }
});

export const { setAdminData, clearAdmin } = adminSlice.actions;
export default adminSlice.reducer;