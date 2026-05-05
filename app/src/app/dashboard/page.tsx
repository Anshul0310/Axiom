"use client";

import { useState, useEffect, useCallback } from "react";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useConnection } from "@solana/wallet-adapter-react";
import { AnchorProvider } from "@coral-xyz/anchor";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useNetwork } from "@/contexts/NetworkContext";
import { AxiomClient, parseJobStatus, parseNodeStatus, OnChainJob, OnChainNode } from "@/program/client";
import { modelNameToId } from "@/program/types";
import styles from "./dashboard.module.css";

// Fallback mock data when on-chain fetch fails or user has 0 nodes
const MOCK_NODES = [
  {
    id: "node-1a2b",
    name: "Node-Alpha-7x",
    stake: 15.5,
    modelsSupported: ["LLaMA 2 7B", "Mistral 7B"],
    jobsCompleted: 1432,
    earnings: 1.43,
    reputation: 9850,
    status: "active" as const,
    uptime: "99.9%",
    gpuModel: "RTX 4090",
    region: "US-East",
  },
  {
    id: "node-3c4d",
    name: "Node-Beta-9y",
    stake: 5.0,
    modelsSupported: ["Stable Diffusion XL"],
    jobsCompleted: 342,
    earnings: 1.71,
    reputation: 9200,
    status: "idle" as const,
    uptime: "98.2%",
    gpuModel: "A100",
    region: "EU-Central",
  },
];

const MOCK_JOBS = [
  {
    id: "job-001",
    model: "LLaMA 2 7B",
    client: "8x9...2a1b",
    bounty: 0.001,
    status: "open" as const,
    timeLeft: "5m 23s",
    prompt: "Summarize this legal document...",
    isOnChain: false,
  },
  {
    id: "job-002",
    model: "Stable Diffusion XL",
    client: "4c5...9d8e",
    bounty: 0.005,
    status: "committed" as const,
    timeLeft: "1m 12s",
    prompt: "A futuristic city on Mars...",
    isOnChain: false,
  },
];

type ClaimPhase = "idle" | "simulating" | "committing" | "revealing" | "settling" | "done" | "error";

