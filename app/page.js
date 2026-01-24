import Link from "next/link";

export default function Home() {
  return (
    <main style={{ padding: 40, fontFamily: "Arial" }}>
      <nav style={{ marginBottom: 20 }}>
        <Link href="/" style={{ marginRight: 12 }}>Home</Link>
        <Link href="/about">About</Link>
      </nav>

      <h1>Vexta CRM</h1>
      <p>These bitches love sosa.</p>
    </main>
  );
}

