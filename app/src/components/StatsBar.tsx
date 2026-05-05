"use client";

import { useEffect, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { AxiomClient } from "@/program/client";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import styles from "./StatsBar.module.css";

interface StatData {
  label: string;
  value: string;
  suffix?: string;
  subtext: string;
}

const DEFAULT_STATS: StatData[] = [
  { label: "Total Jobs Processed", value: "0", subtext: "Live from Solana" },
  { label: "Active GPU Nodes", value: "0", subtext: "Registered on-chain" },
  { label: "SOL Earned by Nodes", value: "0", suffix: " SOL", subtext: "Total volume transacted" },
  { label: "Avg Cost per Inference", value: "0.001", suffix: " SOL", subtext: "Approx market rate" },
];

export default function StatsBar() {
  const [visible, setVisible] = useState(false);
  const [stats, setStats] = useState<StatData[]>(DEFAULT_STATS);
  const { connection } = useConnection();

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    async function fetchStats() {
      try {
        const client = AxiomClient.create(connection);
        const config = await client.getConfig();
        
        if (config) {
          const totalJobs = config.totalJobs.toNumber();
          const totalNodes = config.totalNodes.toNumber();
          const totalVolumeSol = config.totalVolume.toNumber() / LAMPORTS_PER_SOL;

          setStats([
            { label: "Total Jobs Processed", value: totalJobs.toLocaleString(), subtext: "Live from Solana" },
            { label: "Active GPU Nodes", value: totalNodes.toLocaleString(), subtext: "Registered on-chain" },
            { label: "SOL Earned by Nodes", value: totalVolumeSol.toLocaleString(undefined, { maximumFractionDigits: 2 }), suffix: " SOL", subtext: "Total volume transacted" },
            { label: "Avg Cost per Inference", value: "0.001", suffix: " SOL", subtext: "Approx market rate" },
          ]);
        }
      } catch (err) {
        console.error("Failed to fetch real stats from Solana:", err);
      }
    }
    
    fetchStats();
  }, [connection]);

  return (
    <section className={styles.statsBar} id="stats-bar">
      <div className={`container ${styles.statsGrid}`}>
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className={`glass-card stat-card ${styles.statItem} ${visible ? styles.visible : ""}`}
            style={{ transitionDelay: `${i * 100}ms` }}
          >
            <div className="stat-label">{stat.label}</div>
            <div className="stat-value">
              {stat.value}{stat.suffix || ""}
            </div>
            <div className="stat-sub">{stat.subtext}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
