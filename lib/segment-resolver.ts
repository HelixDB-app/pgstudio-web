import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { USERS_COLLECTION } from "@/models/User";
import { SUBSCRIPTIONS_COLLECTION } from "@/models/Subscription";
import type { NotificationSegment } from "@/models/Notification";

/**
 * Resolve a notification segment to an array of user IDs.
 * Uses efficient MongoDB aggregation with indexes.
 */
export async function resolveSegmentToUserIds(segment: NotificationSegment): Promise<string[]> {
    const client = await clientPromise;
    const db = client.db();

    if (segment.type === "selected" && segment.userIds && segment.userIds.length > 0) {
        return segment.userIds;
    }

    if (segment.type === "all") {
        const users = await db
            .collection(USERS_COLLECTION)
            .find({ deletedAt: { $exists: false }, suspendedAt: { $exists: false } }, { projection: { _id: 1 } })
            .toArray();
        return users.map((u) => u._id!.toString());
    }

    if (segment.type === "inactive") {
        const daysAgo = segment.inactiveDays ?? 30;
        const cutoff = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
        const users = await db
            .collection(USERS_COLLECTION)
            .find(
                {
                    deletedAt: { $exists: false },
                    suspendedAt: { $exists: false },
                    $or: [
                        { lastLoginAt: { $lt: cutoff } },
                        { lastLoginAt: { $exists: false }, createdAt: { $lt: cutoff } },
                    ],
                },
                { projection: { _id: 1 } }
            )
            .toArray();
        return users.map((u) => u._id!.toString());
    }

    if (segment.type === "no_subscription") {
        // Users who have no active/pending subscription
        const allUsers = await db
            .collection(USERS_COLLECTION)
            .find({ deletedAt: { $exists: false } }, { projection: { _id: 1 } })
            .toArray();
        const allUserIds = allUsers.map((u) => u._id!);

        const subscribed = await db
            .collection(SUBSCRIPTIONS_COLLECTION)
            .distinct("userId", { status: { $in: ["active", "pending"] } });
        const subscribedSet = new Set(subscribed.map((id) => id.toString()));

        return allUserIds
            .filter((id) => !subscribedSet.has(id.toString()))
            .map((id) => id.toString());
    }

    if (segment.type === "plan" && segment.planSlugs && segment.planSlugs.length > 0) {
        // Users with active subscription matching the given plan slugs
        const subs = await db
            .collection(SUBSCRIPTIONS_COLLECTION)
            .find(
                {
                    planSlug: { $in: segment.planSlugs },
                    status: "active",
                },
                { projection: { userId: 1 } }
            )
            .toArray();

        const userObjectIds = [...new Set(subs.map((s) => s.userId.toString()))];

        const users = await db
            .collection(USERS_COLLECTION)
            .find(
                {
                    _id: { $in: userObjectIds.map((id) => new ObjectId(id)) },
                    deletedAt: { $exists: false },
                    suspendedAt: { $exists: false },
                },
                { projection: { _id: 1 } }
            )
            .toArray();

        return users.map((u) => u._id!.toString());
    }

    return [];
}
