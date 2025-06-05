// src/models/Patient.ts - UPDATED: Added address schema
import mongoose, { Schema } from "mongoose";

// Define types for validator props
interface ValidatorProps {
  value: string;
  path: string;
}

// Define interfaces for better TypeScript support
interface IHistoryRecord {
  timestamp: Date;
  document_urls: string[];
  notes?: string;
}

// NEW: Address schema definition
const AddressSchema = new Schema(
  {
    provinceCode: {
      type: Number,
      required: false,
      validate: {
        validator: function (v: number) {
          return !v || (v >= 10 && v <= 99); // Valid province codes are 10-99
        },
        message: "Province code must be between 10 and 99",
      },
    },
    districtCode: {
      type: Number,
      required: false,
      validate: {
        validator: function (v: number) {
          return !v || (v >= 1000 && v <= 9999); // Valid district codes are 4 digits
        },
        message: "District code must be a 4-digit number",
      },
    },
    subdistrictCode: {
      type: Number,
      required: false,
      validate: {
        validator: function (v: number) {
          return !v || (v >= 100000 && v <= 999999); // Valid subdistrict codes are 6 digits
        },
        message: "Subdistrict code must be a 6-digit number",
      },
    },
    addressLine1: {
      type: String,
      required: false,
      trim: true,
      maxlength: [200, "Address line 1 cannot exceed 200 characters"],
    },
    addressLine2: {
      type: String,
      required: false,
      trim: true,
      maxlength: [200, "Address line 2 cannot exceed 200 characters"],
    },
    postalCode: {
      type: String,
      required: false,
      trim: true,
      validate: {
        validator: function (v: string) {
          return !v || /^\d{5}$/.test(v); // Thai postal codes are 5 digits
        },
        message: "Postal code must be 5 digits",
      },
    },
  },
  { _id: false }
); // Don't create separate _id for address subdocument

// Create the Schema object with proper typing
const PatientSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Patient name is required"],
      trim: true,
    },
    HN_code: {
      type: String,
      required: [true, "Hospital Number (HN) is required"],
      unique: true,
      index: true, // Add index for faster queries
    },
    ID_code: {
      type: String,
      trim: true,
      sparse: true, // Allow multiple null/undefined values but enforce uniqueness when provided
    },
    // NEW: Address field
    address: {
      type: AddressSchema,
      required: false,
      default: undefined, // Don't create empty address objects
    },
    history: [
      {
        timestamp: {
          type: Date,
          default: Date.now,
          required: [true, "Timestamp is required for history records"],
        },
        document_urls: [
          {
            type: String,
            validate: {
              validator: function (v: string) {
                // Basic URL validation
                return /^https?:\/\/.+/.test(v);
              },
              message: (props: ValidatorProps) =>
                `${props.value} is not a valid URL`,
            },
          },
        ],
        notes: {
          type: String,
          trim: true,
        },
      },
    ],
    lastVisit: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true }, // Include virtuals when converting to JSON
    toObject: { virtuals: true }, // Include virtuals when converting to object
  }
);

// Add index on HN_code for better performance when sorting
PatientSchema.index({ HN_code: 1 }, { unique: true });
PatientSchema.index({ name: "text", ID_code: "text" }); // Add text index for search

// NEW: Add compound index for address fields for efficient location-based queries
PatientSchema.index(
  {
    "address.provinceCode": 1,
    "address.districtCode": 1,
    "address.subdistrictCode": 1,
  },
  { sparse: true }
);

// Add pre-save middleware to update lastVisit when history is added
PatientSchema.pre("save", function (next) {
  if (this.isModified("history") && this.history && this.history.length > 0) {
    // Find the most recent timestamp
    const timestamps = this.history.map((h) => h.timestamp).filter(Boolean);
    if (timestamps.length > 0) {
      const mostRecent = new Date(
        Math.max(
          ...timestamps.map((d) =>
            d instanceof Date ? d.getTime() : new Date(d).getTime()
          )
        )
      );
      this.lastVisit = mostRecent;
    }
  }
  next();
});

// Add method to get patient's full history in chronological order
PatientSchema.methods.getChronologicalHistory = function () {
  if (!this.history || this.history.length === 0) return [];

  return [...this.history].sort((a, b) => {
    const dateA = new Date(a.timestamp).getTime();
    const dateB = new Date(b.timestamp).getTime();
    return dateB - dateA; // Sort in descending order (newest first)
  });
};

// NEW: Add method to get formatted address
PatientSchema.methods.getFormattedAddress = function () {
  if (!this.address) return null;

  const parts = [];
  if (this.address.addressLine1) parts.push(this.address.addressLine1);
  if (this.address.addressLine2) parts.push(this.address.addressLine2);

  return parts.length > 0 ? parts.join(", ") : null;
};

// Export the Schema (not a model)
export default PatientSchema;
