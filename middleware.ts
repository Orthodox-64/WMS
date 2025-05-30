import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from './lib/firebase-admin';

// Add paths that don't require authentication
const publicPaths = new Set([
  '/login',
  '/register',
  '/api/auth/set-claims',  // Allow access to auth endpoints
  '/_next',               // Next.js assets
  '/favicon.ico',         // Favicon
]);

// Define role-based route access
const roleBasedRoutes: Record<string, Set<string>> = {
  maker: new Set([
    '/dashboard',
    '/inward',
    '/outward',
    '/commodity-summary',
    '/aum-summary'
  ]),
  checker: new Set([
    '/dashboard',
    '/surveys',
    '/reports',
    '/commodity-summary',
    '/aum-summary'
  ]),
  admin: new Set([
    '/dashboard',
    '/master-data',
    '/reports',
    '/surveys',
    '/inward',
    '/outward',
    '/ro',
    '/commodity-summary',
    '/aum-summary'
  ]),
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check if the path is public
  if (publicPaths.has(pathname) || pathname.startsWith('/_next')) {
    return NextResponse.next();
  }

  try {
    // Get the session cookie
    const sessionCookie = request.cookies.get('session')?.value;

    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Verify the session cookie and get the user claims
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    const userRole = decodedClaims.role as keyof typeof roleBasedRoutes;

    // Check role-based access
    if (userRole && roleBasedRoutes[userRole]) {
      const allowedPaths = roleBasedRoutes[userRole];
      if (!allowedPaths.has(pathname)) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }

    return NextResponse.next();
  } catch (error) {
    // If there's an error verifying the session cookie, redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
};
