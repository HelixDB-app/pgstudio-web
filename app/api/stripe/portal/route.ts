import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import stripe from "@/lib/stripe";
import clientPromise from "@/lib/mongodb";
import { getUserId } from "@/lib/get-user-id";
import { SUBSCRIPTIONS_COLLECTION, type SubscriptionDocument } from "@/models/Subscription";

/**
 * POST /api/stripe/portal
 * Creates a Stripe Customer Billing Portal session and returns the URL.
 * User can manage payment methods, view invoices, and update billing details.
 */
export async function POST(req: NextRequest) {
    const userId = await getUserId(req);
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const client = await clientPromise;
        const db = client.db();
        const sub = await db
            .collection<SubscriptionDocument>(SUBSCRIPTIONS_COLLECTION)
            .findOne(
                { userId: new ObjectId(userId), stripeCustomerId: { $exists: true } },
                { sort: { createdAt: -1 } }
            );

        const customerId = sub?.stripeCustomerId;
        if (!customerId || typeof customerId !== "string") {
            return NextResponse.json(
                { error: "No billing profile found. Make a purchase to manage billing." },
                { status: 400 }
            );
        }

        const appUrl = (process.env.NEXT_PUBLIC_WEB_APP_URL || "http://localhost:3001").replace(/\/$/, "");
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${appUrl}/profile`,
        });

        return NextResponse.json({ url: portalSession.url });
    } catch (err) {
        console.error("[/api/stripe/portal]", err);
        return NextResponse.json(
            { error: "Could not open billing portal. Please try again." },
            { status: 500 }
        );
    }
}
