import { NextRequest, NextResponse } from "next/server";
import stripe from "@/lib/stripe";
import { activateSubscriptionFromSession } from "@/lib/activate-subscription-from-session";

// Disable body parsing so we can read the raw body for Stripe signature verification
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    const sig = req.headers.get("stripe-signature");
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !webhookSecret) {
        return NextResponse.json({ error: "Missing signature or webhook secret" }, { status: 400 });
    }

    let event;
    try {
        const rawBody = await req.arrayBuffer();
        event = stripe.webhooks.constructEvent(Buffer.from(rawBody), sig, webhookSecret);
    } catch (err) {
        console.error("[webhook] Signature verification failed:", err);
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const meta = session.metadata || {};
        if (!meta.userId || !meta.planId || !meta.durationDays) {
            console.error("[webhook] Missing metadata", meta);
            return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
        }

        try {
            const subscription = await activateSubscriptionFromSession(session);
            if (subscription) {
                console.log(`[webhook] Subscription activated for user ${meta.userId}, plan ${meta.planName}`);
            }
        } catch (err) {
            console.error("[webhook] DB error:", err);
            return NextResponse.json({ error: "Database error" }, { status: 500 });
        }
    }

    return NextResponse.json({ received: true });
}
