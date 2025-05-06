import { NextResponse } from "next/server";

export async function POST(request: Request) {
  // Create a JSON response
  const response = NextResponse.json({ success: true });

  // Clear out the token cookie
  response.cookies.set({
    name: "token",
    value: "",           // empty value
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",           // make sure it matches how you set it originally
    maxAge: 0,           // expire immediately
  });

  return response;
}
