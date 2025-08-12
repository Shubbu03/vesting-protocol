import {
  Blockhash,
  createSolanaClient,
  createTransaction,
  generateKeyPairSigner,
  Instruction,
  isSolanaError,
  KeyPairSigner,
  signTransactionMessageWithSigners,
} from 'gill'
import {
  fetchVesting,
  getCloseInstruction,
  getDecrementInstruction,
  getIncrementInstruction,
  getInitializeInstruction,
  getSetInstruction,
} from '../src'
// @ts-ignore error TS2307 suggest setting `moduleResolution` but this is already configured
import { loadKeypairSignerFromFile } from 'gill/node'

const { rpc, sendAndConfirmTransaction } = createSolanaClient({ urlOrMoniker: process.env.ANCHOR_PROVIDER_URL! })

describe('vesting', () => {
  let payer: KeyPairSigner
  let vesting: KeyPairSigner

  beforeAll(async () => {
    vesting = await generateKeyPairSigner()
    payer = await loadKeypairSignerFromFile(process.env.ANCHOR_WALLET!)
  })

  it('Initialize Vesting', async () => {
    // ARRANGE
    expect.assertions(1)
    const ix = getInitializeInstruction({ payer: payer, vesting: vesting })

    // ACT
    await sendAndConfirm({ ix, payer })

    // ASSER
    const currentVesting = await fetchVesting(rpc, vesting.address)
    expect(currentVesting.data.count).toEqual(0)
  })

  it('Increment Vesting', async () => {
    // ARRANGE
    expect.assertions(1)
    const ix = getIncrementInstruction({
      vesting: vesting.address,
    })

    // ACT
    await sendAndConfirm({ ix, payer })

    // ASSERT
    const currentCount = await fetchVesting(rpc, vesting.address)
    expect(currentCount.data.count).toEqual(1)
  })

  it('Increment Vesting Again', async () => {
    // ARRANGE
    expect.assertions(1)
    const ix = getIncrementInstruction({ vesting: vesting.address })

    // ACT
    await sendAndConfirm({ ix, payer })

    // ASSERT
    const currentCount = await fetchVesting(rpc, vesting.address)
    expect(currentCount.data.count).toEqual(2)
  })

  it('Decrement Vesting', async () => {
    // ARRANGE
    expect.assertions(1)
    const ix = getDecrementInstruction({
      vesting: vesting.address,
    })

    // ACT
    await sendAndConfirm({ ix, payer })

    // ASSERT
    const currentCount = await fetchVesting(rpc, vesting.address)
    expect(currentCount.data.count).toEqual(1)
  })

  it('Set vesting value', async () => {
    // ARRANGE
    expect.assertions(1)
    const ix = getSetInstruction({ vesting: vesting.address, value: 42 })

    // ACT
    await sendAndConfirm({ ix, payer })

    // ASSERT
    const currentCount = await fetchVesting(rpc, vesting.address)
    expect(currentCount.data.count).toEqual(42)
  })

  it('Set close the vesting account', async () => {
    // ARRANGE
    expect.assertions(1)
    const ix = getCloseInstruction({
      payer: payer,
      vesting: vesting.address,
    })

    // ACT
    await sendAndConfirm({ ix, payer })

    // ASSERT
    try {
      await fetchVesting(rpc, vesting.address)
    } catch (e) {
      if (!isSolanaError(e)) {
        throw new Error(`Unexpected error: ${e}`)
      }
      expect(e.message).toEqual(`Account not found at address: ${vesting.address}`)
    }
  })
})

// Helper function to keep the tests DRY
let latestBlockhash: Awaited<ReturnType<typeof getLatestBlockhash>> | undefined
async function getLatestBlockhash(): Promise<Readonly<{ blockhash: Blockhash; lastValidBlockHeight: bigint }>> {
  if (latestBlockhash) {
    return latestBlockhash
  }
  return await rpc
    .getLatestBlockhash()
    .send()
    .then(({ value }) => value)
}
async function sendAndConfirm({ ix, payer }: { ix: Instruction; payer: KeyPairSigner }) {
  const tx = createTransaction({
    feePayer: payer,
    instructions: [ix],
    version: 'legacy',
    latestBlockhash: await getLatestBlockhash(),
  })
  const signedTransaction = await signTransactionMessageWithSigners(tx)
  return await sendAndConfirmTransaction(signedTransaction)
}
