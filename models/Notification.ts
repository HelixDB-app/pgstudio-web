import { ObjectId } from "mongodb";

export const NOTIFICATIONS_COLLECTION = "notifications";
export const NOTIFICATION_DELIVERIES_COLLECTION = "notification_deliveries";
export const DEVICE_TOKENS_COLLECTION = "device_tokens";

export type NotificationType = "push" | "promotion" | "in_app" | "desktop";
export type NotificationStatus = "draft" | "scheduled" | "sending" | "completed" | "failed";
export type DeliveryStatus = "pending" | "sent" | "failed";
export type DeliveryChannel = "web_fcm" | "desktop_rtdb" | "in_app";
export type DevicePlatform = "web" | "desktop";
export type DeviceOS = "mac" | "windows" | "linux" | "other";

export interface NotificationSegment {
    type: "all" | "selected" | "inactive" | "no_subscription" | "plan";
    userIds?: string[];
    planSlugs?: string[];
    inactiveDays?: number;
    expiringSoonDays?: number;
}

export interface NotificationDocument {
    _id?: ObjectId;
    type: NotificationType;
    title: string;
    body: string;
    imageUrl?: string;
    data?: Record<string, string>;
    segment: NotificationSegment;
    status: NotificationStatus;
    scheduledAt?: Date;
    sentAt?: Date;
    totalTargeted: number;
    totalSent: number;
    totalFailed: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface NotificationPublic {
    id: string;
    type: NotificationType;
    title: string;
    body: string;
    imageUrl?: string;
    segment: NotificationSegment;
    status: NotificationStatus;
    scheduledAt?: string;
    sentAt?: string;
    totalTargeted: number;
    totalSent: number;
    totalFailed: number;
    createdAt: string;
}

export function notificationToPublic(doc: NotificationDocument): NotificationPublic {
    return {
        id: doc._id!.toString(),
        type: doc.type,
        title: doc.title,
        body: doc.body,
        imageUrl: doc.imageUrl,
        segment: doc.segment,
        status: doc.status,
        scheduledAt: doc.scheduledAt?.toISOString(),
        sentAt: doc.sentAt?.toISOString(),
        totalTargeted: doc.totalTargeted,
        totalSent: doc.totalSent,
        totalFailed: doc.totalFailed,
        createdAt: doc.createdAt.toISOString(),
    };
}

export interface NotificationDeliveryDocument {
    _id?: ObjectId;
    notificationId: ObjectId;
    userId: ObjectId;
    channel: DeliveryChannel;
    status: DeliveryStatus;
    sentAt?: Date;
    error?: string;
    openedAt?: Date;
}

export interface DeviceTokenDocument {
    _id?: ObjectId;
    userId: ObjectId;
    token: string;
    platform: DevicePlatform;
    os?: DeviceOS;
    lastActiveAt: Date;
    createdAt: Date;
}
