import mongoose, { Schema } from "mongoose";

// Create the Schema object
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

// Export the Schema
export default PatientSchema;