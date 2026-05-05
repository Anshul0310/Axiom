"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import { AnchorProvider } from "@coral-xyz/anchor";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useNetwork } from "@/contexts/NetworkContext";
import { AxiomClient, parseJobStatus, OnChainJob } from "@/program/client";
import styles from "./explorer.module.css";

type JobStatusType = "open" | "committed" | "revealed" | "settled" | "expired";

interface ExplorerJob {
  id: string;
  client: string;
  node: string;
  model: string;
  bounty: number;
  status: JobStatusType;
  timestamp: Date;
  txHash: string;
  inputPreview: string;
  outputPreview?: string;
  isOnChain: boolean;
}

const STATUS_ORDER: JobStatusType[] = ["open", "committed", "revealed", "settled", "expired"];


function onChainJobToExplorer(job: OnChainJob): ExplorerJob {
  const status = parseJobStatus(job.account.status).toLowerCase() as JobStatusType;
  return {
    id: `job-${job.account.jobId.toString()}`,
    client: job.account.client.toBase58(),
    node: job.account.nodeOperator.toBase58(),
    model: "AI Model",
    bounty: AxiomClient.lamportsToSol(job.account.bountyLamports),
    status,
    timestamp: new Date(job.account.createdAt.toNumber() * 1000),
    txHash: job.publicKey.toBase58(),
    inputPreview: "On-chain inference job",
    outputPreview: status === "settled" || status === "revealed" ? "Result stored on-chain" : undefined,
    isOnChain: true,
  };
}

