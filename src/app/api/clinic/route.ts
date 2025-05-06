// src/app/api/clinic/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { dbConnect } from "@/db";
import { Admin, Clinic } from "@/models"
import { isValidObjectId } from "mongoose"

// Get all clinics or a specific clinic by ID
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get("id")
        const adminId = searchParams.get("adminId")

        await dbConnect()

        // If ID is provided, return a specific clinic
        if (id) {
            if (!isValidObjectId(id)) {
                return NextResponse.json(
                  { success: false, error: "Invalid ID format" },
                  { status: 400 }
                )
            }

            const clinic = await Clinic.findById(id).populate("managerId")

            if (!clinic) {
                return NextResponse.json(
                  { success: false, error: "Clinic not found" },
                  { status: 404 }
                )
            }

            return NextResponse.json({ success: true, clinic })
        }

        // If adminId is provided, return that admin's clinics
        if (adminId) {
            if (!isValidObjectId(adminId)) {
                return NextResponse.json(
                  { success: false, error: "Invalid admin ID format" },
                  { status: 400 }
                )
            }

            const admin = await Admin.findById(adminId).populate("managedClinics")

            if (!admin) {
                return NextResponse.json(
                  { success: false, error: "Admin not found" },
                  { status: 404 }
                )
            }

            const clinics = admin.managedClinics || []
            return NextResponse.json({ success: true, clinics })
        }

        // Otherwise, return all clinics
        const clinics = await Clinic.find({}).populate("managerId")
        return NextResponse.json({ success: true, clinics })
    } catch (error) {
        console.error("Error fetching clinic(s):", error)
        return NextResponse.json(
          { success: false, error: "Failed to fetch clinic data" },
          { status: 500 }
        )
    }
}

// Create a new clinic
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        // Validate required fields
        if (!body.name) {
            return NextResponse.json(
              { success: false, error: "Clinic name is required" },
              { status: 400 }
            )
        }

        if (!Array.isArray(body.managerId)) {
            return NextResponse.json(
              { success: false, error: "managerId must be an array of admin IDs" },
              { status: 400 }
            )
        }

        // Connect to DB
        await dbConnect()

        // Validate each managerId
        for (const id of body.managerId) {
            if (!isValidObjectId(id)) {
                return NextResponse.json(
                  { success: false, error: `Invalid manager ID: ${id}` },
                  { status: 400 }
                )
            }

            const adminExists = await Admin.findById(id)
            if (!adminExists) {
                return NextResponse.json(
                  { success: false, error: `Manager not found for ID: ${id}` },
                  { status: 404 }
                )
            }
        }

        // Create new clinic
        const clinic = await Clinic.create(body)

        // Add this clinic to each admin's managedClinics list
        for (const id of body.managerId) {
            await Admin.findByIdAndUpdate(id, {
                $addToSet: { managedClinics: clinic._id } // Prevent duplicates
            })
        }

        return NextResponse.json({ success: true, clinic }, { status: 201 })
    } catch (error) {
        console.error("Error creating clinic:", error)
        return NextResponse.json(
          { success: false, error: "Failed to create clinic" },
          { status: 500 }
        )
    }
}

// Update a clinic
export async function PATCH(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get("id")

        if (!id || !isValidObjectId(id)) {
            return NextResponse.json(
              { success: false, error: "Valid ID is required" },
              { status: 400 }
            )
        }

        const body = await request.json()
        await dbConnect()

        const oldClinic = await Clinic.findById(id)

        if (!oldClinic) {
            return NextResponse.json(
              { success: false, error: "Clinic not found" },
              { status: 404 }
            )
        }

        // 1. Remove this clinic from managers that are being removed
        if (oldClinic.managerId && body.managerId) {
            for (const oldManagerId of oldClinic.managerId) {
                if (!body.managerId.includes(oldManagerId.toString())) {
                    await Admin.findByIdAndUpdate(
                        oldManagerId,
                        { $pull: { managedClinics: id } }
                    )
                }
            }
        }

        // 2. Update the clinic
        const updatedClinic = await Clinic.findByIdAndUpdate(id, body, {
            new: true,
            runValidators: true,
        }).populate("managerId")

        // 3. Add the clinic to new managers' managedClinics
        if (body.managerId) {
            for (const newManagerId of body.managerId) {
                if (!oldClinic.managerId.some(id => id.toString() === newManagerId)) {
                    await Admin.findByIdAndUpdate(
                        newManagerId,
                        { $addToSet: { managedClinics: id } } // Prevent duplicates
                    )
                }
            }
        }

        return NextResponse.json({ success: true, clinic: updatedClinic })

    } catch (error) {
        console.error("Error updating clinic:", error)
        return NextResponse.json(
          { success: false, error: "Failed to update clinic" },
          { status: 500 }
        )
    }
}

// Delete a clinic
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get("id")

        if (!id || !isValidObjectId(id)) {
            return NextResponse.json(
              { success: false, error: "Valid ID is required" },
              { status: 400 }
            )
        }

        await dbConnect()

        // Remove this clinic from all admins' managedClinics
        await Admin.updateMany(
            { managedClinics: id },
            { $pull: { managedClinics: id } }
        )

        // Find and delete the clinic
        const deletedClinic = await Clinic.findByIdAndDelete(id)

        if (!deletedClinic) {
            return NextResponse.json(
              { success: false, error: "Clinic not found" },
              { status: 404 }
            )
        }

        return NextResponse.json({ 
          success: true, 
          message: "Clinic deleted successfully" 
        })
    } catch (error) {
        console.error("Error deleting clinic:", error)
        return NextResponse.json(
          { success: false, error: "Failed to delete clinic" },
          { status: 500 }
        )
    }
}