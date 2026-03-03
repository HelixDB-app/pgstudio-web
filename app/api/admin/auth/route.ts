import { NextRequest, NextResponse } from "next/server";
import {
    isAdminEnabled,
    signAdminToken,
    buildAdminCookie,
    buildAdminClearCookie,
    getAdminTokenFromRequest,
    verifyAdminToken,
} from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
    if (!isAdminEnabled()) {
        return NextResponse.json({ error: "Admin panel is disabled" }, { status: 403 });
    }

    try {
        const { password } = await req.json();
        if (!password || password !== process.env.ADMIN_PASSWORD) {
            return NextResponse.json({ error: "Invalid password" }, { status: 401 });
        }

        const token = signAdminToken();
        const res = NextResponse.json({ success: true });
        res.headers.set("Set-Cookie", buildAdminCookie(token));
        return res;
    } catch {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
}

export async function DELETE(req: NextRequest) {
    const res = NextResponse.json({ success: true });
    res.headers.set("Set-Cookie", buildAdminClearCookie());
    return res;
}

export async function GET(req: NextRequest) {
    if (!isAdminEnabled()) {
        return NextResponse.json({ authenticated: false, enabled: false });
    }
    const token = getAdminTokenFromRequest(req);
    const authenticated = !!token && verifyAdminToken(token) !== null;
    return NextResponse.json({ authenticated, enabled: true });
}
