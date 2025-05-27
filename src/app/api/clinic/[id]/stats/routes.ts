// src/app/api/clinic/[id]/stats/route.ts - Clinic statistics API endpoint
import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/db";
import { isValidObjectId } from "mongoose";
import { getPatientModelForClinic } from "@/utils/getPatientModel";
import { Clinic } from "@/models";

// Fix interface for Next.js 15
interface ClinicStatsParamsProps {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: ClinicStatsParamsProps
) {
  try {
    // Await the params Promise in Next.js 15
    const { id } = await params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid clinic ID format" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Verify clinic exists
    const clinic = await Clinic.findById(id);
    if (!clinic) {
      return NextResponse.json(
        { success: false, error: "Clinic not found" },
        { status: 404 }
      );
    }

    // Get the patient model for this specific clinic
    const Patient = getPatientModelForClinic(id);

    try {
      // Get today's date range (start and end of day in local timezone)
      const today = new Date();
      const startOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );
      const endOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() + 1
      );

      console.log("Calculating stats for clinic:", clinic.name);
      console.log("Date range for today:", { startOfDay, endOfDay });

      // Execute all queries in parallel for better performance
      const [totalPatients, todayNewPatients] = await Promise.all([
        // Total patients count
        Patient.countDocuments({}).exec(),

        // Today's new patients count
        Patient.countDocuments({
          createdAt: {
            $gte: startOfDay,
            $lt: endOfDay,
          },
        }).exec(),
      ]);

      // Calculate total pages (assuming 10 items per page as default)
      const itemsPerPage = 10;
      const totalPages = Math.ceil(totalPatients / itemsPerPage);

      const stats = {
        totalPatients,
        todayNewPatients,
        totalPages,
        clinic: {
          id: clinic._id,
          name: clinic.name,
        },
        calculatedAt: new Date().toISOString(),
        dateRange: {
          startOfDay: startOfDay.toISOString(),
          endOfDay: endOfDay.toISOString(),
        },
      };

      console.log("Calculated stats:", stats);

      return NextResponse.json({
        success: true,
        stats,
      });
    } catch (queryError) {
      console.error("Error executing stats queries:", queryError);
      return NextResponse.json(
        { success: false, error: "Failed to calculate clinic statistics" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in clinic stats API:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch clinic statistics" },
      { status: 500 }
    );
  }
}
