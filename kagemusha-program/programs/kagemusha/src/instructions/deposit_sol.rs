use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::{StrategyVault, UserPosition};
use crate::errors::KagemushaError;

/// Deposit native SOL into a strategy vault
/// This is a simpler version that doesn't require token accounts
#[derive(Accounts)]
pub struct DepositSol<'info> {
    #[account(mut)]
    pub strategy: Account<'info, StrategyVault>,
    
    #[account(
        init_if_needed,
        payer = user,
        space = UserPosition::LEN,
        seeds = [b"position", strategy.key().as_ref(), user.key().as_ref()],
        bump
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

pub fn handler(ctx: Context<DepositSol>, amount: u64) -> Result<()> {
    let strategy = &ctx.accounts.strategy;
    
    // Check strategy is active
    require!(strategy.is_active, KagemushaError::StrategyInactive);
    require!(amount > 0, KagemushaError::InsufficientFunds);
    
    // Transfer SOL from user to vault
    let cpi_context = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        system_program::Transfer {
            from: ctx.accounts.user.to_account_info(),
            to: ctx.accounts.vault_sol.to_account_info(),
        },
    );
    system_program::transfer(cpi_context, amount)?;
    
    // Update user position
    let position = &mut ctx.accounts.position;
    position.vault = ctx.accounts.strategy.key();
    position.user = ctx.accounts.user.key();
    position.lp_shares = position.lp_shares.checked_add(amount).unwrap();
    position.deposit_time = Clock::get()?.unix_timestamp;
    position.entry_value = position.entry_value.checked_add(amount).unwrap();
    position.bump = ctx.bumps.position;
    
    // Update vault TVL
    let strategy = &mut ctx.accounts.strategy;
    strategy.tvl = strategy.tvl.checked_add(amount).unwrap();
    
    msg!("Kagemusha: Deposited {} lamports to strategy {}", amount, strategy.name_as_str());
    
    Ok(())
}
