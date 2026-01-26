// app/page.js
import Link from "next/link";

export const metadata = {
  title: "Vexta CRM — Real Estate CRM",
  description:
    "Vexta CRM helps real estate agents manage contacts, deals, tasks, notes, and calendar events in one place.",
};

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
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

export default function HomePage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(1100px_circle_at_20%_10%,rgba(255,255,255,0.10),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(900px_circle_at_80%_30%,rgba(255,255,255,0.08),transparent_55%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-zinc-950 to-black" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-zinc-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-white" />
            <span className="text-lg font-semibold tracking-tight">Vexta</span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <a href="#features" className="text-sm text-white/70 hover:text-white">
              Features
            </a>
            <a href="#pricing" className="text-sm text-white/70 hover:text-white">
              Pricing
            </a>
            <a href="#about" className="text-sm text-white/70 hover:text-white">
              About
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/5"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-zinc-100"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-14 md:py-20">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-white/80">
              Built for real estate workflows
              <span className="h-1 w-1 rounded-full bg-white/40" />
              Fast. Clean. Linked.
            </p>

            <h1 className="mt-5 text-4xl font-semibold tracking-tight md:text-5xl">
              Your CRM that actually{" "}
              <span className="text-white/70">keeps you moving</span>.
            </h1>

            <p className="mt-4 max-w-xl text-base leading-relaxed text-white/70 md:text-lg">
              Vexta CRM keeps contacts, deals, tasks, notes, and calendar events
              connected — so you always know the next follow-up and what matters
              today.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-zinc-950 hover:bg-zinc-100"
              >
                Create account
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Log in
              </Link>
            </div>

            <div className="mt-7 grid gap-2 text-sm text-white/70">
              <div className="flex items-center gap-2">
                <span className="text-white">
                  <CheckIcon />
                </span>
                Contact profiles that act like a hub (deals/notes/tasks/events).
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white">
                  <CheckIcon />
                </span>
                Deal pages with task buckets + event visibility.
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white">
                  <CheckIcon />
                </span>
                Fast filters designed for daily execution.
              </div>
            </div>
          </div>

          {/* Right-side mock */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.50)]">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-white/60">Today</div>
                <div className="mt-1 text-lg font-semibold">Dashboard snapshot</div>
              </div>
              <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/70">
                Pipeline • Tasks • Calendar
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs text-white/60">Next follow-up</div>
                <div className="mt-1 font-semibold">Call: Buyer pre-approval</div>
                <div className="mt-2 text-xs text-white/60">
                  Linked to: John D • Deal: Bridgeview Ranch
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs text-white/60">Deal stage</div>
                <div className="mt-1 font-semibold">Under Contract</div>
                <div className="mt-2 text-xs text-white/60">
                  Tasks bucketed by stage • Events visible at a glance
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs text-white/60">Upcoming</div>
                <div className="mt-1 font-semibold">Inspection — 10:30 AM</div>
                <div className="mt-2 text-xs text-white/60">
                  Filter calendar by contact / active deal
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3 text-center text-xs text-white/60">
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-white font-semibold">Contacts</div>
                <div className="mt-1">linked</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-white font-semibold">Deals</div>
                <div className="mt-1">tracked</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-white font-semibold">Tasks</div>
                <div className="mt-1">actionable</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-white/10 bg-black/10">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Features that match your workflow
          </h2>
          <p className="mt-2 max-w-2xl text-white/70">
            Built around speed, linking records, and keeping the next action obvious.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Contact Profile Hub",
                desc: "Deals, notes, tasks, calendar events — in one place with smart filtering.",
              },
              {
                title: "Deal Pages that Pop",
                desc: "Stats + task buckets + upcoming events so you can run the deal.",
              },
              {
                title: "Tasks & Calendar That Connect",
                desc: "Filter by contact, link/unlink, and keep the day organized.",
              },
              {
                title: "Fast Filters",
                desc: "Search + status + due date filters designed for daily use.",
              },
              {
                title: "Clean UI",
                desc: "No bloat. Just the actions you use constantly, done well.",
              },
              {
                title: "Secure Foundation",
                desc: "Supabase auth + dashboard protection + Google OAuth.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-5"
              >
                <h3 className="text-base font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/70">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Pricing</h2>
          <p className="mt-2 max-w-2xl text-white/70">
            Simple tiers. Start free, upgrade when you’re ready.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="text-sm font-semibold">Starter</div>
              <div className="mt-2 text-3xl font-semibold">$0</div>
              <div className="mt-1 text-sm text-white/60">For getting set up</div>
              <ul className="mt-5 space-y-2 text-sm text-white/70">
                <li className="flex items-center gap-2">
                  <CheckIcon /> Contacts, deals, notes
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon /> Tasks + calendar basics
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon /> Standard filters
                </li>
              </ul>
              <Link
                href="/signup"
                className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-zinc-100"
              >
                Start free
              </Link>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white p-6 text-zinc-950 shadow-[0_30px_120px_rgba(0,0,0,0.55)]">
              <div className="text-sm font-semibold">Pro</div>
              <div className="mt-2 text-3xl font-semibold">$29</div>
              <div className="mt-1 text-sm text-zinc-600">Per month</div>
              <ul className="mt-5 space-y-2 text-sm text-zinc-700">
                <li className="flex items-center gap-2">
                  <CheckIcon /> Everything in Starter
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon /> Advanced filters + reporting
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon /> Pipeline views
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon /> Priority improvements
                </li>
              </ul>
              <Link
                href="/signup"
                className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-zinc-950 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-900"
              >
                Get Pro
              </Link>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="text-sm font-semibold">Team</div>
              <div className="mt-2 text-3xl font-semibold">$79</div>
              <div className="mt-1 text-sm text-white/60">Per month</div>
              <ul className="mt-5 space-y-2 text-sm text-white/70">
                <li className="flex items-center gap-2">
                  <CheckIcon /> Shared pipeline options
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon /> Roles & permissions
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon /> Team reporting
                </li>
              </ul>
              <Link
                href="/signup"
                className="mt-6 inline-flex w-full items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >
                Start Team
              </Link>
            </div>
          </div>

          <p className="mt-6 text-xs text-white/50">
            Pricing can be placeholders while you finish the product.
          </p>
        </div>
      </section>

      {/* About */}
      <section id="about" className="border-t border-white/10 bg-black/10">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">About Vexta</h2>
          <p className="mt-2 max-w-3xl text-white/70">
            Vexta CRM is built to be practical: help agents follow up faster, keep deals clean,
            and reduce chaos. The goal is simple — more action, less clutter.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-zinc-950 hover:bg-zinc-100"
            >
              Create account
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              Log in
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-10 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-white/60">© {new Date().getFullYear()} Vexta CRM</div>
          <div className="flex gap-4 text-sm">
            <Link href="/login" className="text-white/60 hover:text-white">
              Log in
            </Link>
            <Link href="/signup" className="text-white/60 hover:text-white">
              Sign up
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
