use anchor_lang::prelude::*;

/// The core account that stores a user's strategy configuration.
/// Each strategy is a PDA derived from the owner's pubkey and strategy name.
#[account]
#[derive(Default)]
pub struct StrategyVault {
    /// The owner (Shogun) who created this strategy
    pub owner: Pubkey,
    
    /// Human-readable name (max 32 chars)
    pub name: [u8; 32],
    
    /// Strategy type: 0 = Sniper, 1 = Fortress, 2 = Wave
    pub strategy_type: u8,
    
    /// Target weights in basis points (10000 = 100%)
    /// Each element represents the weight for a token in the composition
    pub target_weights: [u16; 10],
    
    /// Number of active tokens in the composition
    pub num_tokens: u8,
    
    /// Whether the strategy is actively rebalancing
    pub is_active: bool,
    
    /// Total value locked in the vault (in lamports equivalent)
    pub tvl: u64,
    
    /// Accumulated fees collected
    pub fees_collected: u64,
    
    /// Last rebalance timestamp
    pub last_rebalance: i64,
    
    /// PDA bump seed
    pub bump: u8,
}

impl StrategyVault {
    pub const LEN: usize = 8  // discriminator
        + 32  // owner
        + 32  // name
        + 1   // strategy_type
        + 20  // target_weights (10 * 2 bytes)
        + 1   // num_tokens
        + 1   // is_active
        + 8   // tvl
        + 8   // fees_collected
        + 8   // last_rebalance
        + 1;  // bump
    
    pub fn name_as_str(&self) -> String {
        let end = self.name.iter().position(|&c| c == 0).unwrap_or(32);
        String::from_utf8_lossy(&self.name[..end]).to_string()
    }
}

/// Tracks individual user deposits into a strategy vault.
#[account]
pub struct UserPosition {
    /// The strategy vault this position belongs to
    pub vault: Pubkey,
    
    /// The user who owns this position
    pub user: Pubkey,
    
    /// Amount of LP tokens representing share ownership
    pub lp_shares: u64,
    
    /// Timestamp of initial deposit
    pub deposit_time: i64,
    
    /// Entry value in USDC (for PnL calculation)
    pub entry_value: u64,
    
    /// PDA bump seed
    pub bump: u8,
}

impl UserPosition {
    pub const LEN: usize = 8  // discriminator
        + 32  // vault
        + 32  // user
        + 8   // lp_shares
        + 8   // deposit_time
        + 8   // entry_value
        + 1;  // bump
}
