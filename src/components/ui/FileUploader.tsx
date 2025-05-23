// src/components/ui/FileUploader.tsx - Enhanced with proper error handling and cancellation
"use client";

import React, { useState, useRef } from "react";

interface FileUploaderProps {
  clinicId: string;
  patientId?: string;
  onUploadComplete: (fileUrl: string) => void;
  onUploadError?: (error: string) => void;
  onCancel?: () => void;
  maxSizeMB?: number;
  allowedTypes?: string;
  disabled?: boolean;
}

export default function FileUploader({
  clinicId,
  patientId,
  onUploadComplete,
  onUploadError,
  onCancel,
  maxSizeMB = 10,
  allowedTypes = "image/*,.pdf,.doc,.docx,.xls,.xlsx",
  disabled = false
}: FileUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const resetUploader = () => {
    setSelectedFile(null);
    setProgress(0);
    setUploadError(null);
    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `File size exceeds ${maxSizeMB}MB limit`;
    }

    // Check file type
    const allowedTypesArray = allowedTypes.split(',').map(type => type.trim());
    const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
    const isAllowed = allowedTypesArray.some(type => {
      if (type.includes('*')) {
        return file.type.startsWith(type.replace('*', ''));
      }
      return type === fileExtension || file.type === type;
    });

    if (!isAllowed) {
      return `File type not supported. Allowed types: ${allowedTypes}`;
    }

    return null;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setUploadError(validationError);
      onUploadError?.(validationError);
      return;
    }

    setSelectedFile(file);
    setUploadError(null);
    await uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    if (!clinicId) {
      const error = "Clinic ID is required for upload";
      setUploadError(error);
      onUploadError?.(error);
      return;
    }

    setIsUploading(true);
    setProgress(0);
    setUploadError(null);

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("clinicId", clinicId);
      if (patientId) formData.append("patientId", patientId);

      console.log('Starting upload:', {
        filename: file.name,
        size: file.size,
        type: file.type,
        clinicId,
        patientId
      });

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 200);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        signal: abortControllerRef.current.signal,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Upload failed with status ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success || !data.file?.url) {
        throw new Error(data.error || "Invalid response from server");
      }

      setProgress(100);
      
      console.log('Upload successful:', {
        url: data.file.url,
        filename: data.file.filename
      });

      onUploadComplete(data.file.url);
      resetUploader();
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Upload cancelled by user');
        setUploadError("Upload cancelled");
      } else {
        console.error('Upload error:', error);
        const errorMessage = error.message || "Upload failed";
        setUploadError(errorMessage);
        onUploadError?.(errorMessage);
      }
    } finally {
      setIsUploading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (isUploading && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    resetUploader();
    onCancel?.();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (disabled || isUploading) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const validationError = validateFile(file);
      if (validationError) {
        setUploadError(validationError);
        onUploadError?.(validationError);
        return;
      }
      setSelectedFile(file);
      setUploadError(null);
      uploadFile(file);
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
          Upload Document
        </label>
        
        <div
          className={`
            flex items-center justify-center w-full h-32 
            border-2 border-dashed rounded-lg cursor-pointer transition-colors
            ${isUploading || disabled
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
                {isUploading ? "⏳" : "📄"}
              </span>
              
              {selectedFile && !isUploading ? (
                <div className="text-center">
                  <p className="text-sm font-medium text-blue-700">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-blue-500">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              ) : isUploading ? (
                <div className="text-center">
                  <p className="text-sm font-medium text-blue-700">
                    Uploading: {selectedFile?.name}
                  </p>
                  <p className="text-xs text-blue-500">
                    {progress.toFixed(0)}% complete
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-blue-700 mb-2">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-blue-500">
                    Max: {maxSizeMB}MB • Types: {allowedTypes}
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
              disabled={disabled || isUploading}
            />
          </label>
        </div>
      </div>

      {/* Progress Bar */}
      {isUploading && (
        <div className="mb-4">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-blue-700">
              Uploading... {progress.toFixed(0)}%
            </span>
            <button
              onClick={handleCancel}
              className="text-xs text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50"
            >
              Cancel Upload
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
          disabled={isUploading}
          className="px-4 py-2 text-blue-600 hover:text-blue-800 transition disabled:opacity-50"
        >
          {isUploading ? "Cancel Upload" : "Cancel"}
        </button>
      </div>
    </div>
  );
}