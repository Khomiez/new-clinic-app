"use client";

import { Suspense } from "react";
import AddPatientContent from "./AddPatientContent";
import LoadingScreen from "@/components/ui/LoadingScreen";

export default function AddPatientWrapper() {
  return (
    <Suspense fallback={<LoadingScreen pageName="Add Patient" />}>
      <AddPatientContent />
    </Suspense>
  );
}
