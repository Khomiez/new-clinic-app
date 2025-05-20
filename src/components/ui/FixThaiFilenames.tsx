// src/components/FixThaiFilenames.tsx - Quick fix component for Thai filenames
import React from 'react';

// Simple function to decode double-encoded Thai filenames
const decodeDoubleEncodedThai = (encodedName: string): string => {
  if (!encodedName) return 'Document';
  
  // Check for typical double-encoded Thai pattern %25E0%25B8... 
  // where %25 is the encoded form of % character
  if (encodedName.includes('%25')) {
    try {
      // First decode once to get %E0%B8...
      const firstDecode = decodeURIComponent(encodedName);
      // Second decode to get actual Thai characters
      if (firstDecode.includes('%')) {
        try {
          return decodeURIComponent(firstDecode);
        } catch (e) {
          return firstDecode;
        }
      }
      return firstDecode;
    } catch (e) {
      console.error('Failed to decode Thai filename:', e);
      return encodedName;
    }
  }
  
  // Handle regular encoding
  if (encodedName.includes('%')) {
    try {
      return decodeURIComponent(encodedName);
    } catch (e) {
      return encodedName;
    }
  }
  
  return encodedName;
};

// Component to wrap around file displays
interface ThaiFilenameFixProps {
  children: React.ReactNode;
  filename: string;
  className?: string;
  showDebug?: boolean;
}

export const ThaiFilenameFix: React.FC<ThaiFilenameFixProps> = ({ 
  children, 
  filename,
  className = '',
  showDebug = false
}) => {
  // Decode the filename
  const decodedName = decodeDoubleEncodedThai(filename);
  const wasEncoded = decodedName !== filename;
  
  return (
    <div className={className}>
      {children}
      
      {/* Replace or append the filename */}
      {wasEncoded && (
        <div className="mt-1">
          <span className="text-sm font-medium">{decodedName}</span>
          {showDebug && (
            <span className="text-xs text-blue-500 ml-2">(Thai filename fixed)</span>
          )}
        </div>
      )}
    </div>
  );
};

// Simplest fix - just display the decoded filename
interface DisplayThaiFilenameProps {
  filename: string;
  className?: string;
}

export const DisplayThaiFilename: React.FC<DisplayThaiFilenameProps> = ({
  filename,
  className = ''
}) => {
  const decodedName = decodeDoubleEncodedThai(filename);
  
  return (
    <span className={className} title={decodedName}>
      {decodedName}
    </span>
  );
};

// Export the decoder function for direct use
export { decodeDoubleEncodedThai };