"use client";

import Link from "next/link";
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer} id="footer">
      <div className="container">
        <div className={styles.top}>
          <div className={styles.brand}>
            <div className={styles.logo}>
              <span className={styles.logoIcon}>◆</span>
              <span className={styles.logoText}>Axiom</span>
            </div>
            <p className={styles.tagline}>
              Decentralized AI inference, powered by Solana.
            </p>
          </div>

          <div className={styles.links}>
            <div className={styles.linkCol}>
              <h4 className={styles.colTitle}>Protocol</h4>
              <Link href="/docs" className={styles.link}>How It Works</Link>
              <Link href="/docs" className={styles.link}>Architecture</Link>
              <Link href="/playground" className={styles.link}>Playground</Link>
            </div>
            <div className={styles.linkCol}>
              <h4 className={styles.colTitle}>Developers</h4>
              <Link href="/docs" className={styles.link}>Documentation</Link>
              <Link href="/docs" className={styles.link}>SDK Reference</Link>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className={styles.link}>GitHub</a>
            </div>
            <div className={styles.linkCol}>
              <h4 className={styles.colTitle}>Network</h4>
              <Link href="/dashboard" className={styles.link}>Node Dashboard</Link>
              <Link href="/explorer" className={styles.link}>Explorer</Link>
              <a href="https://explorer.solana.com/?cluster=devnet" target="_blank" rel="noopener noreferrer" className={styles.link}>Solana Explorer</a>
            </div>
          </div>
        </div>

        <div className={styles.bottom}>
          <p className={styles.copy}>
            © 2026 Axiom. All rights reserved.
          </p>
          <p className={styles.chain}>
            <span className={styles.chainDot} /> Solana Devnet
          </p>
        </div>
      </div>
    </footer>
  );
}
