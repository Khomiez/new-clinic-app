// src/components/ui/HistoryRecord.tsx - FIXED: Proper temporary file control
"use client";

import React, { useState } from "react";
import { IHistoryRecord } from "@/interfaces";
import { TemporaryFile } from "@/utils/temporaryFileStorage";
import DocumentUpload from "./DocumentUpload";
import EnhancedFileList from "./EnhancedFileList";
import { ThaiDatePicker } from "@/components";

interface HistoryRecordProps {
  record: IHistoryRecord;
  index: number;
  clinicId?: string;
  patientId: string;
  onRemove: (index: number) => void;
  onUpdateDate: (index: number, newDate: Date) => void;
  onAddDocument: (index: number, url: string) => void;
  onRemoveDocument: (recordIndex: number, documentIndex: number) => void;
  onUpdateNotes: (index: number, notes: string) => void;
  pendingDeletions?: string[];
  // Temporary file support
  temporaryFiles?: TemporaryFile[];
  onAddTemporaryFile?: (recordIndex: number, tempFile: TemporaryFile) => void;
  onRemoveTemporaryFile?: (tempFileId: string) => void;
  // NEW: Control whether this is in edit mode (shows temp files) or view mode (hides temp files)
  isEditMode?: boolean;
}

export default function HistoryRecord({
  record,
  index,
  clinicId,
  patientId,
  onRemove,
  onUpdateDate,
  onAddDocument,
  onRemoveDocument,
  onUpdateNotes,
  pendingDeletions = [],
  temporaryFiles = [],
  onAddTemporaryFile,
  onRemoveTemporaryFile,
  isEditMode = true, // NEW: Default to edit mode, but can be set to false for saved records
}: HistoryRecordProps) {
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isAddingDocument, setIsAddingDocument] = useState(false);
  const [notesValue, setNotesValue] = useState(record.notes || "");

  const formatDate = (dateString: string | Date): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      calendar: "buddhist",
    }).format(date);
  };

  const handleDateChange = (newDate: Date) => {
    onUpdateDate(index, newDate);
    setIsEditingDate(false);
  };

  const handleNotesSubmit = () => {
    onUpdateNotes(index, notesValue);
    setIsEditingNotes(false);
  };

  const handleCancelNotesEdit = () => {
    setNotesValue(record.notes || "");
    setIsEditingNotes(false);
  };

  const handleAddDocumentClick = () => {
    if (!clinicId) {
      alert("Please select a clinic before adding documents");
      return;
    }
    setIsAddingDocument(true);
  };

  // Handle temporary file addition (only in edit mode)
  const handleTemporaryFileAdded = (tempFile: TemporaryFile) => {
    console.log('HistoryRecord: Received temporary file:', tempFile);
    if (onAddTemporaryFile && isEditMode) {
      onAddTemporaryFile(index, tempFile);
    }
    setIsAddingDocument(false);
  };

  // LEGACY: Handle regular upload completion (if needed for backward compatibility)
  const handleUploadComplete = (url: string) => {
    onAddDocument(index, url);
    setIsAddingDocument(false);
  };

  const handleDeleteDocument = (url: string, docIndex: number) => {
    console.log('HistoryRecord: Marking document for deletion:', {
      recordIndex: index,
      documentIndex: docIndex,
      url
    });
    
    onRemoveDocument(index, docIndex);
  };

  // Handle temporary file removal (only in edit mode)
  const handleDeleteTemporaryFile = (tempFileId: string) => {
    console.log('HistoryRecord: Removing temporary file:', tempFileId);
    if (onRemoveTemporaryFile && isEditMode) {
      onRemoveTemporaryFile(tempFileId);
    }
  };

  // FIXED: Get temporary files for this specific record (only in edit mode)
  const recordTemporaryFiles = isEditMode 
    ? temporaryFiles.filter((tempFile) => tempFile.recordIndex === index)
    : []; // Don't show temp files in view mode

  // FIXED: Calculate total files correctly - exclude temp:// URLs from document_urls
  const actualDocumentUrls = (record.document_urls || []).filter(url => !url.startsWith('temp://'));
  const totalFiles = actualDocumentUrls.length + recordTemporaryFiles.length;
  const totalPendingDeletions = pendingDeletions.length;
  const totalPendingUploads = recordTemporaryFiles.length;

  return (
    <div className="bg-white rounded-xl p-4 border border-blue-100 mb-4 shadow-sm">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-grow">
          {isEditingDate && isEditMode ? (
            <div className="flex items-center gap-2">
              <div className="flex-grow">
                <ThaiDatePicker
                  selectedDate={new Date(record.timestamp)}
                  onChange={handleDateChange}
                  placeholder="เลือกวันที่และเวลา"
                />
              </div>
              <button
                onClick={() => setIsEditingDate(false)}
                className="px-3 py-1.5 border border-blue-200 text-blue-500 rounded-lg hover:bg-blue-50 text-sm"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-blue-400">📅</span>
              <h3 className="font-medium text-blue-700">
                {formatDate(record.timestamp)}
              </h3>
              {isEditMode && (
                <button
                  onClick={() => setIsEditingDate(true)}
                  className="text-blue-400 hover:text-blue-600 p-1 rounded-full hover:bg-blue-50"
                  title="Edit date"
                >
                  ✏️
                </button>
              )}
            </div>
          )}
        </div>

        {isEditMode && (
          <button
            onClick={() => onRemove(index)}
            className="text-red-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50"
            title="Remove record"
          >
            ❌
          </button>
        )}
      </div>

      {/* Notes Section */}
      <div className="mb-4">
        <div className="flex items-center mb-2">
          <span className="text-blue-400 mr-1">📝</span>
          <h4 className="font-medium text-blue-600">Notes</h4>
          {!isEditingNotes && isEditMode && (
            <button
              onClick={() => setIsEditingNotes(true)}
              className="ml-2 text-blue-400 hover:text-blue-600 p-1 rounded-full hover:bg-blue-50"
              title="Edit notes"
            >
              ✏️
            </button>
          )}
        </div>

        {isEditingNotes && isEditMode ? (
          <div>
            <textarea
              value={notesValue}
              onChange={(e) => setNotesValue(e.target.value)}
              className="w-full px-3 py-2 border border-blue-200 rounded-lg bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[100px]"
              placeholder="Enter notes about this visit..."
            />
            <div className="flex justify-end mt-2 space-x-2">
              <button
                onClick={handleCancelNotesEdit}
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
            
            {/* FIXED: Enhanced status indicators - only show meaningful counts */}
            <div className="ml-2 flex items-center space-x-2">
              {totalFiles > 0 && (
                <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                  {totalFiles} file{totalFiles > 1 ? 's' : ''}
                </span>
              )}
              {totalPendingDeletions > 0 && isEditMode && (
                <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                  {totalPendingDeletions} pending deletion
                </span>
              )}
              {totalPendingUploads > 0 && isEditMode && (
                <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded">
                  {totalPendingUploads} pending upload
                </span>
              )}
            </div>
          </div>
          {isEditMode && (
            <button
              onClick={handleAddDocumentClick}
              className="text-sm bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-200 flex items-center gap-1"
              disabled={!clinicId}
            >
              <span>+</span> Add Document
            </button>
          )}
        </div>

        {/* Document Upload Form */}
        {isAddingDocument && clinicId && isEditMode && (
          <div className="mb-4 bg-blue-50 p-3 rounded-lg border border-blue-100">
            <DocumentUpload
              clinicId={clinicId}
              patientId={patientId}
              recordIndex={index}
              onAddDocument={handleTemporaryFileAdded} // Handle temporary files
              onCancel={() => setIsAddingDocument(false)}
            />
          </div>
        )}

        {/* Documents List - FIXED: Pass correct props */}
        <EnhancedFileList
          fileUrls={actualDocumentUrls} // FIXED: Only pass actual URLs, not temp:// ones
          clinicId={clinicId || ""}
          onDeleteFile={isEditMode ? handleDeleteDocument : undefined}
          showActions={isEditMode}
          compact={false}
          pendingDeletions={pendingDeletions}
          temporaryFiles={recordTemporaryFiles} // Pass record-specific temporary files
          onDeleteTemporaryFile={isEditMode ? handleDeleteTemporaryFile : undefined}
          showTemporaryFiles={isEditMode} // FIXED: Only show temp files in edit mode
        />
      </div>
    </div>
  );
}