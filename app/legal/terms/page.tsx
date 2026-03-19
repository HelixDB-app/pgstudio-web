import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — pgStudio",
  description: "Terms of Service for pgStudio. Rules and conditions for using our services.",
};

const LAST_UPDATED = "2025-03-19";

export default function TermsOfServicePage() {
  return (
    <>
      <h1>Terms of Service</h1>
      <p className="text-zinc-500 text-xs mt-1">Last updated: {LAST_UPDATED}</p>

      <p>
        These Terms of Service (&quot;Terms&quot;) govern your access to and use of pgStudio&apos;s web application, desktop software, and related services (&quot;Services&quot;). By using our Services, you agree to these Terms. If you do not agree, do not use our Services.
      </p>

      <h2>1. Definitions</h2>
      <p>
        &quot;pgStudio,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot; refers to the entity offering the Services. &quot;You&quot; or &quot;your&quot; refers to the individual or entity using the Services. &quot;Content&quot; means any data, text, or materials you submit or that are processed through the Services.
      </p>

      <h2>2. Account Registration and Responsibilities</h2>
      <p>
        You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your credentials and for all activity under your account. You must notify us promptly of any unauthorized use. You must be at least 16 years old (or the age of majority in your jurisdiction) to use the Services.
      </p>

      <h2>3. Acceptable Use</h2>
      <p>
        You agree not to: use the Services for any illegal purpose or in violation of any applicable laws; attempt to gain unauthorized access to our systems, other accounts, or third-party systems; interfere with or disrupt the integrity or performance of the Services; use the Services to transmit malware, spam, or harmful content; resell or sublicense the Services without our written permission; or use the Services in a way that infringes the rights of others. We may suspend or terminate your access if we reasonably believe you have violated these Terms.
      </p>

      <h2>4. Subscription, Billing, and Trials</h2>
      <p>
        Some parts of the Services are provided on a subscription basis. Subscription fees, billing cycles, and trial terms are described on our pricing page and at the time of sign-up. Payment processing is handled by Stripe; by subscribing, you agree to Stripe&apos;s terms and our billing practices. We may change pricing with reasonable notice; continued use after a price change constitutes acceptance. Refunds are handled in accordance with our refund policy as stated at the time of purchase or on our website; otherwise, fees are generally non-refundable except where required by law.
      </p>

      <h2>5. Cancellation</h2>
      <p>
        You may cancel your subscription at any time through your account settings or the Stripe customer portal. Cancellation will take effect at the end of the current billing period. We may suspend or terminate your account for non-payment or breach of these Terms.
      </p>

      <h2>6. Intellectual Property</h2>
      <p>
        We own or license all rights in the Services, including software, design, and branding. We grant you a limited, non-exclusive, non-transferable license to use the Services in accordance with these Terms. You retain ownership of your Content; you grant us a license to use, store, and process your Content as necessary to provide and improve the Services.
      </p>

      <h2>7. Disclaimer of Warranties</h2>
      <p>
        THE SERVICES ARE PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICES WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.
      </p>

      <h2>8. Limitation of Liability</h2>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, PGSTUDIO AND ITS AFFILIATES, OFFICERS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, OR GOODWILL, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICES. OUR TOTAL LIABILITY FOR ANY CLAIMS ARISING FROM OR RELATED TO THESE TERMS OR THE SERVICES SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM (OR ONE HUNDRED U.S. DOLLARS IF GREATER).
      </p>

      <h2>9. Indemnification</h2>
      <p>
        You agree to indemnify, defend, and hold harmless pgStudio and its affiliates and their respective officers, directors, employees, and agents from and against any claims, damages, losses, liabilities, and expenses (including reasonable attorneys&apos; fees) arising from your use of the Services, your Content, or your violation of these Terms or any law.
      </p>

      <h2>10. Termination</h2>
      <p>
        We may terminate or suspend your access to the Services at any time for breach of these Terms or for any other reason with notice where practicable. Upon termination, your right to use the Services ceases. Provisions that by their nature should survive (including intellectual property, disclaimer, limitation of liability, indemnification, and governing law) will survive termination.
      </p>

      <h2>11. Governing Law and Disputes</h2>
      <p>
        These Terms are governed by the laws of [Jurisdiction], without regard to conflict of law principles. Any dispute arising from these Terms or the Services shall be resolved in the courts of [Jurisdiction], and you consent to personal jurisdiction there. [If you use arbitration: Any dispute shall be resolved by binding arbitration in accordance with [rules], except for claims for injunctive relief.]
      </p>

      <h2>12. Changes to the Terms</h2>
      <p>
        We may modify these Terms from time to time. We will post the updated Terms on this page and update the &quot;Last updated&quot; date. Material changes may be communicated via email or a notice in our Services. Continued use after changes constitutes acceptance. If you do not agree to the new Terms, you must stop using the Services.
      </p>

      <h2>13. General</h2>
      <p>
        These Terms constitute the entire agreement between you and pgStudio regarding the Services. If any provision is held invalid, the remaining provisions remain in effect. Our failure to enforce any right does not waive that right. You may not assign these Terms without our consent; we may assign them in connection with a merger or sale of assets.
      </p>

      <h2>14. Contact</h2>
      <p>
        For questions about these Terms, contact us at{" "}
        <a href="mailto:support@pgstudio.app" className="text-white hover:underline">
          support@pgstudio.app
        </a>
        .
      </p>
    </>
  );
}
