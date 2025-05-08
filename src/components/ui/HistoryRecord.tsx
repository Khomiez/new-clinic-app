// src/components/ui/HistoryRecord.tsx
import React, { useState } from "react";
import { IHistoryRecord } from "@/interfaces";
import FileUploader from "./FileUploader";

interface HistoryRecordProps {
  record: IHistoryRecord;
  index: number;
  clinicId?: string; // Make it optional with ?
  patientId: string;
  onRemove: (index: number) => void;
  onUpdateDate: (index: number, newDate: Date) => void;
  onAddDocument: (index: number, url: string) => void;
  onRemoveDocument: (recordIndex: number, documentIndex: number) => void;
}

const HistoryRecord: React.FC<HistoryRecordProps> = ({
  record,
  index,
  clinicId,
  patientId,
  onRemove,
  onUpdateDate,
  onAddDocument,
  onRemoveDocument,
}) => {
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [dateValue, setDateValue] = useState(
    record.timestamp instanceof Date
      ? record.timestamp.toISOString().split("T")[0]
      : new Date(record.timestamp).toISOString().split("T")[0]
  );
  const [isAddingDocument, setIsAddingDocument] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Format the date nicely
  const formatDate = (dateString: string | Date): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateValue(e.target.value);
  };

  const handleDateSubmit = () => {
    onUpdateDate(index, new Date(dateValue));
    setIsEditingDate(false);
  };

  const handleUploadComplete = (url: string) => {
    onAddDocument(index, url);
    setIsAddingDocument(false);
    setUploadError(null);
  };

  const handleUploadError = (error: string) => {
    setUploadError(error);
  };

  // Extract filename from URL
  const getFilenameFromUrl = (url: string): string => {
    return url.split("/").pop() || `Document`;
  };

  // Determine file type icon based on extension
  const getFileIcon = (url: string): string => {
    if (url.endsWith(".pdf")) return "📕";
    if (url.endsWith(".jpg") || url.endsWith(".png") || url.endsWith(".jpeg"))
      return "🖼️";
    if (url.endsWith(".docx") || url.endsWith(".doc")) return "📝";
    return "📄"; // Default document icon
  };

  const handleAddDocumentClick = () => {
    if (!clinicId) {
      setUploadError(
        "No clinic selected. Please select a clinic before uploading documents."
      );
      return;
    }
    setIsAddingDocument(true);
  };

  return (
    <div className="bg-blue-50 rounded-lg p-4 border border-blue-100 mb-4">
      {/* ... existing code ... */}

      {/* Add Document section with conditional rendering */}
      {isAddingDocument && clinicId ? (
        <div className="mt-3 p-3 bg-white rounded border border-blue-100">
          <FileUploader
            clinicId={clinicId}
            patientId={patientId}
            onUploadComplete={handleUploadComplete}
            onUploadError={handleUploadError}
            onCancel={() => setIsAddingDocument(false)}
          />

          {uploadError && (
            <div className="text-xs text-red-600 mt-2">{uploadError}</div>
          )}

          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => setIsAddingDocument(false)}
              className="px-3 py-1 text-sm text-blue-500 hover:text-blue-700"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : isAddingDocument && !clinicId ? (
        <div className="mt-3 p-3 bg-white rounded border border-red-100">
          <div className="text-red-600 text-sm">
            No clinic selected. Please select a clinic before uploading
            documents.
          </div>
          <div className="flex justify-end mt-2">
            <button
              onClick={() => setIsAddingDocument(false)}
              className="px-3 py-1 text-sm text-blue-500 hover:text-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={handleAddDocumentClick}
          className={`w-full flex items-center justify-center gap-1 text-blue-500 hover:text-blue-700 py-2 px-4 border border-blue-200 rounded bg-white ${
            !clinicId ? "opacity-70" : ""
          }`}
        >
          <span>Add Document</span> <span>+</span>
        </button>
      )}

      {!isAddingDocument && uploadError && (
        <div className="text-xs text-red-600 mt-2 p-2 bg-red-50 rounded">
          {uploadError}
        </div>
      )}
    </div>
  );
};

export default HistoryRecord;
