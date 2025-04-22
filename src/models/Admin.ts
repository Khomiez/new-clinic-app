import { IAdmin } from '@/interfaces';
import mongoose from 'mongoose';

const AdminSchema = new mongoose.Schema<IAdmin>(
    {
        username: { type: String, required: true },
        password: { type: String, required: true },
        managedClinics: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Clinic'
        }],
    },
    { collection: 'admins' }
);

export default mongoose.models.Admin || mongoose.model<IAdmin>('Admin', AdminSchema);