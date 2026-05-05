use anchor_lang::prelude::*;
use crate::state::{Job, JobStatus};
use crate::errors::AxiomError;

/// Cancel a job that has expired or hasn't been picked up.
/// Returns the bounty escrow back to the client.
///
/// Can only be called by the original client.
/// Job must be in Open or Committed state AND past its deadline.
pub fn handler(ctx: Context<CancelJob>) -> Result<()> {
    let job = &mut ctx.accounts.job;
    let clock = Clock::get()?;

    // Only the client can cancel
    require!(
        job.client == ctx.accounts.client.key(),
        AxiomError::UnauthorizedClient
    );

    // Job must be past deadline OR still in Open state
    let can_cancel = match job.status {
        JobStatus::Open => true, // Client can cancel an open job anytime
        JobStatus::Committed => clock.unix_timestamp > job.deadline, // Can cancel committed jobs past deadline
        _ => false,
    };

    require!(can_cancel, AxiomError::JobNotOpen);

    // Return bounty to client
    let bounty = job.bounty_lamports;
    let job_info = job.to_account_info();
    let client_info = ctx.accounts.client.to_account_info();

    **job_info.try_borrow_mut_lamports()? -= bounty;
    **client_info.try_borrow_mut_lamports()? += bounty;

    // Mark as expired
    job.status = JobStatus::Expired;
    job.bounty_lamports = 0;

    msg!(
        "Job {} cancelled. {} lamports returned to client {}",
        job.job_id,
        bounty,
        job.client
    );

    Ok(())
}

#[derive(Accounts)]
pub struct CancelJob<'info> {
    #[account(
        mut,
        seeds = [b"job", job.client.as_ref(), &job.job_id.to_le_bytes()],
        bump = job.bump,
    )]
    pub job: Account<'info, Job>,

    #[account(mut)]
    pub client: Signer<'info>,
}
