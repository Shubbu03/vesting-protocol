use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Employee {
    pub beneficiary: Pubkey,
    pub start_time: i64,
    pub end_time: i64,
    pub cliff_time: i64, // waiting period before claim
    pub vesting: Pubkey,
    pub total_amount: u64,
    pub total_withdrawn: u64,
    pub bump: u8,
}
