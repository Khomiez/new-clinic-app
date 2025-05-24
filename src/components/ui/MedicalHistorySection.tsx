// src/components/ui/MedicalHistorySection.tsx - FIXED: Proper edit mode control
"use client";

import React, { useState } from "react";
import { IHistoryRecord } from "@/interfaces";
import { TemporaryFile } from "@/utils/temporaryFileStorage";
import HistoryRecord from "./HistoryRecord";
import DocumentUpload from "./DocumentUpload";
import { ThaiDatePicker } from "@/components";

interface MedicalHistorySectionProps {
  patientId: string;
  clinicId?: string;
  historyRecords: IHistoryRecord[];
  onAddRecord: (record: IHistoryRecord) => void;
  onUpdateRecord: (index: number, record: IHistoryRecord) => void;
  onRemoveRecord: (index: number) => void;
  onUpdateRecordDate: (index: number, newDate: Date) => void;
  onAddDocument: (recordIndex: number, url: string) => void;
  onRemoveDocument: (recordIndex: number, documentIndex: number) => void;
  pendingFileDeletions?: Array<{
    recordIndex: number;
    documentIndex: number;
    url: string;
    filename: string;
  }>;
  // Temporary file support
  temporaryFiles?: TemporaryFile[];
  onAddTemporaryFile?: (recordIndex: number, tempFile: TemporaryFile) => void;
  onRemoveTemporaryFile?: (tempFileId: string) => void;
  // NEW: Control whether this section is in edit mode or view mode
  isEditMode?: boolean;
}

