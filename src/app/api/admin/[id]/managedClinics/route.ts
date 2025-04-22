import dbConnect from "@/db/connections"
import { Admin, Clinic } from "@/models"
import { isValidObjectId, Types } from "mongoose"
import { NextRequest, NextResponse } from "next/server"

// Get all clinics managed by an admin
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { id } = params

        if (!isValidObjectId(id)) {
            return NextResponse.json({ success: false, error: "Invalid admin ID format" }, { status: 400 })
        }

        await dbConnect()

        const admin = await Admin.findById(id).populate("managedClinics")

        if (!admin) {
            return NextResponse.json({ success: false, error: "Admin not found" }, { status: 404 })
        }

        return NextResponse.json({ success: true, data: { clinics: admin.managedClinics } })
    } catch (error) {
        console.error("Error fetching managed clinics:", error)
        return NextResponse.json({ success: false, error: "Failed to fetch managed clinics" }, { status: 500 })
    }
}

// Add a clinic to an admin's managed clinics
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { id } = params
        const body = await request.json()
        const { clinicId } = body

        if (!isValidObjectId(id)) {
            return NextResponse.json({ success: false, error: "Invalid admin ID format" }, { status: 400 })
        }

        if (!clinicId || !isValidObjectId(clinicId)) {
            return NextResponse.json({ success: false, error: "Valid clinic ID is required" }, { status: 400 })
        }

        await dbConnect()

        const admin = await Admin.findById(id)
        if (!admin) {
            return NextResponse.json({ success: false, error: "Admin not found" }, { status: 404 })
        }

        const clinic = await Clinic.findById(clinicId)
        if (!clinic) {
            return NextResponse.json({ success: false, error: "Clinic not found" }, { status: 404 })
        }

        // Check for existing association
        const alreadyLinked = admin.managedClinics.some((cid: Types.ObjectId) => cid.toString() === clinicId)
        if (alreadyLinked) {
            return NextResponse.json({ success: false, error: "Clinic is already managed by this admin" }, { status: 409 })
        }

        // Use $addToSet to avoid duplicates
        await Admin.findByIdAndUpdate(id, { $addToSet: { managedClinics: clinicId } })
        await Clinic.findByIdAndUpdate(clinicId, { $addToSet: { managerId: id } })

        const updatedAdmin = await Admin.findById(id).populate("managedClinics")

        return NextResponse.json({
            success: true,
            message: "Clinic added to admin successfully",
            data: { admin: updatedAdmin },
        })
    } catch (error) {
        console.error("Error adding clinic to admin:", error)
        return NextResponse.json({ success: false, error: "Failed to add clinic to admin" }, { status: 500 })
    }
}

// Remove a clinic from an admin's managed clinics
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { id } = params
        const { searchParams } = new URL(request.url)
        const clinicId = searchParams.get("clinicId")

        if (!isValidObjectId(id)) {
            return NextResponse.json({ success: false, error: "Invalid admin ID format" }, { status: 400 })
        }

        if (!clinicId || !isValidObjectId(clinicId)) {
            return NextResponse.json({ success: false, error: "Valid clinic ID is required" }, { status: 400 })
        }

        await dbConnect()

        const admin = await Admin.findById(id)
        if (!admin) {
            return NextResponse.json({ success: false, error: "Admin not found" }, { status: 404 })
        }

        const clinic = await Clinic.findById(clinicId)
        if (!clinic) {
            return NextResponse.json({ success: false, error: "Clinic not found" }, { status: 404 })
        }

        // Remove links using $pull
        await Admin.findByIdAndUpdate(id, { $pull: { managedClinics: clinicId } })
        await Clinic.findByIdAndUpdate(clinicId, { $pull: { managerId: id } })

        const updatedAdmin = await Admin.findById(id).populate("managedClinics")

        return NextResponse.json({
            success: true,
            message: "Clinic removed from admin successfully",
            data: { admin: updatedAdmin },
        })
    } catch (error) {
        console.error("Error removing clinic from admin:", error)
        return NextResponse.json({ success: false, error: "Failed to remove clinic from admin" }, { status: 500 })
    }
}
