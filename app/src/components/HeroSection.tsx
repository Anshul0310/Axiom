"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./HeroSection.module.css";
import LiveInferenceVisual from "./LiveInferenceVisual";

export default function HeroSection() {
  const [typedText, setTypedText] = useState("");
  const fullText = "Decentralized AI Inference on Solana";

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i <= fullText.length) {
        setTypedText(fullText.slice(0, i));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 45);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className={styles.hero} id="hero">
      {/* Gradient orbs */}
      <div className={`orb orb-cyan ${styles.orbTopRight}`} />
      <div className={`orb orb-violet ${styles.orbBottomLeft}`} />

      <div className={`container ${styles.heroContent}`}>
        <h1 className={styles.title}>
          <span className={styles.titleGradient}>
            {typedText}
            <span className={styles.cursor}>▋</span>
          </span>
        </h1>

        <p className={styles.subtitle}>
          Like Uber — but instead of rides, people with powerful GPUs rent them out to run AI tasks.
          <span className={styles.highlight}> Solana handles all payments and trust automatically.</span>
        </p>

        <div className={styles.ctas}>
          <Link href="/playground" className="btn btn-primary btn-large" id="hero-try-now">
            <span>⚡</span> Try It Now
          </Link>
          <Link href="/dashboard" className="btn btn-secondary btn-large" id="hero-run-node">
            <span>🖥️</span> Run a Node
          </Link>
        </div>
      </div>

      {/* Live Inference Visual */}
      <div className={styles.terminalWrapper}>
        <LiveInferenceVisual />
      </div>
    </section>
  );
}
