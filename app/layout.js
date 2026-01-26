import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Vexta CRM",
  description: "Created by agents, for agents",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
  <header style={{
  position: "sticky",
  top: 0,
  background: "black",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "16px 20px",
  borderBottom: "1px solid #e5e7eb",
  zIndex: 50
}}>
    <a href="/" style={{ display: "inline-flex", alignItems: "center" }}>
  <img src="/VLT.png" alt="Logo" style={{ height: "38px", width: "auto" }} />
</a>

  </header>

  {children}
</body>

    </html>
  );
}
