"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Database, Loader2, AlertCircle, Monitor, Tablet } from "lucide-react";

/** Where NextAuth should send the user after a successful sign-in. */
function getPostLoginCallbackTarget(searchParams: URLSearchParams): string {
    const source = searchParams.get("source");
    const state = searchParams.get("state") ?? "";
    const rawReturn =
        searchParams.get("return_to")?.trim() ||
        searchParams.get("callbackUrl")?.trim() ||
        "";

    if (source === "desktop") {
        const q = new URLSearchParams({ source: "desktop" });
        if (state) q.set("state", state);
        return `/auth/callback?${q.toString()}`;
    }

    if (source === "web") {
        if (rawReturn) {
            return `/auth/callback?source=web&return_to=${encodeURIComponent(rawReturn)}`;
        }
        return "/profile";
    }

    return "/profile";
}

function LoginForm() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();

    const source = searchParams.get("source");
    const isDesktop = source === "desktop";
    const isWebShell = source === "web";

    const postLoginTarget = useMemo(
        () => getPostLoginCallbackTarget(searchParams),
        [searchParams]
    );

    const [tab, setTab] = useState<"signin" | "signup">("signin");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Redirect once authenticated (e.g. user refreshed while logged in)
    useEffect(() => {
        if (status === "authenticated" && session) {
            router.replace(postLoginTarget);
        }
    }, [status, session, router, postLoginTarget]);

    async function handleCredentials(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const result = await signIn("credentials", {
                email,
                password,
                name: tab === "signup" ? name : undefined,
                isSignUp: tab === "signup" ? "true" : "false",
                redirect: false,
                callbackUrl: postLoginTarget,
            });

            if (result?.error) {
                setError(result.error === "CredentialsSignin" ? "Invalid email or password." : result.error);
            } else if (result?.url) {
                router.replace(result.url);
            } else {
                router.replace(postLoginTarget);
            }
        } finally {
            setLoading(false);
        }
    }

    async function handleGoogle() {
        setLoading(true);
        await signIn("google", {
            callbackUrl: postLoginTarget,
        });
    }

    if (status === "loading") {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
            <div className="w-full max-w-md space-y-6">
                <div className="flex flex-col items-center gap-3 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                        <Database className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">pgStudio</h1>
                        <p className="mt-1 text-sm text-muted-foreground max-w-xs mx-auto">
                            {isDesktop
                                ? "Sign in to connect the desktop app to your account."
                                : isWebShell
                                  ? "Sign in once — we’ll send you back to pgStudio in your browser (Safari, iPad, or desktop)."
                                  : "Sign in to your account"}
                        </p>
                    </div>
                </div>

                {isWebShell && (
                    <div className="flex items-center justify-center gap-6 rounded-xl border border-border/60 bg-card/50 px-4 py-3 text-muted-foreground">
                        <div className="flex flex-col items-center gap-1">
                            <Monitor className="h-5 w-5" aria-hidden />
                            <span className="text-[10px] uppercase tracking-wide">Desktop</span>
                        </div>
                        <Separator orientation="vertical" className="h-10" />
                        <div className="flex flex-col items-center gap-1">
                            <Tablet className="h-5 w-5" aria-hidden />
                            <span className="text-[10px] uppercase tracking-wide">iPad</span>
                        </div>
                    </div>
                )}

                <Card className="shadow-lg border-border/50">
                    <CardHeader className="pb-4">
                        <Tabs
                            value={tab}
                            onValueChange={(v) => {
                                setTab(v as "signin" | "signup");
                                setError(null);
                            }}
                            className="w-full"
                        >
                            <TabsList className="w-full">
                                <TabsTrigger value="signin" className="flex-1">
                                    Sign In
                                </TabsTrigger>
                                <TabsTrigger value="signup" className="flex-1">
                                    Sign Up
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        <Button
                            variant="outline"
                            className="w-full gap-2 h-11"
                            onClick={handleGoogle}
                            disabled={loading}
                        >
                            <GoogleIcon />
                            Continue with Google
                        </Button>

                        <div className="flex items-center gap-3">
                            <Separator className="flex-1" />
                            <span className="text-xs text-muted-foreground">or</span>
                            <Separator className="flex-1" />
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                {error}
                            </div>
                        )}

                        <Tabs value={tab} className="w-full">
                            <TabsContent value="signin" className="mt-0 space-y-3">
                                <form onSubmit={handleCredentials} className="space-y-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="email-signin">Email</Label>
                                        <Input
                                            id="email-signin"
                                            type="email"
                                            placeholder="you@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            className="h-11"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="password-signin">Password</Label>
                                        <Input
                                            id="password-signin"
                                            type="password"
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            className="h-11"
                                        />
                                    </div>
                                    <Button type="submit" className="w-full h-11" disabled={loading}>
                                        {loading ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : null}
                                        Sign In
                                    </Button>
                                </form>
                            </TabsContent>

                            <TabsContent value="signup" className="mt-0 space-y-3">
                                <form onSubmit={handleCredentials} className="space-y-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="name-signup">Full Name</Label>
                                        <Input
                                            id="name-signup"
                                            type="text"
                                            placeholder="Your Name"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            required
                                            className="h-11"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="email-signup">Email</Label>
                                        <Input
                                            id="email-signup"
                                            type="email"
                                            placeholder="you@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            className="h-11"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="password-signup">Password</Label>
                                        <Input
                                            id="password-signup"
                                            type="password"
                                            placeholder="At least 8 characters"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            minLength={8}
                                            required
                                            className="h-11"
                                        />
                                    </div>
                                    <Button type="submit" className="w-full h-11" disabled={loading}>
                                        {loading ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : null}
                                        Create Account
                                    </Button>
                                </form>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>

                {isDesktop && (
                    <p className="text-center text-xs text-muted-foreground">
                        After signing in, you&apos;ll be redirected back to the pgStudio desktop app.
                    </p>
                )}
                {isWebShell && (
                    <p className="text-center text-xs text-muted-foreground leading-relaxed">
                        After sign-in, this page will close and return you to your local or hosted pgStudio
                        UI. If you stay on the web, you can still manage your account from your profile.
                    </p>
                )}
            </div>
        </div>
    );
}

function GoogleIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4">
            <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
            />
            <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
            />
            <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
            />
            <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
            />
        </svg>
    );
}

export default function LoginPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-screen items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            }
        >
            <LoginForm />
        </Suspense>
    );
}
