import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getUserId } from "@/lib/get-user-id";
import { USERS_COLLECTION, type UserDocument } from "@/models/User";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest) {
    const userId = await getUserId(req);
    if (!userId) {
        return NextResponse.json({ completed: false });
    }

    try {
        const client = await clientPromise;
        const db = client.db();
        const user = await db
            .collection<UserDocument>(USERS_COLLECTION)
            .findOne(
                { _id: new ObjectId(userId) },
                { projection: { surveyCompletedAt: 1 } }
            );
        const completed = !!(user?.surveyCompletedAt);
        return NextResponse.json({ completed });
    } catch (err) {
        console.error("[api/survey/status GET]", err);
        return NextResponse.json({ completed: false });
    }
}
