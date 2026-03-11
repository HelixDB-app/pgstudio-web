"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CalendarClock, Copy, Link2, Plus, UsersRound, ArrowRight } from "lucide-react";

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
        <section
            id="collaboration"
            className="relative flex min-h-screen w-full flex-col items-center justify-center border-t border-white/5 py-24 md:py-32"
        >
            {/* Background */}
            <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_30%,rgba(6,182,212,0.06),transparent)]" />
            <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_70%,rgba(16,185,129,0.04),transparent)]" />

            <div className="mx-auto w-full max-w-6xl px-6">
                {/* Section header */}
                <div className="reveal mb-16 text-center md:mb-20">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-zinc-300 backdrop-blur-sm">
                        <UsersRound className="h-3.5 w-3.5 text-cyan-400" />
                        <span>Real-time collaboration</span>
                    </div>
                    <h2 className="text-4xl font-medium tracking-tight text-white md:text-5xl">
                        Collaboration Launchpad
                    </h2>
                    <p className="mx-auto mt-5 max-w-2xl text-lg font-light leading-relaxed text-zinc-500">
                        Create rooms, invite teammates, or schedule sessions. One place to start and join
                        pgStudio collaboration sessions.
                    </p>
                </div>

                {/* Cards container */}
                <div className="grid gap-6 md:grid-cols-3">
                    {/* Create room */}
                    <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-[#0a0a0a] p-8 transition-colors hover:border-cyan-500/30 hover:bg-[#0d0d0d]">
                        <div className="absolute top-0 right-0 h-48 w-48 rounded-full bg-cyan-500/10 blur-[80px] transition-opacity group-hover:opacity-100" />
                        <div className="relative">
                            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/20">
                                <Plus className="h-5 w-5" />
                            </div>
                            <h3 className="mb-2 text-xl font-medium text-white">Create room</h3>
                            <p className="mb-6 text-sm font-light leading-relaxed text-zinc-500">
                                Generate a shareable link and invite others to join your session in one click.
                            </p>
                            <Button
                                onClick={() => void createRoom()}
                                disabled={creatingRoom}
                                className="h-11 w-full rounded-xl bg-cyan-500 font-medium text-black transition-all hover:bg-cyan-400 hover:shadow-[0_0_24px_rgba(6,182,212,0.25)]"
                            >
                                <Link2 className="mr-2 h-4 w-4" />
                                {creatingRoom ? "Creating…" : "Create collaboration room"}
                            </Button>
                            {shareUrl && (
                                <div className="mt-6 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                                    <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-cyan-400/90">
                                        Share URL
                                    </p>
                                    <p className="mb-3 break-all font-mono text-xs text-cyan-100/90">{shareUrl}</p>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-9 w-full rounded-lg border-cyan-500/30 bg-transparent text-xs font-medium text-cyan-200 hover:bg-cyan-500/10 hover:text-cyan-100"
                                        onClick={() => void copyShareUrl()}
                                    >
                                        <Copy className="mr-2 h-3.5 w-3.5" />
                                        Copy link
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Join room */}
                    <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-[#0a0a0a] p-8 transition-colors hover:border-emerald-500/30 hover:bg-[#0d0d0d]">
                        <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-emerald-500/10 blur-[80px] transition-opacity group-hover:opacity-100" />
                        <div className="relative">
                            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20">
                                <UsersRound className="h-5 w-5" />
                            </div>
                            <h3 className="mb-2 text-xl font-medium text-white">Join room</h3>
                            <p className="mb-6 text-sm font-light leading-relaxed text-zinc-500">
                                Enter a room ID or paste the invite link to open the session in pgStudio.
                            </p>
                            <div className="space-y-3">
                                <Input
                                    value={roomInput}
                                    onChange={(e) => setRoomInput(e.target.value)}
                                    placeholder="room-abc123 or full URL"
                                    className="h-11 rounded-xl border-white/10 bg-black/50 px-4 text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-emerald-500/30"
                                />
                                <Button
                                    className="h-11 w-full rounded-xl bg-emerald-500 font-medium text-black transition-all hover:bg-emerald-400 hover:shadow-[0_0_24px_rgba(16,185,129,0.25)] disabled:opacity-50"
                                    disabled={!joinHref}
                                    onClick={() => {
                                        if (!joinHref) return;
                                        window.location.href = joinHref;
                                    }}
                                >
                                    Join room
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                            <p className="mt-4 text-xs font-light text-zinc-600">
                                Works with direct invite links and desktop deep links.
                            </p>
                        </div>
                    </div>

                    {/* Schedule session */}
                    <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-[#0a0a0a] p-8 transition-colors hover:border-violet-500/30 hover:bg-[#0d0d0d]">
                        <div className="absolute top-1/2 right-0 h-48 w-48 -translate-y-1/2 rounded-full bg-violet-500/10 blur-[80px] transition-opacity group-hover:opacity-100" />
                        <div className="relative">
                            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-400 ring-1 ring-violet-500/20">
                                <CalendarClock className="h-5 w-5" />
                            </div>
                            <h3 className="mb-2 text-xl font-medium text-white">Schedule session</h3>
                            <p className="mb-6 text-sm font-light leading-relaxed text-zinc-500">
                                Set a title, time, and duration. Get a shareable link for your team meeting.
                            </p>
                            <div className="space-y-4">
                                <Input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="h-10 rounded-xl border-white/10 bg-black/50 px-4 text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-violet-500/30"
                                    placeholder="Session title"
                                />
                                <div className="grid grid-cols-2 gap-3">
                                    <Input
                                        type="datetime-local"
                                        value={startsAt}
                                        onChange={(e) => setStartsAt(e.target.value)}
                                        className="h-10 rounded-xl border-white/10 bg-black/50 px-4 text-xs text-zinc-100 focus-visible:ring-violet-500/30"
                                    />
                                    <Input
                                        type="number"
                                        min={15}
                                        max={1440}
                                        value={durationMinutes}
                                        onChange={(e) => setDurationMinutes(e.target.value)}
                                        className="h-10 rounded-xl border-white/10 bg-black/50 px-4 text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-violet-500/30"
                                        placeholder="Min"
                                    />
                                </div>
                                <Button
                                    className="h-11 w-full rounded-xl bg-violet-500 font-medium text-black transition-all hover:bg-violet-400 hover:shadow-[0_0_24px_rgba(139,92,246,0.25)] disabled:opacity-50"
                                    disabled={scheduling}
                                    onClick={() => void scheduleSession()}
                                >
                                    {scheduling ? "Scheduling…" : "Schedule session"}
                                </Button>
                            </div>
                            <Badge
                                variant="outline"
                                className="mt-4 border-violet-500/25 bg-violet-500/10 px-2.5 py-0.5 text-[10px] font-medium text-violet-200/90"
                            >
                                Requires sign-in
                            </Badge>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
