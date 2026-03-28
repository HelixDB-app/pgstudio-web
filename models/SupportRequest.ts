import type { ObjectId } from "mongodb";

export const SUPPORT_REQUESTS_COLLECTION = "support_requests";

export const SUPPORT_TOPICS = [
    "billing",
    "technical",
    "account",
    "sales",
    "other",
] as const;

export type SupportTopic = (typeof SUPPORT_TOPICS)[number];

export interface SupportRequestDocument {
    _id?: ObjectId;
    name: string;
    email: string;
    topic: SupportTopic;
    subject: string;
    message: string;
    userId?: string;
    userAgent?: string;
    clientIp?: string;
    createdAt: Date;
}
