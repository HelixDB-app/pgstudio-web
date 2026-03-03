"use client";

import Link from "next/link";
import { XCircle, RefreshCw, Mail, ArrowLeft, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function PaymentFailedPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-16">
            {/* Nav Logo */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                    <Database className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="font-bold text-sm tracking-tight">pgStudio</span>
            </div>

            <div className="w-full max-w-md space-y-6">
                {/* Icon */}
                <div className="text-center">
                    <div className="inline-flex h-20 w-20 items-center justify-center rounded-full border border-destructive/30 bg-destructive/10 mb-4">
                        <XCircle className="h-10 w-10 text-destructive" />
                    </div>
                    <h1 className="text-2xl font-bold mb-2">Payment Failed</h1>
                    <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                        Your payment could not be processed. You have not been charged.
                    </p>
                </div>

                {/* Reasons card */}
                <Card className="border-border/50">
                    <CardContent className="pt-5">
                        <p className="text-sm font-medium mb-3">Common reasons for failure:</p>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            {[
                                "Insufficient funds or card limit reached",
                                "Card declined by your bank",
                                "Incorrect card details entered",
                                "Card not authorized for online payments",
                                "Payment session expired — please try again",
                            ].map((reason) => (
                                <li key={reason} className="flex items-start gap-2">
                                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-muted-foreground/50 shrink-0" />
                                    {reason}
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>

                {/* Actions */}
                <div className="space-y-2">
                    <Button className="w-full gap-2" asChild>
                        <Link href="/pricing">
                            <RefreshCw className="h-4 w-4" />
                            Try Again
                        </Link>
                    </Button>
                    <Button variant="outline" className="w-full gap-2" asChild>
                        <a href="mailto:support@pgstudio.app">
                            <Mail className="h-4 w-4" />
                            Contact Support
                        </a>
                    </Button>
                    <Button variant="ghost" className="w-full text-muted-foreground" asChild>
                        <Link href="/">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Home
                        </Link>
                    </Button>
                </div>

                <p className="text-center text-xs text-muted-foreground/60">
                    Need help?{" "}
                    <a href="mailto:support@pgstudio.app" className="text-primary hover:underline">
                        support@pgstudio.app
                    </a>
                </p>
            </div>
        </div>
    );
}
