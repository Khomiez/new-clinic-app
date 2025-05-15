// src/app/api/admin/route.ts - Updated with automatic clinic relationship
import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/db";
import { Admin, Clinic } from "@/models";
import { isValidObjectId, Types } from "mongoose";

// Get all admins or a specific admin
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        await dbConnect();

        // If ID provided, return a specific admin
        if (id) {
            if (!isValidObjectId(id)) {
                return NextResponse.json(
                    { success: false, error: "Invalid ID format" },
                    { status: 400 }
                );
            }

            const admin = await Admin.findById(id)
                .populate("managedClinics")
                .select("-password"); // Don't include password

            if (!admin) {
                return NextResponse.json(
                    { success: false, error: "Admin not found" },
                    { status: 404 }
                );
            }

            return NextResponse.json({ success: true, admin });
        }

        // Otherwise return all admins
        const admins = await Admin.find({})
            .populate("managedClinics")
            .select("-password"); // Don't include passwords
            
        return NextResponse.json({ success: true, admins });
    } catch (error) {
        console.error("Error fetching admin(s):", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch admin data" },
            { status: 500 }
        );
    }
}

// Create a new admin with automatic clinic relationship establishment
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate required fields
        if (!body.username || !body.password) {
            return NextResponse.json(
                { success: false, error: "Username and password are required" },
                { status: 400 }
            );
        }

        // Validate managedClinics if provided
        if (body.managedClinics && !Array.isArray(body.managedClinics)) {
            return NextResponse.json(
                { success: false, error: "managedClinics must be an array of clinic IDs" },
                { status: 400 }
            );
        }

        await dbConnect();

        // Check if admin with username already exists
        const existingAdmin = await Admin.findOne({ username: body.username });
        if (existingAdmin) {
            return NextResponse.json(
                { success: false, error: "Admin with this username already exists" },
                { status: 409 }
            );
        }

        // Validate each clinic ID if managedClinics provided
        const validatedClinics = [];
        if (body.managedClinics && body.managedClinics.length > 0) {
            for (const clinicId of body.managedClinics) {
                // Validate ObjectId format
                if (!isValidObjectId(clinicId)) {
                    return NextResponse.json(
                        { success: false, error: `Invalid clinic ID format: ${clinicId}` },
                        { status: 400 }
                    );
                }

                // Check if clinic exists
                const clinic = await Clinic.findById(clinicId);
                if (!clinic) {
                    return NextResponse.json(
                        { success: false, error: `Clinic not found: ${clinicId}` },
                        { status: 404 }
                    );
                }

                validatedClinics.push(clinic);
            }
        }

        // Create new admin
        const admin = await Admin.create(body);
        
        // Establish bidirectional relationship with clinics
        if (validatedClinics.length > 0) {
            for (const clinic of validatedClinics) {
                // Add admin to clinic's managerId array (avoid duplicates)
                await Clinic.findByIdAndUpdate(
                    clinic._id,
                    { $addToSet: { managerId: admin._id } }
                );
            }
        }
        
        // Return admin without password, but populate managedClinics for confirmation
        const createdAdmin = await Admin.findById(admin._id)
            .populate("managedClinics")
            .select("-password");
        
        return NextResponse.json(
            { 
                success: true, 
                admin: createdAdmin,
                message: `Admin created successfully${validatedClinics.length > 0 ? ` and assigned to ${validatedClinics.length} clinic(s)` : ''}`
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Error creating admin:", error);
        return NextResponse.json(
            { success: false, error: "Failed to create admin" },
            { status: 500 }
        );
    }
}

// Update an admin
export async function PATCH(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id || !isValidObjectId(id)) {
            return NextResponse.json(
                { success: false, error: "Valid ID is required" },
                { status: 400 }
            );
        }

        const body = await request.json();
        await dbConnect();

        const admin = await Admin.findById(id);
        if (!admin) {
            return NextResponse.json(
                { success: false, error: "Admin not found" },
                { status: 404 }
            );
        }

        // Handle clinic relationships if managedClinics is being updated
        if (body.managedClinics) {
            const prevClinicIds = admin.managedClinics.map((clinicId: Types.ObjectId) => clinicId.toString());
            const newClinicIds = body.managedClinics.map((cid: string | Types.ObjectId) => 
                typeof cid === 'string' ? cid : cid.toString()
            );

            // Remove this admin from clinics they no longer manage
            const removedClinics = prevClinicIds.filter((id: string) => !newClinicIds.includes(id));
            for (const clinicId of removedClinics) {
                await Clinic.findByIdAndUpdate(
                    clinicId,
                    { $pull: { managerId: admin._id } }
                );
            }

            // Add this admin to newly managed clinics
            const addedClinics = newClinicIds.filter((id: string) => !prevClinicIds.includes(id));
            for (const clinicId of addedClinics) {
                await Clinic.findByIdAndUpdate(
                    clinicId,
                    { $addToSet: { managerId: admin._id } }
                );
            }
        }

        // Update admin data
        const updatedAdmin = await Admin.findByIdAndUpdate(id, body, {
            new: true,
            runValidators: true,
        })
        .populate("managedClinics")
        .select("-password");

        return NextResponse.json({ success: true, admin: updatedAdmin });
    } catch (error) {
        console.error("Error updating admin:", error);
        return NextResponse.json(
            { success: false, error: "Failed to update admin" },
            { status: 500 }
        );
    }
}

// Delete an admin
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id || !isValidObjectId(id)) {
            return NextResponse.json(
                { success: false, error: "Valid ID is required" },
                { status: 400 }
            );
        }

        await dbConnect();

        // Remove the admin from all clinics' managerId array
        await Clinic.updateMany(
            { managerId: id },
            { $pull: { managerId: id } }
        );

        // Delete the admin
        const deletedAdmin = await Admin.findByIdAndDelete(id);

        if (!deletedAdmin) {
            return NextResponse.json(
                { success: false, error: "Admin not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ 
            success: true, 
            message: "Admin deleted successfully" 
        });
    } catch (error) {
        console.error("Error deleting admin:", error);
        return NextResponse.json(
            { success: false, error: "Failed to delete admin" },
            { status: 500 }
        );
    }
}