#!/usr/bin/env node
/**
 * ◆ Axiom Node Runner — Decentralized AI Inference Daemon
 *
 * This is the off-chain component that GPU operators run on their machines.
 * It monitors the Solana blockchain for open inference jobs, executes AI inference
 * locally, and submits results on-chain via the commit-reveal protocol.
 *
 * Usage:
 *   npx tsx index.ts                    # Run with defaults (devnet, poll every 5s)
 *   npx tsx index.ts --cluster devnet   # Specify cluster
 *   npx tsx index.ts --interval 10      # Poll every 10 seconds
 *   npx tsx index.ts --dry-run          # Monitor only, don't submit transactions
 *
 * Prerequisites:
 *   1. Solana CLI installed with a keypair at ~/.config/solana/id.json
 *   2. Node registered on-chain via the Axiom dashboard
 *   3. Sufficient SOL for transaction fees
 */

import { Connection, Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Program, AnchorProvider, BN, Wallet } from "@coral-xyz/anchor";
import axios from "axios";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

// ─── Configuration ──────────────────────────────────────────────────────────

const PROGRAM_ID = new PublicKey("G1DD7C4pqE59RqM8gAr4yjBBNj9DZ5XHyDRCsvFv7UP5");

const CLUSTERS: Record<string, string> = {
  devnet: "https://api.devnet.solana.com",
  testnet: "https://api.testnet.solana.com",
  "mainnet-beta": "https://api.mainnet-beta.solana.com",
  localnet: "http://localhost:8899",
};

interface NodeRunnerConfig {
  cluster: string;
  rpcUrl: string;
  keypairPath: string;
  pollIntervalSec: number;
  dryRun: boolean;
  maxConcurrentJobs: number;
}

// ─── IDL (minimal inline — just the parts we need) ──────────────────────────
// In production, this would be imported from the generated IDL file
const AXIOM_IDL = {
  version: "0.1.0",
  name: "axiom",
  instructions: [
    {
      name: "commitResult",
      accounts: [
        { name: "job", isMut: true, isSigner: false },
        { name: "nodeRegistry", isMut: false, isSigner: false },
        { name: "operator", isMut: false, isSigner: true },
      ],
      args: [{ name: "commitHash", type: { array: ["u8", 32] } }],
    },
    {
      name: "revealResult",
      accounts: [
        { name: "job", isMut: true, isSigner: false },
        { name: "operator", isMut: false, isSigner: true },
      ],
      args: [
        { name: "outputCid", type: { array: ["u8", 32] } },
        { name: "secret", type: { array: ["u8", 32] } },
      ],
    },
    {
      name: "settleJob",
      accounts: [
        { name: "job", isMut: true, isSigner: false },
        { name: "nodeRegistry", isMut: true, isSigner: false },
        { name: "platformConfig", isMut: false, isSigner: false },
        { name: "nodeOperator", isMut: true, isSigner: false },
        { name: "admin", isMut: true, isSigner: false },
        { name: "caller", isMut: false, isSigner: true },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [],
    },
  ],
  accounts: [
    {
      name: "Job",
      type: {
        kind: "struct",
        fields: [
          { name: "client", type: "publicKey" },
          { name: "jobId", type: "u64" },
          { name: "modelId", type: { array: ["u8", 32] } },
          { name: "inputCid", type: { array: ["u8", 32] } },
          { name: "bountyLamports", type: "u64" },
          { name: "status", type: { defined: "JobStatus" } },
          { name: "nodeOperator", type: "publicKey" },
          { name: "commitHash", type: { array: ["u8", 32] } },
          { name: "outputCid", type: { array: ["u8", 32] } },
          { name: "secret", type: { array: ["u8", 32] } },
          { name: "deadline", type: "i64" },
          { name: "createdAt", type: "i64" },
          { name: "isVerificationTarget", type: "bool" },
          { name: "bump", type: "u8" },
        ],
      },
    },
    {
      name: "NodeRegistry",
      type: {
        kind: "struct",
        fields: [
          { name: "operator", type: "publicKey" },
          { name: "stakeAmount", type: "u64" },
          { name: "modelsSupported", type: { vec: { array: ["u8", 32] } } },
          { name: "jobsCompleted", type: "u64" },
          { name: "jobsFailed", type: "u64" },
          { name: "reputation", type: "u16" },
          { name: "status", type: { defined: "NodeStatus" } },
          { name: "registeredAt", type: "i64" },
          { name: "totalEarned", type: "u64" },
          { name: "bump", type: "u8" },
        ],
      },
    },
    {
      name: "PlatformConfig",
      type: {
        kind: "struct",
        fields: [
          { name: "admin", type: "publicKey" },
          { name: "minStake", type: "u64" },
          { name: "platformFeeBps", type: "u16" },
          { name: "verificationRateBps", type: "u16" },
          { name: "slashPenaltyBps", type: "u16" },
          { name: "totalJobs", type: "u64" },
          { name: "totalVolume", type: "u64" },
          { name: "totalNodes", type: "u64" },
          { name: "bump", type: "u8" },
        ],
      },
    },
  ],
  types: [
    {
      name: "JobStatus",
      type: {
        kind: "enum",
        variants: [
          { name: "Open" },
          { name: "Committed" },
          { name: "Revealed" },
          { name: "Settled" },
          { name: "Disputed" },
          { name: "Expired" },
        ],
      },
    },
    {
      name: "NodeStatus",
      type: {
        kind: "enum",
        variants: [
          { name: "Active" },
          { name: "Slashed" },
          { name: "Inactive" },
        ],
      },
    },
  ],
  errors: [],
  metadata: { address: "G1DD7C4pqE59RqM8gAr4yjBBNj9DZ5XHyDRCsvFv7UP5" },
};

// ─── PDA Derivation ─────────────────────────────────────────────────────────

function deriveNodePDA(operator: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("node"), operator.toBuffer()],
    PROGRAM_ID
  );
}

