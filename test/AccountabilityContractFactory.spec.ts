/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-var-requires */
const ganache = require('ganache-cli');
import Web3 from 'web3';
import * as AccountabilityContractFactory from '../build/AccountabilityContractFactory.json';
import * as AccountabilityContract from '../build/AccountabilityContract.json';

const web3 = new Web3(ganache.provider());

let accountabilityContractFactory: any;
let accounts: string[];
let commissionWalletAddress: string;
let amount: string;

const createAccountabilityContract = async ({
  referee,
  failureRecipient,
  user,
  amount
}: {
  referee: string;
  failureRecipient: string;
  user: string;
  amount: string;
}) => {
  const name = 'Drink water everyday';
  const description = 'I must drink three litres of water everyday';
  await accountabilityContractFactory.methods
    .createAccountabilityContract(referee, name, description, failureRecipient)
    .send({
      from: user,
      gas: 4000000,
      value: amount
    });
};

beforeEach(async () => {
  accounts = await web3.eth.getAccounts();
  commissionWalletAddress = accounts[3];
  amount = web3.utils.toWei('0.00001', 'ether');
  const abi = AccountabilityContractFactory.abi;
  const bytecode = AccountabilityContractFactory.evm.bytecode.object;
  const gas = await new web3.eth.Contract(abi as any)
    .deploy({ arguments: [commissionWalletAddress], data: bytecode })
    .estimateGas();
  accountabilityContractFactory = await new web3.eth.Contract(
    AccountabilityContractFactory.abi as any
  )
    .deploy({
      arguments: [commissionWalletAddress],
      data: bytecode
    })
    .send({ from: accounts[0], gas });
});

