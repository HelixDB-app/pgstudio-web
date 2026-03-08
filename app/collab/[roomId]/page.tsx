"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink, Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";

function normalizeRoomId(input: string): string {
    return input.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-").slice(0, 64);
}

export default function CollaborationJoinPage() {
    const params = useParams<{ roomId: string }>();
    const [opening, setOpening] = useState(false);

    const roomId = useMemo(() => normalizeRoomId(params?.roomId ?? ""), [params?.roomId]);
    const deepLink = useMemo(
        () => `pgstudio://collab/join?room=${encodeURIComponent(roomId)}`,
        [roomId]
    );

    const openDesktop = async () => {
        if (!roomId) return;
        setOpening(true);
        try {
            window.location.href = deepLink;
            setTimeout(() => setOpening(false), 1400);
        } catch {
            setOpening(false);
        }
    };

    const copyDeepLink = async () => {
        try {
            await navigator.clipboard.writeText(deepLink);
            toast.success("Desktop join link copied");
        } catch {
            toast.error("Could not copy the join link");
        }
    };

    return (
        <section className="mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col items-center justify-center px-6 py-14 text-center">
            <Badge className="mb-4 border-cyan-500/40 bg-cyan-500/15 text-cyan-200">PGStudio Collaboration</Badge>
            <h1 className="text-3xl font-semibold tracking-tight text-white">Open this session in desktop PGStudio</h1>
            <p className="mt-3 text-sm text-zinc-400">
                Room <span className="font-mono text-zinc-200">{roomId || "invalid"}</span>
            </p>

            <div className="mt-8 w-full rounded-2xl border border-white/10 bg-zinc-900/60 p-5 text-left shadow-2xl">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Desktop deep link</p>
                <div className="mt-2 rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs text-zinc-200 break-all">
                    {deepLink}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                        className="gap-1.5"
                        onClick={() => void openDesktop()}
                        disabled={!roomId || opening}
                    >
                        {opening ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
                        Open PGStudio
                    </Button>
                    <Button variant="outline" className="gap-1.5" onClick={() => void copyDeepLink()}>
                        <Copy className="h-3.5 w-3.5" />
                        Copy join link
                    </Button>
                </div>

                <div className="mt-4 rounded-lg border border-white/8 bg-white/5 px-3 py-2 text-xs text-zinc-400">
                    If nothing opens, install desktop PGStudio first, then paste the copied link in your browser address bar.
                </div>
            </div>

            <button
                className="mt-5 inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200"
                onClick={() => void openDesktop()}
                disabled={!roomId || opening}
            >
                <Link2 className="h-3.5 w-3.5" /> Try opening again
            </button>
        </section>
    );
}
