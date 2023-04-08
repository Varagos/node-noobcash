import { InMemChainState } from '../core/infra/chain-state/ChainState';
import { Block, Chain, Transaction } from '../core/domain';

export const blockFromSerialized = (serializedBlock: Block): Block => {
  const { previousHash, transactions, timestamp } = serializedBlock;
  // cast block
  const block = Object.assign(new Block(previousHash, transactions, timestamp), serializedBlock);
  block.transactions = transactions.map((tr) => transactionFromSerialized(tr));
  return block;
};

export const transactionFromSerialized = (serializedTransaction: Transaction): Transaction => {
  const { senderAddress, receiverAddress, amount } = serializedTransaction;
  const transaction = Object.assign(new Transaction(senderAddress, receiverAddress, amount), serializedTransaction);
  //   console.log('Serialized TRANSACTION HASH', transaction.transactionId);
  return transaction;
};