export default function ExplorerPage() {
  const [mounted, setMounted] = useState(false);
  const [jobs, setJobs] = useState<ExplorerJob[]>([]);
  const [statusFilter, setStatusFilter] = useState<JobStatusType | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJob, setSelectedJob] = useState<ExplorerJob | null>(null);
  const [liveUpdates, setLiveUpdates] = useState(true);
  const [usingOnChain, setUsingOnChain] = useState(false);

  const { connected, publicKey, signTransaction, signAllTransactions } = useWallet();
  const { connection } = useConnection();
  const { config, explorerTxUrl, explorerAccountUrl } = useNetwork();

  const getAxiomClient = useCallback((): AxiomClient | null => {
    if (!connected || !publicKey || !signTransaction || !signAllTransactions) return null;
    const wallet = { publicKey, signTransaction, signAllTransactions };
    const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
    return new AxiomClient(provider);
  }, [connected, publicKey, signTransaction, signAllTransactions, connection]);

  // Initial data fetch
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);

    const fetchOnChainJobs = async () => {
      const client = getAxiomClient();
      if (client) {
        try {
          const onChainJobs = await client.getAllJobs();
          setJobs(onChainJobs.map(onChainJobToExplorer));
          setUsingOnChain(true);
        } catch {
          console.error("Failed to fetch jobs");
          setJobs([]);
          setUsingOnChain(false);
        }
      }
    };

    fetchOnChainJobs();
  }, [getAxiomClient]);

  // Simulate live updates (mock mode) or poll on-chain (real mode)
  useEffect(() => {
    if (!liveUpdates || !mounted) return;

    if (usingOnChain || !usingOnChain) {
      // Poll on-chain data
      const interval = setInterval(async () => {
        const client = getAxiomClient();
        if (client) {
          try {
            const onChainJobs = await client.getAllJobs();
            setJobs(onChainJobs.map(onChainJobToExplorer));
            setUsingOnChain(true);
          } catch {
            // Silently fail
          }
        }
      }, 5000); // Poll every 5s for on-chain
      return () => clearInterval(interval);
    }
  }, [liveUpdates, mounted, usingOnChain, getAxiomClient]);

  const filteredJobs = jobs.filter((job) => {
    if (statusFilter !== "all" && job.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        job.id.toLowerCase().includes(q) ||
        job.model.toLowerCase().includes(q) ||
        job.client.toLowerCase().includes(q) ||
        job.inputPreview.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const statusCounts = jobs.reduce(
    (acc, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  if (!mounted) return null;

  return (
    <main>
      <Navbar />
      <div className={styles.page}>
        <div className="container">
          {/* Header */}
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>Explorer</h1>
              <p className={styles.subtitle}>
                {usingOnChain
                  ? `Live on-chain jobs from Axiom ${config.label}`
                  : `Real-time view of all inference jobs on the Axiom network · ${config.label}`}
              </p>
            </div>
            <div className={styles.headerControls}>
              {usingOnChain && (
                <span style={{ fontSize: "0.7rem", color: "var(--sol-green)", marginRight: "12px" }}>
                  ● On-chain data
                </span>
              )}
              <button
                className={`${styles.liveBtn} ${liveUpdates ? styles.liveBtnActive : ""}`}
                onClick={() => setLiveUpdates(!liveUpdates)}
                id="live-toggle"
              >
                <div className={`${styles.liveDot} ${liveUpdates ? styles.liveDotActive : ""}`} />
                {liveUpdates ? "LIVE" : "PAUSED"}
              </button>
            </div>
          </div>

          {/* Status Filter Tabs */}
          <div className={styles.filterBar}>
            <div className={styles.statusFilters}>
              <button
                className={`${styles.filterBtn} ${statusFilter === "all" ? styles.filterBtnActive : ""}`}
                onClick={() => setStatusFilter("all")}
              >
                All ({jobs.length})
              </button>
              {STATUS_ORDER.map((s) => (
                <button
                  key={s}
                  className={`${styles.filterBtn} ${statusFilter === s ? styles.filterBtnActive : ""}`}
                  onClick={() => setStatusFilter(s)}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)} ({statusCounts[s] || 0})
                </button>
              ))}
            </div>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Search jobs, models, addresses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              id="explorer-search"
            />
          </div>

          {/* Jobs Feed */}
          <div className={styles.feed}>
            {jobs.length === 0 && (
              <>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className={styles.skeletonCard}>
                    <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
                    <div className={`${styles.skeletonLine} ${styles.skeletonLineMedium}`} />
                    <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} style={{ marginTop: 8 }} />
                  </div>
                ))}
              </>
            )}
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                className={`${styles.jobCard} ${selectedJob?.id === job.id ? styles.jobCardSelected : ""}`}
                onClick={() => setSelectedJob(selectedJob?.id === job.id ? null : job)}
                id={`explorer-job-${job.id}`}
              >
                <div className={styles.jobCardHeader}>
                  <div className={styles.jobCardLeft}>
                    <span className={`mono ${styles.jobCardId}`}>{job.id}</span>
                    <span className={styles.jobCardModel}>{job.model}</span>
                    {job.isOnChain && (
                      <span style={{ fontSize: "0.6rem", color: "var(--sol-green)", fontWeight: 600 }}>ON-CHAIN</span>
                    )}
                  </div>
                  <div className={styles.jobCardRight}>
                    <span className={`badge badge-${job.status}`}>{job.status}</span>
                    <span className={styles.jobCardTime}>
                      {job.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                <p className={styles.jobCardPrompt}>{job.inputPreview}</p>

                <div className={styles.jobCardFooter}>
                  <span className={`mono ${styles.jobCardBounty}`}>💰 {job.bounty} SOL</span>
                  <span className={`mono ${styles.jobCardClient}`}>
                    Client: {job.client.slice(0, 4)}...{job.client.slice(-4)}
                  </span>
                  {job.node && job.node !== "11111111111111111111111111111111" && (
                    <span className={`mono ${styles.jobCardNode}`}>
                      Node: {job.node.slice(0, 4)}...{job.node.slice(-4)}
                    </span>
                  )}
                </div>

                {/* Expanded details */}
                {selectedJob?.id === job.id && (
                  <div className={styles.jobExpanded}>
                    <div className={styles.expandedRow}>
                      <span className={styles.expandedLabel}>
                        {job.isOnChain ? "Account" : "Transaction"}
                      </span>
                      <a
                        href={job.isOnChain ? explorerAccountUrl(job.txHash) : explorerTxUrl(job.txHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.expandedLink}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {job.txHash.slice(0, 16)}...{job.txHash.slice(-8)}
                      </a>
                    </div>
                    <div className={styles.expandedRow}>
                      <span className={styles.expandedLabel}>Full Client Address</span>
                      <a
                        href={explorerAccountUrl(job.client)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.expandedLink}
                        onClick={(e) => e.stopPropagation()}
                        style={{ fontSize: "0.7rem", wordBreak: "break-all" }}
                      >
                        {job.client}
                      </a>
                    </div>
                    {job.outputPreview && (
                      <div className={styles.expandedRow}>
                        <span className={styles.expandedLabel}>Output Preview</span>
                        <span className={styles.expandedOutput}>{job.outputPreview}</span>
                      </div>
                    )}
                    <div className={styles.expandedRow}>
                      <span className={styles.expandedLabel}>Network</span>
                      <span style={{ color: config.color, fontWeight: 600 }}>{config.label}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