describe('Accountability contract factory', () => {
  describe('success', () => {
    it('deploys a contract', async () => {
      await createAccountabilityContract({
        referee: accounts[1],
        failureRecipient: accounts[2],
        user: accounts[0],
        amount
      });
      expect(accountabilityContractFactory.options.address).toBeDefined();
    });
    describe('factory', () => {
      it('can get number of total users', async () => {
        await createAccountabilityContract({
          referee: accounts[1],
          failureRecipient: accounts[2],
          user: accounts[0],
          amount
        });
        const numberOfUsers = await accountabilityContractFactory.methods
          .numberOfUsers()
          .call();
        expect(numberOfUsers).toEqual('1');
      });
      it('can get number of accountability contracts', async () => {
        await createAccountabilityContract({
          referee: accounts[1],
          failureRecipient: accounts[2],
          user: accounts[0],
          amount
        });
        const numberOfContracts = await accountabilityContractFactory.methods
          .numberOfAccountabilityContracts()
          .call();
        expect(numberOfContracts).toEqual('1');
      });
      it('can get total eth in contracts', async () => {
        await createAccountabilityContract({
          referee: accounts[1],
          failureRecipient: accounts[2],
          user: accounts[0],
          amount
        });
        const totalEthInContracts = await accountabilityContractFactory.methods
          .totalEthInContracts()
          .call();
        expect(totalEthInContracts).toBeDefined();
      });
      it('increases number of users by one when a new user creates a contract', async () => {
        await createAccountabilityContract({
          referee: accounts[0],
          failureRecipient: accounts[2],
          user: accounts[0],
          amount
        });
        await createAccountabilityContract({
          referee: accounts[0],
          failureRecipient: accounts[2],
          user: accounts[2],
          amount
        });
        const numberOfUsers = await accountabilityContractFactory.methods
          .numberOfUsers()
          .call();
        expect(numberOfUsers).toEqual('2');
      });
      it('can get user addresses', async () => {
        await createAccountabilityContract({
          referee: accounts[1],
          failureRecipient: accounts[2],
          user: accounts[0],
          amount
        });
        const userAddresses = await accountabilityContractFactory.methods
          .getUserAddresses(0, 1)
          .call();
        expect(userAddresses.length).toEqual(1);
      });
      it('can get accountability contract addresses', async () => {
        await createAccountabilityContract({
          referee: accounts[1],
          failureRecipient: accounts[2],
          user: accounts[0],
          amount
        });
        const accountabilityContractAddresses =
          await accountabilityContractFactory.methods
            .getAccountabilityContractAddresses(0, 1)
            .call();
        expect(accountabilityContractAddresses.length).toEqual(1);
      });
    });
    describe('user', () => {
      it('can get open accountability contract addresses of user', async () => {
        const user = accounts[0];
        const referee = accounts[1];
        await createAccountabilityContract({
          referee,
          failureRecipient: accounts[2],
          user,
          amount
        });
        const openAccountabilityContractAddresses =
          await accountabilityContractFactory.methods
            .getOpenAccountabilityContractAddressesForUser(user)
            .call();
        expect(openAccountabilityContractAddresses).toBeDefined();
        expect(openAccountabilityContractAddresses.length).toEqual(1);
      });
      it('can get closed accountability contract addresses of user', async () => {
        const user = accounts[0];
        const referee = accounts[1];
        await createAccountabilityContract({
          referee,
          failureRecipient: accounts[2],
          user,
          amount
        });
        const openAccountabilityContractAddresses =
          await accountabilityContractFactory.methods
            .getOpenAccountabilityContractAddressesForUser(user)
            .call();
        await accountabilityContractFactory.methods
          .failOpenAccountabilityContract(
            openAccountabilityContractAddresses[0]
          )
          .send({ from: referee, gas: 1000000 });
        const closedAccountabilityContractAddressesForUser =
          await accountabilityContractFactory.methods
            .getClosedAccountabilityContractAddressesForUser(user)
            .call();
        expect(closedAccountabilityContractAddressesForUser).toBeDefined();
        expect(closedAccountabilityContractAddressesForUser.length).toEqual(1);
      });
      it('can create additional accountability contracts for user', async () => {
        const user = accounts[0];
        const referee = accounts[1];
        await createAccountabilityContract({
          referee,
          failureRecipient: accounts[2],
          user: accounts[0],
          amount
        });
        await createAccountabilityContract({
          referee,
          failureRecipient: accounts[2],
          user,
          amount
        });
        const openAccountabilityContractAddresses =
          await accountabilityContractFactory.methods
            .getOpenAccountabilityContractAddressesForUser(user)
            .call();
        expect(openAccountabilityContractAddresses.length).toEqual(2);
      });
      it('user pays commission to the commission wallet address with every created contract', async () => {
        const user = accounts[0];
        const referee = accounts[1];
        const commissionWalletInitialBalance = await web3.eth.getBalance(
          commissionWalletAddress
        );
        await createAccountabilityContract({
          referee,
          failureRecipient: accounts[2],
          user,
          amount
        });
        const commissionWalletUpdatedBalance = await web3.eth.getBalance(
          commissionWalletAddress
        );
        expect(Number(commissionWalletUpdatedBalance)).toBeGreaterThan(
          Number(commissionWalletInitialBalance)
        );
      });
      it('can request that referee approves contract', async () => {
        const user = accounts[0];
        const referee = accounts[1];
        await createAccountabilityContract({
          referee,
          failureRecipient: accounts[2],
          user,
          amount
        });
        const openAccountabilityContractAddresses =
          await accountabilityContractFactory.methods
            .getOpenAccountabilityContractAddressesForUser(user)
            .call();
        await accountabilityContractFactory.methods
          .requestApproval(openAccountabilityContractAddresses[0])
          .send({ from: user, gas: 1000000 });
      });
      it('can complete contract where they are the referee', async () => {
        const user = accounts[0];
        await createAccountabilityContract({
          referee: user,
          failureRecipient: accounts[2],
          user,
          amount
        });
        const openAccountabilityContractAddressesUser =
          await accountabilityContractFactory.methods
            .getOpenAccountabilityContractAddressesForUser(user)
            .call();
        await accountabilityContractFactory.methods
          .completeOpenAccountabilityContract(
            openAccountabilityContractAddressesUser[0]
          )
          .send({ from: user, gas: 1000000 });
        const updatedOpenAccountabilityContractAddressesUser =
          await accountabilityContractFactory.methods
            .getOpenAccountabilityContractAddressesForUser(user)
            .call();
        expect(updatedOpenAccountabilityContractAddressesUser.length).toEqual(
          openAccountabilityContractAddressesUser.length - 1
        );
        const closedAccountabilityContractAddressesUser =
          await accountabilityContractFactory.methods
            .getClosedAccountabilityContractAddressesForUser(user)
            .call();
        expect(closedAccountabilityContractAddressesUser.length).toEqual(1);
        expect(closedAccountabilityContractAddressesUser[0]).toEqual(
          openAccountabilityContractAddressesUser[0]
        );
        const openAccountabilityContractAddressesReferee =
          await accountabilityContractFactory.methods
            .getOpenAccountabilityContractAddressesForReferee(user)
            .call();
        expect(openAccountabilityContractAddressesReferee.length).toEqual(0);
        const closedAccountabilityContractAddressesReferee =
          await accountabilityContractFactory.methods
            .getClosedAccountabilityContractAddressesForReferee(user)
            .call();
        expect(closedAccountabilityContractAddressesReferee.length).toEqual(1);
        const closedAccountabilityContract = await new web3.eth.Contract(
          AccountabilityContract.abi as any,
          closedAccountabilityContractAddressesUser[0]
        );
        const closedAccountabilityContractStatus =
          await closedAccountabilityContract.methods.status().call();
        expect(closedAccountabilityContractStatus).toEqual('2');
      });
      it('can fail contract where they are the referee', async () => {
        const user = accounts[0];
        await createAccountabilityContract({
          referee: user,
          failureRecipient: accounts[2],
          user,
          amount
        });
        const openAccountabilityContractAddressesUser =
          await accountabilityContractFactory.methods
            .getOpenAccountabilityContractAddressesForUser(user)
            .call();
        await accountabilityContractFactory.methods
          .failOpenAccountabilityContract(
            openAccountabilityContractAddressesUser[0]
          )
          .send({ from: user, gas: 1000000 });
        const updatedOpenAccountabilityContractAddressesUser =
          await accountabilityContractFactory.methods
            .getOpenAccountabilityContractAddressesForUser(user)
            .call();
        expect(updatedOpenAccountabilityContractAddressesUser.length).toEqual(
          openAccountabilityContractAddressesUser.length - 1
        );
        const closedAccountabilityContractAddressesUser =
          await accountabilityContractFactory.methods
            .getClosedAccountabilityContractAddressesForUser(user)
            .call();
        expect(closedAccountabilityContractAddressesUser.length).toEqual(1);
        expect(closedAccountabilityContractAddressesUser[0]).toEqual(
          openAccountabilityContractAddressesUser[0]
        );
        const openAccountabilityContractAddressesReferee =
          await accountabilityContractFactory.methods
            .getOpenAccountabilityContractAddressesForReferee(user)
            .call();
        expect(openAccountabilityContractAddressesReferee.length).toEqual(0);
        const closedAccountabilityContractAddressesReferee =
          await accountabilityContractFactory.methods
            .getClosedAccountabilityContractAddressesForReferee(user)
            .call();
        expect(closedAccountabilityContractAddressesReferee.length).toEqual(1);
        const closedAccountabilityContract = await new web3.eth.Contract(
          AccountabilityContract.abi as any,
          closedAccountabilityContractAddressesUser[0]
        );
        const closedAccountabilityContractStatus =
          await closedAccountabilityContract.methods.status().call();
        expect(closedAccountabilityContractStatus).toEqual('3');
      });
    });
    describe('referee', () => {
      it('can get open accountability contract addresses of referee', async () => {
        const user = accounts[0];
        const referee = accounts[1];
        await createAccountabilityContract({
          referee,
          failureRecipient: accounts[2],
          user,
          amount
        });
        const openAccountabilityContractAddresses =
          await accountabilityContractFactory.methods
            .getOpenAccountabilityContractAddressesForReferee(referee)
            .call();
        expect(openAccountabilityContractAddresses).toBeDefined();
        expect(openAccountabilityContractAddresses.length).toEqual(1);
      });
      it('can get closed accountability contract addresses of referee', async () => {
        const user = accounts[0];
        const referee = accounts[1];
        await createAccountabilityContract({
          referee,
          failureRecipient: accounts[2],
          user,
          amount
        });
        const openAccountabilityContractAddresses =
          await accountabilityContractFactory.methods
            .getOpenAccountabilityContractAddressesForReferee(referee)
            .call();
        await accountabilityContractFactory.methods
          .failOpenAccountabilityContract(
            openAccountabilityContractAddresses[0]
          )
          .send({ from: referee, gas: 1000000 });
        const closedAccountabilityContractAddressesForReferee =
          await accountabilityContractFactory.methods
            .getClosedAccountabilityContractAddressesForReferee(referee)
            .call();
        expect(closedAccountabilityContractAddressesForReferee).toBeDefined();
        expect(closedAccountabilityContractAddressesForReferee.length).toEqual(
          1
        );
      });
      it('can get complete approval requests of referee', async () => {
        const user = accounts[0];
        const referee = accounts[1];
        await createAccountabilityContract({
          referee,
          failureRecipient: accounts[2],
          user,
          amount
        });

        const openAccountabilityContractAddresses =
          await accountabilityContractFactory.methods
            .getOpenAccountabilityContractAddressesForReferee(accounts[1])
            .call();
        await accountabilityContractFactory.methods
          .requestApproval(openAccountabilityContractAddresses[0])
          .send({ from: user, gas: 1000000 });
        const approvalRequestAddresses =
          await accountabilityContractFactory.methods
            .getApprovalRequests(referee)
            .call();
        expect(approvalRequestAddresses.length).toEqual(1);
      });
      it('referee can fail an open accountability contract', async () => {
        const user = accounts[0];
        const referee = accounts[1];
        await createAccountabilityContract({
          referee,
          failureRecipient: accounts[2],
          user,
          amount
        });
        const initialOpenAccountabilityContractAddresses =
          await accountabilityContractFactory.methods
            .getOpenAccountabilityContractAddressesForReferee(referee)
            .call();
        await accountabilityContractFactory.methods
          .failOpenAccountabilityContract(
            initialOpenAccountabilityContractAddresses[0]
          )
          .send({ from: referee, gas: 1000000 });
        const closedAccountabilityContractAddressesUser =
          await accountabilityContractFactory.methods
            .getClosedAccountabilityContractAddressesForUser(user)
            .call();
        expect(closedAccountabilityContractAddressesUser.length).toEqual(1);
        const openAccountabilityContractAddresses =
          await accountabilityContractFactory.methods
            .getOpenAccountabilityContractAddressesForUser(user)
            .call();
        expect(openAccountabilityContractAddresses.length).toEqual(0);
        const closedAccountabilityContract = await new web3.eth.Contract(
          AccountabilityContract.abi as any,
          closedAccountabilityContractAddressesUser[0]
        );
        const closedAccountabilityContractStatus =
          await closedAccountabilityContract.methods.status().call();
        expect(closedAccountabilityContractStatus).toEqual('3');
        const closedAcccountabilityContractBalance = await web3.eth.getBalance(
          closedAccountabilityContractAddressesUser[0]
        );
        expect(closedAcccountabilityContractBalance).toEqual('0');
      });
      it('referee can complete an open accountability contract', async () => {
        const user = accounts[0];
        const referee = accounts[1];
        await createAccountabilityContract({
          referee: accounts[1],
          failureRecipient: accounts[2],
          user: accounts[0],
          amount
        });
        const initialOpenAccountabilityContractAddresses =
          await accountabilityContractFactory.methods
            .getOpenAccountabilityContractAddressesForReferee(referee)
            .call();
        await accountabilityContractFactory.methods
          .completeOpenAccountabilityContract(
            initialOpenAccountabilityContractAddresses[0]
          )
          .send({ from: referee, gas: 1000000 });
        const closedAccountabilityContractAddresses =
          await accountabilityContractFactory.methods
            .getClosedAccountabilityContractAddressesForUser(user)
            .call();
        expect(closedAccountabilityContractAddresses.length).toEqual(1);
        const openAccountabilityContractAddresses =
          await accountabilityContractFactory.methods
            .getOpenAccountabilityContractAddressesForUser(user)
            .call();
        expect(openAccountabilityContractAddresses.length).toEqual(0);
        const closedAccountabilityContract = await new web3.eth.Contract(
          AccountabilityContract.abi as any,
          closedAccountabilityContractAddresses[0]
        );
        const closedAccountabilityContractStatus =
          await closedAccountabilityContract.methods.status().call();
        expect(closedAccountabilityContractStatus).toEqual('2');
        const closedAcccountabilityContractBalance = await web3.eth.getBalance(
          closedAccountabilityContractAddresses[0]
        );
        expect(closedAcccountabilityContractBalance).toEqual('0');
      });
      it('referee can approve request', async () => {
        const user = accounts[0];
        const referee = accounts[1];
        await createAccountabilityContract({
          referee: accounts[1],
          failureRecipient: accounts[2],
          user: accounts[0],
          amount
        });
        const openAccountabilityContractAddressesUser =
          await accountabilityContractFactory.methods
            .getOpenAccountabilityContractAddressesForUser(user)
            .call();
        const closedAccountabilityContractAddressesUser =
          await accountabilityContractFactory.methods
            .getClosedAccountabilityContractAddressesForUser(user)
            .call();
        const openAccountabilityContractAddressesReferee =
          await accountabilityContractFactory.methods
            .getOpenAccountabilityContractAddressesForReferee(referee)
            .call();
        const closedAccountabilityContractAddressesReferee =
          await accountabilityContractFactory.methods
            .getClosedAccountabilityContractAddressesForReferee(referee)
            .call();
        await accountabilityContractFactory.methods
          .requestApproval(openAccountabilityContractAddressesReferee[0])
          .send({ from: user, gas: 1000000 });
        const accountabilityContract = await new web3.eth.Contract(
          AccountabilityContract.abi as any,
          openAccountabilityContractAddressesReferee[0]
        );
        const status = await accountabilityContract.methods.status().call();
        expect(status).toEqual('1');
        const approvalRequestAddresses =
          await accountabilityContractFactory.methods
            .getApprovalRequests(referee)
            .call();
        await accountabilityContractFactory.methods
          .approveRequest(approvalRequestAddresses[0])
          .send({ from: referee, gas: 1000000 });
        const updatedApprovalRequestAddresses =
          await accountabilityContractFactory.methods
            .getApprovalRequests(referee)
            .call();
        expect(updatedApprovalRequestAddresses.length).toEqual(0);
        const updatedOpenAccountabilityContractAddressesReferee =
          await accountabilityContractFactory.methods
            .getOpenAccountabilityContractAddressesForReferee(referee)
            .call();
        expect(
          updatedOpenAccountabilityContractAddressesReferee.length
        ).toEqual(openAccountabilityContractAddressesReferee.length - 1);
        const updatedOpenAccountabilityContractAddressesUser =
          await accountabilityContractFactory.methods
            .getOpenAccountabilityContractAddressesForUser(user)
            .call();
        expect(updatedOpenAccountabilityContractAddressesUser.length).toEqual(
          openAccountabilityContractAddressesUser.length - 1
        );
        const updatedClosedAccountabilityContractAddressesUser =
          await accountabilityContractFactory.methods
            .getClosedAccountabilityContractAddressesForUser(user)
            .call();
        expect(updatedClosedAccountabilityContractAddressesUser.length).toEqual(
          closedAccountabilityContractAddressesUser.length + 1
        );
        const updatedClosedAccountabilityContractAddressesReferee =
          await accountabilityContractFactory.methods
            .getClosedAccountabilityContractAddressesForReferee(referee)
            .call();
        expect(
          updatedClosedAccountabilityContractAddressesReferee.length
        ).toEqual(closedAccountabilityContractAddressesReferee.length + 1);
      });
      it('referee can reject approval request', async () => {
        expect.assertions(2);
        const user = accounts[0];
        const referee = accounts[1];
        await createAccountabilityContract({
          referee,
          failureRecipient: accounts[2],
          user,
          amount
        });
        const openAccountabilityContractAddressesReferee =
          await accountabilityContractFactory.methods
            .getOpenAccountabilityContractAddressesForReferee(referee)
            .call();
        await accountabilityContractFactory.methods
          .requestApproval(openAccountabilityContractAddressesReferee[0])
          .send({ from: user, gas: 1000000 });
        const accountabilityContract = await new web3.eth.Contract(
          AccountabilityContract.abi as any,
          openAccountabilityContractAddressesReferee[0]
        );
        const status = await accountabilityContract.methods.status().call();
        expect(status).toEqual('1');
        const approvalRequestAddresses =
          await accountabilityContractFactory.methods
            .getApprovalRequests(referee)
            .call();
        await accountabilityContractFactory.methods
          .rejectRequest(approvalRequestAddresses[0])
          .send({ from: referee, gas: 1000000 });
        const updatedApprovalRequestAddresses =
          await accountabilityContractFactory.methods
            .getApprovalRequests(referee)
            .call();
        expect(updatedApprovalRequestAddresses.length).toEqual(
          approvalRequestAddresses.length - 1
        );
      });
    });
  });

  describe('errors', () => {
    describe('user', () => {
      it('cannot create a contract where the value is less than 0', async () => {
        const user = accounts[0];
        const referee = accounts[1];
        await expect(
          createAccountabilityContract({
            referee,
            failureRecipient: accounts[2],
            user,
            amount: '-1'
          })
        ).rejects.toThrowError();
      });
      it('cannot create a contract where the value is equal to 0', async () => {
        const user = accounts[0];
        const referee = accounts[1];
        await expect(
          createAccountabilityContract({
            referee,
            failureRecipient: accounts[2],
            user,
            amount: '0'
          })
        ).rejects.toThrow(
          'VM Exception while processing transaction: revert Value must be a positive number'
        );
      });
      it('creator cannot complete an open accountability contract if they are not the referee', async () => {
        const user = accounts[0];
        const referee = accounts[1];
        await createAccountabilityContract({
          referee,
          failureRecipient: accounts[2],
          user,
          amount
        });
        const openAccountabilityContractAddresses =
          await accountabilityContractFactory.methods
            .getOpenAccountabilityContractAddressesForUser(user)
            .call();
        await expect(
          accountabilityContractFactory.methods
            .completeOpenAccountabilityContract(
              openAccountabilityContractAddresses[0]
            )
            .send({ from: user, gas: 1000000 })
        ).rejects.toThrow(
          'VM Exception while processing transaction: revert Only referee can complete a contract'
        );
      });
      it('user who is not referee or creator cannot fail an open accountability contract', async () => {
        expect.assertions(1);
        const user = accounts[0];
        const referee = accounts[1];
        await createAccountabilityContract({
          referee,
          failureRecipient: accounts[2],
          user,
          amount
        });
        const openAccountabilityContractAddresses =
          await accountabilityContractFactory.methods
            .getOpenAccountabilityContractAddressesForUser(user)
            .call();

        await expect(
          accountabilityContractFactory.methods
            .failOpenAccountabilityContract(
              openAccountabilityContractAddresses[0]
            )
            .send({ from: accounts[2], gas: 1000000 })
        ).rejects.toThrow(
          'VM Exception while processing transaction: revert Only referee or creator can fail contract'
        );
      });
      it("user cannot complete a contract that doesn't exist on the user", async () => {
        const user = accounts[0];
        const referee = accounts[1];
        await createAccountabilityContract({
          referee,
          failureRecipient: accounts[2],
          user,
          amount
        });
        const openAccountabilityContractAddresses =
          await accountabilityContractFactory.methods
            .getOpenAccountabilityContractAddressesForUser(user)
            .call();
        await expect(
          accountabilityContractFactory.methods
            .completeOpenAccountabilityContract(
              openAccountabilityContractAddresses[0]
            )
            .send({ from: accounts[2], gas: 1000000 })
        ).rejects.toThrow(
          'VM Exception while processing transaction: revert Only referee can complete a contract'
        );
      });
      it('user cannot request approval for a contract they created and referee', async () => {
        expect.assertions(1);
        const user = accounts[0];
        const referee = accounts[1];
        await createAccountabilityContract({
          referee,
          failureRecipient: accounts[2],
          user,
          amount
        });
        const openAccountabilityContractAddresses =
          await accountabilityContractFactory.methods
            .getOpenAccountabilityContractAddressesForUser(user)
            .call();
        await accountabilityContractFactory.methods
          .requestApproval(openAccountabilityContractAddresses[0])
          .send({ from: user, gas: 1000000 });
        await expect(
          accountabilityContractFactory.methods
            .approveRequest(openAccountabilityContractAddresses[0])
            .send({ from: user, gas: 1000000 })
        ).rejects.toThrow('VM Exception while processing transaction: revert');
      });
      it('user cannot request a referee completes a contract for a contract that is closed', async () => {
        expect.assertions(1);
        const user = accounts[0];
        const referee = accounts[1];
        await createAccountabilityContract({
          referee,
          failureRecipient: accounts[2],
          user,
          amount
        });
        const openAccountabilityContractAddresses =
          await accountabilityContractFactory.methods
            .getOpenAccountabilityContractAddressesForUser(user)
            .call();
        await accountabilityContractFactory.methods
          .completeOpenAccountabilityContract(
            openAccountabilityContractAddresses[0]
          )
          .send({ from: referee, gas: 1000000 });
        await expect(
          accountabilityContractFactory.methods
            .requestApproval(openAccountabilityContractAddresses[0])
            .send({ from: user, gas: 1000000 })
        ).rejects.toThrow(
          'VM Exception while processing transaction: revert Contract status must be open'
        );
      });
      it('user cannot request a referee completes a contract where they are not the creator', async () => {
        const user = accounts[0];
        const referee = accounts[1];
        await createAccountabilityContract({
          referee,
          failureRecipient: accounts[2],
          user: accounts[2],
          amount
        });
        const openAccountabilityContractAddresses =
          await accountabilityContractFactory.methods
            .getOpenAccountabilityContractAddressesForUser(accounts[2])
            .call();
        await expect(
          accountabilityContractFactory.methods
            .requestApproval(openAccountabilityContractAddresses[0])
            .send({ from: user, gas: 1000000 })
        ).rejects.toThrow(
          'VM Exception while processing transaction: revert Only creator of contract can request completion'
        );
      });
      it('user cannot approve request if they are not the contracts referee', async () => {
        expect.assertions(1);
        const user = accounts[0];
        const referee = accounts[1];
        await createAccountabilityContract({
          referee,
          failureRecipient: accounts[2],
          user,
          amount
        });

        const openAccountabilityContractAddressesReferee =
          await accountabilityContractFactory.methods
            .getOpenAccountabilityContractAddressesForReferee(referee)
            .call();
        await accountabilityContractFactory.methods
          .requestApproval(openAccountabilityContractAddressesReferee[0])
          .send({ from: accounts[0], gas: 1000000 });
        const approvalRequestAddresses =
          await accountabilityContractFactory.methods
            .getApprovalRequests(referee)
            .call();
        await expect(
          accountabilityContractFactory.methods
            .approveRequest(approvalRequestAddresses[0])
            .send({ from: accounts[2], gas: 1000000 })
        ).rejects.toThrow(
          'VM Exception while processing transaction: revert Only referee can approve approval request'
        );
      });
      it('user cannot reject request if they are not the contracts referee', async () => {
        expect.assertions(1);
        const user = accounts[0];
        const referee = accounts[1];
        await createAccountabilityContract({
          referee,
          failureRecipient: accounts[2],
          user,
          amount
        });
        const openAccountabilityContractAddressesReferee =
          await accountabilityContractFactory.methods
            .getOpenAccountabilityContractAddressesForReferee(referee)
            .call();
        await accountabilityContractFactory.methods
          .requestApproval(openAccountabilityContractAddressesReferee[0])
          .send({ from: accounts[0], gas: 1000000 });
        const approvalRequestAddresses =
          await accountabilityContractFactory.methods
            .getApprovalRequests(referee)
            .call();
        await expect(
          accountabilityContractFactory.methods
            .rejectRequest(approvalRequestAddresses[0])
            .send({ from: accounts[2], gas: 1000000 })
        ).rejects.toThrow(
          'VM Exception while processing transaction: revert Only referee can reject approval request'
        );
      });
    });

    describe('referee', () => {
      it('referee cannot complete an accountability contract with a success status', async () => {
        const user = accounts[0];
        const referee = accounts[1];
        await createAccountabilityContract({
          referee,
          failureRecipient: accounts[2],
          user,
          amount
        });
        const openAccountabilityContractAddresses =
          await accountabilityContractFactory.methods
            .getOpenAccountabilityContractAddressesForUser(user)
            .call();
        await accountabilityContractFactory.methods
          .completeOpenAccountabilityContract(
            openAccountabilityContractAddresses[0]
          )
          .send({ from: referee, gas: 1000000 });

        await expect(
          accountabilityContractFactory.methods
            .completeOpenAccountabilityContract(
              openAccountabilityContractAddresses[0]
            )
            .send({ from: referee, gas: 1000000 })
        ).rejects.toThrow(
          'VM Exception while processing transaction: revert Contract status must be open or awaiting approval'
        );
      });
      it('referee cannot fail an accountability contract with a success status', async () => {
        const user = accounts[0];
        const referee = accounts[1];
        await createAccountabilityContract({
          referee,
          failureRecipient: accounts[2],
          user,
          amount
        });
        const openAccountabilityContractAddresses =
          await accountabilityContractFactory.methods
            .getOpenAccountabilityContractAddressesForUser(user)
            .call();
        await accountabilityContractFactory.methods
          .completeOpenAccountabilityContract(
            openAccountabilityContractAddresses[0]
          )
          .send({ from: referee, gas: 1000000 });

        await expect(
          accountabilityContractFactory.methods
            .failOpenAccountabilityContract(
              openAccountabilityContractAddresses[0]
            )
            .send({ from: user, gas: 1000000 })
        ).rejects.toThrow(
          'VM Exception while processing transaction: revert Contract status must be open or awaiting approval'
        );
      });
    });
  });
});
