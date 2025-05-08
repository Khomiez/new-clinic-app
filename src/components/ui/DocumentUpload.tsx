// src/components/ui/DocumentUpload.tsx
import React, { useState } from 'react';
import FileUploader from './FileUploader';

interface DocumentUploadProps {
  clinicId: string;
  patientId?: string;
  onAddDocument: (url: string) => void;
  onCancel: () => void;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({
  clinicId,
  patientId,
  onAddDocument,
  onCancel
}) => {
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const handleUploadComplete = (url: string) => {
    onAddDocument(url);
  };
  
  const handleUploadError = (error: string) => {
    setUploadError(error);
  };
  
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