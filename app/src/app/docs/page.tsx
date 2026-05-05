"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import styles from "./docs.module.css";

type DocSection = "overview" | "architecture" | "sdk" | "smart-contract" | "economics" | "roadmap";

interface NavItem {
  id: DocSection;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "Overview", icon: "📖" },
  { id: "architecture", label: "Architecture", icon: "🏗️" },
  { id: "sdk", label: "SDK Reference", icon: "📦" },
  { id: "smart-contract", label: "Smart Contract", icon: "📜" },
  { id: "economics", label: "Economics", icon: "💰" },
  { id: "roadmap", label: "Roadmap", icon: "🗺️" },
];

export default function DocsPage() {
  const [mounted, setMounted] = useState(false);
  const [activeSection, setActiveSection] = useState<DocSection>("overview");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <main>
      <Navbar />
      <div className={styles.page}>
        {/* Sidebar nav */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <h3 className={styles.sidebarTitle}>Documentation</h3>
            <span className={styles.version}>v0.1.0-devnet</span>
          </div>
          <nav className={styles.sidebarNav}>
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                className={`${styles.sidebarLink} ${activeSection === item.id ? styles.sidebarLinkActive : ""}`}
                onClick={() => setActiveSection(item.id)}
                id={`doc-nav-${item.id}`}
              >
                <span className={styles.sidebarIcon}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content area */}
        <section className={styles.content}>
          {activeSection === "overview" && <OverviewSection />}
          {activeSection === "architecture" && <ArchitectureSection />}
          {activeSection === "sdk" && <SdkSection />}
          {activeSection === "smart-contract" && <SmartContractSection />}
          {activeSection === "economics" && <EconomicsSection />}
          {activeSection === "roadmap" && <RoadmapSection />}
        </section>
      </div>
      <Footer />
    </main>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Section Components
   ═══════════════════════════════════════════════════════════════════════════ */

function OverviewSection() {
  return (
    <div className={styles.docSection}>
      <h1 className={styles.docTitle}>What is Axiom?</h1>
      <p className={styles.docLead}>
        Axiom is a <strong>decentralized AI inference marketplace</strong> built on Solana.
        Think of it as <em>Uber for GPU compute</em> — GPU owners earn SOL by running AI models,
        and developers get cheap, verifiable inference without trusting a centralized provider.
      </p>

      <div className={styles.highlightBox}>
        <div className={styles.highlightIcon}>💡</div>
        <div>
          <strong>The Core Idea:</strong> Instead of paying OpenAI $0.01 per request, you post a bounty
          of 0.001 SOL (~$0.15) on-chain. GPU nodes race to complete your job. Solana&apos;s smart contract
          handles payment, verification, and dispute resolution automatically.
        </div>
      </div>

      <h2 className={styles.docH2}>The Problem</h2>
      <p className={styles.docText}>
        Centralized AI inference is expensive, censored, and opaque. You don&apos;t know if the provider
        actually ran your model, you can&apos;t verify the output, and you&apos;re at the mercy of their
        pricing and availability.
      </p>

      <h2 className={styles.docH2}>The Solution</h2>
      <div className={styles.solutionGrid}>
        <div className={styles.solutionCard}>
          <span className={styles.solutionEmoji}>⚡</span>
          <h3>Sub-second Settlement</h3>
          <p>Solana confirms in 400ms. Micro-payments that would be eaten by ETH gas fees work perfectly here.</p>
        </div>
        <div className={styles.solutionCard}>
          <span className={styles.solutionEmoji}>🔐</span>
          <h3>Trustless Verification</h3>
          <p>Commit-reveal scheme + random spot-checks ensure honest computation without re-running every job.</p>
        </div>
        <div className={styles.solutionCard}>
          <span className={styles.solutionEmoji}>💎</span>
          <h3>Economic Security</h3>
          <p>Nodes stake SOL as collateral. Cheating = slashing. The math makes honesty the dominant strategy.</p>
        </div>
        <div className={styles.solutionCard}>
          <span className={styles.solutionEmoji}>🌍</span>
          <h3>Permissionless Access</h3>
          <p>Anyone with a GPU can be a provider. Anyone with SOL can request inference. No KYC, no gatekeeping.</p>
        </div>
      </div>

      <h2 className={styles.docH2}>Key Participants</h2>
      <div className={styles.participantsTable}>
        <div className={styles.participantRow}>
          <div className={styles.participantRole}>
            <span className={styles.roleEmoji}>👨‍💻</span>
            <strong>Requestors</strong>
          </div>
          <p>Developers or dApps that need AI inference. They post jobs with prompts and bounties.</p>
        </div>
        <div className={styles.participantRow}>
          <div className={styles.participantRole}>
            <span className={styles.roleEmoji}>🖥️</span>
            <strong>Node Operators</strong>
          </div>
          <p>GPU owners who stake SOL, register supported models, and earn bounties by running inference.</p>
        </div>
        <div className={styles.participantRow}>
          <div className={styles.participantRole}>
            <span className={styles.roleEmoji}>🔍</span>
            <strong>Verifiers</strong>
          </div>
          <p>Randomly selected nodes that re-run ~20% of jobs to detect cheaters (VRF-based selection).</p>
        </div>
      </div>
    </div>
  );
}

function ArchitectureSection() {
  return (
    <div className={styles.docSection}>
      <h1 className={styles.docTitle}>Protocol Architecture</h1>
      <p className={styles.docLead}>
        Axiom follows a 5-phase job lifecycle, all settled on-chain via Solana smart contracts.
      </p>

      <div className={styles.architectureFlow}>
        <div className={styles.flowStep}>
          <div className={`${styles.flowDot} ${styles.flowDotCyan}`}>1</div>
          <div className={styles.flowContent}>
            <h3>Post Job</h3>
            <p>Requestor calls <code>post_job</code> with model ID, encrypted input hash, bounty amount, and deadline (in slots).</p>
            <div className={styles.flowDetail}>
              <span className={styles.flowTag}>Account: JobAccount</span>
              <span className={styles.flowTag}>Status: Open</span>
            </div>
          </div>
        </div>
        <div className={styles.flowConnector} />

        <div className={styles.flowStep}>
          <div className={`${styles.flowDot} ${styles.flowDotViolet}`}>2</div>
          <div className={styles.flowContent}>
            <h3>Commit Result</h3>
            <p>Node runs inference off-chain, then submits <code>commit_result</code> with <code>SHA256(output + salt)</code>. This locks in their answer without revealing it.</p>
            <div className={styles.flowDetail}>
              <span className={styles.flowTag}>Prevents front-running</span>
              <span className={styles.flowTag}>Status: Committed</span>
            </div>
          </div>
        </div>
        <div className={styles.flowConnector} />

        <div className={styles.flowStep}>
          <div className={`${styles.flowDot} ${styles.flowDotGold}`}>3</div>
          <div className={styles.flowContent}>
            <h3>Reveal Result</h3>
            <p>Node calls <code>reveal_result</code> with the actual output + salt. Contract verifies <code>SHA256(output + salt) == committed hash</code>.</p>
            <div className={styles.flowDetail}>
              <span className={styles.flowTag}>Hash verification</span>
              <span className={styles.flowTag}>Status: Revealed</span>
            </div>
          </div>
        </div>
        <div className={styles.flowConnector} />

        <div className={styles.flowStep}>
          <div className={`${styles.flowDot} ${styles.flowDotOrange}`}>4</div>
          <div className={styles.flowContent}>
            <h3>Verification Sampling</h3>
            <p>Using slot-based VRF, ~20% of jobs are randomly selected for verification. A second node re-runs the job and compares results.</p>
            <div className={styles.flowDetail}>
              <span className={styles.flowTag}>VRF sampling</span>
              <span className={styles.flowTag}>Dispute → Slashing</span>
            </div>
          </div>
        </div>
        <div className={styles.flowConnector} />

        <div className={styles.flowStep}>
          <div className={`${styles.flowDot} ${styles.flowDotGreen}`}>5</div>
          <div className={styles.flowContent}>
            <h3>Settlement</h3>
            <p>If verified (or not selected for verification), bounty is transferred to the node. 2% platform fee is deducted. Requestor receives the output.</p>
            <div className={styles.flowDetail}>
              <span className={styles.flowTag}>Auto-settlement</span>
              <span className={styles.flowTag}>Status: Settled</span>
            </div>
          </div>
        </div>
      </div>

      <h2 className={styles.docH2}>On-Chain Accounts</h2>
      <div className={styles.codeBlock}>
        <div className={styles.codeHeader}>
          <span>state.rs — Account Structures</span>
        </div>
        <pre className={styles.codeBody}>{`#[account]
pub struct MarketState {
    pub authority: Pubkey,
    pub total_jobs: u64,
    pub total_nodes: u64,
    pub fee_bps: u16,         // Platform fee (basis points)
    pub treasury: Pubkey,
    pub bump: u8,
}

#[account]
pub struct NodeAccount {
    pub owner: Pubkey,
    pub stake: u64,           // Staked lamports
    pub models_supported: Vec<[u8; 32]>,  // SHA256 model IDs
    pub reputation: u32,
    pub jobs_completed: u64,
    pub is_active: bool,
}

#[account]
pub struct JobAccount {
    pub id: u64,
    pub client: Pubkey,
    pub model_id: [u8; 32],
    pub input_hash: [u8; 32],
    pub bounty: u64,
    pub deadline_slot: u64,
    pub status: JobStatus,
    pub assigned_node: Option<Pubkey>,
    pub commit_hash: Option<[u8; 32]>,
    pub result: Option<Vec<u8>>,
    pub verification_selected: bool,
}`}</pre>
      </div>
    </div>
  );
}

function SdkSection() {
  return (
    <div className={styles.docSection}>
      <h1 className={styles.docTitle}>SDK Reference</h1>
      <p className={styles.docLead}>
        The Axiom TypeScript SDK lets you post inference jobs in 5 lines of code.
      </p>

      <h2 className={styles.docH2}>Installation</h2>
      <div className={styles.codeBlock}>
        <div className={styles.codeHeader}><span>Terminal</span></div>
        <pre className={styles.codeBody}>{`npm install @axiom-protocol/sdk @solana/web3.js`}</pre>
      </div>

      <h2 className={styles.docH2}>Quick Start</h2>
      <div className={styles.codeBlock}>
        <div className={styles.codeHeader}><span>inference.ts</span></div>
        <pre className={styles.codeBody}>{`import { AxiomClient } from '@axiom-protocol/sdk';
import { Connection, Keypair } from '@solana/web3.js';

// 1. Connect to Solana
const connection = new Connection('https://api.devnet.solana.com');
const wallet = Keypair.generate(); // or use your wallet

// 2. Initialize client
const axiom = new AxiomClient(connection, wallet);

// 3. Post an inference job
const result = await axiom.infer({
  modelId: "llama-2-7b",
  input: { prompt: "Explain quantum computing" },
  bountyLamports: 10_000,  // 0.00001 SOL
  deadlineSlots: 100,      // ~40 seconds
});

// 4. Use the result
console.log(result.output);       // AI response
console.log(result.proofTxId);    // On-chain proof
console.log(result.nodePubkey);   // Which node ran it
console.log(result.cost);         // Actual cost in lamports`}</pre>
      </div>

      <h2 className={styles.docH2}>API Methods</h2>
      <div className={styles.apiTable}>
        <div className={styles.apiRow}>
          <code className={styles.apiMethod}>axiom.infer(opts)</code>
          <p>Post a job and wait for the result. Returns output + proof.</p>
        </div>
        <div className={styles.apiRow}>
          <code className={styles.apiMethod}>axiom.postJob(opts)</code>
          <p>Post a job without waiting. Returns the job account pubkey.</p>
        </div>
        <div className={styles.apiRow}>
          <code className={styles.apiMethod}>axiom.getJob(pubkey)</code>
          <p>Fetch the current state of a job account.</p>
        </div>
        <div className={styles.apiRow}>
          <code className={styles.apiMethod}>axiom.listModels()</code>
          <p>List all registered models on the network.</p>
        </div>
        <div className={styles.apiRow}>
          <code className={styles.apiMethod}>axiom.registerNode(opts)</code>
          <p>Register as a node operator with stake and supported models.</p>
        </div>
        <div className={styles.apiRow}>
          <code className={styles.apiMethod}>axiom.claimJob(jobPubkey)</code>
          <p>As a node, commit to running a job and submit result hash.</p>
        </div>
      </div>
    </div>
  );
}

function SmartContractSection() {
  return (
    <div className={styles.docSection}>
      <h1 className={styles.docTitle}>Smart Contract</h1>
      <p className={styles.docLead}>
        Axiom&apos;s Solana program is built with <strong>Anchor</strong> and deployed on Devnet.
      </p>

      <h2 className={styles.docH2}>Program Instructions</h2>
      <div className={styles.instructionsList}>
        {[
          { name: "initialize", desc: "Create the MarketState PDA with authority and fee configuration.", accounts: "authority, market_state, system_program" },
          { name: "register_node", desc: "Stake SOL and declare supported models. Creates a NodeAccount PDA.", accounts: "owner, node_account, market_state, system_program" },
          { name: "post_job", desc: "Create a JobAccount with model ID, input hash, bounty, and deadline.", accounts: "client, job_account, market_state, system_program" },
          { name: "commit_result", desc: "Node submits SHA256(output + salt) to lock in their answer.", accounts: "node, job_account, node_account" },
          { name: "reveal_result", desc: "Node reveals the actual output + salt. Hash match is verified on-chain.", accounts: "node, job_account" },
          { name: "settle_job", desc: "Transfer bounty to node (minus platform fee). Marks job as Settled.", accounts: "authority, job_account, node_account, treasury" },
          { name: "cancel_job", desc: "Client cancels an open job and gets bounty refunded.", accounts: "client, job_account" },
        ].map((ix) => (
          <div key={ix.name} className={styles.instructionCard}>
            <div className={styles.instructionHeader}>
              <code className={styles.instructionName}>{ix.name}</code>
            </div>
            <p className={styles.instructionDesc}>{ix.desc}</p>
            <div className={styles.instructionAccounts}>
              <span className={styles.accountsLabel}>Accounts:</span>
              <span className={styles.accountsList}>{ix.accounts}</span>
            </div>
          </div>
        ))}
      </div>

      <h2 className={styles.docH2}>Error Codes</h2>
      <div className={styles.codeBlock}>
        <div className={styles.codeHeader}><span>errors.rs</span></div>
        <pre className={styles.codeBody}>{`#[error_code]
pub enum AxiomError {
    #[msg("Job has expired past its deadline slot")]
    JobExpired,
    #[msg("Commit hash does not match reveal")]
    HashMismatch,
    #[msg("Node does not support the requested model")]
    ModelNotSupported,
    #[msg("Insufficient stake for this operation")]
    InsufficientStake,
    #[msg("Job is not in the correct status for this action")]
    InvalidJobStatus,
    #[msg("Unauthorized — only the job client can cancel")]
    Unauthorized,
    #[msg("Bounty amount is below minimum threshold")]
    BountyTooLow,
}`}</pre>
      </div>
    </div>
  );
}

function EconomicsSection() {
  return (
    <div className={styles.docSection}>
      <h1 className={styles.docTitle}>Economics & Incentives</h1>
      <p className={styles.docLead}>
        The protocol is designed so that <strong>honesty is always more profitable than cheating</strong>.
      </p>

      <h2 className={styles.docH2}>Fee Structure</h2>
      <div className={styles.feeTable}>
        <div className={styles.feeRow}>
          <span className={styles.feeLabel}>Job Bounty</span>
          <span className={styles.feeValue}>Set by requestor (min 0.0005 SOL)</span>
        </div>
        <div className={styles.feeRow}>
          <span className={styles.feeLabel}>Platform Fee</span>
          <span className={styles.feeValue}>2% of bounty → Treasury</span>
        </div>
        <div className={styles.feeRow}>
          <span className={styles.feeLabel}>Node Earnings</span>
          <span className={styles.feeValue}>98% of bounty per completed job</span>
        </div>
        <div className={styles.feeRow}>
          <span className={styles.feeLabel}>Minimum Stake</span>
          <span className={styles.feeValue}>1.0 SOL to register as a node</span>
        </div>
        <div className={styles.feeRow}>
          <span className={styles.feeLabel}>Slashing Penalty</span>
          <span className={styles.feeValue}>50% of stake on verified cheating</span>
        </div>
      </div>

      <h2 className={styles.docH2}>Why Cheating Doesn&apos;t Pay</h2>
      <div className={styles.mathBox}>
        <h3>Expected Value Calculation</h3>
        <div className={styles.mathContent}>
          <p><strong>Honest Node:</strong></p>
          <code>EV = bounty × 0.98 = +0.00098 SOL per job</code>
          <p><strong>Cheating Node (returns garbage):</strong></p>
          <code>EV = 0.8 × bounty − 0.2 × (stake × 0.5)</code>
          <code>EV = 0.8 × 0.001 − 0.2 × 2.5 = 0.0008 − 0.5 = −0.4992 SOL</code>
          <p className={styles.mathConclusion}>
            ✅ With a 20% verification rate and 5 SOL stake, cheating has a <strong>massively negative</strong> expected value.
            Rational nodes always choose honesty.
          </p>
        </div>
      </div>

      <h2 className={styles.docH2}>Reputation System</h2>
      <p className={styles.docText}>
        Each node has a reputation score (0-1000) that affects job priority:
      </p>
      <div className={styles.repTable}>
        <div className={styles.repRow}>
          <span className={styles.repScore}>950+</span>
          <span className={styles.repTier}>⭐ Elite</span>
          <span className={styles.repEffect}>Priority access to high-bounty jobs</span>
        </div>
        <div className={styles.repRow}>
          <span className={styles.repScore}>800-949</span>
          <span className={styles.repTier}>🟢 Good</span>
          <span className={styles.repEffect}>Standard job access</span>
        </div>
        <div className={styles.repRow}>
          <span className={styles.repScore}>500-799</span>
          <span className={styles.repTier}>🟡 Fair</span>
          <span className={styles.repEffect}>Reduced priority</span>
        </div>
        <div className={styles.repRow}>
          <span className={styles.repScore}>&lt;500</span>
          <span className={styles.repTier}>🔴 Poor</span>
          <span className={styles.repEffect}>Restricted to low-value jobs</span>
        </div>
      </div>
    </div>
  );
}

function RoadmapSection() {
  return (
    <div className={styles.docSection}>
      <h1 className={styles.docTitle}>Roadmap</h1>
      <p className={styles.docLead}>
        From hackathon prototype to production-ready protocol.
      </p>

      <div className={styles.roadmapTimeline}>
        {[
          {
            phase: "Phase 1 — Foundation",
            status: "current" as const,
            date: "Q2 2026",
            items: [
              "Anchor smart contract with full job lifecycle",
              "Next.js frontend with Playground, Dashboard, Explorer",
              "Simulated inference demo on Devnet",
              "Wallet integration (Phantom)",
              "Documentation and SDK scaffold",
            ],
          },
          {
            phase: "Phase 2 — Real Inference",
            status: "upcoming" as const,
            date: "Q3 2026",
            items: [
              "Off-chain node runtime (Docker-based GPU worker)",
              "WebSocket job notification system",
              "IPFS integration for large inputs/outputs",
              "Model registry with hash verification",
              "Testnet launch with real LLaMA 2 inference",
            ],
          },
          {
            phase: "Phase 3 — Scale & Security",
            status: "future" as const,
            date: "Q4 2026",
            items: [
              "ZK proof integration for output verification",
              "Multi-node consensus for high-value jobs",
              "Cross-chain bridges (EVM ↔ Solana)",
              "Governance token and DAO treasury",
              "Mainnet beta launch",
            ],
          },
          {
            phase: "Phase 4 — Ecosystem",
            status: "future" as const,
            date: "2027",
            items: [
              "Marketplace for fine-tuned model listings",
              "Developer grants program",
              "Enterprise API with SLA guarantees",
              "Mobile SDK (React Native, Flutter)",
              "Partner integrations with DeFi protocols",
            ],
          },
        ].map((phase) => (
          <div key={phase.phase} className={`${styles.roadmapPhase} ${styles[`phase${capitalize(phase.status)}`]}`}>
            <div className={styles.roadmapHeader}>
              <div className={styles.roadmapDot} />
              <div>
                <h3 className={styles.roadmapTitle}>{phase.phase}</h3>
                <span className={styles.roadmapDate}>{phase.date}</span>
              </div>
              <span className={`badge ${phase.status === "current" ? "badge-open" : phase.status === "upcoming" ? "badge-revealed" : "badge-committed"}`}>
                {phase.status === "current" ? "IN PROGRESS" : phase.status === "upcoming" ? "NEXT" : "PLANNED"}
              </span>
            </div>
            <ul className={styles.roadmapItems}>
              {phase.items.map((item) => (
                <li key={item} className={styles.roadmapItem}>
                  <span className={styles.roadmapCheck}>
                    {phase.status === "current" ? "◆" : "○"}
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
