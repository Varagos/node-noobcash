import { transaction } from './../../../cli-client/src/commands/transaction';
import Chain from '../Chain';
import Transaction from '../Transaction';
import Block from '../Block';

export type nodeAddressInfo = {
  host: string;
  port: number;
};
export type nodeInfo = nodeAddressInfo & {
  pk: string;
};

export enum CODES {
  REGISTER = 'register',
  INITIALIZE_CHAIN = 'initializeChain',
  NEW_TRANSACTION = 'newTransaction',
  END_MINING = 'endMining',
}

// Have a type broacast / bootstrap
// and code for extra info(e.g. register, transaction, mined)
export type RegisterNodeMessage = {
  code: CODES.REGISTER;
} & nodeInfo;

export type InitializeChainMessage = {
  code: CODES.INITIALIZE_CHAIN;
  nodes: nodeInfo[];
  blockChain: Chain;
};

export type NewTransactionMessage = {
  code: CODES.NEW_TRANSACTION;
  transaction: Transaction;
};

/**
 * The END_MINING event is triggered when one of the nodes successfully mine the block.
 * It sets a flag to true which tells the other nodes on the network to stop mining
 * and start verifying the solution.
 */
export type BlockMineFound = {
  code: CODES.END_MINING;
  block: Block;
};

export type MessageType = RegisterNodeMessage | InitializeChainMessage | NewTransactionMessage;
