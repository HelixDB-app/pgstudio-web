import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { requireAdminAuth } from "@/lib/admin-auth";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(req: NextRequest) {
    const authError = requireAdminAuth(req);
    if (authError) return authError;

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: "Invalid file type. Only JPEG, PNG, WebP, GIF are allowed." },
                { status: 400 }
            );
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: "File too large. Maximum size is 5 MB." },
                { status: 400 }
            );
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const ext = file.name.split(".").pop() || "jpg";
        const filename = `poster_${Date.now()}.${ext}`;
        const postersDir = join(process.cwd(), "public", "posters");

        await mkdir(postersDir, { recursive: true });
        await writeFile(join(postersDir, filename), buffer);

        return NextResponse.json({ path: `/posters/${filename}` });
    } catch (err) {
        console.error("[/api/admin/upload]", err);
        return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
}
