// src/components/ui/FileUploader.tsx - UPDATED: Store files temporarily instead of immediate upload
"use client";

import React, { useState, useRef } from "react";
import { createTemporaryFile, validateFile, TemporaryFile } from "@/utils/temporaryFileStorage";

interface FileUploaderProps {
  clinicId: string;
  patientId?: string;
  recordIndex: number; // NEW: Required for temporary storage
  onFileAdded: (tempFile: TemporaryFile) => void; // NEW: Changed from onUploadComplete
  onUploadError?: (error: string) => void;
  onCancel?: () => void;
  maxSizeMB?: number;
  allowedTypes?: string;
  disabled?: boolean;
}

export default function FileUploader({
  clinicId,
  patientId,
  recordIndex, // NEW: Track which record this file belongs to
  onFileAdded, // NEW: Just add to temporary storage
  onUploadError,
  onCancel,
  maxSizeMB = 10,
  allowedTypes = "image/*,.pdf,.doc,.docx,.xls,.xlsx",
  disabled = false
}: FileUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetUploader = () => {
    setSelectedFile(null);
    setUploadError(null);
    setIsProcessing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateFile(file, maxSizeMB);
    if (validationError) {
      setUploadError(validationError);
      onUploadError?.(validationError);
      return;
    }

    setSelectedFile(file);
    setUploadError(null);
    await processFile(file);
  };

  // NEW: Process file for temporary storage instead of uploading
  const processFile = async (file: File) => {
    if (!clinicId) {
      const error = "Clinic ID is required";
      setUploadError(error);
      onUploadError?.(error);
      return;
    }

    setIsProcessing(true);
    setUploadError(null);

    try {
      console.log('Processing file for temporary storage:', {
        filename: file.name,
        size: file.size,
        type: file.type,
        recordIndex,
        clinicId
      });

      // NEW: Create temporary file object instead of uploading
      const tempFile = createTemporaryFile(file, recordIndex);
      
      console.log('Created temporary file:', tempFile);

      // NEW: Call parent handler with temporary file
      onFileAdded(tempFile);
      resetUploader();
    } catch (error: any) {
      console.error('File processing error:', error);
      const errorMessage = error.message || "File processing failed";
      setUploadError(errorMessage);
      onUploadError?.(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    resetUploader();
    onCancel?.();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (disabled || isProcessing) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const validationError = validateFile(file, maxSizeMB);
      if (validationError) {
        setUploadError(validationError);
        onUploadError?.(validationError);
        return;
      }
      setSelectedFile(file);
      setUploadError(null);
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <div className="w-full">
      {/* Upload Area */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-blue-700 mb-2">
          Add Document
        </label>
        
        <div
          className={`
            flex items-center justify-center w-full h-32 
            border-2 border-dashed rounded-lg cursor-pointer transition-colors
            ${isProcessing || disabled
              ? "border-blue-300 bg-blue-50 opacity-50 cursor-not-allowed" 
              : "border-blue-300 bg-blue-50 hover:bg-blue-100"
            }
            ${uploadError ? "border-red-300 bg-red-50" : ""}
          `}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <label className="cursor-pointer flex flex-col items-center w-full h-full justify-center">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <span className="text-3xl mb-2">
                {isProcessing ? "⏳" : "📄"}
              </span>
              
              {selectedFile && !isProcessing ? (
                <div className="text-center">
                  <p className="text-sm font-medium text-blue-700">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-blue-500">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              ) : isProcessing ? (
                <div className="text-center">
                  <p className="text-sm font-medium text-blue-700">
                    Processing: {selectedFile?.name}
                  </p>
                  <p className="text-xs text-blue-500">
                    Adding to temporary storage...
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-blue-700 mb-2">
                    <span className="font-semibold">Click to select</span> or drag and drop
                  </p>
                  <p className="text-xs text-blue-500">
                    Max: {maxSizeMB}MB • Types: {allowedTypes}
                  </p>
                  <p className="text-xs text-blue-400 mt-1">
                    ⚠️ File will be uploaded when you save changes
                  </p>
                </>
              )}
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept={allowedTypes}
              onChange={handleFileSelect}
              disabled={disabled || isProcessing}
            />
          </label>
        </div>
      </div>

      {/* Processing Indicator */}
      {isProcessing && (
        <div className="mb-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-blue-700">
              Processing file for temporary storage...
            </span>
            <button
              onClick={handleCancel}
              className="text-xs text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {uploadError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <span className="text-red-500 mr-2">⚠️</span>
            <span className="text-sm text-red-700">{uploadError}</span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={handleCancel}
          disabled={isProcessing}
          className="px-4 py-2 text-blue-600 hover:text-blue-800 transition disabled:opacity-50"
        >
          {isProcessing ? "Cancel Processing" : "Cancel"}
        </button>
      </div>
    </div>
  );
}