import { UpgradeArgv } from '@celo/celotool/src/cmds/deploy/upgrade'
import { deploy, taintTestnet, untaintTestnet } from '@celo/celotool/src/lib/vm-testnet-utils'
import yargs from 'yargs'

export const command = 'vm-testnet'
export const describe = 'upgrade a testnet on a VM'

type VmTestnetArgv = UpgradeArgv & {
  reset: boolean
}

export const builder = (argv: yargs.Argv) => {
  return argv.option('reset', {
    describe: 'recreates all nodes and deletes any chain data in persistent disks',
    default: false,
    type: 'boolean',
  })
}

export const handler = async (argv: VmTestnetArgv) => {
  let onDeployFailed = () => Promise.resolve()
  if (argv.reset) {
    onDeployFailed = () => untaintTestnet(argv.celoEnv)
    await taintTestnet(argv.celoEnv)
  }
  await deploy(argv.celoEnv, onDeployFailed)
}
