// src/hooks/useDocumentManager.ts - Enhanced with record-level deferred deletion
import { useState, useCallback } from "react";
import { extractPublicIdFromUrl } from "@/utils/cloudinaryUploader";

export interface DocumentOperation {
  type: "add" | "remove" | "remove_record";
  url: string;
  recordIndex: number;
  documentIndex?: number; // Only for single document removal
  recordDocuments?: string[]; // For record removal, store all URLs
  id: string; // Unique ID for tracking
  timestamp: number;
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

        // Track for potential restoration/cleanup
        const operation: DocumentOperation = {
          id: operationId,
          type: "remove",
          url,
          recordIndex,
          documentIndex,
          timestamp: Date.now(),
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
    [onRemoveDocument]
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

      const operation: DocumentOperation = {
        id: operationId,
        type: "remove_record",
        url: "", // Not applicable for record operations
        recordIndex,
        recordDocuments: documentUrls,
        timestamp: Date.now(),
      };

      setPendingOperations((prev) => [...prev, operation]);
      return operation;
    },
    []
  );

  // Actually delete from Cloudinary (when saving)
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

  // Rollback pending operations (for cancel scenarios)
  const rollbackPendingOperations = useCallback(async () => {
    setIsProcessing(true);

    try {
      // Sort operations by timestamp (newest first) for proper rollback
      const sortedOperations = [...pendingOperations].sort(
        (a, b) => b.timestamp - a.timestamp
      );

      for (const operation of sortedOperations) {
        if (operation.type === "add") {
          // Delete newly added files from Cloudinary
          try {
            await deleteFromCloudinary(operation.url);
          } catch (error) {
            console.warn(
              `Failed to cleanup file during rollback: ${operation.url}`,
              error
            );
          }
        }
        // Note: We don't restore removed files since they're not actually deleted from Cloudinary yet
        // Note: We don't restore removed records since they're not actually deleted yet
      }
    } catch (error) {
      console.error("Error during rollback:", error);
    } finally {
      setPendingOperations([]);
      setIsProcessing(false);
    }
  }, [pendingOperations, deleteFromCloudinary]);

  // Commit all pending operations (when saving)
  const commitPendingOperations = useCallback(async () => {
    setIsProcessing(true);
    const errors: string[] = [];

    try {
      // Process all operations
      for (const operation of pendingOperations) {
        if (operation.type === "remove") {
          // Single document removal
          try {
            await deleteFromCloudinary(operation.url);
          } catch (error) {
            console.error(`Failed to delete ${operation.url}:`, error);
            errors.push(operation.url);
          }
        } else if (operation.type === "remove_record") {
          // Record removal - delete all associated documents
          if (operation.recordDocuments) {
            for (const url of operation.recordDocuments) {
              try {
                await deleteFromCloudinary(url);
              } catch (error) {
                console.error(`Failed to delete ${url}:`, error);
                errors.push(url);
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
