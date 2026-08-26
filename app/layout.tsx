import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SEN/EBC Week 1 GameCast Operator v1.1.1",
  description: "Central operator control room with Power Crunch automatic game simulation for the 2026 synthetic NCAA Week 1 schedule.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <html lang="en"><body>{children}</body></html>;
}
