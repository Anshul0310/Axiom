use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::{Job, JobStatus, PlatformConfig};
use crate::errors::AxiomError;

/// Post a new inference job.
/// The client specifies a model, input data CID, bounty, and deadline.
/// The bounty is transferred to the job PDA as escrow.
pub fn handler(
    ctx: Context<PostJob>,
    job_id: u64,
    model_id: [u8; 32],
    input_cid: [u8; 32],
    bounty_lamports: u64,
    deadline: i64,
) -> Result<()> {
    let clock = Clock::get()?;

    // Validate bounty
    require!(bounty_lamports > 0, AxiomError::InvalidBounty);

    // Validate deadline
    require!(deadline > clock.unix_timestamp, AxiomError::InvalidDeadline);

    // Transfer bounty from client to job PDA (escrow)
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.client.to_account_info(),
                to: ctx.accounts.job.to_account_info(),
            },
        ),
        bounty_lamports,
    )?;

    // Initialize job account
    let job = &mut ctx.accounts.job;
    job.client = ctx.accounts.client.key();
    job.job_id = job_id;
    job.model_id = model_id;
    job.input_cid = input_cid;
    job.bounty_lamports = bounty_lamports;
    job.status = JobStatus::Open;
    job.node_operator = Pubkey::default();
    job.commit_hash = [0u8; 32];
    job.output_cid = [0u8; 32];
    job.secret = [0u8; 32];
    job.deadline = deadline;
    job.created_at = clock.unix_timestamp;
    job.is_verification_target = false;
    job.bump = ctx.bumps.job;

    // Update platform stats
    let config = &mut ctx.accounts.platform_config;
    config.total_jobs = config.total_jobs.checked_add(1)
        .ok_or(AxiomError::ArithmeticOverflow)?;
    config.total_volume = config.total_volume.checked_add(bounty_lamports)
        .ok_or(AxiomError::ArithmeticOverflow)?;

    msg!(
        "Job posted: ID={}, model={:?}, bounty={} lamports, deadline={}",
        job_id,
        &model_id[..4],
        bounty_lamports,
        deadline
    );

    Ok(())
}

#[derive(Accounts)]
#[instruction(job_id: u64)]
pub struct PostJob<'info> {
    #[account(
        init,
        payer = client,
        space = 8 + Job::INIT_SPACE,
        seeds = [b"job", client.key().as_ref(), &job_id.to_le_bytes()],
        bump,
    )]
    pub job: Account<'info, Job>,

    #[account(
        mut,
        seeds = [b"config"],
        bump = platform_config.bump,
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    #[account(mut)]
    pub client: Signer<'info>,

    pub system_program: Program<'info, System>,
}
