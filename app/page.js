// app/page.js
import Link from "next/link";

export const metadata = {
  title: "Vexta CRM — Real Estate CRM",
  description:
    "Vexta CRM helps real estate agents manage contacts, deals, tasks, notes, and calendar events in one place.",
};

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-zinc-900">
      {/* Top Nav */}
      <header className="sticky top-0 z-20 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-zinc-900" />
            <span className="text-lg font-semibold tracking-tight">Vexta</span>
          </div>

          <nav className="hidden items-center gap-6 md:flex">
            <a href="#features" className="text-sm text-zinc-700 hover:text-zinc-900">
              Features
            </a>
            <a href="#pricing" className="text-sm text-zinc-700 hover:text-zinc-900">
              Pricing
            </a>
            <a href="#about" className="text-sm text-zinc-700 hover:text-zinc-900">
              About
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-zinc-50"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <p className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium text-zinc-700">
              Built for real estate workflows
            </p>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
              Your contacts, deals, tasks, notes, and calendar —{" "}
              <span className="text-zinc-500">finally in one place.</span>
            </h1>

            <p className="mt-4 text-base leading-relaxed text-zinc-700 md:text-lg">
              Vexta CRM is a clean, fast real estate CRM designed for daily execution:
              follow-ups, deal tracking, and client organization without clutter.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                Create account
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-xl border px-5 py-3 text-sm font-semibold hover:bg-zinc-50"
              >
                Log in
              </Link>
            </div>

            <p className="mt-4 text-xs text-zinc-500">
              No credit card required (for now). Your data stays private.
            </p>
          </div>

          {/* Mock panel */}
          <div className="rounded-2xl border bg-zinc-50 p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm font-semibold">Today</div>
              <div className="text-xs text-zinc-600">Pipeline • Tasks • Calendar</div>
            </div>
            <div className="grid gap-3">
              <div className="rounded-xl border bg-white p-4">
                <div className="text-xs text-zinc-500">Next follow-up</div>
                <div className="mt-1 font-semibold">Call: Buyer pre-approval</div>
                <div className="mt-2 text-xs text-zinc-600">
                  Linked to: John D • Deal: Bridgeview Ranch
                </div>
              </div>

              <div className="rounded-xl border bg-white p-4">
                <div className="text-xs text-zinc-500">Deal stage</div>
                <div className="mt-1 font-semibold">Under Contract</div>
                <div className="mt-2 text-xs text-zinc-600">
                  Tasks bucketed by stage • Events synced
                </div>
              </div>

              <div className="rounded-xl border bg-white p-4">
                <div className="text-xs text-zinc-500">Upcoming</div>
                <div className="mt-1 font-semibold">Inspection — 10:30 AM</div>
                <div className="mt-2 text-xs text-zinc-600">
                  Auto-filter by contact or active deal
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Features that match how agents actually work
          </h2>
          <p className="mt-2 max-w-2xl text-zinc-700">
            Built around speed, linking records, and keeping the “next action” obvious.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Contact Profiles",
                desc: "A true hub for deals, notes, tasks, and events — with active deal filtering.",
              },
              {
                title: "Deals that stay organized",
                desc: "Deal pages that show stats, task buckets, and upcoming events at a glance.",
              },
              {
                title: "Tasks & Calendar that connect",
                desc: "Filter by contact, link/unlink as needed, and keep everything in sync.",
              },
              {
                title: "Fast filters",
                desc: "Find what matters quickly: statuses, dates, active deals, and search.",
              },
              {
                title: "Clean UI",
                desc: "No bloat. Just the core tools you use daily, done well.",
              },
              {
                title: "Secure by design",
                desc: "Supabase auth + row-level security-ready structure for multi-user.",
              },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl border p-5">
                <h3 className="text-base font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-700">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t bg-zinc-50">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Pricing</h2>
          <p className="mt-2 max-w-2xl text-zinc-700">
            Simple tiers. Start free, upgrade when you’re ready.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {/* Starter */}
            <div className="rounded-2xl border bg-white p-6">
              <div className="text-sm font-semibold">Starter</div>
              <div className="mt-2 text-3xl font-semibold">$0</div>
              <div className="mt-1 text-sm text-zinc-600">For getting set up</div>
              <ul className="mt-5 space-y-2 text-sm text-zinc-700">
                <li>• Contacts, deals, notes</li>
                <li>• Tasks + calendar basics</li>
                <li>• Standard filters</li>
              </ul>
              <Link
                href="/signup"
                className="mt-6 inline-flex w-full items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-zinc-50"
              >
                Start free
              </Link>
            </div>

            {/* Pro */}
            <div className="rounded-2xl border bg-zinc-900 p-6 text-white shadow-sm">
              <div className="text-sm font-semibold">Pro</div>
              <div className="mt-2 text-3xl font-semibold">$29</div>
              <div className="mt-1 text-sm text-zinc-300">Per month</div>
              <ul className="mt-5 space-y-2 text-sm text-zinc-200">
                <li>• Everything in Starter</li>
                <li>• Advanced filters + reporting</li>
                <li>• Pipeline views</li>
                <li>• Priority improvements</li>
              </ul>
              <Link
                href="/signup"
                className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
              >
                Get Pro
              </Link>
            </div>

            {/* Team */}
            <div className="rounded-2xl border bg-white p-6">
              <div className="text-sm font-semibold">Team</div>
              <div className="mt-2 text-3xl font-semibold">$79</div>
              <div className="mt-1 text-sm text-zinc-600">Per month</div>
              <ul className="mt-5 space-y-2 text-sm text-zinc-700">
                <li>• Shared pipeline options</li>
                <li>• Roles & permissions</li>
                <li>• Team reporting</li>
              </ul>
              <Link
                href="/signup"
                className="mt-6 inline-flex w-full items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-zinc-50"
              >
                Start Team
              </Link>
            </div>
          </div>

          <p className="mt-6 text-xs text-zinc-500">
            Note: pricing can be placeholders while we finish the product — but the landing is ready.
          </p>
        </div>
      </section>

      {/* About */}
      <section id="about" className="border-t bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">About Vexta</h2>
          <p className="mt-2 max-w-3xl text-zinc-700">
            Vexta CRM is built to be practical: help agents follow up faster, keep deals clean,
            and reduce chaos. We focus on the core actions that generate closings.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              Create account
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl border px-5 py-3 text-sm font-semibold hover:bg-zinc-50"
            >
              Log in
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-zinc-50">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-10 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-zinc-600">© {new Date().getFullYear()} Vexta CRM</div>
          <div className="flex gap-4 text-sm">
            <Link href="/login" className="text-zinc-600 hover:text-zinc-900">
              Log in
            </Link>
            <Link href="/signup" className="text-zinc-600 hover:text-zinc-900">
              Sign up
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
