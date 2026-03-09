import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/get-user-id";

const WEB_BASE_URL = (process.env.NEXT_PUBLIC_WEB_APP_URL ?? "https://pgstudio-web.vercel.app").replace(/\/$/, "");

function normalizeRoomId(input?: string): string {
    if (!input) return "";
    return input.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-").slice(0, 64);
}

function generateRoomId(): string {
    return `room-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function POST(req: NextRequest) {
    let requestedRoomId = "";
    try {
        const body = await req.json();
        if (body && typeof body.roomId === "string") {
            requestedRoomId = body.roomId;
        }
    } catch {
        // empty body fallback
    }

    const roomId = normalizeRoomId(requestedRoomId) || generateRoomId();
    const shareUrl = `${WEB_BASE_URL}/collab/${encodeURIComponent(roomId)}`;
    const desktopDeepLink = `pgstudio://collab/join?room=${encodeURIComponent(roomId)}`;
    const userId = await getUserId(req);

    return NextResponse.json({
        roomId,
        shareUrl,
        desktopDeepLink,
        role: userId ? "host" : "guest",
        createdAt: new Date().toISOString(),
    });
}
