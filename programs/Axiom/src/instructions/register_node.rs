use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::{NodeRegistry, NodeStatus, PlatformConfig};
use crate::errors::AxiomError;

/// Register a new GPU node operator.
/// The operator must stake at least the minimum SOL amount.
/// Stake is transferred from the operator to the node registry PDA.
pub fn handler(
    ctx: Context<RegisterNode>,
    models_supported: Vec<[u8; 32]>,
) -> Result<()> {
    let config = &ctx.accounts.platform_config;

    // Ensure minimum stake is met
    let stake_amount = ctx.accounts.stake_deposit.lamports();
    require!(
        stake_amount >= config.min_stake,
        AxiomError::InsufficientStake
    );

    // Transfer stake from operator to node PDA
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.operator.to_account_info(),
                to: ctx.accounts.node_registry.to_account_info(),
            },
        ),
        config.min_stake,
    )?;

    // Initialize node registry
    let clock = Clock::get()?;
    let node = &mut ctx.accounts.node_registry;
    node.operator = ctx.accounts.operator.key();
    node.stake_amount = config.min_stake;
    node.models_supported = models_supported;
    node.jobs_completed = 0;
    node.jobs_failed = 0;
    node.reputation = 5000; // Start at 50%
    node.status = NodeStatus::Active;
    node.registered_at = clock.unix_timestamp;
    node.total_earned = 0;
    node.bump = ctx.bumps.node_registry;

    // Update platform stats
    let platform_config = &mut ctx.accounts.platform_config;
    platform_config.total_nodes = platform_config.total_nodes.checked_add(1)
        .ok_or(AxiomError::ArithmeticOverflow)?;

    msg!(
        "Node registered: {} with stake {} lamports, supporting {} models",
        node.operator,
        node.stake_amount,
        node.models_supported.len()
    );

    Ok(())
}

#[derive(Accounts)]
pub struct RegisterNode<'info> {
    #[account(
        init,
        payer = operator,
        space = 8 + NodeRegistry::INIT_SPACE,
        seeds = [b"node", operator.key().as_ref()],
        bump,
    )]
    pub node_registry: Account<'info, NodeRegistry>,

    #[account(
        mut,
        seeds = [b"config"],
        bump = platform_config.bump,
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    /// CHECK: This is just used as a reference for the stake amount
    #[account()]
    pub stake_deposit: AccountInfo<'info>,

    #[account(mut)]
    pub operator: Signer<'info>,

    pub system_program: Program<'info, System>,
}
