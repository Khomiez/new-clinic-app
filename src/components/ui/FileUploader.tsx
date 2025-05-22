// src/components/ui/FileUploader.tsx - Simplified file uploader
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
}

export default function FileUploader({
  clinicId,
  patientId,
  onUploadComplete,
  onUploadError,
  onCancel,
  maxSizeMB = 10,
  allowedTypes = "image/*,.pdf,.doc,.docx,.xls,.xlsx"
}: FileUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      const error = `File size exceeds ${maxSizeMB}MB limit`;
      onUploadError?.(error);
      return;
    }

    setSelectedFile(file);
    await uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("clinicId", clinicId);
      if (patientId) formData.append("patientId", patientId);

      // Progress simulation
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const data = await response.json();
      if (data.success && data.file?.url) {
        onUploadComplete(data.file.url);
        resetUploader();
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error: any) {
      onUploadError?.(error.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const resetUploader = () => {
    setSelectedFile(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCancel = () => {
    resetUploader();
    onCancel?.();
  };

  return (
    <div className="w-full">
      {/* Upload Area */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-blue-700 mb-2">
          Upload Document
        </label>
        
        <div className="flex items-center justify-center w-full">
          <label className={`
            flex flex-col items-center justify-center w-full h-32 
            border-2 border-dashed rounded-lg cursor-pointer
            ${isUploading 
              ? "border-blue-300 bg-blue-50 opacity-50 pointer-events-none" 
              : "border-blue-300 bg-blue-50 hover:bg-blue-100"
            }
          `}>
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <span className="text-3xl mb-2">📄</span>
              
              {selectedFile ? (
                <div className="text-center">
                  <p className="text-sm font-medium text-blue-700">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-blue-500">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-blue-700 mb-2">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-blue-500">
                    Max: {maxSizeMB}MB
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
              disabled={isUploading}
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
              Uploading... {progress}%
            </span>
            <button
              onClick={handleCancel}
              className="text-xs text-red-600 hover:text-red-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={handleCancel}
          className="px-4 py-2 text-blue-600 hover:text-blue-800 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}