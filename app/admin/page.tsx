"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Shield, LogOut, Plus, Pencil, Trash2, Upload, X, Check,
    Loader2, Package, Megaphone, ChevronDown, ChevronUp, Database,
    Bell, BookOpen, Users, RefreshCw, Send, Eye, AlertTriangle,
    Ban, RotateCcw, UserX, LogIn, Search, Filter, Star, Tag,
    ChevronLeft, ChevronRight, ExternalLink, Timer, ToggleLeft, ToggleRight,
    Activity, MonitorSmartphone, Clock, BarChart2, Download, Zap, TrendingUp,
    CheckCircle2, XCircle, AlertCircle, KanbanSquare,
} from "lucide-react";
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend, Cell,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import type { PlanPublic } from "@/models/Plan";
import type { CampaignPublic } from "@/models/Campaign";
import type { NotificationPublic, NotificationType, NotificationSegment } from "@/models/Notification";
import type { ReleaseNotePublic, ReleaseTag } from "@/models/ReleaseNote";
import { BugReportsKanbanBoard } from "@/components/admin/bug-reports-kanban";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AdminPlan extends PlanPublic { id: string }
interface AdminCampaign extends CampaignPublic { id: string }

interface AdminUser {
    id: string;
    name: string;
    email: string;
    image?: string;
    provider: string;
    createdAt: string;
    lastLoginAt: string | null;
    isActive: boolean;
    suspendedAt: string | null;
    subscription: {
        planName: string;
        planSlug: string;
        status: string;
        endDate: string;
    } | null;
}

const DISCORD_OPTIONS = [
    { value: "none", label: "No Discord" },
    { value: "2days", label: "2 Days" },
    { value: "4days", label: "4 Days" },
];

// ─── Login Form ──────────────────────────────────────────────────────────────

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true); setError("");
        try {
            const res = await fetch("/api/admin/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
            });
            if (res.ok) onSuccess();
            else { const d = await res.json(); setError(d.error || "Invalid password"); }
        } finally { setLoading(false); }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <Card className="w-full max-w-sm border-border/50">
                <CardHeader className="text-center pb-4">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                        <Shield className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">Admin Panel</CardTitle>
                    <CardDescription>pgStudio administration</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="password">Password</Label>
                            <Input id="password" type="password" value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter admin password" autoFocus />
                        </div>
                        {error && <p className="text-sm text-destructive">{error}</p>}
                        <Button type="submit" className="w-full" disabled={loading || !password}>
                            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Sign In
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

// ─── Plan Form ───────────────────────────────────────────────────────────────

interface PlanFormData {
    name: string; slug: string; price: string; currency: string;
    durationDays: string; features: string; discordAccess: string;
    discount: string; promoTag: string; stripePriceId: string;
    stripeProductId: string; isActive: boolean; isFeatured: boolean; sortOrder: string;
}

const emptyPlanForm = (): PlanFormData => ({
    name: "", slug: "", price: "0", currency: "usd", durationDays: "30",
    features: "", discordAccess: "none", discount: "", promoTag: "",
    stripePriceId: "", stripeProductId: "", isActive: true, isFeatured: false, sortOrder: "0",
});

function planToForm(p: AdminPlan): PlanFormData {
    return {
        name: p.name, slug: p.slug, price: String(p.price), currency: p.currency,
        durationDays: String(p.durationDays), features: p.features.join("\n"),
        discordAccess: p.discordAccess, discount: p.discount ? String(p.discount) : "",
        promoTag: p.promoTag || "", stripePriceId: p.stripePriceId || "",
        stripeProductId: "", isActive: p.isActive, isFeatured: p.isFeatured,
        sortOrder: String(p.sortOrder),
    };
}

