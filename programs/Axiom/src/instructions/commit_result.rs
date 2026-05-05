use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::hash;
use crate::state::{Job, JobStatus, NodeRegistry, NodeStatus};
use crate::errors::AxiomError;

/// Commit phase of the commit-reveal protocol.
/// A node operator submits a hash of their inference result.
/// commit_hash = SHA256(job_id_bytes || output_cid || secret)
///
/// This prevents other nodes from copying the result before revealing.
pub fn handler(
    ctx: Context<CommitResult>,
    commit_hash: [u8; 32],
) -> Result<()> {
    let job = &mut ctx.accounts.job;
    let node = &ctx.accounts.node_registry;
    let clock = Clock::get()?;

    // Validate job is open
    require!(job.status == JobStatus::Open, AxiomError::JobNotOpen);

    // Validate job hasn't expired
    require!(clock.unix_timestamp < job.deadline, AxiomError::JobExpired);

    // Validate node is active
    require!(node.status == NodeStatus::Active, AxiomError::NodeNotActive);

    // Check that node supports the requested model
    let model_supported = node.models_supported.iter().any(|m| *m == job.model_id);
    require!(model_supported, AxiomError::UnsupportedModel);

    // Store the commit
    job.node_operator = ctx.accounts.operator.key();
    job.commit_hash = commit_hash;
    job.status = JobStatus::Committed;

    // Determine if this job should be verified (using slot hash as pseudo-randomness)
    // In production, this would use VRF (Switchboard/Orao)
    let slot = clock.slot;
    let slot_bytes = slot.to_le_bytes();
    let hash_input = [job.client.as_ref(), &slot_bytes].concat();
    let randomness = hash(&hash_input);
    let random_value = u16::from_le_bytes([randomness.to_bytes()[0], randomness.to_bytes()[1]]);

    // Check against verification rate from config
    // For simplicity, we use a fixed 20% rate (2000 bps)
    let verification_threshold = 2000u16; // 20%
    job.is_verification_target = random_value % 10000 < verification_threshold;

    msg!(
        "Result committed for job {} by node {}. Verification target: {}",
        job.job_id,
        job.node_operator,
        job.is_verification_target
    );

    Ok(())
}

#[derive(Accounts)]
pub struct CommitResult<'info> {
    #[account(
        mut,
        seeds = [b"job", job.client.as_ref(), &job.job_id.to_le_bytes()],
        bump = job.bump,
    )]
    pub job: Account<'info, Job>,

    #[account(
        seeds = [b"node", operator.key().as_ref()],
        bump = node_registry.bump,
    )]
    pub node_registry: Account<'info, NodeRegistry>,

    pub operator: Signer<'info>,
}
