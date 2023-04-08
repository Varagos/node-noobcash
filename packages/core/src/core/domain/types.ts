import Chain from './Chain';
import Transaction from './Transaction';
import Block from './Block';

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
  BLOCK_FOUND = 'blockFound',
  CHAINS_REQUEST = 'chainsRequest',
  CLI_MAKE_NEW_TX = 'cliMakeTransaction',
  CLI_VIEW_LAST_TX = 'cliViewLastTransactions',
  CLI_SHOW_BALANCE = 'cliShowBalance',
}

export type ChainResponse = {
  blockChain: Chain;
};

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

export type ChainsRequestMessage = {
  code: CODES.CHAINS_REQUEST;
};
/**
 * The END_MINING event is triggered when one of the nodes successfully mine the block.
 * It sets a flag to true which tells the other nodes on the network to stop mining
 * and start verifying the solution.
 */
export type BlockMineFoundMessage = {
  code: CODES.BLOCK_FOUND;
  block: Block;
};

export type CliNewTransactionMessage = {
  code: CODES.CLI_MAKE_NEW_TX;
  nodeId: string;
  amount: number;
};

export type CliViewLastTransactions = {
  code: CODES.CLI_VIEW_LAST_TX;
};

export type CliShowBalance = {
  code: CODES.CLI_SHOW_BALANCE;
};

export type MessageType =
  | RegisterNodeMessage
  | InitializeChainMessage
  | NewTransactionMessage
  | BlockMineFoundMessage
  | ChainsRequestMessage
  | CliNewTransactionMessage
  | CliViewLastTransactions
  | CliShowBalance;

export interface IMessage<T = any> {
  code: CODES;
  payload: T;
}
