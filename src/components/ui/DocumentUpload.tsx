// src/components/ui/DocumentUpload.tsx
import React, { useState, useRef } from 'react';

interface DocumentUploadProps {
  onAddDocument: (url: string) => void;
  onCancel: () => void;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({ 
  onAddDocument, 
  onCancel 
}) => {
  const [documentUrl, setDocumentUrl] = useState<string>('');
  const [documentName, setDocumentName] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  // This is a placeholder function - in a real app, you would integrate
  // with your file storage service (AWS S3, Firebase Storage, etc.)
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);
    
    if (!documentUrl.trim()) {
      setUploadError('Please enter a document URL');
      return;
    }
    
    // Basic URL validation
    try {
      new URL(documentUrl); // Will throw if not a valid URL
    } catch (error) {
      setUploadError('Please enter a valid URL');
      return;
    }
    
    setIsUploading(true);
    
    try {
      // Here's where you would normally upload the file to your storage
      // For this demo, we'll just use the provided URL
      
      // Simulate an API call with a slight delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      onAddDocument(documentUrl);
      setDocumentUrl('');
      setDocumentName('');
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError('Failed to add document. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };
  
  return (
    <div className="p-4 bg-white rounded-lg border border-blue-100 shadow-sm">
      <h3 className="text-md font-medium text-blue-700 mb-3">
        Add Document
      </h3>
      
      <form onSubmit={handleUpload} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            Document URL <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={documentUrl}
            onChange={(e) => setDocumentUrl(e.target.value)}
            placeholder="https://example.com/file.pdf"
            className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Enter the full URL to the document
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            Display Name (Optional)
          </label>
          <input
            type="text"
            value={documentName}
            onChange={(e) => setDocumentName(e.target.value)}
            placeholder="Medical Report"
            className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <p className="text-xs text-gray-500 mt-1">
            Leave empty to use the filename from URL
          </p>
        </div>
        
        {uploadError && (
          <div className="text-red-500 text-sm py-1 px-2 bg-red-50 rounded border border-red-100">
            {uploadError}
          </div>
        )}
        
        <div className="flex justify-end space-x-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-blue-600 hover:text-blue-800 transition"
            disabled={isUploading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition disabled:bg-blue-300"
            disabled={isUploading}
          >
            {isUploading ? 'Adding...' : 'Add Document'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DocumentUpload;