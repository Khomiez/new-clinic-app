// src/hooks/useDocumentManager.ts - Enhanced with better rollback functionality
import { useState, useCallback } from "react";
import { extractPublicIdFromUrl } from "@/utils/cloudinaryUploader";

export interface DocumentOperation {
  type: "add" | "remove";
  url: string;
  recordIndex: number;
  documentIndex?: number;
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
  const [pendingOperations, setPendingOperations] = useState<DocumentOperation[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Track document additions for potential rollback
  const addDocumentWithRollback = useCallback(
    async (recordIndex: number, url: string, shouldCommit: boolean = false) => {
      // Create unique operation ID
      const operationId = `add_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Add to UI immediately
      onAddDocument(recordIndex, url);

      // Track for potential rollback
      const operation: DocumentOperation = {
        id: operationId,
        type: "add",
        url,
        recordIndex,
        timestamp: Date.now()
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
        const operationId = `remove_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Remove from UI immediately
        onRemoveDocument(recordIndex, documentIndex);

        // Track for potential restoration/cleanup
        const operation: DocumentOperation = {
          id: operationId,
          type: "remove",
          url,
          recordIndex,
          documentIndex,
          timestamp: Date.now()
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

  // Actually delete from Cloudinary (when saving)
  const deleteFromCloudinary = useCallback(async (url: string) => {
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
  }, [clinicId]);

  // Rollback pending operations (for cancel scenarios)
  const rollbackPendingOperations = useCallback(async () => {
    setIsProcessing(true);

    try {
      // Sort operations by timestamp (newest first) for proper rollback
      const sortedOperations = [...pendingOperations].sort((a, b) => b.timestamp - a.timestamp);

      for (const operation of sortedOperations) {
        if (operation.type === "add") {
          // Delete newly added files from Cloudinary
          try {
            await deleteFromCloudinary(operation.url);
          } catch (error) {
            console.warn(`Failed to cleanup file during rollback: ${operation.url}`, error);
          }
        }
        // Note: We don't restore removed files since they're not actually deleted from Cloudinary yet
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
      // Process all remove operations (actually delete from Cloudinary)
      const removeOperations = pendingOperations.filter(op => op.type === "remove");
      
      for (const operation of removeOperations) {
        try {
          await deleteFromCloudinary(operation.url);
        } catch (error) {
          console.error(`Failed to delete ${operation.url}:`, error);
          errors.push(operation.url);
        }
      }

      // Clear all pending operations
      setPendingOperations([]);

      if (errors.length > 0) {
        throw new Error(`Failed to delete ${errors.length} file(s) from storage`);
      }
    } catch (error) {
      console.error("Error committing operations:", error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [pendingOperations, deleteFromCloudinary]);

  // Cleanup orphaned files when deleting records/patients
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

  return {
    addDocumentWithRollback,
    removeDocumentWithDeferred,
    rollbackPendingOperations,
    commitPendingOperations,
    cleanupOrphanedFiles,
    isProcessing,
    pendingOperations,
    // Helper to check if operation exists
    hasPendingOperation: useCallback((url: string) => 
      pendingOperations.some(op => op.url === url), [pendingOperations])
  };
};