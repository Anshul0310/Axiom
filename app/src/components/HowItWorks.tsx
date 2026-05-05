"use client";

import styles from "./HowItWorks.module.css";

const STEPS = [
  {
    num: "01",
    icon: "📝",
    title: "Post an AI Task",
    desc: "Submit a prompt, choose a model, and lock a micro-bounty in SOL. Your job appears on-chain instantly.",
    color: "cyan",
  },
  {
    num: "02",
    icon: "🖥️",
    title: "GPU Nodes Race to Complete It",
    desc: "Node operators with matching models run your inference. The fastest one commits a hash of their result.",
    color: "violet",
  },
  {
    num: "03",
    icon: "🔒",
    title: "Commit → Reveal",
    desc: "First a fingerprint, then the answer. Like a sealed envelope — prevents copying and ensures fairness.",
    color: "gold",
  },
  {
    num: "04",
    icon: "🔍",
    title: "Random Verification",
    desc: "~20% of jobs get spot-checked. A second node re-runs the task. Cheaters lose their stake.",
    color: "orange",
  },
  {
    num: "05",
    icon: "💰",
    title: "Instant Settlement",
    desc: "Honest nodes get paid automatically. The entire flow takes seconds, not minutes. All on Solana.",
    color: "green",
  },
];

export default function HowItWorks() {
  return (
    <section className={`section ${styles.section}`} id="how-it-works">
      <div className="container">
        <div className={styles.header}>
          <span className={styles.tag}>THE PROTOCOL</span>
          <h2 className={styles.title}>How Axiom Works</h2>
          <p className={styles.subtitle}>
            Five steps from prompt to proof. Every step is verifiable on-chain.
          </p>
        </div>

        <div className={styles.timeline}>
          {STEPS.map((step, i) => (
            <div key={step.num} className={styles.step}>
              <div className={styles.stepLine}>
                <div
                  className={`${styles.stepDot} ${styles[`dot${step.color}`]}`}
                />
                {i < STEPS.length - 1 && <div className={styles.connector} />}
              </div>
              <div className={`glass-card ${styles.stepCard}`}>
                <div className={styles.stepNum}>{step.num}</div>
                <div className={styles.stepIcon}>{step.icon}</div>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepDesc}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
