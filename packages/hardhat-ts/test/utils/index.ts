import { ethers, deployments, getUnnamedAccounts } from 'hardhat';
import { Contract } from 'ethers';

export async function setupUsers<T extends { [contractName: string]: Contract }>(addresses: string[], contracts: T): Promise<({ address: string } & T)[]> {
  const users: ({ address: string } & T)[] = [];
  for (const address of addresses) {
    users.push(await setupUser(address, contracts));
  }
  return users;
}

export async function setupUser<T extends { [contractName: string]: Contract }>(address: string, contracts: T): Promise<{ address: string } & T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user: any = { address }; //{address: etherAddres, rButton:contracts.connected()}
  for (const key of Object.keys(contracts)) {
    user[key] = contracts[key].connect(await ethers.getSigner(address));
  }
  return user as { address: string } & T;
}

export default async function setup() {
  await deployments.fixture(['Staker', 'ExampleExternalContract']); //deployment executed and reset (use of evm_snapshot for faster tests)
  const contract = {
    Staker: await ethers.getContract('Staker'), //instantiated ethers contract instance
    ExampleExternalContract: await ethers.getContract('ExampleExternalContract'),
  };
  // These objects allow you to write more readable functions: `wallet.Contract.method(....)`
  const signers = await setupUsers(await getUnnamedAccounts(), contract);
  return { ...contract, signers };
}

export interface signer {
  address: string;
  Staker: Contract;
  ExampleExternalContract: Contract;
}
