import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Support — pgStudio",
    description:
        "Reach the pgStudio team for billing, technical issues, account help, or product questions. We typically respond within one business day.",
};

export default function SupportLayout({ children }: { children: React.ReactNode }) {
    return children;
}
