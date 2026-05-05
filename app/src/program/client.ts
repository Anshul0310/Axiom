import { Connection, PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Program, AnchorProvider, BN, Idl } from "@coral-xyz/anchor";
import {
  AXIOM_PROGRAM_ID,
  deriveConfigPDA,
  deriveJobPDA,
  deriveNodePDA,
  modelNameToId,
  JobStatus,
  NodeStatus,
} from "./types";
import idlJson from "../idl/axiom.json";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface PostJobParams {
  jobId: number;
  modelId: string; // human-readable name, will be hashed
  inputCid: string; // input data hash or IPFS CID
  bountyLamports: number;
  deadlineSeconds: number; // seconds from now
}

export interface RegisterNodeParams {
  modelsSupported: string[]; // human-readable model names
}

export interface OnChainJob {
  publicKey: PublicKey;
  account: {
    client: PublicKey;
    jobId: BN;
    modelId: number[];
    inputCid: number[];
    bountyLamports: BN;
    status: Record<string, object>;
    nodeOperator: PublicKey;
    commitHash: number[];
    outputCid: number[];
    secret: number[];
    deadline: BN;
    createdAt: BN;
    isVerificationTarget: boolean;
    bump: number;
  };
}

export interface OnChainNode {
  publicKey: PublicKey;
  account: {
    operator: PublicKey;
    stakeAmount: BN;
    modelsSupported: number[][];
    jobsCompleted: BN;
    jobsFailed: BN;
    reputation: number;
    status: Record<string, object>;
    registeredAt: BN;
    totalEarned: BN;
    bump: number;
  };
}

export interface OnChainConfig {
  admin: PublicKey;
  minStake: BN;
  platformFeeBps: number;
  verificationRateBps: number;
  slashPenaltyBps: number;
  totalJobs: BN;
  totalVolume: BN;
  totalNodes: BN;
  bump: number;
}

// ─── Utility to fix IDL formats for Anchor 0.30+ ───────────────────────────
function fixIdlTypes(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(fixIdlTypes);
  if (obj !== null && typeof obj === 'object') {
    const newObj: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key === 'defined' && typeof value === 'string') {
        newObj[key] = { name: value };
      } else {
        newObj[key] = fixIdlTypes(value);
      }
    }
    return newObj;
  }
  return obj;
}

// ─── Parse job status from Anchor enum format ──────────────────────────────
export function parseJobStatus(status: Record<string, object>): JobStatus {
  if ("open" in status) return JobStatus.Open;
  if ("committed" in status) return JobStatus.Committed;
  if ("revealed" in status) return JobStatus.Revealed;
  if ("settled" in status) return JobStatus.Settled;
  if ("disputed" in status) return JobStatus.Disputed;
  if ("expired" in status) return JobStatus.Expired;
  return JobStatus.Open;
}

export function parseNodeStatus(status: Record<string, object>): NodeStatus {
  if ("active" in status) return NodeStatus.Active;
  if ("slashed" in status) return NodeStatus.Slashed;
  if ("inactive" in status) return NodeStatus.Inactive;
  return NodeStatus.Active;
}

// ─── Axiom Client ──────────────────────────────────────────────────────────
export class AxiomClient {
  program: Program;
  provider: AnchorProvider;

  constructor(provider: AnchorProvider) {
    this.provider = provider;
    
    // Ensure the IDL has the address at the top level and types fixed for newer Anchor versions
    const idlWithAddress = {
      ...idlJson,
      address: (idlJson as Record<string, unknown>).address || (idlJson.metadata && (idlJson.metadata as Record<string, unknown>).address) || AXIOM_PROGRAM_ID.toBase58(),
    };
    
    // Anchor 0.30+ expects defined types to be an object: { defined: { name: "TypeName" } }
    const fixedIdl = fixIdlTypes(idlWithAddress);
    
    this.program = new Program(fixedIdl as unknown as Idl, provider);
  }

  // ── Static factory ──────────────────────────────────────────────────────
  static create(connection: Connection, wallet?: AnchorProvider["wallet"]): AxiomClient {
    const dummyWallet = wallet || {
      publicKey: new PublicKey("11111111111111111111111111111111"),
      signTransaction: async () => { throw new Error("Read only"); },
      signAllTransactions: async () => { throw new Error("Read only"); },
    };
    
    const provider = new AnchorProvider(connection, dummyWallet as AnchorProvider["wallet"], {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    });
    return new AxiomClient(provider);
  }

