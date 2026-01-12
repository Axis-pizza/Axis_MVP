use anchor_lang::prelude::*;
use crate::state::StrategyVault;
use crate::errors::KagemushaError;

#[derive(Accounts)]
#[instruction(name: String, strategy_type: u8)]
pub struct InitializeStrategy<'info> {
    #[account(
        init,
        payer = owner,
        space = StrategyVault::LEN,
        seeds = [b"strategy", owner.key().as_ref(), name.as_bytes()],
        bump
    )]
    pub strategy: Account<'info, StrategyVault>,
    
    #[account(mut)]
    pub owner: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<InitializeStrategy>,
    name: String,
    strategy_type: u8,
    target_weights: Vec<u16>,
) -> Result<()> {
    // Validate inputs
    require!(name.len() <= 32, KagemushaError::NameTooLong);
    require!(strategy_type <= 2, KagemushaError::InvalidStrategyType);
    
    let weight_sum: u32 = target_weights.iter().map(|&w| w as u32).sum();
    require!(weight_sum == 10000, KagemushaError::InvalidWeightSum);
    
    let strategy = &mut ctx.accounts.strategy;
    
    // Copy name into fixed-size array
    let mut name_bytes = [0u8; 32];
    let name_slice = name.as_bytes();
    name_bytes[..name_slice.len()].copy_from_slice(name_slice);
    
    // Copy weights into fixed-size array
    let mut weights = [0u16; 10];
    for (i, &w) in target_weights.iter().enumerate().take(10) {
        weights[i] = w;
    }
    
    strategy.owner = ctx.accounts.owner.key();
    strategy.name = name_bytes;
    strategy.strategy_type = strategy_type;
    strategy.target_weights = weights;
    strategy.num_tokens = target_weights.len() as u8;
    strategy.is_active = true;
    strategy.tvl = 0;
    strategy.fees_collected = 0;
    strategy.last_rebalance = Clock::get()?.unix_timestamp;
    strategy.bump = ctx.bumps.strategy;
    
    msg!("Kagemusha: Strategy '{}' initialized by {} (Jito Bundle)", name, ctx.accounts.owner.key());
    
    Ok(())
}
