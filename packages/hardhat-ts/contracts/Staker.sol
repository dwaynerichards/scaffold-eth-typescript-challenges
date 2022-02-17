pragma solidity >=0.8.0 <0.9.0;
//SPDX-License-Identifier: MIT

import 'hardhat/console.sol';
import './ExampleExternalContract.sol';

contract Staker {
  ExampleExternalContract public exampleExternalContract;
  mapping(address => uint256) private balances;
  mapping(address => bool) private stakers;
  uint256 constant threshold = 1 ether;
  bool locked = true;
  bool thresholdMet = false;
  uint256 public deadline;
  uint256 totalStaked;
  address owner;

  constructor(address exampleExternalContractAddress) {
    exampleExternalContract = ExampleExternalContract(exampleExternalContractAddress);
    deadline = block.timestamp + 30 seconds;
    owner = msg.sender;
  }

  event Stake(address, uint256);
  event Withdraw(address, uint256);
  event ThresholdMet(uint256);
  modifier canStake() {
    require(this.timeLeft() > 0, 'Stake time expired');
    require(thresholdMet == false, 'Amount capped');
    require(locked == true, 'currently locked');
    _;
  }
  modifier canExecute() {
    require(stakers[msg.sender], 'Not a staker');
    require(locked == true, 'Contract locked');
    require(thresholdMet == true, 'Not enough eth staked');
    require(this.timeLeft() == 0, 'Not enough time has passed');
    require(exampleExternalContract.completed() == false, 'Execution already invoked');
    _;
  }
  modifier canWithdraw() {
    require(this.timeLeft() == 0, 'There is still time to stake');
    require(thresholdMet == false, 'Threshold was met');
    require(stakers[msg.sender], 'Not a stalker');
    require(balances[msg.sender] > 0, 'No balance to withdraw');
    _;
  }

  function stake() external payable canStake {
    _stakeBalance(msg.sender, msg.value);
    emit Stake(msg.sender, msg.value);
    if (thresholdMet) {
      emit ThresholdMet(block.timestamp);
    }
  }

  function _stakeBalance(address _staker, uint256 _amount) private {
    locked = false;
    stakers[_staker] = true;
    balances[_staker] += _amount;
    totalStaked += _amount;
    if (totalStaked >= threshold) thresholdMet = true;
    locked = true;
    console.log('staking %s ether', _amount);
    console.log('theshold met: %s', thresholdMet);
  }

  function execute() external canExecute {
    locked = false;
    (bool success, ) = address(exampleExternalContract).call{value: address(this).balance}('');
    exampleExternalContract.complete();
    locked = true;
    require(success, 'Sending to External Contract failed');
  }

  function withdraw() external canWithdraw {
    uint256 refund = balances[msg.sender];
    (bool success, ) = address(msg.sender).call{value: refund}('');
    emit Withdraw(msg.sender, refund);
    require(success, 'Unsuccessful withrawl');
    console.log('withdraw invoked');
  }

  function changeDeadline(uint256 _extension) external {
    require(owner == msg.sender, 'Access not granted');
    deadline += _extension;
  }

  function timeLeft() external view returns (uint256 _timeLeft) {
    _timeLeft = deadline - block.timestamp;
    if (block.timestamp > deadline) _timeLeft = 0;
  }

  receive() external payable {
    this.stake();
  }
}
