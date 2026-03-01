import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import { Header } from "./components/header";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

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
    <html lang="en" className={`${playfair.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-cream text-stone-900 antialiased">
        <Header />
        <main className="mx-auto max-w-6xl px-4">{children}</main>
      </body>
    </html>
  );
}
