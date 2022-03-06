import { transaction } from './../../../cli-client/src/commands/transaction';
import Chain from '../Chain';
import Transaction from '../Transaction';

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

export type MessageType = RegisterNodeMessage | InitializeChainMessage | NewTransactionMessage;
