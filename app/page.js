// app/page.js
"use client";

import Link from "next/link";

export const metadata = {
  title: "Vexta CRM — Real Estate CRM",
  description:
    "Vexta CRM helps real estate agents manage contacts, deals, tasks, notes, and calendar events in one clean dashboard.",
};

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path
        d="M20 6L9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ✅ Server-safe logo (no handlers)
// Put your file at: /public/VLT.png
function LogoMark() {
  return <span className="logoMark" aria-hidden="true" />;
}

function FeatureCard({ title, desc }) {
  return (
    <div className="feature">
      <div className="featureTitle">{title}</div>
      <div className="featureDesc">{desc}</div>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="page">
      <div className="bg" />

      <header className="header">
        <div className="wrap headerInner">
          <Link href="/" className="brand" aria-label="Vexta home">
            <LogoMark />
            <span className="brandName">Vexta</span>
          </Link>

          <nav className="nav" aria-label="Primary navigation">
            <a href="#features">Features</a>
            <Link href="/pricing">Pricing</Link>
            <a href="#about">About</a>
          </nav>

          <div className="headerActions">
            <Link href="/login" className="btn btnGhost">
              Log in
            </Link>
            <Link href="/signup" className="btn btnPrimary">
              Sign up
            </Link>
          </div>
        </div>
      </header>

      <section className="wrap hero">
        <div className="heroLeft">
          <div className="pill">
            Built for real estate workflows <span className="dot" /> Fast. Clean. Linked.
          </div>

          <h1 className="h1">
            The CRM built for agents who want <span className="muted">simplicity</span>.
          </h1>

          <p className="p">
            Vexta keeps contacts, deals, tasks, notes, and calendar events connected — so you always
            know the next follow-up and what matters today.
          </p>

          <div className="cta">
            <Link href="/signup" className="btn btnPrimary btnLg">
              Sign up
            </Link>
            <Link href="/login" className="btn btnGhost btnLg">
              Log in
            </Link>
          </div>

          <div className="bullets" aria-label="Key benefits">
            <div className="bullet">
              <span className="check">
                <CheckIcon />
              </span>
              Contact profiles that act like a hub (deals/notes/tasks/events).
            </div>
            <div className="bullet">
              <span className="check">
                <CheckIcon />
              </span>
              Deal pages with task buckets + event visibility.
            </div>
            <div className="bullet">
              <span className="check">
                <CheckIcon />
              </span>
              Fast filters designed for daily execution.
            </div>
          </div>
        </div>

        <div className="heroRight" aria-label="Product preview">
          <div className="panel">
            <div className="panelTop">
              <div>
                <div className="kicker">Today</div>
                <div className="panelTitle">Dashboard snapshot</div>
              </div>
              <div className="badge">Pipeline • Tasks • Calendar</div>
            </div>

            <div className="cards">
              <div className="card">
                <div className="kicker">Next follow-up</div>
                <div className="cardTitle">Call: Buyer pre-approval</div>
                <div className="cardMeta">Linked to: John D • Deal: Bridgeview Ranch</div>
              </div>

              <div className="card">
                <div className="kicker">Deal stage</div>
                <div className="cardTitle">Under Contract</div>
                <div className="cardMeta">Tasks bucketed by stage • Events visible at a glance</div>
              </div>

              <div className="card">
                <div className="kicker">Upcoming</div>
                <div className="cardTitle">Inspection — 10:30 AM</div>
                <div className="cardMeta">Filter calendar by contact / active deal</div>
              </div>
            </div>

            <div className="miniStats">
              <div className="mini">
                <div className="miniTitle">Contacts</div>
                <div className="miniSub">linked</div>
              </div>
              <div className="mini">
                <div className="miniTitle">Deals</div>
                <div className="miniSub">tracked</div>
              </div>
              <div className="mini">
                <div className="miniTitle">Tasks</div>
                <div className="miniSub">actionable</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="section sectionAlt">
        <div className="wrap">
          <h2 className="h2">Features that match your workflow</h2>
          <p className="p2">Built around speed, linking records, and keeping the next action obvious.</p>

          <div className="grid3">
            <FeatureCard
              title="Contact Profile Hub"
              desc="Deals, notes, tasks, calendar events — in one place with smart filtering."
            />
            <FeatureCard
              title="Deal Pages that Pop"
              desc="Stats + task buckets + upcoming events so you can run the deal."
            />
            <FeatureCard
              title="Tasks & Calendar That Connect"
              desc="Filter by contact, link/unlink, and keep the day organized."
            />
            <FeatureCard
              title="Fast Filters"
              desc="Search + status + due date filters designed for daily use."
            />
            <FeatureCard
              title="Clean UI"
              desc="No bloat. Just the actions you use constantly, done well."
            />
            <FeatureCard
              title="Secure Foundation"
              desc="Supabase auth + dashboard protection + Google OAuth."
            />
          </div>
        </div>
      </section>

      {/* ✅ Pricing stays a separate page */}
      <section className="section">
        <div className="wrap">
          <h2 className="h2">Simple yearly pricing</h2>
          <p className="p2">
            One plan. Built for agents who want clarity, speed, and a CRM they’ll actually use.
          </p>

          <div className="pricingTeaser">
            <div className="pricingBox">
              <div className="pricingLabel">Yearly plan</div>
              <div className="pricingTitle">Everything you need to run your pipeline</div>
              <div className="pricingMeta">
                Contacts • Deals • Tasks • Notes • Calendar • Filters
              </div>
            </div>

            <div className="pricingActions">
              <Link href="/pricing" className="btn btnGhost btnLg">
                View pricing
              </Link>
              <Link href="/signup" className="btn btnPrimary btnLg">
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="section sectionAlt">
        <div className="wrap">
          <h2 className="h2">About Vexta</h2>
          <p className="p2">
            Vexta is built to be practical: help agents follow up faster, keep deals clean, and reduce chaos.
            The goal is simple — more action, more results, less clutter.
          </p>

          <div className="cta">
            <Link href="/signup" className="btn btnPrimary btnLg">
              Sign up
            </Link>
            <Link href="/login" className="btn btnGhost btnLg">
              Log in
            </Link>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="wrap footerInner">
          <div className="footerText">© {new Date().getFullYear()} Vexta CRM</div>
          <div className="footerLinks">
            <Link href="/pricing">Pricing</Link>
            <Link href="/login">Log in</Link>
            <Link href="/signup">Sign up</Link>
          </div>
        </div>
      </footer>

      <style jsx>{`
        .page {
          min-height: 100vh;
          color: #fff;
          background: #0a0a0a;
        }
        .bg {
          position: fixed;
          inset: 0;
          z-index: -1;
          background:
            radial-gradient(1100px circle at 20% 10%, rgba(255, 255, 255, 0.12), transparent 60%),
            radial-gradient(900px circle at 80% 30%, rgba(255, 255, 255, 0.10), transparent 55%),
            linear-gradient(to bottom, #0a0a0a, #000);
        }
        .wrap {
          width: 100%;
          max-width: 1120px;
          margin: 0 auto;
          padding: 0 18px;
        }

        .header {
          position: sticky;
          top: 0;
          z-index: 50;
          border-bottom: 1px solid rgba(255, 255, 255, 0.10);
          background: rgba(10, 10, 10, 0.75);
          backdrop-filter: blur(10px);
        }
        .headerInner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 0;
          gap: 12px;
        }
        .brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: #fff;
        }

        /* ✅ Your logo */
        .logoMark {
          width: 36px;
          height: 36px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background-color: rgba(255, 255, 255, 0.06);
          background-image: url("/VLT.png");
          background-repeat: no-repeat;
          background-position: center;
          background-size: contain;
        }

        .brandName {
          font-size: 18px;
          font-weight: 800;
          letter-spacing: -0.4px;
        }

        .nav {
          display: none;
          gap: 18px;
          align-items: center;
        }
        .nav :global(a) {
          color: rgba(255, 255, 255, 0.75);
          text-decoration: none;
          font-size: 14px;
          font-weight: 650;
        }
        .nav :global(a:hover) {
          color: #fff;
        }

        .headerActions {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .hero {
          padding: 56px 0 22px;
          display: grid;
          gap: 24px;
        }
        .heroLeft {
          max-width: 620px;
        }
        .pill {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.06);
          font-size: 12px;
          font-weight: 750;
          color: rgba(255, 255, 255, 0.85);
        }
        .dot {
          width: 4px;
          height: 4px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.45);
        }
        .h1 {
          margin: 16px 0 0;
          font-size: 40px;
          line-height: 1.05;
          letter-spacing: -1.1px;
          font-weight: 900;
        }
        .muted {
          color: rgba(255, 255, 255, 0.70);
        }
        .p {
          margin: 14px 0 0;
          font-size: 16px;
          line-height: 1.55;
          color: rgba(255, 255, 255, 0.72);
          max-width: 560px;
        }
        .cta {
          margin-top: 18px;
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .bullets {
          margin-top: 18px;
          display: grid;
          gap: 10px;
          color: rgba(255, 255, 255, 0.75);
          font-size: 14px;
        }
        .bullet {
          display: flex;
          gap: 10px;
          align-items: flex-start;
        }
        .check {
          color: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.06);
          flex: 0 0 auto;
        }

        .heroRight {
          width: 100%;
        }
        .panel {
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.10);
          background: rgba(255, 255, 255, 0.06);
          box-shadow: 0 30px 120px rgba(0,0,0,0.55);
          padding: 16px;
        }
        .panelTop {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }
        .kicker {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.60);
        }
        .panelTitle {
          font-size: 18px;
          font-weight: 850;
          letter-spacing: -0.4px;
          margin-top: 4px;
        }
        .badge {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.70);
          border: 1px solid rgba(255, 255, 255, 0.10);
          background: rgba(0, 0, 0, 0.25);
          padding: 6px 10px;
          border-radius: 999px;
          white-space: nowrap;
        }
        .cards {
          margin-top: 14px;
          display: grid;
          gap: 10px;
        }
        .card {
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.10);
          background: rgba(0, 0, 0, 0.25);
          padding: 12px;
        }
        .cardTitle {
          margin-top: 6px;
          font-weight: 850;
          letter-spacing: -0.2px;
        }
        .cardMeta {
          margin-top: 6px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.60);
          line-height: 1.4;
        }

        .miniStats {
          margin-top: 12px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          text-align: center;
        }
        .mini {
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.10);
          background: rgba(0, 0, 0, 0.25);
          padding: 10px;
        }
        .miniTitle {
          font-weight: 850;
          color: #fff;
        }
        .miniSub {
          margin-top: 4px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.60);
        }

        .section {
          padding: 56px 0;
          border-top: 1px solid rgba(255, 255, 255, 0.10);
        }
        .sectionAlt {
          background: rgba(0, 0, 0, 0.15);
        }
        .h2 {
          margin: 0;
          font-size: 28px;
          font-weight: 900;
          letter-spacing: -0.6px;
        }
        .p2 {
          margin: 10px 0 0;
          color: rgba(255, 255, 255, 0.72);
          max-width: 720px;
          line-height: 1.55;
        }

        .grid3 {
          margin-top: 22px;
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }
        .feature {
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.10);
          background: rgba(255, 255, 255, 0.06);
          padding: 16px;
        }
        .featureTitle {
          font-weight: 900;
          letter-spacing: -0.3px;
        }
        .featureDesc {
          margin-top: 8px;
          color: rgba(255, 255, 255, 0.70);
          line-height: 1.5;
          font-size: 14px;
        }

        .pricingTeaser {
          margin-top: 18px;
          display: grid;
          gap: 14px;
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.10);
          background: rgba(255, 255, 255, 0.06);
          padding: 16px;
        }
        .pricingBox {
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.10);
          background: rgba(0, 0, 0, 0.25);
          padding: 14px;
        }
        .pricingLabel {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.60);
        }
        .pricingTitle {
          margin-top: 6px;
          font-weight: 900;
          letter-spacing: -0.2px;
        }
        .pricingMeta {
          margin-top: 6px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.60);
          line-height: 1.4;
        }
        .pricingActions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: flex-start;
        }

        .footer {
          border-top: 1px solid rgba(255, 255, 255, 0.10);
          padding: 28px 0;
        }
        .footerInner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
        .footerText {
          color: rgba(255, 255, 255, 0.60);
          font-size: 13px;
        }
        .footerLinks {
          display: flex;
          gap: 14px;
          font-size: 13px;
        }
        .footerLinks :global(a) {
          color: rgba(255, 255, 255, 0.60);
          text-decoration: none;
          font-weight: 750;
        }
        .footerLinks :global(a:hover) {
          color: #fff;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: 12px;
          font-weight: 850;
          font-size: 14px;
          text-decoration: none;
          cursor: pointer;
          transition: transform 0.05s ease, background 0.15s ease, border-color 0.15s ease;
          user-select: none;
        }
        .btn:active {
          transform: translateY(1px);
        }
        .btnLg {
          padding: 12px 16px;
        }
        .btnPrimary {
          background: #fff;
          color: #0a0a0a;
          border: 1px solid rgba(255, 255, 255, 0.14);
        }
        .btnPrimary:hover {
          background: rgba(255, 255, 255, 0.92);
        }
        .btnGhost {
          background: rgba(255, 255, 255, 0.06);
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.14);
        }
        .btnGhost:hover {
          background: rgba(255, 255, 255, 0.10);
        }

        @media (min-width: 860px) {
          .nav {
            display: flex;
          }
          .hero {
            grid-template-columns: 1.1fr 0.9fr;
            align-items: center;
            padding: 72px 0 28px;
          }
          .h1 {
            font-size: 52px;
          }
          .grid3 {
            grid-template-columns: repeat(3, 1fr);
          }
          .pricingTeaser {
            grid-template-columns: 1.3fr 0.7fr;
            align-items: center;
          }
          .pricingActions {
            justify-content: flex-end;
          }
        }
      `}</style>
    </main>
  );
}
