use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};
use anchor_lang::solana_program::program::{invoke_signed};
use anchor_lang::solana_program::instruction::AccountMeta;
use std::str::FromStr;
use crate::state::StrategyVault;
use crate::errors::KagemushaError;

pub const PROTOCOL_FEE_BPS: u64 = 50;

pub const JUPITER_PROGRAM_ID: Pubkey = pubkey!("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4");

pub const JUPITER_EVENT_AUTHORITY: Pubkey = pubkey!("D8cy77BBepLMngZx6ZukaTff5hCt1HrWyKk3Hnd9oitf");

pub const JUPITER_ROUTE_DISCRIMINATOR: [u8; 8] = [229, 23, 203, 151, 122, 227, 173, 42];

pub const JUPITER_SHARED_ACCOUNTS_ROUTE_DISCRIMINATOR: [u8; 8] = [193, 32, 155, 51, 65, 214, 156, 129];

#[derive(AnchorSerialize)]
pub struct JupiterRouteInstruction {
    pub route_plan: Vec<u8>,
    pub in_amount: u64,
    pub quoted_out_amount: u64,
    pub slippage_bps: u16,
    pub platform_fee_bps: u8,
}

#[derive(Accounts)]
pub struct Rebalance<'info> {
    #[account(
        mut,
        has_one = owner @ KagemushaError::Unauthorized
    )]
    pub strategy: Account<'info, StrategyVault>,

    pub owner: Signer<'info>,

    /// CHECK: Validated via address constraint below - prevents arbitrary CPI
    #[account(address = JUPITER_PROGRAM_ID)]
    pub jupiter_program: UncheckedAccount<'info>,

    /// CHECK: Fixed address constraint - safe for Jupiter event authority
    #[account(address = JUPITER_EVENT_AUTHORITY)]
    pub jupiter_event_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        constraint = vault_token_in.mint == mint_in.key() @ KagemushaError::MintMismatch
    )]
    pub vault_token_in: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = vault_token_out.mint == mint_out.key() @ KagemushaError::MintMismatch
    )]
    pub vault_token_out: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = protocol_fee_account.key() == Pubkey::from_str(PROTOCOL_TREASURY_PUBKEY).unwrap() @ KagemushaError::InvalidFeeAccount
    )]
    pub protocol_fee_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,

    pub mint_in: Account<'info, anchor_spl::token::Mint>,
    pub mint_out: Account<'info, anchor_spl::token::Mint>,
}

pub const PROTOCOL_TREASURY_PUBKEY: &str = "9WzDXwBbmkg8ZTbNMmuUwqPFthNQ4EqC";

pub fn handler(
    ctx: Context<Rebalance>,
    amount_in: u64,
    minimum_amount_out: u64,
    route_data: Vec<u8>,
) -> Result<()> {
    let strategy = &mut ctx.accounts.strategy;

    require!(strategy.is_active, KagemushaError::StrategyInactive);
    require!(amount_in > 0, KagemushaError::InsufficientFunds);
    require!(minimum_amount_out > 0, KagemushaError::InsufficientFunds);

    require!(
        ctx.accounts.vault_token_in.amount >= amount_in,
        KagemushaError::InsufficientFunds
    );

    require!(!route_data.is_empty(), KagemushaError::InvalidRouteData);
    require!(route_data.len() <= 1200, KagemushaError::InvalidRouteData);

    let calculated_fee = amount_in
        .checked_mul(PROTOCOL_FEE_BPS)
        .ok_or(KagemushaError::MathOverflow)?
        .checked_div(10000)
        .ok_or(KagemushaError::MathOverflow)?;

    let fee = std::cmp::max(1, calculated_fee);

    require!(
        amount_in > fee,
        KagemushaError::InsufficientFunds
    );

    let swap_amount = amount_in
        .checked_sub(fee)
        .ok_or(KagemushaError::MathOverflow)?;

    strategy.fees_collected = strategy
        .fees_collected
        .checked_add(fee)
        .ok_or(KagemushaError::MathOverflow)?;
    strategy.last_rebalance = Clock::get()?.unix_timestamp;

    msg!("Kagemusha Rebalance:");
    msg!("  Strategy: {}", strategy.name_as_str());
    msg!("  Amount In: {}", amount_in);
    msg!("  Protocol Fee (0.5%): {}", fee);
    msg!("  Swap Amount: {}", swap_amount);
    msg!("  Min Amount Out: {}", minimum_amount_out);

    // Build PDA signer seeds for strategy vault
    let seeds: &[&[u8]] = &[
        b"strategy",
        strategy.owner.as_ref(),
        strategy.name.as_ref(),
        &[strategy.bump]
    ];
    let signer_seeds = &[seeds];

    let fee_transfer = anchor_spl::token::Transfer {
        from: ctx.accounts.vault_token_in.to_account_info(),
        to: ctx.accounts.protocol_fee_account.to_account_info(),
        authority: strategy.to_account_info(),
    };
    anchor_spl::token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            fee_transfer,
            signer_seeds,
        ),
        fee,
    )?;

    let mut jupiter_accounts = vec![
        AccountMeta::new_readonly(ctx.accounts.jupiter_program.key(), false),
        AccountMeta::new_readonly(ctx.accounts.jupiter_event_authority.key(), false),
        AccountMeta::new(ctx.accounts.vault_token_in.key(), true),
        AccountMeta::new(ctx.accounts.vault_token_out.key(), true),
        AccountMeta::new(ctx.accounts.owner.key(), true),
        AccountMeta::new(ctx.accounts.user_token_account.key(), false),
        AccountMeta::new_readonly(ctx.accounts.mint_in.key(), false),
        AccountMeta::new_readonly(ctx.accounts.mint_out.key(), false),
        AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),
    ];

    let jupiter_instruction = anchor_lang::solana_program::instruction::Instruction {
        program_id: JUPITER_PROGRAM_ID,
        accounts: jupiter_accounts,
        data: route_data,
    };

    invoke_signed(
        &jupiter_instruction,
        &[
            ctx.accounts.jupiter_program.to_account_info(),
            ctx.accounts.jupiter_event_authority.to_account_info(),
            ctx.accounts.vault_token_in.to_account_info(),
            ctx.accounts.vault_token_out.to_account_info(),
            ctx.accounts.owner.to_account_info(),
            ctx.accounts.user_token_account.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
        ],
        signer_seeds,
    ).map_err(|e| {
        msg!("Jupiter swap failed: {:?}", e);
        KagemushaError::JupiterSwapFailed
    })?;

    msg!("Kagemusha: Rebalance complete. Jupiter swap executed successfully.");
    msg!("  Fee collected: {}", fee);
    msg!("  Swap executed: {}", swap_amount);

    Ok(())
}
