import {
  VestingAccount,
  getCloseInstruction,
  getVestingProgramAccounts,
  getVestingProgramId,
  getDecrementInstruction,
  getIncrementInstruction,
  getInitializeInstruction,
  getSetInstruction,
} from '@project/anchor'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { toast } from 'sonner'
import { generateKeyPairSigner } from 'gill'
import { useWalletUi } from '@wallet-ui/react'
import { useWalletTransactionSignAndSend } from '../solana/use-wallet-transaction-sign-and-send'
import { useClusterVersion } from '@/components/cluster/use-cluster-version'
import { toastTx } from '@/components/toast-tx'
import { useWalletUiSigner } from '@/components/solana/use-wallet-ui-signer'
import { install as installEd25519 } from '@solana/webcrypto-ed25519-polyfill'

// polyfill ed25519 for browsers (to allow `generateKeyPairSigner` to work)
installEd25519()

export function useVestingProgramId() {
  const { cluster } = useWalletUi()
  return useMemo(() => getVestingProgramId(cluster.id), [cluster])
}

export function useVestingProgram() {
  const { client, cluster } = useWalletUi()
  const programId = useVestingProgramId()
  const query = useClusterVersion()

  return useQuery({
    retry: false,
    queryKey: ['get-program-account', { cluster, clusterVersion: query.data }],
    queryFn: () => client.rpc.getAccountInfo(programId).send(),
  })
}

export function useVestingInitializeMutation() {
  const { cluster } = useWalletUi()
  const queryClient = useQueryClient()
  const signer = useWalletUiSigner()
  const signAndSend = useWalletTransactionSignAndSend()

  return useMutation({
    mutationFn: async () => {
      const vesting = await generateKeyPairSigner()
      return await signAndSend(getInitializeInstruction({ payer: signer, vesting }), signer)
    },
    onSuccess: async (tx) => {
      toastTx(tx)
      await queryClient.invalidateQueries({ queryKey: ['vesting', 'accounts', { cluster }] })
    },
    onError: () => toast.error('Failed to run program'),
  })
}

export function useVestingDecrementMutation({ vesting }: { vesting: VestingAccount }) {
  const invalidateAccounts = useVestingAccountsInvalidate()
  const signer = useWalletUiSigner()
  const signAndSend = useWalletTransactionSignAndSend()

  return useMutation({
    mutationFn: async () => await signAndSend(getDecrementInstruction({ vesting: vesting.address }), signer),
    onSuccess: async (tx) => {
      toastTx(tx)
      await invalidateAccounts()
    },
  })
}

export function useVestingIncrementMutation({ vesting }: { vesting: VestingAccount }) {
  const invalidateAccounts = useVestingAccountsInvalidate()
  const signAndSend = useWalletTransactionSignAndSend()
  const signer = useWalletUiSigner()

  return useMutation({
    mutationFn: async () => await signAndSend(getIncrementInstruction({ vesting: vesting.address }), signer),
    onSuccess: async (tx) => {
      toastTx(tx)
      await invalidateAccounts()
    },
  })
}

export function useVestingSetMutation({ vesting }: { vesting: VestingAccount }) {
  const invalidateAccounts = useVestingAccountsInvalidate()
  const signAndSend = useWalletTransactionSignAndSend()
  const signer = useWalletUiSigner()

  return useMutation({
    mutationFn: async (value: number) =>
      await signAndSend(
        getSetInstruction({
          vesting: vesting.address,
          value,
        }),
        signer,
      ),
    onSuccess: async (tx) => {
      toastTx(tx)
      await invalidateAccounts()
    },
  })
}

export function useVestingCloseMutation({ vesting }: { vesting: VestingAccount }) {
  const invalidateAccounts = useVestingAccountsInvalidate()
  const signAndSend = useWalletTransactionSignAndSend()
  const signer = useWalletUiSigner()

  return useMutation({
    mutationFn: async () => {
      return await signAndSend(getCloseInstruction({ payer: signer, vesting: vesting.address }), signer)
    },
    onSuccess: async (tx) => {
      toastTx(tx)
      await invalidateAccounts()
    },
  })
}

export function useVestingAccountsQuery() {
  const { client } = useWalletUi()

  return useQuery({
    queryKey: useVestingAccountsQueryKey(),
    queryFn: async () => await getVestingProgramAccounts(client.rpc),
  })
}

function useVestingAccountsInvalidate() {
  const queryClient = useQueryClient()
  const queryKey = useVestingAccountsQueryKey()

  return () => queryClient.invalidateQueries({ queryKey })
}

function useVestingAccountsQueryKey() {
  const { cluster } = useWalletUi()

  return ['vesting', 'accounts', { cluster }]
}
