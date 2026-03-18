import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { requireAdminAuth } from "@/lib/admin-auth";
import { writeAuditLog } from "@/lib/audit-log";
import { PLANS_COLLECTION, type PlanDocument } from "@/models/Plan";
import { USERS_COLLECTION } from "@/models/User";
import { SUBSCRIPTIONS_COLLECTION, type SubscriptionDocument } from "@/models/Subscription";

export async function POST(req: NextRequest) {
    const authErr = requireAdminAuth(req);
    if (authErr) return authErr;

    let body: {
        userId?: string;
        planId?: string;
        startDate?: string;
        durationDays?: number;
        status?: "active" | "pending";
        paymentAmount?: number;
        paymentCurrency?: string;
    };

    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { userId, planId } = body;
    if (!userId || !ObjectId.isValid(userId)) {
        return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }
    if (!planId || !ObjectId.isValid(planId)) {
        return NextResponse.json({ error: "Invalid planId" }, { status: 400 });
    }

    const status = body.status ?? "active";
    if (!["active", "pending"].includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const start = body.startDate ? new Date(body.startDate) : new Date();
    if (Number.isNaN(start.getTime())) {
        return NextResponse.json({ error: "Invalid startDate" }, { status: 400 });
    }

    const durationDays = Number(body.durationDays ?? 0) || undefined;
    if (durationDays !== undefined && (durationDays < 1 || durationDays > 3650)) {
        return NextResponse.json({ error: "durationDays must be between 1 and 3650" }, { status: 400 });
    }

    try {
        const client = await clientPromise;
        const db = client.db();

        const [user, plan] = await Promise.all([
            db.collection(USERS_COLLECTION).findOne({ _id: new ObjectId(userId) }),
            db.collection<PlanDocument>(PLANS_COLLECTION).findOne({ _id: new ObjectId(planId) }),
        ]);

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }
        if (!plan) {
            return NextResponse.json({ error: "Plan not found" }, { status: 404 });
        }

        const days = durationDays ?? plan.durationDays;
        const endDate = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
        if (endDate <= start) {
            return NextResponse.json({ error: "End date must be after start date" }, { status: 400 });
        }

        const paymentAmount = Number.isFinite(body.paymentAmount)
            ? Math.max(0, Math.round(Number(body.paymentAmount)))
            : plan.price;
        const paymentCurrency = (body.paymentCurrency || plan.currency || "usd").toLowerCase();

        const now = new Date();

        await db.collection<SubscriptionDocument>(SUBSCRIPTIONS_COLLECTION).updateMany(
            { userId: new ObjectId(userId), status: { $in: ["active", "pending"] } },
            { $set: { status: "cancelled", cancelledAt: now, updatedAt: now } }
        );

        const newSub: SubscriptionDocument = {
            userId: new ObjectId(userId),
            planId: new ObjectId(planId),
            planName: plan.name,
            planSlug: plan.slug,
            status,
            discordAccess: plan.discordAccess,
            startDate: start,
            endDate,
            paymentAmount,
            paymentCurrency,
            createdAt: now,
            updatedAt: now,
        };

        const result = await db.collection<SubscriptionDocument>(SUBSCRIPTIONS_COLLECTION).insertOne(newSub);

        await writeAuditLog(
            "subscription.assign",
            "subscription",
            result.insertedId.toString(),
            {
                userId,
                planId,
                status,
                startDate: start.toISOString(),
                endDate: endDate.toISOString(),
                paymentAmount,
                paymentCurrency,
                durationDays: days,
            },
            req.headers.get("x-forwarded-for") ?? undefined
        );

        return NextResponse.json({ ok: true, subscriptionId: result.insertedId.toString() });
    } catch (err) {
        console.error("[admin/subscriptions/assign]", err);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
