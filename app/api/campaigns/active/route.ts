import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { getUserId } from "@/lib/get-user-id";
import { CAMPAIGNS_COLLECTION, campaignToPublic, type CampaignDocument } from "@/models/Campaign";
import { SUBSCRIPTIONS_COLLECTION } from "@/models/Subscription";

export async function GET(req: NextRequest) {
    try {
        const client = await clientPromise;
        const db = client.db();
        const now = new Date();

        const campaign = await db
            .collection<CampaignDocument>(CAMPAIGNS_COLLECTION)
            .findOne({
                isActive: true,
                startDate: { $lte: now },
                endDate: { $gte: now },
            });

        if (!campaign) {
            return NextResponse.json({ campaign: null, eligible: false });
        }

        // Determine eligibility for first-time-only campaigns
        let eligible = true;
        if (campaign.firstTimeOnly) {
            const userId = await getUserId(req);
            if (userId) {
                const hasSubscription = await db
                    .collection(SUBSCRIPTIONS_COLLECTION)
                    .findOne({ userId: new ObjectId(userId) }, { projection: { _id: 1 } });
                if (hasSubscription) {
                    return NextResponse.json({ campaign: null, eligible: false });
                }
            }
        }

        return NextResponse.json({ campaign: campaignToPublic(campaign), eligible });
    } catch {
        return NextResponse.json({ error: "Failed to fetch campaign" }, { status: 500 });
    }
}
