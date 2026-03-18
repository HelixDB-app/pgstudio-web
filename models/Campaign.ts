import { ObjectId } from "mongodb";

export const CAMPAIGNS_COLLECTION = "campaigns";

export interface CampaignDocument {
    _id?: ObjectId;
    title: string;
    description: string;
    discountPercentage: number;
    badgeText?: string;
    couponCode?: string;
    stripeCouponId?: string;
    firstTimeOnly?: boolean;
    posterPath?: string;
    startDate: Date;
    endDate: Date;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface CampaignPublic {
    id: string;
    title: string;
    description: string;
    discountPercentage: number;
    badgeText?: string;
    couponCode?: string;
    stripeCouponId?: string;
    firstTimeOnly?: boolean;
    posterPath?: string;
    startDate: string;
    endDate: string;
}

export function campaignToPublic(doc: CampaignDocument): CampaignPublic {
    return {
        id: doc._id!.toString(),
        title: doc.title,
        description: doc.description,
        discountPercentage: doc.discountPercentage,
        badgeText: doc.badgeText,
        couponCode: doc.couponCode,
        stripeCouponId: doc.stripeCouponId,
        firstTimeOnly: doc.firstTimeOnly,
        posterPath: doc.posterPath,
        startDate: doc.startDate.toISOString(),
        endDate: doc.endDate.toISOString(),
    };
}
