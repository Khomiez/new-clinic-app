import { NextRequest, NextResponse } from "next/server";
import {dbConnect} from "@/db";
import {Admin, Clinic} from "@/models";
import { isValidObjectId, Types } from 'mongoose';

// Connect to the database
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        await dbConnect();

        // If ID provided, return a specific admin
        if (id) {
            if (!isValidObjectId(id)) {
                return NextResponse.json(
                    { error: "Invalid ID format" },
                    { status: 400 }
                );
            }

            const admin = await Admin.findById(id).populate("managedClinics");

            return NextResponse.json({ admin })
        }

        // otherwise return all admins
        const admins = await Admin.find({}).populate("managedClinics");
        return NextResponse.json({ admins });
    } catch (error) {
        console.error("Error fetching admin(s):", error);
        return NextResponse.json(
            { error: "Failed to fetch admin data" },
            { status: 500 }
        );
    }
}


export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate required fields
        if (!body.username || !body.password) {
            return NextResponse.json(
                { error: "Username and password are required" },
                { status: 400 }
            );
        }

        await dbConnect();

        // Check if admin with username already exists
        const existingAdmin = await Admin.findOne({ username: body.username });
        if (existingAdmin) {
            return NextResponse.json(
                { error: "Admin with this username is already exists" },
                { status: 409 }
            );
        }

        // Create new admin
        const admin = await Admin.create(body);
        return NextResponse.json(
            { admin },
            { status: 201 }
        );
    } catch (error) {
        console.error("Error creating admin:", error);
        return NextResponse.json(
            { error: "Failed to create admin" },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id || !isValidObjectId(id)) {
            return NextResponse.json(
                { error: "Valid ID is required" },
                { status: 400 }
            );
        }

        const body = await request.json();
        await dbConnect();

        const admin = await Admin.findById(id);
        if (!admin) {
            return NextResponse.json({ error: "Admin not found" }, { status: 404 });
        }

        const prevClinicIds = admin.managedClinics.map((clinicId: any) => clinicId.toString());
        const newClinicIds = (body.managedClinics || []).map((cid: string) => cid.toString());

        // Remove this admin from clinics they no longer manage
        const removedClinics = prevClinicIds.filter((id: Types.ObjectId) => !newClinicIds.includes(id));
        await Clinic.updateMany(
            { _id: { $in: removedClinics } },
            { $pull: { managerId: admin._id } }
        );

        // Add this admin to newly managed clinics
        const addedClinics = newClinicIds.filter((id: Types.ObjectId) => !prevClinicIds.includes(id));
        await Clinic.updateMany(
            { _id: { $in: addedClinics } },
            { $addToSet: { managerId: admin._id } }
        );

        // Finally update admin data
        const updatedAdmin = await Admin.findByIdAndUpdate(id, body, {
            new: true,
            runValidators: true,
        }).populate("managedClinics");

        return NextResponse.json({ admin: updatedAdmin });

    } catch (error) {
        console.error("Error updating admin:", error);
        return NextResponse.json(
            { error: "Failed to update admin" },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id || !isValidObjectId(id)) {
            return NextResponse.json(
                { error: "Valid ID is required" },
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
        const deleteAdmin = await Admin.findByIdAndDelete(id);

        if (!deleteAdmin) {
            return NextResponse.json(
                { error: "Admin not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ message: "Admin deleted successfully" });

    } catch (error) {
        console.error("Error deleting admin:", error);
        return NextResponse.json(
            { error: "Failed to delete admin" },
            { status: 500 }
        );
    }
}