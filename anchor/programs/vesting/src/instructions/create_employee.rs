use anchor_lang::prelude::*;

use crate::{Employee, Vesting, ANCHOR_DISCRIMINATOR};

#[derive(Accounts)]
pub struct CreateEmployee<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    pub beneficiary: SystemAccount<'info>,

    #[account(
       has_one = owner // this is checked because the employer is the owner who will pay
    )]
    pub vesting: Account<'info, Vesting>,

    #[account(
        init,
        payer = owner,
        space = ANCHOR_DISCRIMINATOR + Employee::INIT_SPACE,
        seeds = [b"employee_vesting", beneficiary.key().as_ref(), vesting.key().as_ref()],
        bump
    )]
    pub employee: Account<'info, Employee>,

    pub system_program: Program<'info, System>,
}

impl<'info> CreateEmployee<'info> {
    pub fn create_employee(
        &mut self,
        start_time: i64,
        end_time: i64,
        cliff_time: i64,
        total_amount: u64,
        bump: u8,
    ) -> Result<()> {
        self.employee.set_inner(Employee {
            beneficiary: self.beneficiary.key(),
            start_time,
            end_time,
            cliff_time,
            vesting: self.vesting.key(),
            total_amount,
            total_withdrawn: 0,
            bump,
        });

        Ok(())
    }
}
