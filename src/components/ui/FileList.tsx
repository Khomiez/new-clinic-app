// src/components/ui/FileList.tsx - Fixed with proper filename display and simplified actions
"use client";

import React, { useState } from "react";
import { getOriginalFilename } from "@/utils/cloudinaryUploader";
import PDFViewer from "./PDFViewer";

// Updated FileInfo interface to match your needs
interface FileInfo {
  url: string;
  filename: string;
  type: string;
  size?: number;
  uploadedAt?: Date;
}

interface CloudinaryResource {
  public_id: string;
  secure_url: string;
  format: string;
  resource_type: string;
  created_at: string;
  original_filename?: string;
  context?: {
    [key: string]: string;
  };
  tags?: string[];
}

interface FileListProps {
  files: string[] | FileInfo[] | CloudinaryResource[];
  onDeleteFile?: (fileUrl: string, index: number) => void;
  showActions?: boolean;
  compact?: boolean;
}

// Get appropriate icon for file type
function getFileIcon(filename: string): string {
  const name = filename.toLowerCase();
  
  if (name.endsWith('.pdf')) return '📕';
  if (name.match(/\.(jpg|jpeg|png|gif|webp)$/)) return '🖼️';
  if (name.match(/\.(doc|docx)$/)) return '📝';
  if (name.match(/\.(xls|xlsx|csv)$/)) return '📊';
  return '📄';
}

// Check if file can be viewed in browser
function canPreviewFile(filename: string): boolean {
  const name = filename.toLowerCase();
  return name.endsWith('.pdf') || name.match(/\.(jpg|jpeg|png|gif|webp)$/) !== null;
}

// Format file size for display
function formatFileSize(bytes?: number): string {
  if (!bytes) return "";

  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

// Extract filename from URL as fallback
function extractFilenameFromUrl(url: string): string {
  try {
    const urlParts = url.split("/");
    let filename = urlParts[urlParts.length - 1].split("?")[0];
    
    // Try to decode URI components for Thai characters
    try {
      filename = decodeURIComponent(filename);
    } catch {
      // If decoding fails, use as-is
    }
    
    return filename || "Document";
  } catch {
    return "Document";
  }
}

// Normalize different file input types to a consistent format
function normalizeFileInfo(file: string | FileInfo | CloudinaryResource): FileInfo {
  if (typeof file === "string") {
    // String URL
    return {
      url: file,
      filename: extractFilenameFromUrl(file),
      type: "file",
    };
  } else if ("secure_url" in file) {
    // Cloudinary resource
    return {
      url: file.secure_url,
      filename: getOriginalFilename(file), // Use the fixed function from cloudinaryUploader
      type: file.resource_type === "image" ? "image" : "file",
    };
  } else {
    // FileInfo object
    return file;
  }
}

// Safe download with proper filename
function downloadFile(url: string, filename: string): void {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.target = "_blank"; // Open in new tab instead of download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function FileList({
  files,
  onDeleteFile,
  showActions = true,
  compact = false,
}: FileListProps) {
  const [pdfViewer, setPdfViewer] = useState<{
    isOpen: boolean;
    url: string;
    filename: string;
  }>({ isOpen: false, url: "", filename: "" });

  // Normalize all files to FileInfo objects
  const fileInfos = files.map(normalizeFileInfo);

  const handlePDFView = (url: string, filename: string) => {
    setPdfViewer({ isOpen: true, url, filename });
  };

  const handleDownload = (url: string, filename: string) => {
    downloadFile(url, filename);
  };

  if (fileInfos.length === 0) {
    return (
      <div className="bg-blue-50 p-3 rounded-lg text-center">
        <p className="text-gray-500 italic">No files attached</p>
      </div>
    );
  }

  return (
    <>
      {/* PDF Viewer Modal */}
      <PDFViewer
        url={pdfViewer.url}
        filename={pdfViewer.filename}
        isOpen={pdfViewer.isOpen}
        onClose={() => setPdfViewer({ isOpen: false, url: "", filename: "" })}
      />

      <div className="space-y-2">
        {fileInfos.map((file, index) => (
          <div key={index} className="relative">
            <div className={`
              flex items-center justify-between bg-white rounded-lg border border-blue-100 
              hover:border-blue-300 transition-colors
              ${compact ? "p-2" : "p-3"}
            `}>
              {/* File Info */}
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <span className={compact ? "text-lg" : "text-xl"}>
                  {getFileIcon(file.filename)}
                </span>
                
                <div className="flex-1 min-w-0">
                  <span
                    className={`text-gray-700 font-medium truncate block ${
                      compact ? "text-sm" : ""
                    }`}
                    title={file.filename}
                  >
                    {file.filename}
                  </span>
                  
                  {!compact && file.size && (
                    <span className="text-xs text-gray-500">
                      {formatFileSize(file.size)}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions - Only Download and Delete */}
              {showActions && (
                <div className="flex items-center space-x-2">
                  {/* Download (Opens in new tab) */}
                  <button
                    onClick={() => handleDownload(file.url, file.filename)}
                    className={`bg-blue-100 text-blue-600 px-2 py-1 rounded hover:bg-blue-200 transition-colors ${
                      compact ? "text-xs" : "text-sm"
                    }`}
                    title="Download / Open in new tab"
                  >
                    Download
                  </button>

                  {/* Delete */}
                  {onDeleteFile && (
                    <button
                      onClick={() => onDeleteFile(file.url, index)}
                      className={`bg-red-100 text-red-600 px-2 py-1 rounded hover:bg-red-200 transition-colors ${
                        compact ? "text-xs" : "text-sm"
                      }`}
                      title="Delete file"
                    >
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}