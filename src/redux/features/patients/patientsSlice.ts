// src/redux/features/patients/patientsSlice.ts - Updated with pagination support
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { IPatient } from '@/interfaces';
import { PaginatedResponse, PaginationParams } from '@/interfaces/IPagination';
import { toIdString } from '@/utils/mongoHelpers';
import { serializeData } from '@/redux/serialization';

interface PatientsState {
  items: IPatient[];
  currentPatient: IPatient | null;
  loading: 'idle' | 'pending' | 'succeeded' | 'failed';
  error: string | null;
  // Add pagination state
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;
  // Track current search and clinic
  currentSearch: string;
  currentClinicId: string | null;
}

const initialState: PatientsState = {
  items: [],
  currentPatient: null,
  loading: 'idle',
  error: null,
  pagination: null,
  currentSearch: '',
  currentClinicId: null,
};

// Fetch patients with pagination
export const fetchPatientsWithPagination = createAsyncThunk(
  'patients/fetchPatientsWithPagination',
  async (
    params: {
      clinicId: string;
      page?: number;
      limit?: number;
      search?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
    { rejectWithValue }
  ) => {
    try {
      const {
        clinicId,
        page = 1,
        limit = 10,
        search = '',
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = params;

      if (!clinicId) {
        throw new Error('Clinic ID is required');
      }

      // Build query parameters
      const searchParams = new URLSearchParams({
        clinicId,
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder,
      });

      if (search) {
        searchParams.append('search', search);
      }

      const response = await fetch(`/api/patient?${searchParams.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.error || 'Failed to fetch patients');
      }

      const data = await response.json();

      if (!data.success) {
        return rejectWithValue(data.error || 'Failed to fetch patients');
      }

      // Return the full response including pagination data
      return {
        patients: serializeData(data.data || []),
        pagination: data.pagination,
        search,
        clinicId,
      };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch patients');
    }
  }
);

// Search patients (just an alias for fetchPatientsWithPagination with search)
export const searchPatients = createAsyncThunk(
  'patients/searchPatients',
  async (
    params: {
      clinicId: string;
      search: string;
      page?: number;
      limit?: number;
    },
    { dispatch, rejectWithValue }
  ) => {
    try {
      // Use the existing fetchPatientsWithPagination action
      return await dispatch(
        fetchPatientsWithPagination({
          ...params,
          page: 1, // Reset to first page on search
        })
      ).unwrap();
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to search patients');
    }
  }
);

// Change page
export const changePage = createAsyncThunk(
  'patients/changePage',
  async (
    params: {
      clinicId: string;
      page: number;
    },
    { getState, dispatch, rejectWithValue }
  ) => {
    try {
      const state = getState() as { patients: PatientsState };
      const currentLimit = state.patients.pagination?.itemsPerPage || 10;
      const currentSearch = state.patients.currentSearch;

      // Use the existing fetchPatientsWithPagination action
      return await dispatch(
        fetchPatientsWithPagination({
          ...params,
          limit: currentLimit,
          search: currentSearch,
        })
      ).unwrap();
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to change page');
    }
  }
);

// Change page size
export const changePageSize = createAsyncThunk(
  'patients/changePageSize',
  async (
    params: {
      clinicId: string;
      limit: number;
    },
    { getState, dispatch, rejectWithValue }
  ) => {
    try {
      const state = getState() as { patients: PatientsState };
      const currentSearch = state.patients.currentSearch;

      // Use the existing fetchPatientsWithPagination action, reset to page 1
      return await dispatch(
        fetchPatientsWithPagination({
          ...params,
          page: 1,
          search: currentSearch,
        })
      ).unwrap();
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to change page size');
    }
  }
);

// Fetch patients by clinic ID (legacy - without pagination)
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

// Delete a patient with force delete option
export const deletePatient = createAsyncThunk(
  'patients/deletePatient',
  async ({ 
    clinicId, 
    patientId,
    forceDelete = false 
  }: { 
    clinicId: string, 
    patientId: string,
    forceDelete?: boolean 
  }, { rejectWithValue }) => {
    try {
      if (!clinicId || !patientId) {
        throw new Error('Clinic ID and Patient ID are required');
      }
      
      const url = new URL('/api/patient', window.location.origin);
      url.searchParams.append('clinicId', clinicId);
      url.searchParams.append('id', patientId);
      if (forceDelete) {
        url.searchParams.append('forceDelete', 'true');
      }
      
      const response = await fetch(url.toString(), {
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
      
      return { 
        patientId, 
        filesDeleted: data.filesDeleted || 0 
      };
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
      state.pagination = null;
      state.currentSearch = '';
      state.currentClinicId = null;
      state.loading = 'idle';
      state.error = null;
    },
    clearCurrentPatient: (state) => {
      state.currentPatient = null;
    },
    // Add reducer to update search term
    setSearchTerm: (state, action) => {
      state.currentSearch = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // Handle fetchPatientsWithPagination
      .addCase(fetchPatientsWithPagination.pending, (state) => {
        state.loading = 'pending';
        state.error = null;
      })
      .addCase(fetchPatientsWithPagination.fulfilled, (state, action) => {
        state.loading = 'succeeded';
        state.items = action.payload.patients;
        state.pagination = action.payload.pagination;
        state.currentSearch = action.payload.search;
        state.currentClinicId = action.payload.clinicId;
        state.error = null;
      })
      .addCase(fetchPatientsWithPagination.rejected, (state, action) => {
        state.loading = 'failed';
        state.error = action.payload as string || 'Failed to fetch patients';
      })

      // Handle searchPatients (same as fetchPatientsWithPagination)
      .addCase(searchPatients.pending, (state) => {
        state.loading = 'pending';
        state.error = null;
      })
      .addCase(searchPatients.fulfilled, (state, action) => {
        state.loading = 'succeeded';
        state.items = action.payload.patients;
        state.pagination = action.payload.pagination;
        state.currentSearch = action.payload.search;
        state.currentClinicId = action.payload.clinicId;
        state.error = null;
      })
      .addCase(searchPatients.rejected, (state, action) => {
        state.loading = 'failed';
        state.error = action.payload as string || 'Failed to search patients';
      })

      // Handle changePage (same as fetchPatientsWithPagination)
      .addCase(changePage.pending, (state) => {
        state.loading = 'pending';
        state.error = null;
      })
      .addCase(changePage.fulfilled, (state, action) => {
        state.loading = 'succeeded';
        state.items = action.payload.patients;
        state.pagination = action.payload.pagination;
        state.error = null;
      })
      .addCase(changePage.rejected, (state, action) => {
        state.loading = 'failed';
        state.error = action.payload as string || 'Failed to change page';
      })

      // Handle changePageSize (same as fetchPatientsWithPagination)
      .addCase(changePageSize.pending, (state) => {
        state.loading = 'pending';
        state.error = null;
      })
      .addCase(changePageSize.fulfilled, (state, action) => {
        state.loading = 'succeeded';
        state.items = action.payload.patients;
        state.pagination = action.payload.pagination;
        state.error = null;
      })
      .addCase(changePageSize.rejected, (state, action) => {
        state.loading = 'failed';
        state.error = action.payload as string || 'Failed to change page size';
      })
      
      // Handle fetchPatients (legacy - without pagination)
      .addCase(fetchPatients.pending, (state) => {
        state.loading = 'pending';
        state.error = null;
      })
      .addCase(fetchPatients.fulfilled, (state, action) => {
        state.loading = 'succeeded';
        state.items = action.payload;
        // Clear pagination when using legacy fetching
        state.pagination = null;
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
        // If we're using pagination, don't directly add to items array
        // Instead, we might want to refetch the current page
        if (!state.pagination) {
          state.items = [...state.items, action.payload];
        }
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
          patient => patient._id.toString() !== action.payload.patientId
        );
        // Update pagination totalItems if we have pagination
        if (state.pagination) {
          state.pagination.totalItems = Math.max(0, state.pagination.totalItems - 1);
          // Recalculate total pages
          state.pagination.totalPages = Math.ceil(state.pagination.totalItems / state.pagination.itemsPerPage);
          // If current page is now beyond total pages, we might need to go back a page
          if (state.pagination.currentPage > state.pagination.totalPages && state.pagination.totalPages > 0) {
            state.pagination.currentPage = state.pagination.totalPages;
          }
        }
        state.error = null;
      })
      .addCase(deletePatient.rejected, (state, action) => {
        state.loading = 'failed';
        state.error = action.payload as string || 'Failed to delete patient';
      });
  }
});

export const { clearPatients, clearCurrentPatient, setSearchTerm } = patientsSlice.actions;
export default patientsSlice.reducer;