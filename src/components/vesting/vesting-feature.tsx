import { WalletButton } from '../solana/solana-provider'
import { VestingButtonInitialize, VestingList, VestingProgramExplorerLink, VestingProgramGuard } from './vesting-ui'
import { AppHero } from '../app-hero'
import { useWalletUi } from '@wallet-ui/react'

export default function VestingFeature() {
  const { account } = useWalletUi()

  return (
    <VestingProgramGuard>
      <AppHero
        title="Vesting"
        subtitle={
          account
            ? "Initialize a new vesting onchain by clicking the button. Use the program's methods (increment, decrement, set, and close) to change the state of the account."
            : 'Select a wallet to run the program.'
        }
      >
        <p className="mb-6">
          <VestingProgramExplorerLink />
        </p>
        {account ? (
          <VestingButtonInitialize />
        ) : (
          <div style={{ display: 'inline-block' }}>
            <WalletButton />
          </div>
        )}
      </AppHero>
      {account ? <VestingList /> : null}
    </VestingProgramGuard>
  )
}
