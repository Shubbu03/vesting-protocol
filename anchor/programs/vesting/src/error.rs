use anchor_lang::prelude::*;

#[error_code]
pub enum VestingError {
    #[msg("Claim not available yet as time not passed")]
    ClaimNotAvailableYet,
    #[msg("Invalid vesting period")]
    InvalidVestingPeriod,
    #[msg("Calculation overdlow")]
    CalculationOverflow,
    #[msg("Nothing to claim")]
    NothingToClaim,
}
