// src/hooks/useDocumentManager.ts
import { useState, useCallback } from "react";
import { extractPublicIdFromUrl } from "@/utils/cloudinaryUploader";

interface DocumentOperation {
  type: "add" | "remove";
  url: string;
  recordIndex?: number;
  documentIndex?: number;
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
    async (recordIndex: number, url: string, shouldCommit: boolean = true) => {
      // Add to UI immediately
      onAddDocument(recordIndex, url);

      // Track for potential rollback
      const operation: DocumentOperation = {
        type: "add",
        url,
        recordIndex,
      };

      setPendingOperations((prev) => [...prev, operation]);

      if (shouldCommit) {
        // Operation is committed, remove from pending
        setPendingOperations((prev) =>
          prev.filter((op) => !(op.type === "add" && op.url === url))
        );
      }

      return operation;
    },
    [onAddDocument]
  );

  // Remove document with proper cleanup
  const removeDocumentWithCleanup = useCallback(
    async (
      recordIndex: number,
      documentIndex: number,
      url: string,
      shouldDeleteFromStorage: boolean = true
    ) => {
      setIsProcessing(true);

      try {
        if (shouldDeleteFromStorage) {
          // Delete from Cloudinary first
          const response = await fetch(
            `/api/clinic/${clinicId}/files?url=${encodeURIComponent(url)}`,
            { method: "DELETE" }
          );

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to delete from storage");
          }
        }

        // Remove from UI
        onRemoveDocument(recordIndex, documentIndex);

        return true;
      } catch (error) {
        console.error("Error removing document:", error);
        throw error;
      } finally {
        setIsProcessing(false);
      }
    },
    [onRemoveDocument, clinicId]
  );

  // Rollback pending operations (for cancel scenarios)
  const rollbackPendingOperations = useCallback(async () => {
    setIsProcessing(true);

    try {
      for (const operation of pendingOperations) {
        if (operation.type === "add") {
          // Delete newly added files from Cloudinary
          const response = await fetch(
            `/api/clinic/${clinicId}/files?url=${encodeURIComponent(
              operation.url
            )}`,
            { method: "DELETE" }
          );

          if (!response.ok) {
            console.warn(`Failed to cleanup file: ${operation.url}`);
          }
        }
      }
    } catch (error) {
      console.error("Error during rollback:", error);
    } finally {
      setPendingOperations([]);
      setIsProcessing(false);
    }
  }, [pendingOperations, clinicId]);

  // Commit all pending operations
  const commitPendingOperations = useCallback(() => {
    setPendingOperations([]);
  }, []);

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
    removeDocumentWithCleanup,
    rollbackPendingOperations,
    commitPendingOperations,
    cleanupOrphanedFiles,
    isProcessing,
    pendingOperations,
  };
};
