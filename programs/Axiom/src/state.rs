use anchor_lang::prelude::*;

// ─── Job Status Enum ───────────────────────────────────────────────────────────

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum JobStatus {
    /// Job is open and waiting for a node to commit
    Open,
    /// A node has submitted a commit hash
    Committed,
    /// The node has revealed its result
    Revealed,
    /// The job has been verified and settled
    Settled,
    /// The job was disputed — node was slashed
    Disputed,
    /// The job expired without being picked up or completed
    Expired,
}

impl Default for JobStatus {
    fn default() -> Self {
        JobStatus::Open
    }
}

// ─── Node Status Enum ──────────────────────────────────────────────────────────

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum NodeStatus {
    /// Node is active and can accept jobs
    Active,
    /// Node has been slashed and is inactive
    Slashed,
    /// Node has voluntarily deactivated
    Inactive,
}

impl Default for NodeStatus {
    fn default() -> Self {
        NodeStatus::Active
    }
}

// ─── Job Account (PDA) ────────────────────────────────────────────────────────
// Seeds: ["job", client.key, job_id (u64 as le_bytes)]

#[account]
#[derive(InitSpace)]
pub struct Job {
    /// The client who posted this job
    pub client: Pubkey,
    /// Unique job ID (client-scoped counter)
    pub job_id: u64,
    /// SHA256 hash of model_name + version — identifies the model to use
    pub model_id: [u8; 32],
    /// CID (IPFS/Arweave) of the input data, or raw input hash
    pub input_cid: [u8; 32],
    /// SOL bounty amount in lamports locked in escrow
    pub bounty_lamports: u64,
    /// Current status of the job
    pub status: JobStatus,
    /// The node operator who claimed and committed to this job
    pub node_operator: Pubkey,
    /// Commit hash: SHA256(job_id || output_cid || secret)
    pub commit_hash: [u8; 32],
    /// The revealed output CID
    pub output_cid: [u8; 32],
    /// The revealed secret used in the commit
    pub secret: [u8; 32],
    /// Unix timestamp deadline for job completion
    pub deadline: i64,
    /// Unix timestamp when the job was created
    pub created_at: i64,
    /// Whether this job is selected for verification
    pub is_verification_target: bool,
    /// PDA bump seed
    pub bump: u8,
}

// ─── Node Registry Account (PDA) ──────────────────────────────────────────────
// Seeds: ["node", operator.key]

#[account]
#[derive(InitSpace)]
pub struct NodeRegistry {
    /// The node operator's public key
    pub operator: Pubkey,
    /// Amount of SOL staked in lamports
    pub stake_amount: u64,
    /// Number of models this node supports (up to 8)
    #[max_len(8)]
    pub models_supported: Vec<[u8; 32]>,
    /// Number of jobs successfully completed
    pub jobs_completed: u64,
    /// Number of jobs failed/slashed
    pub jobs_failed: u64,
    /// Reputation score (0-10000, represents 0.00% - 100.00%)
    pub reputation: u16,
    /// Current status of the node
    pub status: NodeStatus,
    /// Unix timestamp of registration
    pub registered_at: i64,
    /// Total SOL earned in lamports
    pub total_earned: u64,
    /// PDA bump seed
    pub bump: u8,
}

// ─── Platform Config (PDA) ─────────────────────────────────────────────────────
// Seeds: ["config"]
// Stores global platform settings — only admin can modify

#[account]
#[derive(InitSpace)]
pub struct PlatformConfig {
    /// Admin authority
    pub admin: Pubkey,
    /// Minimum stake required to register as a node (in lamports)
    pub min_stake: u64,
    /// Platform fee percentage (basis points, e.g., 250 = 2.5%)
    pub platform_fee_bps: u16,
    /// Verification sampling rate (basis points, e.g., 2000 = 20%)
    pub verification_rate_bps: u16,
    /// Slash penalty percentage of stake (basis points)
    pub slash_penalty_bps: u16,
    /// Total jobs posted on the platform
    pub total_jobs: u64,
    /// Total SOL volume transacted (in lamports)
    pub total_volume: u64,
    /// Total active nodes
    pub total_nodes: u64,
    /// PDA bump seed
    pub bump: u8,
}
