"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProfileAvatar } from "@/components/profile-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
    Database,
    Loader2,
    LogOut,
    Pencil,
    Check,
    X,
    Shield,
    Calendar,
    Mail,
    User,
    Crown,
    MessageSquare,
    AlertCircle,
    ChevronRight,
    Zap,
    FileText,
    Download,
    ExternalLink,
    CreditCard,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import type { SubscriptionPublic } from "@/models/Subscription";

interface UserProfile {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    provider: string;
    createdAt: string | null;
}

function getInitials(name: string) {
    return name
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? "")
        .join("");
}

function providerLabel(provider: string) {
    switch (provider) {
        case "google": return "Google";
        case "apple": return "Apple";
        default: return "Email";
    }
}

function statusBadge(status: string) {
    switch (status) {
        case "active":
            return <Badge className="bg-green-600/20 text-green-400 border-green-600/30 text-xs">Active</Badge>;
        case "expired":
            return <Badge variant="destructive" className="text-xs">Expired</Badge>;
        case "cancelled":
            return <Badge variant="secondary" className="text-xs">Cancelled</Badge>;
        case "pending":
            return <Badge variant="outline" className="text-xs">Pending</Badge>;
        default:
            return null;
    }
}

function discordLabel(access: string) {
    if (access === "2days") return "2-Day Access";
    if (access === "4days") return "4-Day Access";
    return "No Access";
}

interface ReceiptItem {
    subscriptionId: string;
    planName: string;
    date: string;
    amount: number;
    currency: string;
    receiptUrl: string | null;
}

