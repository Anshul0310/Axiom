import { PublicKey } from "@solana/web3.js";

// ─── Program ID ────────────────────────────────────────────────────────────
export const AXIOM_PROGRAM_ID = new PublicKey(
  "98dhPTAR11Ny67CgS5HRSZEA9naWb6wszygiu8Q43m5K"
);

// ─── Enums ─────────────────────────────────────────────────────────────────
export enum JobStatus {
  Open = "Open",
  Committed = "Committed",
  Revealed = "Revealed",
  Settled = "Settled",
  Disputed = "Disputed",
  Expired = "Expired",
}

export enum NodeStatus {
  Active = "Active",
  Slashed = "Slashed",
  Inactive = "Inactive",
}

// ─── On-chain Account Types ────────────────────────────────────────────────
export interface JobAccount {
  client: PublicKey;
  jobId: bigint;
  modelId: Uint8Array; // [u8; 32]
  inputCid: Uint8Array; // [u8; 32]
  bountyLamports: bigint;
  status: JobStatus;
  nodeOperator: PublicKey;
  commitHash: Uint8Array; // [u8; 32]
  outputCid: Uint8Array; // [u8; 32]
  secret: Uint8Array; // [u8; 32]
  deadline: bigint;
  createdAt: bigint;
  isVerificationTarget: boolean;
  bump: number;
}

export interface NodeRegistryAccount {
  operator: PublicKey;
  stakeAmount: bigint;
  modelsSupported: Uint8Array[]; // Vec<[u8; 32]>
  jobsCompleted: bigint;
  jobsFailed: bigint;
  reputation: number; // u16
  status: NodeStatus;
  registeredAt: bigint;
  totalEarned: bigint;
  bump: number;
}

export interface PlatformConfigAccount {
  admin: PublicKey;
  minStake: bigint;
  platformFeeBps: number; // u16
  verificationRateBps: number;
  slashPenaltyBps: number;
  totalJobs: bigint;
  totalVolume: bigint;
  totalNodes: bigint;
  bump: number;
}

// ─── PDA Seeds ─────────────────────────────────────────────────────────────
export const SEEDS = {
  CONFIG: Buffer.from("config"),
  JOB: Buffer.from("job"),
  NODE: Buffer.from("node"),
} as const;

// ─── Helper: Derive PDAs ──────────────────────────────────────────────────
export function deriveConfigPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.CONFIG],
    AXIOM_PROGRAM_ID
  );
}

export function deriveJobPDA(
  client: PublicKey,
  jobId: number | bigint
): [PublicKey, number] {
  const jobIdBuf = Buffer.alloc(8);
  jobIdBuf.writeBigUInt64LE(BigInt(jobId));
  return PublicKey.findProgramAddressSync(
    [SEEDS.JOB, client.toBuffer(), jobIdBuf],
    AXIOM_PROGRAM_ID
  );
}

export function deriveNodePDA(operator: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.NODE, operator.toBuffer()],
    AXIOM_PROGRAM_ID
  );
}

// ─── Model ID Helpers ──────────────────────────────────────────────────────
export function modelNameToId(name: string): number[] {
  const encoder = new TextEncoder();
  const data = encoder.encode(name);
  // Simple SHA256-like padding to 32 bytes
  const result = new Uint8Array(32);
  for (let i = 0; i < data.length && i < 32; i++) {
    result[i] = data[i];
  }
  return Array.from(result);
}

// ─── Supported Models ──────────────────────────────────────────────────────
export const SUPPORTED_MODELS = [
  { id: "llama-2-7b", name: "LLaMA 2 7B", type: "Text" as const, costPerJob: 0.001, avgLatency: "1.2s", icon: "🦙" },
  { id: "stable-diff-xl", name: "Stable Diffusion XL", type: "Image" as const, costPerJob: 0.005, avgLatency: "4.5s", icon: "🎨" },
  { id: "codellama-13b", name: "CodeLlama 13B", type: "Code" as const, costPerJob: 0.002, avgLatency: "2.1s", icon: "💻" },
  { id: "mistral-7b", name: "Mistral 7B Instruct", type: "Text" as const, costPerJob: 0.001, avgLatency: "1.0s", icon: "🌪️" },
  { id: "whisper-large", name: "Whisper Large v3", type: "Text" as const, costPerJob: 0.003, avgLatency: "3.2s", icon: "🎤" },
] as const;

export type ModelId = (typeof SUPPORTED_MODELS)[number]["id"];
