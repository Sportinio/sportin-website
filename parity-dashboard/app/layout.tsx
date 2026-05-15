import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SportIn · Mobile Parity",
  description: "iOS / Android feature parity dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
