import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { getUserId } from "@/lib/get-user-id";
import { SUBSCRIPTIONS_COLLECTION, subscriptionToPublic, type SubscriptionDocument } from "@/models/Subscription";

export async function GET(req: NextRequest) {
    const userId = await getUserId(req);
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const client = await clientPromise;
        const db = client.db();
        const now = new Date();

        // Auto-expire subscriptions that have passed their endDate
        await db.collection<SubscriptionDocument>(SUBSCRIPTIONS_COLLECTION).updateMany(
            { userId: new ObjectId(userId), status: "active", endDate: { $lt: now } },
            { $set: { status: "expired", updatedAt: now } }
        );

        // Get the most recent active or pending subscription
        const subscription = await db
            .collection<SubscriptionDocument>(SUBSCRIPTIONS_COLLECTION)
            .findOne(
                { userId: new ObjectId(userId), status: { $in: ["active", "pending"] } },
                { sort: { createdAt: -1 } }
            );

        if (!subscription) {
            return NextResponse.json({ subscription: null, canManageBilling: false });
        }

        return NextResponse.json({
            subscription: subscriptionToPublic(subscription),
            canManageBilling: !!subscription.stripeCustomerId,
        });
    } catch (err) {
        console.error("[/api/subscription/status]", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