function PlanModal({ plan, onClose, onSaved }: { plan: AdminPlan | null; onClose: () => void; onSaved: () => void }) {
    const [form, setForm] = useState<PlanFormData>(plan ? planToForm(plan) : emptyPlanForm());
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    function set(key: keyof PlanFormData, val: string | boolean) {
        setForm((f) => ({ ...f, [key]: val }));
    }

    async function handleSave() {
        if (!form.name.trim()) { setError("Name is required"); return; }
        setSaving(true); setError("");
        try {
            const payload = {
                ...form, id: plan?.id,
                price: Number(form.price),
                durationDays: Number(form.durationDays),
                discount: form.discount ? Number(form.discount) : undefined,
                sortOrder: Number(form.sortOrder) || 0,
                features: form.features.split("\n").map((f) => f.trim()).filter(Boolean),
                slug: form.slug || form.name.toLowerCase().replace(/\s+/g, "_"),
            };
            const res = await fetch("/api/admin/plans", {
                method: plan ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (res.ok) { onSaved(); onClose(); }
            else { const d = await res.json(); setError(d.error || "Save failed"); }
        } finally { setSaving(false); }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
            <div className="w-full max-w-lg rounded-xl border border-border/50 bg-card shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-5 border-b border-border/50">
                    <h3 className="font-semibold text-base">{plan ? "Edit Plan" : "New Plan"}</h3>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}><X className="h-4 w-4" /></Button>
                </div>
                <div className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5"><Label className="text-xs">Plan Name *</Label>
                            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Pro Max+" /></div>
                        <div className="space-y-1.5"><Label className="text-xs">Slug</Label>
                            <Input value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="pro_max_plus" /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1.5"><Label className="text-xs">Price (cents)</Label>
                            <Input type="number" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="999" /></div>
                        <div className="space-y-1.5"><Label className="text-xs">Currency</Label>
                            <Input value={form.currency} onChange={(e) => set("currency", e.target.value)} placeholder="usd" /></div>
                        <div className="space-y-1.5"><Label className="text-xs">Duration (days)</Label>
                            <Input type="number" value={form.durationDays} onChange={(e) => set("durationDays", e.target.value)} placeholder="30" /></div>
                    </div>
                    <div className="space-y-1.5"><Label className="text-xs">Features (one per line)</Label>
                        <textarea className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                            value={form.features} onChange={(e) => set("features", e.target.value)}
                            placeholder={"Unlimited connections\nAI Assistant\nSchema Designer"} /></div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5"><Label className="text-xs">Discord Access</Label>
                            <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                value={form.discordAccess} onChange={(e) => set("discordAccess", e.target.value)}>
                                {DISCORD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select></div>
                        <div className="space-y-1.5"><Label className="text-xs">Discount (%)</Label>
                            <Input type="number" value={form.discount} onChange={(e) => set("discount", e.target.value)} placeholder="0" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5"><Label className="text-xs">Promo Tag</Label>
                            <Input value={form.promoTag} onChange={(e) => set("promoTag", e.target.value)} placeholder="Most Popular" /></div>
                        <div className="space-y-1.5"><Label className="text-xs">Sort Order</Label>
                            <Input type="number" value={form.sortOrder} onChange={(e) => set("sortOrder", e.target.value)} placeholder="0" /></div>
                    </div>
                    <div className="space-y-1.5"><Label className="text-xs">Stripe Price ID</Label>
                        <Input value={form.stripePriceId} onChange={(e) => set("stripePriceId", e.target.value)} placeholder="price_1ABC..." />
                        <p className="text-[10px] text-muted-foreground">Use a Price ID from Stripe Dashboard → Products (starts with <code className="rounded bg-muted px-0.5">price_</code>). Leave empty to use the plan price above.</p></div>
                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} className="h-4 w-4 rounded" />
                            <span className="text-sm">Active</span></label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={form.isFeatured} onChange={(e) => set("isFeatured", e.target.checked)} className="h-4 w-4 rounded" />
                            <span className="text-sm">Featured</span></label>
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <div className="flex gap-2 pt-1">
                        <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
                        <Button className="flex-1" onClick={handleSave} disabled={saving}>
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                            Save Plan
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Campaign Form ────────────────────────────────────────────────────────────

interface CampaignFormData {
    title: string; description: string; discountPercentage: string;
    badgeText: string; posterPath: string; startDate: string; endDate: string; isActive: boolean;
}

const emptyCampaignForm = (): CampaignFormData => ({
    title: "", description: "", discountPercentage: "0",
    badgeText: "", posterPath: "", startDate: "", endDate: "", isActive: true,
});

function campaignToForm(c: AdminCampaign): CampaignFormData {
    return {
        title: c.title, description: c.description,
        discountPercentage: String(c.discountPercentage),
        badgeText: c.badgeText || "", posterPath: c.posterPath || "",
        startDate: c.startDate.slice(0, 10), endDate: c.endDate.slice(0, 10), isActive: true,
    };
}

function CampaignModal({ campaign, onClose, onSaved }: { campaign: AdminCampaign | null; onClose: () => void; onSaved: () => void }) {
    const [form, setForm] = useState<CampaignFormData>(campaign ? campaignToForm(campaign) : emptyCampaignForm());
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [uploading, setUploading] = useState(false);

    function set(key: keyof CampaignFormData, val: string | boolean) {
        setForm((f) => ({ ...f, [key]: val }));
    }

    async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]; if (!file) return;
        setUploading(true);
        try {
            const fd = new FormData(); fd.append("file", file);
            const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
            if (res.ok) { const { path } = await res.json(); set("posterPath", path); }
            else { const d = await res.json(); setError(d.error || "Upload failed"); }
        } finally { setUploading(false); e.target.value = ""; }
    }

    async function handleSave() {
        if (!form.title.trim()) { setError("Title is required"); return; }
        setSaving(true); setError("");
        try {
            const payload = { ...form, id: campaign?.id, discountPercentage: Number(form.discountPercentage) || 0 };
            const res = await fetch("/api/admin/campaigns", {
                method: campaign ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (res.ok) { onSaved(); onClose(); }
            else { const d = await res.json(); setError(d.error || "Save failed"); }
        } finally { setSaving(false); }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
            <div className="w-full max-w-lg rounded-xl border border-border/50 bg-card shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-5 border-b border-border/50">
                    <h3 className="font-semibold text-base">{campaign ? "Edit Campaign" : "New Campaign"}</h3>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}><X className="h-4 w-4" /></Button>
                </div>
                <div className="p-5 space-y-4">
                    <div className="space-y-1.5"><Label className="text-xs">Title *</Label>
                        <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="New Year Special" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Description</Label>
                        <textarea className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                            value={form.description} onChange={(e) => set("description", e.target.value)}
                            placeholder="Celebrate the new year with up to 50% off..." /></div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5"><Label className="text-xs">Discount (%)</Label>
                            <Input type="number" value={form.discountPercentage} onChange={(e) => set("discountPercentage", e.target.value)} placeholder="20" /></div>
                        <div className="space-y-1.5"><Label className="text-xs">Badge Text</Label>
                            <Input value={form.badgeText} onChange={(e) => set("badgeText", e.target.value)} placeholder="New Year Offer" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5"><Label className="text-xs">Start Date</Label>
                            <Input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} /></div>
                        <div className="space-y-1.5"><Label className="text-xs">End Date</Label>
                            <Input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} /></div>
                    </div>
                    <div className="space-y-1.5"><Label className="text-xs">Poster Image</Label>
                        <div className="flex gap-2 items-center">
                            <Input value={form.posterPath} onChange={(e) => set("posterPath", e.target.value)} placeholder="/posters/poster.jpg" className="flex-1" />
                            <label className="cursor-pointer">
                                <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                                <Button variant="outline" size="sm" type="button" disabled={uploading} asChild>
                                    <span>{uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}</span>
                                </Button>
                            </label>
                        </div>
                        {form.posterPath && <img src={form.posterPath} alt="preview" className="mt-2 max-h-32 rounded-lg object-contain border border-border/50" />}
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} className="h-4 w-4 rounded" />
                        <span className="text-sm">Active</span></label>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <div className="flex gap-2 pt-1">
                        <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
                        <Button className="flex-1" onClick={handleSave} disabled={saving}>
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                            Save Campaign
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Notification Form ────────────────────────────────────────────────────────

const SEGMENT_TYPES = [
    { value: "all", label: "All Users" },
    { value: "inactive", label: "Inactive Users" },
    { value: "no_subscription", label: "No Subscription" },
    { value: "plan", label: "By Plan" },
    { value: "selected", label: "Selected Users" },
];

const NOTIF_TYPES = [
    { value: "push", label: "Push Notification" },
    { value: "promotion", label: "Promotion (with image)" },
    { value: "in_app", label: "In-App Notification" },
    { value: "desktop", label: "Desktop Push" },
];

interface NotifFormData {
    type: NotificationType;
    title: string;
    body: string;
    imageUrl: string;
    segmentType: string;
    planSlugs: string;
    inactiveDays: string;
    selectedUserIds: string;
    scheduleMode: "now" | "later";
    scheduledAt: string;
    actionUrl: string;
}

interface DevicePreview {
    totalUsers: number;
    desktopDevices: number;
    webDevices: number;
    totalDevices: number;
    activeDevices: { userId: string; platform: string; os?: string; lastActiveAt: string }[];
}

function emptyNotifForm(): NotifFormData {
    return {
        type: "push", title: "", body: "", imageUrl: "",
        segmentType: "all", planSlugs: "", inactiveDays: "30",
        selectedUserIds: "", scheduleMode: "now", scheduledAt: "", actionUrl: "",
    };
}

function buildSegment(form: NotifFormData): NotificationSegment {
    const segment: NotificationSegment = { type: form.segmentType as NotificationSegment["type"] };
    if (form.segmentType === "plan") segment.planSlugs = form.planSlugs.split(",").map(s => s.trim()).filter(Boolean);
    if (form.segmentType === "inactive") segment.inactiveDays = Number(form.inactiveDays) || 30;
    if (form.segmentType === "selected") {
        segment.userIds = form.selectedUserIds.split(",").map(s => s.trim()).filter(Boolean);
    }
    return segment;
}

function NotificationModal({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
    const [form, setForm] = useState<NotifFormData>(emptyNotifForm());
    const [sending, setSending] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");
    const [preview, setPreview] = useState(false);

    // Device preview state
    const [devicePreview, setDevicePreview] = useState<DevicePreview | null>(null);
    const [loadingDevices, setLoadingDevices] = useState(false);
    const [devicePreviewError, setDevicePreviewError] = useState("");
    const [showConfirm, setShowConfirm] = useState(false);

    function set<K extends keyof NotifFormData>(key: K, val: NotifFormData[K]) {
        setForm((f) => ({ ...f, [key]: val }));
        // Reset device preview when segment changes
        if (key === "segmentType" || key === "planSlugs" || key === "inactiveDays" || key === "selectedUserIds") {
            setDevicePreview(null);
            setShowConfirm(false);
        }
    }

    async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]; if (!file) return;
        setUploading(true);
        try {
            const fd = new FormData(); fd.append("file", file);
            const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
            if (res.ok) { const { path } = await res.json(); set("imageUrl", path); }
            else { const d = await res.json(); setError(d.error || "Upload failed"); }
        } finally { setUploading(false); e.target.value = ""; }
    }

    async function loadDevicePreview() {
        if (form.segmentType === "selected" && !form.selectedUserIds.trim()) {
            setDevicePreviewError("Enter at least one user ID first");
            return;
        }
        setLoadingDevices(true);
        setDevicePreviewError("");
        setDevicePreview(null);
        try {
            const segment = buildSegment(form);
            const res = await fetch("/api/admin/notifications/devices", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ segment }),
            });
            if (res.ok) {
                const data = await res.json();
                setDevicePreview(data);
                setShowConfirm(true);
            } else {
                const d = await res.json();
                setDevicePreviewError(d.error || "Failed to load device info");
            }
        } catch {
            setDevicePreviewError("Network error loading device info");
        } finally {
            setLoadingDevices(false);
        }
    }

    async function handleSend() {
        if (!form.title.trim()) { setError("Title is required"); return; }
        if (!form.body.trim()) { setError("Body is required"); return; }

        const segment = buildSegment(form);
        if (form.segmentType === "selected" && (!segment.userIds || segment.userIds.length === 0)) {
            setError("Enter at least one user ID");
            return;
        }

        const payload: Record<string, unknown> = {
            type: form.type,
            title: form.title,
            body: form.body,
            segment,
        };
        if (form.imageUrl) payload.imageUrl = form.imageUrl;
        if (form.actionUrl) payload.data = { actionUrl: form.actionUrl };
        if (form.scheduleMode === "later" && form.scheduledAt) payload.scheduledAt = form.scheduledAt;

        setSending(true); setError("");
        try {
            const res = await fetch("/api/admin/notifications", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (res.ok) { onSent(); onClose(); }
            else {
                const d = await res.json();
                setError(d.error || "Send failed");
                setShowConfirm(false);
            }
        } finally { setSending(false); }
    }

    const PLATFORM_ICONS: Record<string, string> = { desktop: "🖥", web: "🌐" };
    const OS_ICONS: Record<string, string> = { mac: "🍎", windows: "🪟", linux: "🐧" };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
            <div className="w-full max-w-2xl rounded-xl border border-border/50 bg-card shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-5 border-b border-border/50">
                    <h3 className="font-semibold text-base flex items-center gap-2">
                        <Bell className="h-4 w-4 text-primary" />
                        {showConfirm ? "Confirm & Send" : "New Notification"}
                    </h3>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}><X className="h-4 w-4" /></Button>
                </div>

                {/* ── Confirmation Step ── */}
                {showConfirm && devicePreview ? (
                    <div className="p-5 space-y-5">
                        {/* Notification summary */}
                        <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-2">
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Notification Preview</p>
                            <div className="flex gap-3">
                                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                    <Bell className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">{form.title}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{form.body}</p>
                                    {form.actionUrl && <p className="text-xs text-primary/70 mt-0.5 truncate">{form.actionUrl}</p>}
                                </div>
                            </div>
                        </div>

                        {/* Audience stats */}
                        <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Target Audience</p>
                            <div className="grid grid-cols-3 gap-3 mb-3">
                                {[
                                    { label: "Users", value: devicePreview.totalUsers, icon: "👥", color: "text-foreground" },
                                    { label: "Desktop", value: devicePreview.desktopDevices, icon: "🖥", color: "text-blue-400" },
                                    { label: "Web", value: devicePreview.webDevices, icon: "🌐", color: "text-green-400" },
                                ].map((s) => (
                                    <div key={s.label} className="rounded-lg border border-border/50 bg-muted/20 p-3 text-center">
                                        <p className="text-xl mb-0.5">{s.icon}</p>
                                        <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                                        <p className="text-[10px] text-muted-foreground">{s.label}</p>
                                    </div>
                                ))}
                            </div>

                            {devicePreview.totalDevices === 0 && (
                                <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 flex items-start gap-2">
                                    <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-medium text-yellow-300">No registered devices</p>
                                        <p className="text-xs text-yellow-300/70 mt-0.5">
                                            None of the {devicePreview.totalUsers} targeted user(s) have a registered device.
                                            They&apos;ll still receive the notification via RTDB when they next open the app.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Active device list */}
                            {devicePreview.activeDevices.length > 0 && (
                                <div className="mt-3">
                                    <p className="text-[10px] text-muted-foreground font-medium mb-1.5">Recently active devices</p>
                                    <div className="space-y-1 max-h-40 overflow-y-auto rounded-lg border border-border/50 p-2 bg-muted/10">
                                        {devicePreview.activeDevices.map((d, i) => (
                                            <div key={i} className="flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span>{PLATFORM_ICONS[d.platform] ?? "📱"}</span>
                                                    {d.os && <span>{OS_ICONS[d.os] ?? ""}</span>}
                                                    <span className="text-muted-foreground font-mono">{d.userId.slice(-8)}</span>
                                                    <Badge variant="outline" className="text-[9px] px-1 py-0">{d.platform}</Badge>
                                                    {d.os && <Badge variant="outline" className="text-[9px] px-1 py-0">{d.os}</Badge>}
                                                </div>
                                                <span className="text-muted-foreground/60 text-[10px]">
                                                    {d.lastActiveAt ? new Date(d.lastActiveAt).toLocaleDateString() : "—"}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {error && <p className="text-sm text-destructive">{error}</p>}

                        <div className="flex gap-2 pt-1">
                            <Button variant="outline" className="flex-1" onClick={() => setShowConfirm(false)} disabled={sending}>
                                Back
                            </Button>
                            <Button className="flex-1" onClick={handleSend} disabled={sending}>
                                {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                                {form.scheduleMode === "later" ? "Schedule" : `Send to ${devicePreview.totalUsers} user${devicePreview.totalUsers !== 1 ? "s" : ""}`}
                            </Button>
                        </div>
                    </div>
                ) : (
                    /* ── Form Step ── */
                    <div className="p-5 space-y-5">
                        {/* Type */}
                        <div className="space-y-1.5">
                            <Label className="text-xs">Notification Type</Label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {NOTIF_TYPES.map((t) => (
                                    <button key={t.value}
                                        type="button"
                                        onClick={() => set("type", t.value as NotificationType)}
                                        className={`rounded-lg border px-3 py-2 text-xs text-left transition-colors ${form.type === t.value ? "border-primary bg-primary/10 text-primary" : "border-border/50 text-muted-foreground hover:border-border"}`}>
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="grid grid-cols-1 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs">Title *</Label>
                                <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="New Feature Available!" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Body *</Label>
                                <textarea className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                                    value={form.body} onChange={(e) => set("body", e.target.value)}
                                    placeholder="Check out the latest improvements..." />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Action URL (optional)</Label>
                                <Input value={form.actionUrl} onChange={(e) => set("actionUrl", e.target.value)} placeholder="https://app.pgstudio.app/pricing" />
                            </div>
                            {(form.type === "promotion" || form.type === "push") && (
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Image URL (optional)</Label>
                                    <div className="flex gap-2">
                                        <Input value={form.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} placeholder="/posters/promo.jpg" className="flex-1" />
                                        <label className="cursor-pointer">
                                            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                                            <Button variant="outline" size="sm" type="button" disabled={uploading} asChild>
                                                <span>{uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}</span>
                                            </Button>
                                        </label>
                                    </div>
                                    {form.imageUrl && <img src={form.imageUrl} alt="preview" className="mt-1 max-h-24 rounded-lg object-contain border border-border/50" />}
                                </div>
                            )}
                        </div>

                        <Separator />

                        {/* Segment */}
                        <div className="space-y-3">
                            <Label className="text-xs font-medium">Target Audience</Label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {SEGMENT_TYPES.map((s) => (
                                    <button key={s.value} type="button"
                                        onClick={() => set("segmentType", s.value)}
                                        className={`rounded-lg border px-3 py-2 text-xs text-left transition-colors ${form.segmentType === s.value ? "border-primary bg-primary/10 text-primary" : "border-border/50 text-muted-foreground hover:border-border"}`}>
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                            {form.segmentType === "plan" && (
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Plan Slugs (comma-separated)</Label>
                                    <Input value={form.planSlugs} onChange={(e) => set("planSlugs", e.target.value)} placeholder="free_trial, pro" />
                                </div>
                            )}
                            {form.segmentType === "inactive" && (
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Inactive for (days)</Label>
                                    <Input type="number" value={form.inactiveDays} onChange={(e) => set("inactiveDays", e.target.value)} placeholder="30" />
                                </div>
                            )}
                            {form.segmentType === "selected" && (
                                <div className="space-y-1.5">
                                    <Label className="text-xs">User IDs (comma-separated)</Label>
                                    <textarea className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-xs resize-y focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                                        value={form.selectedUserIds} onChange={(e) => set("selectedUserIds", e.target.value)}
                                        placeholder="507f1f77bcf86cd799439011, 507f1f77bcf86cd799439012" />
                                </div>
                            )}

                            {/* Device preview inline */}
                            {devicePreview && !showConfirm && (
                                <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                                        <span className="font-medium">Audience Preview</span>
                                        <span className="text-[10px]">{devicePreview.totalUsers} users · {devicePreview.totalDevices} devices</span>
                                    </div>
                                    <div className="flex gap-3 text-xs">
                                        <span className="text-blue-400">🖥 {devicePreview.desktopDevices} desktop</span>
                                        <span className="text-green-400">🌐 {devicePreview.webDevices} web</span>
                                        {devicePreview.totalDevices === 0 && <span className="text-yellow-400">⚠ No registered devices</span>}
                                    </div>
                                </div>
                            )}
                            {devicePreviewError && (
                                <p className="text-xs text-destructive">{devicePreviewError}</p>
                            )}
                        </div>

                        <Separator />

                        {/* Schedule */}
                        <div className="space-y-3">
                            <Label className="text-xs font-medium">Schedule</Label>
                            <div className="flex gap-2">
                                {(["now", "later"] as const).map((m) => (
                                    <button key={m} type="button"
                                        onClick={() => set("scheduleMode", m)}
                                        className={`flex-1 rounded-lg border px-3 py-2 text-xs transition-colors ${form.scheduleMode === m ? "border-primary bg-primary/10 text-primary" : "border-border/50 text-muted-foreground hover:border-border"}`}>
                                        {m === "now" ? "Send Now" : "Schedule Later"}
                                    </button>
                                ))}
                            </div>
                            {form.scheduleMode === "later" && (
                                <Input type="datetime-local" value={form.scheduledAt} onChange={(e) => set("scheduledAt", e.target.value)} />
                            )}
                        </div>

                        {/* Notification preview */}
                        {preview && (form.title || form.body) && (
                            <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-2">
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Preview</p>
                                <div className="flex gap-3">
                                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                        <Bell className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">{form.title || "Title"}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{form.body || "Body"}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {error && <p className="text-sm text-destructive">{error}</p>}

                        <div className="flex gap-2 pt-1">
                            <Button variant="outline" size="sm" onClick={() => setPreview(!preview)}>
                                <Eye className="h-3.5 w-3.5 mr-1" /> {preview ? "Hide" : "Preview"}
                            </Button>
                            <Button variant="outline" size="sm" onClick={loadDevicePreview} disabled={loadingDevices}>
                                {loadingDevices ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Users className="h-3.5 w-3.5 mr-1" />}
                                Audience
                            </Button>
                            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
                            <Button className="flex-1" onClick={() => {
                                if (!form.title.trim()) { setError("Title is required"); return; }
                                if (!form.body.trim()) { setError("Body is required"); return; }
                                setError("");
                                loadDevicePreview().then(() => { /* showConfirm set inside */ });
                            }} disabled={loadingDevices}>
                                {loadingDevices ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                                {form.scheduleMode === "later" ? "Schedule" : "Review & Send"}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Notification Detail Modal ────────────────────────────────────────────────

function NotificationDetailModal({ notifId, onClose, onRetry }: {
    notifId: string;
    onClose: () => void;
    onRetry: () => void;
}) {
    const [data, setData] = useState<(NotificationPublic & { deliveryStats: Record<string, number> }) | null>(null);
    const [loading, setLoading] = useState(true);
    const [retrying, setRetrying] = useState(false);

    useEffect(() => {
        setLoading(true);
        fetch(`/api/admin/notifications/${notifId}`)
            .then(r => r.json())
            .then(setData)
            .finally(() => setLoading(false));
    }, [notifId]);

    async function handleRetry() {
        setRetrying(true);
        try {
            await fetch(`/api/admin/notifications/${notifId}/retry`, { method: "POST" });
            onRetry();
            onClose();
        } finally { setRetrying(false); }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
            <div className="w-full max-w-md rounded-xl border border-border/50 bg-card shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-5 border-b border-border/50">
                    <h3 className="font-semibold text-base">Notification Details</h3>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}><X className="h-4 w-4" /></Button>
                </div>
                <div className="p-5">
                    {loading ? (
                        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                    ) : data ? (
                        <div className="space-y-4">
                            <div>
                                <p className="font-medium text-sm">{data.title}</p>
                                <p className="text-xs text-muted-foreground mt-1">{data.body}</p>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { label: "Sent", value: data.deliveryStats?.sent ?? 0, color: "text-green-400" },
                                    { label: "Failed", value: data.deliveryStats?.failed ?? 0, color: "text-red-400" },
                                    { label: "Pending", value: data.deliveryStats?.pending ?? 0, color: "text-yellow-400" },
                                ].map((s) => (
                                    <div key={s.label} className="rounded-lg border border-border/50 bg-muted/20 p-3 text-center">
                                        <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                                        <p className="text-xs text-muted-foreground">{s.label}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Targeted: {data.totalTargeted}</span>
                                <span>Opens: {data.deliveryStats?.opened ?? 0}</span>
                            </div>
                            {(data.deliveryStats?.failed ?? 0) > 0 && (
                                <Button className="w-full" size="sm" variant="outline" onClick={handleRetry} disabled={retrying}>
                                    {retrying ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <RefreshCw className="h-3.5 w-3.5 mr-2" />}
                                    Retry {data.deliveryStats.failed} Failed
                                </Button>
                            )}
                        </div>
                    ) : <p className="text-sm text-muted-foreground text-center py-8">Failed to load details</p>}
                </div>
            </div>
        </div>
    );
}

// ─── Release Note Form ────────────────────────────────────────────────────────

const RELEASE_TAGS: ReleaseTag[] = ["feature", "bugfix", "improvement", "security", "breaking"];
const TAG_COLORS: Record<string, string> = {
    feature: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    bugfix: "bg-red-500/15 text-red-400 border-red-500/30",
    improvement: "bg-green-500/15 text-green-400 border-green-500/30",
    security: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    breaking: "bg-purple-500/15 text-purple-400 border-purple-500/30",
};

interface ReleaseNoteFormData {
    version: string;
    title: string;
    summary: string;
    content: string;
    tags: ReleaseTag[];
    majorUpdate: boolean;
    pinned: boolean;
    publishedAt: string;
}

function emptyReleaseNoteForm(): ReleaseNoteFormData {
    return {
        version: "", title: "", summary: "", content: "",
        tags: [], majorUpdate: false, pinned: false,
        publishedAt: new Date().toISOString().slice(0, 16),
    };
}

function noteToForm(n: ReleaseNotePublic): ReleaseNoteFormData {
    return {
        version: n.version, title: n.title,
        summary: n.summary || "",
        content: typeof n.content === "string" ? n.content : JSON.stringify(n.content, null, 2),
        tags: n.tags, majorUpdate: n.majorUpdate, pinned: n.pinned,
        publishedAt: n.publishedAt.slice(0, 16),
    };
}

function ReleaseNoteModal({ note, onClose, onSaved }: {
    note: ReleaseNotePublic | null;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [form, setForm] = useState<ReleaseNoteFormData>(note ? noteToForm(note) : emptyReleaseNoteForm());
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    function set<K extends keyof ReleaseNoteFormData>(key: K, val: ReleaseNoteFormData[K]) {
        setForm((f) => ({ ...f, [key]: val }));
    }

    function toggleTag(tag: ReleaseTag) {
        setForm((f) => ({
            ...f,
            tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag],
        }));
    }

    async function handleSave() {
        if (!form.version.trim()) { setError("Version is required"); return; }
        if (!form.title.trim()) { setError("Title is required"); return; }

        let contentJson: Record<string, unknown> = { type: "doc", content: [] };
        if (form.content.trim()) {
            try {
                contentJson = JSON.parse(form.content);
            } catch {
                // treat as plain text block
                contentJson = {
                    type: "doc",
                    content: [{ type: "paragraph", content: [{ type: "text", text: form.content }] }]
                };
            }
        }

        setSaving(true); setError("");
        try {
            const payload = {
                version: form.version.trim(),
                title: form.title.trim(),
                summary: form.summary.trim() || undefined,
                content: contentJson,
                tags: form.tags,
                majorUpdate: form.majorUpdate,
                pinned: form.pinned,
                publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : undefined,
            };

            const isEdit = !!note;
            const url = isEdit ? `/api/admin/release-notes?id=${note.id}` : "/api/admin/release-notes";
            const method = isEdit ? "PATCH" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (res.ok) { onSaved(); onClose(); }
            else { const d = await res.json(); setError(d.error || "Save failed"); }
        } finally { setSaving(false); }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
            <div className="w-full max-w-xl rounded-xl border border-border/50 bg-card shadow-2xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-5 border-b border-border/50">
                    <h3 className="font-semibold text-base flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-primary" />
                        {note ? "Edit Release Note" : "New Release Note"}
                    </h3>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}><X className="h-4 w-4" /></Button>
                </div>
                <div className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5"><Label className="text-xs">Version *</Label>
                            <Input value={form.version} onChange={(e) => set("version", e.target.value)} placeholder="1.2.0" /></div>
                        <div className="space-y-1.5"><Label className="text-xs">Published At</Label>
                            <Input type="datetime-local" value={form.publishedAt} onChange={(e) => set("publishedAt", e.target.value)} /></div>
                    </div>
                    <div className="space-y-1.5"><Label className="text-xs">Title *</Label>
                        <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Schema Designer Improvements" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Summary (short description)</Label>
                        <Input value={form.summary} onChange={(e) => set("summary", e.target.value)} placeholder="Improved performance and new AI features" /></div>
                    <div className="space-y-1.5">
                        <Label className="text-xs">Content (plain text or Novel JSON)</Label>
                        <textarea
                            className="w-full min-h-[180px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring font-mono text-xs"
                            value={form.content}
                            onChange={(e) => set("content", e.target.value)}
                            placeholder={'Plain text or Novel editor JSON.\nMultiple lines are supported.'} />
                        <p className="text-[10px] text-muted-foreground">Write plain text or paste Novel editor JSON. Plain text is auto-wrapped in a paragraph node.</p>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs">Tags</Label>
                        <div className="flex gap-2 flex-wrap">
                            {RELEASE_TAGS.map((tag) => (
                                <button key={tag} type="button" onClick={() => toggleTag(tag)}
                                    className={`text-xs px-2.5 py-1 rounded-full border capitalize transition-colors ${form.tags.includes(tag) ? TAG_COLORS[tag] : "border-border/50 text-muted-foreground hover:border-border"}`}>
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={form.majorUpdate} onChange={(e) => set("majorUpdate", e.target.checked)} className="h-4 w-4 rounded" />
                            <span className="text-sm flex items-center gap-1"><Star className="h-3.5 w-3.5 text-amber-400" /> Major Update</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={form.pinned} onChange={(e) => set("pinned", e.target.checked)} className="h-4 w-4 rounded" />
                            <span className="text-sm">Pinned</span>
                        </label>
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <div className="flex gap-2 pt-1">
                        <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
                        <Button className="flex-1" onClick={handleSave} disabled={saving}>
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                            {note ? "Update" : "Publish"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── User Detail Modal ────────────────────────────────────────────────────────

function UserDetailModal({ userId, onClose, onUpdated }: {
    userId: string;
    onClose: () => void;
    onUpdated: () => void;
}) {
    const [data, setData] = useState<{
        user: AdminUser & { deletedAt?: string | null };
        subscriptions: Array<{ id: string; planName: string; planSlug: string; status: string; startDate: string; endDate: string; paymentAmount: number; paymentCurrency: string }>;
        auditLogs: Array<{ id: string; action: string; details?: Record<string, unknown>; createdAt: string }>;
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [actioning, setActioning] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        fetch(`/api/admin/users/${userId}`)
            .then(r => r.json())
            .then(setData)
            .finally(() => setLoading(false));
    }, [userId]);

    async function doAction(action: string) {
        setActioning(action);
        try {
            const res = await fetch(`/api/admin/users/${userId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action }),
            });
            if (res.ok) {
                onUpdated();
                // Re-fetch
                setLoading(true);
                const d = await fetch(`/api/admin/users/${userId}`).then(r => r.json());
                setData(d);
                setLoading(false);
            }
        } finally { setActioning(null); }
    }

    const user = data?.user;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
            <div className="w-full max-w-lg rounded-xl border border-border/50 bg-card shadow-2xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-5 border-b border-border/50">
                    <h3 className="font-semibold text-base">User Details</h3>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}><X className="h-4 w-4" /></Button>
                </div>
                {loading ? (
                    <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                ) : user ? (
                    <div className="p-5 space-y-5">
                        {/* Profile */}
                        <div className="flex items-start gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary shrink-0">
                                {user.name?.[0]?.toUpperCase() ?? "?"}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium text-sm">{user.name}</span>
                                    {!user.isActive && <Badge variant="destructive" className="text-[10px]">Inactive</Badge>}
                                    {user.suspendedAt && <Badge className="text-[10px] bg-orange-500/20 text-orange-400 border-orange-500/30">Suspended</Badge>}
                                    {data.user.deletedAt && <Badge variant="destructive" className="text-[10px]">Deleted</Badge>}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
                                <p className="text-xs text-muted-foreground">Provider: {user.provider} · Joined {new Date(user.createdAt).toLocaleDateString()}</p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2">
                            {!user.suspendedAt ? (
                                <Button size="sm" variant="outline" className="text-xs h-8 text-orange-400 border-orange-500/30 hover:bg-orange-500/10"
                                    onClick={() => doAction("suspend")} disabled={!!actioning}>
                                    {actioning === "suspend" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Ban className="h-3.5 w-3.5 mr-1" />}
                                    Suspend
                                </Button>
                            ) : (
                                <Button size="sm" variant="outline" className="text-xs h-8"
                                    onClick={() => doAction("unsuspend")} disabled={!!actioning}>
                                    {actioning === "unsuspend" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RotateCcw className="h-3.5 w-3.5 mr-1" />}
                                    Unsuspend
                                </Button>
                            )}
                            <Button size="sm" variant="outline" className="text-xs h-8 text-muted-foreground"
                                onClick={() => doAction("force_logout")} disabled={!!actioning}>
                                {actioning === "force_logout" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <LogIn className="h-3.5 w-3.5 mr-1" />}
                                Force Logout
                            </Button>
                            {!data.user.deletedAt ? (
                                <Button size="sm" variant="outline" className="text-xs h-8 text-destructive border-destructive/30 hover:bg-destructive/10"
                                    onClick={() => { if (confirm("Soft-delete this user?")) doAction("delete"); }}
                                    disabled={!!actioning}>
                                    {actioning === "delete" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <UserX className="h-3.5 w-3.5 mr-1" />}
                                    Delete
                                </Button>
                            ) : (
                                <Button size="sm" variant="outline" className="text-xs h-8"
                                    onClick={() => doAction("restore")} disabled={!!actioning}>
                                    {actioning === "restore" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RotateCcw className="h-3.5 w-3.5 mr-1" />}
                                    Restore
                                </Button>
                            )}
                        </div>

                        {/* Subscriptions */}
                        {data.subscriptions.length > 0 && (
                            <div>
                                <p className="text-xs font-medium text-muted-foreground mb-2">SUBSCRIPTION HISTORY</p>
                                <div className="space-y-2">
                                    {data.subscriptions.map((s) => (
                                        <div key={s.id} className="rounded-lg border border-border/50 bg-muted/20 p-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium">{s.planName}</span>
                                                <Badge variant={s.status === "active" ? "default" : "secondary"} className="text-[10px]">{s.status}</Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {new Date(s.startDate).toLocaleDateString()} → {new Date(s.endDate).toLocaleDateString()}
                                                {" · "}{(s.paymentAmount / 100).toFixed(2)} {s.paymentCurrency.toUpperCase()}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Audit Logs */}
                        {data.auditLogs.length > 0 && (
                            <div>
                                <p className="text-xs font-medium text-muted-foreground mb-2">AUDIT LOG</p>
                                <div className="space-y-1.5">
                                    {data.auditLogs.map((l) => (
                                        <div key={l.id} className="flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground">{l.action.replace(".", " ").replace("_", " ")}</span>
                                            <span className="text-muted-foreground/70">{new Date(l.createdAt).toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-8 p-5">Failed to load user details</p>
                )}
            </div>
        </div>
    );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard({ onLogout }: { onLogout: () => void }) {
    // Plans & Campaigns
    const [plans, setPlans] = useState<AdminPlan[]>([]);
    const [campaigns, setCampaigns] = useState<AdminCampaign[]>([]);
    const [loadingPlans, setLoadingPlans] = useState(true);
    const [loadingCampaigns, setLoadingCampaigns] = useState(true);
    const [editPlan, setEditPlan] = useState<AdminPlan | null | "new">(null);
    const [editCampaign, setEditCampaign] = useState<AdminCampaign | null | "new">(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Notifications
    const [notifications, setNotifications] = useState<NotificationPublic[]>([]);
    const [loadingNotifs, setLoadingNotifs] = useState(false);
    const [showNotifModal, setShowNotifModal] = useState(false);
    const [viewNotifId, setViewNotifId] = useState<string | null>(null);
    const [notifPage, setNotifPage] = useState(1);
    const [notifTotal, setNotifTotal] = useState(0);

    // Release Notes
    const [releaseNotes, setReleaseNotes] = useState<ReleaseNotePublic[]>([]);
    const [loadingNotes, setLoadingNotes] = useState(false);
    const [editNote, setEditNote] = useState<ReleaseNotePublic | null | "new">(null);
    const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
    const [notesPage, setNotesPage] = useState(1);
    const [notesTotal, setNotesTotal] = useState(0);

    // Users
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [userSearch, setUserSearch] = useState("");
    const [userSubFilter, setUserSubFilter] = useState("");
    const [userActiveFilter, setUserActiveFilter] = useState("");
    const [usersPage, setUsersPage] = useState(1);
    const [usersTotal, setUsersTotal] = useState(0);
    const [usersPages, setUsersPages] = useState(1);
    const [viewUserId, setViewUserId] = useState<string | null>(null);

    // Trial
    const [trialSettings, setTrialSettings] = useState<{ trialEnabled: boolean; trialDurationDays: number } | null>(null);
    const [trialStats, setTrialStats] = useState<{ total: number; active: number; expired: number; blocked: number } | null>(null);
    const [trialRecent, setTrialRecent] = useState<{ _id: string; state: string; firstSeenIp: string; trialStartDate: string; trialExpiryDate: string; requestCount: number; createdAt: string }[]>([]);
    const [loadingTrial, setLoadingTrial] = useState(false);
    const [savingTrialSettings, setSavingTrialSettings] = useState(false);
    const [trialDurationInput, setTrialDurationInput] = useState("");

    // API Analytics
    interface ApiStats {
        totalCalls: number; successCalls: number; errorCalls: number; abortedCalls: number;
        avgResponseTime: number; p95ResponseTime: number;
        totalTokens: number; uniqueUsers: number; successRate: number;
    }
    interface ApiTimePoint { date: string; calls: number; successCalls: number; errorCalls: number; avgResponseTime: number; totalTokens: number; }
    interface ApiUserRow { userId: string; userEmail?: string; userName?: string; totalCalls: number; successCalls: number; errorCalls: number; avgResponseTime: number; totalTokens: number; lastActivity: string; subscriptionType?: string; successRate: number; }
    interface ApiModelRow { model: string; calls: number; successCalls: number; avgResponseTime: number; totalTokens: number; }
    interface ApiLogRow { id: string; userId: string; userEmail?: string; userName?: string; model: string; featureType: string; endpoint: string; requestTimestamp: string; responseTime: number; status: string; tokenUsed?: number; errorMessage?: string; subscriptionType?: string; createdAt: string; }
    const [apiLoading, setApiLoading] = useState(false);
    const [apiStats, setApiStats] = useState<ApiStats | null>(null);
    const [apiTimeSeries, setApiTimeSeries] = useState<ApiTimePoint[]>([]);
    const [apiUserRows, setApiUserRows] = useState<ApiUserRow[]>([]);
    const [apiModelRows, setApiModelRows] = useState<ApiModelRow[]>([]);
    const [apiLogs, setApiLogs] = useState<ApiLogRow[]>([]);
    const [apiLogsTotal, setApiLogsTotal] = useState(0);
    const [apiLogsPage, setApiLogsPage] = useState(1);
    const [apiLogsPages, setApiLogsPages] = useState(1);
    const [apiFilterEmail, setApiFilterEmail] = useState("");
    const [apiFilterModel, setApiFilterModel] = useState("");
    const [apiFilterStatus, setApiFilterStatus] = useState("");
    const [apiFilterStart, setApiFilterStart] = useState("");
    const [apiFilterEnd, setApiFilterEnd] = useState("");
    const [apiGranularity, setApiGranularity] = useState<"day" | "week" | "month">("day");
    const [apiSubView, setApiSubView] = useState<"overview" | "logs" | "users">("overview");

    // ── Data Fetchers ──
    const fetchPlans = useCallback(async () => {
        setLoadingPlans(true);
        try { const r = await fetch("/api/admin/plans"); if (r.ok) setPlans(await r.json()); }
        finally { setLoadingPlans(false); }
    }, []);

    const fetchCampaigns = useCallback(async () => {
        setLoadingCampaigns(true);
        try { const r = await fetch("/api/admin/campaigns"); if (r.ok) setCampaigns(await r.json()); }
        finally { setLoadingCampaigns(false); }
    }, []);

    const fetchNotifications = useCallback(async (page = 1) => {
        setLoadingNotifs(true);
        try {
            const r = await fetch(`/api/admin/notifications?page=${page}&limit=10`);
            if (r.ok) {
                const d = await r.json();
                setNotifications(d.notifications);
                setNotifTotal(d.total);
            }
        } finally { setLoadingNotifs(false); }
    }, []);

    const fetchReleaseNotes = useCallback(async (page = 1) => {
        setLoadingNotes(true);
        try {
            const r = await fetch(`/api/admin/release-notes?page=${page}&limit=10`);
            if (r.ok) {
                const d = await r.json();
                setReleaseNotes(d.notes);
                setNotesTotal(d.total);
            }
        } finally { setLoadingNotes(false); }
    }, []);

    const fetchUsers = useCallback(async (page = 1) => {
        setLoadingUsers(true);
        try {
            const params = new URLSearchParams({ page: String(page), limit: "25" });
            if (userSearch) params.set("search", userSearch);
            if (userSubFilter) params.set("subStatus", userSubFilter);
            if (userActiveFilter) params.set("active", userActiveFilter);
            const r = await fetch(`/api/admin/users?${params}`);
            if (r.ok) {
                const d = await r.json();
                setUsers(d.users);
                setUsersTotal(d.total);
                setUsersPages(d.pages);
            }
        } finally { setLoadingUsers(false); }
    }, [userSearch, userSubFilter, userActiveFilter]);

    const fetchTrialData = useCallback(async () => {
        setLoadingTrial(true);
        try {
            const [settingsRes, statsRes] = await Promise.all([
                fetch("/api/admin/trial-settings"),
                fetch("/api/admin/trials"),
            ]);
            if (settingsRes.ok) {
                const s = await settingsRes.json();
                setTrialSettings(s);
                setTrialDurationInput(String(s.trialDurationDays ?? 2));
            }
            if (statsRes.ok) {
                const d = await statsRes.json();
                setTrialStats(d.stats);
                setTrialRecent(d.recent ?? []);
            }
        } finally { setLoadingTrial(false); }
    }, []);

    async function saveTrialSettings(patch: { trialEnabled?: boolean; trialDurationDays?: number }) {
        setSavingTrialSettings(true);
        try {
            const res = await fetch("/api/admin/trial-settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(patch),
            });
            if (res.ok) {
                const s = await res.json();
                setTrialSettings(s);
                setTrialDurationInput(String(s.trialDurationDays));
            }
        } finally { setSavingTrialSettings(false); }
    }

    const buildApiParams = useCallback((extra: Record<string, string> = {}) => {
        const p = new URLSearchParams(extra);
        if (apiFilterEmail) p.set("userEmail", apiFilterEmail);
        if (apiFilterModel) p.set("model", apiFilterModel);
        if (apiFilterStatus) p.set("status", apiFilterStatus);
        if (apiFilterStart) p.set("startDate", apiFilterStart);
        if (apiFilterEnd) p.set("endDate", apiFilterEnd);
        return p.toString();
    }, [apiFilterEmail, apiFilterModel, apiFilterStatus, apiFilterStart, apiFilterEnd]);

    const fetchApiAnalytics = useCallback(async () => {
        setApiLoading(true);
        try {
            const base = buildApiParams();
            const [statsRes, tsRes, usersRes, modelsRes] = await Promise.all([
                fetch(`/api/admin/api-logs?view=stats&${base}`),
                fetch(`/api/admin/api-logs?view=timeseries&granularity=${apiGranularity}&${base}`),
                fetch(`/api/admin/api-logs?view=users&limit=10&${base}`),
                fetch(`/api/admin/api-logs?view=models&${base}`),
            ]);
            if (statsRes.ok) { const d = await statsRes.json(); setApiStats(d.stats); }
            if (tsRes.ok) { const d = await tsRes.json(); setApiTimeSeries(d.series ?? []); }
            if (usersRes.ok) { const d = await usersRes.json(); setApiUserRows(d.users ?? []); }
            if (modelsRes.ok) { const d = await modelsRes.json(); setApiModelRows(d.models ?? []); }
        } finally { setApiLoading(false); }
    }, [buildApiParams, apiGranularity]);

    const fetchApiLogs = useCallback(async (page = 1) => {
        setApiLoading(true);
        try {
            const p = buildApiParams({ view: "logs", page: String(page), limit: "50" });
            const r = await fetch(`/api/admin/api-logs?${p}`);
            if (r.ok) {
                const d = await r.json();
                setApiLogs(d.logs ?? []);
                setApiLogsTotal(d.total ?? 0);
                setApiLogsPage(d.page ?? 1);
                setApiLogsPages(d.pages ?? 1);
            }
        } finally { setApiLoading(false); }
    }, [buildApiParams]);

    function exportApiCsv() {
        const p = buildApiParams();
        window.open(`/api/admin/api-logs/export?${p}`, "_blank");
    }

    useEffect(() => { fetchPlans(); fetchCampaigns(); }, [fetchPlans, fetchCampaigns]);

    function formatPrice(cents: number, currency: string) {
        return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
    }

    function statusBadge(status: string) {
        const map: Record<string, string> = {
            completed: "bg-green-500/15 text-green-400 border-green-500/30",
            sending: "bg-blue-500/15 text-blue-400 border-blue-500/30",
            scheduled: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
            failed: "bg-red-500/15 text-red-400 border-red-500/30",
            draft: "bg-muted text-muted-foreground border-border",
        };
        return map[status] ?? "bg-muted text-muted-foreground border-border";
    }

    return (
        <div className="min-h-screen bg-background">
            <header className="sticky top-0 z-40 border-b border-border/50 bg-background/90 backdrop-blur-sm">
                <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                            <Database className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-bold">pgStudio</span>
                        <Badge variant="secondary" className="text-[10px]">Admin</Badge>
                    </div>
                    <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={onLogout}>
                        <LogOut className="h-4 w-4" /> Sign Out
                    </Button>
                </div>
            </header>

            <main className="mx-auto max-w-6xl p-6 space-y-6">
                {/* Stats */}
                <div className="grid gap-4 sm:grid-cols-4">
                    {[
                        { label: "Total Plans", value: plans.length, sub: `${plans.filter(p => p.isActive).length} active`, icon: Package },
                        { label: "Campaigns", value: campaigns.length, sub: "seasonal offers", icon: Megaphone },
                        { label: "Notifications", value: notifTotal, sub: "total sent", icon: Bell },
                        { label: "Release Notes", value: notesTotal, sub: "versions published", icon: BookOpen },
                    ].map((s) => (
                        <Card key={s.label} className="border-border/50">
                            <CardContent className="pt-5">
                                <div className="flex items-center justify-between mb-1">
                                    <p className="text-2xl font-bold">{s.value}</p>
                                    <s.icon className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <p className="text-sm font-medium">{s.label}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <Tabs defaultValue="plans">
                    <TabsList className="mb-4 flex-wrap h-auto gap-1">
                        <TabsTrigger value="plans" className="gap-2"><Package className="h-4 w-4" /> Plans</TabsTrigger>
                        <TabsTrigger value="campaigns" className="gap-2"><Megaphone className="h-4 w-4" /> Campaigns</TabsTrigger>
                        <TabsTrigger value="notifications" className="gap-2" onClick={() => { if (!loadingNotifs && notifications.length === 0) fetchNotifications(); }}>
                            <Bell className="h-4 w-4" /> Notifications
                        </TabsTrigger>
                        <TabsTrigger value="bug-reports" className="gap-2">
                            <KanbanSquare className="h-4 w-4" /> Bug Reports
                        </TabsTrigger>
                        <TabsTrigger value="release-notes" className="gap-2" onClick={() => { if (!loadingNotes && releaseNotes.length === 0) fetchReleaseNotes(); }}>
                            <BookOpen className="h-4 w-4" /> Release Notes
                        </TabsTrigger>
                        <TabsTrigger value="users" className="gap-2" onClick={() => { if (!loadingUsers && users.length === 0) fetchUsers(); }}>
                            <Users className="h-4 w-4" /> Users
                        </TabsTrigger>
                        <TabsTrigger value="trial" className="gap-2" onClick={() => { if (!trialStats) fetchTrialData(); }}>
                            <Timer className="h-4 w-4" /> Free Trial
                        </TabsTrigger>
                        <TabsTrigger value="api-analytics" className="gap-2" onClick={() => { if (!apiStats) fetchApiAnalytics(); }}>
                            <BarChart2 className="h-4 w-4" /> API Analytics
                        </TabsTrigger>
                    </TabsList>

                    {/* ── Plans Tab ─────────────────────────────────────────── */}
                    <TabsContent value="plans">
                        <Card className="border-border/50">
                            <CardHeader className="flex flex-row items-center justify-between pb-4">
                                <div>
                                    <CardTitle className="text-base">Subscription Plans</CardTitle>
                                    <CardDescription>Manage all subscription tiers</CardDescription>
                                </div>
                                <Button size="sm" className="gap-2" onClick={() => setEditPlan("new")}>
                                    <Plus className="h-4 w-4" /> New Plan
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {loadingPlans ? (
                                    <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                                ) : plans.length === 0 ? (
                                    <div className="py-12 text-center text-muted-foreground">
                                        <Package className="h-8 w-8 mx-auto mb-3 opacity-40" />
                                        <p className="text-sm">No plans yet. Create your first plan.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {plans.map((plan) => (
                                            <div key={plan.id} className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 p-4">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-sm">{plan.name}</span>
                                                        {plan.isFeatured && <Badge className="text-[10px] px-1.5 py-0">Featured</Badge>}
                                                        {plan.promoTag && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{plan.promoTag}</Badge>}
                                                        {!plan.isActive && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Inactive</Badge>}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                        {formatPrice(plan.price, plan.currency)} · {plan.durationDays}d · Discord: {plan.discordAccess}
                                                    </p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditPlan(plan)}><Pencil className="h-3.5 w-3.5" /></Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                                                        onClick={async () => {
                                                            if (!confirm("Delete this plan?")) return;
                                                            setDeletingId(plan.id);
                                                            await fetch(`/api/admin/plans?id=${plan.id}`, { method: "DELETE" });
                                                            await fetchPlans();
                                                            setDeletingId(null);
                                                        }}
                                                        disabled={deletingId === plan.id}>
                                                        {deletingId === plan.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ── Campaigns Tab ──────────────────────────────────────── */}
                    <TabsContent value="campaigns">
                        <Card className="border-border/50">
                            <CardHeader className="flex flex-row items-center justify-between pb-4">
                                <div>
                                    <CardTitle className="text-base">Campaigns</CardTitle>
                                    <CardDescription>Promotional banners and offers</CardDescription>
                                </div>
                                <Button size="sm" className="gap-2" onClick={() => setEditCampaign("new")}>
                                    <Plus className="h-4 w-4" /> New Campaign
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {loadingCampaigns ? (
                                    <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                                ) : campaigns.length === 0 ? (
                                    <div className="py-12 text-center text-muted-foreground">
                                        <Megaphone className="h-8 w-8 mx-auto mb-3 opacity-40" />
                                        <p className="text-sm">No campaigns yet.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {campaigns.map((c) => (
                                            <div key={c.id} className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 p-4">
                                                <div className="flex items-center gap-3">
                                                    {c.posterPath && <img src={c.posterPath} alt="" className="h-10 w-10 rounded object-cover border border-border/50" />}
                                                    <div>
                                                        <span className="font-medium text-sm">{c.title}</span>
                                                        <p className="text-xs text-muted-foreground mt-0.5">
                                                            {c.discountPercentage}% off · {c.startDate.slice(0, 10)} → {c.endDate.slice(0, 10)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditCampaign(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                                                        onClick={async () => {
                                                            if (!confirm("Delete this campaign?")) return;
                                                            setDeletingId(c.id);
                                                            await fetch(`/api/admin/campaigns?id=${c.id}`, { method: "DELETE" });
                                                            await fetchCampaigns();
                                                            setDeletingId(null);
                                                        }}
                                                        disabled={deletingId === c.id}>
                                                        {deletingId === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ── Notifications Tab ──────────────────────────────────── */}
                    <TabsContent value="notifications">
                        <Card className="border-border/50">
                            <CardHeader className="flex flex-row items-center justify-between pb-4">
                                <div>
                                    <CardTitle className="text-base">Notifications</CardTitle>
                                    <CardDescription>Send and manage push notifications</CardDescription>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => fetchNotifications(notifPage)}>
                                        <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
                                    </Button>
                                    <Button size="sm" className="gap-2" onClick={() => setShowNotifModal(true)}>
                                        <Plus className="h-4 w-4" /> New Notification
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {loadingNotifs ? (
                                    <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                                ) : notifications.length === 0 ? (
                                    <div className="py-12 text-center text-muted-foreground">
                                        <Bell className="h-8 w-8 mx-auto mb-3 opacity-40" />
                                        <p className="text-sm">No notifications yet. Send your first notification.</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="space-y-3">
                                            {notifications.map((n) => (
                                                <div key={n.id} className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 p-4">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-medium text-sm truncate">{n.title}</span>
                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${statusBadge(n.status)}`}>{n.status}</span>
                                                            <Badge variant="outline" className="text-[10px]">{n.type}</Badge>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{n.body}</p>
                                                        <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                                                            <span>{n.totalTargeted} targeted</span>
                                                            <span className="text-green-400">{n.totalSent} sent</span>
                                                            {n.totalFailed > 0 && <span className="text-red-400">{n.totalFailed} failed</span>}
                                                        </div>
                                                    </div>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setViewNotifId(n.id)}>
                                                        <Eye className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                        {notifTotal > 10 && (
                                            <div className="flex items-center justify-center gap-3 mt-4">
                                                <Button variant="outline" size="sm" disabled={notifPage <= 1}
                                                    onClick={() => { const p = notifPage - 1; setNotifPage(p); fetchNotifications(p); }}>
                                                    <ChevronLeft className="h-4 w-4" />
                                                </Button>
                                                <span className="text-xs text-muted-foreground">
                                                    Page {notifPage} of {Math.ceil(notifTotal / 10)}
                                                </span>
                                                <Button variant="outline" size="sm" disabled={notifPage >= Math.ceil(notifTotal / 10)}
                                                    onClick={() => { const p = notifPage + 1; setNotifPage(p); fetchNotifications(p); }}>
                                                    <ChevronRight className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ── Bug Reports Tab ───────────────────────────────────── */}
                    <TabsContent value="bug-reports">
                        <BugReportsKanbanBoard />
                    </TabsContent>

                    {/* ── Release Notes Tab ──────────────────────────────────── */}
                    <TabsContent value="release-notes">
                        <Card className="border-border/50">
                            <CardHeader className="flex flex-row items-center justify-between pb-4">
                                <div>
                                    <CardTitle className="text-base">Release Notes</CardTitle>
                                    <CardDescription>Manage version updates and changelogs</CardDescription>
                                </div>
                                <Button size="sm" className="gap-2" onClick={() => setEditNote("new")}>
                                    <Plus className="h-4 w-4" /> New Release Note
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {loadingNotes ? (
                                    <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                                ) : releaseNotes.length === 0 ? (
                                    <div className="py-12 text-center text-muted-foreground">
                                        <BookOpen className="h-8 w-8 mx-auto mb-3 opacity-40" />
                                        <p className="text-sm">No release notes yet. Publish your first version.</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="space-y-3">
                                            {releaseNotes.map((note) => (
                                                <div key={note.id} className={`rounded-lg border bg-muted/20 p-4 ${note.pinned ? "border-primary/30" : "border-border/50"}`}>
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                                <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20">v{note.version}</span>
                                                                {note.majorUpdate && <span className="flex items-center gap-1 text-xs text-amber-400"><Star className="h-3 w-3" /> Major</span>}
                                                                {note.pinned && <span className="text-xs text-muted-foreground">📌 Pinned</span>}
                                                                {note.tags.map((tag) => (
                                                                    <span key={tag} className={`text-[10px] px-1.5 py-0.5 rounded border capitalize ${TAG_COLORS[tag] ?? ""}`}>{tag}</span>
                                                                ))}
                                                            </div>
                                                            <p className="font-medium text-sm">{note.title}</p>
                                                            {note.summary && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{note.summary}</p>}
                                                            <p className="text-[10px] text-muted-foreground mt-1">{new Date(note.publishedAt).toLocaleDateString()}</p>
                                                        </div>
                                                        <div className="flex gap-1 shrink-0">
                                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditNote(note)}><Pencil className="h-3.5 w-3.5" /></Button>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                                                                onClick={async () => {
                                                                    if (!confirm("Delete this release note?")) return;
                                                                    setDeletingNoteId(note.id);
                                                                    await fetch(`/api/admin/release-notes?id=${note.id}`, { method: "DELETE" });
                                                                    await fetchReleaseNotes(notesPage);
                                                                    setDeletingNoteId(null);
                                                                }}
                                                                disabled={deletingNoteId === note.id}>
                                                                {deletingNoteId === note.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {notesTotal > 10 && (
                                            <div className="flex items-center justify-center gap-3 mt-4">
                                                <Button variant="outline" size="sm" disabled={notesPage <= 1}
                                                    onClick={() => { const p = notesPage - 1; setNotesPage(p); fetchReleaseNotes(p); }}>
                                                    <ChevronLeft className="h-4 w-4" />
                                                </Button>
                                                <span className="text-xs text-muted-foreground">Page {notesPage} of {Math.ceil(notesTotal / 10)}</span>
                                                <Button variant="outline" size="sm" disabled={notesPage >= Math.ceil(notesTotal / 10)}
                                                    onClick={() => { const p = notesPage + 1; setNotesPage(p); fetchReleaseNotes(p); }}>
                                                    <ChevronRight className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ── Users Tab ─────────────────────────────────────────── */}
                    <TabsContent value="users">
                        <Card className="border-border/50">
                            <CardHeader className="pb-4">
                                <div className="flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle className="text-base">User Management</CardTitle>
                                        <CardDescription>Manage all registered users</CardDescription>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={() => fetchUsers(usersPage)}>
                                        <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
                                    </Button>
                                </div>
                                {/* Filters */}
                                <div className="flex flex-wrap gap-2 pt-3">
                                    <div className="relative flex-1 min-w-[180px]">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                        <Input
                                            className="pl-8 h-8 text-xs"
                                            placeholder="Search name or email…"
                                            value={userSearch}
                                            onChange={(e) => setUserSearch(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === "Enter") { setUsersPage(1); fetchUsers(1); } }}
                                        />
                                    </div>
                                    <select className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                                        value={userSubFilter}
                                        onChange={(e) => { setUserSubFilter(e.target.value); setUsersPage(1); }}>
                                        <option value="">All Subscriptions</option>
                                        <option value="active">Active Sub</option>
                                        <option value="expired">Expired Sub</option>
                                        <option value="none">No Subscription</option>
                                    </select>
                                    <select className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                                        value={userActiveFilter}
                                        onChange={(e) => { setUserActiveFilter(e.target.value); setUsersPage(1); }}>
                                        <option value="">All Status</option>
                                        <option value="true">Active</option>
                                        <option value="false">Inactive/Suspended</option>
                                    </select>
                                    <Button size="sm" variant="outline" className="h-8" onClick={() => { setUsersPage(1); fetchUsers(1); }}>
                                        <Filter className="h-3.5 w-3.5 mr-1" /> Apply
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {loadingUsers ? (
                                    <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                                ) : users.length === 0 ? (
                                    <div className="py-12 text-center text-muted-foreground">
                                        <Users className="h-8 w-8 mx-auto mb-3 opacity-40" />
                                        <p className="text-sm">No users found.</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="space-y-2">
                                            {users.map((u) => (
                                                <div key={u.id} className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 px-4 py-3 gap-3">
                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                                                            {u.name?.[0]?.toUpperCase() ?? "?"}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <span className="text-sm font-medium truncate">{u.name}</span>
                                                                {!u.isActive && <Badge variant="destructive" className="text-[10px] shrink-0">Inactive</Badge>}
                                                                {u.suspendedAt && <Badge className="text-[10px] bg-orange-500/20 text-orange-400 border-orange-500/30 shrink-0">Suspended</Badge>}
                                                            </div>
                                                            <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                                                                <span className="truncate">{u.email}</span>
                                                                {u.subscription && (
                                                                    <Badge variant="outline" className="text-[10px] shrink-0">{u.subscription.planSlug}</Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                                                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "Never"}
                                                    </div>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"
                                                        onClick={() => { setViewUserId(u.id); }}>
                                                        <ExternalLink className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex items-center justify-between mt-4">
                                            <p className="text-xs text-muted-foreground">{usersTotal} total users</p>
                                            <div className="flex items-center gap-3">
                                                <Button variant="outline" size="sm" disabled={usersPage <= 1}
                                                    onClick={() => { const p = usersPage - 1; setUsersPage(p); fetchUsers(p); }}>
                                                    <ChevronLeft className="h-4 w-4" />
                                                </Button>
                                                <span className="text-xs text-muted-foreground">Page {usersPage} of {usersPages}</span>
                                                <Button variant="outline" size="sm" disabled={usersPage >= usersPages}
                                                    onClick={() => { const p = usersPage + 1; setUsersPage(p); fetchUsers(p); }}>
                                                    <ChevronRight className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                    {/* ── Trial Tab ──────────────────────────────────────────── */}
                    <TabsContent value="trial">
                        {loadingTrial && !trialStats ? (
                            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                        ) : (
                            <div className="space-y-6">
                                {/* Stats Row */}
                                <div className="grid gap-4 sm:grid-cols-4">
                                    {[
                                        { label: "Total Devices", value: trialStats?.total ?? 0, icon: MonitorSmartphone, color: "text-blue-400" },
                                        { label: "Active Trials", value: trialStats?.active ?? 0, icon: Activity, color: "text-emerald-400" },
                                        { label: "Expired Trials", value: trialStats?.expired ?? 0, icon: Clock, color: "text-amber-400" },
                                        { label: "Blocked", value: trialStats?.blocked ?? 0, icon: Ban, color: "text-red-400" },
                                    ].map((s) => (
                                        <Card key={s.label} className="border-border/50">
                                            <CardContent className="pt-5">
                                                <div className="flex items-center justify-between mb-1">
                                                    <p className="text-2xl font-bold">{s.value}</p>
                                                    <s.icon className={`h-5 w-5 ${s.color}`} />
                                                </div>
                                                <p className="text-sm font-medium">{s.label}</p>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>

                                {/* Settings Card */}
                                <Card className="border-border/50">
                                    <CardHeader className="pb-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <CardTitle className="text-base flex items-center gap-2">
                                                    <Timer className="h-4 w-4 text-primary" />
                                                    Trial Settings
                                                </CardTitle>
                                                <CardDescription className="text-xs mt-1">
                                                    Configure the free trial experience for new users
                                                </CardDescription>
                                            </div>
                                            <Button variant="outline" size="sm" onClick={fetchTrialData} disabled={loadingTrial} className="h-8">
                                                <RefreshCw className={`h-3.5 w-3.5 ${loadingTrial ? "animate-spin" : ""}`} />
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-5">
                                        {/* Enable / Disable Toggle */}
                                        <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 px-4 py-3">
                                            <div>
                                                <p className="text-sm font-medium">Free Trial</p>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {trialSettings?.trialEnabled
                                                        ? "New devices receive a free trial period"
                                                        : "Disabled — new users must log in immediately"}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => saveTrialSettings({ trialEnabled: !trialSettings?.trialEnabled })}
                                                disabled={savingTrialSettings || trialSettings === null}
                                                className="relative flex items-center gap-1 rounded-full px-1 py-0.5 transition-all disabled:opacity-50"
                                                title={trialSettings?.trialEnabled ? "Disable trial" : "Enable trial"}
                                            >
                                                {savingTrialSettings ? (
                                                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                                ) : trialSettings?.trialEnabled ? (
                                                    <ToggleRight className="h-8 w-8 text-emerald-400" />
                                                ) : (
                                                    <ToggleLeft className="h-8 w-8 text-muted-foreground" />
                                                )}
                                            </button>
                                        </div>

                                        {/* Duration Control */}
                                        <div className="rounded-lg border border-border/50 bg-muted/20 px-4 py-4 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-medium">Trial Duration</p>
                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                        Currently <span className="text-foreground font-semibold">{trialSettings?.trialDurationDays ?? "—"} day{trialSettings?.trialDurationDays !== 1 ? "s" : ""}</span>
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 max-w-xs">
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    max={90}
                                                    value={trialDurationInput}
                                                    onChange={(e) => setTrialDurationInput(e.target.value)}
                                                    className="h-8 w-24 text-sm"
                                                    placeholder="Days"
                                                />
                                                <span className="text-sm text-muted-foreground">days</span>
                                                <Button
                                                    size="sm"
                                                    className="h-8"
                                                    disabled={
                                                        savingTrialSettings ||
                                                        !trialDurationInput ||
                                                        Number(trialDurationInput) < 1 ||
                                                        Number(trialDurationInput) > 90 ||
                                                        Number(trialDurationInput) === trialSettings?.trialDurationDays
                                                    }
                                                    onClick={() => saveTrialSettings({ trialDurationDays: Number(trialDurationInput) })}
                                                >
                                                    {savingTrialSettings ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                                    Save
                                                </Button>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground">
                                                Applies to <strong>new</strong> devices only. Existing trials are not affected.
                                            </p>

                                            {/* Quick Presets */}
                                            <div className="flex flex-wrap gap-1.5 pt-1">
                                                {[1, 2, 3, 5, 7, 14, 30].map((d) => (
                                                    <button
                                                        key={d}
                                                        onClick={() => setTrialDurationInput(String(d))}
                                                        className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                                                            Number(trialDurationInput) === d
                                                                ? "border-primary bg-primary/10 text-primary"
                                                                : "border-border/50 bg-muted/20 text-muted-foreground hover:border-border hover:text-foreground"
                                                        }`}
                                                    >
                                                        {d}d
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Security Info */}
                                        <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3">
                                            <div className="flex items-start gap-2">
                                                <Shield className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                                                <div className="text-xs text-muted-foreground space-y-1">
                                                    <p className="font-medium text-foreground">Security Architecture</p>
                                                    <p>Device fingerprints are hardware-bound and double-hashed (SHA-256) before storage — raw IDs are never persisted.</p>
                                                    <p>Trial state is validated server-side on every app launch using server time only — client clocks are never trusted.</p>
                                                    <p>Reinstalling the app on the same machine will not reset the trial.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Recent Devices */}
                                <Card className="border-border/50">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base">Recent Devices</CardTitle>
                                        <CardDescription className="text-xs">Last 50 trial registrations</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {trialRecent.length === 0 ? (
                                            <div className="py-10 text-center text-muted-foreground">
                                                <MonitorSmartphone className="h-8 w-8 mx-auto mb-3 opacity-40" />
                                                <p className="text-sm">No trial devices yet.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {trialRecent.map((r) => {
                                                    const expiry = new Date(r.trialExpiryDate);
                                                    const now = new Date();
                                                    const daysLeft = Math.max(0, Math.ceil((expiry.getTime() - now.getTime()) / 86400000));
                                                    const stateBadge: Record<string, string> = {
                                                        active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
                                                        expired: "bg-amber-500/15 text-amber-400 border-amber-500/30",
                                                        blocked: "bg-red-500/15 text-red-400 border-red-500/30",
                                                    };
                                                    return (
                                                        <div key={r._id} className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/20 px-4 py-3">
                                                            <MonitorSmartphone className="h-4 w-4 text-muted-foreground shrink-0" />
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <span className="text-xs font-mono text-muted-foreground truncate">{r.firstSeenIp}</span>
                                                                    <Badge variant="outline" className={`text-[10px] shrink-0 ${stateBadge[r.state] ?? ""}`}>
                                                                        {r.state}
                                                                    </Badge>
                                                                    {r.state === "active" && (
                                                                        <span className="text-[10px] text-muted-foreground">{daysLeft}d left</span>
                                                                    )}
                                                                </div>
                                                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                                                    Started {new Date(r.trialStartDate).toLocaleDateString()} · Expires {expiry.toLocaleDateString()} · {r.requestCount} checks
                                                                </p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </TabsContent>

                    {/* ── API Analytics Tab ──────────────────────────────────── */}
                    <TabsContent value="api-analytics">
                        <div className="space-y-5">
                            {/* Toolbar */}
                            <Card className="border-border/50">
                                <CardContent className="pt-4 pb-4">
                                    <div className="flex flex-wrap items-end gap-3">
                                        <div className="flex-1 min-w-[140px] space-y-1">
                                            <label className="text-[11px] text-muted-foreground font-medium">User Email</label>
                                            <Input value={apiFilterEmail} onChange={e => setApiFilterEmail(e.target.value)} placeholder="Filter by email…" className="h-8 text-sm" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[11px] text-muted-foreground font-medium">Model</label>
                                            <select value={apiFilterModel} onChange={e => setApiFilterModel(e.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                                                <option value="">All Models</option>
                                                <option value="gemini-2.5-pro">Gemini Pro</option>
                                                <option value="gemini-2.5-flash">Gemini Flash</option>
                                                <option value="gemini-2.5-flash-lite">Flash Lite</option>
                                                <option value="gemini-2.5-pro-lite">Pro Lite</option>
                                                <option value="gemma3-4b">Gemma 3 4B</option>
                                                <option value="gemma3-12b">Gemma 3 12B</option>
                                                <option value="gemma3-27b">Gemma 3 27B</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[11px] text-muted-foreground font-medium">Status</label>
                                            <select value={apiFilterStatus} onChange={e => setApiFilterStatus(e.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                                                <option value="">All Status</option>
                                                <option value="success">Success</option>
                                                <option value="error">Error</option>
                                                <option value="aborted">Aborted</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[11px] text-muted-foreground font-medium">From</label>
                                            <Input type="date" value={apiFilterStart} onChange={e => setApiFilterStart(e.target.value)} className="h-8 text-sm w-36" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[11px] text-muted-foreground font-medium">To</label>
                                            <Input type="date" value={apiFilterEnd} onChange={e => setApiFilterEnd(e.target.value)} className="h-8 text-sm w-36" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[11px] text-muted-foreground font-medium">Granularity</label>
                                            <select value={apiGranularity} onChange={e => setApiGranularity(e.target.value as "day" | "week" | "month")} className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                                                <option value="day">Daily</option>
                                                <option value="week">Weekly</option>
                                                <option value="month">Monthly</option>
                                            </select>
                                        </div>
                                        <Button size="sm" className="h-8 gap-1.5" onClick={fetchApiAnalytics} disabled={apiLoading}>
                                            {apiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                                            Apply
                                        </Button>
                                        <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={exportApiCsv}>
                                            <Download className="h-3.5 w-3.5" /> Export CSV
                                        </Button>
                                    </div>
                                    {/* Sub-view toggle */}
                                    <div className="flex gap-1 mt-3 pt-3 border-t border-border/50">
                                        {(["overview", "logs", "users"] as const).map(v => (
                                            <button key={v} onClick={() => {
                                                setApiSubView(v);
                                                if (v === "logs") fetchApiLogs(1);
                                                else if (v === "overview") fetchApiAnalytics();
                                            }} className={`px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize ${apiSubView === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                                                {v === "overview" ? "Overview" : v === "logs" ? "Raw Logs" : "Per-User"}
                                            </button>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* ── Overview Sub-view ── */}
                            {apiSubView === "overview" && (
                                <div className="space-y-5">
                                    {apiLoading && !apiStats ? (
                                        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                                    ) : (
                                        <>
                                            {/* Stats Row */}
                                            <div className="grid gap-4 sm:grid-cols-4">
                                                {[
                                                    { label: "Total Calls", value: apiStats?.totalCalls?.toLocaleString() ?? "—", icon: Zap, color: "text-blue-400", sub: `${apiStats?.uniqueUsers ?? 0} unique users` },
                                                    { label: "Success Rate", value: apiStats ? `${apiStats.successRate.toFixed(1)}%` : "—", icon: CheckCircle2, color: "text-emerald-400", sub: `${apiStats?.successCalls ?? 0} success / ${apiStats?.errorCalls ?? 0} errors` },
                                                    { label: "Avg Response", value: apiStats ? `${apiStats.avgResponseTime.toLocaleString()}ms` : "—", icon: Clock, color: "text-amber-400", sub: `p95: ${apiStats?.p95ResponseTime?.toLocaleString() ?? "—"}ms` },
                                                    { label: "Total Tokens", value: apiStats?.totalTokens ? apiStats.totalTokens.toLocaleString() : "—", icon: TrendingUp, color: "text-purple-400", sub: "across all calls" },
                                                ].map(s => (
                                                    <Card key={s.label} className="border-border/50">
                                                        <CardContent className="pt-5">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <p className="text-2xl font-bold">{s.value}</p>
                                                                <s.icon className={`h-5 w-5 ${s.color}`} />
                                                            </div>
                                                            <p className="text-sm font-medium">{s.label}</p>
                                                            <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </div>

                                            {/* Time Series Chart */}
                                            {apiTimeSeries.length > 0 && (
                                                <Card className="border-border/50">
                                                    <CardHeader className="pb-2">
                                                        <CardTitle className="text-base flex items-center gap-2">
                                                            <TrendingUp className="h-4 w-4 text-primary" /> API Calls Over Time
                                                        </CardTitle>
                                                        <CardDescription className="text-xs">{apiGranularity === "day" ? "Daily" : apiGranularity === "week" ? "Weekly" : "Monthly"} breakdown</CardDescription>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <ResponsiveContainer width="100%" height={220}>
                                                            <LineChart data={apiTimeSeries} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                                                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                                                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} />
                                                                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                                                                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                                                                <Legend wrapperStyle={{ fontSize: 12 }} />
                                                                <Line type="monotone" dataKey="calls" name="Total" stroke="#3b82f6" strokeWidth={2} dot={false} />
                                                                <Line type="monotone" dataKey="successCalls" name="Success" stroke="#10b981" strokeWidth={2} dot={false} />
                                                                <Line type="monotone" dataKey="errorCalls" name="Errors" stroke="#ef4444" strokeWidth={2} dot={false} />
                                                            </LineChart>
                                                        </ResponsiveContainer>
                                                    </CardContent>
                                                </Card>
                                            )}

                                            {/* Model & User charts side by side */}
                                            <div className="grid gap-5 md:grid-cols-2">
                                                {/* Model Distribution */}
                                                {apiModelRows.length > 0 && (
                                                    <Card className="border-border/50">
                                                        <CardHeader className="pb-2">
                                                            <CardTitle className="text-base">Model Usage</CardTitle>
                                                            <CardDescription className="text-xs">Calls per model</CardDescription>
                                                        </CardHeader>
                                                        <CardContent>
                                                            <ResponsiveContainer width="100%" height={180}>
                                                                <BarChart data={apiModelRows} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }}>
                                                                    <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                                                                    <YAxis type="category" dataKey="model" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} width={100} />
                                                                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                                                                    <Bar dataKey="calls" name="Calls" radius={[0, 4, 4, 0]}>
                                                                        {apiModelRows.map((_, i) => (
                                                                            <Cell key={i} fill={["#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#ec4899", "#ef4444", "#f97316"][i % 7]} />
                                                                        ))}
                                                                    </Bar>
                                                                </BarChart>
                                                            </ResponsiveContainer>
                                                        </CardContent>
                                                    </Card>
                                                )}

                                                {/* Response Time Chart */}
                                                {apiTimeSeries.length > 0 && (
                                                    <Card className="border-border/50">
                                                        <CardHeader className="pb-2">
                                                            <CardTitle className="text-base">Avg Response Time</CardTitle>
                                                            <CardDescription className="text-xs">Milliseconds per period</CardDescription>
                                                        </CardHeader>
                                                        <CardContent>
                                                            <ResponsiveContainer width="100%" height={180}>
                                                                <BarChart data={apiTimeSeries} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                                                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                                                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} />
                                                                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} unit="ms" />
                                                                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v) => [`${v}ms`, "Avg"]} />
                                                                    <Bar dataKey="avgResponseTime" name="Avg (ms)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                                                </BarChart>
                                                            </ResponsiveContainer>
                                                        </CardContent>
                                                    </Card>
                                                )}
                                            </div>

                                            {/* Top Users Table */}
                                            {apiUserRows.length > 0 && (
                                                <Card className="border-border/50">
                                                    <CardHeader className="pb-3">
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <CardTitle className="text-base">Top Users by API Usage</CardTitle>
                                                                <CardDescription className="text-xs">Top 10 users by call volume</CardDescription>
                                                            </div>
                                                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={fetchApiAnalytics} disabled={apiLoading}>
                                                                <RefreshCw className={`h-3.5 w-3.5 ${apiLoading ? "animate-spin" : ""}`} />
                                                            </Button>
                                                        </div>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <div className="overflow-x-auto">
                                                            <table className="w-full text-sm">
                                                                <thead>
                                                                    <tr className="border-b border-border/50 text-left">
                                                                        <th className="pb-2 pr-4 text-xs font-medium text-muted-foreground">User</th>
                                                                        <th className="pb-2 pr-4 text-xs font-medium text-muted-foreground text-right">Calls</th>
                                                                        <th className="pb-2 pr-4 text-xs font-medium text-muted-foreground text-right">Success</th>
                                                                        <th className="pb-2 pr-4 text-xs font-medium text-muted-foreground text-right">Avg Time</th>
                                                                        <th className="pb-2 pr-4 text-xs font-medium text-muted-foreground text-right">Tokens</th>
                                                                        <th className="pb-2 text-xs font-medium text-muted-foreground">Plan</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {apiUserRows.map(u => (
                                                                        <tr key={u.userId} className="border-b border-border/20 hover:bg-muted/20">
                                                                            <td className="py-2 pr-4">
                                                                                <div className="font-medium text-xs">{u.userName ?? "—"}</div>
                                                                                <div className="text-[10px] text-muted-foreground">{u.userEmail ?? u.userId.slice(-8)}</div>
                                                                            </td>
                                                                            <td className="py-2 pr-4 text-right text-xs font-mono">{u.totalCalls.toLocaleString()}</td>
                                                                            <td className="py-2 pr-4 text-right">
                                                                                <span className={`text-xs font-medium ${u.successRate >= 90 ? "text-emerald-400" : u.successRate >= 70 ? "text-amber-400" : "text-red-400"}`}>
                                                                                    {u.successRate.toFixed(1)}%
                                                                                </span>
                                                                            </td>
                                                                            <td className="py-2 pr-4 text-right text-xs text-muted-foreground">{u.avgResponseTime.toLocaleString()}ms</td>
                                                                            <td className="py-2 pr-4 text-right text-xs text-muted-foreground">{u.totalTokens?.toLocaleString() ?? "—"}</td>
                                                                            <td className="py-2">
                                                                                <Badge variant="outline" className="text-[10px]">{u.subscriptionType ?? "free"}</Badge>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            )}

                                            {!apiStats && !apiLoading && (
                                                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                                                    <BarChart2 className="h-10 w-10 mb-3 opacity-30" />
                                                    <p className="text-sm">No API usage data yet.</p>
                                                    <p className="text-xs mt-1">Logs appear after the first Gemini API call from a desktop client.</p>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}

                            {/* ── Per-User Sub-view ── */}
                            {apiSubView === "users" && (
                                <Card className="border-border/50">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Per-User Breakdown</CardTitle>
                                                <CardDescription className="text-xs">All users sorted by call volume</CardDescription>
                                            </div>
                                            <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => fetchApiLogs(apiLogsPage)} disabled={apiLoading}>
                                                <RefreshCw className={`h-3.5 w-3.5 ${apiLoading ? "animate-spin" : ""}`} />
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        {apiLoading ? (
                                            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                                        ) : apiUserRows.length === 0 ? (
                                            <div className="py-10 text-center text-muted-foreground text-sm">No data matching current filters.</div>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="border-b border-border/50 text-left">
                                                            <th className="pb-2 pr-4 text-xs font-medium text-muted-foreground">User</th>
                                                            <th className="pb-2 pr-4 text-xs font-medium text-muted-foreground text-right">Total Calls</th>
                                                            <th className="pb-2 pr-4 text-xs font-medium text-muted-foreground text-right">Success</th>
                                                            <th className="pb-2 pr-4 text-xs font-medium text-muted-foreground text-right">Errors</th>
                                                            <th className="pb-2 pr-4 text-xs font-medium text-muted-foreground text-right">Avg Time</th>
                                                            <th className="pb-2 pr-4 text-xs font-medium text-muted-foreground text-right">Tokens</th>
                                                            <th className="pb-2 pr-4 text-xs font-medium text-muted-foreground">Plan</th>
                                                            <th className="pb-2 text-xs font-medium text-muted-foreground">Last Active</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {apiUserRows.map(u => (
                                                            <tr key={u.userId} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                                                                <td className="py-2.5 pr-4">
                                                                    <div className="font-medium text-xs">{u.userName ?? "—"}</div>
                                                                    <div className="text-[10px] text-muted-foreground">{u.userEmail ?? u.userId.slice(-8)}</div>
                                                                </td>
                                                                <td className="py-2.5 pr-4 text-right text-xs font-mono font-medium">{u.totalCalls.toLocaleString()}</td>
                                                                <td className="py-2.5 pr-4 text-right text-xs text-emerald-400">{u.successCalls.toLocaleString()}</td>
                                                                <td className="py-2.5 pr-4 text-right text-xs text-red-400">{u.errorCalls.toLocaleString()}</td>
                                                                <td className="py-2.5 pr-4 text-right text-xs text-muted-foreground">{u.avgResponseTime.toLocaleString()}ms</td>
                                                                <td className="py-2.5 pr-4 text-right text-xs text-muted-foreground">{u.totalTokens?.toLocaleString() ?? "—"}</td>
                                                                <td className="py-2.5 pr-4"><Badge variant="outline" className="text-[10px]">{u.subscriptionType ?? "free"}</Badge></td>
                                                                <td className="py-2.5 text-xs text-muted-foreground">{u.lastActivity ? new Date(u.lastActivity).toLocaleDateString() : "—"}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* ── Raw Logs Sub-view ── */}
                            {apiSubView === "logs" && (
                                <Card className="border-border/50">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Raw API Logs</CardTitle>
                                                <CardDescription className="text-xs">{apiLogsTotal.toLocaleString()} total entries</CardDescription>
                                            </div>
                                            <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => fetchApiLogs(1)} disabled={apiLoading}>
                                                <RefreshCw className={`h-3.5 w-3.5 ${apiLoading ? "animate-spin" : ""}`} />
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        {apiLoading ? (
                                            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                                        ) : apiLogs.length === 0 ? (
                                            <div className="py-10 text-center text-muted-foreground text-sm">No logs matching current filters.</div>
                                        ) : (
                                            <>
                                                <div className="space-y-1.5">
                                                    {apiLogs.map(log => (
                                                        <div key={log.id} className="flex items-start gap-3 rounded-lg border border-border/40 bg-muted/10 px-3 py-2.5 hover:bg-muted/20 transition-colors">
                                                            <div className="shrink-0 mt-0.5">
                                                                {log.status === "success" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
                                                                {log.status === "error" && <XCircle className="h-3.5 w-3.5 text-red-400" />}
                                                                {log.status === "aborted" && <AlertCircle className="h-3.5 w-3.5 text-amber-400" />}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <span className="text-xs font-medium truncate">{log.userEmail ?? log.userId.slice(-8)}</span>
                                                                    <Badge variant="outline" className="text-[10px] shrink-0">{log.model}</Badge>
                                                                    <Badge variant="outline" className="text-[10px] shrink-0 bg-primary/5">{log.featureType}</Badge>
                                                                    {log.subscriptionType && <Badge variant="secondary" className="text-[10px] shrink-0">{log.subscriptionType}</Badge>}
                                                                </div>
                                                                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                                                    <span className="text-[10px] text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</span>
                                                                    <span className="text-[10px] text-muted-foreground">{log.responseTime.toLocaleString()}ms</span>
                                                                    {log.tokenUsed && <span className="text-[10px] text-muted-foreground">{log.tokenUsed.toLocaleString()} tokens</span>}
                                                                    {log.errorMessage && <span className="text-[10px] text-red-400 truncate max-w-xs">{log.errorMessage}</span>}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                {/* Pagination */}
                                                {apiLogsPages > 1 && (
                                                    <div className="flex items-center justify-between mt-4">
                                                        <p className="text-xs text-muted-foreground">Page {apiLogsPage} of {apiLogsPages}</p>
                                                        <div className="flex gap-2">
                                                            <Button variant="outline" size="sm" disabled={apiLogsPage <= 1} onClick={() => { const p = apiLogsPage - 1; setApiLogsPage(p); fetchApiLogs(p); }}>
                                                                <ChevronLeft className="h-4 w-4" />
                                                            </Button>
                                                            <Button variant="outline" size="sm" disabled={apiLogsPage >= apiLogsPages} onClick={() => { const p = apiLogsPage + 1; setApiLogsPage(p); fetchApiLogs(p); }}>
                                                                <ChevronRight className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </TabsContent>

                </Tabs>
            </main>

            {/* Modals */}
            {editPlan && <PlanModal plan={editPlan === "new" ? null : editPlan} onClose={() => setEditPlan(null)} onSaved={fetchPlans} />}
            {editCampaign && <CampaignModal campaign={editCampaign === "new" ? null : editCampaign} onClose={() => setEditCampaign(null)} onSaved={fetchCampaigns} />}
            {showNotifModal && <NotificationModal onClose={() => setShowNotifModal(false)} onSent={() => fetchNotifications()} />}
            {viewNotifId && <NotificationDetailModal notifId={viewNotifId} onClose={() => setViewNotifId(null)} onRetry={() => fetchNotifications(notifPage)} />}
            {editNote && <ReleaseNoteModal note={editNote === "new" ? null : editNote} onClose={() => setEditNote(null)} onSaved={() => fetchReleaseNotes(notesPage)} />}
            {viewUserId && <UserDetailModal userId={viewUserId} onClose={() => setViewUserId(null)} onUpdated={() => fetchUsers(usersPage)} />}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
    const [authed, setAuthed] = useState<boolean | null>(null);

    useEffect(() => {
        fetch("/api/admin/auth")
            .then(r => setAuthed(r.ok))
            .catch(() => setAuthed(false));
    }, []);

    async function handleLogout() {
        await fetch("/api/admin/auth", { method: "DELETE" });
        setAuthed(false);
    }

    if (authed === null) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
    }

    return authed
        ? <Dashboard onLogout={handleLogout} />
        : <LoginForm onSuccess={() => setAuthed(true)} />;
}