function SubscriptionCard({ userId }: { userId: string }) {
    const [subscription, setSubscription] = useState<SubscriptionPublic | null>(null);
    const [canManageBilling, setCanManageBilling] = useState(false);
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState(false);
    const [cancelError, setCancelError] = useState<string | null>(null);
    const [receiptLoading, setReceiptLoading] = useState(false);
    const [portalLoading, setPortalLoading] = useState(false);
    const [receiptsOpen, setReceiptsOpen] = useState(false);
    const [receipts, setReceipts] = useState<ReceiptItem[]>([]);
    const [receiptsLoading, setReceiptsLoading] = useState(false);

    useEffect(() => {
        fetch("/api/subscription/status")
            .then((r) => r.json())
            .then((d) => {
                setSubscription(d.subscription ?? null);
                setCanManageBilling(!!d.canManageBilling);
            })
            .finally(() => setLoading(false));
    }, [userId]);

    useEffect(() => {
        if (!receiptsOpen || receipts.length > 0) return;
        setReceiptsLoading(true);
        fetch("/api/subscription/receipts")
            .then((r) => r.json())
            .then((d) => setReceipts(d.receipts ?? []))
            .finally(() => setReceiptsLoading(false));
    }, [receiptsOpen, receipts.length]);

    async function handleCancel() {
        if (!confirm("Are you sure you want to cancel your subscription?")) return;
        setCancelling(true);
        setCancelError(null);
        try {
            const res = await fetch("/api/subscription/cancel", { method: "POST" });
            if (res.ok) {
                setSubscription((s) => s ? { ...s, status: "cancelled" } : s);
            } else {
                const d = await res.json();
                setCancelError(d.error || "Failed to cancel");
            }
        } finally {
            setCancelling(false);
        }
    }

    async function handleViewReceipt() {
        setReceiptLoading(true);
        try {
            const res = await fetch("/api/subscription/receipt");
            const d = await res.json();
            if (res.ok && d.receiptUrl) {
                window.open(d.receiptUrl, "_blank", "noopener,noreferrer");
            } else {
                alert(d.error || "Receipt not available");
            }
        } finally {
            setReceiptLoading(false);
        }
    }

    async function handleManageBilling() {
        setPortalLoading(true);
        try {
            const res = await fetch("/api/stripe/portal", { method: "POST" });
            const d = await res.json();
            if (res.ok && d.url) {
                window.location.href = d.url;
            } else {
                alert(d.error || "Could not open billing portal");
            }
        } finally {
            setPortalLoading(false);
        }
    }

    const expiryDate = subscription?.endDate
        ? new Date(subscription.endDate).toLocaleDateString("en-US", {
              year: "numeric", month: "long", day: "numeric",
          })
        : null;

    const daysLeft = subscription?.endDate
        ? Math.max(0, Math.ceil((new Date(subscription.endDate).getTime() - Date.now()) / 86400000))
        : 0;

    return (
        <Card className="border-border/50 shadow-sm col-span-full">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Crown className="h-4 w-4 text-primary" />
                            Subscription
                        </CardTitle>
                        <CardDescription>Your current plan and billing details</CardDescription>
                    </div>
                    <Button size="sm" className="gap-2" asChild>
                        <Link href="/pricing">
                            <Zap className="h-3.5 w-3.5" />
                            {subscription?.status === "active" ? "Upgrade" : "Subscribe"}
                        </Link>
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center py-6">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                ) : !subscription ? (
                    <div className="rounded-lg border border-dashed border-border/50 p-6 text-center">
                        <Crown className="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
                        <p className="text-sm font-medium mb-1">No active subscription</p>
                        <p className="text-xs text-muted-foreground mb-4">
                            Subscribe to unlock all features and full access.
                        </p>
                        <Button size="sm" asChild>
                            <Link href="/pricing">
                                View Plans
                                <ChevronRight className="h-3.5 w-3.5 ml-1" />
                            </Link>
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between rounded-lg bg-muted/30 px-4 py-3 border border-border/50">
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                                    <Crown className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold">{subscription.planName}</p>
                                    <p className="text-xs text-muted-foreground">Current Plan</p>
                                </div>
                            </div>
                            {statusBadge(subscription.status)}
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <div className="rounded-lg bg-muted/20 px-3 py-2.5 space-y-0.5">
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Calendar className="h-3 w-3" /> Expires
                                </p>
                                <p className="text-sm font-medium">{expiryDate ?? "—"}</p>
                            </div>
                            <div className="rounded-lg bg-muted/20 px-3 py-2.5 space-y-0.5">
                                <p className="text-xs text-muted-foreground">Days Left</p>
                                <p className={`text-sm font-medium ${daysLeft <= 3 ? "text-destructive" : ""}`}>
                                    {subscription.status === "active" ? `${daysLeft}d` : "—"}
                                </p>
                            </div>
                            <div className="rounded-lg bg-muted/20 px-3 py-2.5 space-y-0.5">
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <MessageSquare className="h-3 w-3" /> Discord
                                </p>
                                <p className="text-sm font-medium">{discordLabel(subscription.discordAccess)}</p>
                            </div>
                            <div className="rounded-lg bg-muted/20 px-3 py-2.5 space-y-0.5">
                                <p className="text-xs text-muted-foreground">Amount Paid</p>
                                <p className="text-sm font-medium">
                                    {new Intl.NumberFormat("en-US", {
                                        style: "currency",
                                        currency: subscription.paymentCurrency.toUpperCase(),
                                    }).format(subscription.paymentAmount / 100)}
                                </p>
                            </div>
                        </div>

                        {/* Invoices & billing */}
                        <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">Invoices & billing</p>
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2"
                                    onClick={handleViewReceipt}
                                    disabled={receiptLoading}
                                >
                                    {receiptLoading ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <FileText className="h-3.5 w-3.5" />
                                    )}
                                    View receipt
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2"
                                    onClick={handleViewReceipt}
                                    disabled={receiptLoading}
                                >
                                    <Download className="h-3.5 w-3.5" />
                                    Download (PDF)
                                </Button>
                                {canManageBilling && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-2"
                                        onClick={handleManageBilling}
                                        disabled={portalLoading}
                                    >
                                        {portalLoading ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <CreditCard className="h-3.5 w-3.5" />
                                        )}
                                        Manage billing
                                        <ExternalLink className="h-3 w-3 opacity-60" />
                                    </Button>
                                )}
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                                Receipt opens in Stripe; use your browser&apos;s Print → Save as PDF to download.
                            </p>
                        </div>

                        {/* Payment history */}
                        <div className="border border-border/50 rounded-lg overflow-hidden">
                            <button
                                type="button"
                                className="w-full flex items-center justify-between px-3 py-2.5 text-left text-sm font-medium hover:bg-muted/30 transition-colors"
                                onClick={() => setReceiptsOpen((o) => !o)}
                            >
                                <span className="flex items-center gap-2">
                                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                    Payment history
                                </span>
                                {receiptsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>
                            {receiptsOpen && (
                                <div className="border-t border-border/50 bg-muted/10 max-h-48 overflow-y-auto">
                                    {receiptsLoading ? (
                                        <div className="flex items-center justify-center py-6">
                                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                        </div>
                                    ) : receipts.length === 0 ? (
                                        <p className="px-3 py-4 text-xs text-muted-foreground">No payments yet</p>
                                    ) : (
                                        <ul className="divide-y divide-border/50">
                                            {receipts.map((r) => (
                                                <li key={r.subscriptionId} className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm">
                                                    <div>
                                                        <p className="font-medium">{r.planName}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {new Date(r.date).toLocaleDateString("en-US", {
                                                                year: "numeric",
                                                                month: "short",
                                                                day: "numeric",
                                                            })}{" "}
                                                            · {new Intl.NumberFormat("en-US", { style: "currency", currency: r.currency.toUpperCase() }).format(r.amount / 100)}
                                                        </p>
                                                    </div>
                                                    {r.receiptUrl ? (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 text-xs shrink-0"
                                                            onClick={() => window.open(r.receiptUrl!, "_blank")}
                                                        >
                                                            View
                                                        </Button>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground shrink-0">—</span>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </div>

                        {subscription.status === "active" && daysLeft <= 3 && daysLeft > 0 && (
                            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                Your subscription expires in {daysLeft} day{daysLeft !== 1 ? "s" : ""}. Renew now to avoid interruption.
                            </div>
                        )}

                        {cancelError && (
                            <p className="text-xs text-destructive">{cancelError}</p>
                        )}

                        {subscription.status === "active" && (
                            <div className="flex gap-2 pt-1">
                                <Button variant="outline" size="sm" className="gap-2" asChild>
                                    <Link href="/pricing">
                                        <Zap className="h-3.5 w-3.5" />
                                        Upgrade Plan
                                    </Link>
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-muted-foreground text-xs"
                                    onClick={handleCancel}
                                    disabled={cancelling}
                                >
                                    {cancelling ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                                    Cancel Subscription
                                </Button>
                            </div>
                        )}

                        {(subscription.status === "expired" || subscription.status === "cancelled") && (
                            <Button size="sm" className="gap-2" asChild>
                                <Link href="/pricing">
                                    <ChevronRight className="h-3.5 w-3.5" />
                                    Renew Subscription
                                </Link>
                            </Button>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function ProfilePage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [editing, setEditing] = useState(false);
    const [nameValue, setNameValue] = useState("");
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [loggingOut, setLoggingOut] = useState(false);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.replace("/login");
        }
    }, [status, router]);

    useEffect(() => {
        if (status !== "authenticated") return;

        async function fetchProfile() {
            setLoadingProfile(true);
            try {
                const res = await fetch("/api/user/me");
                if (res.ok) {
                    const data = await res.json();
                    setProfile(data);
                    setNameValue(data.name);
                } else if (res.status === 401) {
                    router.replace("/login");
                }
            } finally {
                setLoadingProfile(false);
            }
        }
        fetchProfile();
    }, [status, router]);

    async function handleSaveName() {
        if (!nameValue.trim()) return;
        setSaving(true);
        setSaveError(null);
        try {
            const res = await fetch("/api/user/me", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: nameValue.trim() }),
            });
            if (res.ok) {
                setProfile((p) => p ? { ...p, name: nameValue.trim() } : p);
                setEditing(false);
            } else {
                const body = await res.json();
                setSaveError(body.error ?? "Failed to save");
            }
        } finally {
            setSaving(false);
        }
    }

    async function handleLogout() {
        setLoggingOut(true);
        await signOut({ callbackUrl: "/" });
    }

    if (status === "loading" || loadingProfile) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!profile) return null;

    const joinDate = profile.createdAt
        ? new Date(profile.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
          })
        : null;

    return (
        <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background">
            {/* Nav */}
            <header className="sticky top-0 z-10 border-b border-border/50 bg-background/80 backdrop-blur-sm">
                <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
                    <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                            <Database className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="font-semibold text-sm">pgStudio</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
                            <Link href="/">Home</Link>
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="gap-2 text-muted-foreground"
                            onClick={handleLogout}
                            disabled={loggingOut}
                        >
                            {loggingOut ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <LogOut className="h-4 w-4" />
                            )}
                            Sign Out
                        </Button>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-4xl space-y-5 p-6">
                {/* Profile Hero */}
                <Card className="overflow-hidden border-border/50 shadow-sm">
                    <div className="h-24 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
                    <CardContent className="-mt-12 pb-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                            <div className="flex items-end gap-4">
                                <ProfileAvatar
                                    imageUrl={profile.image ?? session?.user?.image}
                                    name={profile.name}
                                    size="2xl"
                                    className="ring-4 ring-background shadow-md"
                                />
                                <div className="mb-1 space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-xl font-bold">{profile.name}</h2>
                                        <Badge variant="secondary" className="text-xs">
                                            {providerLabel(profile.provider)}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{profile.email}</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid gap-5 sm:grid-cols-2">
                    {/* Edit Profile */}
                    <Card className="border-border/50 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-base">Profile Details</CardTitle>
                            <CardDescription>Manage your account information</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1.5">
                                <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    Profile photo
                                </Label>
                                <div className="flex items-center gap-3 rounded-md border border-border/50 bg-muted/20 p-3">
                                    <ProfileAvatar
                                        imageUrl={profile.image ?? session?.user?.image}
                                        name={profile.name}
                                        size="xl"
                                        className="ring-2 ring-border"
                                    />
                                    <div className="text-sm text-muted-foreground">
                                        {profile.provider === "google"
                                            ? "Photo from your Google account"
                                            : profile.image
                                              ? "Profile photo"
                                              : "No photo — sign in with Google to add one"}
                                    </div>
                                </div>
                            </div>
                            <Separator />
                            <div className="space-y-1.5">
                                <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <User className="h-3.5 w-3.5" />
                                    Display Name
                                </Label>
                                {editing ? (
                                    <div className="space-y-2">
                                        <div className="flex gap-2">
                                            <Input
                                                value={nameValue}
                                                onChange={(e) => setNameValue(e.target.value)}
                                                className="h-8 text-sm"
                                                autoFocus
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") handleSaveName();
                                                    if (e.key === "Escape") {
                                                        setEditing(false);
                                                        setNameValue(profile.name);
                                                    }
                                                }}
                                            />
                                            <Button
                                                size="icon"
                                                className="h-8 w-8 shrink-0"
                                                onClick={handleSaveName}
                                                disabled={saving}
                                            >
                                                {saving ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                    <Check className="h-3.5 w-3.5" />
                                                )}
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 shrink-0"
                                                onClick={() => {
                                                    setEditing(false);
                                                    setNameValue(profile.name);
                                                    setSaveError(null);
                                                }}
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                        {saveError && (
                                            <p className="text-xs text-destructive">{saveError}</p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between rounded-md border border-border/50 bg-muted/20 px-3 py-2">
                                        <span className="text-sm">{profile.name}</span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-muted-foreground"
                                            onClick={() => setEditing(true)}
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                            <Separator />
                            <div className="space-y-1.5">
                                <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Mail className="h-3.5 w-3.5" />
                                    Email Address
                                </Label>
                                <div className="flex items-center rounded-md border border-border/50 bg-muted/20 px-3 py-2">
                                    <span className="text-sm text-muted-foreground">{profile.email}</span>
                                </div>
                                <p className="text-xs text-muted-foreground/60">Email cannot be changed</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Account Info */}
                    <Card className="border-border/50 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-base">Account Info</CardTitle>
                            <CardDescription>Security and session details</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-3 rounded-lg bg-muted/20 p-3 border border-border/50">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                                    <Shield className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Auth Provider</p>
                                    <p className="text-xs text-muted-foreground">
                                        Signed in via {providerLabel(profile.provider)}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 rounded-lg bg-muted/20 p-3 border border-border/50">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                                    <Calendar className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Member Since</p>
                                    <p className="text-xs text-muted-foreground">{joinDate ?? "Member"}</p>
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-2">
                                <p className="text-xs text-muted-foreground">
                                    Sessions expire after 40 days. Only one active session is allowed at a time.
                                </p>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="w-full gap-2"
                                    onClick={handleLogout}
                                    disabled={loggingOut}
                                >
                                    {loggingOut ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <LogOut className="h-3.5 w-3.5" />
                                    )}
                                    Sign Out
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Subscription Card - full width */}
                    {profile && <SubscriptionCard userId={profile.id} />}
                </div>
            </main>
        </div>
    );
}
