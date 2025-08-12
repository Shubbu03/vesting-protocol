#![allow(clippy::result_large_err, unexpected_cfgs, deprecated)]

pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;
pub use constants::*;
pub use error::*;
pub use instructions::*;
pub use state::*;

declare_id!("JAVuBXeBZqXNtS73azhBDAoYaaAFfo4gWXoZe2e7Jf8H");

#[program]
pub mod vesting {
    use super::*;

    pub fn create_vesting(ctx: Context<CreateVesting>, company_name: String) -> Result<()> {
        ctx.accounts.create_vesting(
            company_name,
            ctx.bumps.treasury_token_account,
            ctx.bumps.vesting,
        )
    }

    pub fn create_employee(
        ctx: Context<CreateEmployee>,
        start_time: i64,
        end_time: i64,
        cliff_time: i64,
        total_amount: u64,
    ) -> Result<()> {
        ctx.accounts.create_employee(
            start_time,
            end_time,
            cliff_time,
            total_amount,
            ctx.bumps.employee,
        )
    }

    pub fn claim_tokens(ctx: Context<ClaimTokens>, company_name: String) -> Result<()> {
        ctx.accounts.claim_tokens(company_name)
    }
}
