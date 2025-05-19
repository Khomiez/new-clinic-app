// src/components/ui/HistoryRecord.tsx - Simplified with only Open and Delete actions
import React, { useState } from "react";
import { IHistoryRecord } from "@/interfaces";
import DocumentUpload from "./DocumentUpload";
import { toIdString } from "@/utils/mongoHelpers";
import { DocumentOperation } from "@/hooks/useDocumentManager";
import { ThaiDatePicker } from "@/components";
import {
  extractFileInfo,
  getFileIcon,
  formatFileSize,
} from "@/utils/fileHelpers";

interface HistoryRecordProps {
  record: IHistoryRecord;
  index: number;
  clinicId?: string;
  patientId: string;
  onRemove: (index: number) => void;
  onUpdateDate: (index: number, newDate: Date) => void;
  onAddDocument: (index: number, url: string) => void;
  onRemoveDocument: (recordIndex: number, documentIndex: number) => void;
  pendingOperations: DocumentOperation[];
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
  pendingOperations,
}) => {
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [dateValue, setDateValue] = useState(
    record.timestamp instanceof Date
      ? record.timestamp.toISOString().slice(0, 16)
      : new Date(record.timestamp).toISOString().slice(0, 16)
  );
  const [notesValue, setNotesValue] = useState(record.notes || "");
  const [isAddingDocument, setIsAddingDocument] = useState(false);

  const formatDate = (dateString: string | Date): string => {
    const date = new Date(dateString);

    // Format with Thai Buddhist Era (BE) year (543 years ahead of CE)
    return new Intl.DateTimeFormat("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      calendar: "buddhist", // Use Buddhist calendar
    }).format(date);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateValue(e.target.value);
  };

  const handleDateSubmit = () => {
    onUpdateDate(index, new Date(dateValue));
    setIsEditingDate(false);
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotesValue(e.target.value);
  };

  const handleNotesSubmit = () => {
    // Update notes in the record
    const updatedRecord: IHistoryRecord = {
      ...record,
      notes: notesValue,
    };

    // Call the update date function to trigger the record update
    // (This is a bit of a workaround - ideally we'd have a separate onUpdateRecord function)
    onUpdateDate(index, new Date(record.timestamp));
    setIsEditingNotes(false);
  };

  const handleAddDocumentClick = () => {
    if (!clinicId) {
      alert("Please select a clinic before adding documents");
      return;
    }
    setIsAddingDocument(true);
  };

  const handleUploadComplete = (url: string) => {
    onAddDocument(index, url);
    setIsAddingDocument(false);
  };

  // Check if a document is pending removal
  const isDocumentPendingRemoval = (url: string, docIndex: number) => {
    return pendingOperations.some(
      (op) =>
        op.type === "remove" &&
        op.url === url &&
        op.recordIndex === index &&
        op.documentIndex === docIndex
    );
  };

  // Check if a document was just added and is pending
  const isDocumentPendingAdd = (url: string) => {
    return pendingOperations.some(
      (op) => op.type === "add" && op.url === url && op.recordIndex === index
    );
  };

  const handleRemoveDocumentClick = async (url: string, docIndex: number) => {
    if (
      confirm(
        "Are you sure you want to delete this document? It will be permanently removed when you save."
      )
    ) {
      try {
        if (!clinicId) {
          throw new Error("Clinic ID is required to delete documents");
        }

        // Just remove from UI - actual Cloudinary deletion will happen on save
        onRemoveDocument(index, docIndex);
      } catch (error: any) {
        console.error("Error removing document:", error);
        alert(`Failed to remove document: ${error.message}. Please try again.`);
      }
    }
  };

  // Enhanced filename extraction with original name preservation
  const getFilenameFromUrl = (url: string): string => {
    const fileInfo = extractFileInfo(url);
    return fileInfo.filename;
  };

  return (
    <div className="bg-white rounded-xl p-4 border border-blue-100 mb-4 shadow-sm">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-grow">
          {isEditingDate ? (
            <div className="flex items-center">
              <div className="flex-grow mr-2">
                <ThaiDatePicker
                  selectedDate={new Date(dateValue)}
                  onChange={(date) => {
                    setDateValue(date.toISOString().slice(0, 16));
                  }}
                  placeholder="เลือกวันที่และเวลา"
                />
              </div>
              <button
                onClick={handleDateSubmit}
                className="px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
              >
                Save
              </button>
              <button
                onClick={() => setIsEditingDate(false)}
                className="px-3 py-1.5 ml-2 border border-blue-200 text-blue-500 rounded-lg hover:bg-blue-50 text-sm"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center">
              <div className="flex items-center gap-1">
                <span className="text-blue-400">📅</span>
                <h3 className="font-medium text-blue-700">
                  {formatDate(record.timestamp)}
                </h3>
              </div>
              <button
                onClick={() => setIsEditingDate(true)}
                className="ml-2 text-blue-400 hover:text-blue-600 p-1 rounded-full hover:bg-blue-50"
                title="Edit date"
              >
                ✏️
              </button>
            </div>
          )}
        </div>
        <button
          onClick={() => onRemove(index)}
          className="text-red-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50"
          title="Remove record"
        >
          ❌
        </button>
      </div>

      {/* Notes Section */}
      <div className="mb-4">
        <div className="flex items-center mb-2">
          <span className="text-blue-400 mr-1">📝</span>
          <h4 className="font-medium text-blue-600">Notes</h4>
          {!isEditingNotes && (
            <button
              onClick={() => setIsEditingNotes(true)}
              className="ml-2 text-blue-400 hover:text-blue-600 p-1 rounded-full hover:bg-blue-50"
              title="Edit notes"
            >
              ✏️
            </button>
          )}
        </div>

        {isEditingNotes ? (
          <div>
            <textarea
              value={notesValue}
              onChange={handleNotesChange}
              className="w-full px-3 py-2 border border-blue-200 rounded-lg bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[100px]"
              placeholder="Enter notes about this visit..."
            />
            <div className="flex justify-end mt-2 space-x-2">
              <button
                onClick={() => setIsEditingNotes(false)}
                className="px-3 py-1 text-blue-500 border border-blue-200 rounded-lg hover:bg-blue-50 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleNotesSubmit}
                className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
              >
                Save Notes
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-blue-50 p-3 rounded-lg">
            {record.notes ? (
              <p className="text-gray-700 whitespace-pre-wrap">
                {record.notes}
              </p>
            ) : (
              <p className="text-gray-500 italic">No notes for this visit</p>
            )}
          </div>
        )}
      </div>

      {/* Documents Section */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <span className="text-blue-400 mr-1">📁</span>
            <h4 className="font-medium text-blue-600">Documents</h4>
          </div>
          <button
            onClick={handleAddDocumentClick}
            className="text-sm bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-200 flex items-center gap-1"
            disabled={!clinicId}
          >
            <span>+</span> Add Document
          </button>
        </div>

        {/* Document Upload Form */}
        {isAddingDocument && clinicId && (
          <div className="mb-4 bg-blue-50 p-3 rounded-lg border border-blue-100">
            <DocumentUpload
              clinicId={clinicId}
              patientId={patientId}
              onAddDocument={handleUploadComplete}
              onCancel={() => setIsAddingDocument(false)}
            />
          </div>
        )}

        {/* Documents List - Simplified with only Open and Delete */}
        {record.document_urls && record.document_urls.length > 0 ? (
          <div className="space-y-2">
            {record.document_urls.map((url, docIndex) => {
              const isPendingRemoval = isDocumentPendingRemoval(url, docIndex);
              const isPendingAdd = isDocumentPendingAdd(url);
              const filename = getFilenameFromUrl(url);

              return (
                <div key={docIndex} className="relative">
                  <div
                    className={`flex items-center justify-between bg-white p-3 rounded-lg border border-blue-100 hover:border-blue-300 transition-colors ${
                      isPendingRemoval
                        ? "opacity-50 bg-red-50 border-red-200"
                        : ""
                    } ${isPendingAdd ? "bg-green-50 border-green-200" : ""}`}
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <span className="text-xl">
                        {getFileIcon(filename, url)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="text-gray-700 font-medium truncate block">
                          {filename}
                        </span>
                        {(isPendingRemoval || isPendingAdd) && (
                          <div className="flex gap-2 mt-1">
                            {isPendingRemoval && (
                              <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                                Will be deleted on save
                              </span>
                            )}
                            {isPendingAdd && (
                              <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded">
                                New - not saved yet
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Simplified Actions - Only Open and Delete */}
                    <div className="flex items-center space-x-2">
                      {/* Open in New Tab */}
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-1.5 text-sm bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                        title="Open file in new tab"
                      >
                        <span className="mr-1">🔗</span>
                        Open
                      </a>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleRemoveDocumentClick(url, docIndex)}
                        className="inline-flex items-center px-3 py-1.5 text-sm bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                        disabled={isPendingRemoval}
                        title="Delete file"
                      >
                        <span className="mr-1">🗑️</span>
                        {isPendingRemoval ? "Marked" : "Delete"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-blue-50 p-3 rounded-lg text-center">
            <p className="text-gray-500 italic">No documents attached</p>
            <p className="text-sm text-blue-600 mt-1">
              Click "Add Document" to attach files
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryRecord;
