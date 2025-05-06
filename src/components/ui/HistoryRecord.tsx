import React from 'react';
import { IHistoryRecord } from '@/interfaces';

interface HistoryRecordProps {
  record: IHistoryRecord;
}

const HistoryRecord: React.FC<HistoryRecordProps> = ({ record }) => {
  // Format the date nicely
  const formatDate = (dateString: string | Date): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
      <div className="flex justify-between items-start mb-3">
        <div className="font-medium text-blue-700">
          {formatDate(record.timestamp)}
        </div>
        <div className="flex space-x-2">
          <button
            className="text-blue-500 hover:text-blue-700"
            title="Edit Record"
          >
            ✏️
          </button>
          <button
            className="text-red-500 hover:text-red-700"
            title="Delete Record"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Notes section */}
      {record.notes && (
        <div className="mb-3">
          <p className="text-sm text-gray-600">{record.notes}</p>
        </div>
      )}

      {/* Document links */}
      {record.document_urls && record.document_urls.length > 0 && (
        <div>
          <p className="text-xs text-blue-600 mb-2">Documents:</p>
          <div className="flex flex-wrap gap-2">
            {record.document_urls.map((url, idx) => {
              // Extract filename from URL
              const filename = url.split('/').pop() || `Document ${idx + 1}`;
              
              // Determine file type icon based on extension
              let icon = '📄'; // Default document icon
              if (url.endsWith('.pdf')) icon = '📕';
              if (url.endsWith('.jpg') || url.endsWith('.png') || url.endsWith('.jpeg')) icon = '🖼️';
              if (url.endsWith('.docx') || url.endsWith('.doc')) icon = '📝';
              
              return (
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs bg-white py-1 px-2 rounded border border-blue-200 hover:bg-blue-100 transition-colors"
                >
                  <span>{icon}</span>
                  <span className="truncate max-w-[120px]">{filename}</span>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryRecord;