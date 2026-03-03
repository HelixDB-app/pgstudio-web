import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { PLANS_COLLECTION, planToPublic, type PlanDocument } from "@/models/Plan";

export async function GET() {
    try {
        const client = await clientPromise;
        const db = client.db();
        const plans = await db
            .collection<PlanDocument>(PLANS_COLLECTION)
            .find({ isActive: true })
            .sort({ sortOrder: 1 })
            .toArray();

        return NextResponse.json(plans.map(planToPublic));
    } catch {
        return NextResponse.json({ error: "Failed to fetch plans" }, { status: 500 });
    }
}
