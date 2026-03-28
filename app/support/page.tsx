"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
    AlertCircle,
    CheckCircle2,
    Headphones,
    LifeBuoy,
    Loader2,
    Mail,
    Send,
    ShieldCheck,
} from "lucide-react";
import { SUPPORT_TOPICS, type SupportTopic } from "@/models/SupportRequest";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const TOPIC_LABELS: Record<SupportTopic, string> = {
    billing: "Billing & subscriptions",
    technical: "Technical issue",
    account: "Account & sign-in",
    sales: "Sales & licensing",
    other: "Something else",
};

const NAME_MIN = 2;
const NAME_MAX = 120;
const SUBJECT_MIN = 5;
const SUBJECT_MAX = 200;
const MESSAGE_MIN = 20;
const MESSAGE_MAX = 8000;

type FieldErrors = Partial<Record<"name" | "email" | "subject" | "message", string>>;

function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function SupportPage() {
    const { data: session } = useSession();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [topic, setTopic] = useState<SupportTopic>("technical");
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");
    const [errors, setErrors] = useState<FieldErrors>({});
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const honeypotRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (session?.user?.name && !name) {
            setName(session.user.name);
        }
        if (session?.user?.email && !email) {
            setEmail(session.user.email);
        }
    }, [session?.user?.email, session?.user?.name, name, email]);

    function validate(): FieldErrors {
        const next: FieldErrors = {};
        if (name.trim().length < NAME_MIN) {
            next.name = `Please enter your name (at least ${NAME_MIN} characters).`;
        }
        if (!isValidEmail(email)) {
            next.email = "Please enter a valid email address.";
        }
        const sub = subject.trim();
        if (sub.length < SUBJECT_MIN || sub.length > SUBJECT_MAX) {
            next.subject = `Subject should be ${SUBJECT_MIN}–${SUBJECT_MAX} characters.`;
        }
        const msg = message.trim();
        if (msg.length < MESSAGE_MIN || msg.length > MESSAGE_MAX) {
            next.message = `Message should be ${MESSAGE_MIN}–${MESSAGE_MAX} characters.`;
        }
        return next;
    }

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSubmitError(null);
        setSubmitted(false);

        const v = validate();
        if (Object.keys(v).length > 0) {
            setErrors(v);
            return;
        }
        setErrors({});
        setIsSubmitting(true);

        try {
            const res = await fetch("/api/support-requests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: name.trim(),
                    email: email.trim().toLowerCase(),
                    topic,
                    subject: subject.trim(),
                    message: message.trim(),
                    website: honeypotRef.current?.value ?? "",
                }),
            });
            const data = (await res.json()) as { success?: boolean; error?: string };

            if (!res.ok) {
                throw new Error(data.error || "Could not send your message.");
            }

            setSubmitted(true);
            toast.success("Message sent. We will get back to you soon.");
            setSubject("");
            setMessage("");
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Something went wrong.";
            setSubmitError(msg);
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-black text-zinc-200">
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10 md:py-14">
                <header className="space-y-4 border-b border-white/10 pb-8">
                    <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs text-sky-300">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Official support channel
                    </div>
                    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                        <div className="space-y-2">
                            <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
                                How can we help?
                            </h1>
                            <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">
                                Send a message to our team. Include enough detail so we can assist quickly—
                                product version, steps you tried, and any error text help a lot. For app bugs
                                with screenshots, use{" "}
                                <a href="/report-bug" className="text-sky-400 underline-offset-2 hover:underline">
                                    Report a bug
                                </a>
                                .
                            </p>
                        </div>
                        <a
                            href="mailto:support@pgstudio.app"
                            className="inline-flex items-center gap-2 self-start rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-zinc-200 transition-colors hover:border-white/25 hover:bg-white/10"
                        >
                            <Mail className="h-4 w-4 text-zinc-400" />
                            support@pgstudio.app
                        </a>
                    </div>
                </header>

                <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,280px)]">
                    <Card className="border-white/10 bg-zinc-950/80">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base text-white">
                                <Send className="h-4 w-4 text-sky-400" />
                                Contact form
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form className="relative space-y-5" onSubmit={onSubmit} noValidate>
                                {/* Honeypot — hidden from users; bots often fill it */}
                                <div className="pointer-events-none absolute -left-[9999px] opacity-0" aria-hidden="true">
                                    <label htmlFor="support-website">Website</label>
                                    <input
                                        ref={honeypotRef}
                                        id="support-website"
                                        name="website"
                                        type="text"
                                        tabIndex={-1}
                                        autoComplete="off"
                                    />
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="support-name" className="text-zinc-200">
                                            Name
                                        </Label>
                                        <Input
                                            id="support-name"
                                            value={name}
                                            maxLength={NAME_MAX}
                                            onChange={(ev) => {
                                                setName(ev.target.value);
                                                setErrors((p) => ({ ...p, name: undefined }));
                                            }}
                                            className="border-white/15 bg-black text-zinc-100"
                                            placeholder="Your name"
                                            disabled={isSubmitting}
                                            autoComplete="name"
                                        />
                                        {errors.name && (
                                            <p className="text-xs text-red-300">{errors.name}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="support-email" className="text-zinc-200">
                                            Email
                                        </Label>
                                        <Input
                                            id="support-email"
                                            type="email"
                                            value={email}
                                            onChange={(ev) => {
                                                setEmail(ev.target.value);
                                                setErrors((p) => ({ ...p, email: undefined }));
                                            }}
                                            className="border-white/15 bg-black text-zinc-100"
                                            placeholder="you@company.com"
                                            disabled={isSubmitting}
                                            autoComplete="email"
                                        />
                                        {errors.email && (
                                            <p className="text-xs text-red-300">{errors.email}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="support-topic" className="text-zinc-200">
                                        Topic
                                    </Label>
                                    <select
                                        id="support-topic"
                                        value={topic}
                                        onChange={(ev) => setTopic(ev.target.value as SupportTopic)}
                                        className="h-10 w-full rounded-md border border-white/15 bg-black px-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-white/30"
                                        disabled={isSubmitting}
                                    >
                                        {SUPPORT_TOPICS.map((t) => (
                                            <option key={t} value={t}>
                                                {TOPIC_LABELS[t]}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="support-subject" className="text-zinc-200">
                                        Subject
                                    </Label>
                                    <Input
                                        id="support-subject"
                                        value={subject}
                                        maxLength={SUBJECT_MAX}
                                        onChange={(ev) => {
                                            setSubject(ev.target.value);
                                            setErrors((p) => ({ ...p, subject: undefined }));
                                        }}
                                        className="border-white/15 bg-black text-zinc-100"
                                        placeholder="Short summary of your request"
                                        disabled={isSubmitting}
                                    />
                                    <div className="flex justify-between text-xs">
                                        <span className="text-red-300">{errors.subject}</span>
                                        <span className="text-zinc-500">
                                            {subject.trim().length}/{SUBJECT_MAX}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="support-message" className="text-zinc-200">
                                        Message
                                    </Label>
                                    <textarea
                                        id="support-message"
                                        value={message}
                                        maxLength={MESSAGE_MAX}
                                        onChange={(ev) => {
                                            setMessage(ev.target.value);
                                            setErrors((p) => ({ ...p, message: undefined }));
                                        }}
                                        className="min-h-40 w-full resize-y rounded-md border border-white/15 bg-black px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-white/30"
                                        placeholder="What do you need? Include relevant context, versions, or account email if different from above."
                                        disabled={isSubmitting}
                                    />
                                    <div className="flex justify-between text-xs">
                                        <span className="text-red-300">{errors.message}</span>
                                        <span className="text-zinc-500">
                                            {message.trim().length}/{MESSAGE_MAX} (min {MESSAGE_MIN})
                                        </span>
                                    </div>
                                </div>

                                {submitError && (
                                    <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
                                        <div className="flex items-center gap-2 font-medium">
                                            <AlertCircle className="h-4 w-4 shrink-0" />
                                            Could not send
                                        </div>
                                        <p className="mt-1 text-xs text-red-100/85">{submitError}</p>
                                    </div>
                                )}

                                {submitted && (
                                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                                        <div className="flex items-center gap-2 font-medium">
                                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                                            Thank you
                                        </div>
                                        <p className="mt-1 text-xs text-emerald-100/85">
                                            Your request was received. Check your inbox for a confirmation or reply
                                            from our team.
                                        </p>
                                    </div>
                                )}

                                <Button type="submit" disabled={isSubmitting} className="gap-2">
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Sending…
                                        </>
                                    ) : (
                                        <>
                                            <Send className="h-4 w-4" />
                                            Send message
                                        </>
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <aside className="space-y-4">
                        <Card className="border-white/10 bg-zinc-950/60">
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-sm font-medium text-white">
                                    <Headphones className="h-4 w-4 text-violet-400" />
                                    Response time
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-xs leading-relaxed text-zinc-400">
                                We aim to reply within one business day. Billing and access issues are prioritized.
                            </CardContent>
                        </Card>
                        <Card className="border-white/10 bg-zinc-950/60">
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-sm font-medium text-white">
                                    <LifeBuoy className="h-4 w-4 text-amber-400" />
                                    Before you write
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2 text-xs text-zinc-400">
                                    <li className="flex gap-2">
                                        <span className="text-zinc-600">·</span>
                                        <span>
                                            Signed in? We will link this ticket to your account automatically.
                                        </span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-zinc-600">·</span>
                                        <span>
                                            For reproducible app issues,{" "}
                                            <a
                                                href="/report-bug"
                                                className="text-sky-400 underline-offset-2 hover:underline"
                                            >
                                                report a bug
                                            </a>{" "}
                                            so we can track screenshots and status.
                                        </span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-zinc-600">·</span>
                                        <span>Never share passwords or full card numbers in this form.</span>
                                    </li>
                                </ul>
                            </CardContent>
                        </Card>
                    </aside>
                </div>
            </div>
        </div>
    );
}
