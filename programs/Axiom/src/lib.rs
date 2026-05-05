use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("98dhPTAR11Ny67CgS5HRSZEA9naWb6wszygiu8Q43m5K");

#[program]
pub mod axiom {
    use super::*;

    /// Initialize the platform with configuration parameters.
    /// Called once by the admin.
    pub fn initialize(ctx: Context<Initialize>, params: InitializeParams) -> Result<()> {
        instructions::initialize::handler(ctx, params)
    }

    /// Register a new GPU node operator.
    /// Operator must stake SOL and declare supported models.
    pub fn register_node(
        ctx: Context<RegisterNode>,
        models_supported: Vec<[u8; 32]>,
    ) -> Result<()> {
        instructions::register_node::handler(ctx, models_supported)
    }

    /// Post a new AI inference job with bounty.
    /// Bounty is escrowed in the job PDA.
    pub fn post_job(
        ctx: Context<PostJob>,
        job_id: u64,
        model_id: [u8; 32],
        input_cid: [u8; 32],
        bounty_lamports: u64,
        deadline: i64,
    ) -> Result<()> {
        instructions::post_job::handler(ctx, job_id, model_id, input_cid, bounty_lamports, deadline)
    }

    /// Commit a hash of the inference result (phase 1 of commit-reveal).
    /// commit_hash = SHA256(job_id_bytes || output_cid || secret)
    pub fn commit_result(
        ctx: Context<CommitResult>,
        commit_hash: [u8; 32],
    ) -> Result<()> {
        instructions::commit_result::handler(ctx, commit_hash)
    }

    /// Reveal the actual result (phase 2 of commit-reveal).
    /// The program verifies the reveal matches the commit hash.
    pub fn reveal_result(
        ctx: Context<RevealResult>,
        output_cid: [u8; 32],
        secret: [u8; 32],
    ) -> Result<()> {
        instructions::reveal_result::handler(ctx, output_cid, secret)
    }

    /// Settle a job — pay the node operator minus platform fee.
    pub fn settle_job(ctx: Context<SettleJob>) -> Result<()> {
        instructions::settle_job::handler(ctx)
    }

    /// Cancel an expired or unclaimed job — return bounty to client.
    pub fn cancel_job(ctx: Context<CancelJob>) -> Result<()> {
        instructions::cancel_job::handler(ctx)
    }
}
