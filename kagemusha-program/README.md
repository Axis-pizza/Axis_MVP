# KAGEMUSHA (影武者) - AI Strategy Factory

> Autonomous AI-Powered ETF Creator for Solana

## Vision

Kagemusha is a professional-grade AI strategy factory that transforms complex DeFi operations into simple, one-click tactical decisions. Users act as **Shoguns** (decision makers), while AI handles the **Quant** (mathematical complexity).

**Core Philosophy**: "The user is Tony Stark. The AI is Jarvis."

## Architecture

```
kagemusha-program/
├── Anchor.toml
├── Cargo.toml
├── programs/
│   └── kagemusha/
│       └── src/
│           ├── lib.rs              # Program entry point
│           ├── errors.rs           # Custom error codes
│           ├── state/
│           │   └── mod.rs          # StrategyVault, UserPosition
│           └── instructions/
│               ├── mod.rs          # Re-exports
│               ├── initialize.rs   # Create strategy vault
│               ├── deposit.rs      # Deposit tokens
│               └── rebalance.rs    # Jupiter swap integration
```

## Accounts

### StrategyVault
- `owner`: Pubkey of strategy creator
- `name`: 32-byte strategy name
- `strategy_type`: 0=Sniper, 1=Fortress, 2=Wave
- `target_weights`: Token allocation (basis points)
- `tvl`: Total value locked
- `fees_collected`: Protocol fees earned

### UserPosition
- `vault`: Associated strategy
- `lp_shares`: Ownership share
- `entry_value`: For PnL calculation

## Instructions

### `initialize_strategy`
Creates a new AI-managed strategy vault.

```rust
pub fn initialize_strategy(
    ctx: Context<InitializeStrategy>,
    name: String,           // Max 32 chars
    strategy_type: u8,      // 0, 1, or 2
    target_weights: Vec<u16>, // Must sum to 10000
) -> Result<()>
```

### `deposit`
Deposit tokens and receive LP shares.

### `tactical_rebalance`
Execute Jupiter swap to rebalance portfolio. Collects 0.5% protocol fee.

## Build & Deploy

```bash
# Install dependencies
cd kagemusha-program
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Run tests
anchor test
```

## Security

- PDA-based account derivation
- Owner-only rebalance authorization
- Input validation on all parameters
- Slippage protection via minimum_amount_out

## Integration

The program is designed to work with:
- **Jupiter V6**: Swap routing
- **Pyth Network**: Price feeds
- **Cloudflare Vectorize**: Strategy matching (off-chain)

---
*Built for the Axis Protocol*
