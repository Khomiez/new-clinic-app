// src/redux/features/settings/settingsSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface SettingsState {
  selectedClinicId: string | null;
}

const initialState: SettingsState = {
  selectedClinicId: null
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setSelectedClinic: (state, action: PayloadAction<string | null>) => {
      state.selectedClinicId = action.payload;
    }
  }
});

export const { setSelectedClinic } = settingsSlice.actions;
export default settingsSlice.reducer;