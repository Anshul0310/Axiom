use anchor_lang::prelude::*;
use crate::state::{Job, JobStatus, NodeRegistry, PlatformConfig};
use crate::errors::AxiomError;

/// Settle a revealed job — pay the node operator and collect platform fee.
/// 
/// Settlement flow:
/// 1. Verify job is in Revealed state
/// 2. Calculate platform fee (e.g., 2.5% of bounty)
/// 3. Transfer (bounty - fee) to node operator
/// 4. Transfer fee to platform treasury
/// 5. Update node stats (jobs_completed, reputation, earnings)
/// 6. Mark job as Settled
///
/// For verified jobs, anyone can call this once verification passes.
/// For non-verified jobs, settlement happens automatically after reveal.
pub fn handler(ctx: Context<SettleJob>) -> Result<()> {
    let job = &mut ctx.accounts.job;
    let node = &mut ctx.accounts.node_registry;
    let config = &ctx.accounts.platform_config;

    // Validate job is revealed
    require!(job.status == JobStatus::Revealed, AxiomError::JobNotRevealed);

    // Calculate fees
    let bounty = job.bounty_lamports;
    let platform_fee = bounty
        .checked_mul(config.platform_fee_bps as u64)
        .ok_or(AxiomError::ArithmeticOverflow)?
        .checked_div(10000)
        .ok_or(AxiomError::ArithmeticOverflow)?;
    let node_payment = bounty
        .checked_sub(platform_fee)
        .ok_or(AxiomError::ArithmeticOverflow)?;

    // Transfer payment to node operator from job PDA
    // Using lamport manipulation since job PDA is the escrow
    let job_account_info = job.to_account_info();
    let node_operator_info = ctx.accounts.node_operator.to_account_info();

    **job_account_info.try_borrow_mut_lamports()? -= node_payment;
    **node_operator_info.try_borrow_mut_lamports()? += node_payment;

    // Transfer platform fee to admin/treasury
    if platform_fee > 0 {
        let admin_info = ctx.accounts.admin.to_account_info();
        **job_account_info.try_borrow_mut_lamports()? -= platform_fee;
        **admin_info.try_borrow_mut_lamports()? += platform_fee;
    }

    // Update node stats
    node.jobs_completed = node.jobs_completed.checked_add(1)
        .ok_or(AxiomError::ArithmeticOverflow)?;
    node.total_earned = node.total_earned.checked_add(node_payment)
        .ok_or(AxiomError::ArithmeticOverflow)?;

    // Increase reputation (cap at 10000)
    let rep_increase = 50u16; // +0.5% per successful job
    node.reputation = node.reputation.saturating_add(rep_increase).min(10000);

    // Mark job as settled
    job.status = JobStatus::Settled;

    msg!(
        "Job {} settled. Node {} paid {} lamports (fee: {} lamports)",
        job.job_id,
        node.operator,
        node_payment,
        platform_fee
    );

    Ok(())
}

#[derive(Accounts)]
pub struct SettleJob<'info> {
    #[account(
        mut,
        seeds = [b"job", job.client.as_ref(), &job.job_id.to_le_bytes()],
        bump = job.bump,
    )]
    pub job: Account<'info, Job>,

    #[account(
        mut,
        seeds = [b"node", job.node_operator.as_ref()],
        bump = node_registry.bump,
        constraint = node_registry.operator == job.node_operator,
    )]
    pub node_registry: Account<'info, NodeRegistry>,

    #[account(
        seeds = [b"config"],
        bump = platform_config.bump,
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    /// CHECK: The node operator receiving payment
    #[account(
        mut,
        constraint = node_operator.key() == job.node_operator @ AxiomError::UnauthorizedNode,
    )]
    pub node_operator: AccountInfo<'info>,

    /// CHECK: The platform admin/treasury receiving fees
    #[account(
        mut,
        constraint = admin.key() == platform_config.admin @ AxiomError::UnauthorizedAdmin,
    )]
    pub admin: AccountInfo<'info>,

    pub caller: Signer<'info>,

    pub system_program: Program<'info, System>,
}
