import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SuiProvider } from "@/components/providers/SuiProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SuiLFG MemeFi | Launch Memecoins on Sui",
  description: "The premier memecoin launchpad on Sui blockchain. Create, trade, and graduate memecoins with bonding curves.",
  openGraph: {
    title: "SuiLFG MemeFi | Launch Memecoins on Sui",
    description: "Fair launch memecoins with bonding curves on Sui",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SuiLFG MemeFi",
    description: "Launch memecoins on Sui",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SuiProvider>{children}</SuiProvider>
      </body>
    </html>
  );
}
