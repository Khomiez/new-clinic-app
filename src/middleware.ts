// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Get the pathname of the request (e.g. /, /protected)
  const path = request.nextUrl.pathname;

  // Define which paths are protected (require authentication)
  const isProtectedPath = path.startsWith('/dashboard') || 
                          path.startsWith('/patients') || 
                          path.startsWith('/admin');

  // Define which paths are auth-related (login, register)
  const isAuthPath = path === '/login' || path === '/register';

  // Get the token from the cookies
  const token = request.cookies.get('token')?.value;

  // Check if the user is accessing a protected path without being authenticated
  if (isProtectedPath && !token) {
    // Redirect to the login page with a return URL
    const url = new URL('/login', request.url);
    url.searchParams.set('returnUrl', path);
    return NextResponse.redirect(url);
  }

  // Check if the user is accessing an auth path but is already authenticated
  if (isAuthPath && token) {
    // Redirect to the dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // If none of the above conditions are met, continue
  return NextResponse.next();
}

// Define which paths this middleware should be applied to
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};