export default function MedicalHistorySection({
  patientId,
  clinicId,
  historyRecords,
  onAddRecord,
  onUpdateRecord,
  onRemoveRecord,
  onUpdateRecordDate,
  onAddDocument,
  onRemoveDocument,
  pendingFileDeletions = [],
  temporaryFiles = [],
  onAddTemporaryFile,
  onRemoveTemporaryFile,
  isEditMode = true, // NEW: Default to edit mode
}: MedicalHistorySectionProps) {
  const [isAddingRecord, setIsAddingRecord] = useState(false);
  const [isAddingDocument, setIsAddingDocument] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<IHistoryRecord>({
    timestamp: new Date(),
    document_urls: [],
    notes: "",
  });
  // Local state for temporary files being added to the new record
  const [newRecordTemporaryFiles, setNewRecordTemporaryFiles] = useState<TemporaryFile[]>([]);

  const handleRecordChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentRecord(prev => ({
      ...prev,
      notes: e.target.value,
    }));
  };

  const handleDateChange = (date: Date) => {
    setCurrentRecord(prev => ({
      ...prev,
      timestamp: date,
    }));
  };

  // LEGACY: Handle regular upload completion (for new records)
  const handleAddDocument = (url: string) => {
    setCurrentRecord(prev => ({
      ...prev,
      document_urls: [...(prev.document_urls || []), url],
    }));
    setIsAddingDocument(false);
  };

  // Handle temporary file addition for new record
  const handleAddTemporaryFileToNewRecord = (tempFile: TemporaryFile) => {
    console.log('MedicalHistorySection: Adding temporary file to new record:', tempFile);
    setNewRecordTemporaryFiles(prev => [...prev, tempFile]);
    setIsAddingDocument(false);
  };

  // Handle temporary file removal for new record
  const handleRemoveTemporaryFileFromNewRecord = (tempFileId: string) => {
    console.log('MedicalHistorySection: Removing temporary file from new record:', tempFileId);
    setNewRecordTemporaryFiles(prev => 
      prev.filter(tempFile => tempFile.id !== tempFileId)
    );
  };

  const handleRemoveDocumentFromCurrent = (docIndex: number) => {
    setCurrentRecord(prev => ({
      ...prev,
      document_urls: prev.document_urls?.filter((_, i) => i !== docIndex) || [],
    }));
  };

  const handleSaveRecord = () => {
    if (!currentRecord.timestamp) {
      alert("Date and time are required for the history record");
      return;
    }

    // FIXED: Don't add temp:// URLs to the record - they will be handled properly during save
    const cleanRecord = {
      ...currentRecord,
      // Keep only actual document URLs, not temporary ones
      document_urls: currentRecord.document_urls?.filter(url => !url.startsWith('temp://')) || []
    };

    console.log('Saving new record:', {
      record: cleanRecord,
      temporaryFiles: newRecordTemporaryFiles
    });

    onAddRecord(cleanRecord);
    
    // Add temporary files to the main temporary files list with updated record index
    if (onAddTemporaryFile && newRecordTemporaryFiles.length > 0 && isEditMode) {
      const newRecordIndex = historyRecords.length; // This will be the index of the new record
      newRecordTemporaryFiles.forEach(tempFile => {
        const updatedTempFile = { ...tempFile, recordIndex: newRecordIndex };
        onAddTemporaryFile(newRecordIndex, updatedTempFile);
      });
    }
    
    // Reset form
    setCurrentRecord({
      timestamp: new Date(),
      document_urls: [],
      notes: "",
    });
    setNewRecordTemporaryFiles([]);
    setIsAddingRecord(false);
    setIsAddingDocument(false);
  };

  const handleCancelRecord = () => {
    // Clean up temporary files when canceling
    if (newRecordTemporaryFiles.length > 0) {
      console.log('Canceling record creation, cleaning up temporary files:', newRecordTemporaryFiles);
      // Revoke object URLs to prevent memory leaks
      newRecordTemporaryFiles.forEach(tempFile => {
        if (tempFile.previewUrl) {
          URL.revokeObjectURL(tempFile.previewUrl);
        }
      });
    }

    // Reset form
    setCurrentRecord({
      timestamp: new Date(),
      document_urls: [],
      notes: "",
    });
    setNewRecordTemporaryFiles([]);
    setIsAddingRecord(false);
    setIsAddingDocument(false);
  };

  const handleRemoveRecord = (index: number) => {
    if (confirm("Are you sure you want to delete this medical record?")) {
      onRemoveRecord(index);
    }
  };

  const handleUpdateRecordNotes = (index: number, notes: string) => {
    const updatedRecord = { ...historyRecords[index], notes };
    onUpdateRecord(index, updatedRecord);
  };

  const getPendingDeletionsForRecord = (recordIndex: number): string[] => {
    return pendingFileDeletions
      .filter(deletion => deletion.recordIndex === recordIndex)
      .map(deletion => deletion.url);
  };

  // Get temporary files for a specific record
  const getTemporaryFilesForRecord = (recordIndex: number): TemporaryFile[] => {
    return temporaryFiles.filter(tempFile => tempFile.recordIndex === recordIndex);
  };

  // FIXED: Calculate totals correctly - exclude temp files from deletion count in view mode
  const totalPendingDeletions = isEditMode ? pendingFileDeletions.length : 0;
  const totalPendingUploads = isEditMode ? (temporaryFiles.length + newRecordTemporaryFiles.length) : 0;

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-blue-100">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl text-blue-700 font-medium flex items-center gap-2">
            <span>📁</span> ประวัติการรักษาพยาบาล
          </h2>
          {/* FIXED: Enhanced status display - only show in edit mode */}
          {isEditMode && (
            <div className="flex items-center space-x-3 mt-1">
              {totalPendingDeletions > 0 && (
                <p className="text-sm text-red-600">
                  {totalPendingDeletions} file(s) marked for deletion
                </p>
              )}
              {totalPendingUploads > 0 && (
                <p className="text-sm text-orange-600">
                  {totalPendingUploads} file(s) pending upload
                </p>
              )}
            </div>
          )}
        </div>
        {isEditMode && (
          <button
            onClick={() => setIsAddingRecord(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center gap-1"
          >
            <span>+</span> เพิ่มประวัติ
          </button>
        )}
      </div>

      {/* Add New Record Form - Only in edit mode */}
      {isAddingRecord && isEditMode && (
        <div className="mb-6 bg-blue-50 p-5 rounded-xl border border-blue-100">
          <h3 className="text-lg font-medium text-blue-700 mb-4">
            เพิ่มเวชระเบียนใหม่
          </h3>

          <div className="space-y-4">
            {/* Date and Time */}
            <div>
              <label className="block text-sm font-medium text-blue-700 mb-1">
                วันที่และเวลา <span className="text-red-500">*</span>
              </label>
              <ThaiDatePicker
                selectedDate={currentRecord.timestamp instanceof Date 
                  ? currentRecord.timestamp 
                  : new Date(currentRecord.timestamp)
                }
                onChange={handleDateChange}
                placeholder="เลือกวันที่และเวลา"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-blue-700 mb-1">
                หมายเหตุ
              </label>
              <textarea
                value={currentRecord.notes || ""}
                onChange={handleRecordChange}
                rows={4}
                className="w-full px-3 py-2 border border-blue-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="กรอกหมายเหตุเกี่ยวกับการเข้ารับการรักษาครั้งนี้..."
              />
            </div>

            {/* Documents - Show both regular and temporary files */}
            {((currentRecord.document_urls && currentRecord.document_urls.length > 0) || 
              newRecordTemporaryFiles.length > 0) && (
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-2">
                  เอกสารที่แนบ
                </label>
                <div className="space-y-2 mb-3">
                  {/* FIXED: Regular uploaded documents - exclude temp:// URLs */}
                  {currentRecord.document_urls?.filter(url => !url.startsWith('temp://')).map((url, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-white p-2 rounded border border-blue-100">
                      <span className="text-sm truncate max-w-xs">
                        {url.split("/").pop()}
                      </span>
                      <button
                        onClick={() => handleRemoveDocumentFromCurrent(idx)}
                        className="text-xs bg-red-100 hover:bg-red-200 text-red-500 px-2 py-1 rounded"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  
                  {/* Temporary files */}
                  {newRecordTemporaryFiles.map((tempFile) => (
                    <div key={tempFile.id} className="flex justify-between items-center bg-orange-50 p-2 rounded border border-orange-200">
                      <div className="flex items-center space-x-2">
                        <span className="text-orange-500">📤</span>
                        <span className="text-sm truncate max-w-xs">
                          {tempFile.filename}
                        </span>
                        <span className="text-xs text-orange-600 bg-orange-200 px-2 py-0.5 rounded">
                          TEMP
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveTemporaryFileFromNewRecord(tempFile.id)}
                        className="text-xs bg-red-100 hover:bg-red-200 text-red-500 px-2 py-1 rounded"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Document Upload */}
            <div>
              <label className="block text-sm font-medium text-blue-700 mb-2">
                เพิ่มเอกสาร
              </label>

              {isAddingDocument ? (
                <DocumentUpload
                  clinicId={clinicId || ""}
                  patientId={patientId}
                  recordIndex={-1} // Special index for new records
                  onAddDocument={handleAddTemporaryFileToNewRecord} // Handle temporary files
                  onCancel={() => setIsAddingDocument(false)}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingDocument(true)}
                  className={`w-full flex items-center justify-center gap-1 text-blue-500 hover:text-blue-700 py-2 px-4 border border-blue-200 rounded bg-white ${
                    !clinicId ? "opacity-70 cursor-not-allowed" : ""
                  }`}
                  disabled={!clinicId}
                >
                  <span>📎</span> แนบเอกสาร
                </button>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-3">
              <button
                type="button"
                onClick={handleCancelRecord}
                className="px-4 py-2 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveRecord}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
              >
                เพิ่มประวัติ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Records List */}
      <div className="space-y-5">
        {historyRecords && historyRecords.length > 0 ? (
          historyRecords.map((record, index) => (
            <HistoryRecord
              key={`record_${index}_${record.timestamp}`} // FIXED: More stable key
              record={record}
              index={index}
              clinicId={clinicId}
              patientId={patientId}
              onRemove={handleRemoveRecord}
              onUpdateDate={onUpdateRecordDate}
              onAddDocument={onAddDocument}
              onRemoveDocument={onRemoveDocument}
              onUpdateNotes={handleUpdateRecordNotes}
              pendingDeletions={getPendingDeletionsForRecord(index)}
              temporaryFiles={getTemporaryFilesForRecord(index)}
              onAddTemporaryFile={onAddTemporaryFile}
              onRemoveTemporaryFile={onRemoveTemporaryFile}
              isEditMode={isEditMode} // FIXED: Pass edit mode to each record
            />
          ))
        ) : !isAddingRecord ? (
          <div className="text-center py-10 bg-blue-50 rounded-xl">
            <div className="text-5xl mb-3">📋</div>
            <p className="text-blue-700 mb-2">ไม่พบข้อมูลเวชระเบียน</p>
            <p className="text-blue-500 mb-4">
              {isEditMode 
                ? "เพิ่มระเบียนใหม่เพื่อเริ่มติดตามประวัติผู้ป่วย"
                : "ยังไม่มีเวชระเบียนสำหรับผู้ป่วยนี้"
              }
            </p>
            {isEditMode && (
              <button
                onClick={() => setIsAddingRecord(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
              >
                เพิ่มประวัติแรก
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}