use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Transfer};
use crate::state::{StrategyVault, UserPosition};
use crate::errors::KagemushaError;

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
        mut,
        has_one = owner @ KagemushaError::Unauthorized
    )]
    pub strategy: Account<'info, StrategyVault>,

    #[account(
        mut,
        seeds = [b"position", strategy.key().as_ref(), owner.key().as_ref()],
        bump,
        constraint = position.user == owner.key() @ KagemushaError::Unauthorized,
        close = owner
    )]
    pub position: Account<'info, UserPosition>,

    pub owner: Signer<'info>,

    #[account(
        mut,
        constraint = vault_token_account.mint == strategy_mint.key() @ KagemushaError::MintMismatch,
        constraint = vault_token_account.amount >= position.lp_shares @ KagemushaError::InsufficientFunds
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    pub strategy_mint: Account<'info, anchor_spl::token::Mint>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(
    ctx: Context<Withdraw>,
    amount: u64,
) -> Result<()> {
    let strategy = &mut ctx.accounts.strategy;
    let position = &ctx.accounts.position;

    // Validate strategy is active
    require!(strategy.is_active, KagemushaError::StrategyInactive);

    // Validate withdrawal amount
    require!(amount > 0, KagemushaError::InsufficientFunds);
    require!(amount <= position.lp_shares, KagemushaError::InsufficientFunds);

    // Build PDA signer seeds for strategy vault
    let seeds: &[&[u8]] = &[
        b"strategy",
        strategy.owner.as_ref(),
        strategy.name.as_ref(),
        &[strategy.bump]
    ];
    let signer_seeds = &[seeds];

    // Transfer tokens to user
    let transfer_accounts = Transfer {
        from: ctx.accounts.vault_token_account.to_account_info(),
        to: ctx.accounts.user_token_account.to_account_info(),
        authority: strategy.to_account_info(),
    };
    let transfer_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        transfer_accounts,
        signer_seeds,
    );
    anchor_spl::token::transfer(transfer_ctx, amount)?;

    // Update strategy TVL
    strategy.tvl = strategy
        .tvl
        .checked_sub(amount)
        .ok_or(KagemushaError::MathOverflow)?;

    msg!("Kagemusha: Withdraw {} from strategy {}", amount, strategy.name_as_str());

    Ok(())
}
