"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useConnection } from "@solana/wallet-adapter-react";
import { AnchorProvider } from "@coral-xyz/anchor";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useNetwork } from "@/contexts/NetworkContext";
import { AxiomClient } from "@/program/client";
import { SUPPORTED_MODELS } from "@/program/types";
import styles from "./playground.module.css";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  txHash?: string;
  model?: string;
  cost?: string;
  latency?: string;
}

interface ModelOption {
  id: string;
  name: string;
  type: "Text" | "Image" | "Code";
  costPerJob: string;
  avgLatency: string;
  icon: string;
}

const MODELS: ModelOption[] = SUPPORTED_MODELS.map((m) => ({
  id: m.id,
  name: m.name,
  type: m.type,
  costPerJob: String(m.costPerJob),
  avgLatency: m.avgLatency,
  icon: m.icon,
}));

// Simulated AI responses for demo
const SIMULATED_RESPONSES: Record<string, string[]> = {
  "llama-2-7b": [
    "Based on my analysis, here's a comprehensive overview:\n\nSolana's architecture enables high-throughput transaction processing through its unique Proof of History consensus mechanism, achieving over 65,000 TPS with sub-second finality. This makes it ideal for micro-payment use cases like decentralized AI inference.",
    "Here's my response:\n\nThe decentralized AI inference marketplace represents a paradigm shift in how computational resources are allocated. By leveraging blockchain technology, we can create trustless, permissionless systems where GPU operators are incentivized to provide honest computation.",
    "Let me break this down for you:\n\nSmart contracts on Solana provide the perfect settlement layer for AI inference jobs. The commit-reveal scheme ensures that node operators cannot copy each other's work, while staking/slashing mechanisms provide economic security.",
  ],
  "codellama-13b": [
    "```typescript\nimport { Connection, PublicKey } from '@solana/web3.js';\nimport { AnchorProvider, Program } from '@coral-xyz/anchor';\n\nasync function postInferenceJob() {\n  const connection = new Connection('https://api.devnet.solana.com');\n  const provider = AnchorProvider.env();\n  // ... job posting logic\n}\n```\n\nThis code demonstrates how to interact with the Axiom smart contract to post inference jobs on-chain.",
    "```python\nimport torch\nfrom transformers import AutoModelForCausalLM, AutoTokenizer\n\ndef run_inference(prompt: str) -> str:\n    model = AutoModelForCausalLM.from_pretrained('codellama/CodeLlama-13b-hf')\n    tokenizer = AutoTokenizer.from_pretrained('codellama/CodeLlama-13b-hf')\n    inputs = tokenizer(prompt, return_tensors='pt')\n    outputs = model.generate(**inputs, max_length=512)\n    return tokenizer.decode(outputs[0])\n```",
  ],
  "stable-diff-xl": [
    "🖼️ Image generated successfully!\n\nResolution: 1024×1024\nSteps: 50\nGuidance Scale: 7.5\nSeed: 42\n\nThe generated image has been stored on IPFS with CID: QmX7h4K9J2...\n\nYou can view the on-chain proof of this inference at the transaction hash below.",
  ],
  "mistral-7b": [
    "Certainly! Here's my analysis:\n\nDecentralized AI inference offers several key advantages:\n\n1. **Cost Efficiency** — By creating a competitive marketplace, inference costs can be 10-100x cheaper than centralized providers.\n\n2. **Censorship Resistance** — No single entity can block or filter AI requests.\n\n3. **Privacy** — Input data can be encrypted and processed without revealing contents to node operators.\n\n4. **Verifiability** — On-chain proofs ensure honest computation.",
  ],
  "whisper-large": [
    "📝 Transcription complete!\n\nDuration: 3m 42s\nLanguage: English (detected)\nConfidence: 98.7%\n\n---\n\n\"Welcome to the Axiom demo. Today we'll be showcasing how decentralized AI inference works on Solana. As you can see, jobs are posted on-chain with micro-bounties, and GPU node operators compete to fulfill them...\"",
  ],
};

type JobPhase = "idle" | "posting" | "committed" | "revealed" | "settled";

