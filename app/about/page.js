"use client";

import Link from "next/link";
import Footer from "@/app/components/Footer";

export default function AboutPage() {
  return (
    <main className="page">
      <div className="bg" />

      <header className="header">
        <div className="wrap headerInner">
          <Link href="/" className="brand" aria-label="Vexta home">
            <span className="logoMark" aria-hidden="true" />
            <span className="brandName">Vexta</span>
          </Link>

          <nav className="nav" aria-label="Primary navigation">
            <Link className="navLink" href="/">
              Home
            </Link>
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

      <section className="wrap content">
        <div className="card">
          <div className="pill">
            <span className="pillDot" aria-hidden="true" />
            Built for real estate workflows
          </div>

          <h1 className="h1">About Vexta</h1>

          <p className="lead">
            Vexta is a real estate CRM built for agents who want clarity, speed, and a system that
            actually gets used — every day.
          </p>

          <div className="grid">
            <div className="block">
              <div className="blockTitle">Why it exists</div>
              <div className="blockText">
                Most CRMs turn into a “data entry tax.” You spend time updating fields instead of
                following up. Vexta is designed around execution — so the next action is always
                obvious.
              </div>
            </div>

            <div className="block">
              <div className="blockTitle">What makes it different</div>
              <div className="blockText">
                Vexta links everything: contacts, deals, tasks, notes, and calendar events — so you
                can see the full story in one place and keep momentum without digging.
              </div>
            </div>

            <div className="block">
              <div className="blockTitle">Who it’s for</div>
              <div className="blockText">
                Agents who want a clean pipeline, fast follow-up, and less chaos. If you live in your
                phone, run multiple deals, and don’t want “busywork CRM,” this is for you.
              </div>
            </div>
          </div>

          <div className="ctaRow">
            <Link href="/pricing" className="btn btnGhost btnLg">
              View pricing
            </Link>
            <Link href="/signup" className="btn btnPrimary btnLg">
              Create an account
            </Link>
          </div>

          <div className="fine">
            Have feedback during beta?{" "}
            <Link className="fineLink" href="/contact">
              Contact us
            </Link>
            .
          </div>
        </div>

        <div className="footerWrap">
          <Footer variant="dark" />
        </div>
      </section>

      <style jsx>{`
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
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
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
        }
        .navLink:hover {
          color: #fff;
        }
        .headerActions {
          display: flex;
          gap: 10px;
          align-items: center;
        }

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

        .content {
          padding: 44px 0 22px;
          display: grid;
          gap: 14px;
        }

        .card {
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.06);
          box-shadow: 0 38px 160px rgba(0, 0, 0, 0.55);
          padding: 18px;
          overflow: hidden;
          position: relative;
        }
        .card::before {
          content: "";
          position: absolute;
          inset: -140px auto auto -140px;
          width: 260px;
          height: 260px;
          background: radial-gradient(circle, rgba(138,180,255,0.16), transparent 65%);
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
          font-weight: 850;
          color: rgba(255, 255, 255, 0.86);
          position: relative;
        }
        .pillDot {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: rgba(138, 180, 255, 0.95);
          box-shadow: 0 0 0 4px rgba(138, 180, 255, 0.12);
        }

        .h1 {
          margin: 14px 0 0;
          font-size: 44px;
          line-height: 1.06;
          letter-spacing: -1.1px;
          font-weight: 980;
          position: relative;
        }
        .lead {
          margin: 12px 0 0;
          color: rgba(255, 255, 255, 0.74);
          line-height: 1.65;
          max-width: 760px;
          position: relative;
        }

        .grid {
          margin-top: 18px;
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          position: relative;
        }
        .block {
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.10);
          background: rgba(0, 0, 0, 0.22);
          padding: 14px;
        }
        .blockTitle {
          font-weight: 980;
          letter-spacing: -0.2px;
        }
        .blockText {
          margin-top: 8px;
          color: rgba(255, 255, 255, 0.72);
          line-height: 1.6;
          font-size: 14px;
        }

        .ctaRow {
          margin-top: 16px;
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          position: relative;
        }

        .fine {
          margin-top: 14px;
          color: rgba(255, 255, 255, 0.60);
          font-size: 12px;
          position: relative;
        }
        .fineLink {
          color: rgba(255, 255, 255, 0.78);
          text-decoration: none;
          font-weight: 850;
        }
        .fineLink:hover {
          color: #fff;
        }

        .footerWrap {
          padding: 0 2px 10px;
        }

        @media (min-width: 860px) {
          .nav {
            display: flex;
          }
          .grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
      `}</style>
    </main>
  );
}
