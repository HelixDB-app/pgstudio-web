import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import Stripe from "stripe";
import stripe from "@/lib/stripe";
import clientPromise from "@/lib/mongodb";
import { getUserId } from "@/lib/get-user-id";
import { PLANS_COLLECTION, type PlanDocument } from "@/models/Plan";
import { USERS_COLLECTION, type UserDocument } from "@/models/User";

const OBJECT_ID_HEX_LENGTH = 24;
const STRIPE_METADATA_MAX_LENGTH = 500;

function isValidObjectIdHex(value: string): boolean {
    return typeof value === "string" && /^[a-fA-F0-9]{24}$/.test(value);
}

function truncateMetadata(value: string): string {
    if (value.length <= STRIPE_METADATA_MAX_LENGTH) return value;
    return value.slice(0, STRIPE_METADATA_MAX_LENGTH - 3) + "...";
}

export async function POST(req: NextRequest) {
    const userId = await getUserId(req);
    if (!userId) {
        return NextResponse.json(
            { error: "You must be signed in to subscribe." },
            { status: 401 }
        );
    }

    let body: { planId?: unknown };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json(
            { error: "Invalid request body. Expected JSON with planId." },
            { status: 400 }
        );
    }

    const { planId } = body;
    if (!planId || typeof planId !== "string") {
        return NextResponse.json(
            { error: "planId is required and must be a string." },
            { status: 400 }
        );
    }

    if (!isValidObjectIdHex(planId)) {
        return NextResponse.json(
            { error: "Invalid plan ID format." },
            { status: 400 }
        );
    }

    try {
        const client = await clientPromise;
        const db = client.db();
        const plan = await db
            .collection<PlanDocument>(PLANS_COLLECTION)
            .findOne({ _id: new ObjectId(planId), isActive: true });

        if (!plan) {
            return NextResponse.json(
                { error: "Plan not found or no longer available." },
                { status: 404 }
            );
        }

        const amount = Number(plan.price);
        if (!Number.isInteger(amount) || amount < 1) {
            return NextResponse.json(
                { error: "This plan cannot be purchased via checkout. Use the free sign-up option instead." },
                { status: 400 }
            );
        }

        const appUrl = (process.env.NEXT_PUBLIC_WEB_APP_URL || "https://pgstudio-web.vercel.app").replace(/\/$/, "");
        const currency = (plan.currency || "usd").toLowerCase().slice(0, 3);

        const user = await db.collection<UserDocument>(USERS_COLLECTION).findOne({ _id: new ObjectId(userId) });
        const customerEmail = user?.email ?? undefined;

        // ── Resolve checkout URL ─────────────────────────────────────────────
        //
        // Priority:
        //  1. If stripePriceId is a full buy.stripe.com payment link URL → use it directly.
        //  2. If stripePriceId is a valid Stripe Price ID (starts with "price_") → create
        //     a Stripe Checkout Session referencing it.
        //  3. Otherwise → create a Stripe Checkout Session with inline price_data.
        //
        const rawPriceId = plan.stripePriceId?.trim() ?? "";

        // Pattern 1: full Stripe payment link URL
        const isPaymentLinkUrl =
            rawPriceId.startsWith("https://buy.stripe.com/") ||
            rawPriceId.startsWith("https://checkout.stripe.com/");

        if (isPaymentLinkUrl) {
            // Append prefilled email if possible (buy.stripe.com supports ?prefilled_email=)
            const linkUrl = new URL(rawPriceId);
            if (customerEmail) linkUrl.searchParams.set("prefilled_email", customerEmail);
            return NextResponse.json({ url: linkUrl.toString() });
        }

        // Pattern 2: proper Stripe Price ID (starts with "price_" and is at least 10 chars)
        const isStripePriceId = /^price_[A-Za-z0-9]{6,}$/.test(rawPriceId);

        const metadata: Stripe.MetadataParam = {
            userId: truncateMetadata(userId),
            planId: truncateMetadata(plan._id!.toString()),
            planName: truncateMetadata(plan.name),
            planSlug: truncateMetadata(plan.slug),
            durationDays: String(plan.durationDays),
            discordAccess: String(plan.discordAccess),
        };

        const baseParams: Stripe.Checkout.SessionCreateParams = {
            mode: "payment",
            payment_method_types: ["card"],
            metadata,
            customer_email: customerEmail,
            success_url: `${appUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${appUrl}/payment/failed`,
        };

        const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = isStripePriceId
            ? [{ price: rawPriceId, quantity: 1 }]
            : [
                  {
                      price_data: {
                          currency,
                          unit_amount: amount,
                          product_data: {
                              name: truncateMetadata(plan.name),
                              description: truncateMetadata(
                                  `${plan.durationDays}-day access to pgStudio ${plan.name}`
                              ),
                          },
                      },
                      quantity: 1,
                  },
              ];

        const session = await stripe.checkout.sessions.create({
            ...baseParams,
            line_items: lineItems,
        });

        if (!session.url) {
            console.error("[stripe/checkout] Session created but url missing", { sessionId: session.id });
            return NextResponse.json(
                { error: "Checkout could not be started. Please try again." },
                { status: 500 }
            );
        }

        return NextResponse.json({ url: session.url });
    } catch (err) {
        if (err instanceof Stripe.errors.StripeError) {
            const code = err.code ?? err.type;
            const message = err.message || "Stripe error";
            console.error("[stripe/checkout] Stripe error", {
                code,
                type: err.type,
                message,
                statusCode: err.statusCode,
            });

            if (err instanceof Stripe.errors.StripeAuthenticationError) {
                return NextResponse.json(
                    { error: "Payment provider is misconfigured. Please contact support." },
                    { status: 503 }
                );
            }
            if (err instanceof Stripe.errors.StripeInvalidRequestError) {
                return NextResponse.json(
                    { error: "Invalid payment request. Please try again or choose another plan." },
                    { status: 400 }
                );
            }
            if (err instanceof Stripe.errors.StripeRateLimitError) {
                return NextResponse.json(
                    { error: "Too many requests. Please wait a moment and try again." },
                    { status: 429 }
                );
            }
            if (err instanceof Stripe.errors.StripeAPIError) {
                return NextResponse.json(
                    { error: "Payment service is temporarily unavailable. Please try again later." },
                    { status: 502 }
                );
            }

            return NextResponse.json(
                { error: "We couldn't start checkout. Please try again." },
                { status: 502 }
            );
        }

        console.error("[stripe/checkout] Unexpected error", err);
        return NextResponse.json(
            { error: "Something went wrong. Please try again." },
            { status: 500 }
        );
    }
}