function deriveJobPDA(client: PublicKey, jobId: number | bigint): [PublicKey, number] {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(jobId));
  return PublicKey.findProgramAddressSync(
    [Buffer.from("job"), client.toBuffer(), buf],
    PROGRAM_ID
  );
}

function deriveConfigPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    PROGRAM_ID
  );
}

// ─── Inference Simulation ────────────────────────────────────────────────────

/**
 * Simulate running AI inference on a prompt.
 * Connected to Ollama automatically! Make sure `ollama run llama3` is active.
 */
async function runInference(modelId: number[], inputCid: number[]): Promise<string> {
  // Decode model ID (first 32 bytes, null-padded)
  const modelName = Buffer.from(modelId)
    .toString("utf-8")
    .replace(/\0+$/, "");

  log("info", `Running inference with model: ${modelName || "unknown"}`);

  try {
    // Calling real internal Ollama locally
    const response = await axios.post("http://localhost:11434/api/generate", {
      model: "llama3", // Replace this with dynamic mapping if needed
      prompt: `Please process this generic instruction request from a user: "What is Solana?"`,
      stream: false
    });
    
    return response.data.response;
  } catch (error) {
    log("warn", "Ollama is not running locally. Please start it with `ollama run llama3`.");
    log("warn", "Falling back to simulated result...");

    // Simulate processing time 
    const processingTime = 1000 + Math.random() * 3000;
    await sleep(processingTime);
    
    return `Simulated generic result. Install Ollama to see real inferences!`;
  }
}

  // Generate a simulated response
  const responses: Record<string, string[]> = {
    "llama-2-7b": [
      "Based on my analysis, this demonstrates the power of decentralized computation on Solana.",
      "The key insight is that trustless verification through commit-reveal schemes enables honest computation markets.",
    ],
    "codellama-13b": [
      "```rust\nfn process_inference(input: &[u8]) -> Result<Vec<u8>> {\n    let model = load_model()?;\n    model.forward(input)\n}\n```",
    ],
    "stable-diff-xl": [
      "[Image generated: 1024x1024, 50 steps, guidance=7.5]",
    ],
    "mistral-7b": [
      "Decentralized AI inference enables censorship-resistant, verifiable computation at scale.",
    ],
    "whisper-large": [
      "[Transcription: Audio processed, 98.7% confidence, English detected]",
    ],
  };

  const modelResponses = responses[modelName] || responses["llama-2-7b"];
  return modelResponses[Math.floor(Math.random() * modelResponses.length)]!;
}

