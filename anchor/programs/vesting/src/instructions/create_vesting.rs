use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

use crate::{Vesting, ANCHOR_DISCRIMINATOR};

#[derive(Accounts)]
#[instruction(company_name:String)]
pub struct CreateVesting<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        init,
        payer = signer,
        space = ANCHOR_DISCRIMINATOR + Vesting::INIT_SPACE,
        seeds = [b"vesting", company_name.as_bytes()],
        bump
    )]
    pub vesting: Account<'info, Vesting>,

    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        init,
        payer = signer,
        seeds = [b"vesting_treasury", company_name.as_bytes()],
        bump,
        token::mint = mint,
        token::authority = treasury_token_account,
    )]
    pub treasury_token_account: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

impl<'info> CreateVesting<'info> {
    pub fn create_vesting(
        &mut self,
        company_name: String,
        treasury_bump: u8,
        bump: u8,
    ) -> Result<()> {
        self.vesting.set_inner(Vesting {
            owner: self.signer.key(),
            mint: self.mint.key(),
            treasury_token_account: self.treasury_token_account.key(),
            company_name,
            treasury_bump,
            bump,
        });

        Ok(())
    }
}
