use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::{StrategyVault, UserPosition};
use crate::errors::KagemushaError;

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(
        mut,
        has_one = owner @ KagemushaError::Unauthorized
    )]
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
    
    pub owner: Signer<'info>,
    
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    require!(ctx.accounts.strategy.is_active, KagemushaError::StrategyInactive);
    require!(amount > 0, KagemushaError::InsufficientFunds);
    
    // Transfer tokens to vault
    let cpi_accounts = Transfer {
        from: ctx.accounts.user_token_account.to_account_info(),
        to: ctx.accounts.vault_token_account.to_account_info(),
        authority: ctx.accounts.user.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    token::transfer(cpi_ctx, amount)?;
    
    // Update position
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
    
    msg!("Kagemusha: Deposited {} to strategy {}", amount, strategy.name_as_str());
    
    Ok(())
}
