// redux/serialization.ts
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

    // Handle regular objects
    const result: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(data)) {
      // Convert ObjectId to string
      if (value instanceof Types.ObjectId) {
        result[key] = value.toString();
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
 * Prepares data for API submission by converting date objects to ISO strings
 * and serializing MongoDB ObjectIds to strings
 */
export const prepareForApiSubmission = <T>(data: T): T => {
  if (!data) return data;

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => prepareForApiSubmission(item)) as unknown as T;
  }

  // Handle objects
  if (typeof data === 'object' && data !== null) {
    // Handle Date objects
    if (data instanceof Date) {
      return data.toISOString() as unknown as T;
    }
    
    // Handle MongoDB ObjectId directly
    if (data instanceof Types.ObjectId) {
      return data.toString() as unknown as T;
    }

    // Handle regular objects
    const result: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(data)) {
      // Convert Date to ISO string
      if (value instanceof Date) {
        result[key] = value.toISOString();
      }
      // Convert ObjectId to string
      else if (value instanceof Types.ObjectId) {
        result[key] = value.toString();
      } 
      // Recursively prepare nested objects/arrays
      else if (typeof value === 'object' && value !== null) {
        result[key] = prepareForApiSubmission(value);
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