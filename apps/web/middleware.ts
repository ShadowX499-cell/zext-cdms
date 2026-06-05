import { NextRequest, NextResponse } from 'next/server';

// Auth protection is handled client-side by DashboardLayout (Zustand store).
// Middleware only redirects authenticated users away from auth pages to avoid
// showing the login form when already logged in.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/verify-otp');
  const authCookie = req.cookies.get('zext-auth-check');

  // Already authenticated → skip login/otp pages
  if (isAuthPage && authCookie?.value) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
};
