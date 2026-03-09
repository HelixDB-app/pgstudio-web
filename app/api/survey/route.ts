import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getUserId } from "@/lib/get-user-id";
import { USERS_COLLECTION, type UserDocument, type SurveyAnswers } from "@/models/User";
import { ObjectId } from "mongodb";

const ALLOWED_KEYS: (keyof SurveyAnswers)[] = [
    "howDidYouHear",
    "primaryReason",
    "userType",
    "featureInterest",
    "mainDatabase",
];

function sanitizeAnswers(raw: unknown): SurveyAnswers {
    if (!raw || typeof raw !== "object") return {};
    const out: SurveyAnswers = {};
    const obj = raw as Record<string, unknown>;
    for (const key of ALLOWED_KEYS) {
        const v = obj[key];
        if (typeof v === "string" && v.trim().length > 0) {
            out[key] = v.trim().slice(0, 200);
        }
    }
    return out;
}

export async function POST(req: NextRequest) {
    const userId = await getUserId(req);
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const rawAnswers = body && typeof body === "object" && "answers" in body
        ? (body as { answers: unknown }).answers
        : undefined;
    const surveyAnswers = sanitizeAnswers(rawAnswers);

    try {
        const client = await clientPromise;
        const db = client.db();
        await db.collection<UserDocument>(USERS_COLLECTION).updateOne(
            { _id: new ObjectId(userId) },
            {
                $set: {
                    surveyCompletedAt: new Date(),
                    surveyAnswers,
                    updatedAt: new Date(),
                },
            }
        );
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("[api/survey POST]", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
