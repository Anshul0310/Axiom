"use client";

import styles from "./FeaturesGrid.module.css";

const FEATURES = [
  {
    icon: "⚡",
    title: "Sub-Second Settlement",
    desc: "Solana confirms transactions in 400ms. A job that costs $0.001 would be eaten alive by Ethereum gas fees.",
    accent: "cyan",
  },
  {
    icon: "🔐",
    title: "Commit-Reveal Protocol",
    desc: "Two-phase result submission prevents front-running. Like a sealed envelope — nobody can copy your answer.",
    accent: "violet",
  },
  {
    icon: "🎯",
    title: "VRF Verification Sampling",
    desc: "~20% of jobs are randomly spot-checked. Cheaters don't know if they're being watched. Lie once, lose your stake.",
    accent: "orange",
  },
  {
    icon: "💎",
    title: "Economic Security via Staking",
    desc: "Every node locks SOL as collateral. Honest work earns bounties. Dishonest work triggers slashing.",
    accent: "green",
  },
  {
    icon: "🧠",
    title: "Model Registry On-Chain",
    desc: "Models identified by SHA256(name + version + quantization). Both parties agree on exactly what's running.",
    accent: "gold",
  },
  {
    icon: "🔧",
    title: "5-Line SDK Integration",
    desc: "TypeScript SDK that handles job posting, polling, and proof verification. Just call market.infer() and wait.",
    accent: "cyan",
  },
];

export default function FeaturesGrid() {
  return (
    <section className={`section ${styles.section}`} id="features">
      <div className="container">
        <div className={styles.header}>
          <span className={styles.tag}>WHY AXIOM</span>
          <h2 className={styles.title}>Built for Trust, Speed, and Scale</h2>
          <p className={styles.subtitle}>
            Every design decision optimizes for verifiable, low-cost inference at Solana speed.
          </p>
        </div>

        <div className={styles.grid}>
          {FEATURES.map((f) => (
            <div key={f.title} className={`glass-card ${styles.feature}`}>
              <div className={`${styles.featureIcon} ${styles[`icon${f.accent}`]}`}>{f.icon}</div>
              <h3 className={styles.featureTitle}>{f.title}</h3>
              <p className={styles.featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
