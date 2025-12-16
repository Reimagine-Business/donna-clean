import { updateSession } from "@/lib/supabase/middleware";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Redirect old daily-entries route to new entries route
  if (request.nextUrl.pathname === '/daily-entries') {
    return NextResponse.redirect(new URL('/entries', request.url));
  }

  // Hide user management for now (v2.0 feature)
  if (request.nextUrl.pathname === '/admin/users') {
    return NextResponse.redirect(new URL('/profile', request.url));
  }

  // Continue with Supabase session management
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (static files)
     * - images and other static assets (files with extensions like .png, .jpg, etc.)
     * - api routes that don't need auth
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|opengraph-image|twitter-image|.*\\.(?:jpg|jpeg|gif|png|svg|ico|webp|css|js)).*)",
  ],
};
