import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../components/layout/AuthProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CollabEdit — Real-time Collaborative Document Editor",
  description:
    "Local-first collaborative document editor with offline sync, CRDT conflict resolution, and version history.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-gray-50 text-gray-900 antialiased min-h-screen">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
