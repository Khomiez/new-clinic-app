import { type NextRequest, NextResponse } from "next/server"
import { dbConnect } from "@/db";
import { Admin, Clinic } from "@/models"
import { isValidObjectId } from "mongoose"

// Get all clinics or a specific clinic by ID
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get("id")

        await dbConnect()

        // If ID is provided, return a specific clinic
        if (id) {
            if (!isValidObjectId(id)) {
                return NextResponse.json({ error: "Invalid ID format" }, { status: 400 })
            }

            const clinic = await Clinic.findById(id).populate("managerId")

            if (!clinic) {
                return NextResponse.json({ error: "Clinic not found" }, { status: 404 })
            }

            return NextResponse.json({ clinic })
        }

        // Otherwise return all clinics
        const clinics = await Clinic.find({}).populate("managerId")
        return NextResponse.json({ clinics })
    } catch (error) {
        console.error("Error fetching clinic(s):", error)
        return NextResponse.json({ error: "Failed to fetch clinic data" }, { status: 500 })
    }
}

// Create a new clinic
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        // Validate required fields
        if (!body.name) {
            return NextResponse.json({ error: "Clinic name is required" }, { status: 400 })
        }

        if (!Array.isArray(body.managerId)) {
            return NextResponse.json({ error: "managerId must be an array of admin IDs" }, { status: 400 })
        }

        // Connect to DB
        await dbConnect()

        // Validate each managerId
        for (const id of body.managerId) {
            if (!isValidObjectId(id)) {
                return NextResponse.json({ error: `Invalid manager ID: ${id}` }, { status: 400 })
            }

            const adminExists = await Admin.findById(id)
            if (!adminExists) {
                return NextResponse.json({ error: `Manager not found for ID: ${id}` }, { status: 404 })
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

        return NextResponse.json({ clinic }, { status: 201 })
    } catch (error) {
        console.error("Error creating clinic:", error)
        return NextResponse.json({ error: "Failed to create clinic" }, { status: 500 })
    }
}

// Update a clinic
// Update a clinic
export async function PUT(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get("id")

        if (!id || !isValidObjectId(id)) {
            return NextResponse.json({ error: "Valid ID is required" }, { status: 400 })
        }

        const body = await request.json()
        await dbConnect()

        const oldClinic = await Clinic.findById(id)

        if (!oldClinic) {
            return NextResponse.json({ error: "Clinic not found" }, { status: 404 })
        }

        // 1. Remove this clinic from the old manager's managedClinics
        if (oldClinic.managerId) {
            for (const oldManagerId of oldClinic.managerId) {
                if (!body.managerId.includes(oldManagerId.toString())) {
                    await Admin.findByIdAndUpdate(
                        oldManagerId,
                        { $pull: { managedClinics: id } }
                    )
                }
            }
        }

        // 2. Update the clinic with new manager IDs
        const updatedClinic = await Clinic.findByIdAndUpdate(id, { managerId: body.managerId }, {
            new: true,
            runValidators: true,
        }).populate("managerId")

        // 3. Add the clinic to new managers' managedClinics
        if (body.managerId) {
            for (const newManagerId of body.managerId) {
                await Admin.findByIdAndUpdate(
                    newManagerId,
                    { $addToSet: { managedClinics: id } } // Prevent duplicates
                )
            }
        }

        return NextResponse.json({ clinic: updatedClinic })

    } catch (error) {
        console.error("Error updating clinic:", error)
        return NextResponse.json({ error: "Failed to update clinic" }, { status: 500 })
    }
}

// Delete a clinic
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get("id")

        if (!id || !isValidObjectId(id)) {
            return NextResponse.json({ error: "Valid ID is required" }, { status: 400 })
        }

        await dbConnect()

        // Find and delete the clinic
        const deletedClinic = await Clinic.findByIdAndDelete(id)

        if (!deletedClinic) {
            return NextResponse.json({ error: "Clinic not found" }, { status: 404 })
        }

        return NextResponse.json({ message: "Clinic deleted successfully" })
    } catch (error) {
        console.error("Error deleting clinic:", error)
        return NextResponse.json({ error: "Failed to delete clinic" }, { status: 500 })
    }
}
