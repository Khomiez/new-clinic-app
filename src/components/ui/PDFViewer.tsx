// src/components/ui/PDFViewer.tsx - Enhanced with better Thai filename support
import React, { useState } from "react";

interface PDFViewerProps {
  url: string;
  filename: string;
  isOpen: boolean;
  onClose: () => void;
}

const PDFViewer: React.FC<PDFViewerProps> = ({
  url,
  filename,
  isOpen,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleIframeLoad = () => {
    setLoading(false);
  };

  const handleIframeError = () => {
    setLoading(false);
    setError("Failed to load PDF file");
  };

  // Ensure filename is properly decoded for Thai characters when downloading
  const downloadWithCorrectName = () => {
    const link = document.createElement("a");
    link.href = url;
    // Use the decoded filename for the download
    link.download = filename; // filename is already decoded in the FileList component
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl h-full max-h-[90vh] m-4 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-blue-100">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📕</span>
            <h3 className="text-lg font-medium text-blue-800 truncate" title={filename}>
              {filename}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-sm bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
            >
              Open in New Tab
            </a>
            <button
              onClick={downloadWithCorrectName}
              className="px-3 py-1.5 text-sm bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
            >
              Download
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              ❌
            </button>
          </div>
        </div>

        {/* PDF Content */}
        <div className="flex-1 relative overflow-hidden">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-blue-50">
              <div className="text-center">
                <div className="text-4xl mb-3 animate-spin">⏳</div>
                <p className="text-blue-600">Loading PDF...</p>
              </div>
            </div>
          )}

          {error ? (
            <div className="absolute inset-0 flex items-center justify-center bg-red-50">
              <div className="text-center">
                <div className="text-4xl mb-3">❌</div>
                <p className="text-red-600 mb-3">{error}</p>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Open in Browser
                </a>
              </div>
            </div>
          ) : (
            <iframe
              src={`${url}#toolbar=1&navpanes=1&scrollbar=1`}
              title={filename}
              className="w-full h-full border-0"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default PDFViewer;