use anchor_lang::prelude::*;

#[error_code]
pub enum KagemushaError {
    #[msg("Invalid strategy type. Must be 0 (Sniper), 1 (Fortress), or 2 (Wave).")]
    InvalidStrategyType,
    
    #[msg("Weights must sum to 10000 basis points (100%).")]
    InvalidWeightSum,
    
    #[msg("Strategy name too long. Maximum 32 characters.")]
    NameTooLong,
    
    #[msg("Unauthorized. Only the owner can perform this action.")]
    Unauthorized,
    
    #[msg("Strategy is not active.")]
    StrategyInactive,
    
    #[msg("Insufficient funds for rebalance.")]
    InsufficientFunds,
    
    #[msg("Slippage tolerance exceeded.")]
    SlippageExceeded,
}
