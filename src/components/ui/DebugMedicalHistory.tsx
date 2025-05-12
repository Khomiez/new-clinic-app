// src/components/ui/DebugMedicalHistory.tsx - For debugging purposes
import React from 'react';
import { IHistoryRecord } from '@/interfaces';

interface DebugPanelProps {
  historyRecords: IHistoryRecord[];
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ historyRecords }) => {
  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg max-w-sm max-h-64 overflow-y-auto z-50">
      <h3 className="text-sm font-bold mb-2">Debug: Medical History</h3>
      <div className="text-xs">
        <p><strong>Records count:</strong> {historyRecords.length}</p>
        {historyRecords.map((record, index) => (
          <div key={index} className="mt-2 border-t border-gray-700 pt-2">
            <p><strong>Record {index}:</strong></p>
            <p>- Timestamp: {record.timestamp ? 'Present' : 'Missing'}</p>
            <p>- Notes: {record.notes ? `"${record.notes.substring(0, 20)}..."` : 'Empty'}</p>
            <p>- Documents: {record.document_urls?.length || 0}</p>
            {record.document_urls?.length > 0 && (
              <div className="ml-2">
                {record.document_urls.map((url, docIndex) => (
                  <p key={docIndex} className="text-xs">
                    {docIndex}: {url.split('/').pop()?.substring(0, 15)}...
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};