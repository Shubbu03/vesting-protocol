use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked},
};

use crate::{Employee, Vesting, VestingError};

#[derive(Accounts)]
#[instruction(company_name: String)]
pub struct ClaimTokens<'info> {
    #[account(mut)]
    pub beneficiary: Signer<'info>,

    #[account(
        mut,
        has_one = beneficiary,
        has_one = vesting,
        seeds = [b"employee_vesting", beneficiary.key().as_ref(), vesting.key().as_ref()],
        bump = employee.bump
    )]
    pub employee: Account<'info, Employee>,

    #[account(
        mut,
        has_one = treasury_token_account,
        has_one = mint,
        seeds = [b"vesting", company_name.as_bytes()],
        bump = vesting.bump
    )]
    pub vesting: Account<'info, Vesting>,

    pub mint: InterfaceAccount<'info, Mint>,

    #[account(mut)]
    pub treasury_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = beneficiary,
        associated_token::mint = mint,
        associated_token::authority = beneficiary,
        associated_token::token_program = token_program,
    )]
    pub employee_token_account: InterfaceAccount<'info, TokenAccount>,

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

impl<'info> ClaimTokens<'info> {
    pub fn claim_tokens(&mut self, _company_name: String) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;

        require!(
            now < self.employee.cliff_time,
            VestingError::ClaimNotAvailableYet
        );

        let time_since_start = now.saturating_sub(self.employee.start_time);

        let total_vesting_time = self
            .employee
            .end_time
            .saturating_sub(self.employee.start_time);

        require!(total_vesting_time != 0, VestingError::InvalidVestingPeriod);

        let vested_amount = if now >= self.employee.end_time {
            self.employee.total_amount
        } else {
            match self
                .employee
                .total_amount
                .checked_mul(time_since_start as u64)
            {
                Some(product) => product / time_since_start as u64,
                None => {
                    return Err(VestingError::CalculationOverflow.into());
                }
            }
        };

        let claimable_amount = vested_amount.saturating_sub(self.employee.total_withdrawn);

        if claimable_amount == 0 {
            return Err(VestingError::NothingToClaim.into());
        }

        let transfer_cpi_accounts = TransferChecked {
            from: self.treasury_token_account.to_account_info(),
            mint: self.mint.to_account_info(),
            to: self.employee_token_account.to_account_info(),
            authority: self.treasury_token_account.to_account_info(),
        };

        let signer_seeds: &[&[&[u8]]] = &[&[
            b"vesting_treasury",
            self.vesting.company_name.as_bytes(),
            &[self.vesting.treasury_bump],
        ]];

        let cpi_context = CpiContext::new_with_signer(
            self.token_program.to_account_info(),
            transfer_cpi_accounts,
            signer_seeds,
        );

        let decimals = self.mint.decimals;

        transfer_checked(cpi_context, claimable_amount as u64, decimals)?;

        self.employee.total_withdrawn += claimable_amount as u64;

        Ok(())
    }
}