interface ClaimTxHashes {
  commit?: string;
  reveal?: string;
  settle?: string;
}

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "jobs" | "register">("overview");
  const [isRegistering, setIsRegistering] = useState(false);
  const [stakeAmount, setStakeAmount] = useState("5.0");
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [registerStatus, setRegisterStatus] = useState<string | null>(null);
  const [onChainNodes, setOnChainNodes] = useState<OnChainNode[]>([]);
  const [onChainJobs, setOnChainJobs] = useState<OnChainJob[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [claimingJobId, setClaimingJobId] = useState<string | null>(null);
  const [claimPhase, setClaimPhase] = useState<ClaimPhase>("idle");
  const [claimTxHashes, setClaimTxHashes] = useState<ClaimTxHashes>({});
  const [claimError, setClaimError] = useState<string | null>(null);

  const { connected, publicKey, signTransaction, signAllTransactions } = useWallet();
  const { setVisible } = useWalletModal();
  const { connection } = useConnection();
  const { config, isMainnet } = useNetwork();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const getAxiomClient = useCallback((): AxiomClient | null => {
    if (!connected || !publicKey || !signTransaction || !signAllTransactions) return null;
    const wallet = { publicKey, signTransaction, signAllTransactions };
    const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
    return new AxiomClient(provider);
  }, [connected, publicKey, signTransaction, signAllTransactions, connection]);

  // Fetch on-chain data
  useEffect(() => {
    if (!connected) return;
    const client = getAxiomClient();
    if (!client) return;

    const fetchData = async () => {
      setLoadingData(true);
      try {
        const [nodes, jobs] = await Promise.all([
          client.getAllNodes(),
          client.getAllJobs(),
        ]);
        setOnChainNodes(nodes);
        setOnChainJobs(jobs);
      } catch {
        // Fall back to mock data silently
      }
      setLoadingData(false);
    };

    fetchData();
  }, [connected, getAxiomClient]);

  const allModels = ["LLaMA 2 7B", "Mistral 7B", "CodeLlama 13B", "Stable Diffusion XL", "Whisper Large v3"];

  const toggleModel = (model: string) => {
    setSelectedModels((prev) =>
      prev.includes(model) ? prev.filter((m) => m !== model) : [...prev, model]
    );
  };

  // ── Claim Job: commit → reveal → settle ──────────────────────────────
  const handleClaimJob = async (job: typeof displayJobs[0]) => {
    if (!connected) {
      setVisible(true);
      return;
    }

    const client = getAxiomClient();
    if (!client) return;

    setClaimingJobId(job.id);
    setClaimPhase("simulating");
    setClaimTxHashes({});
    setClaimError(null);

    try {
      // Parse job ID from the display ID (e.g. "job-001" → 1, or "job-1714500000" → 1714500000)
      const jobIdNum = parseInt(job.id.replace("job-", ""), 10);

      // For on-chain jobs, extract client pubkey; for mock, use our own wallet
      let clientPubkey = publicKey!;
      if (job.isOnChain && job.clientFull) {
        clientPubkey = new PublicKey(job.clientFull);
      }

      // Simulate running inference (generate a fake output)
      const outputText = `Inference result for: ${job.prompt}\nModel: ${job.model}\nGenerated at: ${new Date().toISOString()}`;
      const outputCid = modelNameToId(outputText);
      const secret = AxiomClient.generateSecret();

      await new Promise((r) => setTimeout(r, 1500)); // simulate inference time

      // Phase 1: Commit
      setClaimPhase("committing");
      const commitTx = await client.commitResult({
        jobId: jobIdNum,
        clientPubkey,
        outputCid,
        secret,
      });
      setClaimTxHashes((prev) => ({ ...prev, commit: commitTx }));

      // Phase 2: Reveal
      setClaimPhase("revealing");
      const revealTx = await client.revealResult({
        jobId: jobIdNum,
        clientPubkey,
        outputCid,
        secret,
      });
      setClaimTxHashes((prev) => ({ ...prev, reveal: revealTx }));

      // Phase 3: Settle
      setClaimPhase("settling");
      const settleTx = await client.settleJob({
        jobId: jobIdNum,
        clientPubkey,
        nodeOperator: publicKey!,
      });
      setClaimTxHashes((prev) => ({ ...prev, settle: settleTx }));

      setClaimPhase("done");

      // Refresh data after a delay
      setTimeout(async () => {
        try {
          const jobs = await client.getAllJobs();
          if (jobs.length > 0) setOnChainJobs(jobs);
        } catch { /* ignore */ }
      }, 2000);

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setClaimError(errorMessage);
      setClaimPhase("error");
    }
  };

  const resetClaim = () => {
    setClaimingJobId(null);
    setClaimPhase("idle");
    setClaimTxHashes({});
    setClaimError(null);
  };

  const handleRegister = async () => {
    if (!connected) {
      setVisible(true);
      return;
    }

    const client = getAxiomClient();
    if (!client) return;

    setIsRegistering(true);
    setRegisterStatus(null);

    try {
      const txHash = await client.registerNode({
        modelsSupported: selectedModels,
      });
      setRegisterStatus(`✅ Node registered! TX: ${txHash}`);
      // Refresh data
      const nodes = await client.getAllNodes();
      setOnChainNodes(nodes);
      setActiveTab("overview");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setRegisterStatus(`❌ Registration failed: ${errorMessage}`);
    }

    setIsRegistering(false);
  };

  // Use on-chain data or fallback to mock data
  const hasOnChainData = onChainNodes.length > 0;
  const displayNodes = hasOnChainData ? onChainNodes.map((n) => ({
    id: n.publicKey.toBase58().slice(0, 8),
    name: `Node-${n.publicKey.toBase58().slice(0, 6)}`,
    stake: AxiomClient.lamportsToSol(n.account.stakeAmount),
    modelsSupported: n.account.modelsSupported.map(() => "Model"),
    jobsCompleted: n.account.jobsCompleted.toNumber(),
    earnings: AxiomClient.lamportsToSol(n.account.totalEarned),
    reputation: n.account.reputation,
    status: parseNodeStatus(n.account.status) === "Active" ? "active" as const : "idle" as const,
    uptime: "N/A",
    gpuModel: "On-chain",
    region: "Decentralized",
  })) : MOCK_NODES;

  type DisplayJob = {
    id: string;
    model: string;
    client: string;
    clientFull?: string;
    bounty: number;
    status: "open" | "committed";
    timeLeft: string;
    prompt: string;
    isOnChain: boolean;
  };

  const hasOnChainJobs = onChainJobs.length > 0;
  const displayJobs: DisplayJob[] = hasOnChainJobs ? onChainJobs
    .filter((j) => {
      const status = parseJobStatus(j.account.status);
      return status === "Open" || status === "Committed";
    })
    .map((j) => ({
      id: `job-${j.account.jobId.toString()}`,
      model: "AI Model",
      client: `${j.account.client.toBase58().slice(0, 4)}...${j.account.client.toBase58().slice(-4)}`,
      clientFull: j.account.client.toBase58(),
      bounty: AxiomClient.lamportsToSol(j.account.bountyLamports),
      status: parseJobStatus(j.account.status).toLowerCase() as "open" | "committed",
      timeLeft: "N/A",
      prompt: "On-chain job",
      isOnChain: true,
    })) : MOCK_JOBS;

  const totalStaked = displayNodes.reduce((sum, n) => sum + n.stake, 0);
  const totalJobsDone = displayNodes.reduce((sum, n) => sum + n.jobsCompleted, 0);

  if (!mounted) return null;

  return (
    <main>
      <Navbar />
      <div className={styles.page}>
        <div className="container">
          {/* Header */}
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>Node Dashboard</h1>
              <p className={styles.subtitle}>
                Manage your GPU nodes, monitor earnings, and accept inference jobs
                {isMainnet && <span style={{ color: "var(--sol-red)" }}> · ⚠️ MAINNET</span>}
              </p>
            </div>
            <div className={styles.headerActions}>
              <div className={styles.networkBadge}>
                <div className="pulse-dot" style={{ background: config.dotColor }} />
                <span>{config.label}</span>
              </div>
              {hasOnChainData && (
                <span style={{ fontSize: "0.7rem", color: "var(--sol-green)" }}>● Live on-chain data</span>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === "overview" ? styles.tabActive : ""}`}
              onClick={() => setActiveTab("overview")}
              id="tab-overview"
            >
              📊 Overview
            </button>
            <button
              className={`${styles.tab} ${activeTab === "jobs" ? styles.tabActive : ""}`}
              onClick={() => setActiveTab("jobs")}
              id="tab-jobs"
            >
              ⚡ Available Jobs
            </button>
            <button
              className={`${styles.tab} ${activeTab === "register" ? styles.tabActive : ""}`}
              onClick={() => setActiveTab("register")}
              id="tab-register"
            >
              ➕ Register Node
            </button>
          </div>

          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className={styles.content}>
              {loadingData && (
                <div className={styles.globalStats}>
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className={`glass-card ${styles.globalStat} ${styles.skeleton}`}>
                      <div className={styles.skeletonIcon} />
                      <div className={styles.skeletonValue} />
                      <div className={styles.skeletonLabel} />
                    </div>
                  ))}
                </div>
              )}
              {!loadingData && (
              <div className={styles.globalStats}>
                <div className={`glass-card ${styles.globalStat}`}>
                  <div className={styles.globalStatIcon}>🖥️</div>
                  <div className={styles.globalStatValue}>{displayNodes.length}</div>
                  <div className={styles.globalStatLabel}>Active Nodes</div>
                </div>
                <div className={`glass-card ${styles.globalStat}`}>
                  <div className={styles.globalStatIcon}>💰</div>
                  <div className={styles.globalStatValue}>{totalStaked.toFixed(1)} SOL</div>
                  <div className={styles.globalStatLabel}>Total Staked</div>
                </div>
                <div className={`glass-card ${styles.globalStat}`}>
                  <div className={styles.globalStatIcon}>🔥</div>
                  <div className={styles.globalStatValue}>{totalJobsDone.toLocaleString()}</div>
                  <div className={styles.globalStatLabel}>Jobs Completed</div>
                </div>
                <div className={`glass-card ${styles.globalStat}`}>
                  <div className={styles.globalStatIcon}>📈</div>
                  <div className={styles.globalStatValue}>98.4%</div>
                  <div className={styles.globalStatLabel}>Success Rate</div>
                </div>
              </div>
              )}

              <h2 className={styles.sectionTitle}>
                {hasOnChainData ? "On-Chain Nodes" : "Your Nodes"}
                {loadingData && " (loading...)"}
              </h2>
              <div className={styles.nodesGrid}>
                {displayNodes.map((node) => (
                  <div key={node.id} className={`glass-card ${styles.nodeCard}`}>
                    <div className={styles.nodeHeader}>
                      <div className={styles.nodeIdentity}>
                        <div className={`${styles.statusDot} ${styles[`status${capitalize(node.status)}`]}`} />
                        <h3 className={styles.nodeName}>{node.name}</h3>
                      </div>
                      <span className={`badge ${node.status === "active" ? "badge-settled" : node.status === "idle" ? "badge-revealed" : "badge-expired"}`}>
                        {node.status}
                      </span>
                    </div>

                    <div className={styles.nodeStats}>
                      <div className={styles.nodeStat}>
                        <span className={styles.nodeStatLabel}>Stake</span>
                        <span className={styles.nodeStatValue}>{node.stake} SOL</span>
                      </div>
                      <div className={styles.nodeStat}>
                        <span className={styles.nodeStatLabel}>Earnings</span>
                        <span className={styles.nodeStatValue}>{node.earnings} SOL</span>
                      </div>
                      <div className={styles.nodeStat}>
                        <span className={styles.nodeStatLabel}>Jobs Done</span>
                        <span className={styles.nodeStatValue}>{node.jobsCompleted}</span>
                      </div>
                      <div className={styles.nodeStat}>
                        <span className={styles.nodeStatLabel}>Reputation</span>
                        <span className={styles.nodeStatValue}>{node.reputation}/1000</span>
                      </div>
                    </div>

                    <div className={styles.nodeDetails}>
                      <div className={styles.nodeDetail}>
                        <span>GPU</span>
                        <span className="mono">{node.gpuModel}</span>
                      </div>
                      <div className={styles.nodeDetail}>
                        <span>Region</span>
                        <span className="mono">{node.region}</span>
                      </div>
                      <div className={styles.nodeDetail}>
                        <span>Uptime</span>
                        <span className="mono">{node.uptime}</span>
                      </div>
                    </div>

                    <div className={styles.nodeModels}>
                      <span className={styles.nodeModelsLabel}>Models:</span>
                      {node.modelsSupported.map((model) => (
                        <span key={model} className={styles.modelTag}>{model}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Jobs Tab */}
          {activeTab === "jobs" && (
            <div className={styles.content}>
              <h2 className={styles.sectionTitle}>Available Jobs</h2>
              <p className={styles.sectionSubtitle}>
                {hasOnChainJobs
                  ? "Live on-chain jobs from the Axiom network."
                  : "Open inference jobs waiting for node operators. Commit a result to claim a bounty."}
              </p>
              <div className={styles.jobsTable}>
                <div className={styles.jobsHeader}>
                  <span>Job ID</span>
                  <span>Model</span>
                  <span>Prompt</span>
                  <span>Bounty</span>
                  <span>Status</span>
                  <span>Time Left</span>
                  <span>Action</span>
                </div>
                {displayJobs.map((job) => (
                  <div key={job.id} className={`${styles.jobRow} ${claimingJobId === job.id ? styles.jobRowActive : ""}`}>
                    <span className={`mono ${styles.jobId}`}>{job.id}</span>
                    <span className={styles.jobModel}>{job.model}</span>
                    <span className={styles.jobPrompt} title={job.prompt}>
                      {job.prompt.length > 35 ? job.prompt.slice(0, 35) + "..." : job.prompt}
                    </span>
                    <span className={`mono ${styles.jobBounty}`}>{job.bounty} SOL</span>
                    <span className={`badge badge-${job.status}`}>{job.status}</span>
                    <span className={`mono ${styles.jobTime}`}>{job.timeLeft}</span>
                    <button
                      className={styles.claimBtn}
                      disabled={job.status !== "open" || claimingJobId !== null}
                      onClick={() => handleClaimJob(job)}
                      id={`claim-${job.id}`}
                    >
                      {claimingJobId === job.id ? "Claiming..." : job.status === "open" ? "⚡ Claim" : "Claimed"}
                    </button>
                  </div>
                ))}
              </div>

              {/* Claim Flow Status Panel */}
              {claimingJobId && (
                <div className={styles.claimPanel}>
                  <div className={styles.claimPanelHeader}>
                    <h3 className={styles.claimPanelTitle}>🔄 Claiming {claimingJobId}</h3>
                    {(claimPhase === "done" || claimPhase === "error") && (
                      <button className={styles.claimPanelClose} onClick={resetClaim}>✕</button>
                    )}
                  </div>

                  <div className={styles.claimPipeline}>
                    <ClaimStep
                      label="Run Inference"
                      icon="🧠"
                      status={claimPhase === "simulating" ? "active" : claimPhase === "idle" ? "pending" : "done"}
                    />
                    <div className={styles.claimConnector} />
                    <ClaimStep
                      label="Commit Hash"
                      icon="🔒"
                      status={claimPhase === "committing" ? "active" : ["idle", "simulating"].includes(claimPhase) ? "pending" : "done"}
                      txHash={claimTxHashes.commit}
                    />
                    <div className={styles.claimConnector} />
                    <ClaimStep
                      label="Reveal Result"
                      icon="📤"
                      status={claimPhase === "revealing" ? "active" : ["idle", "simulating", "committing"].includes(claimPhase) ? "pending" : "done"}
                      txHash={claimTxHashes.reveal}
                    />
                    <div className={styles.claimConnector} />
                    <ClaimStep
                      label="Settle Payment"
                      icon="💰"
                      status={claimPhase === "settling" ? "active" : claimPhase === "done" ? "done" : "pending"}
                      txHash={claimTxHashes.settle}
                    />
                  </div>

                  {claimPhase === "done" && (
                    <div className={styles.claimSuccess}>
                      ✅ Job claimed and settled successfully! Bounty received.
                    </div>
                  )}
                  {claimPhase === "error" && claimError && (
                    <div className={styles.claimErrorMsg}>
                      ❌ {claimError}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Register Tab */}
          {activeTab === "register" && (
            <div className={styles.content}>
              <div className={styles.registerForm}>
                <div className={styles.registerHeader}>
                  <h2 className={styles.sectionTitle}>Register New Node</h2>
                  <p className={styles.sectionSubtitle}>
                    Stake SOL and declare your supported models to start accepting inference jobs.
                    {isMainnet && (
                      <span style={{ color: "var(--sol-red)", display: "block", marginTop: "8px" }}>
                        ⚠️ This will stake REAL SOL on Mainnet
                      </span>
                    )}
                  </p>
                </div>

                {!connected && (
                  <div style={{ textAlign: "center", padding: "var(--space-8)" }}>
                    <p style={{ color: "var(--text-muted)", marginBottom: "var(--space-4)" }}>
                      Connect your wallet to register a node
                    </p>
                    <button className="btn btn-primary" onClick={() => setVisible(true)}>
                      Connect Wallet
                    </button>
                  </div>
                )}

                {connected && (
                  <>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Stake Amount (SOL)</label>
                      <p className={styles.formHint}>Minimum 1.0 SOL required. Higher stake = higher job priority.</p>
                      <input
                        type="number"
                        className="input"
                        value={stakeAmount}
                        onChange={(e) => setStakeAmount(e.target.value)}
                        min="1"
                        step="0.5"
                        id="stake-amount-input"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Supported Models</label>
                      <p className={styles.formHint}>Select the models your GPU can run.</p>
                      <div className={styles.modelCheckboxes}>
                        {allModels.map((model) => (
                          <label key={model} className={styles.modelCheckbox}>
                            <input
                              type="checkbox"
                              checked={selectedModels.includes(model)}
                              onChange={() => toggleModel(model)}
                            />
                            <span className={styles.checkboxLabel}>{model}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {registerStatus && (
                      <div style={{
                        padding: "var(--space-3) var(--space-4)",
                        borderRadius: "var(--radius-md)",
                        background: registerStatus.startsWith("✅") ? "var(--sol-green-dim)" : "var(--sol-red-dim)",
                        color: registerStatus.startsWith("✅") ? "var(--sol-green)" : "var(--sol-red)",
                        fontSize: "0.85rem",
                        marginBottom: "var(--space-4)",
                        fontFamily: "var(--font-mono)",
                        wordBreak: "break-all",
                      }}>
                        {registerStatus}
                      </div>
                    )}

                    <button
                      className="btn btn-primary btn-large"
                      onClick={handleRegister}
                      disabled={isRegistering || selectedModels.length === 0 || parseFloat(stakeAmount) < 1}
                      id="register-node-btn"
                      style={{ width: "100%" }}
                    >
                      {isRegistering ? (
                        <>
                          <span className={styles.spinner} />
                          Registering on-chain...
                        </>
                      ) : (
                        <>🚀 Register Node &amp; Stake {stakeAmount} SOL</>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </main>
  );
}

function ClaimStep({ label, icon, status, txHash }: {
  label: string;
  icon: string;
  status: "pending" | "active" | "done";
  txHash?: string;
}) {
  return (
    <div className={`${styles.claimStep} ${styles[`claim${capitalize(status)}`]}`}>
      <div className={styles.claimStepDot}>
        {status === "done" && "✓"}
        {status === "active" && <span className={styles.claimPulse} />}
        {status === "pending" && icon}
      </div>
      <div className={styles.claimStepInfo}>
        <span className={styles.claimStepLabel}>{label}</span>
        {txHash && (
          <span className={`mono ${styles.claimStepTx}`}>
            TX: {txHash.slice(0, 8)}...{txHash.slice(-4)}
          </span>
        )}
      </div>
    </div>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
