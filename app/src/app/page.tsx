"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import StatsBar from "@/components/StatsBar";
import HowItWorks from "@/components/HowItWorks";
import PlaygroundPreview from "@/components/PlaygroundPreview";
import FeaturesGrid from "@/components/FeaturesGrid";
import Footer from "@/components/Footer";

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <main>
      <Navbar />
      <HeroSection />
      <StatsBar />
      <HowItWorks />
      <PlaygroundPreview />
      <FeaturesGrid />
      <Footer />
    </main>
  );
}
