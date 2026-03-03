import { ObjectId } from "mongodb";
import type Stripe from "stripe";
import clientPromise from "@/lib/mongodb";
import {
    SUBSCRIPTIONS_COLLECTION,
    subscriptionToPublic,
    type SubscriptionDocument,
    type SubscriptionPublic,
} from "@/models/Subscription";

/**
 * Idempotent: creates or updates subscription from a Stripe Checkout Session.
 * If a subscription with this stripeSessionId already exists, returns it without duplicating.
 * Used by both the webhook and the payment/confirm API (so local dev works without webhooks).
 */
export async function activateSubscriptionFromSession(
    session: Stripe.Checkout.Session
): Promise<SubscriptionPublic | null> {
    const meta = session.metadata || {};
    const { userId, planId, planName, planSlug, durationDays, discordAccess } = meta;

    if (!userId || !planId || !durationDays) {
        return null;
    }

    const client = await clientPromise;
    const db = client.db();
    const coll = db.collection<SubscriptionDocument>(SUBSCRIPTIONS_COLLECTION);
    const now = new Date();
    const durationMs = parseInt(String(durationDays), 10) * 24 * 60 * 60 * 1000;
    const endDate = new Date(now.getTime() + (Number.isNaN(durationMs) ? 30 * 24 * 60 * 60 * 1000 : durationMs));

    // Idempotent: if we already have a subscription for this session, return it
    const existing = await coll.findOne({ stripeSessionId: session.id });
    if (existing) {
        return subscriptionToPublic(existing);
    }

    // Cancel any other active subscription for this user
    await coll.updateMany(
        { userId: new ObjectId(userId), status: { $in: ["active", "pending"] } },
        { $set: { status: "cancelled", cancelledAt: now, updatedAt: now } }
    );

    const doc: SubscriptionDocument = {
        userId: new ObjectId(userId),
        planId: new ObjectId(planId),
        planName: planName || "Unknown Plan",
        planSlug: planSlug || "unknown",
        status: "active",
        discordAccess: discordAccess || "none",
        stripeSessionId: session.id,
        stripePaymentIntentId:
            typeof session.payment_intent === "string" ? session.payment_intent : undefined,
        stripeCustomerId: typeof session.customer === "string" ? session.customer : undefined,
        startDate: now,
        endDate,
        paymentAmount: session.amount_total ?? 0,
        paymentCurrency: session.currency ?? "usd",
        createdAt: now,
        updatedAt: now,
    };

    await coll.insertOne(doc);
    return subscriptionToPublic(doc);
}
