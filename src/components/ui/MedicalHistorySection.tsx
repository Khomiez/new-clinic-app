// src/components/ui/MedicalHistorySection.tsx - Fixed empty state visibility issue
import React, { useState, useEffect } from "react";
import { IHistoryRecord } from "@/interfaces";
import HistoryRecord from "./HistoryRecord";
import DocumentUpload from "./DocumentUpload";
import { toIdString } from "@/utils/mongoHelpers";
import { DocumentOperation } from "@/hooks/useDocumentManager";

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
  // Document manager props
  pendingOperations: DocumentOperation[];
  isProcessing: boolean;
  addDocumentWithRollback: (recordIndex: number, url: string, shouldCommit?: boolean) => Promise<DocumentOperation>;
  removeDocumentWithDeferred: (recordIndex: number, documentIndex: number, url: string) => Promise<DocumentOperation>;
  markRecordForDeletion: (recordIndex: number, documentUrls: string[]) => Promise<DocumentOperation>;
  rollbackPendingOperations: () => Promise<void>;
  commitPendingOperations: () => Promise<void>;
  cleanupOrphanedFiles: (urls: string[]) => Promise<{ success: boolean; errors?: any[] }>;
  isRecordMarkedForDeletion: (recordIndex: number) => boolean;
  getPendingRecordOperations: () => DocumentOperation[];
  removePendingRecordDeletion: (recordIndex: number) => void;
}

