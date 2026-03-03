import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { requireAdminAuth } from "@/lib/admin-auth";
import { CAMPAIGNS_COLLECTION, type CampaignDocument } from "@/models/Campaign";

export async function GET(req: NextRequest) {
    const authError = requireAdminAuth(req);
    if (authError) return authError;

    try {
        const client = await clientPromise;
        const db = client.db();
        const campaigns = await db
            .collection<CampaignDocument>(CAMPAIGNS_COLLECTION)
            .find({})
            .sort({ createdAt: -1 })
            .toArray();
        return NextResponse.json(
            campaigns.map((c) => ({ ...c, id: c._id!.toString(), _id: undefined }))
        );
    } catch {
        return NextResponse.json({ error: "Failed to fetch campaigns" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const authError = requireAdminAuth(req);
    if (authError) return authError;

    try {
        const body = await req.json();
        const now = new Date();
        const doc: CampaignDocument = {
            title: body.title,
            description: body.description,
            discountPercentage: Number(body.discountPercentage) || 0,
            badgeText: body.badgeText || undefined,
            posterPath: body.posterPath || undefined,
            startDate: new Date(body.startDate),
            endDate: new Date(body.endDate),
            isActive: body.isActive !== false,
            createdAt: now,
            updatedAt: now,
        };

        const client = await clientPromise;
        const db = client.db();
        const result = await db.collection<CampaignDocument>(CAMPAIGNS_COLLECTION).insertOne(doc);
        return NextResponse.json({ id: result.insertedId.toString() }, { status: 201 });
    } catch {
        return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    const authError = requireAdminAuth(req);
    if (authError) return authError;

    try {
        const body = await req.json();
        const { id, ...rest } = body;
        if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

        const update: Partial<CampaignDocument> = {
            ...rest,
            discountPercentage: Number(rest.discountPercentage) || 0,
            startDate: new Date(rest.startDate),
            endDate: new Date(rest.endDate),
            updatedAt: new Date(),
        };
        delete (update as Record<string, unknown>)._id;

        const client = await clientPromise;
        const db = client.db();
        await db
            .collection<CampaignDocument>(CAMPAIGNS_COLLECTION)
            .updateOne({ _id: new ObjectId(id) }, { $set: update });
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: "Failed to update campaign" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const authError = requireAdminAuth(req);
    if (authError) return authError;

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

        const client = await clientPromise;
        const db = client.db();
        await db
            .collection<CampaignDocument>(CAMPAIGNS_COLLECTION)
            .deleteOne({ _id: new ObjectId(id) });
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: "Failed to delete campaign" }, { status: 500 });
    }
}
