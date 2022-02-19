import { expect } from './chaiSetup';
import { utils } from 'ethers';
import setup, { signer } from './utils';
const { formatEther, parseEther, formatUnits } = utils;

describe('Staker Contract', async () => {
  const testObj = { value: parseEther('.1') };
  const oneEther = parseEther('1');
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
      await expect(signer.Staker.stake(testObj)).to.emit(Staker, 'ThresholdMet').withArgs(oneEther);
      expect(await signer.Staker.thresholdMet()).to.equal(true);
    });
    it('should cap amount to withdraw and revert transaction if threshhold met', async () => {
      const { signers } = await setup();
      let threshhold = 0;
      for (const signer of signers) {
        if (threshhold < 0.9) {
          await signer.Staker.stake(testObj).then(async (tx: any) => await tx.wait());
          threshhold += 0.1;
        }
      }
      const signer = signers[0];
      const { Staker } = signer;
      await expect(signer.Staker.stake(testObj)).to.be.revertedWith('Amount capped');
    });

    it('should revert with "Not enough eth staked"', async () => {
      const { signers } = await setup();
      for (let i = 0; i < 9; i++) {
        await signers[i].Staker.stake(testObj);
      }
      const signer = signers[0];
      await expect(signer.Staker.execute()).to.be.revertedWith('Not enough eth staked');
    });

    it('should send staked funds to exampleContract after invoking execution', async () => {
      const { signers } = await setup();
      for (let i = 0; i < 10; i++) {
        await signers[i].Staker.stake(testObj);
      }
      const signer = signers[0];
      await signer.Staker.lowerDeadline().then(async () => await signer.Staker.execute());
      const isTransferComplete = await signer.ExampleExternalContract.completed();
      await expect(isTransferComplete).to.equal(true);
    });

    it('should send full contract amount to exampleContract after invoking execution', async () => {
      const { signers } = await setup();
      for (let i = 0; i < 10; i++) {
        await signers[i].Staker.stake(testObj);
      }
      const signer = signers[0];
      await signer.Staker.lowerDeadline().then(async () => await signer.Staker.execute());
      const contranctAmount = await signer.ExampleExternalContract.getBalance();
      await expect(contranctAmount).to.equal(oneEther);
    });

    it('should revert with "Not a staker" if incorrect address attempts execution', async () => {
      const { signers } = await setup();
      for (let i = 0; i < 10; i++) {
        await signers[i].Staker.stake(testObj);
      }
      const badSigner = signers[10];
      await expect(badSigner.Staker.execute()).to.be.revertedWith('Not a staker');
    });

    it('should revert with "Execution already invoked"', async () => {
      const { signers } = await setup();
      for (let i = 0; i < 10; i++) {
        await signers[i].Staker.stake(testObj);
      }
      const signer = signers[0];
      await signer.Staker.lowerDeadline();
      await signer.Staker.execute();
      await expect(signer.Staker.execute()).to.be.revertedWith('Execution already invoked');
    });
    it('should rever transaction if a withdraw is attempted before time expires', async () => {
      const { signers } = await setup();
      const signer = signers[0];
      await signer.Staker.stake(testObj);
      await expect(signer.Staker.withdraw()).to.be.revertedWith('There is still time to stake');
    });
    it('should allow withdrawl when time expires and threshhold is not met', async () => {
      const { signers } = await setup();
      const signer = signers[0];
      const { Staker, address } = signer;
      await signer.Staker.stake(testObj);
      const preWithdrawBalance = await signer.Staker.balances(address);
      await signer.Staker.lowerDeadline();
      expect(formatEther(preWithdrawBalance)).to.equal(formatedTest);
      await expect(signer.Staker.withdraw()).to.emit(Staker, 'Withdraw').withArgs(address, testObj.value);
    });
  } catch (err) {
    console.log(err);
  }
});
