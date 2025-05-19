// src/models/Patient.ts
import mongoose, { Schema } from "mongoose";

// Create the Schema object with proper typing
const PatientSchema = new Schema(
  {
    name: { type: String, required: true },
    HN_code: { type: String, required: true },
    ID_code: { type: String },
    history: [
      {
        timestamp: { type: Date },
        document_urls: [{ type: String }],
        notes: { type: String }
      },
    ],
    lastVisit: { type: Date }
  },
  { timestamps: true }
);

// Add pre-save hook to update lastVisit based on history
PatientSchema.pre('save', function(next) {
  // Skip if this is a new patient with no history
  if (this.isNew && (!this.history || this.history.length === 0)) {
    // Set lastVisit to creation date if not already set
    if (!this.lastVisit) {
      this.lastVisit = this.createdAt || new Date();
    }
    return next();
  }
  
  // If there's history, set lastVisit to the latest history timestamp
  if (this.history && this.history.length > 0) {
    // Sort history records by timestamp (newest first)
    const sortedHistory = [...this.history].sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return dateB - dateA;
    });
    
    // Set lastVisit to the timestamp of the newest history record
    if (sortedHistory[0] && sortedHistory[0].timestamp) {
      this.lastVisit = sortedHistory[0].timestamp;
    }
  }
  
  next();
});

// Add an index on HN_code for better performance when sorting
PatientSchema.index({ HN_code: -1 });

// Export the Schema (not a model)
export default PatientSchema;