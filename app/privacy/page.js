// app/privacy/page.js
import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 32, fontWeight: 950, margin: 0 }}>Privacy Policy</h1>
      <p style={{ marginTop: 10, opacity: 0.8, fontWeight: 700 }}>
        Effective date: {new Date().toLocaleDateString()}
      </p>

      <div style={{ marginTop: 18, lineHeight: 1.7 }}>
        <h2 style={{ fontSize: 18, fontWeight: 950 }}>What we collect</h2>
        <ul style={{ marginTop: 8, paddingLeft: 18, opacity: 0.9 }}>
          <li>Account info (email, user ID)</li>
          <li>Billing info handled by Stripe (we do not store full card numbers)</li>
          <li>CRM data you enter (contacts, deals, notes, tasks)</li>
          <li>Basic analytics/logs for security and reliability</li>
        </ul>

        <h2 style={{ fontSize: 18, fontWeight: 950, marginTop: 18 }}>How we use it</h2>
        <ul style={{ marginTop: 8, paddingLeft: 18, opacity: 0.9 }}>
          <li>Provide and maintain the Service</li>
          <li>Secure accounts and prevent abuse</li>
          <li>Support and troubleshooting</li>
          <li>Improve product performance</li>
        </ul>

        <h2 style={{ fontSize: 18, fontWeight: 950, marginTop: 18 }}>Data sharing</h2>
        <p style={{ opacity: 0.9 }}>
          We share data only with service providers needed to run Vexta (e.g., Stripe for billing,
          Supabase for database/auth), and only as required.
        </p>

        <h2 style={{ fontSize: 18, fontWeight: 950, marginTop: 18 }}>Your choices</h2>
        <p style={{ opacity: 0.9 }}>
          You can request data export or deletion by contacting support. You can cancel billing from your
          Settings page via Stripe’s portal.
        </p>
      </div>

      <div style={{ marginTop: 24 }}>
        <Link href="/pricing" style={{ textDecoration: "underline", fontWeight: 800 }}>
          Back to Pricing
        </Link>
      </div>
    </div>
  );
}
