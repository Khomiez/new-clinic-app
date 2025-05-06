import { dbConnect } from "@/db";
import { Admin } from "@/models";
import { serialize } from "cookie";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  await dbConnect();

  try {
    const body = await request.json();
    const { username, password } = body;
    
    if (!username || !password) {
      return NextResponse.json(
        { error: "Missing username or password" },
        { status: 400 }
      );
    }

    const admin = await Admin.findOne({ username });
    
    // Check if admin exists and verify password (you need to implement proper password comparison)
    if (!admin || admin.password !== password) { // Replace with proper password verification
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Create a simple token
    const token = admin._id.toString();

    // Create response
    const response = NextResponse.json({ success: true });
    
    // Set the cookie
    response.cookies.set({
      name: "token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24, // 1 day in seconds
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}