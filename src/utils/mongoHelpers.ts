// utils/mongoHelpers.ts
import { Types } from "mongoose";

/**
 * Safely converts a string ID or ObjectId to a MongoDB ObjectId
 * @param id ID to convert (string or ObjectId)
 * @returns MongoDB ObjectId
 */
export const toObjectId = (
  id: string | Types.ObjectId | undefined
): Types.ObjectId => {
  if (!id) {
    return new Types.ObjectId(); // Generate new ObjectId if none provided
  }

  if (typeof id === "string") {
    // Validate the string is a valid ObjectId format before converting
    if (Types.ObjectId.isValid(id)) {
      return new Types.ObjectId(id);
    } else {
      console.warn(
        `Invalid ObjectId format: ${id}, creating new ObjectId instead`
      );
      return new Types.ObjectId();
    }
  }

  // If it's already an ObjectId, return it
  return id;
};

/**
 * Safely converts an ObjectId to string
 * @param id ObjectId to convert
 * @returns String representation of ObjectId
 */
export const toIdString = (id: Types.ObjectId | string | undefined): string => {
  if (!id) return "";

  if (typeof id === "string") {
    return id;
  }

  return id.toString();
};

/**
 * Validates if a string is a valid MongoDB ObjectId
 * @param id String to validate
 * @returns Boolean indicating if string is valid ObjectId
 */
export const isValidObjectIdString = (id: string | undefined): boolean => {
  if (!id) return false;
  return Types.ObjectId.isValid(id);
};

/**
 * Safely converts an array of IDs (strings or ObjectIds) to ObjectIds
 * @param ids Array of IDs to convert
 * @returns Array of MongoDB ObjectIds
 */
export const toObjectIdArray = (
  ids: Array<string | Types.ObjectId> | string | Types.ObjectId | undefined
): Types.ObjectId[] => {
  if (!ids) {
    return [];
  }

  // Handle single ID case
  if (!Array.isArray(ids)) {
    return [toObjectId(ids)];
  }

  // Filter out invalid IDs and convert valid ones
  return ids
    .filter((id) => id !== null && id !== undefined)
    .map((id) => toObjectId(id));
};
