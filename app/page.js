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
    <main className="page home">
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
            <Feature
              icon={<SparkIcon />}
              title="Deal Pages that Pop"
              desc="Stats + task buckets + upcoming events so you can run the deal."
            />
            <Feature
              icon={<ClockIcon />}
              title="Tasks & Calendar That Connect"
              desc="Filter by contact, link/unlink, and keep the day organized."
            />
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

      {/* ABOUT TEASER */}
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
    </main>
  );
}
