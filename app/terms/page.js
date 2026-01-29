// app/terms/page.js
import Link from "next/link";

export default function TermsPage() {
  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 32, fontWeight: 950, margin: 0 }}>Terms of Service</h1>
      <p style={{ marginTop: 10, opacity: 0.8, fontWeight: 700 }}>
        Effective date: {new Date().toLocaleDateString()}
      </p>

      <div style={{ marginTop: 18, lineHeight: 1.7 }}>
        <h2 style={{ fontSize: 18, fontWeight: 950 }}>1) Agreement</h2>
        <p style={{ opacity: 0.9 }}>
          By accessing or using Vexta (“Service”), you agree to these Terms. If you do not agree, do
          not use the Service.
        </p>

        <h2 style={{ fontSize: 18, fontWeight: 950, marginTop: 18 }}>2) Accounts</h2>
        <p style={{ opacity: 0.9 }}>
          You’re responsible for activity on your account and for keeping your login credentials secure.
        </p>

        <h2 style={{ fontSize: 18, fontWeight: 950, marginTop: 18 }}>3) Subscriptions & Billing</h2>
        <p style={{ opacity: 0.9 }}>
          Paid plans renew automatically unless canceled. Billing is handled through Stripe. You can
          manage or cancel your plan from your Settings → Manage Billing.
        </p>

        <h2 style={{ fontSize: 18, fontWeight: 950, marginTop: 18 }}>4) Acceptable Use</h2>
        <p style={{ opacity: 0.9 }}>
          Do not misuse the Service, attempt to access data you don’t have permission to access, or
          disrupt the Service.
        </p>

        <h2 style={{ fontSize: 18, fontWeight: 950, marginTop: 18 }}>5) Data</h2>
        <p style={{ opacity: 0.9 }}>
          You retain ownership of your data. You grant us permission to process it only to provide and
          improve the Service.
        </p>

        <h2 style={{ fontSize: 18, fontWeight: 950, marginTop: 18 }}>6) Disclaimer</h2>
        <p style={{ opacity: 0.9 }}>
          The Service is provided “as is” without warranties of any kind, to the maximum extent permitted
          by law.
        </p>

        <h2 style={{ fontSize: 18, fontWeight: 950, marginTop: 18 }}>7) Contact</h2>
        <p style={{ opacity: 0.9 }}>
          For questions about these Terms, contact us via the Contact page.
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