export default function PlaygroundPage() {
  const [mounted, setMounted] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelOption>(MODELS[0]);
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [phase, setPhase] = useState<JobPhase>("idle");
  const [showModelPicker, setShowModelPicker] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { connected, publicKey, signTransaction, signAllTransactions } = useWallet();
  const { setVisible } = useWalletModal();
  const { connection } = useConnection();
  const { config, isMainnet, explorerTxUrl } = useNetwork();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    setMessages([
      {
        id: "sys-1",
        role: "system",
        content: `Connected to Axiom ${config.label}. Select a model and submit a prompt to run decentralized AI inference. Your job will be posted on-chain with a SOL micro-bounty.`,
        timestamp: new Date(),
      },
    ]);
  }, [config.label]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getAxiomClient = useCallback((): AxiomClient | null => {
    if (!connected || !publicKey || !signTransaction || !signAllTransactions) return null;
    const wallet = { publicKey, signTransaction, signAllTransactions };
    const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
    return new AxiomClient(provider);
  }, [connected, publicKey, signTransaction, signAllTransactions, connection]);

  const handleSubmit = async () => {
    if (!prompt.trim() || phase !== "idle") return;

    // Require wallet connection
    if (!connected) {
      setVisible(true);
      return;
    }

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: prompt,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    const currentPrompt = prompt;
    setPrompt("");

    const client = getAxiomClient();
    const jobId = Math.floor(Date.now() / 1000);
    let realTxHash: string | null = null;

    // Phase 1: Posting
    setPhase("posting");
    const postMsg: Message = {
      id: `sys-post-${Date.now()}`,
      role: "system",
      content: `📡 Posting job to Axiom ${config.label}...\nModel: ${selectedModel.name}\nBounty: ${selectedModel.costPerJob} SOL\nDeadline: 30 seconds\n${isMainnet ? "⚠️ MAINNET — This will use REAL SOL" : ""}`,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, postMsg]);

    // Try real on-chain transaction
    if (client) {
      try {
        realTxHash = await client.postJob({
          jobId,
          modelId: selectedModel.id,
          inputCid: currentPrompt,
          bountyLamports: AxiomClient.solToLamports(parseFloat(selectedModel.costPerJob)),
          deadlineSeconds: 300, // 5 mins to claim
        });

        const txConfirmMsg: Message = {
          id: `sys-txconfirm-${Date.now()}`,
          role: "system",
          content: `✅ Job posted on-chain!\nTX: ${realTxHash}\n\n⏳ Waiting for an Axiom Node Operator to claim and process your job...\n(💡 Tip: Open the Dashboard in a new tab to register a node and manually claim this job!)`,
          timestamp: new Date(),
          txHash: realTxHash,
        };
        setMessages((prev) => [...prev, txConfirmMsg]);

        // Poll job status
        let isSettled = false;
        let lastPhase = "posting";
        while (!isSettled && publicKey) {
          await sleep(3000); // check every 3s
          const job = await client.getJob(publicKey, jobId);
          if (!job) continue;

          const currentStatusStr = Object.keys(job.status)[0]; // e.g. "open", "committed", "revealed", "settled"
          
          if (currentStatusStr === "committed" && lastPhase !== "committed") {
            setPhase("committed");
            lastPhase = "committed";
            setMessages((prev) => [...prev, {
              id: `sys-commit-${Date.now()}`,
              role: "system",
              content: `🔒 A node operator committed a result hash.`,
              timestamp: new Date(),
            }]);
          } else if (currentStatusStr === "revealed" && lastPhase !== "revealed") {
            setPhase("revealed");
            lastPhase = "revealed";
            setMessages((prev) => [...prev, {
              id: `sys-reveal-${Date.now()}`,
              role: "system",
              content: `✅ Result revealed and verified on-chain.`,
              timestamp: new Date(),
            }]);
          } else if (currentStatusStr === "settled" && lastPhase !== "settled") {
            setPhase("settled");
            lastPhase = "settled";
            isSettled = true;
            
            // Show AI response mock when settled (since real AI worker isn't running)
            const responses = SIMULATED_RESPONSES[selectedModel.id] || SIMULATED_RESPONSES["llama-2-7b"];
            const response = responses[Math.floor(Math.random() * responses.length)];
            const latencyMs = (parseFloat(selectedModel.avgLatency) * 1000 + Math.random() * 500).toFixed(0);

            const assistantMsg: Message = {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              content: response,
              timestamp: new Date(),
              model: selectedModel.name,
              cost: selectedModel.costPerJob,
              latency: `${latencyMs}ms`,
            };
            setMessages((prev) => [...prev, assistantMsg]);

            const settleMsg: Message = {
              id: `sys-settle-${Date.now()}`,
              role: "system",
              content: `💰 Job settled — ${selectedModel.costPerJob} SOL paid to node operator.`,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, settleMsg]);
          }
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        const errorMsg: Message = {
          id: `sys-error-${Date.now()}`,
          role: "system",
          content: `⚠️ On-chain transaction failed: ${errorMessage}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    }

    setPhase("idle");
  };

  if (!mounted) return null;

  return (
    <main>
      <Navbar />
      <div className={styles.page}>
        {/* Sidebar — Model picker + stats */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarSection}>
            <h3 className={styles.sidebarTitle}>Model</h3>
            <button
              className={styles.modelSelector}
              onClick={() => setShowModelPicker(!showModelPicker)}
              id="model-selector-btn"
            >
              <span className={styles.modelIcon}>{selectedModel.icon}</span>
              <div className={styles.modelInfo}>
                <span className={styles.modelName}>{selectedModel.name}</span>
                <span className={styles.modelType}>{selectedModel.type}</span>
              </div>
              <span className={styles.chevron}>{showModelPicker ? "▲" : "▼"}</span>
            </button>

            {showModelPicker && (
              <div className={styles.modelDropdown}>
                {MODELS.map((model) => (
                  <button
                    key={model.id}
                    className={`${styles.modelOption} ${model.id === selectedModel.id ? styles.modelOptionActive : ""}`}
                    onClick={() => {
                      setSelectedModel(model);
                      setShowModelPicker(false);
                    }}
                    id={`model-option-${model.id}`}
                  >
                    <span className={styles.modelIcon}>{model.icon}</span>
                    <div className={styles.modelOptionInfo}>
                      <span className={styles.modelName}>{model.name}</span>
                      <span className={styles.modelMeta}>
                        {model.costPerJob} SOL · {model.avgLatency}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className={styles.sidebarSection}>
            <h3 className={styles.sidebarTitle}>Job Stats</h3>
            <div className={styles.statsList}>
              <div className={styles.statRow}>
                <span className={styles.statLabel}>Cost per job</span>
                <span className={styles.statValue}>{selectedModel.costPerJob} SOL</span>
              </div>
              <div className={styles.statRow}>
                <span className={styles.statLabel}>Avg latency</span>
                <span className={styles.statValue}>{selectedModel.avgLatency}</span>
              </div>
              <div className={styles.statRow}>
                <span className={styles.statLabel}>Active nodes</span>
                <span className={styles.statValue}>12</span>
              </div>
              <div className={styles.statRow}>
                <span className={styles.statLabel}>Network</span>
                <span
                  className="badge badge-open"
                  style={{ color: config.color, borderColor: config.color }}
                >
                  {config.label.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          <div className={styles.sidebarSection}>
            <h3 className={styles.sidebarTitle}>Pipeline</h3>
            <div className={styles.pipeline}>
              <PipelineStep label="Post Job" status={phase === "posting" ? "active" : phase === "idle" ? "pending" : "done"} />
              <div className={styles.pipelineConnector} />
              <PipelineStep label="Commit" status={phase === "committed" ? "active" : ["idle", "posting"].includes(phase) ? "pending" : "done"} />
              <div className={styles.pipelineConnector} />
              <PipelineStep label="Reveal" status={phase === "revealed" ? "active" : ["idle", "posting", "committed"].includes(phase) ? "pending" : "done"} />
              <div className={styles.pipelineConnector} />
              <PipelineStep label="Settle" status={phase === "settled" ? "active" : phase === "idle" ? "pending" : "pending"} />
            </div>
          </div>

          {/* Wallet status */}
          {!connected && (
            <div className={styles.sidebarSection}>
              <div className={styles.walletWarning}>
                <span>🔗</span>
                <span>Connect wallet for on-chain transactions</span>
              </div>
            </div>
          )}
        </aside>

        {/* Main chat area */}
        <section className={styles.chatArea}>
          <div className={styles.chatHeader}>
            <div className={styles.chatHeaderLeft}>
              <div className="pulse-dot" style={{ background: config.dotColor }} />
              <h2 className={styles.chatTitle}>Inference Playground</h2>
            </div>
            <span className={styles.chatSubtitle}>
              Powered by Axiom Protocol · {config.label}
              {isMainnet && " ⚠️ REAL SOL"}
            </span>
          </div>

          <div className={styles.chatMessages} id="chat-messages">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`${styles.message} ${styles[`message${capitalize(msg.role)}`]}`}
              >
                {msg.role === "system" && (
                  <div className={styles.systemMessage}>
                    <pre className={styles.systemText}>{msg.content}</pre>
                    {msg.txHash && (
                      <a
                        href={explorerTxUrl(msg.txHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.txLink}
                      >
                        View on Explorer →
                      </a>
                    )}
                  </div>
                )}
                {msg.role === "user" && (
                  <div className={styles.userMessage}>
                    <div className={styles.messageAvatar}>You</div>
                    <div className={styles.messageBubble}>
                      <p>{msg.content}</p>
                    </div>
                  </div>
                )}
                {msg.role === "assistant" && (
                  <div className={styles.assistantMessage}>
                    <div className={styles.messageAvatarAI}>{selectedModel.icon}</div>
                    <div className={styles.messageBubbleAI}>
                      <div className={styles.aiHeader}>
                        <span className={styles.aiModel}>{msg.model}</span>
                        <div className={styles.aiMeta}>
                          <span className={styles.aiCost}>💰 {msg.cost} SOL</span>
                          <span className={styles.aiLatency}>⚡ {msg.latency}</span>
                        </div>
                      </div>
                      <div className={styles.aiContent}>
                        <pre>{msg.content}</pre>
                      </div>
                      {msg.txHash && (
                        <div className={styles.txProof}>
                          <span>🔗 On-chain proof:</span>
                          <a
                            href={explorerTxUrl(msg.txHash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.txLink}
                          >
                            {msg.txHash.slice(0, 12)}...{msg.txHash.slice(-8)}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {phase !== "idle" && (
              <div className={styles.processingIndicator}>
                <div className={styles.processingDots}>
                  <span />
                  <span />
                  <span />
                </div>
                <span className={styles.processingLabel}>
                  {phase === "posting" && "Posting job on-chain..."}
                  {phase === "committed" && "Node committing result..."}
                  {phase === "revealed" && "Verifying reveal..."}
                  {phase === "settled" && "Settling payment..."}
                </span>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          <div className={styles.chatInput}>
            <div className={styles.inputWrapper}>
              <textarea
                className={styles.promptInput}
                placeholder={
                  connected
                    ? `Send a prompt to ${selectedModel.name}...`
                    : "Connect your wallet first..."
                }
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                disabled={phase !== "idle"}
                id="prompt-input"
              />
              <button
                className={styles.sendBtn}
                onClick={handleSubmit}
                disabled={!prompt.trim() || phase !== "idle"}
                id="send-btn"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 2L11 13" />
                  <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                </svg>
              </button>
            </div>
            <p className={styles.inputHint}>
              Press Enter to send · Shift+Enter for new line ·{" "}
              {isMainnet
                ? "⚠️ MAINNET — Real SOL transactions"
                : `Jobs on ${config.label}`}
            </p>
          </div>
        </section>
      </div>
      <Footer />
    </main>
  );
}

function PipelineStep({ label, status }: { label: string; status: "pending" | "active" | "done" }) {
  return (
    <div className={`${styles.pipelineStep} ${styles[`pipeline${capitalize(status)}`]}`}>
      <div className={styles.pipelineDot}>
        {status === "done" && "✓"}
        {status === "active" && <span className={styles.pipelinePulse} />}
      </div>
      <span className={styles.pipelineLabel}>{label}</span>
    </div>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
