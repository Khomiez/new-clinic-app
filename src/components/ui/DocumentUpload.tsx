// src/components/ui/DocumentUpload.tsx - Simplified document upload wrapper
"use client";

import React, { useState } from "react";
import FileUploader from "./FileUploader";

interface DocumentUploadProps {
  clinicId: string;
  patientId?: string;
  onAddDocument: (url: string) => void;
  onCancel: () => void;
}

export default function DocumentUpload({
  clinicId,
  patientId,
  onAddDocument,
  onCancel,
}: DocumentUploadProps) {
  const [error, setError] = useState<string | null>(null);

  const handleUploadComplete = (url: string) => {
    setError(null);
    onAddDocument(url);
  };

  const handleUploadError = (errorMessage: string) => {
    setError(errorMessage);
  };

  if (!clinicId) {
    return (
      <div className="p-4 bg-red-50 rounded-lg border border-red-100">
        <p className="text-red-600 text-sm">
          Please select a clinic before uploading documents.
        </p>
        <div className="flex justify-end mt-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-blue-600 hover:text-blue-800 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-lg border border-blue-100 shadow-sm">
      <FileUploader
        clinicId={clinicId}
        patientId={patientId}
        onUploadComplete={handleUploadComplete}
        onUploadError={handleUploadError}
        onCancel={onCancel}
      />

      {error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}