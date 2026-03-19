import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — pgStudio",
  description: "Privacy Policy for pgStudio. How we collect, use, and protect your data.",
};

const LAST_UPDATED = "2025-03-19";

export default function PrivacyPolicyPage() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="text-zinc-500 text-xs mt-1">Last updated: {LAST_UPDATED}</p>

      <p>
        pgStudio (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates the pgStudio web application and related services. This Privacy Policy describes how we collect, use, store, and protect your information when you use our services.
      </p>

      <h2>1. Information We Collect</h2>
      <p>
        We collect information you provide directly and information generated through your use of our services.
      </p>
      <h3>Account and profile data</h3>
      <ul>
        <li>Email address, name, and password (or credentials from a third-party sign-in provider)</li>
        <li>Profile information you choose to provide</li>
      </ul>
      <h3>Payment and billing data</h3>
      <p>
        Payment and subscription data are processed by Stripe. We do not store your full payment card details. We may store billing-related identifiers (e.g. Stripe customer ID, subscription status) to provide and manage your subscription.
      </p>
      <h3>Bug reports and support</h3>
      <p>
        If you submit a bug report or contact support, we collect the information you provide (e.g. email, name, description). This is used to respond and improve our services.
      </p>
      <h3>Usage and technical data</h3>
      <p>
        We may collect technical information such as IP address, browser type, device information, and logs of your use of the web application (e.g. pages visited, actions taken) to operate, secure, and improve our services.
      </p>

      <h2>2. How We Use Your Information</h2>
      <p>
        We use the information we collect to: provide, maintain, and improve our services; process transactions and manage subscriptions; authenticate you and manage your account; respond to support requests; send service-related communications; detect and prevent fraud or abuse; and comply with legal obligations.
      </p>

      <h2>3. Cookies and Similar Technologies</h2>
      <p>
        We use cookies and similar technologies for essential functions (e.g. authentication, session management, security). We may use additional cookies or analytics for improving our services; where required by law, we will obtain your consent for non-essential cookies.
      </p>

      <h2>4. Data Sharing and Disclosure</h2>
      <p>
        We may share your information with: service providers who assist us (e.g. Stripe for payments, hosting providers, email delivery); legal or regulatory authorities when required by law; and in connection with a merger, sale, or other transfer of assets, with appropriate notice. We do not sell your personal information.
      </p>

      <h2>5. Data Retention</h2>
      <p>
        We retain your data for as long as your account is active or as needed to provide services, comply with legal obligations, resolve disputes, and enforce our agreements. You may request deletion of your account and associated data; we will process such requests subject to legal and operational requirements.
      </p>

      <h2>6. Your Rights</h2>
      <p>
        Depending on your location, you may have the right to: access your personal data; correct inaccurate data; request deletion; request portability; object to or restrict certain processing; and withdraw consent where processing is consent-based. To exercise these rights, contact us at support@pgstudio.app. You may also have the right to lodge a complaint with a supervisory authority.
      </p>

      <h2>7. Security</h2>
      <p>
        We implement appropriate technical and organizational measures to protect your data against unauthorized access, alteration, disclosure, or destruction. No method of transmission or storage is completely secure; we cannot guarantee absolute security.
      </p>

      <h2>8. Children</h2>
      <p>
        Our services are not directed to individuals under the age of 16. We do not knowingly collect personal information from children. If you believe we have collected such information, please contact us so we can delete it.
      </p>

      <h2>9. International Transfers</h2>
      <p>
        Your information may be processed in countries other than your own. We take steps to ensure that such transfers are subject to appropriate safeguards where required by applicable law.
      </p>

      <h2>10. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. We will post the updated policy on this page and update the &quot;Last updated&quot; date. Material changes may be communicated via email or a notice in our services. Continued use after changes constitutes acceptance of the updated policy.
      </p>

      <h2>11. Contact Us</h2>
      <p>
        For questions about this Privacy Policy or our data practices, contact us at{" "}
        <a href="mailto:support@pgstudio.app" className="text-white hover:underline">
          support@pgstudio.app
        </a>
        .
      </p>
    </>
  );
}
