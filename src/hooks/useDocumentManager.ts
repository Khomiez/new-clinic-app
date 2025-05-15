// src/hooks/useDocumentManager.ts - Updated to avoid client-side Cloudinary imports
import { useState, useCallback } from "react";

export interface DocumentOperation {
  type: "add" | "remove" | "remove_record";
  url: string;
  recordIndex: number;
  documentIndex?: number; // Only for single document removal
  recordDocuments?: string[]; // For record removal, store all URLs
  id: string; // Unique ID for tracking
  timestamp: number;
  // New properties to track operation lifecycle
  isTemporary?: boolean; // For operations within the same session
  addedInSession?: boolean; // Track if this was added in current session
}

interface UseDocumentManagerProps {
  onAddDocument: (recordIndex: number, url: string) => void;
  onRemoveDocument: (recordIndex: number, documentIndex: number) => void;
  clinicId: string;
}

export const useDocumentManager = ({
  onAddDocument,
  onRemoveDocument,
  clinicId,
}: UseDocumentManagerProps) => {
  const [pendingOperations, setPendingOperations] = useState<
    DocumentOperation[]
  >([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Track document additions for potential rollback
  const addDocumentWithRollback = useCallback(
    async (recordIndex: number, url: string, shouldCommit: boolean = false) => {
      // Create unique operation ID
      const operationId = `add_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // Add to UI immediately
      onAddDocument(recordIndex, url);

      // Track for potential rollback
      const operation: DocumentOperation = {
        id: operationId,
        type: "add",
        url,
        recordIndex,
        timestamp: Date.now(),
        addedInSession: true, // Mark as added in this session
      };

      setPendingOperations((prev) => [...prev, operation]);

      if (shouldCommit) {
        // Operation is committed, remove from pending
        setPendingOperations((prev) =>
          prev.filter((op) => op.id !== operationId)
        );
      }

      return operation;
    },
    [onAddDocument]
  );

  // Remove document with DEFERRED cleanup (don't delete from Cloudinary yet)
  const removeDocumentWithDeferred = useCallback(
    async (recordIndex: number, documentIndex: number, url: string) => {
      setIsProcessing(true);

      try {
        // Create unique operation ID
        const operationId = `remove_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`;

        // Remove from UI immediately
        onRemoveDocument(recordIndex, documentIndex);

        // Check if this document was added in the same session
        const wasAddedInSession = pendingOperations.some(
          op => op.type === "add" && op.url === url && op.addedInSession
        );

        // Track for potential restoration/cleanup
        const operation: DocumentOperation = {
          id: operationId,
          type: "remove",
          url,
          recordIndex,
          documentIndex,
          timestamp: Date.now(),
          addedInSession: wasAddedInSession, // Track if it was added in this session
        };

        setPendingOperations((prev) => [...prev, operation]);

        return operation;
      } catch (error) {
        console.error("Error removing document:", error);
        throw error;
      } finally {
        setIsProcessing(false);
      }
    },
    [onRemoveDocument, pendingOperations]
  );

  // NEW: Mark record for deferred deletion
  const markRecordForDeletion = useCallback(
    async (
      recordIndex: number,
      documentUrls: string[]
    ): Promise<DocumentOperation> => {
      const operationId = `remove_record_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // Check which documents were added in this session
      const operationWithSessionInfo: DocumentOperation = {
        id: operationId,
        type: "remove_record",
        url: "", // Not applicable for record operations
        recordIndex,
        recordDocuments: documentUrls.map(url => {
          const wasAddedInSession = pendingOperations.some(
            op => op.type === "add" && op.url === url && op.addedInSession
          );
          return url;
        }),
        timestamp: Date.now(),
      };

      setPendingOperations((prev) => [...prev, operationWithSessionInfo]);
      return operationWithSessionInfo;
    },
    [pendingOperations]
  );

  // Actually delete from Cloudinary (when saving) - using API call
  const deleteFromCloudinary = useCallback(
    async (url: string) => {
      try {
        const response = await fetch(
          `/api/clinic/${clinicId}/files?url=${encodeURIComponent(url)}`,
          { method: "DELETE" }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to delete from storage");
        }

        return true;
      } catch (error) {
        console.error("Error deleting from Cloudinary:", error);
        throw error;
      }
    },
    [clinicId]
  );

  // Enhanced rollback pending operations (for cancel scenarios)
  const rollbackPendingOperations = useCallback(async () => {
    setIsProcessing(true);

    try {
      // Group operations by URL to handle add-then-remove scenarios
      const operationsByUrl = new Map<string, DocumentOperation[]>();
      
      pendingOperations.forEach(op => {
        if (op.url) { // Skip record operations which don't have URLs
          const ops = operationsByUrl.get(op.url) || [];
          ops.push(op);
          operationsByUrl.set(op.url, ops);
        }
      });

      // Process each URL's operations
      for (const [url, operations] of operationsByUrl) {
        const addOp = operations.find(op => op.type === "add");
        const removeOp = operations.find(op => op.type === "remove");

        if (addOp && removeOp) {
          // File was added then removed in the same session
          // Need to delete from Cloudinary since it was uploaded
          try {
            await deleteFromCloudinary(url);
            console.log(`Cleaned up file that was added then removed: ${url}`);
          } catch (error) {
            console.warn(`Failed to cleanup file during rollback: ${url}`, error);
          }
        } else if (addOp && !removeOp) {
          // File was only added, need to delete
          try {
            await deleteFromCloudinary(url);
            console.log(`Cleaned up added file during rollback: ${url}`);
          } catch (error) {
            console.warn(`Failed to cleanup added file during rollback: ${url}`, error);
          }
        }
        // If only removeOp exists, the file was not uploaded in this session,
        // so we don't need to delete it from Cloudinary
      }

      // Handle record removal operations
      for (const operation of pendingOperations) {
        if (operation.type === "remove_record" && operation.recordDocuments) {
          // For each document in the record, check if it was added in this session
          for (const url of operation.recordDocuments) {
            const wasAddedInSession = pendingOperations.some(
              op => op.type === "add" && op.url === url && op.addedInSession
            );
            
            if (wasAddedInSession) {
              try {
                await deleteFromCloudinary(url);
                console.log(`Cleaned up record document that was added in session: ${url}`);
              } catch (error) {
                console.warn(`Failed to cleanup record document during rollback: ${url}`, error);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error during rollback:", error);
    } finally {
      setPendingOperations([]);
      setIsProcessing(false);
    }
  }, [pendingOperations, deleteFromCloudinary]);

  // Rest of the methods remain the same
  const commitPendingOperations = useCallback(async () => {
    setIsProcessing(true);
    const errors: string[] = [];

    try {
      // Process all operations
      for (const operation of pendingOperations) {
        if (operation.type === "remove") {
          // Single document removal - only delete if not added in this session
          if (!operation.addedInSession) {
            try {
              await deleteFromCloudinary(operation.url);
            } catch (error) {
              console.error(`Failed to delete ${operation.url}:`, error);
              errors.push(operation.url);
            }
          }
        } else if (operation.type === "remove_record") {
          // Record removal - delete all associated documents
          if (operation.recordDocuments) {
            for (const url of operation.recordDocuments) {
              // Check if this document was added in this session
              const wasAddedInSession = pendingOperations.some(
                op => op.type === "add" && op.url === url && op.addedInSession
              );
              
              if (!wasAddedInSession) {
                try {
                  await deleteFromCloudinary(url);
                } catch (error) {
                  console.error(`Failed to delete ${url}:`, error);
                  errors.push(url);
                }
              }
            }
          }
        }
        // Note: "add" operations don't need commit action - they're already in Cloudinary
      }

      // Clear all pending operations
      setPendingOperations([]);

      if (errors.length > 0) {
        throw new Error(
          `Failed to delete ${errors.length} file(s) from storage`
        );
      }
    } catch (error) {
      console.error("Error committing operations:", error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [pendingOperations, deleteFromCloudinary]);

  // Cleanup orphaned files immediately (for immediate deletions like patient deletion)
  const cleanupOrphanedFiles = useCallback(async (urls: string[]) => {
    if (urls.length === 0) return { success: true, errors: [] };

    try {
      const response = await fetch("/api/upload/batch-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error cleaning up orphaned files:", error);
      return { success: false, error: error };
    }
  }, []);

  // Helper to check if operation exists
  const hasPendingOperation = useCallback(
    (url: string) => pendingOperations.some((op) => op.url === url),
    [pendingOperations]
  );

  // Helper to check if a record is marked for deletion
  const isRecordMarkedForDeletion = useCallback(
    (recordIndex: number) =>
      pendingOperations.some(
        (op) => op.type === "remove_record" && op.recordIndex === recordIndex
      ),
    [pendingOperations]
  );

  // Helper to get pending record operations
  const getPendingRecordOperations = useCallback(
    () => pendingOperations.filter((op) => op.type === "remove_record"),
    [pendingOperations]
  );

  const removePendingOperation = useCallback((operationId: string) => {
    setPendingOperations((prev) => prev.filter((op) => op.id !== operationId));
  }, []);

  // Helper to remove pending record deletion (for undo functionality)
  const removePendingRecordDeletion = useCallback((recordIndex: number) => {
    setPendingOperations((prev) =>
      prev.filter(
        (op) => !(op.type === "remove_record" && op.recordIndex === recordIndex)
      )
    );
  }, []);

  return {
    addDocumentWithRollback,
    removeDocumentWithDeferred,
    markRecordForDeletion,
    rollbackPendingOperations,
    commitPendingOperations,
    cleanupOrphanedFiles,
    isProcessing,
    pendingOperations,
    hasPendingOperation,
    isRecordMarkedForDeletion,
    getPendingRecordOperations,
    removePendingOperation,
    removePendingRecordDeletion,
  };
};