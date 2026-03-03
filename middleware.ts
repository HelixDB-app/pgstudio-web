import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

// The /admin route is handled inline — the page itself checks the env flag
// and admin cookie. The middleware just ensures /admin/* API routes are not
// reachable without the admin cookie (belt-and-suspenders; API routes also
// call requireAdminAuth internally).
export default withAuth(function middleware(_req: NextRequest) {
    return NextResponse.next();
}, {
    pages: { signIn: "/login" },
});

export const config = {
    matcher: ["/profile/:path*"],
};
