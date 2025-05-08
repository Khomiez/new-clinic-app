// src/components/ui/HistoryRecord.tsx
import React, { useState } from "react";
import { IHistoryRecord } from "@/interfaces";
import FileUploader from "./FileUploader";

interface HistoryRecordProps {
  record: IHistoryRecord;
  index: number;
  onRemove: (index: number) => void;
  onUpdateDate: (index: number, newDate: Date) => void;
  onAddDocument: (index: number, url: string) => void;
  onRemoveDocument: (recordIndex: number, documentIndex: number) => void;
}

const HistoryRecord: React.FC<HistoryRecordProps> = ({
  record,
  index,
  onRemove,
  onUpdateDate,
  onAddDocument,
  onRemoveDocument,
  clinicId,
}) => {
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [dateValue, setDateValue] = useState(
    record.timestamp instanceof Date
      ? record.timestamp.toISOString().split("T")[0]
      : new Date(record.timestamp).toISOString().split("T")[0]
  );
  const [isAddingDocument, setIsAddingDocument] = useState(false);
  const [newDocumentUrl, setNewDocumentUrl] = useState("");

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

  const handleAddDocument = () => {
    if (newDocumentUrl.trim()) {
      onAddDocument(index, newDocumentUrl.trim());
      setNewDocumentUrl("");
      setIsAddingDocument(false);
    }
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

  return (
    <div className="bg-blue-50 rounded-lg p-4 border border-blue-100 mb-4">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center">
          <div className="text-blue-600 mr-2">📅</div>
          {isEditingDate ? (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateValue}
                onChange={handleDateChange}
                className="px-2 py-1 border border-blue-200 rounded"
              />
              <button
                onClick={handleDateSubmit}
                className="bg-blue-100 text-blue-700 px-2 py-1 text-sm rounded hover:bg-blue-200"
              >
                Save
              </button>
              <button
                onClick={() => setIsEditingDate(false)}
                className="text-red-500 hover:text-red-700 px-2 py-1 text-sm"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="font-medium text-blue-700">
              {formatDate(record.timestamp)}
            </div>
          )}
        </div>
        <div className="flex space-x-2">
          <button
            className="text-blue-500 hover:text-blue-700 text-sm bg-blue-50 px-2 py-1 rounded"
            onClick={() => setIsEditingDate(true)}
          >
            Edit Date
          </button>
          <button
            className="text-red-500 hover:text-red-700 text-sm bg-red-50 px-2 py-1 rounded"
            onClick={() => onRemove(index)}
          >
            Remove
          </button>
        </div>
      </div>

      {/* Notes section */}
      {record.notes && (
        <div className="mb-3 px-2">
          <p className="text-sm text-gray-600">{record.notes}</p>
        </div>
      )}

      {/* Document section */}
      <div className="mb-2">
        <p className="text-sm font-medium text-gray-600 mb-2">Documents:</p>
        {record.document_urls && record.document_urls.length > 0 ? (
          <div className="space-y-2">
            {record.document_urls.map((url, docIndex) => (
              <div
                key={docIndex}
                className="flex items-center justify-between bg-white p-2 rounded border border-blue-100"
              >
                <div className="flex items-center gap-2">
                  <span>{getFileIcon(url)}</span>
                  <span className="text-sm">{getFilenameFromUrl(url)}</span>
                </div>
                <div className="flex gap-1">
                  <button
                    className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded"
                    onClick={() => window.open(url, "_blank")}
                  >
                    View
                  </button>
                  <button className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded">
                    Replace
                  </button>
                  <button
                    className="text-xs bg-red-100 hover:bg-red-200 text-red-500 px-2 py-1 rounded"
                    onClick={() => onRemoveDocument(index, docIndex)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-500 italic">
            No documents available
          </div>
        )}
      </div>

      {/* Add Document section */}
      {isAddingDocument ? (
        <div className="mt-3 p-3 bg-white rounded border border-blue-100">
          <FileUploader
            clinicId={clinicId}
            patientId={patientId} // You'd need to pass this from a parent component
            onUploadComplete={(url) => {
              handleAddDocument(url);
              setIsAddingDocument(false);
            }}
            onUploadError={(error) => {
              setUploadError(error); // Add this state variable
            }}
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => setIsAddingDocument(false)}
              className="px-3 py-1 text-sm text-blue-500 hover:text-blue-700"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsAddingDocument(true)}
          className="w-full flex items-center justify-center gap-1 text-blue-500 hover:text-blue-700 py-2 px-4 border border-blue-200 rounded bg-white"
        >
          <span>Add Document</span> <span>+</span>
        </button>
      )}
    </div>
  );
};

export default HistoryRecord;
