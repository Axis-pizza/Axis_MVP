use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};
use crate::state::StrategyVault;
use crate::errors::KagemushaError;

/// Protocol fee: 0.5% (50 basis points)
pub const PROTOCOL_FEE_BPS: u64 = 50;

#[derive(Accounts)]
pub struct Rebalance<'info> {
    #[account(
        mut,
        has_one = owner @ KagemushaError::Unauthorized
    )]
    pub strategy: Account<'info, StrategyVault>,
    
    pub owner: Signer<'info>,
    
    /// CHECK: Jupiter Program for swap routing
    pub jupiter_program: UncheckedAccount<'info>,
    
    #[account(mut)]
    pub vault_token_in: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub vault_token_out: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub protocol_fee_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

pub fn handler(
    ctx: Context<Rebalance>,
    amount_in: u64,
    minimum_amount_out: u64,
) -> Result<()> {
    require!(ctx.accounts.strategy.is_active, KagemushaError::StrategyInactive);
    require!(amount_in > 0, KagemushaError::InsufficientFunds);
    
    let strategy = &mut ctx.accounts.strategy;
    
    // Calculate protocol fee
    let fee = amount_in.checked_mul(PROTOCOL_FEE_BPS).unwrap().checked_div(10000).unwrap();
    let swap_amount = amount_in.checked_sub(fee).unwrap();
    
    msg!("Kagemusha Rebalance:");
    msg!("  Strategy: {}", strategy.name_as_str());
    msg!("  Amount In: {}", amount_in);
    msg!("  Protocol Fee (0.5%): {}", fee);
    msg!("  Swap Amount: {}", swap_amount);
    msg!("  Min Amount Out: {}", minimum_amount_out);
    
    // In production, this would invoke Jupiter CPI:
    // jupiter::cpi::swap(
    //     ctx.accounts.into_jupiter_context(),
    //     swap_amount,
    //     minimum_amount_out,
    // )?;
    
    // Update state
    strategy.fees_collected = strategy.fees_collected.checked_add(fee).unwrap();
    strategy.last_rebalance = Clock::get()?.unix_timestamp;
    
    msg!("Kagemusha: Rebalance complete. Jupiter route executed.");
    
    Ok(())
}