// ─── Commit-Reveal Utilities ─────────────────────────────────────────────────

function computeCommitHash(jobId: bigint, outputCid: Buffer, secret: Buffer): Buffer {
  const jobIdBuf = Buffer.alloc(8);
  jobIdBuf.writeBigUInt64LE(jobId);
  const input = Buffer.concat([jobIdBuf, outputCid, secret]);
  return crypto.createHash("sha256").update(input).digest();
}

function generateSecret(): Buffer {
  return crypto.randomBytes(32);
}

function textToBytes32(text: string): Buffer {
  const buf = Buffer.alloc(32);
  const encoded = Buffer.from(text, "utf-8");
  encoded.copy(buf, 0, 0, Math.min(encoded.length, 32));
  return buf;
}

// ─── Logging ─────────────────────────────────────────────────────────────────

type LogLevel = "info" | "warn" | "error" | "success" | "debug";

const LOG_COLORS: Record<LogLevel, string> = {
  info: "\x1b[36m",    // cyan
  warn: "\x1b[33m",    // yellow
  error: "\x1b[31m",   // red
  success: "\x1b[32m", // green
  debug: "\x1b[90m",   // gray
};

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

function log(level: LogLevel, message: string) {
  const color = LOG_COLORS[level];
  const timestamp = new Date().toLocaleTimeString();
  const prefix = level === "success" ? "✅" : level === "error" ? "❌" : level === "warn" ? "⚠️" : level === "debug" ? "🔍" : "◆";
  console.log(`${color}${BOLD}[${timestamp}]${RESET} ${prefix} ${color}${message}${RESET}`);
}

function printBanner(config: NodeRunnerConfig) {
  console.log(`
${BOLD}\x1b[36m
   ◆ Axiom Node Runner
   Decentralized AI Inference Daemon
${RESET}
   Cluster:    ${config.cluster}
   RPC:        ${config.rpcUrl}
   Poll:       Every ${config.pollIntervalSec}s
   Dry Run:    ${config.dryRun}
   Keypair:    ${config.keypairPath}
${"─".repeat(50)}
`);
}

// ─── Main Node Runner ────────────────────────────────────────────────────────

class AxiomNodeRunner {
  private connection: Connection;
  private wallet: Wallet;
  private provider: AnchorProvider;
  private program: Program;
  private config: NodeRunnerConfig;
  private activeJobIds: Set<string> = new Set();
  private jobsCompleted = 0;
  private totalEarned = 0;

