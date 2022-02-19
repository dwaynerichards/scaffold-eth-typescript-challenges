pragma solidity >=0.8.0 <0.9.0;

//SPDX-License-Identifier: MIT

contract ExampleExternalContract {
  bool public completed;

  function complete() external payable {
    completed = true;
  }

  function getBalance() external view returns (uint256 _balance) {
    _balance = address(this).balance;
  }

  receive() external payable {
    this.complete();
  }
}
