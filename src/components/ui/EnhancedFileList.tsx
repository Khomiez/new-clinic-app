// src/components/ui/EnhancedFileList.tsx - UPDATED: Support for temporary files and pending uploads
"use client";

import React, { useEffect, useState } from "react";
import { getOriginalFilename } from "@/utils/cloudinaryUploader";
import { TemporaryFile, isTemporaryFileUrl, createFilePreviewUrl } from "@/utils/temporaryFileStorage";
import { formatFileSize } from "@/utils/fileUtils";
import PDFViewer from "./PDFViewer";

interface EnhancedFileListProps {
  fileUrls: string[];
  clinicId: string;
  onDeleteFile?: (url: string, index: number) => void;
  showActions?: boolean;
  compact?: boolean;
  patientId?: string;
  pendingDeletions?: string[];
  // NEW: Support for temporary files
  temporaryFiles?: TemporaryFile[];
  onDeleteTemporaryFile?: (tempFileId: string) => void;
}

interface CloudinaryResource {
  public_id: string;
  secure_url: string;
  format: string;
  resource_type: string;
  created_at: string;
  bytes?: number;
  original_filename?: string;
  context?: {
    [key: string]: any;
  };
  tags?: string[];
}

// NEW: Combined file interface for display
interface DisplayFile {
  id: string;
  url: string;
  filename: string;
  size?: number;
  type: 'cloudinary' | 'temporary';
  format?: string;
  created_at: string;
  isTemporary: boolean;
  isPendingDeletion?: boolean;
  tempFile?: TemporaryFile;
}

// Get appropriate icon for file type
function getFileIcon(filename: string): string {
  const name = filename.toLowerCase();

  if (name.endsWith(".pdf")) return "📕";
  if (name.match(/\.(jpg|jpeg|png|gif|webp)$/)) return "🖼️";
  if (name.match(/\.(doc|docx)$/)) return "📝";
  if (name.match(/\.(xls|xlsx|csv)$/)) return "📊";
  return "📄";
}

