// src/components/ui/EnhancedFileList.tsx - NEW FILE
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
}) => {
  const [cloudinaryResources, setCloudinaryResources] = useState<
    CloudinaryResource[]
  >([]);
  const [loading, setLoading] = useState(true);
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

        // Get all clinic resources from your API
        const response = await fetch(`/api/clinic/${clinicId}/files`);
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
              // Fallback for URLs without metadata
              return {
                public_id: `fallback_${Date.now()}`,
                secure_url: url,
                format: "unknown",
                resource_type: "auto",
                created_at: new Date().toISOString(),
                context: {},
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
                context: {},
              } as CloudinaryResource)
          );

          setCloudinaryResources(fallbackResources);
        }
      } catch (error) {
        console.error("Error fetching file metadata:", error);

        // Fallback: create basic resources from URLs
        const fallbackResources = fileUrls.map(
          (url, index) =>
            ({
              public_id: `error_fallback_${index}`,
              secure_url: url,
              format: "unknown",
              resource_type: "auto",
              created_at: new Date().toISOString(),
              context: {},
            } as CloudinaryResource)
        );

        setCloudinaryResources(fallbackResources);
      } finally {
        setLoading(false);
      }
    };

    fetchFileMetadata();
  }, [fileUrls, clinicId]);

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          // THIS IS THE KEY: Use getOriginalFilename to get Thai filename
          const displayFilename = getOriginalFilename(resource);

          console.log(`File ${index}:`, {
            url: resource.secure_url,
            context: resource.context,
            displayFilename,
          });

          return (
            <div key={index} className="relative">
              <div
                className={`
                flex items-center justify-between bg-white rounded-lg border border-blue-100 
                hover:border-blue-300 transition-colors
                ${compact ? "p-2" : "p-3"}
              `}
              >
                {/* File Info */}
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <span className={compact ? "text-lg" : "text-xl"}>
                    {getFileIcon(displayFilename)}
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
                  </div>
                </div>

                {/* Actions - Only Download and Delete */}
                {showActions && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() =>
                        handleDownload(resource.secure_url, displayFilename)
                      }
                      className={`bg-blue-100 text-blue-600 px-2 py-1 rounded hover:bg-blue-200 transition-colors ${
                        compact ? "text-xs" : "text-sm"
                      }`}
                      title="Download / Open in new tab"
                    >
                      Download
                    </button>

                    {onDeleteFile && (
                      <button
                        onClick={() => onDeleteFile(resource.secure_url, index)}
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
          );
        })}
      </div>
    </>
  );
};

export default EnhancedFileList;
