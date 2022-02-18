import { expect } from './chaiSetup';
import { utils } from 'ethers';
import setup, { signer } from './utils';
const { formatEther, parseEther } = utils;

describe('Staker Contract', async () => {
  const testObj = { value: parseEther('.1') };
  const formatedTest = formatEther(testObj.value);
  const balanceToString = async (signer: signer) => {
    let balance = await signer.Staker.checkBalance();
    return formatEther(balance);
  };
  //take should increace totalStaked
  try {
    it('should increase total totalStaked', async () => {
      const { signers } = await setup();
      //signers.forEach((account, index) => console.log(index, account.address));
      const signer = signers[0];
      const tx = await signer.Staker.stake(testObj);
      await tx.wait();
      const balance = await balanceToString(signer);
      const sampleEth = formatEther(testObj.value);
      expect(balance).to.equal(sampleEth);
    });
    it('Should emit stake event', async () => {
      const { signers } = await setup();
      const signer = signers[0];
      const { Staker, address } = signer;
      await expect(signer.Staker.stake(testObj)).to.emit(Staker, 'Stake').withArgs(address, testObj.value);
    });
    it('Should add balance and stalker to mappings', async () => {
      const { signers } = await setup();
      const [signerA, signerB] = [signers[0], signers[1]];
      const [addressA, addressB] = [signerA.address, signerB.address];
      await Promise.all([signerA.Staker.stake(testObj), signerB.Staker.stake(testObj)]);
      const [balanceA, balanceB] = await Promise.all([signerA.Staker.balances(addressA), signerA.Staker.balances(addressB)]);
      const [stalkerA, stalkerB] = await Promise.all([signerA.Staker.stakers(addressA), signerA.Staker.stakers(addressB)]);
      //balances should both equal testObj.value formateed to a string
      expect(formatEther(balanceA)).to.equal(formatedTest);
      expect(formatEther(balanceB)).to.equal(formatedTest);
      expect(stalkerA).to.equal(true);
      expect(stalkerB).to.equal(true);
    });

    //sould add stalker@address= true to mapping
    it('Should Emit threshold event and update threshold boolean', async () => {
      const { signers } = await setup();
      let threshhold = 0;
      for (const signer of signers) {
        if (threshhold < 0.8) {
          await signer.Staker.stake(testObj).then(async (tx: any) => await tx.wait());
          threshhold += 0.1;
        }
      }
      const signer = signers[0];
      const { Staker, address } = signer;
      await expect(signer.Staker.stake(testObj)).to.emit(Staker, 'ThresholdMet').withArgs(formatEther('1'));
      await expect(signer.Staker.totalStaked()).to.equal(formatEther('1'));
    });
    it('should reach threshhold', async () => {
      const { signers } = await setup();
      //signers.forEach((account, index) => console.log(index, account.address));
      let threshhold = 0;
      for (const signer of signers) {
        if (threshhold < 0.9) {
          await signer.Staker.stake(testObj).then(async (tx: any) => await tx.wait());
          threshhold += 0.1;
        }
      }
      const signer = signers[0];
      const { Staker } = signer;
      expect(signer.Staker.stake(testObj)).to.emit(Staker, 'ThresholdMet').withArgs(formatEther('1'));
    });
  } catch (err) {
    console.log(err);
  }
});
