// src/components/ui/FileList.tsx - Fixed for double-encoded Thai filenames
import React, { useState } from "react";
import PDFViewer from "./PDFViewer";
import {
  FileInfo,
  getFileIcon,
  isFileViewable,
  extractFileInfo,
} from "@/utils/fileHelpers";
import { 
  decodeThaiFilename, 
  containsEncodedThai,
  createSafeDownloadFilename
} from "@/utils/thaiFilenameFixUtils";

interface FileListProps {
  files: string[] | FileInfo[];
  onDeleteFile?: (fileUrl: string, index: number) => void;
  showActions?: boolean;
  compact?: boolean;
}

const FileList: React.FC<FileListProps> = ({
  files,
  onDeleteFile,
  showActions = true,
  compact = false,
}) => {
  const [pdfViewer, setPdfViewer] = useState<{
    isOpen: boolean;
    url: string;
    filename: string;
  }>({
    isOpen: false,
    url: "",
    filename: "",
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Process files to normalize and decode Thai filenames
  const processedFiles = files.map(file => {
    // Convert string URLs to FileInfo objects
    const fileInfo = typeof file === "string" ? extractFileInfo(file) : file;
    
    // Handle potential double-encoded Thai filenames
    if (containsEncodedThai(fileInfo.filename)) {
      return {
        ...fileInfo,
        filename: decodeThaiFilename(fileInfo.filename),
        originalEncoded: fileInfo.filename // Keep track of the original encoded version
      };
    }
    
    return fileInfo;
  });

  const handlePDFView = (url: string, filename: string) => {
    setPdfViewer({ isOpen: true, url, filename });
  };

  const closePDFViewer = () => {
    setPdfViewer({ isOpen: false, url: "", filename: "" });
  };

  const toggleImagePreview = (url: string) => {
    setImagePreview(imagePreview === url ? null : url);
  };

  const handleDownload = (url: string, filename: string) => {
    // Create safe filename for download (with proper Thai character handling)
    const safeFilename = createSafeDownloadFilename(filename);
    
    // Create download link
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', safeFilename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isImage = (filename: string, url: string) => {
    return (
      filename.match(/\.(jpg|jpeg|png|gif|webp)$/i) ||
      url.match(/\.(jpg|jpeg|png|gif|webp)/i)
    );
  };

  const isPDF = (filename: string, url: string) => {
    return filename.match(/\.pdf$/i) || url.includes(".pdf");
  };

  if (processedFiles.length === 0) {
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
        onClose={closePDFViewer}
      />

      <div className="space-y-2">
        {processedFiles.map((file, index) => {
          // Check if the file was originally encoded Thai
          const wasEncodedThai = (file as any).originalEncoded !== undefined;
          
          return (
            <div key={index} className="relative">
              <div
                className={`flex items-center justify-between bg-white p-3 rounded-lg border border-blue-100 hover:border-blue-300 transition-colors ${
                  compact ? "p-2" : "p-3"
                }`}
              >
                {/* File Info */}
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <span className={compact ? "text-lg" : "text-xl"}>
                    {getFileIcon(file.filename, file.url)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span
                      className={`text-gray-700 truncate block ${
                        compact ? "text-sm" : ""
                      }`}
                      title={file.filename} // Add title for hover text
                    >
                      {file.filename}
                    </span>
                    {!compact && file.size && (
                      <span className="text-xs text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    )}
                    {wasEncodedThai && (
                      <span className="text-xs text-blue-500">
                        Thai filename restored
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {showActions && (
                  <div className="flex items-center space-x-1">
                    {/* PDF View Button */}
                    {isPDF(file.filename, file.url) && (
                      <button
                        onClick={() => handlePDFView(file.url, file.filename)}
                        className={`bg-purple-100 text-purple-600 px-2 py-1 rounded hover:bg-purple-200 ${
                          compact ? "text-xs" : "text-sm"
                        }`}
                      >
                        📖 View
                      </button>
                    )}

                    {/* Image Preview Button */}
                    {isImage(file.filename, file.url) && (
                      <button
                        onClick={() => toggleImagePreview(file.url)}
                        className={`bg-green-100 text-green-600 px-2 py-1 rounded hover:bg-green-200 ${
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
                      className={`bg-blue-100 text-blue-600 px-2 py-1 rounded hover:bg-blue-200 ${
                        compact ? "text-xs" : "text-sm"
                      }`}
                    >
                      Open
                    </a>

                    {/* Download Button with Thai filename handling */}
                    <button
                      onClick={() => handleDownload(file.url, file.filename)}
                      className={`bg-gray-100 text-gray-600 px-2 py-1 rounded hover:bg-gray-200 ${
                        compact ? "text-xs" : "text-sm"
                      }`}
                    >
                      Download
                    </button>

                    {/* Delete Button */}
                    {onDeleteFile && (
                      <button
                        onClick={() => onDeleteFile(file.url, index)}
                        className={`bg-red-100 text-red-600 px-2 py-1 rounded hover:bg-red-200 ${
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
              {imagePreview === file.url && isImage(file.filename, file.url) && (
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
          );
        })}
      </div>
    </>
  );
};

export default FileList;