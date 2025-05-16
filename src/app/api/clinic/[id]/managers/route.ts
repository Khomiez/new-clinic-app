// src/app/api/clinic/[id]/managers/route.ts - Fixed for Next.js 15
import { type NextRequest, NextResponse } from "next/server"
import { dbConnect } from "@/db"
import { Admin, Clinic } from "@/models"
import { isValidObjectId, type Types } from "mongoose"

// Define interfaces for better type checking
interface ClinicParamsProps {
  params: Promise<{
    id: string;
  }>;
}

// Get all managers (admins) of a clinic
export async function GET(request: NextRequest, { params }: ClinicParamsProps) {
    try {
        // Await the params Promise in Next.js 15
        const { id } = await params;

        if (!isValidObjectId(id)) {
            return NextResponse.json({ error: "Invalid clinic ID format" }, { status: 400 })
        }

        await dbConnect()

        const clinic = await Clinic.findById(id).populate("managerId")

        if (!clinic) {
            return NextResponse.json({ error: "Clinic not found" }, { status: 404 })
        }

        // TypeScript understands managerId as an array of Types.ObjectId
        return NextResponse.json({ managers: clinic.managerId })
    } catch (error) {
        console.error("Error fetching clinic managers:", error)
        return NextResponse.json({ error: "Failed to fetch clinic managers" }, { status: 500 })
    }
}

// Add a manager (admin) to a clinic
export async function POST(request: NextRequest, { params }: ClinicParamsProps) {
    try {
        // Await the params Promise in Next.js 15
        const { id } = await params;
        const body = await request.json()
        const { adminIds } = body  // Changed to adminIds for handling multiple admins

        if (!Array.isArray(adminIds)) {
            return NextResponse.json({ error: "adminIds must be an array of admin IDs" }, { status: 400 })
        }

        if (!isValidObjectId(id)) {
            return NextResponse.json({ error: "Invalid clinic ID format" }, { status: 400 })
        }

        await dbConnect()

        // Check if clinic exists
        const clinic = await Clinic.findById(id)
        if (!clinic) {
            return NextResponse.json({ error: "Clinic not found" }, { status: 404 })
        }

        // Validate each admin ID
        for (const adminId of adminIds) {
            if (!isValidObjectId(adminId)) {
                return NextResponse.json({ error: `Invalid admin ID: ${adminId}` }, { status: 400 })
            }

            const admin = await Admin.findById(adminId)
            if (!admin) {
                return NextResponse.json({ error: `Admin not found for ID: ${adminId}` }, { status: 404 })
            }

            // Check if admin is already a manager
            if (clinic.managerId.some((manager: Types.ObjectId) => manager.toString() === adminId)) {
                return NextResponse.json({ error: `Admin already a manager: ${adminId}` }, { status: 409 })
            }

            // Add admin to clinic's managers
            clinic.managerId.push(adminId)
            await clinic.save()

            // Add clinic to admin's managed clinics
            if (!admin.managedClinics.some((clinic: Types.ObjectId) => clinic.toString() === id)) {
                admin.managedClinics.push(id)
                await admin.save()
            }
        }

        return NextResponse.json({
            message: "Admins added as clinic managers successfully",
            clinic: await Clinic.findById(id).populate("managerId"),
        })
    } catch (error) {
        console.error("Error adding admins to clinic:", error)
        return NextResponse.json({ error: "Failed to add admins to clinic" }, { status: 500 })
    }
}

// Remove a manager (admin) from a clinic
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const clinicId = searchParams.get("id")
        const adminId = searchParams.get("adminId")

        if (!clinicId || !isValidObjectId(clinicId)) {
            return NextResponse.json({ error: "Valid clinic ID is required" }, { status: 400 })
        }

        if (!adminId || !isValidObjectId(adminId)) {
            return NextResponse.json({ error: "Valid admin ID is required" }, { status: 400 })
        }

        await dbConnect()

        // Find the clinic
        const clinic = await Clinic.findById(clinicId)

        if (!clinic) {
            return NextResponse.json({ error: "Clinic not found" }, { status: 404 })
        }

        // Check if admin is a manager of this clinic
        if (!clinic.managerId.includes(adminId)) {
            return NextResponse.json({ error: "Admin is not a manager of this clinic" }, { status: 400 })
        }

        // Remove admin from clinic's managerId list
        clinic.managerId = clinic.managerId.filter((managerId: Types.ObjectId) => managerId.toString() !== adminId)
        await clinic.save()

        // Remove clinic from admin's managedClinics list
        const admin = await Admin.findById(adminId)

        if (!admin) {
            return NextResponse.json({ error: "Admin not found" }, { status: 404 })
        }

        admin.managedClinics = admin.managedClinics.filter((adminClinicId: Types.ObjectId) => adminClinicId.toString() !== clinicId)
        await admin.save()

        return NextResponse.json({
            message: "Admin removed from clinic successfully",
            clinic: await Clinic.findById(clinicId).populate("managerId"),
        })
    } catch (error) {
        console.error("Error removing admin from clinic:", error)
        return NextResponse.json({ error: "Failed to remove admin from clinic" }, { status: 500 })
    }
}