// src/redux/serialization.ts
import { Types } from 'mongoose';

/**
 * Converts any MongoDB ObjectId instances to strings within an object or array
 * This makes the data serializable for Redux
 */
export const serializeData = <T>(data: T): T => {
  if (!data) return data;

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => serializeData(item)) as unknown as T;
  }

  // Handle objects
  if (typeof data === 'object' && data !== null) {
    // Handle MongoDB ObjectId directly
    if (data instanceof Types.ObjectId) {
      return data.toString() as unknown as T;
    }

    // Handle Date objects
    if (data instanceof Date) {
      return data.toISOString() as unknown as T;
    }

    // Handle regular objects
    const result: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(data)) {
      // Convert ObjectId to string
      if (value instanceof Types.ObjectId) {
        result[key] = value.toString();
      } 
      // Convert Date to ISO string
      else if (value instanceof Date) {
        result[key] = value.toISOString();
      }
      // Recursively serialize nested objects/arrays
      else if (typeof value === 'object' && value !== null) {
        result[key] = serializeData(value);
      }
      // Keep primitive values as is
      else {
        result[key] = value;
      }
    }

    return result as unknown as T;
  }

  // Return primitive values as is
  return data;
};

/**
 * Prepares data for API submission by handling dates and ObjectIds
 */
export const prepareForApiSubmission = <T>(data: T): T => {
  return serializeData(data);
};