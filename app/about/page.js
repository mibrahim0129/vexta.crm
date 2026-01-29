// app/about/page.js
import Link from "next/link";
import Footer from "@/app/components/Footer";

export default function About() {
  return (
    <main
      style={{
        padding: 40,
        fontFamily: "Arial",
        maxWidth: "800px",
        marginLeft: "auto",
        marginRight: "auto",
      }}
    >
      <h1>About the Company</h1>

      <p style={{ lineHeight: 1.7, opacity: 0.92 }}>
        A CRM that follows the deal, not the contact.
        <br />
        <br />
        Vexta is a real estate CRM built for agents, by agents—designed to keep
        relationships strong without turning them into work. Real estate is
        driven by trust, timing, and momentum, and Vexta focuses on what actually
        matters: the deal.
        <br />
        <br />
        Instead of organizing your business around contacts, Vexta is structured
        around active opportunities. Every conversation, task, document, and
        follow-up lives within the deal itself, allowing agents to stay
        organized while keeping interactions natural and personal. The system
        works quietly in the background, ensuring nothing falls through the
        cracks.
        <br />
        <br />
        Vexta helps agents stay present with their clients, confident in their
        process, and focused on moving deals forward. By combining real-world
        agent experience with intelligent automation, Vexta delivers a smarter
        way to manage transactions—without losing the human side of real estate.
      </p>

      <div style={{ marginTop: 18 }}>
        <Link href="/pricing" style={{ textDecoration: "underline", fontWeight: 700 }}>
          Back to Pricing
        </Link>
      </div>

      <Footer variant="light" />
    </main>
  );
}
