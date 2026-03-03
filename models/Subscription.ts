import { ObjectId } from "mongodb";

export const SUBSCRIPTIONS_COLLECTION = "subscriptions";

export type SubscriptionStatus = "active" | "expired" | "cancelled" | "pending";

export interface SubscriptionDocument {
    _id?: ObjectId;
    userId: ObjectId;
    planId: ObjectId;
    planName: string;
    planSlug: string;
    status: SubscriptionStatus;
    discordAccess: string;
    stripeSessionId?: string;
    stripePaymentIntentId?: string;
    stripeCustomerId?: string;
    startDate: Date;
    endDate: Date;
    paymentAmount: number;
    paymentCurrency: string;
    cancelledAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface SubscriptionPublic {
    id: string;
    planName: string;
    planSlug: string;
    status: SubscriptionStatus;
    discordAccess: string;
    startDate: string;
    endDate: string;
    paymentAmount: number;
    paymentCurrency: string;
    cancelledAt?: string;
}

export function subscriptionToPublic(doc: SubscriptionDocument): SubscriptionPublic {
    return {
        id: doc._id!.toString(),
        planName: doc.planName,
        planSlug: doc.planSlug,
        status: doc.status,
        discordAccess: doc.discordAccess,
        startDate: doc.startDate.toISOString(),
        endDate: doc.endDate.toISOString(),
        paymentAmount: doc.paymentAmount,
        paymentCurrency: doc.paymentCurrency,
        cancelledAt: doc.cancelledAt?.toISOString(),
    };
}