// Extract filename from URL as fallback
function extractFilenameFromUrl(url: string): string {
  try {
    const urlParts = url.split("/");
    let filename = urlParts[urlParts.length - 1].split("?")[0];
    
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

const EnhancedFileList: React.FC<EnhancedFileListProps> = ({
  fileUrls,
  clinicId,
  onDeleteFile,
  showActions = true,
  compact = false,
  patientId,
  pendingDeletions = [],
  temporaryFiles = [], // NEW: Temporary files array
  onDeleteTemporaryFile, // NEW: Handler for deleting temporary files
}) => {
  const [cloudinaryResources, setCloudinaryResources] = useState<CloudinaryResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfViewer, setPdfViewer] = useState<{
    isOpen: boolean;
    url: string;
    filename: string;
  }>({ isOpen: false, url: "", filename: "" });

  useEffect(() => {
    const fetchFileMetadata = async () => {
      if (!clinicId || (fileUrls.length === 0 && temporaryFiles.length === 0)) {
        setLoading(false);
        return;
      }

      try {
        // Only fetch Cloudinary resources if we have actual URLs
        if (fileUrls.length > 0) {
          console.log("Fetching metadata for clinic:", clinicId);
          console.log("File URLs:", fileUrls);

          const queryParams = new URLSearchParams();
          if (patientId) {
            queryParams.append('patientId', patientId);
          }

          const response = await fetch(`/api/clinic/${clinicId}/files?${queryParams.toString()}`);
          const data = await response.json();

          console.log("API response:", data);

          if (data.success && data.files) {
            const matchedResources = fileUrls.map((url) => {
              const resource = data.files.find(
                (resource: CloudinaryResource) => resource.secure_url === url
              );

              if (resource) {
                console.log("Found resource for URL:", url, resource);
                return resource;
              } else {
                console.log("No resource found for URL:", url, "using fallback");
                return {
                  public_id: `fallback_${Date.now()}`,
                  secure_url: url,
                  format: "unknown",
                  resource_type: "auto",
                  created_at: new Date().toISOString(),
                  context: {
                    original_filename: extractFilenameFromUrl(url)
                  },
                } as CloudinaryResource;
              }
            });

            setCloudinaryResources(matchedResources);
          } else {
            const fallbackResources = fileUrls.map(
              (url, index) =>
                ({
                  public_id: `fallback_${index}_${Date.now()}`,
                  secure_url: url,
                  format: "unknown",
                  resource_type: "auto",
                  created_at: new Date().toISOString(),
                  context: {
                    original_filename: extractFilenameFromUrl(url)
                  },
                } as CloudinaryResource)
            );

            setCloudinaryResources(fallbackResources);
          }
        } else {
          setCloudinaryResources([]);
        }
      } catch (error) {
        console.error("Error fetching file metadata:", error);
        setError("Failed to load file information");

        const fallbackResources = fileUrls.map(
          (url, index) =>
            ({
              public_id: `error_fallback_${index}`,
              secure_url: url,
              format: "unknown",
              resource_type: "auto",
              created_at: new Date().toISOString(),
              context: {
                original_filename: extractFilenameFromUrl(url)
              },
            } as CloudinaryResource)
        );

        setCloudinaryResources(fallbackResources);
      } finally {
        setLoading(false);
      }
    };

    fetchFileMetadata();
  }, [fileUrls, clinicId, patientId]);

  // NEW: Combine Cloudinary resources and temporary files for display
  const displayFiles: DisplayFile[] = [
    // Existing Cloudinary files
    ...cloudinaryResources.map((resource, index) => ({
      id: resource.public_id,
      url: resource.secure_url,
      filename: getOriginalFilename(resource),
      size: resource.bytes,
      type: 'cloudinary' as const,
      format: resource.format,
      created_at: resource.created_at,
      isTemporary: false,
      isPendingDeletion: pendingDeletions.includes(resource.secure_url),
    })),
    // NEW: Temporary files
    ...temporaryFiles.map((tempFile) => ({
      id: tempFile.id,
      url: createFilePreviewUrl(tempFile.file),
      filename: tempFile.filename,
      size: tempFile.size,
      type: 'temporary' as const,
      format: tempFile.file.name.split('.').pop() || 'file',
      created_at: new Date(tempFile.timestamp).toISOString(),
      isTemporary: true,
      isPendingDeletion: false,
      tempFile,
    }))
  ];

  const handleDownload = (displayFile: DisplayFile) => {
    if (displayFile.isTemporary && displayFile.tempFile) {
      // For temporary files, trigger download of the actual file
      const link = document.createElement("a");
      link.href = displayFile.url;
      link.download = displayFile.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // For Cloudinary files, use the regular download method
      const link = document.createElement("a");
      link.href = displayFile.url;
      link.download = displayFile.filename;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleView = (displayFile: DisplayFile) => {
    // Show PDF viewer for PDF files or open in new tab for images
    if (displayFile.filename.toLowerCase().endsWith('.pdf')) {
      setPdfViewer({ isOpen: true, url: displayFile.url, filename: displayFile.filename });
    } else {
      window.open(displayFile.url, '_blank');
    }
  };

  const handleDelete = async (displayFile: DisplayFile, index: number) => {
    if (displayFile.isTemporary) {
      // NEW: Handle temporary file deletion
      if (!onDeleteTemporaryFile) return;

      if (!confirm(`Remove "${displayFile.filename}" from the record? This temporary file will be discarded.`)) {
        return;
      }

      console.log('Removing temporary file:', displayFile.id);
      onDeleteTemporaryFile(displayFile.id);
    } else {
      // Handle regular file deletion (mark for deletion)
      if (!onDeleteFile) return;

      if (!confirm(`Mark "${displayFile.filename}" for deletion? The file will be removed when you save changes.`)) {
        return;
      }

      console.log('Marking file for deletion (local only):', { url: displayFile.url, filename: displayFile.filename });
      onDeleteFile(displayFile.url, index);
    }
  };

  if (loading) {
    return (
      <div className="bg-blue-50 p-3 rounded-lg text-center">
        <div className="flex items-center justify-center space-x-2">
          <span className="animate-spin">⏳</span>
          <span className="text-blue-600 text-sm">Loading files...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-3 rounded-lg text-center border border-red-200">
        <div className="flex items-center justify-center space-x-2">
          <span className="text-red-500">⚠️</span>
          <span className="text-red-600 text-sm">{error}</span>
        </div>
      </div>
    );
  }

  if (displayFiles.length === 0) {
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
        {displayFiles.map((displayFile, index) => {
          const canPreview = displayFile.filename.toLowerCase().endsWith('.pdf') || 
                           displayFile.format === 'jpg' || displayFile.format === 'png' || 
                           displayFile.format === 'gif' || displayFile.format === 'webp' ||
                           (displayFile.tempFile?.type.startsWith('image/'));

          return (
            <div key={displayFile.id} className="relative">
              <div
                className={`
                  flex items-center justify-between rounded-lg border transition-colors
                  ${compact ? "p-2" : "p-3"}
                  ${displayFile.isPendingDeletion 
                    ? "border-red-300 bg-red-100 opacity-70" 
                    : displayFile.isTemporary
                    ? "border-orange-300 bg-orange-50"
                    : "border-blue-100 bg-white hover:border-blue-300"
                  }
                `}
              >
                {/* File Info */}
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <span className={compact ? "text-lg" : "text-xl"}>
                    {displayFile.isPendingDeletion ? "🗑️" : 
                     displayFile.isTemporary ? "📤" : 
                     getFileIcon(displayFile.filename)}
                  </span>

                  <div className="flex-1 min-w-0">
                    <span
                      className={`font-medium truncate block ${
                        compact ? "text-sm" : ""
                      } ${displayFile.isPendingDeletion ? "text-red-700 line-through" : 
                           displayFile.isTemporary ? "text-orange-700" : "text-gray-700"}`}
                      title={displayFile.filename}
                    >
                      {displayFile.filename}
                    </span>
                    
                    {/* File metadata */}
                    <div className={`flex items-center space-x-2 text-xs mt-1 ${
                      displayFile.isPendingDeletion ? "text-red-500" : 
                      displayFile.isTemporary ? "text-orange-500" : "text-gray-500"
                    }`}>
                      <span>{displayFile.format?.toUpperCase() || 'FILE'}</span>
                      {displayFile.size && (
                        <>
                          <span>•</span>
                          <span>{formatFileSize(displayFile.size)}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>{new Date(displayFile.created_at).toLocaleDateString('th-TH')}</span>
                      
                      {/* Status indicators */}
                      {displayFile.isPendingDeletion && (
                        <>
                          <span>•</span>
                          <span className="text-red-600 font-semibold bg-red-200 px-2 py-0.5 rounded-full">
                            PENDING DELETE
                          </span>
                        </>
                      )}
                      {displayFile.isTemporary && (
                        <>
                          <span>•</span>
                          <span className="text-orange-600 font-semibold bg-orange-200 px-2 py-0.5 rounded-full">
                            PENDING UPLOAD
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {showActions && (
                  <div className="flex items-center space-x-2">
                    {/* Only show preview/download if not pending deletion */}
                    {!displayFile.isPendingDeletion && (
                      <>
                        {canPreview && (
                          <button
                            onClick={() => handleView(displayFile)}
                            className={`bg-green-100 text-green-600 px-2 py-1 rounded hover:bg-green-200 transition-colors ${
                              compact ? "text-xs" : "text-sm"
                            }`}
                            title="View file"
                          >
                            View
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleDownload(displayFile)}
                          className={`bg-blue-100 text-blue-600 px-2 py-1 rounded hover:bg-blue-200 transition-colors ${
                            compact ? "text-xs" : "text-sm"
                          }`}
                          title="Download file"
                        >
                          Download
                        </button>
                      </>
                    )}

                    {/* Delete button or pending status */}
                    {(onDeleteFile || onDeleteTemporaryFile) && (
                      <>
                        {displayFile.isPendingDeletion ? (
                          <span className={`text-red-600 font-semibold px-3 py-1 bg-red-200 rounded ${
                            compact ? "text-xs" : "text-sm"
                          }`}>
                            Will Delete
                          </span>
                        ) : (
                          <button
                            onClick={() => handleDelete(displayFile, index)}
                            className={`bg-red-100 text-red-600 px-2 py-1 rounded hover:bg-red-200 transition-colors ${
                              compact ? "text-xs" : "text-sm"
                            }`}
                            title={displayFile.isTemporary ? "Remove temporary file" : "Mark for deletion"}
                          >
                            {displayFile.isTemporary ? "Remove" : "Delete"}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Status overlay indicators */}
              {displayFile.isPendingDeletion && (
                <div className="absolute top-0 right-0 -mt-2 -mr-2">
                  <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-full shadow-lg animate-pulse">
                    DELETE PENDING
                  </div>
                </div>
              )}
              
              {displayFile.isTemporary && (
                <div className="absolute top-0 right-0 -mt-2 -mr-2">
                  <div className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full shadow-lg animate-pulse">
                    UPLOAD PENDING
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
};

export default EnhancedFileList;