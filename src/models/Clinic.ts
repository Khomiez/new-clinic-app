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
    },
    { collection: 'clinics' }
);
export default mongoose.models.Clinic || mongoose.model<IClinic>('Clinic', ClinicSchema);