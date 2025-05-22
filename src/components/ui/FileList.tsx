// src/components/ui/FileList.tsx - Simplified file display component
"use client";

import React, { useState } from "react";
import { 
  createFileInfo, 
  getFileIcon, 
  canPreviewFile, 
  downloadFile,
  FileInfo 
} from "@/utils/fileUtils";
import PDFViewer from "./PDFViewer";

interface FileListProps {
  files: string[] | FileInfo[];
  onDeleteFile?: (fileUrl: string, index: number) => void;
  showActions?: boolean;
  compact?: boolean;
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
  
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Normalize files to FileInfo objects
  const fileInfos = files.map(file => 
    typeof file === "string" ? createFileInfo(file) : file
  );

  const handlePDFView = (url: string, filename: string) => {
    setPdfViewer({ isOpen: true, url, filename });
  };

  const handleDownload = (url: string, filename: string) => {
    downloadFile(url, filename);
  };

  const toggleImagePreview = (url: string) => {
    setImagePreview(prev => prev === url ? null : url);
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
                  {getFileIcon(file.filename, file.url)}
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
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              {showActions && (
                <div className="flex items-center space-x-2">
                  {/* Preview Actions */}
                  {file.type === "application/pdf" && (
                    <button
                      onClick={() => handlePDFView(file.url, file.filename)}
                      className={`bg-purple-100 text-purple-600 px-2 py-1 rounded hover:bg-purple-200 transition-colors ${
                        compact ? "text-xs" : "text-sm"
                      }`}
                    >
                      📖 View
                    </button>
                  )}

                  {file.type === "image" && (
                    <button
                      onClick={() => toggleImagePreview(file.url)}
                      className={`bg-green-100 text-green-600 px-2 py-1 rounded hover:bg-green-200 transition-colors ${
                        compact ? "text-xs" : "text-sm"
                      }`}
                    >
                      {imagePreview === file.url ? "Hide" : "View"}
                    </button>
                  )}

                  {/* Open in New Tab */}
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`bg-blue-100 text-blue-600 px-2 py-1 rounded hover:bg-blue-200 transition-colors ${
                      compact ? "text-xs" : "text-sm"
                    }`}
                  >
                    Open
                  </a>

                  {/* Download */}
                  <button
                    onClick={() => handleDownload(file.url, file.filename)}
                    className={`bg-gray-100 text-gray-600 px-2 py-1 rounded hover:bg-gray-200 transition-colors ${
                      compact ? "text-xs" : "text-sm"
                    }`}
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
                    >
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Image Preview */}
            {imagePreview === file.url && file.type === "image" && (
              <div className="mt-2 p-2 bg-gray-100 rounded-lg">
                <img
                  src={file.url}
                  alt={file.filename}
                  className="max-w-full max-h-64 object-contain mx-auto border border-gray-300 rounded"
                />
                <button
                  onClick={() => setImagePreview(null)}
                  className="mt-2 mx-auto block text-sm bg-gray-200 text-gray-600 px-2 py-1 rounded hover:bg-gray-300"
                >
                  Close Preview
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}