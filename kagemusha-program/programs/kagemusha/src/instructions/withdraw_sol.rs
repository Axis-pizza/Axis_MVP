use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::{StrategyVault, UserPosition};
use crate::errors::KagemushaError;

/// Withdraw native SOL from a strategy vault
#[derive(Accounts)]
pub struct WithdrawSol<'info> {
    #[account(mut)]
    pub strategy: Account<'info, StrategyVault>,

    #[account(
        mut,
        seeds = [b"position", strategy.key().as_ref(), user.key().as_ref()],
        bump,
        constraint = position.user == user.key() @ KagemushaError::Unauthorized,
    )]
    pub position: Account<'info, UserPosition>,

    #[account(mut)]
    pub user: Signer<'info>,

    /// CHECK: This is the vault's SOL account (PDA)
    #[account(
        mut,
        seeds = [b"vault_sol", strategy.key().as_ref()],
        bump
    )]
    pub vault_sol: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<WithdrawSol>, amount: u64) -> Result<()> {
    let strategy = &ctx.accounts.strategy;
    let position = &ctx.accounts.position;

    // Validate strategy is active
    require!(strategy.is_active, KagemushaError::StrategyInactive);
    require!(amount > 0, KagemushaError::InsufficientFunds);
    require!(amount <= position.lp_shares, KagemushaError::InsufficientFunds);

    // Build PDA signer seeds for vault_sol
    let strategy_key = ctx.accounts.strategy.key();
    let seeds: &[&[u8]] = &[
        b"vault_sol",
        strategy_key.as_ref(),
        &[ctx.bumps.vault_sol]
    ];
    let signer_seeds = &[seeds];

    // Transfer SOL from vault to user
    let vault_sol = &ctx.accounts.vault_sol;
    let user = &ctx.accounts.user;
    
    // Use invoke_signed for PDA transfer
    let transfer_ix = anchor_lang::solana_program::system_instruction::transfer(
        vault_sol.key,
        user.key,
        amount,
    );
    anchor_lang::solana_program::program::invoke_signed(
        &transfer_ix,
        &[
            vault_sol.to_account_info(),
            user.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
        signer_seeds,
    )?;

    // Update position
    let position = &mut ctx.accounts.position;
    position.lp_shares = position.lp_shares.checked_sub(amount).ok_or(KagemushaError::MathOverflow)?;

    // Update strategy TVL
    let strategy = &mut ctx.accounts.strategy;
    strategy.tvl = strategy.tvl.checked_sub(amount).ok_or(KagemushaError::MathOverflow)?;

    msg!("Kagemusha: Withdrew {} lamports from strategy {}", amount, strategy.name_as_str());

    Ok(())
}
