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

// Add an index on HN_code for better performance when sorting
PatientSchema.index({ HN_code: -1 });

// Export the Schema (not a model)
export default PatientSchema;