import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import stripe from "@/lib/stripe";
import clientPromise from "@/lib/mongodb";
import { getUserId } from "@/lib/get-user-id";
import { SUBSCRIPTIONS_COLLECTION, type SubscriptionDocument } from "@/models/Subscription";

/**
 * GET /api/subscription/receipt?subscriptionId=xxx
 * Returns the Stripe receipt URL for a subscription. If subscriptionId is omitted, uses the user's latest paid subscription.
 */
export async function GET(req: NextRequest) {
    const userId = await getUserId(req);
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const subscriptionId = searchParams.get("subscriptionId");

    try {
        const client = await clientPromise;
        const db = client.db();
        const coll = db.collection<SubscriptionDocument>(SUBSCRIPTIONS_COLLECTION);

        let sub: SubscriptionDocument | null;
        if (subscriptionId) {
            if (!ObjectId.isValid(subscriptionId)) {
                return NextResponse.json({ error: "Invalid subscription ID" }, { status: 400 });
            }
            sub = await coll.findOne({
                _id: new ObjectId(subscriptionId),
                userId: new ObjectId(userId),
            });
        } else {
            sub = await coll.findOne(
                { userId: new ObjectId(userId) },
                { sort: { createdAt: -1 } }
            );
        }

        if (!sub) {
            return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
        }

        const sessionId = sub.stripeSessionId;
        if (!sessionId) {
            return NextResponse.json(
                { error: "No payment record for this subscription" },
                { status: 404 }
            );
        }

        const session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ["payment_intent.latest_charge"],
        });

        const paymentIntent = session.payment_intent as { latest_charge?: { receipt_url?: string } } | null;
        const charge = paymentIntent?.latest_charge;
        const receiptUrl =
            charge && typeof charge === "object" && charge.receipt_url
                ? charge.receipt_url
                : null;

        if (!receiptUrl) {
            return NextResponse.json(
                { error: "Receipt not yet available for this payment" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            receiptUrl,
            planName: sub.planName,
            date: sub.createdAt.toISOString(),
            amount: sub.paymentAmount,
            currency: sub.paymentCurrency,
        });
    } catch (err) {
        console.error("[/api/subscription/receipt]", err);
        return NextResponse.json({ error: "Failed to load receipt" }, { status: 500 });
    }
}
