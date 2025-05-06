import { useDispatch } from "react-redux";
import type { AppDispatch } from "@/redux/store";
import { ThunkDispatch } from "redux-thunk";
import { AnyAction } from "redux";
import { RootState } from "@/redux/store";

export const useAppDispatch = () => useDispatch<ThunkDispatch<RootState, undefined, AnyAction>>();