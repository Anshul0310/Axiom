use anchor_lang::prelude::*;
use crate::state::PlatformConfig;

/// Initialize the platform configuration.
/// This should be called once by the admin to set up global parameters.
pub fn handler(ctx: Context<Initialize>, params: InitializeParams) -> Result<()> {
    let config = &mut ctx.accounts.platform_config;

    config.admin = ctx.accounts.admin.key();
    config.min_stake = params.min_stake;
    config.platform_fee_bps = params.platform_fee_bps;
    config.verification_rate_bps = params.verification_rate_bps;
    config.slash_penalty_bps = params.slash_penalty_bps;
    config.total_jobs = 0;
    config.total_volume = 0;
    config.total_nodes = 0;
    config.bump = ctx.bumps.platform_config;

    msg!("Axiom platform initialized by admin: {}", config.admin);
    Ok(())
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitializeParams {
    /// Minimum stake in lamports (e.g., 100_000_000 = 0.1 SOL)
    pub min_stake: u64,
    /// Platform fee in basis points (e.g., 250 = 2.5%)
    pub platform_fee_bps: u16,
    /// Verification sampling rate in basis points (e.g., 2000 = 20%)
    pub verification_rate_bps: u16,
    /// Slash penalty in basis points of stake (e.g., 5000 = 50%)
    pub slash_penalty_bps: u16,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + PlatformConfig::INIT_SPACE,
        seeds = [b"config"],
        bump,
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}
