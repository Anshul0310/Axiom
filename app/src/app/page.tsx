"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import Navbar from "@/components/Navbar";

const hubCards = [
  {
    href: "/playground",
    id: "hub-playground",
    kicker: "Run",
    title: "Playground",
    desc: "Post inference jobs, pick a model, and watch the commit-reveal pipeline move in real time.",
    action: "Open Playground",
    accent: "cyan",
    meta: "5 live models",
  },
  {
    href: "/dashboard",
    id: "hub-dashboard",
    kicker: "Earn",
    title: "Node Dashboard",
    desc: "Register GPU nodes, monitor reputation, and claim bounties from the operator cockpit.",
    action: "Manage Nodes",
    accent: "green",
    meta: "12 nodes online",
  },
  {
    href: "/explorer",
    id: "hub-explorer",
    kicker: "Verify",
    title: "Explorer",
    desc: "Trace jobs, statuses, addresses, and on-chain proofs without losing the story of the request.",
    action: "View Explorer",
    accent: "violet",
    meta: "Live polling",
  },
];

const stats = [
  ["Latency", "2.4s"],
  ["Settlement", "SOL"],
  ["Trust", "On-chain"],
];

const flowSteps = ["Post", "Commit", "Reveal", "Settle"];

const smoothEase = [0.16, 1, 0.3, 1] as const;

const pageVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.09, delayChildren: 0.08 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 22, filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.65, ease: smoothEase },
  },
};

export default function Home() {
  return (
    <main>
      <Navbar />
      <motion.div
        className="hub-page"
        variants={pageVariants}
        initial="hidden"
        animate="show"
      >
        <div className="container hub-container">
          <section className="hub-hero">
            <motion.div className="hub-copy" variants={itemVariants}>
              <div className="hub-kicker">
                <span className="pulse-dot" />
                Solana inference market
              </div>
              <h1 className="hub-title">
                <span className="hub-logo-mark" aria-hidden="true" />
                Axiom
              </h1>
              <p className="hub-subtitle">
                A real-time workspace for decentralized AI inference: submit
                prompts, coordinate GPU nodes, and verify every result on-chain.
              </p>
              <div className="hub-actions">
                <Link href="/playground" className="btn btn-primary btn-large">
                  Run an inference
                </Link>
                <Link href="/explorer" className="btn btn-secondary btn-large">
                  Inspect jobs
                </Link>
              </div>
              <div className="hub-stats" aria-label="Network highlights">
                {stats.map(([label, value]) => (
                  <div className="hub-stat" key={label}>
                    <span className="hub-stat-value">{value}</span>
                    <span className="hub-stat-label">{label}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              className="hub-orbit"
              variants={itemVariants}
              aria-label="Axiom job pipeline preview"
            >
              <div className="hub-orbit-core">
                <span>Axiom</span>
                <strong>Inference live</strong>
              </div>
              <div className="hub-orbit-ring hub-orbit-ring-one" />
              <div className="hub-orbit-ring hub-orbit-ring-two" />
              {flowSteps.map((step, index) => (
                <div
                  className={`hub-orbit-node hub-orbit-node-${index + 1}`}
                  key={step}
                >
                  <span>{step}</span>
                </div>
              ))}
              <div className="hub-signal hub-signal-one" />
              <div className="hub-signal hub-signal-two" />
            </motion.div>
          </section>

          <motion.section className="hub-grid" variants={pageVariants}>
            {hubCards.map((card, index) => (
              <motion.div
                key={card.href}
                variants={itemVariants}
                whileHover={{ y: -8, scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
              >
                <Link
                  href={card.href}
                  className={`hub-card hub-card-${card.accent}`}
                  id={card.id}
                >
                  <span className="hub-card-sheen" aria-hidden="true" />
                  <div className="hub-card-top">
                    <span className="hub-card-kicker">{card.kicker}</span>
                    <span className="hub-card-index">
                      0{index + 1}
                    </span>
                  </div>
                  <h2 className="hub-card-title">{card.title}</h2>
                  <p className="hub-card-desc">{card.desc}</p>
                  <div className="hub-card-footer">
                    <span className="hub-card-meta">{card.meta}</span>
                    <span className="hub-card-action">{card.action}</span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.section>
        </div>
      </motion.div>
    </main>
  );
}
