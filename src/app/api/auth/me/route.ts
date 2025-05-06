// src/app/api/auth/me/route.ts
import { dbConnect } from "@/db";
import { Admin } from "@/models";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    // Get token from cookies - fix the await issue
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }
    
    // Find admin by id (token)
    const admin = await Admin.findById(token)
      .select("-password")
      .populate("managedClinics");
    
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Admin not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, admin });
  } catch (error) {
    console.error("Error fetching admin data:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}