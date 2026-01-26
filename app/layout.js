// app/layout.js
import "./globals.css";

export const metadata = {
  title: "Vexta CRM",
  description: "Vexta CRM",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-zinc-900 antialiased">
        {children}
      </body>
    </html>
  );
}
