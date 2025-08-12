import { ellipsify } from '@wallet-ui/react'
import {
  useVestingAccountsQuery,
  useVestingCloseMutation,
  useVestingDecrementMutation,
  useVestingIncrementMutation,
  useVestingInitializeMutation,
  useVestingProgram,
  useVestingProgramId,
  useVestingSetMutation,
} from './vesting-data-access'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ExplorerLink } from '../cluster/cluster-ui'
import { VestingAccount } from '@project/anchor'
import { ReactNode } from 'react'

export function VestingProgramExplorerLink() {
  const programId = useVestingProgramId()

  return <ExplorerLink address={programId.toString()} label={ellipsify(programId.toString())} />
}

export function VestingList() {
  const vestingAccountsQuery = useVestingAccountsQuery()

  if (vestingAccountsQuery.isLoading) {
    return <span className="loading loading-spinner loading-lg"></span>
  }

  if (!vestingAccountsQuery.data?.length) {
    return (
      <div className="text-center">
        <h2 className={'text-2xl'}>No accounts</h2>
        No accounts found. Initialize one to get started.
      </div>
    )
  }

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      {vestingAccountsQuery.data?.map((vesting) => (
        <VestingCard key={vesting.address} vesting={vesting} />
      ))}
    </div>
  )
}

export function VestingProgramGuard({ children }: { children: ReactNode }) {
  const programAccountQuery = useVestingProgram()

  if (programAccountQuery.isLoading) {
    return <span className="loading loading-spinner loading-lg"></span>
  }

  if (!programAccountQuery.data?.value) {
    return (
      <div className="alert alert-info flex justify-center">
        <span>Program account not found. Make sure you have deployed the program and are on the correct cluster.</span>
      </div>
    )
  }

  return children
}

function VestingCard({ vesting }: { vesting: VestingAccount }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Vesting: {vesting.data.count}</CardTitle>
        <CardDescription>
          Account: <ExplorerLink address={vesting.address} label={ellipsify(vesting.address)} />
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 justify-evenly">
          <VestingButtonIncrement vesting={vesting} />
          <VestingButtonSet vesting={vesting} />
          <VestingButtonDecrement vesting={vesting} />
          <VestingButtonClose vesting={vesting} />
        </div>
      </CardContent>
    </Card>
  )
}

export function VestingButtonInitialize() {
  const mutationInitialize = useVestingInitializeMutation()

  return (
    <Button onClick={() => mutationInitialize.mutateAsync()} disabled={mutationInitialize.isPending}>
      Initialize Vesting {mutationInitialize.isPending && '...'}
    </Button>
  )
}

export function VestingButtonIncrement({ vesting }: { vesting: VestingAccount }) {
  const incrementMutation = useVestingIncrementMutation({ vesting })

  return (
    <Button variant="outline" onClick={() => incrementMutation.mutateAsync()} disabled={incrementMutation.isPending}>
      Increment
    </Button>
  )
}

export function VestingButtonSet({ vesting }: { vesting: VestingAccount }) {
  const setMutation = useVestingSetMutation({ vesting })

  return (
    <Button
      variant="outline"
      onClick={() => {
        const value = window.prompt('Set value to:', vesting.data.count.toString() ?? '0')
        if (!value || parseInt(value) === vesting.data.count || isNaN(parseInt(value))) {
          return
        }
        return setMutation.mutateAsync(parseInt(value))
      }}
      disabled={setMutation.isPending}
    >
      Set
    </Button>
  )
}

export function VestingButtonDecrement({ vesting }: { vesting: VestingAccount }) {
  const decrementMutation = useVestingDecrementMutation({ vesting })

  return (
    <Button variant="outline" onClick={() => decrementMutation.mutateAsync()} disabled={decrementMutation.isPending}>
      Decrement
    </Button>
  )
}

export function VestingButtonClose({ vesting }: { vesting: VestingAccount }) {
  const closeMutation = useVestingCloseMutation({ vesting })

  return (
    <Button
      variant="destructive"
      onClick={() => {
        if (!window.confirm('Are you sure you want to close this account?')) {
          return
        }
        return closeMutation.mutateAsync()
      }}
      disabled={closeMutation.isPending}
    >
      Close
    </Button>
  )
}
