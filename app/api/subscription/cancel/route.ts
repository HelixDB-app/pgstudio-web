import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { getUserId } from "@/lib/get-user-id";
import { SUBSCRIPTIONS_COLLECTION, type SubscriptionDocument } from "@/models/Subscription";

export async function POST(req: NextRequest) {
    const userId = await getUserId(req);
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const client = await clientPromise;
        const db = client.db();
        const now = new Date();

        const result = await db
            .collection<SubscriptionDocument>(SUBSCRIPTIONS_COLLECTION)
            .updateOne(
                { userId: new ObjectId(userId), status: "active" },
                { $set: { status: "cancelled", cancelledAt: now, updatedAt: now } }
            );

        if (result.matchedCount === 0) {
            return NextResponse.json({ error: "No active subscription found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("[/api/subscription/cancel]", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
