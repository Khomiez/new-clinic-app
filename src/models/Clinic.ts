// src/models/Clinic.ts
import { IClinic } from '@/interfaces';
import mongoose from 'mongoose';

const ClinicSchema = new mongoose.Schema<IClinic>(
    {
        name: { type: String, required: true },
        address: { type: String },
        phone: [{ type: String }],
        managerId: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admin'
        }],
        color: { 
            type: String, 
            required: false,
            validate: {
                validator: function(v: string) {
                    // Validate hex color format (#RRGGBB or #RGB)
                    return !v || /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
                },
                message: 'Color must be a valid hex color code (e.g., #3B82F6 or #FFF)'
            },
            default: '#3B82F6' // Default to blue if not specified
        },
    },
    { collection: 'clinics', timestamps: true }
);

export default mongoose.models.Clinic || mongoose.model<IClinic>('Clinic', ClinicSchema);