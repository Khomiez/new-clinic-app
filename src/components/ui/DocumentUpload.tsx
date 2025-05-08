// src/components/ui/DocumentUpload.tsx
import React, { useState } from 'react';
import FileUploader from './FileUploader';
import { useAppSelector } from '@/redux/hooks/useAppSelector';
import { toIdString } from '@/utils/mongoHelpers';

interface DocumentUploadProps {
  clinicId?: string; // Make it optional in the interface
  patientId?: string;
  onAddDocument: (url: string) => void;
  onCancel: () => void;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({
  clinicId: propClinicId, // Rename to avoid conflicts
  patientId,
  onAddDocument,
  onCancel
}) => {
  // Get clinic ID from Redux if not provided via props
  const selectedClinicId = useAppSelector(state => state.settings.selectedClinicId);
  
  // Use provided clinicId from props or fall back to the one from Redux
  const clinicId = propClinicId || selectedClinicId;
  
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const handleUploadComplete = (url: string) => {
    onAddDocument(url);
  };
  
  const handleUploadError = (error: string) => {
    setUploadError(error);
  };

  // Show error if no clinic ID is available
  if (!clinicId) {
    return (
      <div className="p-4 bg-white rounded-lg border border-red-100 shadow-sm">
        <div className="text-red-500 text-sm p-2 bg-red-50 rounded">
          Error: Please select a clinic before uploading documents.
        </div>
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
      <h3 className="text-md font-medium text-blue-700 mb-3">
        Add Document
      </h3>
      
      <FileUploader
        clinicId={clinicId}
        patientId={patientId}
        onUploadComplete={handleUploadComplete}
        onUploadError={handleUploadError}
        onCancel={onCancel}
      />
      
      {uploadError && (
        <div className="text-red-500 text-sm mt-2 p-2 bg-red-50 rounded">
          {uploadError}
        </div>
      )}
      
      <div className="flex justify-end space-x-2 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-blue-600 hover:text-blue-800 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default DocumentUpload;