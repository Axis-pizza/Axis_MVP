use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("Kage111111111111111111111111111111111111111");

#[program]
pub mod kagemusha {
    use super::*;

    /// Initialize a new strategy vault with the given parameters.
    /// 
    /// # Arguments
    /// * `name` - Strategy name (max 32 chars)
    /// * `strategy_type` - 0: Sniper, 1: Fortress, 2: Wave
    /// * `target_weights` - Token weights in basis points (must sum to 10000)
    pub fn initialize_strategy(
        ctx: Context<InitializeStrategy>,
        name: String,
        strategy_type: u8,
        target_weights: Vec<u16>,
    ) -> Result<()> {
        initialize::handler(ctx, name, strategy_type, target_weights)
    }

    /// Deposit tokens into a strategy vault.
    /// Creates or updates the user's position.
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        deposit::handler(ctx, amount)
    }

    /// Execute a tactical rebalance via Jupiter swap.
    /// Only callable by the strategy owner.
    pub fn tactical_rebalance(
        ctx: Context<Rebalance>,
        amount_in: u64,
        minimum_amount_out: u64,
    ) -> Result<()> {
        rebalance::handler(ctx, amount_in, minimum_amount_out)
    }
}
