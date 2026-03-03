import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { requireAdminAuth } from "@/lib/admin-auth";
import { PLANS_COLLECTION, type PlanDocument } from "@/models/Plan";

export async function GET(req: NextRequest) {
    const authError = requireAdminAuth(req);
    if (authError) return authError;

    try {
        const client = await clientPromise;
        const db = client.db();
        const plans = await db
            .collection<PlanDocument>(PLANS_COLLECTION)
            .find({})
            .sort({ sortOrder: 1 })
            .toArray();
        return NextResponse.json(
            plans.map((p) => ({ ...p, id: p._id!.toString(), _id: undefined }))
        );
    } catch {
        return NextResponse.json({ error: "Failed to fetch plans" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const authError = requireAdminAuth(req);
    if (authError) return authError;

    try {
        const body = await req.json();
        const now = new Date();
        const doc: PlanDocument = {
            name: body.name,
            slug: body.slug || body.name.toLowerCase().replace(/\s+/g, "_"),
            price: Number(body.price) || 0,
            currency: body.currency || "usd",
            durationDays: Number(body.durationDays) || 30,
            features: Array.isArray(body.features) ? body.features : [],
            discordAccess: body.discordAccess || "none",
            discount: body.discount ? Number(body.discount) : undefined,
            promoTag: body.promoTag || undefined,
            stripeProductId: body.stripeProductId || undefined,
            stripePriceId: body.stripePriceId || undefined,
            isActive: body.isActive !== false,
            isFeatured: body.isFeatured === true,
            sortOrder: Number(body.sortOrder) || 0,
            createdAt: now,
            updatedAt: now,
        };

        const client = await clientPromise;
        const db = client.db();
        const result = await db.collection<PlanDocument>(PLANS_COLLECTION).insertOne(doc);
        return NextResponse.json({ id: result.insertedId.toString() }, { status: 201 });
    } catch {
        return NextResponse.json({ error: "Failed to create plan" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    const authError = requireAdminAuth(req);
    if (authError) return authError;

    try {
        const body = await req.json();
        const { id, ...rest } = body;
        if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

        const update: Partial<PlanDocument> = {
            ...rest,
            price: Number(rest.price),
            durationDays: Number(rest.durationDays),
            sortOrder: Number(rest.sortOrder) || 0,
            discount: rest.discount ? Number(rest.discount) : undefined,
            updatedAt: new Date(),
        };
        delete (update as Record<string, unknown>)._id;

        const client = await clientPromise;
        const db = client.db();
        await db
            .collection<PlanDocument>(PLANS_COLLECTION)
            .updateOne({ _id: new ObjectId(id) }, { $set: update });
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: "Failed to update plan" }, { status: 500 });
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
        await db.collection<PlanDocument>(PLANS_COLLECTION).deleteOne({ _id: new ObjectId(id) });
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: "Failed to delete plan" }, { status: 500 });
    }
}
