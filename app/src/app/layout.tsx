import type { Metadata } from "next";
import "./globals.css";
import { NetworkProvider } from "@/contexts/NetworkContext";
import WalletProvider from "@/components/WalletProvider";
import NetworkBackground from "@/components/NetworkBackground";

export const metadata: Metadata = {
  title: "Axiom — Decentralized AI Inference on Solana",
  description:
    "The first decentralized AI inference marketplace on Solana. GPU owners earn SOL, developers get cheap AI, and Solana handles trust automatically.",
  keywords: ["Solana", "AI", "inference", "decentralized", "GPU", "marketplace", "DePIN", "Axiom"],
  openGraph: {
    title: "Axiom — Decentralized AI Inference on Solana",
    description: "Uber for AI inference. GPU owners earn SOL running AI models.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="grid-bg" />
        <NetworkBackground />
        <NetworkProvider>
          <WalletProvider>{children}</WalletProvider>
        </NetworkProvider>
      </body>
    </html>
  );
}
