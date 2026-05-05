use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::hash;
use crate::state::{Job, JobStatus};
use crate::errors::AxiomError;

/// Reveal phase of the commit-reveal protocol.
/// The node reveals the actual output_cid and secret.
/// The program verifies: SHA256(job_id_bytes || output_cid || secret) == commit_hash
///
/// If the hash matches, the job moves to Revealed status.
/// If it doesn't match, the transaction fails.
pub fn handler(
    ctx: Context<RevealResult>,
    output_cid: [u8; 32],
    secret: [u8; 32],
) -> Result<()> {
    let job = &mut ctx.accounts.job;

    // Validate job is in Committed state
    require!(job.status == JobStatus::Committed, AxiomError::JobNotCommitted);

    // Validate the revealer is the same node that committed
    require!(
        job.node_operator == ctx.accounts.operator.key(),
        AxiomError::UnauthorizedNode
    );

    // Verify the commit hash
    // Recompute: SHA256(job_id_bytes || output_cid || secret)
    let job_id_bytes = job.job_id.to_le_bytes();
    let hash_input = [&job_id_bytes[..], &output_cid, &secret].concat();
    let computed_hash = hash(&hash_input);

    require!(
        computed_hash.to_bytes() == job.commit_hash,
        AxiomError::InvalidCommitHash
    );

    // Store the revealed data
    job.output_cid = output_cid;
    job.secret = secret;
    job.status = JobStatus::Revealed;

    msg!(
        "Result revealed for job {} by node {}. Output CID: {:?}",
        job.job_id,
        job.node_operator,
        &output_cid[..4]
    );

    Ok(())
}

#[derive(Accounts)]
pub struct RevealResult<'info> {
    #[account(
        mut,
        seeds = [b"job", job.client.as_ref(), &job.job_id.to_le_bytes()],
        bump = job.bump,
    )]
    pub job: Account<'info, Job>,

    pub operator: Signer<'info>,
}
