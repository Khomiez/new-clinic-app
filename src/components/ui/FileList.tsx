// STEP 1: Update your FileList component - src/components/ui/FileList.tsx
"use client";

import React, { useState } from "react";
import { getOriginalFilename } from "@/utils/cloudinaryUploader";
import PDFViewer from "./PDFViewer";

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

// THIS IS THE KEY FIX - Normalize different file input types
function normalizeFileInfo(file: string | FileInfo | CloudinaryResource): FileInfo {
  if (typeof file === "string") {
    // String URL
    return {
      url: file,
      filename: extractFilenameFromUrl(file),
      type: "file",
    };
  } else if ("secure_url" in file) {
    // Cloudinary resource - USE THE FIXED FUNCTION
    return {
      url: file.secure_url,
      filename: getOriginalFilename(file), // This will get the Thai filename from context
      type: file.resource_type === "image" ? "image" : "file",
    };
  } else {
    // FileInfo object
    return file;
  }
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

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
                </div>
              </div>

              {/* Actions - Only Download and Delete */}
              {showActions && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleDownload(file.url, file.filename)}
                    className={`bg-blue-100 text-blue-600 px-2 py-1 rounded hover:bg-blue-200 transition-colors ${
                      compact ? "text-xs" : "text-sm"
                    }`}
                    title="Download / Open in new tab"
                  >
                    Download
                  </button>

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



// STEP 3: Check how you're fetching and displaying files in your components
// Make sure you're passing the raw Cloudinary resources to FileList component
// The FileList component will then use getOriginalFilename() to display correct names