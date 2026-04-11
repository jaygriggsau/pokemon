import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { marketplaceEnabled } from "@/lib/features";

export function middleware(request: NextRequest) {
  if (marketplaceEnabled()) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/marketplace")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (pathname === "/marketplace" || pathname.startsWith("/marketplace/")) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/marketplace", "/marketplace/:path*", "/api/marketplace/:path*"],
};