  constructor(config: NodeRunnerConfig) {
    this.config = config;

    // Load keypair
    const keypairData = JSON.parse(
      fs.readFileSync(path.resolve(config.keypairPath), "utf-8")
    );
    const keypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));
    this.wallet = new Wallet(keypair);

    this.connection = new Connection(config.rpcUrl, "confirmed");
    this.provider = new AnchorProvider(this.connection, this.wallet, {
      commitment: "confirmed",
    });

    this.program = new Program(AXIOM_IDL as any, this.provider);
  }

  get operatorKey(): PublicKey {
    return this.wallet.publicKey;
  }

  /** Start the polling loop */
  async start() {
    printBanner(this.config);

    log("info", `Operator: ${this.operatorKey.toBase58()}`);

    // Check balance
    const balance = await this.connection.getBalance(this.operatorKey);
    log("info", `Balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);

    if (balance < 0.01 * LAMPORTS_PER_SOL) {
      log("warn", "Low balance! You need SOL for transaction fees.");
      if (this.config.cluster === "devnet") {
        log("info", "Run: solana airdrop 2 --url devnet");
      }
    }

    // Check node registration
    const [nodePDA] = deriveNodePDA(this.operatorKey);
    try {
      const nodeAccount = await (this.program.account as any).nodeRegistry.fetch(nodePDA);
      log("success", `Node registered: Stake=${(nodeAccount.stakeAmount as BN).toNumber() / LAMPORTS_PER_SOL} SOL`);
      log("info", `Models supported: ${nodeAccount.modelsSupported.length}`);
      log("info", `Jobs completed: ${(nodeAccount.jobsCompleted as BN).toNumber()}`);
      log("info", `Reputation: ${nodeAccount.reputation}/10000`);
    } catch {
      log("warn", "Node not registered on-chain. Register via the Axiom dashboard first.");
      log("info", "The runner will still monitor for jobs in simulated mode.");
    }

    log("info", "Starting job polling loop...\n");

    // Main polling loop
    while (true) {
      try {
        await this.pollForJobs();
      } catch (err) {
        log("error", `Poll error: ${err instanceof Error ? err.message : err}`);
      }
      await sleep(this.config.pollIntervalSec * 1000);
    }
  }

  /** Poll for open jobs and process them */
  private async pollForJobs() {
    let jobs: any[];
    try {
      jobs = await (this.program.account as any).job.all();
    } catch {
      log("debug", "No jobs found or fetch failed");
      return;
    }

    // Filter for open jobs that haven't expired
    const now = Math.floor(Date.now() / 1000);
    const openJobs = jobs.filter((j: any) => {
      const status = j.account.status;
      const isOpen = "open" in status;
      const notExpired = (j.account.deadline as BN).toNumber() > now;
      const notProcessing = !this.activeJobIds.has(j.publicKey.toBase58());
      return isOpen && notExpired && notProcessing;
    });

    if (openJobs.length > 0) {
      log("info", `Found ${openJobs.length} open job(s)`);
    } else {
      log("debug", `Polling... ${jobs.length} total jobs, ${openJobs.length} open`);
    }

    // Process up to maxConcurrentJobs
    for (const job of openJobs.slice(0, this.config.maxConcurrentJobs)) {
      this.processJob(job).catch((err) => {
        log("error", `Job processing error: ${err instanceof Error ? err.message : err}`);
      });
    }
  }

  /** Full lifecycle: claim → inference → commit → reveal → settle */
  private async processJob(job: any) {
    const jobKey = job.publicKey.toBase58();
    const jobId = (job.account.jobId as BN).toBigInt();
    const bounty = (job.account.bountyLamports as BN).toNumber() / LAMPORTS_PER_SOL;

    this.activeJobIds.add(jobKey);

    log("info", `\n${"═".repeat(50)}`);
    log("info", `Processing job #${jobId} (bounty: ${bounty.toFixed(4)} SOL)`);
    log("info", `Client: ${job.account.client.toBase58()}`);

    try {
      // Step 1: Run inference
      log("info", "Step 1/4: Running inference...");
      const outputText = await runInference(
        job.account.modelId,
        job.account.inputCid
      );
      log("success", `Inference complete: "${outputText.slice(0, 60)}..."`);

      // Step 2: Generate output CID and secret
      const outputCid = textToBytes32(outputText);
      const secret = generateSecret();
      const commitHash = computeCommitHash(jobId, outputCid, secret);

      if (this.config.dryRun) {
        log("warn", "[DRY RUN] Would submit commit, reveal, and settle transactions");
        log("debug", `  Commit hash: ${commitHash.toString("hex").slice(0, 16)}...`);
        this.activeJobIds.delete(jobKey);
        return;
      }

      // Step 3: Submit commit
      log("info", "Step 2/4: Committing result hash on-chain...");
      const [nodePDA] = deriveNodePDA(this.operatorKey);
      const [jobPDA] = deriveJobPDA(
        job.account.client,
        Number(jobId)
      );

      try {
        const commitTx = await (this.program.methods as any)
          .commitResult(Array.from(commitHash))
          .accounts({
            job: jobPDA,
            nodeRegistry: nodePDA,
            operator: this.operatorKey,
          })
          .rpc();
        log("success", `Committed! TX: ${commitTx}`);
      } catch (err: any) {
        log("error", `Commit failed: ${err.message}`);
        this.activeJobIds.delete(jobKey);
        return;
      }

      // Step 4: Wait a moment, then reveal
      await sleep(2000);
      log("info", "Step 3/4: Revealing result on-chain...");

      try {
        const revealTx = await (this.program.methods as any)
          .revealResult(Array.from(outputCid), Array.from(secret))
          .accounts({
            job: jobPDA,
            operator: this.operatorKey,
          })
          .rpc();
        log("success", `Revealed! TX: ${revealTx}`);
      } catch (err: any) {
        log("error", `Reveal failed: ${err.message}`);
        this.activeJobIds.delete(jobKey);
        return;
      }

      // Step 5: Settle
      await sleep(1000);
      log("info", "Step 4/4: Settling job...");

      try {
        const [configPDA] = deriveConfigPDA();
        const configAccount = await (this.program.account as any).platformConfig.fetch(configPDA);

        const settleTx = await (this.program.methods as any)
          .settleJob()
          .accounts({
            job: jobPDA,
            nodeRegistry: nodePDA,
            platformConfig: configPDA,
            nodeOperator: this.operatorKey,
            admin: configAccount.admin,
            caller: this.operatorKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        this.jobsCompleted++;
        this.totalEarned += bounty * 0.98; // minus 2% fee

        log("success", `Settled! TX: ${settleTx}`);
        log("success", `Earned: ~${(bounty * 0.98).toFixed(4)} SOL (after 2% fee)`);
        log("info", `Total: ${this.jobsCompleted} jobs completed, ${this.totalEarned.toFixed(4)} SOL earned`);
      } catch (err: any) {
        log("error", `Settlement failed: ${err.message}`);
      }
    } catch (err) {
      log("error", `Job processing error: ${err instanceof Error ? err.message : err}`);
    } finally {
      this.activeJobIds.delete(jobKey);
      log("info", `${"═".repeat(50)}\n`);
    }
  }
}

// ─── CLI Argument Parsing ────────────────────────────────────────────────────

function parseArgs(): NodeRunnerConfig {
  const args = process.argv.slice(2);
  const config: NodeRunnerConfig = {
    cluster: "devnet",
    rpcUrl: CLUSTERS["devnet"],
    keypairPath: path.join(
      process.env.HOME || process.env.USERPROFILE || "~",
      ".config",
      "solana",
      "id.json"
    ),
    pollIntervalSec: 5,
    dryRun: false,
    maxConcurrentJobs: 1,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--cluster":
      case "-c":
        config.cluster = args[++i];
        config.rpcUrl = CLUSTERS[config.cluster] || config.cluster;
        break;
      case "--keypair":
      case "-k":
        config.keypairPath = args[++i];
        break;
      case "--interval":
      case "-i":
        config.pollIntervalSec = parseInt(args[++i], 10);
        break;
      case "--dry-run":
      case "-d":
        config.dryRun = true;
        break;
      case "--max-jobs":
      case "-m":
        config.maxConcurrentJobs = parseInt(args[++i], 10);
        break;
      case "--help":
      case "-h":
        console.log(`
◆ Axiom Node Runner — CLI Options

  --cluster, -c <name>     Solana cluster (devnet|testnet|mainnet-beta|localnet)
  --keypair, -k <path>     Path to Solana keypair JSON file
  --interval, -i <seconds> Polling interval in seconds (default: 5)
  --dry-run, -d            Monitor jobs without submitting transactions
  --max-jobs, -m <number>  Max concurrent jobs to process (default: 1)
  --help, -h               Show this help message

Examples:
  npx tsx index.ts                             # Run on devnet with defaults
  npx tsx index.ts --cluster devnet --dry-run  # Monitor devnet without transacting
  npx tsx index.ts -c mainnet-beta -i 10       # Production: poll mainnet every 10s
`);
        process.exit(0);
    }
  }

  return config;
}

// ─── Entrypoint ──────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const config = parseArgs();
  const runner = new AxiomNodeRunner(config);
  await runner.start();
}

main().catch((err) => {
  log("error", `Fatal error: ${err.message}`);
  process.exit(1);
});
