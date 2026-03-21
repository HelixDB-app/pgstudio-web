import type { ObjectId } from "mongodb";

export const BETA_FEEDBACK_COLLECTION = "beta_feedback";

export const BETA_FEEDBACK_CATEGORIES = [
    "general",
    "idea",
    "bug",
    "feature",
] as const;

export type BetaFeedbackCategory = (typeof BETA_FEEDBACK_CATEGORIES)[number];

export interface BetaFeedbackDocument {
    _id?: ObjectId;
    userId: string;
    userName?: string;
    userEmail?: string;
    message: string;
    category: BetaFeedbackCategory;
    contactEmail?: string;
    appVersion?: string;
    platform?: string;
    userAgent?: string;
    clientLocale?: string;
    createdAt: Date;
}
