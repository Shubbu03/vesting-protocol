// Here we export some useful types and functions for interacting with the Anchor program.
import { Account, address, getBase58Decoder, SolanaClient } from 'gill'
import { SolanaClusterId } from '@wallet-ui/react'
import { getProgramAccountsDecoded } from './helpers/get-program-accounts-decoded'
import { Vesting, VESTING_DISCRIMINATOR, VESTING_PROGRAM_ADDRESS, getVestingDecoder } from './client/js'
import VestingIDL from '../target/idl/vesting.json'

export type VestingAccount = Account<Vesting, string>

// Re-export the generated IDL and type
export { VestingIDL }

// This is a helper function to get the program ID for the Vesting program depending on the cluster.
export function getVestingProgramId(cluster: SolanaClusterId) {
  switch (cluster) {
    case 'solana:devnet':
    case 'solana:testnet':
      // This is the program ID for the Vesting program on devnet and testnet.
      return address('6z68wfurCMYkZG51s1Et9BJEd9nJGUusjHXNt4dGbNNF')
    case 'solana:mainnet':
    default:
      return VESTING_PROGRAM_ADDRESS
  }
}

export * from './client/js'

export function getVestingProgramAccounts(rpc: SolanaClient['rpc']) {
  return getProgramAccountsDecoded(rpc, {
    decoder: getVestingDecoder(),
    filter: getBase58Decoder().decode(VESTING_DISCRIMINATOR),
    programAddress: VESTING_PROGRAM_ADDRESS,
  })
}
