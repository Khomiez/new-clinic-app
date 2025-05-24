// src/components/ui/EnhancedFileList.tsx - FIXED: Proper conditional styling for pending deletions
"use client";

import React, { useEffect, useState } from "react";
import { getOriginalFilename } from "@/utils/cloudinaryUploader";
import PDFViewer from "./PDFViewer";

interface EnhancedFileListProps {
  fileUrls: string[];
  clinicId: string;
  onDeleteFile?: (url: string, index: number) => void;
  showActions?: boolean;
  compact?: boolean;
  patientId?: string;
  // NEW: Optional prop to show which files are pending deletion
  pendingDeletions?: string[];
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

// Get appropriate icon for file type
function getFileIcon(filename: string): string {
  const name = filename.toLowerCase();

  if (name.endsWith(".pdf")) return "📕";
  if (name.match(/\.(jpg|jpeg|png|gif|webp)$/)) return "🖼️";
  if (name.match(/\.(doc|docx)$/)) return "📝";
  if (name.match(/\.(xls|xlsx|csv)$/)) return "📊";
  return "📄";
}

// Format file size for display
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
  pendingDeletions = [], // NEW: Track pending deletions
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
      if (!clinicId || fileUrls.length === 0) {
        setLoading(false);
        return;
      }

      try {
        console.log("Fetching metadata for clinic:", clinicId);
        console.log("File URLs:", fileUrls);

        // Build query parameters
        const queryParams = new URLSearchParams();
        if (patientId) {
          queryParams.append('patientId', patientId);
        }

        const response = await fetch(`/api/clinic/${clinicId}/files?${queryParams.toString()}`);
        const data = await response.json();

        console.log("API response:", data);

        if (data.success && data.files) {
          // Match URLs to resources
          const matchedResources = fileUrls.map((url) => {
            const resource = data.files.find(
              (resource: CloudinaryResource) => resource.secure_url === url
            );

            if (resource) {
              console.log("Found resource for URL:", url, resource);
              return resource;
            } else {
              console.log("No resource found for URL:", url, "using fallback");
              // Create fallback resource
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
          // Fallback: create basic resources from URLs
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
      } catch (error) {
        console.error("Error fetching file metadata:", error);
        setError("Failed to load file information");

        // Fallback: create basic resources from URLs
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

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleView = (url: string, filename: string) => {
    // Only show PDF viewer for PDF files
    if (filename.toLowerCase().endsWith('.pdf')) {
      setPdfViewer({ isOpen: true, url, filename });
    } else {
      // For other files, open in new tab
      window.open(url, '_blank');
    }
  };

  // FIXED: Only marks for deletion, no immediate Cloudinary deletion
  const handleDelete = async (url: string, index: number) => {
    if (!onDeleteFile) return;

    const filename = getOriginalFilename(cloudinaryResources[index]);
    
    // Single confirmation for marking deletion
    if (!confirm(`Mark "${filename}" for deletion? The file will be removed when you save changes.`)) {
      return;
    }

    console.log('Marking file for deletion (local only):', { url, filename });
    
    // NEW: Only call parent handler to mark for local deletion
    // NO Cloudinary API call here - that happens when saving
    onDeleteFile(url, index);
  };

  // Debug pending deletions
  console.log('EnhancedFileList Debug:', {
    fileUrls,
    pendingDeletions,
    resourcesCount: cloudinaryResources.length
  });

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

  if (cloudinaryResources.length === 0) {
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
        {cloudinaryResources.map((resource, index) => {
          // Use the enhanced getOriginalFilename function
          const displayFilename = getOriginalFilename(resource);
          const canPreview = displayFilename.toLowerCase().endsWith('.pdf') || 
                           resource.resource_type === 'image';
          
          // NEW: Check if this file is pending deletion
          const isPendingDeletion = pendingDeletions.includes(resource.secure_url);

          // Debug each file
          console.log(`File ${index} Debug:`, {
            url: resource.secure_url,
            displayFilename,
            isPendingDeletion,
            pendingDeletionsArray: pendingDeletions
          });

          return (
            <div key={index} className="relative">
              {/* FIXED: Corrected conditional styling with proper class separation */}
              <div
                className={`
                  flex items-center justify-between rounded-lg border transition-colors
                  ${compact ? "p-2" : "p-3"}
                  ${isPendingDeletion 
                    ? "border-red-300 bg-red-100 opacity-70" 
                    : "border-blue-100 bg-white hover:border-blue-300"
                  }
                `}
              >
                {/* File Info */}
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <span className={compact ? "text-lg" : "text-xl"}>
                    {isPendingDeletion ? "🗑️" : getFileIcon(displayFilename)}
                  </span>

                  <div className="flex-1 min-w-0">
                    <span
                      className={`font-medium truncate block ${
                        compact ? "text-sm" : ""
                      } ${isPendingDeletion ? "text-red-700 line-through" : "text-gray-700"}`}
                      title={displayFilename}
                    >
                      {displayFilename}
                    </span>
                    
                    {/* File metadata */}
                    <div className={`flex items-center space-x-2 text-xs mt-1 ${
                      isPendingDeletion ? "text-red-500" : "text-gray-500"
                    }`}>
                      <span>{resource.format?.toUpperCase() || 'FILE'}</span>
                      {resource.bytes && (
                        <>
                          <span>•</span>
                          <span>{formatFileSize(resource.bytes)}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>{new Date(resource.created_at).toLocaleDateString('th-TH')}</span>
                      {/* NEW: Show pending deletion status */}
                      {isPendingDeletion && (
                        <>
                          <span>•</span>
                          <span className="text-red-600 font-semibold bg-red-200 px-2 py-0.5 rounded-full">
                            PENDING DELETE
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
                    {!isPendingDeletion && (
                      <>
                        {canPreview && (
                          <button
                            onClick={() => handleView(resource.secure_url, displayFilename)}
                            className={`bg-green-100 text-green-600 px-2 py-1 rounded hover:bg-green-200 transition-colors ${
                              compact ? "text-xs" : "text-sm"
                            }`}
                            title="View file"
                          >
                            View
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleDownload(resource.secure_url, displayFilename)}
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
                    {onDeleteFile && (
                      <>
                        {isPendingDeletion ? (
                          <span className={`text-red-600 font-semibold px-3 py-1 bg-red-200 rounded ${
                            compact ? "text-xs" : "text-sm"
                          }`}>
                            Will Delete
                          </span>
                        ) : (
                          <button
                            onClick={() => handleDelete(resource.secure_url, index)}
                            className={`bg-red-100 text-red-600 px-2 py-1 rounded hover:bg-red-200 transition-colors ${
                              compact ? "text-xs" : "text-sm"
                            }`}
                            title="Mark for deletion"
                          >
                            Delete
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* ADDITIONAL: Overlay indicator for pending deletion */}
              {isPendingDeletion && (
                <div className="absolute top-0 right-0 -mt-2 -mr-2">
                  <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-full shadow-lg animate-pulse">
                    DELETE PENDING
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