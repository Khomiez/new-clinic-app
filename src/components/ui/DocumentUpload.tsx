// src/components/ui/DocumentUpload.tsx - UPDATED: Handle temporary storage instead of immediate upload
"use client";

import React, { useState } from "react";
import FileUploader from "./FileUploader";
import { TemporaryFile } from "@/utils/temporaryFileStorage";

interface DocumentUploadProps {
  clinicId: string;
  patientId?: string;
  recordIndex: number; // NEW: Required for temporary storage
  onAddDocument: (tempFile: TemporaryFile) => void; // NEW: Changed signature
  onCancel: () => void;
}

export default function DocumentUpload({
  clinicId,
  patientId,
  recordIndex, // NEW: Track which record this file belongs to
  onAddDocument, // NEW: Now receives TemporaryFile instead of URL
  onCancel,
}: DocumentUploadProps) {
  const [error, setError] = useState<string | null>(null);

  // NEW: Handle temporary file addition instead of upload completion
  const handleFileAdded = (tempFile: TemporaryFile) => {
    setError(null);
    console.log('DocumentUpload: Received temporary file:', tempFile);
    onAddDocument(tempFile);
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
      <div className="mb-3">
        <h4 className="text-sm font-medium text-blue-700 mb-1">
          Add Document to Medical Record
        </h4>
        <p className="text-xs text-blue-500">
          Files will be stored temporarily and uploaded when you save changes.
        </p>
      </div>

      <FileUploader
        clinicId={clinicId}
        patientId={patientId}
        recordIndex={recordIndex} // NEW: Pass record index
        onFileAdded={handleFileAdded} // NEW: Changed from onUploadComplete
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