// src/utils/index.ts - Updated exports with proper type handling for isolatedModules
export * from './mongoHelpers';
export * from './paginationHelpers';
export * from './fileUtils';
export * from './getPatientModel';
export * from './cloudinaryConfig';

// Export temporary file storage utilities with proper type exports
export type {
  TemporaryFile,
  PendingUpload
} from './temporaryFileStorage';

export {
  createTemporaryFile,
  createFilePreviewUrl,
  revokeFilePreviewUrl,
  isTemporaryFileUrl,
  getFileExtension,
  validateFile,
  canPreviewFile
} from './temporaryFileStorage';