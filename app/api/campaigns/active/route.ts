import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { CAMPAIGNS_COLLECTION, campaignToPublic, type CampaignDocument } from "@/models/Campaign";

export async function GET() {
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
            return NextResponse.json(null);
        }

        return NextResponse.json(campaignToPublic(campaign));
    } catch {
        return NextResponse.json({ error: "Failed to fetch campaign" }, { status: 500 });
    }
}
