// src/app/api/auth/status/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  // Read the "token" cookie - cookies() is not a Promise, so no await needed
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get("token");

  // If there's a token, we consider the user authenticated
  const isAuthenticated = Boolean(tokenCookie?.value);

  return NextResponse.json({ isAuthenticated });
}