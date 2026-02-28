import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Alaap",
  description:
    "A knowledge base for golden era Indian film music — ragas, compositions, and the artists who shaped them.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-neutral-900 antialiased">
        {children}
      </body>
    </html>
  );
}
