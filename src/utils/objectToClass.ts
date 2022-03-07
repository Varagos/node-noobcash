import { ChainState } from './../services/ChainState';
import { transaction } from './../../cli-client/src/commands/transaction';
import { Block, Chain, Transaction } from '../libs';

export const blockFromSerialized = (serializedBlock: Block): Block => {
  const { previousHash, transactions: serializedTransactions, timestamp } = serializedBlock;
  // cast block
  const transactions = serializedTransactions.map((tr) => transactionFromSerialized(tr));
  const block = Object.assign(new Block(previousHash, transactions, timestamp), serializedBlock);
  return block;
};

export const transactionFromSerialized = (serializedTransaction: Transaction): Transaction => {
  const { senderAddress, receiverAddress, amount } = serializedTransaction;
  const transaction = Object.assign(new Transaction(senderAddress, receiverAddress, amount), serializedTransaction);
  //   console.log('Serialized TRANSACTION HASH', transaction.transactionId);
  return transaction;
};
