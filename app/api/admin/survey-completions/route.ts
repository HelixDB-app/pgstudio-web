import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requireAdminAuth } from "@/lib/admin-auth";
import { USERS_COLLECTION, type UserDocument, type SurveyAnswers } from "@/models/User";

export interface SurveyCompletionItem {
    id: string;
    name: string;
    email: string;
    image?: string;
    provider: string;
    surveyCompletedAt: string;
    surveyAnswers: SurveyAnswers;
}

export async function GET(req: NextRequest) {
    const authErr = requireAdminAuth(req);
    if (authErr) return authErr;

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "25")));
    const search = searchParams.get("search")?.trim();

    const filter: Record<string, unknown> = {
        surveyCompletedAt: { $exists: true, $ne: null },
        deletedAt: { $exists: false },
    };

    if (search) {
        const regex = new RegExp(search, "i");
        filter.$or = [{ name: regex }, { email: regex }];
    }

    try {
        const client = await clientPromise;
        const db = client.db();

        const [items, total] = await Promise.all([
            db
                .collection<UserDocument>(USERS_COLLECTION)
                .find(filter, {
                    projection: {
                        passwordHash: 0,
                        activeSessionToken: 0,
                    },
                })
                .sort({ surveyCompletedAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .toArray(),
            db.collection<UserDocument>(USERS_COLLECTION).countDocuments(filter),
        ]);

        const list: SurveyCompletionItem[] = items.map((u) => ({
            id: u._id!.toString(),
            name: u.name ?? "",
            email: u.email ?? "",
            image: u.image,
            provider: u.provider ?? "credentials",
            surveyCompletedAt:
                u.surveyCompletedAt instanceof Date
                    ? u.surveyCompletedAt.toISOString()
                    : String(u.surveyCompletedAt ?? ""),
            surveyAnswers: u.surveyAnswers ?? {},
        }));

        return NextResponse.json({
            list,
            total,
            page,
            pages: Math.ceil(total / limit),
        });
    } catch (err) {
        console.error("[admin/survey-completions GET]", err);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
