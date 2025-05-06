// src/utils/mongoHelpers.ts
import { Types } from "mongoose";

/**
 * Safely converts a string ID or ObjectId to a MongoDB ObjectId
 */
export const toObjectId = (id: string | Types.ObjectId | undefined): Types.ObjectId => {
  if (!id) {
    throw new Error('Invalid ID: ID is required');
  }

  if (typeof id === "string") {
    if (Types.ObjectId.isValid(id)) {
      return new Types.ObjectId(id);
    } else {
      throw new Error(`Invalid ObjectId format: ${id}`);
    }
  }

  return id;
};

/**
 * Safely converts an ObjectId to string
 */
export const toIdString = (id: Types.ObjectId | string | undefined): string => {
  if (!id) return "";
  return typeof id === "string" ? id : id.toString();
};

/**
 * Safely converts an array of IDs to ObjectIds
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
    .filter(id => id !== null && id !== undefined && Types.ObjectId.isValid(id.toString()))
    .map(id => toObjectId(id));
};