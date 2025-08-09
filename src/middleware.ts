import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define admin routes that need protection
const ADMIN_ROUTES = [
  '/admin',
  '/admin/import',
  '/admin/migrate',
  '/api/upload'
];

// Define admin user emails (you can expand this or use a database later)
const ADMIN_EMAILS = [
  'admin@gearx.com',
  'bheeshma@gearx.com', // Add your email here
  // Add more admin emails as needed
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // TEMPORARILY DISABLE MIDDLEWARE FOR TESTING
  // TODO: Re-enable after fixing auth issues
  console.log('Middleware bypassed for testing:', pathname);
  return NextResponse.next();
  
  // Check if the current path is an admin route
  const isAdminRoute = ADMIN_ROUTES.some(route =>
    pathname.startsWith(route)
  );
  
  if (isAdminRoute) {
    // Get the authorization header or session token
    const authHeader = request.headers.get('authorization');
    const sessionCookie = request.cookies.get('__session');
    
    // For now, we'll implement a simple check
    // In production, you should verify the Firebase ID token
    
    // If no auth present, redirect to auth page
    if (!authHeader && !sessionCookie) {
      const url = request.nextUrl.clone();
      url.pathname = '/auth';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
    
    // TODO: Add proper Firebase ID token verification here
    // For now, we'll allow access if any auth is present
    // You should implement proper token verification in production
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/upload/:path*'
  ]
};