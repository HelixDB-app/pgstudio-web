import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { requireAdminAuth } from "@/lib/admin-auth";
import { writeAuditLog } from "@/lib/audit-log";
import { USERS_COLLECTION } from "@/models/User";
import { SUBSCRIPTIONS_COLLECTION } from "@/models/Subscription";
import { ADMIN_AUDIT_LOGS_COLLECTION } from "@/models/AdminAuditLog";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
    const authErr = requireAdminAuth(req);
    if (authErr) return authErr;

    const { id } = await params;
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    try {
        const client = await clientPromise;
        const db = client.db();

        const user = await db.collection(USERS_COLLECTION).findOne(
            { _id: new ObjectId(id) },
            { projection: { passwordHash: 0, activeSessionToken: 0 } }
        );
        if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

        const [subscriptions, auditLogs] = await Promise.all([
            db.collection(SUBSCRIPTIONS_COLLECTION)
                .find({ userId: new ObjectId(id) })
                .sort({ createdAt: -1 })
                .limit(20)
                .toArray(),
            db.collection(ADMIN_AUDIT_LOGS_COLLECTION)
                .find({ resourceId: id })
                .sort({ createdAt: -1 })
                .limit(20)
                .toArray(),
        ]);

        return NextResponse.json({
            user: {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                image: user.image,
                provider: user.provider,
                createdAt: user.createdAt,
                lastLoginAt: user.lastLoginAt ?? null,
                isActive: user.isActive !== false,
                suspendedAt: user.suspendedAt ?? null,
                deletedAt: user.deletedAt ?? null,
            },
            subscriptions: subscriptions.map((s) => ({
                id: s._id.toString(),
                planName: s.planName,
                planSlug: s.planSlug,
                status: s.status,
                startDate: s.startDate,
                endDate: s.endDate,
                paymentAmount: s.paymentAmount,
                paymentCurrency: s.paymentCurrency,
                createdAt: s.createdAt,
            })),
            auditLogs: auditLogs.map((l) => ({
                id: l._id.toString(),
                action: l.action,
                details: l.details,
                createdAt: l.createdAt,
            })),
        });
    } catch (err) {
        console.error("[admin/users GET id]", err);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest, { params }: Params) {
    const authErr = requireAdminAuth(req);
    if (authErr) return authErr;

    const { id } = await params;
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    let body: {
        action?: "suspend" | "unsuspend" | "delete" | "restore" | "force_logout" | "set_active";
        isActive?: boolean;
    };
    try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

    const { action } = body;
    if (!action) return NextResponse.json({ error: "action is required" }, { status: 400 });

    try {
        const client = await clientPromise;
        const db = client.db();
        const now = new Date();

        const update: Record<string, unknown> = { updatedAt: now };

        switch (action) {
            case "suspend":
                update.suspendedAt = now;
                update.isActive = false;
                await writeAuditLog("user.suspend", "user", id, {}, req.headers.get("x-forwarded-for") ?? undefined);
                break;

            case "unsuspend":
                update.$unset = { suspendedAt: "" };
                update.isActive = true;
                await writeAuditLog("user.unsuspend", "user", id, {}, req.headers.get("x-forwarded-for") ?? undefined);
                break;

            case "delete":
                update.deletedAt = now;
                update.isActive = false;
                // Force logout
                update.activeSessionToken = null;
                await writeAuditLog("user.delete", "user", id, {}, req.headers.get("x-forwarded-for") ?? undefined);
                break;

            case "restore":
                update.$unset = { deletedAt: "" };
                update.isActive = true;
                await writeAuditLog("user.restore", "user", id, {}, req.headers.get("x-forwarded-for") ?? undefined);
                break;

            case "force_logout":
                update.activeSessionToken = null;
                await writeAuditLog("user.force_logout", "user", id, {}, req.headers.get("x-forwarded-for") ?? undefined);
                break;

            case "set_active":
                update.isActive = body.isActive !== false;
                break;

            default:
                return NextResponse.json({ error: "Unknown action" }, { status: 400 });
        }

        // Separate $set and $unset
        const setOps: Record<string, unknown> = {};
        const unsetOps: Record<string, unknown> = {};

        for (const [k, v] of Object.entries(update)) {
            if (k === "$unset") {
                Object.assign(unsetOps, v);
            } else {
                setOps[k] = v;
            }
        }

        const mongoUpdate: Record<string, unknown> = { $set: setOps };
        if (Object.keys(unsetOps).length > 0) mongoUpdate.$unset = unsetOps;

        const result = await db
            .collection(USERS_COLLECTION)
            .updateOne({ _id: new ObjectId(id) }, mongoUpdate);

        if (result.matchedCount === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error("[admin/users PATCH id]", err);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
