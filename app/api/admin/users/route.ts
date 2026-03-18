import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { requireAdminAuth } from "@/lib/admin-auth";
import { USERS_COLLECTION, type UserDocument } from "@/models/User";
import { SUBSCRIPTIONS_COLLECTION } from "@/models/Subscription";

export async function GET(req: NextRequest) {
    const authErr = requireAdminAuth(req);
    if (authErr) return authErr;

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "25")));
    const search = searchParams.get("search")?.trim();
    const subStatus = searchParams.get("subStatus"); // active | expired | none
    const planSlug = searchParams.get("planSlug");
    const activeFilter = searchParams.get("active"); // "true" | "false"
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const filter: Record<string, unknown> = { deletedAt: { $exists: false } };

    if (search) {
        const regex = new RegExp(search, "i");
        filter.$or = [{ name: regex }, { email: regex }];
    }

    if (activeFilter === "false") {
        filter.$or = [
            { isActive: false },
            { suspendedAt: { $exists: true } },
        ];
    } else if (activeFilter === "true") {
        filter.isActive = { $ne: false };
        filter.suspendedAt = { $exists: false };
    }

    if (dateFrom || dateTo) {
        const dateFilter: Record<string, Date> = {};
        if (dateFrom) dateFilter.$gte = new Date(dateFrom);
        if (dateTo) dateFilter.$lte = new Date(dateTo);
        filter.createdAt = dateFilter;
    }

    try {
        const client = await clientPromise;
        const db = client.db();

        // If filtering by subscription, get matching userIds first
        let subUserIds: Set<string> | null = null;
        if (subStatus || planSlug) {
            const subFilter: Record<string, unknown> = {};
            if (subStatus === "active") subFilter.status = "active";
            else if (subStatus === "expired") subFilter.status = "expired";
            else if (subStatus === "none") {
                // handled below
            }
            if (planSlug) subFilter.planSlug = planSlug;

            if (subStatus === "none") {
                // Users with NO active/pending subscription
                const allUsers = await db
                    .collection<UserDocument>(USERS_COLLECTION)
                    .find(filter, { projection: { _id: 1 } })
                    .toArray();
                const allIds = new Set(allUsers.map((u) => u._id!.toString()));
                const subscribed = await db
                    .collection(SUBSCRIPTIONS_COLLECTION)
                    .distinct("userId", { status: { $in: ["active", "pending"] } });
                const subscribedSet = new Set(subscribed.map((id) => id.toString()));
                subUserIds = new Set([...allIds].filter((id) => !subscribedSet.has(id)));
            } else {
                const subs = await db
                    .collection(SUBSCRIPTIONS_COLLECTION)
                    .distinct("userId", subFilter);
                subUserIds = new Set(subs.map((id) => id.toString()));
            }
        }

        if (subUserIds !== null) {
            filter._id = { $in: [...subUserIds].map((id) => new ObjectId(id)) };
        }

        const [rawUsers, total] = await Promise.all([
            db.collection<UserDocument>(USERS_COLLECTION)
                .find(filter, {
                    projection: {
                        passwordHash: 0,
                        activeSessionToken: 0,
                    }
                })
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .toArray(),
            db.collection<UserDocument>(USERS_COLLECTION).countDocuments(filter),
        ]);

        // Fetch latest subscription for each user
        const userIds = rawUsers.map((u) => u._id!);
        const subscriptions = await db
            .collection(SUBSCRIPTIONS_COLLECTION)
            .find({ userId: { $in: userIds }, status: { $in: ["active", "pending"] } }, {
                projection: { userId: 1, planName: 1, planSlug: 1, status: 1, endDate: 1 },
            })
            .toArray();

        const subByUser = new Map(subscriptions.map((s) => [s.userId.toString(), s]));

        const users = rawUsers.map((u) => {
            const sub = subByUser.get(u._id!.toString());
            return {
                id: u._id!.toString(),
                name: u.name,
                email: u.email,
                image: u.image,
                provider: u.provider,
                createdAt: u.createdAt,
                lastLoginAt: u.lastLoginAt ?? null,
                isActive: u.isActive !== false,
                suspendedAt: u.suspendedAt ?? null,
                subscription: sub ? {
                    planName: sub.planName,
                    planSlug: sub.planSlug,
                    status: sub.status,
                    endDate: sub.endDate,
                } : null,
            };
        });

        return NextResponse.json({ users, total, page, pages: Math.ceil(total / limit) });
    } catch (err) {
        console.error("[admin/users GET]", err);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
