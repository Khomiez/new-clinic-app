// src/components/ui/FileUploader.tsx
"use client";

import React, { useState, useRef } from 'react';
import { IClinic } from '@/interfaces';
import { toIdString } from '@/utils/mongoHelpers';

interface FileUploaderProps {
  clinicId: string;
  patientId?: string;
  onUploadComplete?: (fileUrl: string) => void;
  onUploadError?: (error: string) => void;
  allowedTypes?: string; // e.g. "image/*,.pdf"
  maxSizeMB?: number; // Max file size in MB
}

const FileUploader: React.FC<FileUploaderProps> = ({
  clinicId,
  patientId,
  onUploadComplete,
  onUploadError,
  allowedTypes = "image/*,.pdf,.doc,.docx,.xls,.xlsx",
  maxSizeMB = 10
}) => {
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Validate file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File size exceeds ${maxSizeMB}MB limit`);
      if (onUploadError) onUploadError(`File size exceeds ${maxSizeMB}MB limit`);
      return;
    }
    
    try {
      setIsUploading(true);
      setError(null);
      setProgress(10);
      
      // Create FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('clinicId', clinicId);
      if (patientId) formData.append('patientId', patientId);
      
      // Simulating upload progress (real progress requires XMLHttpRequest)
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 300);
      
      // Upload file
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      
      clearInterval(progressInterval);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload file');
      }
      
      setProgress(100);
      
      const data = await response.json();
      
      if (onUploadComplete) onUploadComplete(data.file.url);
      
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
    } catch (err: any) {
      setError(err.message || 'Failed to upload file');
      if (onUploadError) onUploadError(err.message || 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
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
              ${error ? 'border-red-300 bg-red-50' : 'border-blue-300 bg-blue-50 hover:bg-blue-100'}
              ${isUploading ? 'opacity-50 pointer-events-none' : ''}
            `}
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <span className="text-3xl mb-2">📄</span>
              <p className="mb-2 text-sm text-blue-700">
                <span className="font-semibold">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-blue-500">
                {allowedTypes.split(',').join(', ')} (Max: {maxSizeMB}MB)
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
        <div className="w-full bg-gray-200 rounded-full h-2.5 my-2">
          <div 
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out" 
            style={{ width: `${progress}%` }}
          ></div>
          <p className="text-xs text-blue-700 text-center mt-1">Uploading... {progress}%</p>
        </div>
      )}
      
      {error && (
        <div className="text-sm text-red-600 mt-1">
          {error}
        </div>
      )}
    </div>
  );
};

export default FileUploader;