"use client";

// app/page.js
import Link from "next/link";

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

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path
        d="M12 2l1.6 5.4L19 9l-5.4 1.6L12 16l-1.6-5.4L5 9l5.4-1.6L12 2Z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path
        d="M12 3l9 5-9 5-9-5 9-5Z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path d="M3 12l9 5 9-5" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M3 16l9 5 9-5" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path
        d="M12 22a10 10 0 1 0-10-10 10 10 0 0 0 10 10Z"
        stroke="currentColor"
        strokeWidth="2.2"
      />
      <path
        d="M12 6v6l4 2"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LogoMark() {
  return <span className="logoMark" aria-hidden="true" />;
}

function Chip({ icon, text }) {
  return (
    <div className="chip">
      <span className="chipIcon" aria-hidden="true">
        {icon}
      </span>
      <span className="chipText">{text}</span>
    </div>
  );
}

function Feature({ title, desc, icon }) {
  return (
    <div className="feature">
      <div className="featureTop">
        <div className="iconPill" aria-hidden="true">
          {icon}
        </div>
        <div className="featureTitle">{title}</div>
      </div>
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
            <a className="navLink" href="#features">
              Features
            </a>
            <Link className="navLink" href="/pricing">
              Pricing
            </Link>
            {/* ✅ Make About "official" */}
            <Link className="navLink" href="/about">
              About
            </Link>
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

      {/* HERO */}
      <section className="wrap hero">
        <div className="heroLeft">
          <div className="heroPill">
            <span className="heroPillDot" aria-hidden="true" />
            Built for real estate workflows
          </div>

          <h1 className="h1">
            Your CRM that keeps you <span className="muted">moving</span>.
          </h1>

          <p className="subhead">
            Contacts, deals, tasks, notes, and calendar events — all linked together so the next
            action is always obvious.
          </p>

          <div className="ctaRow">
            <Link href="/signup" className="btn btnPrimary btnLg">
              Sign up
            </Link>
            <Link href="/login" className="btn btnGhost btnLg">
              Log in
            </Link>
          </div>

          <div className="heroMeta">
            <div className="heroChecks">
              <div className="heroCheck">
                <span className="checkBadge" aria-hidden="true">
                  <CheckIcon />
                </span>
                One timeline per contact — everything connected
              </div>
              <div className="heroCheck">
                <span className="checkBadge" aria-hidden="true">
                  <CheckIcon />
                </span>
                Track deals and follow-ups without the clutter
              </div>
              <div className="heroCheck">
                <span className="checkBadge" aria-hidden="true">
                  <CheckIcon />
                </span>
                Designed for daily execution, not admin work
              </div>
            </div>

            <div className="chips">
              <Chip icon={<ClockIcon />} text="Fast daily workflow" />
              <Chip icon={<LayersIcon />} text="Everything linked" />
              <Chip icon={<SparkIcon />} text="Clean UI" />
            </div>
          </div>
        </div>

        {/* PREVIEW */}
        <div className="heroRight" aria-label="Product preview">
          <div className="preview">
            <div className="previewTop">
              <div className="dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <div className="previewTitle">Vexta — Dashboard</div>
              <div className="previewBadge">Today</div>
            </div>

            <div className="previewBody">
              <div className="previewGrid">
                <div className="side">
                  <div className="sideItem sideActive">Dashboard</div>
                  <div className="sideItem">Contacts</div>
                  <div className="sideItem">Deals</div>
                  <div className="sideItem">Tasks</div>
                  <div className="sideItem">Calendar</div>
                </div>

                <div className="main">
                  <div className="kpis">
                    <div className="kpi">
                      <div className="kpiLabel">Contacts</div>
                      <div className="kpiValue">128</div>
                    </div>
                    <div className="kpi">
                      <div className="kpiLabel">Active Deals</div>
                      <div className="kpiValue">12</div>
                    </div>
                    <div className="kpi">
                      <div className="kpiLabel">Tasks Today</div>
                      <div className="kpiValue">7</div>
                    </div>
                  </div>

                  <div className="rows">
                    <div className="row">
                      <div className="rowTitle">Next follow-up</div>
                      <div className="rowMain">Call: Buyer pre-approval</div>
                      <div className="rowMeta">Linked to: Contact • Deal</div>
                    </div>
                    <div className="row">
                      <div className="rowTitle">Deal stage</div>
                      <div className="rowMain">Under Contract</div>
                      <div className="rowMeta">Tasks bucketed • Events visible</div>
                    </div>
                    <div className="row">
                      <div className="rowTitle">Upcoming</div>
                      <div className="rowMain">Inspection — 10:30 AM</div>
                      <div className="rowMeta">Filter calendar by contact</div>
                    </div>
                  </div>

                  <div className="hint">Built to keep the next action obvious — all day, every day.</div>
                </div>
              </div>
            </div>

            <div className="previewGlow" aria-hidden="true" />
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="section sectionAlt">
        <div className="wrap">
          <h2 className="h2">Features that match your workflow</h2>
          <p className="p2">Speed, linking, and clarity — without the bloat.</p>

          <div className="grid3">
            <Feature
              icon={<LayersIcon />}
              title="Contact Profile Hub"
              desc="Deals, notes, tasks, calendar events — in one place with smart filtering."
            />
            <Feature icon={<SparkIcon />} title="Deal Pages that Pop" desc="Stats + task buckets + upcoming events so you can run the deal." />
            <Feature icon={<ClockIcon />} title="Tasks & Calendar That Connect" desc="Filter by contact, link/unlink, and keep the day organized." />
            <Feature icon={<SparkIcon />} title="Fast Filters" desc="Search + status + due date filters designed for daily use." />
            <Feature icon={<LayersIcon />} title="Clean UI" desc="No clutter. Just what you use constantly, done well." />
            <Feature icon={<ClockIcon />} title="Secure Foundation" desc="Supabase auth + dashboard protection + Google OAuth." />
          </div>
        </div>
      </section>

      {/* PRICING TEASER */}
      <section className="section">
        <div className="wrap">
          <h2 className="h2">Simple yearly pricing</h2>
          <p className="p2">One plan for agents who want clarity, speed, and a CRM they’ll actually use.</p>

          <div className="pricingTeaser">
            <div className="pricingBox">
              <div className="pricingLabel">Yearly plan</div>
              <div className="pricingTitle">Everything you need to run your pipeline</div>
              <div className="pricingMeta">Contacts • Deals • Tasks • Notes • Calendar • Filters</div>
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

      {/* ABOUT TEASER (keep short + point to /about) */}
      <section className="section sectionAlt">
        <div className="wrap">
          <h2 className="h2">About Vexta</h2>
          <p className="p2">
            Vexta is built to be practical: help agents follow up faster, keep deals clean, and reduce
            chaos. More action, more results, less clutter.
          </p>

          <div className="ctaRow">
            <Link href="/about" className="btn btnGhost btnLg">
              Read the full story
            </Link>
            <Link href="/signup" className="btn btnPrimary btnLg">
              Sign up
            </Link>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="wrap footerInner">
          <div className="footerText">© {new Date().getFullYear()} Vexta CRM</div>
          <div className="footerLinks">
            <Link href="/pricing">Pricing</Link>
            <Link href="/about">About</Link>
            <Link href="/login">Log in</Link>
            <Link href="/signup">Sign up</Link>
          </div>
        </div>
      </footer>

      <style jsx>{`
        /* Base */
        .page {
          min-height: 100vh;
          color: #fff;
          background: #070707;
        }
        .bg {
          position: fixed;
          inset: 0;
          z-index: -1;
          background:
            radial-gradient(1200px circle at 18% 10%, rgba(255, 255, 255, 0.14), transparent 62%),
            radial-gradient(900px circle at 82% 24%, rgba(138, 180, 255, 0.10), transparent 55%),
            radial-gradient(800px circle at 50% 90%, rgba(255, 255, 255, 0.06), transparent 60%),
            linear-gradient(to bottom, #070707, #000);
        }
        .wrap {
          width: 100%;
          max-width: 1120px;
          margin: 0 auto;
          padding: 0 18px;
        }

        /* Header */
        .header {
          position: sticky;
          top: 0;
          z-index: 50;
          border-bottom: 1px solid rgba(255, 255, 255, 0.10);
          background: rgba(7, 7, 7, 0.75);
          backdrop-filter: blur(12px);
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
          box-shadow: 0 10px 30px rgba(0,0,0,0.4);
        }
        .brandName {
          font-size: 18px;
          font-weight: 950;
          letter-spacing: -0.4px;
        }
        .nav {
          display: none;
          gap: 18px;
          align-items: center;
        }
        .navLink {
          color: rgba(255, 255, 255, 0.75);
          text-decoration: none;
          font-size: 14px;
          font-weight: 750;
          position: relative;
        }
        .navLink:hover {
          color: #fff;
        }
        .navLink::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          bottom: -10px;
          height: 1px;
          background: rgba(255, 255, 255, 0.20);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.18s ease;
        }
        .navLink:hover::after {
          transform: scaleX(1);
        }
        .headerActions {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        /* Buttons */
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: 14px;
          font-weight: 900;
          font-size: 14px;
          text-decoration: none;
          cursor: pointer;
          transition: transform 0.06s ease, background 0.15s ease, border-color 0.15s ease;
          user-select: none;
          border: 1px solid rgba(255, 255, 255, 0.14);
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
        }
        .btnPrimary:hover {
          background: rgba(255, 255, 255, 0.92);
        }
        .btnGhost {
          background: rgba(255, 255, 255, 0.06);
          color: #fff;
        }
        .btnGhost:hover {
          background: rgba(255, 255, 255, 0.10);
        }

        /* Hero */
        .hero {
          padding: 72px 0 26px;
          display: grid;
          gap: 26px;
        }
        .heroLeft {
          max-width: 640px;
        }
        .heroPill {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.06);
          font-size: 12px;
          font-weight: 850;
          color: rgba(255, 255, 255, 0.86);
        }
        .heroPillDot {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: rgba(138, 180, 255, 0.95);
          box-shadow: 0 0 0 4px rgba(138, 180, 255, 0.12);
        }
        .h1 {
          margin: 16px 0 0;
          font-size: 44px;
          line-height: 1.04;
          letter-spacing: -1.2px;
          font-weight: 980;
        }
        .muted {
          color: rgba(255, 255, 255, 0.70);
        }
        .subhead {
          margin: 14px 0 0;
          font-size: 16px;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.74);
          max-width: 580px;
        }
        .ctaRow {
          margin-top: 18px;
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .heroMeta {
          margin-top: 18px;
          display: grid;
          gap: 14px;
        }
        .heroChecks {
          display: grid;
          gap: 10px;
          color: rgba(255, 255, 255, 0.78);
          font-size: 14px;
        }
        .heroCheck {
          display: flex;
          gap: 10px;
          align-items: flex-start;
        }
        .checkBadge {
          display: inline-flex;
          width: 22px;
          height: 22px;
          border-radius: 10px;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.06);
          flex: 0 0 auto;
        }
        .chips {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(0, 0, 0, 0.22);
          color: rgba(255, 255, 255, 0.74);
          font-size: 12px;
          font-weight: 800;
        }
        .chipIcon {
          color: rgba(138, 180, 255, 0.95);
          display: inline-flex;
        }

        /* Preview */
        .preview {
          position: relative;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.06);
          box-shadow: 0 40px 140px rgba(0,0,0,0.60);
          overflow: hidden;
        }
        .previewGlow {
          position: absolute;
          inset: -120px -120px auto auto;
          width: 260px;
          height: 260px;
          background: radial-gradient(circle, rgba(138,180,255,0.22), transparent 65%);
          pointer-events: none;
          filter: blur(1px);
        }
        .previewTop {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.10);
          background: rgba(0, 0, 0, 0.25);
        }
        .dots {
          display: inline-flex;
          gap: 6px;
        }
        .dots span {
          width: 9px;
          height: 9px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.18);
        }
        .previewTitle {
          font-size: 13px;
          font-weight: 850;
          color: rgba(255, 255, 255, 0.78);
          letter-spacing: -0.2px;
        }
        .previewBadge {
          margin-left: auto;
          font-size: 12px;
          font-weight: 850;
          color: rgba(255, 255, 255, 0.72);
          border: 1px solid rgba(255, 255, 255, 0.10);
          background: rgba(255, 255, 255, 0.06);
          padding: 6px 10px;
          border-radius: 999px;
        }
        .previewBody {
          padding: 14px;
        }
        .previewGrid {
          display: grid;
          grid-template-columns: 0.38fr 0.62fr;
          gap: 12px;
        }
        .side {
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.10);
          background: rgba(0, 0, 0, 0.22);
          padding: 12px;
        }
        .sideItem {
          padding: 10px 10px;
          border-radius: 12px;
          color: rgba(255, 255, 255, 0.70);
          font-weight: 850;
          font-size: 13px;
        }
        .sideActive {
          background: rgba(138, 180, 255, 0.14);
          border: 1px solid rgba(138, 180, 255, 0.22);
          color: rgba(255, 255, 255, 0.92);
        }
        .main {
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.10);
          background: rgba(0, 0, 0, 0.22);
          padding: 12px;
        }
        .kpis {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }
        .kpi {
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.10);
          background: rgba(255, 255, 255, 0.06);
          padding: 10px;
        }
        .kpiLabel {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.62);
          font-weight: 800;
        }
        .kpiValue {
          margin-top: 6px;
          font-size: 20px;
          font-weight: 950;
          letter-spacing: -0.4px;
        }
        .rows {
          margin-top: 10px;
          display: grid;
          gap: 10px;
        }
        .row {
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.10);
          background: rgba(255, 255, 255, 0.06);
          padding: 10px;
        }
        .rowTitle {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.62);
          font-weight: 850;
        }
        .rowMain {
          margin-top: 6px;
          font-weight: 950;
          letter-spacing: -0.2px;
        }
        .rowMeta {
          margin-top: 6px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.60);
          line-height: 1.4;
        }
        .hint {
          margin-top: 10px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.60);
          border-top: 1px solid rgba(255, 255, 255, 0.10);
          padding-top: 10px;
        }

        /* Sections */
        .section {
          padding: 64px 0;
          border-top: 1px solid rgba(255, 255, 255, 0.10);
        }
        .sectionAlt {
          background: rgba(255, 255, 255, 0.03);
        }
        .h2 {
          margin: 0;
          font-size: 30px;
          font-weight: 980;
          letter-spacing: -0.7px;
        }
        .p2 {
          margin: 10px 0 0;
          color: rgba(255, 255, 255, 0.74);
          max-width: 760px;
          line-height: 1.6;
        }

        .grid3 {
          margin-top: 22px;
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }
        .feature {
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.06);
          padding: 16px;
          transition: transform 0.10s ease, border-color 0.15s ease, background 0.15s ease;
        }
        .feature:hover {
          transform: translateY(-2px);
          border-color: rgba(138, 180, 255, 0.28);
          background: rgba(255, 255, 255, 0.07);
        }
        .featureTop {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .iconPill {
          width: 34px;
          height: 34px;
          border-radius: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(138, 180, 255, 0.26);
          background: rgba(138, 180, 255, 0.10);
          color: rgba(138, 180, 255, 0.95);
          flex: 0 0 auto;
        }
        .featureTitle {
          font-weight: 980;
          letter-spacing: -0.2px;
        }
        .featureDesc {
          margin-top: 10px;
          color: rgba(255, 255, 255, 0.72);
          line-height: 1.55;
          font-size: 14px;
        }

        /* Pricing teaser */
        .pricingTeaser {
          margin-top: 18px;
          display: grid;
          gap: 14px;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.06);
          padding: 16px;
        }
        .pricingBox {
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.10);
          background: rgba(0, 0, 0, 0.22);
          padding: 14px;
        }
        .pricingLabel {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.62);
          font-weight: 850;
        }
        .pricingTitle {
          margin-top: 6px;
          font-weight: 980;
          letter-spacing: -0.3px;
        }
        .pricingMeta {
          margin-top: 6px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.62);
          line-height: 1.4;
        }
        .pricingActions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: flex-start;
        }

        /* Footer */
        .footer {
          border-top: 1px solid rgba(255, 255, 255, 0.10);
          padding: 30px 0;
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
          color: rgba(255, 255, 255, 0.62);
          text-decoration: none;
          font-weight: 850;
        }
        .footerLinks :global(a:hover) {
          color: #fff;
        }

        @media (min-width: 860px) {
          .nav {
            display: flex;
          }
          .hero {
            grid-template-columns: 1.05fr 0.95fr;
            align-items: center;
          }
          .h1 {
            font-size: 56px;
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