  // ── Get platform config ─────────────────────────────────────────────────
  async getConfig(): Promise<OnChainConfig | null> {
    try {
      const [configPDA] = deriveConfigPDA();
      const config = await (this.program.account as Record<string, { fetch: (key: PublicKey) => Promise<OnChainConfig> }>)["platformConfig"].fetch(configPDA);
      return config;
    } catch {
      return null;
    }
  }

  // ── Post a new inference job ────────────────────────────────────────────
  async postJob(params: PostJobParams): Promise<string> {
    const [configPDA] = deriveConfigPDA();
    const client = this.provider.wallet.publicKey;
    const [jobPDA] = deriveJobPDA(client, params.jobId);

    const modelIdBytes = modelNameToId(params.modelId);
    const inputCidBytes = modelNameToId(params.inputCid);

    const deadline = Math.floor(Date.now() / 1000) + params.deadlineSeconds;

    const tx = await (this.program.methods as Record<string, (...args: unknown[]) => { accounts: (accs: Record<string, PublicKey>) => { rpc: () => Promise<string> } }>)
      ["postJob"](
        new BN(params.jobId),
        modelIdBytes,
        inputCidBytes,
        new BN(params.bountyLamports),
        new BN(deadline)
      )
      .accounts({
        job: jobPDA,
        platformConfig: configPDA,
        client: client,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  // ── Register as a node operator ─────────────────────────────────────────
  async registerNode(params: RegisterNodeParams): Promise<string> {
    const [configPDA] = deriveConfigPDA();
    const operator = this.provider.wallet.publicKey;
    const [nodePDA] = deriveNodePDA(operator);

    const modelsBytes = params.modelsSupported.map(modelNameToId);

    const tx = await (this.program.methods as Record<string, (...args: unknown[]) => { accounts: (accs: Record<string, PublicKey>) => { rpc: () => Promise<string> } }>)
      ["registerNode"](modelsBytes)
      .accounts({
        nodeRegistry: nodePDA,
        platformConfig: configPDA,
        stakeDeposit: operator,
        operator: operator,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  // ── Commit a result (phase 1 of commit-reveal) ──────────────────────────
  async commitResult(params: {
    jobId: number;
    clientPubkey: PublicKey;
    outputCid: number[];
    secret: number[];
  }): Promise<string> {
    const operator = this.provider.wallet.publicKey;
    const [jobPDA] = deriveJobPDA(params.clientPubkey, params.jobId);
    const [nodePDA] = deriveNodePDA(operator);

    // Compute commit hash: SHA256(job_id_bytes || output_cid || secret)
    const commitHash = await AxiomClient.computeCommitHash(
      params.jobId,
      params.outputCid,
      params.secret
    );

    const tx = await (this.program.methods as Record<string, (...args: unknown[]) => { accounts: (accs: Record<string, PublicKey>) => { rpc: () => Promise<string> } }>)
      ["commitResult"](commitHash)
      .accounts({
        job: jobPDA,
        nodeRegistry: nodePDA,
        operator: operator,
      })
      .rpc();

    return tx;
  }

  // ── Reveal a result (phase 2 of commit-reveal) ─────────────────────────
  async revealResult(params: {
    jobId: number;
    clientPubkey: PublicKey;
    outputCid: number[];
    secret: number[];
  }): Promise<string> {
    const operator = this.provider.wallet.publicKey;
    const [jobPDA] = deriveJobPDA(params.clientPubkey, params.jobId);

    const tx = await (this.program.methods as Record<string, (...args: unknown[]) => { accounts: (accs: Record<string, PublicKey>) => { rpc: () => Promise<string> } }>)
      ["revealResult"](params.outputCid, params.secret)
      .accounts({
        job: jobPDA,
        operator: operator,
      })
      .rpc();

    return tx;
  }

  // ── Settle a job (pay node operator) ───────────────────────────────────
  async settleJob(params: {
    jobId: number;
    clientPubkey: PublicKey;
    nodeOperator: PublicKey;
  }): Promise<string> {
    const caller = this.provider.wallet.publicKey;
    const [jobPDA] = deriveJobPDA(params.clientPubkey, params.jobId);
    const [nodePDA] = deriveNodePDA(params.nodeOperator);
    const [configPDA] = deriveConfigPDA();

    // Fetch config to get admin address
    const config = await this.getConfig();
    const adminKey = config ? config.admin : caller;

    const tx = await (this.program.methods as Record<string, (...args: unknown[]) => { accounts: (accs: Record<string, PublicKey>) => { rpc: () => Promise<string> } }>)
      ["settleJob"]()
      .accounts({
        job: jobPDA,
        nodeRegistry: nodePDA,
        platformConfig: configPDA,
        nodeOperator: params.nodeOperator,
        admin: adminKey,
        caller: caller,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  // ── Cancel a job ────────────────────────────────────────────────────────
  async cancelJob(jobId: number): Promise<string> {
    const client = this.provider.wallet.publicKey;
    const [jobPDA] = deriveJobPDA(client, jobId);

    const tx = await (this.program.methods as Record<string, () => { accounts: (accs: Record<string, PublicKey>) => { rpc: () => Promise<string> } }>)
      ["cancelJob"]()
      .accounts({
        job: jobPDA,
        client: client,
      })
      .rpc();

    return tx;
  }

  // ── Utility: Compute commit hash ───────────────────────────────────────
  static async computeCommitHash(
    jobId: number,
    outputCid: number[],
    secret: number[]
  ): Promise<number[]> {
    const jobIdBuf = new ArrayBuffer(8);
    const view = new DataView(jobIdBuf);
    view.setBigUint64(0, BigInt(jobId), true); // little-endian

    const hashInput = new Uint8Array([
      ...new Uint8Array(jobIdBuf),
      ...outputCid,
      ...secret,
    ]);

    const hashBuffer = await crypto.subtle.digest("SHA-256", hashInput);
    return Array.from(new Uint8Array(hashBuffer));
  }

  // ── Utility: Generate random secret ────────────────────────────────────
  static generateSecret(): number[] {
    const secret = new Uint8Array(32);
    crypto.getRandomValues(secret);
    return Array.from(secret);
  }

  // ── Fetch all jobs ──────────────────────────────────────────────────────
  async getAllJobs(): Promise<OnChainJob[]> {
    try {
      const accounts = await (this.program.account as Record<string, { all: () => Promise<OnChainJob[]> }>)["job"].all();
      return accounts;
    } catch {
      return [];
    }
  }

  // ── Fetch jobs by client ────────────────────────────────────────────────
  async getJobsByClient(client: PublicKey): Promise<OnChainJob[]> {
    try {
      const accounts = await (this.program.account as Record<string, { all: (filters?: { memcmp: { offset: number; bytes: string } }[]) => Promise<OnChainJob[]> }>)["job"].all([
        {
          memcmp: {
            offset: 8, // after discriminator
            bytes: client.toBase58(),
          },
        },
      ]);
      return accounts;
    } catch {
      return [];
    }
  }

  // ── Fetch a specific job ────────────────────────────────────────────────
  async getJob(client: PublicKey, jobId: number): Promise<OnChainJob["account"] | null> {
    try {
      const [jobPDA] = deriveJobPDA(client, jobId);
      const account = await (this.program.account as Record<string, { fetch: (key: PublicKey) => Promise<OnChainJob["account"]> }>)["job"].fetch(jobPDA);
      return account;
    } catch {
      return null;
    }
  }

  // ── Fetch all registered nodes ──────────────────────────────────────────
  async getAllNodes(): Promise<OnChainNode[]> {
    try {
      const accounts = await (this.program.account as Record<string, { all: () => Promise<OnChainNode[]> }>)["nodeRegistry"].all();
      return accounts;
    } catch {
      return [];
    }
  }

  // ── Fetch a specific node ───────────────────────────────────────────────
  async getNode(operator: PublicKey): Promise<OnChainNode["account"] | null> {
    try {
      const [nodePDA] = deriveNodePDA(operator);
      const account = await (this.program.account as Record<string, { fetch: (key: PublicKey) => Promise<OnChainNode["account"]> }>)["nodeRegistry"].fetch(nodePDA);
      return account;
    } catch {
      return null;
    }
  }

  // ── Utility: Convert lamports to SOL ────────────────────────────────────
  static lamportsToSol(lamports: number | BN): number {
    const val = typeof lamports === "number" ? lamports : lamports.toNumber();
    return val / LAMPORTS_PER_SOL;
  }

  // ── Utility: Convert SOL to lamports ────────────────────────────────────
  static solToLamports(sol: number): number {
    return Math.floor(sol * LAMPORTS_PER_SOL);
  }
}
