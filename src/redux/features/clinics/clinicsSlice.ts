// src/redux/features/clinics/clinicsSlice.ts
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { IClinic } from "@/interfaces";
import { serializeData } from "@/redux/serialization";

interface ClinicsState {
  items: IClinic[];
  loading: "idle" | "pending" | "succeeded" | "failed";
  error: string | null;
}

const initialState: ClinicsState = {
  items: [],
  loading: "idle",
  error: null,
};

// Thunk to fetch clinics by admin ID
export const fetchClinics = createAsyncThunk(
  "clinics/fetchClinics",
  async (adminId: string, { rejectWithValue }) => {
    try {
      if (!adminId) {
        throw new Error("Admin ID is required");
      }

      const response = await fetch(`/api/clinic?adminId=${adminId}`);

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.error || "Failed to fetch clinics");
      }

      const data = await response.json();

      if (!data.success) {
        return rejectWithValue(data.error || "Failed to fetch clinics");
      }

      return serializeData(data.clinics || []);
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch clinics");
    }
  }
);

// Thunk to fetch a single clinic by ID
export const fetchClinicById = createAsyncThunk(
  "clinics/fetchClinicById",
  async (clinicId: string, { rejectWithValue }) => {
    try {
      if (!clinicId) {
        throw new Error("Clinic ID is required");
      }

      const response = await fetch(`/api/clinic?id=${clinicId}`);

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.error || "Failed to fetch clinic");
      }

      const data = await response.json();

      if (!data.success) {
        return rejectWithValue(data.error || "Failed to fetch clinic");
      }

      return serializeData(data.clinic);
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch clinic");
    }
  }
);

// Thunk to add a new clinic
export const addClinic = createAsyncThunk(
  "clinics/addClinic",
  async (clinicData: Partial<IClinic>, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/clinic", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(clinicData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.error || "Failed to add clinic");
      }

      const data = await response.json();

      if (!data.success) {
        return rejectWithValue(data.error || "Failed to add clinic");
      }

      return serializeData(data.clinic);
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to add clinic");
    }
  }
);

// Thunk to update an existing clinic
export const updateClinic = createAsyncThunk(
  "clinics/updateClinic",
  async (
    {
      clinicId,
      clinicData,
    }: {
      clinicId: string;
      clinicData: Partial<IClinic>;
    },
    { rejectWithValue }
  ) => {
    try {
      if (!clinicId) {
        throw new Error("Clinic ID is required");
      }

      const response = await fetch(`/api/clinic?id=${clinicId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(clinicData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.error || "Failed to update clinic");
      }

      const data = await response.json();

      if (!data.success) {
        return rejectWithValue(data.error || "Failed to update clinic");
      }

      return serializeData(data.clinic);
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to update clinic");
    }
  }
);

// Thunk to delete a clinic
export const deleteClinic = createAsyncThunk(
  "clinics/deleteClinic",
  async (clinicId: string, { rejectWithValue }) => {
    try {
      if (!clinicId) {
        throw new Error("Clinic ID is required");
      }

      const response = await fetch(`/api/clinic?id=${clinicId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.error || "Failed to delete clinic");
      }

      const data = await response.json();

      if (!data.success) {
        return rejectWithValue(data.error || "Failed to delete clinic");
      }

      return clinicId; // Return the deleted clinic ID for state updates
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to delete clinic");
    }
  }
);

const clinicsSlice = createSlice({
  name: "clinics",
  initialState,
  reducers: {
    clearClinics: (state) => {
      state.items = [];
      state.loading = "idle";
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Handle fetchClinics
      .addCase(fetchClinics.pending, (state) => {
        state.loading = "pending";
        state.error = null;
      })
      .addCase(fetchClinics.fulfilled, (state, action) => {
        state.loading = "succeeded";
        state.items = action.payload;
        state.error = null;
      })
      .addCase(fetchClinics.rejected, (state, action) => {
        state.loading = "failed";
        state.error = (action.payload as string) || "Failed to fetch clinics";
      })

      // Handle fetchClinicById
      .addCase(fetchClinicById.pending, (state) => {
        state.loading = "pending";
        state.error = null;
      })
      .addCase(fetchClinicById.fulfilled, (state, action) => {
        state.loading = "succeeded";

        // If the clinic is not already in the items array, add it
        const existingIndex = state.items.findIndex(
          (clinic) => clinic._id.toString() === action.payload._id.toString()
        );

        if (existingIndex >= 0) {
          state.items[existingIndex] = action.payload;
        } else {
          state.items.push(action.payload);
        }

        state.error = null;
      })
      .addCase(fetchClinicById.rejected, (state, action) => {
        state.loading = "failed";
        state.error =
          (action.payload as string) || "Failed to fetch clinic details";
      })

      // Handle addClinic
      .addCase(addClinic.pending, (state) => {
        state.loading = "pending";
        state.error = null;
      })
      .addCase(addClinic.fulfilled, (state, action) => {
        state.loading = "succeeded";
        state.items.push(action.payload);
        state.error = null;
      })
      .addCase(addClinic.rejected, (state, action) => {
        state.loading = "failed";
        state.error = (action.payload as string) || "Failed to add clinic";
      })

      // Handle updateClinic
      .addCase(updateClinic.pending, (state) => {
        state.loading = "pending";
        state.error = null;
      })
      .addCase(updateClinic.fulfilled, (state, action) => {
        state.loading = "succeeded";

        // Update in the items array
        state.items = state.items.map((clinic) =>
          clinic._id.toString() === action.payload._id.toString()
            ? action.payload
            : clinic
        );

        state.error = null;
      })
      .addCase(updateClinic.rejected, (state, action) => {
        state.loading = "failed";
        state.error = (action.payload as string) || "Failed to update clinic";
      })

      // Handle deleteClinic
      .addCase(deleteClinic.pending, (state) => {
        state.loading = "pending";
        state.error = null;
      })
      .addCase(deleteClinic.fulfilled, (state, action) => {
        state.loading = "succeeded";

        // Remove the deleted clinic from items array
        state.items = state.items.filter(
          (clinic) => clinic._id.toString() !== action.payload
        );

        state.error = null;
      })
      .addCase(deleteClinic.rejected, (state, action) => {
        state.loading = "failed";
        state.error = (action.payload as string) || "Failed to delete clinic";
      });
  },
});

export const { clearClinics } = clinicsSlice.actions;
export default clinicsSlice.reducer;
