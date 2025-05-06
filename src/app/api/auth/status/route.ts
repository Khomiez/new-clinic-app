import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  // Read the "token" cookie
  const cookieStore = cookies();
  const tokenCookie = (await cookieStore).get("token");

  // If there's a token, we consider the user authenticated
  const isAuthenticated = Boolean(tokenCookie?.value);

  return NextResponse.json({ isAuthenticated });
}
