import { use, expect } from 'chai';
import { chaiEthers } from 'chai-ethers';
import { solidity } from 'ethereum-waffle';
use(chaiEthers);
use(solidity);
export { expect };
