import { NextRequest, NextResponse } from "next/server";
import stripe from "@/lib/stripe";
import { getUserId } from "@/lib/get-user-id";
import { activateSubscriptionFromSession } from "@/lib/activate-subscription-from-session";

/**
 * Confirms a Stripe Checkout Session and activates the subscription in MongoDB.
 * Call this when the user lands on the payment success page with session_id.
 * Works without webhooks (e.g. local dev). Safe to call multiple times (idempotent).
 */
export async function POST(req: NextRequest) {
    const userId = await getUserId(req);
    if (!userId) {
        return NextResponse.json(
            { error: "You must be signed in to confirm payment." },
            { status: 401 }
        );
    }

    let body: { session_id?: unknown };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json(
            { error: "Invalid request. Send JSON with session_id." },
            { status: 400 }
        );
    }

    const sessionId = body.session_id;
    if (!sessionId || typeof sessionId !== "string" || !sessionId.startsWith("cs_")) {
        return NextResponse.json(
            { error: "Valid session_id is required." },
            { status: 400 }
        );
    }

    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ["payment_intent"],
        });

        if (session.payment_status !== "paid" && session.status !== "complete") {
            return NextResponse.json(
                { error: "Payment not completed yet.", code: "payment_pending" },
                { status: 400 }
            );
        }

        const meta = session.metadata || {};
        if (meta.userId && meta.userId !== userId) {
            return NextResponse.json(
                { error: "This session does not belong to your account." },
                { status: 403 }
            );
        }

        const subscription = await activateSubscriptionFromSession(session);
        if (!subscription) {
            return NextResponse.json(
                { error: "Could not activate subscription. Missing session data." },
                { status: 400 }
            );
        }

        return NextResponse.json({ subscription });
    } catch (err) {
        console.error("[payment/confirm]", err);
        return NextResponse.json(
            { error: "We couldn't confirm your payment. Please try again or contact support." },
            { status: 500 }
        );
    }
}
