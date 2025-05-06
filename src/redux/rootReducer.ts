import { combineReducers } from "redux";
import adminReducer from "@/redux/features/admin/adminSlice";
import clinicsReducer from "./features/clinics/clinicsSlice";
import patientsReducer from "./features/patients/patientsSlice";

const rootReducer = combineReducers({
    admin: adminReducer,
    clinics: clinicsReducer,
    patients: patientsReducer,
});

export default rootReducer;