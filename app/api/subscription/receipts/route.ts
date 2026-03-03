import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import stripe from "@/lib/stripe";
import clientPromise from "@/lib/mongodb";
import { getUserId } from "@/lib/get-user-id";
import { SUBSCRIPTIONS_COLLECTION, type SubscriptionDocument } from "@/models/Subscription";

export interface ReceiptItem {
    subscriptionId: string;
    planName: string;
    date: string;
    amount: number;
    currency: string;
    receiptUrl: string | null;
}

/**
 * GET /api/subscription/receipts
 * Returns a list of the user's payments with receipt URLs when available.
 */
export async function GET(req: NextRequest) {
    const userId = await getUserId(req);
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const client = await clientPromise;
        const db = client.db();
        const subs = await db
            .collection<SubscriptionDocument>(SUBSCRIPTIONS_COLLECTION)
            .find({ userId: new ObjectId(userId), stripeSessionId: { $exists: true } })
            .sort({ createdAt: -1 })
            .limit(50)
            .toArray();

        const items: ReceiptItem[] = [];

        for (const sub of subs) {
            if (!sub.stripeSessionId) continue;
            let receiptUrl: string | null = null;
            try {
                const session = await stripe.checkout.sessions.retrieve(sub.stripeSessionId, {
                    expand: ["payment_intent.latest_charge"],
                });
                const pi = session.payment_intent as { latest_charge?: { receipt_url?: string } } | null;
                const charge = pi?.latest_charge;
                if (charge && typeof charge === "object" && charge.receipt_url) {
                    receiptUrl = charge.receipt_url;
                }
            } catch {
                // Skip this subscription's receipt
            }
            items.push({
                subscriptionId: sub._id!.toString(),
                planName: sub.planName,
                date: sub.createdAt.toISOString(),
                amount: sub.paymentAmount,
                currency: sub.paymentCurrency,
                receiptUrl,
            });
        }

        return NextResponse.json({ receipts: items });
    } catch (err) {
        console.error("[/api/subscription/receipts]", err);
        return NextResponse.json({ error: "Failed to load receipts" }, { status: 500 });
    }
}
