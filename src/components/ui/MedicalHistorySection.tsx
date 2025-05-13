// src/components/ui/MedicalHistorySection.tsx - Without save/cancel buttons
import React, { useState, useEffect } from "react";
import { IHistoryRecord } from "@/interfaces";
import HistoryRecord from "./HistoryRecord";
import DocumentUpload from "./DocumentUpload";
import { toIdString } from "@/utils/mongoHelpers";
import { useDocumentManager } from "@/hooks/useDocumentManager";

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

  // Use our document manager hook
  const documentManager = useDocumentManager({
    onAddDocument,
    onRemoveDocument,
    clinicId: clinicId || '',
  });

  // Handle page unload/refresh to clean up pending operations
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (documentManager.pendingOperations.length > 0) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [documentManager.pendingOperations]);

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

  const handleAddDocument = (url: string) => {
    setCurrentRecord((prev) => ({
      ...prev,
      document_urls: [...(prev.document_urls || []), url],
    }));
    setIsAddingDocument(false);
  };

  const handleRemoveDocumentFromCurrentRecord = (docIndex: number) => {
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
      onAddRecord(currentRecord);
      
      // Commit all pending document operations
      documentManager.commitPendingOperations();
      
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
    setShowDeleteConfirmation({
      show: true,
      title: "Cancel Record",
      message: "Are you sure you want to cancel? Any uploaded documents will be deleted.",
      onConfirm: async () => {
        // Rollback any pending document operations
        await documentManager.rollbackPendingOperations();
        
        // Reset form
        setCurrentRecord({
          timestamp: new Date(),
          document_urls: [],
          notes: "",
        });
        setIsAddingRecord(false);
        setIsAddingDocument(false);
        setShowDeleteConfirmation({ show: false });
      }
    });
  };

  const handleRemoveRecord = (index: number) => {
    const record = historyRecords[index];
    const documentCount = record.document_urls?.length || 0;
    
    setShowDeleteConfirmation({
      show: true,
      recordIndex: index,
      title: "Delete Medical Record",
      message: `Are you sure you want to delete this record?${
        documentCount > 0 
          ? ` This will also permanently delete ${documentCount} attached document${documentCount > 1 ? 's' : ''}.`
          : ''
      }`,
      onConfirm: async () => {
        try {
          // Get the document URLs from the record
          const documentUrls = record.document_urls || [];
          
          if (documentUrls.length > 0) {
            // Clean up files first
            const cleanupResult = await documentManager.cleanupOrphanedFiles(documentUrls);
            
            if (!cleanupResult.success) {
              if (!confirm(`Some files could not be deleted from storage. Continue anyway?`)) {
                setShowDeleteConfirmation({ show: false });
                return;
              }
            }
          }
          
          // Remove from local state
          onRemoveRecord(index);
          setShowDeleteConfirmation({ show: false });
        } catch (error) {
          console.error('Error removing record:', error);
          alert('Failed to delete record. Please try again.');
          setShowDeleteConfirmation({ show: false });
        }
      }
    });
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
                disabled={documentManager.isProcessing}
              >
                {documentManager.isProcessing ? 'Processing...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl text-blue-700 font-medium flex items-center gap-2">
          <span>📁</span> Medical History
          {documentManager.pendingOperations.length > 0 && (
            <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded">
              {documentManager.pendingOperations.length} unsaved changes
            </span>
          )}
        </h2>
        <button
          onClick={() => setIsAddingRecord(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center gap-1"
        >
          <span>+</span> Add Record
        </button>
      </div>

      {/* Add New Record Form */}
      {isAddingRecord && (
        <div className="mb-6 bg-blue-50 p-5 rounded-xl border border-blue-100">
          <h3 className="text-lg font-medium text-blue-700 mb-4">Add New Medical Record</h3>
          
          <div className="space-y-4">
            {/* Date and Time */}
            <div>
              <label
                className="block text-sm font-medium text-blue-700 mb-1"
                htmlFor="timestamp"
              >
                Date and Time <span className="text-red-500">*</span>
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
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                value={currentRecord.notes || ""}
                onChange={handleRecordChange}
                rows={4}
                className="w-full px-3 py-2 border border-blue-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Enter notes about this visit..."
              />
            </div>

            {/* Documents preview */}
            {currentRecord.document_urls && currentRecord.document_urls.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-2">
                  Attached Documents
                </label>
                <div className="space-y-2 mb-3">
                  {currentRecord.document_urls.map((url, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center bg-white p-2 rounded border border-blue-100"
                    >
                      <div className="flex items-center">
                        <span className="text-lg mr-2">
                          {getFileIcon(url)}
                        </span>
                        <span className="text-sm truncate max-w-xs">
                          {url.split("/").pop()}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveDocumentFromCurrentRecord(idx)}
                        className="text-xs bg-red-100 hover:bg-red-200 text-red-500 px-2 py-1 rounded"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Document upload */}
            <div>
              <label className="block text-sm font-medium text-blue-700 mb-2">
                Add Documents
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
                  <span>📎</span> Attach Document
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
                disabled={documentManager.isProcessing}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRecord}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                disabled={documentManager.isProcessing}
              >
                {documentManager.isProcessing ? 'Processing...' : 'Add to History'}
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
              onRemove={() => handleRemoveRecord(index)}
              onUpdateDate={onUpdateRecordDate}
              onAddDocument={onAddDocument}
              onRemoveDocument={onRemoveDocument}
            />
          ))
        ) : (
          <div className="text-center py-10 bg-blue-50 rounded-xl">
            <div className="text-5xl mb-3">📋</div>
            <p className="text-blue-700 mb-2">No Medical Records Found</p>
            <p className="text-blue-500 mb-4">Add a new record to start tracking this patient's medical history</p>
            <button
              onClick={() => setIsAddingRecord(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              Add First Record
            </button>
          </div>
        )}
      </div>

      {/* Information Note */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-blue-700 text-sm">
          <span className="font-bold">Note:</span> Changes to medical history will be saved 
          when you click the "Save Changes" button at the top of the page.
        </p>
      </div>
    </div>
  );
};

export default MedicalHistorySection;