const MedicalHistorySection: React.FC<MedicalHistorySectionProps> = ({
  patientId,
  clinicId,
  historyRecords,
  onAddRecord,
  onUpdateRecord,
  onRemoveRecord,
  onUpdateRecordDate,
  onAddDocument,
  onRemoveDocument,
  pendingOperations,
  isProcessing,
  addDocumentWithRollback,
  removeDocumentWithDeferred,
  markRecordForDeletion,
  rollbackPendingOperations,
  commitPendingOperations,
  cleanupOrphanedFiles,
  isRecordMarkedForDeletion,
  getPendingRecordOperations,
  removePendingRecordDeletion,
}) => {
  const [isAddingRecord, setIsAddingRecord] = useState<boolean>(false);
  const [currentRecord, setCurrentRecord] = useState<IHistoryRecord>({
    timestamp: new Date(),
    document_urls: [],
    notes: "",
  });
  const [isAddingDocument, setIsAddingDocument] = useState<boolean>(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<{
    show: boolean;
    recordIndex?: number;
    title?: string;
    message?: string;
    onConfirm?: () => void;
  }>({ show: false });

  // Handle page unload/refresh to clean up pending operations
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingOperations.length > 0) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [pendingOperations]);

  const handleRecordChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    if (name === "timestamp" && value) {
      setCurrentRecord((prev) => ({
        ...prev,
        [name]: new Date(value),
      }));
    } else {
      setCurrentRecord((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleAddDocument = async (url: string) => {
    // Use the document manager to add the document with proper tracking
    // We're adding to a new record (index -1 to indicate it's for currentRecord)
    await addDocumentWithRollback(-1, url, false);
    
    // Update the current record's document URLs
    setCurrentRecord((prev) => ({
      ...prev,
      document_urls: [...(prev.document_urls || []), url],
    }));
    setIsAddingDocument(false);
  };

  const handleRemoveDocumentFromCurrentRecord = async (docIndex: number) => {
    const url = currentRecord.document_urls?.[docIndex];
    if (!url) return;

    // Use document manager for proper tracking
    await removeDocumentWithDeferred(-1, docIndex, url);
    
    // Update the current record
    setCurrentRecord((prev) => ({
      ...prev,
      document_urls: prev.document_urls?.filter((_, i) => i !== docIndex) || [],
    }));
  };

  const handleSaveRecord = async () => {
    if (!currentRecord.timestamp) {
      alert("Date and time are required for the history record");
      return;
    }

    try {
      // Add the record first
      onAddRecord(currentRecord);
      
      // Commit all pending document operations (this handles any files that need to stay)
      await commitPendingOperations();
      
      // Reset form
      setCurrentRecord({
        timestamp: new Date(),
        document_urls: [],
        notes: "",
      });
      setIsAddingRecord(false);
      setIsAddingDocument(false);
    } catch (error) {
      console.error('Error saving record:', error);
      alert('Failed to save record. Please try again.');
    }
  };

  const handleCancelRecord = async () => {
    // Count how many operations would be affected
    const currentRecordOperations = pendingOperations.filter(
      op => op.recordIndex === -1 || (op.recordIndex === -1 && op.url && currentRecord.document_urls?.includes(op.url))
    );
    
    setShowDeleteConfirmation({
      show: true,
      title: "ยกเลิกบันทึก",
      message: currentRecordOperations.length > 0 
        ? `คุณแน่ใจหรือไม่ว่าคุณต้องการยกเลิก? ${currentRecordOperations.length} การดำเนินการไฟล์ที่รอดำเนินการจะถูกย้อนกลับ`
        : "คุณแน่ใจหรือไม่ว่าคุณต้องการยกเลิก? การกระทำนี้จะทำให้บันทึกปัจจุบันถูกยกเลิก",
      onConfirm: async () => {
        try {
          // Important: Rollback ALL pending operations for this session
          // This will properly handle files that were added and then marked for deletion
          await rollbackPendingOperations();
          
          // Reset form
          setCurrentRecord({
            timestamp: new Date(),
            document_urls: [],
            notes: "",
          });
          setIsAddingRecord(false);
          setIsAddingDocument(false);
          setShowDeleteConfirmation({ show: false });
        } catch (error) {
          console.error('Error during cancel:', error);
          alert('There was an error canceling the record. Please try again.');
        }
      }
    });
  };

  // Updated: Use deferred deletion for records
  const handleRemoveRecord = async (index: number) => {
    const record = historyRecords[index];
    const documentCount = record.document_urls?.length || 0;
    
    // Don't process if already marked for deletion
    if (isRecordMarkedForDeletion(index)) {
      return;
    }
    
    setShowDeleteConfirmation({
      show: true,
      recordIndex: index,
      title: "Delete Medical Record",
      message: `Are you sure you want to delete this record?${
        documentCount > 0 
          ? ` This will also mark ${documentCount} document${documentCount > 1 ? 's' : ''} for deletion when you save changes.`
          : ''
      }`,
      onConfirm: async () => {
        try {
          // Get the document URLs from the record
          const documentUrls = record.document_urls || [];
          
          // Mark record for deferred deletion (don't delete files yet)
          await markRecordForDeletion(index, documentUrls);
          
          // Remove from UI immediately (this will be reverted if user cancels)
          onRemoveRecord(index);
          setShowDeleteConfirmation({ show: false });
        } catch (error) {
          console.error('Error marking record for deletion:', error);
          alert('Failed to mark record for deletion. Please try again.');
          setShowDeleteConfirmation({ show: false });
        }
      }
    });
  };

  // Updated: Handle undo for records marked for deletion
  const handleUndoRecordDeletion = (recordIndex: number) => {
    // Remove the pending record deletion operation
    removePendingRecordDeletion(recordIndex);
    
    // The parent component will handle restoring the record to the UI
    // Since we only mark records for deletion but don't actually remove them from state
  };

  const formatDateTimeForInput = (date: Date | string): string => {
    if (!date) return "";
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toISOString().slice(0, 16);
  };

  const getFileIcon = (url: string): string => {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.endsWith(".pdf")) return "📕";
    if (lowerUrl.match(/\.(jpg|jpeg|png|gif|webp)$/)) return "🖼️";
    if (lowerUrl.match(/\.(doc|docx)$/)) return "📝";
    if (lowerUrl.match(/\.(xls|xlsx|csv)$/)) return "📊";
    if (lowerUrl.match(/\.(ppt|pptx)$/)) return "📊";
    return "📄";
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-blue-100">
      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-xl font-bold text-red-600 mb-4">
              {showDeleteConfirmation.title}
            </h3>
            <p className="text-gray-700 mb-6">
              {showDeleteConfirmation.message}
            </p>
            {/* Show pending operations summary */}
            {showDeleteConfirmation.title === "Cancel Record" && pendingOperations.length > 0 && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800 font-medium">Pending operations that will be reverted:</p>
                <ul className="text-xs text-yellow-700 mt-1 ml-4 list-disc">
                  {pendingOperations.map((op, idx) => (
                    <li key={idx}>
                      {op.type === 'add' && 'New file upload will be deleted'}
                      {op.type === 'remove' && 'File removal will be cancelled'}
                      {op.type === 'remove_record' && 'Record deletion will be cancelled'}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirmation({ show: false })}
                className="flex-1 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={showDeleteConfirmation.onConfirm}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl text-blue-700 font-medium flex items-center gap-2">
          <span>📁</span> ประวัติการรักษาพยาบาล
          {pendingOperations.length > 0 && (
            <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded">
              {pendingOperations.length} unsaved changes
            </span>
          )}
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
          <h3 className="text-lg font-medium text-blue-700 mb-4">เพิ่มเวชระเบียนใหม่</h3>
          
          <div className="space-y-4">
            {/* Date and Time */}
            <div>
              <label
                className="block text-sm font-medium text-blue-700 mb-1"
                htmlFor="timestamp"
              >
                วันที่และเวลา<span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                id="timestamp"
                name="timestamp"
                value={formatDateTimeForInput(currentRecord.timestamp)}
                onChange={handleRecordChange}
                className="w-full px-3 py-2 border border-blue-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              />
            </div>

            {/* Notes */}
            <div>
              <label
                className="block text-sm font-medium text-blue-700 mb-1"
                htmlFor="notes"
              >
                หมายเหตุ
              </label>
              <textarea
                id="notes"
                name="notes"
                value={currentRecord.notes || ""}
                onChange={handleRecordChange}
                rows={4}
                className="w-full px-3 py-2 border border-blue-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="กรอกหมายเหตุเกี่ยวกับการเข้ารับการรักษาครั้งนี้..."
              />
            </div>

            {/* Documents preview */}
            {currentRecord.document_urls && currentRecord.document_urls.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-2">
                  Attached Documents
                </label>
                <div className="space-y-2 mb-3">
                  {currentRecord.document_urls.map((url, idx) => {
                    // Check if this document has pending operations
                    const hasRemoveOperation = pendingOperations.some(
                      op => op.type === 'remove' && op.url === url && op.recordIndex === -1
                    );
                    
                    return (
                      <div
                        key={idx}
                        className={`flex justify-between items-center bg-white p-2 rounded border border-blue-100 ${
                          hasRemoveOperation ? 'opacity-50 bg-red-50' : ''
                        }`}
                      >
                        <div className="flex items-center">
                          <span className="text-lg mr-2">
                            {getFileIcon(url)}
                          </span>
                          <span className="text-sm truncate max-w-xs">
                            {url.split("/").pop()}
                          </span>
                          {hasRemoveOperation && (
                            <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                              Marked for deletion
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveDocumentFromCurrentRecord(idx)}
                          className="text-xs bg-red-100 hover:bg-red-200 text-red-500 px-2 py-1 rounded"
                          disabled={hasRemoveOperation}
                        >
                          {hasRemoveOperation ? 'Marked' : 'Remove'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Document upload */}
            <div>
              <label className="block text-sm font-medium text-blue-700 mb-2">
              เพิ่มเอกสาร
              </label>
              
              {isAddingDocument ? (
                <DocumentUpload
                  clinicId={clinicId}
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
              
              {!clinicId && (
                <p className="text-xs text-amber-600 mt-1">
                  Please select a clinic to enable document upload
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-3">
              <button
                type="button"
                onClick={handleCancelRecord}
                className="px-4 py-2 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition"
                disabled={isProcessing}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveRecord}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : 'เพิ่มประวัติ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Records List */}
      <div className="space-y-5">
        {/* 
          FIXED: Only show empty state when there are NO records AND we're NOT adding a record 
          This prevents the "Add First Record" button from appearing below the add form
        */}
        {historyRecords && historyRecords.length > 0 ? (
          historyRecords.map((record, index) => {
            const isMarkedForDeletion = isRecordMarkedForDeletion(index);
            
            return (
              <div key={index} className="relative">
                {/* Deletion overlay */}
                {isMarkedForDeletion && (
                  <div className="absolute inset-0 bg-red-50 bg-opacity-90 rounded-xl flex items-center justify-center z-10">
                    <div className="text-center">
                      <p className="text-red-600 font-medium mb-2">
                        ❌ Record marked for deletion
                      </p>
                      <button
                        onClick={() => handleUndoRecordDeletion(index)}
                        className="px-3 py-1 bg-white text-red-600 border border-red-300 rounded-lg hover:bg-red-50 text-sm"
                      >
                        Undo
                      </button>
                    </div>
                  </div>
                )}
                
                <div className={`${isMarkedForDeletion ? 'opacity-30' : ''}`}>
                  <HistoryRecord
                    record={record}
                    index={index}
                    clinicId={clinicId}
                    patientId={patientId}
                    onRemove={() => handleRemoveRecord(index)}
                    onUpdateDate={onUpdateRecordDate}
                    onAddDocument={onAddDocument}
                    onRemoveDocument={onRemoveDocument}
                    pendingOperations={pendingOperations}
                  />
                </div>
              </div>
            );
          })
        ) : !isAddingRecord ? (
          // Only show the empty state when we're not adding a record
          <div className="text-center py-10 bg-blue-50 rounded-xl">
            <div className="text-5xl mb-3">📋</div>
            <p className="text-blue-700 mb-2">ไม่พบข้อมูลเวชระเบียน</p>
            <p className="text-blue-500 mb-4">เพิ่มระเบียนใหม่เพื่อเริ่มติดตามประวัติผู้ป่วย</p>
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
};

export default MedicalHistorySection;