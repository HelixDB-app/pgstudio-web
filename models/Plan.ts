import { ObjectId } from "mongodb";

export const PLANS_COLLECTION = "plans";

export type DiscordAccess = "2days" | "4days" | "none";

export interface PlanDocument {
    _id?: ObjectId;
    name: string;
    slug: string;
    price: number;
    currency: string;
    durationDays: number;
    features: string[];
    discordAccess: DiscordAccess;
    discount?: number;
    promoTag?: string;
    stripeProductId?: string;
    stripePriceId?: string;
    isActive: boolean;
    isFeatured: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface PlanPublic {
    id: string;
    name: string;
    slug: string;
    price: number;
    currency: string;
    durationDays: number;
    features: string[];
    discordAccess: DiscordAccess;
    discount?: number;
    promoTag?: string;
    stripePriceId?: string;
    isActive: boolean;
    isFeatured: boolean;
    sortOrder: number;
}

export function planToPublic(doc: PlanDocument): PlanPublic {
    return {
        id: doc._id!.toString(),
        name: doc.name,
        slug: doc.slug,
        price: doc.price,
        currency: doc.currency,
        durationDays: doc.durationDays,
        features: doc.features,
        discordAccess: doc.discordAccess,
        discount: doc.discount,
        promoTag: doc.promoTag,
        stripePriceId: doc.stripePriceId,
        isActive: doc.isActive,
        isFeatured: doc.isFeatured,
        sortOrder: doc.sortOrder,
    };
}
