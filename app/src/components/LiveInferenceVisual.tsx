"use client";

import { useEffect, useState } from "react";
import styles from "./LiveInferenceVisual.module.css";

export default function LiveInferenceVisual() {
  const [tokens, setTokens] = useState<string[]>([]);
  const [status, setStatus] = useState("Connecting to Network...");
  const [progress, setProgress] = useState(0);
  
  const sampleText = "The decentralized network provides a trustless, permissionless environment for AI inference, allowing anyone to monetize their compute resources.";
  const words = sampleText.split(" ");

  useEffect(() => {
    let currentWordIndex = 0;
    
    const resetAnimation = () => {
      setTokens([]);
      setStatus("Broadcasting Task to Nodes...");
      setProgress(0);
      currentWordIndex = 0;
      
      setTimeout(() => {
        setStatus("Computing: Llama-2-7b");
        let progressInterval = setInterval(() => {
          setProgress(p => {
            if (p >= 100) {
              clearInterval(progressInterval);
              return 100;
            }
            return p + 5;
          });
        }, 50);

        setTimeout(() => {
          const typeInterval = setInterval(() => {
            if (currentWordIndex < words.length) {
              setTokens(prev => [...prev, words[currentWordIndex]]);
              currentWordIndex++;
            } else {
              clearInterval(typeInterval);
              setStatus("Task Complete. Proof Verified on Solana.");
              setTimeout(resetAnimation, 4000);
            }
          }, 150);
          return () => clearInterval(typeInterval);
        }, 1500);
      }, 1500);
    };

    resetAnimation();
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.glow} />
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.statusIndicator}>
            <div className={`${styles.pulse} ${status.includes("Complete") ? styles.pulseGreen : styles.pulseCyan}`} />
            <span className={styles.statusText}>{status}</span>
          </div>
          <div className={styles.nodeBadge}>
            <span className={styles.icon}>⚡</span> GPU-739X
          </div>
        </div>
        
        <div className={styles.progressBarWrapper}>
          <div className={styles.progressBar} style={{ width: `${progress}%` }} />
        </div>

        <div className={styles.content}>
          <div className={styles.prompt}>
            <span className={styles.promptLabel}>Prompt:</span> Explain the benefits of Axiom.
          </div>
          <div className={styles.outputBox}>
            {tokens.length === 0 && progress === 100 && <span className={styles.blinkingCursor}></span>}
            {tokens.map((word, i) => (
              <span key={i} className={styles.token}>{word} </span>
            ))}
            {tokens.length > 0 && status.includes("Computing") && <span className={styles.blinkingCursor}></span>}
          </div>
        </div>

        <div className={styles.footer}>
          <div className={styles.hash}>
            Tx: {status.includes("Complete") ? "4a9X...m2kP" : "Pending..."}
          </div>
          <div className={styles.cost}>
            Cost: <span className={styles.sol}>0.001 SOL</span>
          </div>
        </div>
      </div>
    </div>
  );
}
