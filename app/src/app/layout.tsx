import type { Metadata } from "next";
import "./globals.css";
import { NetworkProvider } from "@/contexts/NetworkContext";
import WalletProvider from "@/components/WalletProvider";
import AnimatedBackground from "@/components/AnimatedBackground";

export const metadata: Metadata = {
  title: "Axiom - Decentralized AI Inference on Solana",
  description:
    "A decentralized AI inference marketplace on Solana where GPU owners earn SOL, developers get affordable inference, and settlement happens on-chain.",
  keywords: [
    "Solana",
    "AI",
    "inference",
    "decentralized",
    "GPU",
    "marketplace",
    "DePIN",
    "Axiom",
  ],
  openGraph: {
    title: "Axiom - Decentralized AI Inference on Solana",
    description: "A Solana-native marketplace for decentralized AI inference.",
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
        <AnimatedBackground />
        <NetworkProvider>
          <WalletProvider>{children}</WalletProvider>
        </NetworkProvider>
      </body>
    </html>
  );
}
