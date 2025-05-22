// src/components/ui/HistoryRecord.tsx - Simplified history record component
"use client";

import React, { useState } from "react";
import { IHistoryRecord } from "@/interfaces";
import DocumentUpload from "./DocumentUpload";
import FileList from "./FileList";
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
    // Update notes in the record (this would need parent component support)
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

  const handleDeleteDocument = (url: string, docIndex: number) => {
    if (confirm("Are you sure you want to delete this document?")) {
      onRemoveDocument(index, docIndex);
    }
  };

  return (
    <div className="bg-white rounded-xl p-4 border border-blue-100 mb-4 shadow-sm">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-grow">
          {isEditingDate ? (
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
              <button
                onClick={() => setIsEditingDate(true)}
                className="text-blue-400 hover:text-blue-600 p-1 rounded-full hover:bg-blue-50"
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
              onChange={(e) => setNotesValue(e.target.value)}
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
              <p className="text-gray-700 whitespace-pre-wrap">{record.notes}</p>
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

        {/* Documents List */}
        <FileList
          files={record.document_urls || []}
          onDeleteFile={handleDeleteDocument}
          showActions={true}
          compact={false}
        />
      </div>
    </div>
  );
}