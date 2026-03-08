"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CalendarClock, Copy, Link2, Plus, UsersRound } from "lucide-react";

interface CreateRoomResponse {
    roomId: string;
    shareUrl: string;
    desktopDeepLink: string;
}

function normalizeRoomId(input: string): string {
    return input.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-").slice(0, 64);
}

function defaultStartTimeIso(): string {
    const next = new Date(Date.now() + 60 * 60 * 1000);
    const tzOffset = next.getTimezoneOffset() * 60_000;
    const local = new Date(next.getTime() - tzOffset);
    return local.toISOString().slice(0, 16);
}

export function CollaborationLaunchpad() {
    const [roomInput, setRoomInput] = useState("");
    const [shareUrl, setShareUrl] = useState<string | null>(null);
    const [creatingRoom, setCreatingRoom] = useState(false);

    const [title, setTitle] = useState("PGStudio Team Session");
    const [startsAt, setStartsAt] = useState(defaultStartTimeIso());
    const [durationMinutes, setDurationMinutes] = useState("60");
    const [scheduling, setScheduling] = useState(false);

    const joinHref = useMemo(() => {
        const roomId = normalizeRoomId(roomInput);
        return roomId ? `/collab/${encodeURIComponent(roomId)}` : "";
    }, [roomInput]);

    const createRoom = async () => {
        setCreatingRoom(true);
        try {
            const res = await fetch("/api/collab/rooms", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || `Failed to create room (${res.status})`);
            }
            const data = (await res.json()) as CreateRoomResponse;
            setShareUrl(data.shareUrl);
            toast.success("Collaboration room created");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Could not create room.";
            toast.error(message);
        } finally {
            setCreatingRoom(false);
        }
    };

    const copyShareUrl = async () => {
        if (!shareUrl) return;
        try {
            await navigator.clipboard.writeText(shareUrl);
            toast.success("Share URL copied");
        } catch {
            toast.error("Could not copy the share URL");
        }
    };

    const scheduleSession = async () => {
        const cleanTitle = title.trim();
        if (!cleanTitle) {
            toast.error("Session title is required");
            return;
        }

        setScheduling(true);
        try {
            const res = await fetch("/api/collab/events", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: cleanTitle,
                    startsAt: new Date(startsAt).toISOString(),
                    durationMinutes: Number(durationMinutes || "60"),
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || `Failed to schedule event (${res.status})`);
            }
            const body = await res.json();
            setShareUrl(body.shareUrl ?? null);
            toast.success("Session scheduled");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Could not schedule session.";
            toast.error(message);
        } finally {
            setScheduling(false);
        }
    };

    return (
        <section className="relative mx-auto -mt-6 mb-14 w-full max-w-6xl px-6">
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900/95 via-black to-zinc-950 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
                <div className="grid gap-6 p-5 md:grid-cols-3 md:p-7">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                        <div className="mb-3 flex items-center gap-2">
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-200">
                                <Plus className="h-4 w-4" />
                            </span>
                            <div>
                                <p className="text-sm font-semibold text-white">Create room</p>
                                <p className="text-[11px] text-zinc-500">Generate shareable collaboration URL</p>
                            </div>
                        </div>
                        <Button
                            onClick={() => void createRoom()}
                            disabled={creatingRoom}
                            className="h-9 w-full bg-cyan-500 text-black hover:bg-cyan-400"
                        >
                            <Link2 className="mr-1.5 h-3.5 w-3.5" />
                            {creatingRoom ? "Creating..." : "Create collaboration room"}
                        </Button>
                        {shareUrl && (
                            <div className="mt-3 rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-2">
                                <p className="text-[10px] uppercase tracking-wide text-cyan-200/80">Share URL</p>
                                <p className="mt-1 break-all font-mono text-[11px] text-cyan-100">{shareUrl}</p>
                                <Button size="sm" variant="outline" className="mt-2 h-7 w-full border-cyan-500/40 text-[11px]" onClick={() => void copyShareUrl()}>
                                    <Copy className="mr-1.5 h-3 w-3" /> Copy link
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                        <div className="mb-3 flex items-center gap-2">
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-200">
                                <UsersRound className="h-4 w-4" />
                            </span>
                            <div>
                                <p className="text-sm font-semibold text-white">Join room</p>
                                <p className="text-[11px] text-zinc-500">Paste room id and launch desktop join</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Input
                                value={roomInput}
                                onChange={(e) => setRoomInput(e.target.value)}
                                placeholder="room-abc123"
                                className="h-9 border-white/15 bg-black/50 text-sm text-zinc-100"
                            />
                            <Button
                                className="h-9 bg-emerald-500 text-black hover:bg-emerald-400"
                                disabled={!joinHref}
                                onClick={() => {
                                    if (!joinHref) return;
                                    window.location.href = joinHref;
                                }}
                            >
                                Join
                            </Button>
                        </div>
                        <p className="mt-2 text-[10px] text-zinc-500">
                            Supports direct links from host invites and desktop deep links.
                        </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                        <div className="mb-3 flex items-center gap-2">
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-violet-500/20 text-violet-200">
                                <CalendarClock className="h-4 w-4" />
                            </span>
                            <div>
                                <p className="text-sm font-semibold text-white">Schedule session</p>
                                <p className="text-[11px] text-zinc-500">MongoDB-backed meeting scheduler</p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="h-8 border-white/15 bg-black/50 text-xs text-zinc-100"
                                placeholder="Session title"
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <Input
                                    type="datetime-local"
                                    value={startsAt}
                                    onChange={(e) => setStartsAt(e.target.value)}
                                    className="h-8 border-white/15 bg-black/50 text-xs text-zinc-100"
                                />
                                <Input
                                    type="number"
                                    min={15}
                                    max={1440}
                                    value={durationMinutes}
                                    onChange={(e) => setDurationMinutes(e.target.value)}
                                    className="h-8 border-white/15 bg-black/50 text-xs text-zinc-100"
                                    placeholder="Duration (min)"
                                />
                            </div>
                            <Button
                                className="h-8 w-full bg-violet-500 text-black hover:bg-violet-400"
                                disabled={scheduling}
                                onClick={() => void scheduleSession()}
                            >
                                {scheduling ? "Scheduling..." : "Schedule"}
                            </Button>
                        </div>
                        <Badge variant="outline" className="mt-2 border-violet-500/30 bg-violet-500/10 text-[10px] text-violet-100">
                            Requires sign-in
                        </Badge>
                    </div>
                </div>
            </div>
        </section>
    );
}
