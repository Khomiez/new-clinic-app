// src/components/ui/EnhancedFileList.tsx - FIXED: Single confirmation delete with proper API calls
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
}) => {
  const [cloudinaryResources, setCloudinaryResources] = useState<CloudinaryResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfViewer, setPdfViewer] = useState<{
    isOpen: boolean;
    url: string;
    filename: string;
  }>({ isOpen: false, url: "", filename: "" });
  const [deletingUrls, setDeletingUrls] = useState<Set<string>>(new Set()); // Track deletion state

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

  // FIXED: Single confirmation delete with proper API integration
  const handleDelete = async (url: string, index: number) => {
    if (!onDeleteFile) return;

    const filename = getOriginalFilename(cloudinaryResources[index]);
    
    // FIXED: Single confirmation only
    if (!confirm(`Are you sure you want to delete "${filename}"? This action cannot be undone.`)) {
      return;
    }

    // Add URL to deleting set to show loading state
    setDeletingUrls(prev => new Set(prev).add(url));

    try {
      console.log('Starting file deletion:', { url, filename, clinicId });
      
      // FIXED: Delete from Cloudinary via API first
      const deleteResponse = await fetch(`/api/clinic/${clinicId}/files?url=${encodeURIComponent(url)}`, {
        method: 'DELETE',
      });

      const deleteResult = await deleteResponse.json();
      console.log('Delete API response:', deleteResult);

      if (!deleteResult.success) {
        throw new Error(deleteResult.error || 'Failed to delete file from storage');
      }

      // FIXED: Only call parent handler after successful API deletion
      onDeleteFile(url, index);
      
      console.log('File deletion successful');
      
    } catch (error: any) {
      console.error('Delete error:', error);
      alert(`Failed to delete file: ${error.message || 'Unknown error'}`);
    } finally {
      // Remove URL from deleting set
      setDeletingUrls(prev => {
        const newSet = new Set(prev);
        newSet.delete(url);
        return newSet;
      });
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
          const isDeleting = deletingUrls.has(resource.secure_url);

          console.log(`File ${index}:`, {
            url: resource.secure_url,
            context: resource.context,
            displayFilename,
            canPreview,
            isDeleting
          });

          return (
            <div key={index} className="relative">
              <div
                className={`
                flex items-center justify-between bg-white rounded-lg border border-blue-100 
                hover:border-blue-300 transition-colors
                ${compact ? "p-2" : "p-3"}
                ${isDeleting ? "opacity-50" : ""}
              `}
              >
                {/* File Info */}
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <span className={compact ? "text-lg" : "text-xl"}>
                    {isDeleting ? "⏳" : getFileIcon(displayFilename)}
                  </span>

                  <div className="flex-1 min-w-0">
                    <span
                      className={`text-gray-700 font-medium truncate block ${
                        compact ? "text-sm" : ""
                      }`}
                      title={displayFilename}
                    >
                      {displayFilename}
                    </span>
                    
                    {/* File metadata */}
                    <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                      <span>{resource.format?.toUpperCase() || 'FILE'}</span>
                      {resource.bytes && (
                        <>
                          <span>•</span>
                          <span>{formatFileSize(resource.bytes)}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>{new Date(resource.created_at).toLocaleDateString('th-TH')}</span>
                      {isDeleting && (
                        <>
                          <span>•</span>
                          <span className="text-red-500">Deleting...</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {showActions && (
                  <div className="flex items-center space-x-2">
                    {canPreview && !isDeleting && (
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
                    
                    {!isDeleting && (
                      <button
                        onClick={() => handleDownload(resource.secure_url, displayFilename)}
                        className={`bg-blue-100 text-blue-600 px-2 py-1 rounded hover:bg-blue-200 transition-colors ${
                          compact ? "text-xs" : "text-sm"
                        }`}
                        title="Download file"
                      >
                        Download
                      </button>
                    )}

                    {onDeleteFile && (
                      <button
                        onClick={() => handleDelete(resource.secure_url, index)}
                        disabled={isDeleting}
                        className={`bg-red-100 text-red-600 px-2 py-1 rounded hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          compact ? "text-xs" : "text-sm"
                        }`}
                        title={isDeleting ? "Deleting..." : "Delete file"}
                      >
                        {isDeleting ? "Deleting..." : "Delete"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default EnhancedFileList;