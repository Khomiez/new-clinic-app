// src/components/ui/FileUploader.tsx
"use client";

import React, { useState, useRef } from "react";
import { toIdString } from "@/utils/mongoHelpers";

interface FileUploaderProps {
  clinicId: string;
  patientId?: string;
  onUploadComplete: (fileUrl: string) => void;
  onUploadError?: (error: string) => void;
  onCancel?: () => void;
  allowedTypes?: string; // e.g. "image/*,.pdf"
  maxSizeMB?: number; // Max file size in MB
}

const FileUploader: React.FC<FileUploaderProps> = ({
  clinicId,
  patientId,
  onUploadComplete,
  onUploadError,
  onCancel,
  allowedTypes = "image/*,.pdf,.doc,.docx,.xls,.xlsx",
  maxSizeMB = 10,
}) => {
  if (!clinicId) {
    if (onUploadError) {
      onUploadError("Clinic ID is required for file uploads");
    }
    return (
      <div className="w-full bg-red-50 p-4 rounded border border-red-200">
        <p className="text-red-600 text-sm">
          Clinic ID is required for file uploads.
        </p>
        {onCancel && (
          <button
            onClick={onCancel}
            className="mt-2 text-blue-600 text-sm hover:underline"
          >
            Cancel
          </button>
        )}
      </div>
    );
  }
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // Validate file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File size exceeds ${maxSizeMB}MB limit`);
      if (onUploadError)
        onUploadError(`File size exceeds ${maxSizeMB}MB limit`);
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      setProgress(10);

      // Create FormData
      const formData = new FormData();
      formData.append("file", file);
      formData.append("clinicId", clinicId);
      if (patientId) formData.append("patientId", patientId);

      // Create abort controller for cancellation
      const controller = new AbortController();
      setAbortController(controller);

      // Simulating upload progress with timeout (in real implementation, use XMLHttpRequest for actual progress)
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          const newProgress = Math.min(prev + 5, 90);
          return newProgress;
        });
      }, 200);

      // Upload file
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload file");
      }

      setProgress(100);

      const data = await response.json();

      if (data.success && data.file && data.file.url) {
        onUploadComplete(data.file.url);
      } else {
        throw new Error("Invalid response from server");
      }

      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err: any) {
      // Check if this is an abort error
      if (err.name === "AbortError") {
        setError("Upload cancelled");
        if (onUploadError) onUploadError("Upload cancelled");
      } else {
        setError(err.message || "Failed to upload file");
        if (onUploadError)
          onUploadError(err.message || "Failed to upload file");
      }
    } finally {
      setIsUploading(false);
      setAbortController(null);
    }
  };

  const handleCancel = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }

    // Reset states
    setIsUploading(false);
    setProgress(0);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (onCancel) onCancel();
  };

  return (
    <div className="w-full">
      <div className="mb-2">
        <label className="block mb-2 text-sm font-medium text-blue-700">
          Upload Document
        </label>

        <div className="flex items-center justify-center w-full">
          <label
            className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer
              ${
                error
                  ? "border-red-300 bg-red-50"
                  : "border-blue-300 bg-blue-50 hover:bg-blue-100"
              }
              ${isUploading ? "opacity-50 pointer-events-none" : ""}
            `}
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <span className="text-3xl mb-2">📄</span>
              <p className="mb-2 text-sm text-blue-700">
                <span className="font-semibold">Click to upload</span> or drag
                and drop
              </p>
              <p className="text-xs text-blue-500">
                {allowedTypes.split(",").join(", ")} (Max: {maxSizeMB}MB)
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
              accept={allowedTypes}
              disabled={isUploading}
            />
          </label>
        </div>
      </div>

      {isUploading && (
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-xs text-blue-700">Uploading... {progress}%</p>
            <button
              onClick={handleCancel}
              className="text-xs text-red-600 hover:text-red-800 py-1 px-2 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600 mt-1 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}
    </div>
  );
};

export default FileUploader;
