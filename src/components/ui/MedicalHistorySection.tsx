// src/components/ui/MedicalHistorySection.tsx - FIXED: Added note update handler
"use client";

import React, { useState } from "react";
import { IHistoryRecord } from "@/interfaces";
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
}: MedicalHistorySectionProps) {
  const [isAddingRecord, setIsAddingRecord] = useState(false);
  const [isAddingDocument, setIsAddingDocument] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<IHistoryRecord>({
    timestamp: new Date(),
    document_urls: [],
    notes: "",
  });

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

  const handleAddDocument = (url: string) => {
    setCurrentRecord(prev => ({
      ...prev,
      document_urls: [...(prev.document_urls || []), url],
    }));
    setIsAddingDocument(false);
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

    onAddRecord(currentRecord);
    
    // Reset form
    setCurrentRecord({
      timestamp: new Date(),
      document_urls: [],
      notes: "",
    });
    setIsAddingRecord(false);
    setIsAddingDocument(false);
  };

  const handleCancelRecord = () => {
    // Reset form
    setCurrentRecord({
      timestamp: new Date(),
      document_urls: [],
      notes: "",
    });
    setIsAddingRecord(false);
    setIsAddingDocument(false);
  };

  const handleRemoveRecord = (index: number) => {
    if (confirm("Are you sure you want to delete this medical record?")) {
      onRemoveRecord(index);
    }
  };

  // NEW: Handle note updates for existing records
  const handleUpdateRecordNotes = (index: number, notes: string) => {
    const updatedRecord = { ...historyRecords[index], notes };
    onUpdateRecord(index, updatedRecord);
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-blue-100">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl text-blue-700 font-medium flex items-center gap-2">
          <span>📁</span> ประวัติการรักษาพยาบาล
        </h2>
        <button
          onClick={() => setIsAddingRecord(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center gap-1"
        >
          <span>+</span> เพิ่มประวัติ
        </button>
      </div>

      {/* Add New Record Form */}
      {isAddingRecord && (
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

            {/* Documents */}
            {currentRecord.document_urls && currentRecord.document_urls.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-2">
                  เอกสารที่แนบ
                </label>
                <div className="space-y-2 mb-3">
                  {currentRecord.document_urls.map((url, idx) => (
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
                  onAddDocument={handleAddDocument}
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
              key={index}
              record={record}
              index={index}
              clinicId={clinicId}
              patientId={patientId}
              onRemove={handleRemoveRecord}
              onUpdateDate={onUpdateRecordDate}
              onAddDocument={onAddDocument}
              onRemoveDocument={onRemoveDocument}
              onUpdateNotes={handleUpdateRecordNotes} // NEW: Pass the note update handler
            />
          ))
        ) : !isAddingRecord ? (
          <div className="text-center py-10 bg-blue-50 rounded-xl">
            <div className="text-5xl mb-3">📋</div>
            <p className="text-blue-700 mb-2">ไม่พบข้อมูลเวชระเบียน</p>
            <p className="text-blue-500 mb-4">
              เพิ่มระเบียนใหม่เพื่อเริ่มติดตามประวัติผู้ป่วย
            </p>
            <button
              onClick={() => setIsAddingRecord(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              เพิ่มประวัติแรก
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}