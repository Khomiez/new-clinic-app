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

// Create the Schema object with proper typing
const PatientSchema = new Schema(
  {
    name: { 
      type: String, 
      required: [true, 'Patient name is required'],
      trim: true 
    },
    HN_code: { 
      type: String, 
      required: [true, 'Hospital Number (HN) is required'],
      unique: true,
      index: true  // Add index for faster queries
    },
    ID_code: { 
      type: String,
      trim: true,
      sparse: true // Allow multiple null/undefined values but enforce uniqueness when provided
    },
    history: [
      {
        timestamp: { 
          type: Date, 
          default: Date.now,
          required: [true, 'Timestamp is required for history records'] 
        },
        document_urls: [{ 
          type: String,
          validate: {
            validator: function(v: string) {
              // Basic URL validation
              return /^https?:\/\/.+/.test(v);
            },
            message: (props: ValidatorProps) => `${props.value} is not a valid URL`
          }
        }],
        notes: { 
          type: String,
          trim: true 
        }
      },
    ],
    lastVisit: { 
      type: Date,
      default: null
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true }, // Include virtuals when converting to JSON
    toObject: { virtuals: true } // Include virtuals when converting to object
  }
);

// Add index on HN_code for better performance when sorting
PatientSchema.index({ HN_code: 1 }, { unique: true });
PatientSchema.index({ name: 'text', ID_code: 'text' }); // Add text index for search

// Add a virtual for computing age if birthDate is added later
// PatientSchema.virtual('age').get(function() {
//   if (!this.birthDate) return null;
//   const ageDifMs = Date.now() - this.birthDate.getTime();
//   const ageDate = new Date(ageDifMs);
//   return Math.abs(ageDate.getUTCFullYear() - 1970);
// });

// Add pre-save middleware to update lastVisit when history is added
PatientSchema.pre('save', function(next) {
  if (this.isModified('history') && this.history && this.history.length > 0) {
    // Find the most recent timestamp
    const timestamps = this.history.map(h => h.timestamp).filter(Boolean);
    if (timestamps.length > 0) {
      const mostRecent = new Date(Math.max(...timestamps.map(d => d instanceof Date ? d.getTime() : new Date(d).getTime())));
      this.lastVisit = mostRecent;
    }
  }
  next();
});

// Add method to get patient's full history in chronological order
PatientSchema.methods.getChronologicalHistory = function() {
  if (!this.history || this.history.length === 0) return [];
  
  return [...this.history].sort((a, b) => {
    const dateA = new Date(a.timestamp).getTime();
    const dateB = new Date(b.timestamp).getTime();
    return dateB - dateA; // Sort in descending order (newest first)
  });
};

// Export the Schema (not a model)
export default PatientSchema;