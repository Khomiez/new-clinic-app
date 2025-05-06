import { type NextRequest, NextResponse } from "next/server"
import {dbConnect} from "@/db"
import { Clinic } from "../../../../models"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")

    if (!query) {
      return NextResponse.json({ error: "Search query is required" }, { status: 400 })
    }

    await dbConnect()

    // Search clinics by name or address
    const clinics = await Clinic.find({
      $or: [{ name: { $regex: query, $options: "i" } }, { address: { $regex: query, $options: "i" } }],
    }).populate("managerId")

    return NextResponse.json({ clinics })
  } catch (error) {
    console.error("Error searching clinics:", error)
    return NextResponse.json({ error: "Failed to search clinics" }, { status: 500 })
  }
}
